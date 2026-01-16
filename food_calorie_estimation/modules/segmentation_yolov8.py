"""
YOLOv8 segmentation module for food instance segmentation.
Uses ultralytics YOLOv8-seg for detecting and segmenting food instances.
"""

import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field

import numpy as np
from PIL import Image
import cv2

logger = logging.getLogger(__name__)


@dataclass
class SegmentationInstance:
    """A single segmented instance."""
    mask: np.ndarray  # Binary mask (H, W)
    bbox: Tuple[int, int, int, int]  # x1, y1, x2, y2
    area_pixels: int
    confidence: float
    class_id: int
    class_name: str
    contour: Optional[np.ndarray] = None
    
    
@dataclass  
class SegmentationResult:
    """Result of segmentation on an image."""
    instances: List[SegmentationInstance]
    image_shape: Tuple[int, int]  # (H, W)
    num_instances: int
    total_area_pixels: int
    warnings: List[str] = field(default_factory=list)
    segmentor_type: str = 'yolov8-seg'
    # Combined mask for food + container (useful for masking depth)
    combined_food_mask: Optional[np.ndarray] = None
    container_mask: Optional[np.ndarray] = None


class YOLOv8Segmentor:
    """
    YOLOv8-seg based food segmentor.
    """
    
    # Minimum mask area as fraction of image area (noise threshold)
    MIN_AREA_RATIO = 0.001  # 0.1% of image
    
    # Maximum overlap ratio for merging masks
    MERGE_IOU_THRESHOLD = 0.7
    
    # COCO class names for reference (food-related filtering)
    FOOD_RELATED_CLASSES = {
        'apple', 'banana', 'orange', 'broccoli', 'carrot', 'hot dog', 
        'pizza', 'donut', 'cake', 'sandwich', 'bowl', 'cup', 'fork', 
        'knife', 'spoon', 'dining table', 'bottle', 'wine glass'
    }
    
    # Container classes for combined food+container mask
    CONTAINER_CLASSES = {'bowl', 'cup', 'wine glass', 'bottle'}
    
    # Food classes that contain the actual food
    FOOD_CLASSES = {'apple', 'banana', 'orange', 'broccoli', 'carrot', 'hot dog',
                    'pizza', 'donut', 'cake', 'sandwich'}
    
    def __init__(self,
                 model_path: Optional[str] = None,
                 device: Optional[str] = None,
                 conf_threshold: float = 0.25,
                 iou_threshold: float = 0.7):
        """
        Initialize YOLOv8 segmentor.
        
        Args:
            model_path: Path to YOLOv8-seg weights. If None, uses yolov8n-seg pretrained.
            device: Device to use ('cuda', 'cpu', or None for auto)
            conf_threshold: Confidence threshold for detections
            iou_threshold: IoU threshold for NMS
        """
        self.model_path = model_path
        self.device = device
        self.conf_threshold = conf_threshold
        self.iou_threshold = iou_threshold
        
        self.model = self._load_model()
        logger.info(f"YOLOv8 segmentor initialized. Model: {model_path or 'yolov8n-seg'}")
    
    def _load_model(self):
        """Load YOLOv8-seg model."""
        try:
            from ultralytics import YOLO
        except ImportError:
            raise ImportError(
                "ultralytics package not installed. Please install with:\n"
                "pip install ultralytics"
            )
        
        if self.model_path is not None:
            model_path = Path(self.model_path)
            if not model_path.exists():
                raise FileNotFoundError(f"YOLOv8-seg model not found: {model_path}")
            model = YOLO(str(model_path))
        else:
            # Use pretrained yolov8n-seg
            model = YOLO('yolov8n-seg.pt')
            logger.info("Using pretrained yolov8n-seg model")
        
        return model
    
    def segment(self,
                image: Image.Image,
                filter_food_only: bool = False) -> SegmentationResult:
        """
        Segment instances in an image.
        
        Args:
            image: PIL Image (RGB)
            filter_food_only: If True, only return food-related detections
        
        Returns:
            SegmentationResult with instances
        """
        # Convert to numpy
        image_np = np.array(image)
        h, w = image_np.shape[:2]
        min_area = int(h * w * self.MIN_AREA_RATIO)
        
        # Run inference
        results = self.model.predict(
            image_np,
            conf=self.conf_threshold,
            iou=self.iou_threshold,
            device=self.device,
            verbose=False
        )
        
        instances = []
        warnings = []
        
        if len(results) == 0 or results[0].masks is None:
            logger.warning("No segmentation masks detected")
            warnings.append("No instances detected by YOLOv8-seg")
            return SegmentationResult(
                instances=[],
                image_shape=(h, w),
                num_instances=0,
                total_area_pixels=0,
                warnings=warnings,
                segmentor_type='yolov8-seg',
                combined_food_mask=None,
                container_mask=None
            )
        
        result = results[0]
        masks = result.masks.data.cpu().numpy()  # (N, H, W)
        boxes = result.boxes.xyxy.cpu().numpy()  # (N, 4)
        confidences = result.boxes.conf.cpu().numpy()  # (N,)
        class_ids = result.boxes.cls.cpu().numpy().astype(int)  # (N,)
        class_names = [result.names[cid] for cid in class_ids]
        
        for i in range(len(masks)):
            mask = masks[i]
            
            # Resize mask to original image size if needed
            if mask.shape != (h, w):
                mask = cv2.resize(mask, (w, h), interpolation=cv2.INTER_NEAREST)
            
            # Binarize mask
            mask = (mask > 0.5).astype(np.uint8)
            area = int(np.sum(mask))
            
            # Filter small masks
            if area < min_area:
                continue
            
            # Filter food-only if requested
            class_name = class_names[i]
            if filter_food_only and class_name.lower() not in self.FOOD_RELATED_CLASSES:
                continue
            
            # Extract contour
            contour = self._get_largest_contour(mask)
            
            bbox = tuple(boxes[i].astype(int))
            
            instance = SegmentationInstance(
                mask=mask,
                bbox=bbox,
                area_pixels=area,
                confidence=float(confidences[i]),
                class_id=int(class_ids[i]),
                class_name=class_name,
                contour=contour
            )
            instances.append(instance)
        
        # Post-processing: merge highly overlapping masks
        instances = self._merge_overlapping(instances)
        
        # Sort by area (largest first)
        instances.sort(key=lambda x: x.area_pixels, reverse=True)
        
        total_area = sum(inst.area_pixels for inst in instances)
        
        logger.info(f"Segmented {len(instances)} instances (total area: {total_area} px)")
        
        # Create combined food mask and container mask
        combined_food_mask = np.zeros((h, w), dtype=np.uint8)
        container_mask = np.zeros((h, w), dtype=np.uint8)
        
        for inst in instances:
            # Add to combined food mask (everything detected)
            combined_food_mask = np.logical_or(combined_food_mask, inst.mask).astype(np.uint8)
            
            # Track container masks separately
            if inst.class_name.lower() in self.CONTAINER_CLASSES:
                container_mask = np.logical_or(container_mask, inst.mask).astype(np.uint8)
        
        return SegmentationResult(
            instances=instances,
            image_shape=(h, w),
            num_instances=len(instances),
            total_area_pixels=total_area,
            warnings=warnings,
            segmentor_type='yolov8-seg',
            combined_food_mask=combined_food_mask if np.sum(combined_food_mask) > 0 else None,
            container_mask=container_mask if np.sum(container_mask) > 0 else None
        )
    
    def _get_largest_contour(self, mask: np.ndarray) -> Optional[np.ndarray]:
        """Extract largest contour from binary mask."""
        contours, _ = cv2.findContours(
            mask * 255, 
            cv2.RETR_EXTERNAL, 
            cv2.CHAIN_APPROX_SIMPLE
        )
        
        if not contours:
            return None
        
        return max(contours, key=cv2.contourArea)
    
    def _merge_overlapping(self, 
                           instances: List[SegmentationInstance]) -> List[SegmentationInstance]:
        """Merge highly overlapping instances."""
        if len(instances) <= 1:
            return instances
        
        merged = []
        used = set()
        
        for i, inst1 in enumerate(instances):
            if i in used:
                continue
            
            # Check for overlaps with remaining instances
            current_mask = inst1.mask.copy()
            current_area = inst1.area_pixels
            current_conf = inst1.confidence
            
            for j, inst2 in enumerate(instances):
                if j <= i or j in used:
                    continue
                
                # Compute IoU
                intersection = np.sum(np.logical_and(current_mask, inst2.mask))
                union = np.sum(np.logical_or(current_mask, inst2.mask))
                
                if union > 0:
                    iou = intersection / union
                    if iou > self.MERGE_IOU_THRESHOLD:
                        # Merge masks
                        current_mask = np.logical_or(current_mask, inst2.mask).astype(np.uint8)
                        current_area = int(np.sum(current_mask))
                        current_conf = max(current_conf, inst2.confidence)
                        used.add(j)
            
            # Update instance with merged mask
            inst1.mask = current_mask
            inst1.area_pixels = current_area
            inst1.confidence = current_conf
            inst1.contour = self._get_largest_contour(current_mask)
            
            merged.append(inst1)
        
        return merged
    
    def segment_from_path(self, 
                          image_path: str,
                          filter_food_only: bool = False) -> SegmentationResult:
        """Convenience method to segment from image path."""
        image = Image.open(image_path).convert('RGB')
        return self.segment(image, filter_food_only=filter_food_only)


def create_food_mask(instances: List[SegmentationInstance],
                     image_shape: Tuple[int, int]) -> np.ndarray:
    """
    Create a combined mask from all instances.
    
    Args:
        instances: List of segmentation instances
        image_shape: (H, W) of the image
    
    Returns:
        Combined binary mask
    """
    h, w = image_shape
    combined = np.zeros((h, w), dtype=np.uint8)
    
    for inst in instances:
        combined = np.logical_or(combined, inst.mask).astype(np.uint8)
    
    return combined


def load_segmentor(model_path: Optional[str] = None,
                   device: Optional[str] = None,
                   conf_threshold: float = 0.25) -> YOLOv8Segmentor:
    """
    Load YOLOv8 segmentor.
    
    Args:
        model_path: Path to YOLOv8-seg model (optional, uses pretrained if None)
        device: Device to use (optional)
        conf_threshold: Confidence threshold
    
    Returns:
        YOLOv8Segmentor instance
    """
    return YOLOv8Segmentor(
        model_path=model_path,
        device=device,
        conf_threshold=conf_threshold
    )
