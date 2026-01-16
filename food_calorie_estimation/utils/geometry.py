"""
Geometry utilities for food portion estimation.
Handles pixel-to-cm conversion, area/volume calculations, and calibration.
"""

import numpy as np
from typing import Tuple, Optional, List, Dict, Any
from dataclasses import dataclass
import cv2
import logging

logger = logging.getLogger(__name__)


@dataclass
class CalibrationResult:
    """Result of calibration (reference object detection)."""
    pixels_per_cm: float
    method: str  # 'plate_detection', 'circle_detection', 'default'
    confidence: float  # 0.0 to 1.0
    reference_diameter_cm: float
    reference_diameter_pixels: float
    warnings: List[str]


@dataclass
class VolumeEstimate:
    """Volume estimation result for a single instance."""
    volume_cm3: float
    area_cm2: float
    height_cm: float
    confidence: float
    method: str


# Default plate diameter in cm (standard dinner plate)
DEFAULT_PLATE_DIAMETER_CM = 26.0

# Height priors for different food types (in cm)
HEIGHT_PRIORS = {
    'flat': {'mean': 0.8, 'min': 0.3, 'max': 2.0},
    'single_volume': {'mean': 3.0, 'min': 1.0, 'max': 8.0},
    'multi_instance': {'mean': 2.5, 'min': 0.5, 'max': 6.0},
    'liquid': {'mean': 5.0, 'min': 2.0, 'max': 15.0},  # Container height
}

# Generic portion constraints by food type
PORTION_CONSTRAINTS = {
    'flat': {'min_volume_cm3': 20, 'max_volume_cm3': 500, 'min_mass_g': 30, 'max_mass_g': 400},
    'single_volume': {'min_volume_cm3': 50, 'max_volume_cm3': 1500, 'min_mass_g': 50, 'max_mass_g': 1000},
    'multi_instance': {'min_volume_cm3': 5, 'max_volume_cm3': 100, 'min_mass_g': 5, 'max_mass_g': 80},  # Per instance
    'liquid': {'min_volume_ml': 50, 'max_volume_ml': 500, 'min_mass_g': 50, 'max_mass_g': 520},
}


def detect_plate_or_circle(image: np.ndarray, 
                           min_radius_ratio: float = 0.15,
                           max_radius_ratio: float = 0.45) -> Optional[Tuple[int, int, int]]:
    """
    Detect a circular plate or container in the image.
    
    Args:
        image: BGR or RGB image as numpy array
        min_radius_ratio: Minimum radius as ratio of image dimension
        max_radius_ratio: Maximum radius as ratio of image dimension
    
    Returns:
        Tuple of (center_x, center_y, radius) or None if not found
    """
    h, w = image.shape[:2]
    min_dim = min(h, w)
    
    min_radius = int(min_dim * min_radius_ratio)
    max_radius = int(min_dim * max_radius_ratio)
    
    # Convert to grayscale
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    else:
        gray = image
    
    # Apply Gaussian blur
    blurred = cv2.GaussianBlur(gray, (9, 9), 2)
    
    # Detect circles using Hough transform
    circles = cv2.HoughCircles(
        blurred,
        cv2.HOUGH_GRADIENT,
        dp=1.2,
        minDist=min_dim // 4,
        param1=100,
        param2=50,
        minRadius=min_radius,
        maxRadius=max_radius
    )
    
    if circles is not None:
        circles = np.round(circles[0, :]).astype(int)
        # Return the largest circle (most likely to be the plate)
        largest = max(circles, key=lambda c: c[2])
        return tuple(largest)
    
    return None


def calibrate_from_image(image: np.ndarray,
                        assumed_plate_diameter_cm: float = DEFAULT_PLATE_DIAMETER_CM) -> CalibrationResult:
    """
    Calibrate pixels-per-cm from image, preferring plate detection.
    
    Args:
        image: Input image (RGB)
        assumed_plate_diameter_cm: Assumed plate diameter if detected
    
    Returns:
        CalibrationResult with calibration info
    """
    warnings = []
    
    # Try to detect a plate/circle
    circle = detect_plate_or_circle(image)
    
    if circle is not None:
        cx, cy, radius = circle
        diameter_pixels = radius * 2
        pixels_per_cm = diameter_pixels / assumed_plate_diameter_cm
        
        return CalibrationResult(
            pixels_per_cm=pixels_per_cm,
            method='plate_detection',
            confidence=0.75,
            reference_diameter_cm=assumed_plate_diameter_cm,
            reference_diameter_pixels=diameter_pixels,
            warnings=warnings
        )
    
    # Fallback: assume default plate based on image size
    # Heuristic: plate typically occupies 50-70% of image width
    h, w = image.shape[:2]
    assumed_plate_pixels = w * 0.6
    pixels_per_cm = assumed_plate_pixels / assumed_plate_diameter_cm
    
    warnings.append("No plate detected; using default calibration (low confidence)")
    
    return CalibrationResult(
        pixels_per_cm=pixels_per_cm,
        method='default',
        confidence=0.3,
        reference_diameter_cm=assumed_plate_diameter_cm,
        reference_diameter_pixels=assumed_plate_pixels,
        warnings=warnings
    )


def pixels_to_cm2(area_pixels: float, pixels_per_cm: float) -> float:
    """Convert pixel area to cm²."""
    return area_pixels / (pixels_per_cm ** 2)


