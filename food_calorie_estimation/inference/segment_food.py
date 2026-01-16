"""
Segmentation interface module.
Provides a unified interface for food segmentation.

Primary: FoodSeg103 model (103 food classes, trained specifically for food segmentation)
Fallback 1: YOLOv8-seg (COCO pretrained)
Fallback 2: GrabCut + Depth Thresholding
"""

import logging
from typing import Optional, List, Tuple
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from PIL import Image
import cv2

# Primary: FoodSeg103
try:
    from ..modules.segmentation_foodseg103 import (
        FoodSeg103Segmentor,
        FoodInstance,
        FoodSegmentationResult as FoodSeg103Result
    )
    FOODSEG103_AVAILABLE = True
except ImportError:
    FOODSEG103_AVAILABLE = False

# Fallback: YOLOv8
from ..modules.segmentation_yolov8 import (
    YOLOv8Segmentor,
    SegmentationInstance,
    SegmentationResult,
    create_food_mask
)

logger = logging.getLogger(__name__)


@dataclass
class FoodSegmentationResult:
    """Result of food segmentation."""
    instances: List[SegmentationInstance]
    combined_food_mask: Optional[np.ndarray]
    container_mask: Optional[np.ndarray]
    num_instances: int
    total_area_pixels: int
    image_shape: Tuple[int, int]
    segmentor_type: str
    warnings: List[str] = field(default_factory=list)
    
    # FoodSeg103 specific fields
    class_distribution: dict = field(default_factory=dict)  # class_name -> pixel_count
    detected_food_classes: List[str] = field(default_factory=list)  # Tespit edilen yemek sınıfları


def grabcut_segment(image: Image.Image, 
                    rect: Optional[Tuple[int, int, int, int]] = None,
                    iterations: int = 5) -> np.ndarray:
    """
    Use GrabCut algorithm to segment foreground (food) from background.
    
    Args:
        image: PIL Image (RGB)
        rect: Optional bounding rectangle (x, y, width, height). 
              If None, uses center 60% of image as initial ROI.
        iterations: Number of GrabCut iterations
    
    Returns:
        Binary mask where 1 = foreground (food), 0 = background
    """
    image_np = np.array(image)
    h, w = image_np.shape[:2]
    
    # Convert to BGR for OpenCV
    image_bgr = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
    
    # Initialize mask
    mask = np.zeros((h, w), dtype=np.uint8)
    
    # Background/Foreground models
    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)
    
    # Define initial rectangle if not provided
    # Use center 60% of image as probable foreground
    if rect is None:
        margin_x = int(w * 0.2)
        margin_y = int(h * 0.2)
        rect = (margin_x, margin_y, w - 2 * margin_x, h - 2 * margin_y)
    
    try:
        # Run GrabCut with rectangle initialization
        cv2.grabCut(image_bgr, mask, rect, bgd_model, fgd_model, 
                    iterations, cv2.GC_INIT_WITH_RECT)
        
        # Create binary mask: foreground + probable foreground
        binary_mask = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 1, 0).astype(np.uint8)
        
        # Clean up mask with morphological operations
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        binary_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_CLOSE, kernel)
        binary_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_OPEN, kernel)
        
        logger.info(f"GrabCut segmentation completed: {np.sum(binary_mask)} foreground pixels")
        return binary_mask
        
    except Exception as e:
        logger.warning(f"GrabCut failed: {e}, returning central mask")
        # Fallback: return central ellipse mask
        mask = np.zeros((h, w), dtype=np.uint8)
        center = (w // 2, h // 2)
        axes = (int(w * 0.35), int(h * 0.35))
        cv2.ellipse(mask, center, axes, 0, 0, 360, 1, -1)
        return mask


def depth_threshold_segment(depth_map: np.ndarray,
                            percentile_threshold: float = 30.0,
                            use_otsu: bool = True) -> np.ndarray:
    """
    Segment foreground (food) using depth map thresholding.
    Objects closer to camera have higher depth values in MiDaS output.
    
    Args:
        depth_map: Depth map from MiDaS/ZoeDepth (H, W), float32
        percentile_threshold: Percentile for threshold (higher = more selective)
        use_otsu: If True, use Otsu's method for automatic thresholding
    
    Returns:
        Binary mask where 1 = foreground (close objects), 0 = background
    """
    # Normalize depth to 0-255 for processing
    depth_normalized = depth_map - np.min(depth_map)
    if np.max(depth_normalized) > 0:
        depth_normalized = (depth_normalized / np.max(depth_normalized) * 255).astype(np.uint8)
    else:
        logger.warning("Depth map has zero range")
        return np.ones(depth_map.shape, dtype=np.uint8)
    
    if use_otsu:
        # Use Otsu's method for automatic threshold selection
        _, binary_mask = cv2.threshold(depth_normalized, 0, 1, 
                                        cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    else:
        # Use percentile-based threshold
        threshold = np.percentile(depth_normalized, 100 - percentile_threshold)
        binary_mask = (depth_normalized >= threshold).astype(np.uint8)
    
    # Clean up mask
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    binary_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_CLOSE, kernel)
    binary_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_OPEN, kernel)
    
    # Remove small components (noise)
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(binary_mask, connectivity=8)
    min_area = binary_mask.shape[0] * binary_mask.shape[1] * 0.01  # 1% of image
    
    clean_mask = np.zeros_like(binary_mask)
    for i in range(1, num_labels):  # Skip background (label 0)
        if stats[i, cv2.CC_STAT_AREA] >= min_area:
            clean_mask[labels == i] = 1
    
    logger.info(f"Depth thresholding: {np.sum(clean_mask)} foreground pixels ({np.sum(clean_mask) / clean_mask.size * 100:.1f}%)")
    return clean_mask


