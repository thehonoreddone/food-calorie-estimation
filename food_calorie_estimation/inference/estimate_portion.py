"""
Portion estimation module.
Estimates portion size (volume -> mass) using geometry, calibration, and depth.
NO HARDCODED PER-FOOD GRAMS - uses vision + geometry + calibration.
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field

import numpy as np
from PIL import Image
import cv2

from ..utils.geometry import (
    CalibrationResult,
    calibrate_from_image,
    pixels_to_cm2,
    estimate_height_from_depth,
    estimate_volume,
    compute_mask_area,
    check_instance_repeatability,
    apply_portion_constraints,
    HEIGHT_PRIORS,
    PORTION_CONSTRAINTS
)
from ..utils.config import get_config
from ..modules.food_type_analyzer import FoodTypeAnalyzer
from ..modules.container_detector import estimate_liquid_volume, ContainerDetector, CONTAINER_DIMENSIONS

logger = logging.getLogger(__name__)


@dataclass
class InstancePortion:
    """Portion estimate for a single instance."""
    instance_id: int
    area_pixels: int
    area_cm2: float
    height_cm: float
    volume_cm3: float
    mass_g: float
    confidence: float
    method: str


@dataclass
class PortionEstimationResult:
    """Complete portion estimation result."""
    per_instance: List[InstancePortion]
    total_mass_g: float
    total_volume_cm3: float
    num_instances: int
    is_repeatable: bool
    coefficient_of_variation: float
    calibration: CalibrationResult
    method_used: str
    confidence_level: float  # 0.0 to 1.0
    warnings: List[str] = field(default_factory=list)
    
    # For liquids
    volume_ml: Optional[float] = None
    is_liquid: bool = False


class PortionEstimator:
    """
    Research-grade portion estimator.
    Uses geometry-based volume estimation with calibration.
    """
    
    # Repeatability threshold (coefficient of variation)
    CV_THRESHOLD = 0.15
    
    def __init__(self,
                 default_plate_diameter_cm: float = 26.0):
        """
        Initialize portion estimator.
        
        Args:
            default_plate_diameter_cm: Default plate diameter for fallback calibration
        """
        self.default_plate_diameter_cm = default_plate_diameter_cm
        self.config = get_config()
        self.food_analyzer = FoodTypeAnalyzer()
        self.container_detector = ContainerDetector(use_yolo=True)
    
    def estimate(self,
                 image: Image.Image,
                 food_class: str,
                 instance_masks: List[np.ndarray],
                 depth_map: Optional[np.ndarray] = None,
                 depth_range: Optional[Tuple[float, float]] = None) -> PortionEstimationResult:
        """
        Estimate portion size from image, masks, and optional depth.
        
        Args:
            image: PIL Image (RGB)
            food_class: Predicted food class
            instance_masks: List of binary masks (H, W) for each instance
            depth_map: Optional depth map (H, W)
            depth_range: Optional (min, max) of depth values
        
        Returns:
            PortionEstimationResult with detailed estimates
        """
        warnings = []
        image_np = np.array(image)
        h, w = image_np.shape[:2]
        
        # Get food type and strategy
        food_type = self.food_analyzer.get_food_type(food_class)
        strategy = self.food_analyzer.get_estimation_strategy(food_class)
        density = self.config.get_density(food_class)
        
        logger.info(f"Estimating portion for '{food_class}' (type: {food_type}, density: {density})")
        
        # Handle liquids separately
        if food_type == 'liquid':
            return self._estimate_liquid(image, food_class, instance_masks, density)
        
        # Try to detect container for better calibration
        calibration = None
        container = self.container_detector.detect_container(image)
        
        if container:
            # Use detected container for calibration
            dims = CONTAINER_DIMENSIONS.get(container.container_type, CONTAINER_DIMENSIONS['unknown'])
            ref_diameter_cm = dims['diameter_cm']
            
            # Use the estimated diameter in pixels from the detector
            ref_diameter_pixels = container.estimated_diameter_pixels
            
            pixels_per_cm = ref_diameter_pixels / ref_diameter_cm
            
            calibration = CalibrationResult(
                pixels_per_cm=pixels_per_cm,
                method=f"container_detection_{container.container_type}",
                confidence=container.confidence,
                reference_diameter_cm=ref_diameter_cm,
                reference_diameter_pixels=ref_diameter_pixels,
                warnings=[]
            )
            logger.info(f"Calibrated using container: {container.container_type} ({ref_diameter_cm}cm)")

        if calibration is None:
            # Calibrate (get pixels_per_cm)
            calibration = calibrate_from_image(image_np, self.default_plate_diameter_cm)
            warnings.extend(calibration.warnings)
        
        if calibration.method == 'default':
            logger.warning("Using default calibration (low confidence)")
        
        # If no masks provided, create a simple central mask
        if not instance_masks:
            warnings.append("No instance masks provided, using central region estimate")
            # Create a central mask covering ~40% of image
            mask = np.zeros((h, w), dtype=np.uint8)
            ch, cw = h // 2, w // 2
            rh, rw = h // 3, w // 3
            mask[ch-rh:ch+rh, cw-rw:cw+rw] = 1
            instance_masks = [mask]
        
        # Compute per-instance portions
        instances = []
        areas_cm2 = []
        
        for i, mask in enumerate(instance_masks):
            # Compute area
            area_pixels = compute_mask_area(mask)
            area_cm2 = pixels_to_cm2(area_pixels, calibration.pixels_per_cm)
            areas_cm2.append(area_cm2)
            
            # Estimate height
            if depth_map is not None and depth_range is not None:
                depth_values = depth_map[mask > 0]
                height_cm, height_conf = estimate_height_from_depth(
                    depth_values, food_type, depth_range
                )
            else:
                # Use height prior
                prior = HEIGHT_PRIORS.get(food_type, HEIGHT_PRIORS['single_volume'])
                height_cm = prior['mean']
                height_conf = 0.4
                if depth_map is None:
                    warnings.append(f"No depth map, using height prior: {height_cm:.1f} cm")
            
            # Estimate volume
            shape_factor = strategy.get('shape_factor', 0.6)
            volume_cm3 = estimate_volume(area_cm2, height_cm, shape_factor)
            
            # Convert to mass
            mass_g = volume_cm3 * density
            
            # Apply constraints
            volume_cm3, mass_g, constraint_warnings = apply_portion_constraints(
                volume_cm3, mass_g, food_type
            )
            warnings.extend(constraint_warnings)
            
            # Confidence combines calibration, depth, and constraint confidence
            confidence = calibration.confidence * 0.4 + height_conf * 0.3 + 0.3
            if constraint_warnings:
                confidence *= 0.8
            
            instance = InstancePortion(
                instance_id=i,
                area_pixels=area_pixels,
                area_cm2=area_cm2,
                height_cm=height_cm,
                volume_cm3=volume_cm3,
                mass_g=mass_g,
                confidence=confidence,
                method=f"geometry_{food_type}"
            )
            instances.append(instance)
        
        # Check repeatability for multi-instance foods
        is_repeatable, cv = check_instance_repeatability(areas_cm2, self.CV_THRESHOLD)
        
        # Compute totals based on repeatability
        if food_type == 'multi_instance' and len(instances) > 1:
            if is_repeatable:
                # Use mean of instances * count
                mean_mass = np.mean([inst.mass_g for inst in instances])
                total_mass = mean_mass * len(instances)
                method_used = f"repeatable_instances (count={len(instances)}, cv={cv:.3f})"
                logger.info(f"Repeatable instances: {len(instances)} x {mean_mass:.1f}g = {total_mass:.1f}g")
            else:
                # Sum individual estimates
                total_mass = sum(inst.mass_g for inst in instances)
                method_used = f"individual_instances (count={len(instances)}, cv={cv:.3f})"
                logger.info(f"Non-repeatable instances: sum = {total_mass:.1f}g")
        else:
            total_mass = sum(inst.mass_g for inst in instances)
            method_used = f"single_region_{food_type}"
        
        total_volume = sum(inst.volume_cm3 for inst in instances)
        
        # Overall confidence
        confidence_level = np.mean([inst.confidence for inst in instances])
        if len(warnings) > 2:
            confidence_level *= 0.8
        
        # If geometric confidence is low, use typical portions as fallback/adjustment
        if confidence_level < 0.5 or calibration.method == 'default':
            typical_weight, min_weight, max_weight = self.config.get_typical_weight(
                food_class, num_instances=len(instances)
            )
            
            # Blend geometric estimate with typical portion based on confidence
            if total_mass < min_weight or total_mass > max_weight:
                # Geometric estimate is outside reasonable range, use typical
                logger.warning(
                    f"Geometric estimate {total_mass:.1f}g outside typical range "
                    f"[{min_weight:.1f}, {max_weight:.1f}]g for {food_class}. "
                    f"Using typical portion: {typical_weight:.1f}g"
                )
                total_mass = typical_weight
                warnings.append(f"Using typical portion weight ({typical_weight:.0f}g) due to low calibration confidence")
                method_used = "typical_portion_fallback"
            else:
                # Geometric estimate is reasonable, keep it but log
                logger.info(f"Geometric estimate {total_mass:.1f}g is within typical range for {food_class}")
        
        return PortionEstimationResult(
            per_instance=instances,
            total_mass_g=total_mass,
            total_volume_cm3=total_volume,
            num_instances=len(instances),
            is_repeatable=is_repeatable,
            coefficient_of_variation=cv,
            calibration=calibration,
            method_used=method_used,
            confidence_level=confidence_level,
            warnings=warnings,
            is_liquid=False
        )
    
    def _estimate_liquid(self,
                         image: Image.Image,
                         food_class: str,
                         masks: List[np.ndarray],
                         density: float) -> PortionEstimationResult:
        """Estimate portion for liquid foods."""
        warnings = []
        image_np = np.array(image)
        h, w = image_np.shape[:2]
        
        # Combine masks if available
        liquid_mask = None
        if masks:
            liquid_mask = np.zeros((h, w), dtype=np.uint8)
            for mask in masks:
                if mask is not None:
                    # Resize mask if needed
                    if mask.shape != (h, w):
                        mask = cv2.resize(mask.astype(np.uint8), (w, h), interpolation=cv2.INTER_NEAREST)
                    liquid_mask = np.logical_or(liquid_mask, mask).astype(np.uint8)
        
        # Detect container with mask
        container = self.container_detector.detect_container(image, liquid_mask)
        
        # Determine container type based on food class
        container_type = 'cup'
        if 'kahve' in food_class.lower() or 'coffee' in food_class.lower():
            container_type = 'small_cup'  # Turkish coffee cup
        elif 'cay' in food_class.lower() or 'tea' in food_class.lower():
            container_type = 'small_cup'  # Turkish tea glass
        elif 'soup' in food_class.lower() or 'corba' in food_class.lower():
            container_type = 'bowl'
        
        # Use container detector with proper type
        volume_ml, confidence, container_warnings = estimate_liquid_volume(
            image, liquid_mask, container_type=container_type
        )
        warnings.extend(container_warnings)
        
        # For Turkish coffee, typical serving is 60-90ml
        if container_type == 'small_cup' and ('kahve' in food_class.lower() or 'coffee' in food_class.lower()):
            volume_ml = min(volume_ml, 90)  # Cap at typical Turkish coffee size
            warnings.append(f"Adjusted for Turkish coffee serving size")
        
        # Convert ml to grams using density
        mass_g = volume_ml * density
        
        # Apply constraints
        constraints = PORTION_CONSTRAINTS['liquid']
        mass_g = np.clip(mass_g, constraints['min_mass_g'], constraints['max_mass_g'])
        volume_ml = np.clip(volume_ml, constraints['min_volume_ml'], constraints['max_volume_ml'])
        
        # Create a single "instance" for the liquid
        instance = InstancePortion(
            instance_id=0,
            area_pixels=int(np.sum(liquid_mask)) if liquid_mask is not None else 0,
            area_cm2=0,  # Not applicable for liquids
            height_cm=0,  # Not applicable
            volume_cm3=volume_ml,  # ml ≈ cm³
            mass_g=mass_g,
            confidence=confidence,
            method='container_volume'
        )
        
        # Dummy calibration for liquids
        calibration = CalibrationResult(
            pixels_per_cm=w / 20.0,  # Rough estimate
            method='liquid_container',
            confidence=confidence,
            reference_diameter_cm=8.0,
            reference_diameter_pixels=w * 0.4,
            warnings=warnings
        )
        
        return PortionEstimationResult(
            per_instance=[instance],
            total_mass_g=mass_g,
            total_volume_cm3=volume_ml,
            num_instances=1,
            is_repeatable=True,
            coefficient_of_variation=0.0,
            calibration=calibration,
            method_used='liquid_container_estimation',
            confidence_level=confidence,
            warnings=warnings,
            volume_ml=volume_ml,
            is_liquid=True
        )


def estimate_portion(image: Image.Image,
                     food_class: str,
                     instance_masks: List[np.ndarray],
                     depth_map: Optional[np.ndarray] = None,
                     depth_range: Optional[Tuple[float, float]] = None) -> PortionEstimationResult:
    """
    Convenience function to estimate portion.
    
    Args:
        image: PIL Image
        food_class: Food class name
        instance_masks: List of instance masks
        depth_map: Optional depth map
        depth_range: Optional depth range
    
    Returns:
        PortionEstimationResult
    """
    estimator = PortionEstimator()
    return estimator.estimate(
        image=image,
        food_class=food_class,
        instance_masks=instance_masks,
        depth_map=depth_map,
        depth_range=depth_range
    )