def estimate_height_from_depth(depth_values: np.ndarray,
                               food_type: str,
                               depth_range: Tuple[float, float]) -> Tuple[float, float]:
    """
    Estimate food height from relative depth values.
    
    Args:
        depth_values: Depth values within the food mask
        food_type: Type of food for height prior
        depth_range: (min_depth, max_depth) of the full image for normalization
    
    Returns:
        Tuple of (estimated_height_cm, confidence)
    """
    if len(depth_values) == 0:
        prior = HEIGHT_PRIORS.get(food_type, HEIGHT_PRIORS['single_volume'])
        return prior['mean'], 0.3
    
    # Use robust statistics
    median_depth = np.median(depth_values)
    
    # Trimmed mean (exclude top/bottom 10%)
    sorted_depths = np.sort(depth_values)
    trim_count = max(1, len(sorted_depths) // 10)
    trimmed = sorted_depths[trim_count:-trim_count] if len(sorted_depths) > 2 * trim_count else sorted_depths
    trimmed_mean = np.mean(trimmed)
    
    # Compute relative "height" from depth variation within the mask
    min_depth, max_depth = depth_range
    depth_span = max_depth - min_depth if max_depth > min_depth else 1.0
    
    # Food depth variation as proxy for height
    food_depth_range = np.percentile(depth_values, 90) - np.percentile(depth_values, 10)
    relative_height = food_depth_range / depth_span
    
    # Map to actual height using priors
    prior = HEIGHT_PRIORS.get(food_type, HEIGHT_PRIORS['single_volume'])
    height_range = prior['max'] - prior['min']
    
    # Scale relative height to physical height
    estimated_height = prior['min'] + (relative_height * height_range * 2)  # Scale factor
    estimated_height = np.clip(estimated_height, prior['min'], prior['max'])
    
    # Confidence based on depth variation
    confidence = min(0.7, 0.4 + relative_height)
    
    return float(estimated_height), confidence


def estimate_volume(area_cm2: float,
                    height_cm: float,
                    shape_factor: float = 0.6) -> float:
    """
    Estimate volume from area and height.
    
    Args:
        area_cm2: Top-down area in cm²
        height_cm: Estimated height in cm
        shape_factor: Factor accounting for food shape (0.5 for hemisphere, 1.0 for cylinder)
    
    Returns:
        Estimated volume in cm³
    """
    # Simple model: volume = area * height * shape_factor
    return area_cm2 * height_cm * shape_factor


def compute_mask_area(mask: np.ndarray) -> int:
    """Compute the area of a binary mask in pixels."""
    return int(np.sum(mask > 0))


def compute_mask_contour(mask: np.ndarray) -> Optional[np.ndarray]:
    """Extract the largest contour from a binary mask."""
    mask_uint8 = (mask > 0).astype(np.uint8) * 255
    contours, _ = cv2.findContours(mask_uint8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if not contours:
        return None
    
    return max(contours, key=cv2.contourArea)


def compute_convexity(contour: np.ndarray) -> float:
    """Compute convexity ratio of a contour."""
    if contour is None or len(contour) < 5:
        return 1.0
    
    area = cv2.contourArea(contour)
    hull = cv2.convexHull(contour)
    hull_area = cv2.contourArea(hull)
    
    if hull_area == 0:
        return 1.0
    
    return area / hull_area


def check_instance_repeatability(areas: List[float], cv_threshold: float = 0.15) -> Tuple[bool, float]:
    """
    Check if instances are "repeatable" (similar size) using coefficient of variation.
    
    Args:
        areas: List of instance areas
        cv_threshold: CV threshold below which instances are considered repeatable
    
    Returns:
        Tuple of (is_repeatable, coefficient_of_variation)
    """
    if len(areas) <= 1:
        return True, 0.0
    
    mean_area = np.mean(areas)
    std_area = np.std(areas)
    
    if mean_area == 0:
        return True, 0.0
    
    cv = std_area / mean_area
    return cv < cv_threshold, float(cv)


def apply_portion_constraints(volume_cm3: float,
                             mass_g: float,
                             food_type: str) -> Tuple[float, float, List[str]]:
    """
    Apply sanity constraints to portion estimates.
    
    Returns:
        Tuple of (constrained_volume, constrained_mass, warnings)
    """
    warnings = []
    constraints = PORTION_CONSTRAINTS.get(food_type, PORTION_CONSTRAINTS['single_volume'])
    
    # Volume constraints
    min_vol = constraints.get('min_volume_cm3', constraints.get('min_volume_ml', 0))
    max_vol = constraints.get('max_volume_cm3', constraints.get('max_volume_ml', 10000))
    
    if volume_cm3 < min_vol:
        warnings.append(f"Volume {volume_cm3:.1f} cm³ below minimum, adjusted to {min_vol}")
        volume_cm3 = min_vol
    elif volume_cm3 > max_vol:
        warnings.append(f"Volume {volume_cm3:.1f} cm³ above maximum, adjusted to {max_vol}")
        volume_cm3 = max_vol
    
    # Mass constraints
    min_mass = constraints.get('min_mass_g', 0)
    max_mass = constraints.get('max_mass_g', 5000)
    
    if mass_g < min_mass:
        warnings.append(f"Mass {mass_g:.1f} g below minimum, adjusted to {min_mass}")
        mass_g = min_mass
    elif mass_g > max_mass:
        warnings.append(f"Mass {mass_g:.1f} g above maximum, adjusted to {max_mass}")
        mass_g = max_mass
    
    return volume_cm3, mass_g, warnings