def combine_masks(mask1: np.ndarray, mask2: np.ndarray, 
                  operation: str = 'intersection') -> np.ndarray:
    """
    Combine two masks using specified operation.
    
    Args:
        mask1: First binary mask
        mask2: Second binary mask
        operation: 'intersection' (AND), 'union' (OR), or 'mask1_priority'
    
    Returns:
        Combined binary mask
    """
    # Resize if needed
    if mask1.shape != mask2.shape:
        mask2 = cv2.resize(mask2.astype(np.uint8), (mask1.shape[1], mask1.shape[0]), 
                          interpolation=cv2.INTER_NEAREST)
    
    if operation == 'intersection':
        return np.logical_and(mask1, mask2).astype(np.uint8)
    elif operation == 'union':
        return np.logical_or(mask1, mask2).astype(np.uint8)
    else:
        return mask1


class FoodSegmentor:
    """
    High-level food segmentation interface.
    
    Priority order:
    1. FoodSeg103 (103 food classes, best for food-specific segmentation)
    2. YOLOv8-seg (COCO pretrained, general objects)
    3. GrabCut + Depth (fallback when models fail)
    """
    
    def __init__(self,
                 foodseg103_path: Optional[str] = None,
                 yolov8_path: Optional[str] = None,
                 device: Optional[str] = None,
                 conf_threshold: float = 0.25,
                 enabled: bool = True,
                 use_fallback: bool = True,
                 prefer_foodseg103: bool = True):
        """
        Initialize food segmentor.
        
        Args:
            foodseg103_path: Path to FoodSeg103 model (optional, auto-detected)
            yolov8_path: Path to YOLOv8-seg model (optional)
            device: Device to use
            conf_threshold: Detection confidence threshold
            enabled: Whether segmentation is enabled
            use_fallback: Whether to use GrabCut as fallback when models fail
            prefer_foodseg103: Use FoodSeg103 as primary when available
        """
        self.enabled = enabled
        self.foodseg103_path = foodseg103_path
        self.yolov8_path = yolov8_path
        self.device = device
        self.conf_threshold = conf_threshold
        self.use_fallback = use_fallback
        self.prefer_foodseg103 = prefer_foodseg103
        
        self._foodseg103_segmentor = None
        self._yolo_segmentor = None
        self._foodseg103_available = False
        self._yolo_available = False
        
        if self.enabled:
            self._init_segmentors()
    
    def _init_segmentors(self):
        """Initialize available segmentors."""
        # Try FoodSeg103 first (preferred for food)
        if self.prefer_foodseg103 and FOODSEG103_AVAILABLE:
            try:
                self._foodseg103_segmentor = FoodSeg103Segmentor(
                    model_path=self.foodseg103_path,
                    device=self.device,
                    conf_threshold=self.conf_threshold
                )
                self._foodseg103_available = True
                logger.info("✅ FoodSeg103 segmentor initialized (primary)")
            except FileNotFoundError as e:
                logger.info(f"FoodSeg103 model not found: {e}")
                logger.info("FoodSeg103 will be available after training")
            except Exception as e:
                logger.warning(f"Failed to initialize FoodSeg103: {e}")
        
        # Try YOLOv8 as fallback
        try:
            self._yolo_segmentor = YOLOv8Segmentor(
                model_path=self.yolov8_path,
                device=self.device,
                conf_threshold=self.conf_threshold
            )
            self._yolo_available = True
            if not self._foodseg103_available:
                logger.info("✅ YOLOv8 segmentor initialized (primary)")
            else:
                logger.info("✅ YOLOv8 segmentor initialized (fallback)")
        except Exception as e:
            logger.warning(f"Failed to initialize YOLOv8 segmentor: {e}")
            self._yolo_segmentor = None
            self._yolo_available = False
        
        # Check if any segmentor is available
        if not self._foodseg103_available and not self._yolo_available:
            if self.use_fallback:
                logger.info("No model-based segmentor available, will use GrabCut fallback")
            else:
                self.enabled = False
                logger.warning("Segmentation disabled - no models available")
    
    def segment(self, image: Image.Image, depth_map: Optional[np.ndarray] = None) -> FoodSegmentationResult:
        """
        Segment food in an image.
        
        Args:
            image: PIL Image (RGB)
            depth_map: Optional depth map for depth-based refinement
        
        Returns:
            FoodSegmentationResult with segmentation details
        """
        h, w = np.array(image).shape[:2]
        warnings = []
        
        # Try FoodSeg103 first (best for food)
        if self._foodseg103_available and self._foodseg103_segmentor is not None:
            try:
                result = self._foodseg103_segmentor.segment(image)
                
                if result.num_instances > 0:
                    # FoodSeg103 result'ını dönüştür
                    instances = self._convert_foodseg103_instances(result.instances)
                    
                    detected_classes = list(set(inst.class_name for inst in result.instances))
                    
                    return FoodSegmentationResult(
                        instances=instances,
                        combined_food_mask=result.combined_food_mask,
                        container_mask=None,  # FoodSeg103 sadece yemek tespit eder
                        num_instances=result.num_instances,
                        total_area_pixels=result.total_area_pixels,
                        image_shape=result.image_shape,
                        segmentor_type='foodseg103',
                        warnings=result.warnings,
                        class_distribution=result.class_distribution,
                        detected_food_classes=detected_classes
                    )
                else:
                    warnings.append("FoodSeg103 found no food instances")
                    logger.info("FoodSeg103 found no instances, trying YOLOv8")
            except Exception as e:
                warnings.append(f"FoodSeg103 failed: {str(e)}")
                logger.warning(f"FoodSeg103 segmentation failed: {e}")
        
        # Try YOLOv8 as fallback
        if self._yolo_available and self._yolo_segmentor is not None:
            try:
                result = self._yolo_segmentor.segment(image, filter_food_only=False)
                
                if result.num_instances > 0:
                    return FoodSegmentationResult(
                        instances=result.instances,
                        combined_food_mask=result.combined_food_mask,
                        container_mask=result.container_mask,
                        num_instances=result.num_instances,
                        total_area_pixels=result.total_area_pixels,
                        image_shape=result.image_shape,
                        segmentor_type='yolov8',
                        warnings=result.warnings + warnings,
                        class_distribution={},
                        detected_food_classes=[inst.class_name for inst in result.instances]
                    )
                else:
                    warnings.append("YOLOv8 found no instances, using fallback")
                    logger.info("YOLOv8 found no instances, falling back to GrabCut")
            except Exception as e:
                warnings.append(f"YOLOv8 failed: {str(e)}")
                logger.warning(f"YOLOv8 segmentation failed: {e}")
        
        # Fallback: Use GrabCut + optional depth thresholding
        if self.use_fallback:
            return self._fallback_segment(image, depth_map, warnings)
        
        # No segmentation available
        logger.warning("Segmentation disabled, returning empty result")
        return FoodSegmentationResult(
            instances=[],
            combined_food_mask=None,
            container_mask=None,
            num_instances=0,
            total_area_pixels=0,
            image_shape=(h, w),
            segmentor_type='none',
            warnings=["Segmentation is disabled"] + warnings,
            class_distribution={},
            detected_food_classes=[]
        )
    
    def _convert_foodseg103_instances(self, foodseg_instances: List) -> List[SegmentationInstance]:
        """FoodSeg103 instance'larını SegmentationInstance'a dönüştür."""
        converted = []
        for inst in foodseg_instances:
            seg_inst = SegmentationInstance(
                mask=inst.mask,
                bbox=inst.bbox,
                area_pixels=inst.area_pixels,
                confidence=inst.confidence,
                class_id=inst.class_id,
                class_name=inst.class_name,
                contour=inst.contour
            )
            converted.append(seg_inst)
        return converted
    
    def _fallback_segment(self, image: Image.Image, 
                          depth_map: Optional[np.ndarray],
                          existing_warnings: List[str]) -> FoodSegmentationResult:
        """
        Fallback segmentation using GrabCut and optional depth thresholding.
        
        Args:
            image: PIL Image (RGB)
            depth_map: Optional depth map
            existing_warnings: Warnings from previous attempts
        
        Returns:
            FoodSegmentationResult from fallback methods
        """
        h, w = np.array(image).shape[:2]
        warnings = existing_warnings.copy()
        
        # Step 1: GrabCut segmentation
        grabcut_mask = grabcut_segment(image)
        segmentor_type = 'grabcut'
        
        # Step 2: If depth map available, refine with depth thresholding
        if depth_map is not None:
            depth_mask = depth_threshold_segment(depth_map)
            
            # Combine masks: intersection gives more precise food region
            combined_food_mask = combine_masks(grabcut_mask, depth_mask, 'intersection')
            
            # If intersection is too small, use union instead
            if np.sum(combined_food_mask) < 0.05 * h * w:
                logger.info("Intersection too small, using GrabCut mask directly")
                combined_food_mask = grabcut_mask
                warnings.append("Depth+GrabCut intersection too small, using GrabCut only")
            else:
                segmentor_type = 'grabcut+depth'
                logger.info("Combined GrabCut with depth thresholding")
        else:
            combined_food_mask = grabcut_mask
            warnings.append("No depth map available for refinement")
        
        # Create a synthetic instance from the mask
        area_pixels = int(np.sum(combined_food_mask))
        
        if area_pixels > 0:
            # Find bounding box
            coords = np.where(combined_food_mask > 0)
            y1, y2 = int(np.min(coords[0])), int(np.max(coords[0]))
            x1, x2 = int(np.min(coords[1])), int(np.max(coords[1]))
            
            instance = SegmentationInstance(
                mask=combined_food_mask,
                bbox=(x1, y1, x2, y2),
                area_pixels=area_pixels,
                confidence=0.7,  # Lower confidence for fallback
                class_id=-1,
                class_name='food_region',
                contour=None
            )
            instances = [instance]
            num_instances = 1
        else:
            instances = []
            num_instances = 0
            warnings.append("Fallback segmentation produced empty mask")
        
        logger.info(f"Fallback segmentation ({segmentor_type}): {area_pixels} pixels")
        
        return FoodSegmentationResult(
            instances=instances,
            combined_food_mask=combined_food_mask if area_pixels > 0 else None,
            container_mask=None,
            num_instances=num_instances,
            total_area_pixels=area_pixels,
            image_shape=(h, w),
            segmentor_type=segmentor_type,
            warnings=warnings,
            class_distribution={},
            detected_food_classes=['food_region'] if num_instances > 0 else []
        )
    
    def segment_with_depth(self, image: Image.Image, 
                           depth_map: np.ndarray) -> FoodSegmentationResult:
        """
        Segment food using both image and depth information.
        Depth is used to refine segmentation by extracting closest layer.
        
        Args:
            image: PIL Image (RGB)
            depth_map: Depth map from MiDaS/ZoeDepth
        
        Returns:
            FoodSegmentationResult with depth-refined segmentation
        """
        return self.segment(image, depth_map=depth_map)
    
    def segment_from_path(self, image_path: str) -> FoodSegmentationResult:
        """Segment from image path."""
        image = Image.open(image_path).convert('RGB')
        return self.segment(image)
    
    @property
    def primary_segmentor(self) -> str:
        """Aktif birincil segmentor."""
        if self._foodseg103_available:
            return 'foodseg103'
        elif self._yolo_available:
            return 'yolov8'
        elif self.use_fallback:
            return 'grabcut'
        return 'none'
    
    @property
    def available_segmentors(self) -> List[str]:
        """Kullanılabilir segmentor'lar."""
        available = []
        if self._foodseg103_available:
            available.append('foodseg103')
        if self._yolo_available:
            available.append('yolov8')
        if self.use_fallback:
            available.append('grabcut')
        return available


def load_food_segmentor(foodseg103_path: Optional[str] = None,
                        yolov8_path: Optional[str] = None,
                        device: Optional[str] = None,
                        enabled: bool = True,
                        prefer_foodseg103: bool = True) -> FoodSegmentor:
    """
    Load a food segmentor.
    
    Args:
        foodseg103_path: Path to FoodSeg103 model (optional, auto-detected)
        yolov8_path: Path to YOLOv8-seg model
        device: Device to use
        enabled: Whether to enable segmentation
        prefer_foodseg103: Use FoodSeg103 as primary when available
    
    Returns:
        FoodSegmentor instance
    """
    return FoodSegmentor(
        foodseg103_path=foodseg103_path,
        yolov8_path=yolov8_path,
        device=device,
        enabled=enabled,
        prefer_foodseg103=prefer_foodseg103
    )
