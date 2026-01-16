"""
Container detector module for liquid food handling.
Detects cups, bowls, glasses and estimates fill level/volume.
"""

import logging
from typing import Optional, Tuple, List, Dict, Any
from dataclasses import dataclass

import numpy as np
from PIL import Image
import cv2

logger = logging.getLogger(__name__)


@dataclass
class ContainerDetection:
    """Detected container information."""
    container_type: str  # 'cup', 'bowl', 'glass', 'mug', 'unknown'
    bbox: Tuple[int, int, int, int]  # x1, y1, x2, y2
    center: Tuple[int, int]
    confidence: float
    estimated_diameter_pixels: float
    estimated_height_pixels: float
    mask: Optional[np.ndarray] = None


@dataclass
class FillLevelResult:
    """Result of fill level estimation."""
    fill_ratio: float  # 0.0 to 1.0
    liquid_height_pixels: float
    container_height_pixels: float
    estimated_volume_ml: float
    method: str
    confidence: float
    warnings: List[str]


# Standard container dimensions (approximate, in cm)
CONTAINER_DIMENSIONS = {
    'cup': {'diameter_cm': 8.0, 'height_cm': 9.0, 'typical_volume_ml': 250},
    'mug': {'diameter_cm': 8.5, 'height_cm': 10.0, 'typical_volume_ml': 300},
    'glass': {'diameter_cm': 7.0, 'height_cm': 12.0, 'typical_volume_ml': 300},
    'bowl': {'diameter_cm': 15.0, 'height_cm': 6.0, 'typical_volume_ml': 400},
    'small_cup': {'diameter_cm': 5.5, 'height_cm': 5.5, 'typical_volume_ml': 70},  # Turkish coffee cup
    'tea_glass': {'diameter_cm': 5.0, 'height_cm': 8.0, 'typical_volume_ml': 100},  # Turkish tea glass
    'espresso_cup': {'diameter_cm': 5.5, 'height_cm': 5.0, 'typical_volume_ml': 60},
    'unknown': {'diameter_cm': 8.0, 'height_cm': 9.0, 'typical_volume_ml': 250}
}


class ContainerDetector:
    """
    Container detector for liquid food estimation.
    Uses a combination of classical CV and optional YOLO detection.
    """
    
    def __init__(self, 
                 use_yolo: bool = True,
                 device: Optional[str] = None):
        """
        Initialize container detector.
        
        Args:
            use_yolo: Whether to use YOLO for container detection
            device: Device to use
        """
        self.use_yolo = use_yolo
        self.device = device
        self._yolo_model = None
        
        if self.use_yolo:
            self._init_yolo()
    
    def _init_yolo(self):
        """Initialize YOLO model for container detection."""
        try:
            from ultralytics import YOLO
            self._yolo_model = YOLO('yolov8n.pt')  # Use detection model
            logger.info("YOLO model initialized for container detection")
        except ImportError:
            logger.warning("YOLO not available, using classical detection only")
            self.use_yolo = False
        except Exception as e:
            logger.warning(f"Failed to load YOLO model: {e}")
            self.use_yolo = False
    
    def detect_container(self, 
                         image: Image.Image,
                         segmentation_mask: Optional[np.ndarray] = None) -> Optional[ContainerDetection]:
        """
        Detect a container in the image.
        
        Args:
            image: PIL Image (RGB)
            segmentation_mask: Optional food/liquid segmentation mask
        
        Returns:
            ContainerDetection or None if no container found
        """
        image_np = np.array(image)
        h, w = image_np.shape[:2]
        
        # Try YOLO detection first
        if self.use_yolo and self._yolo_model is not None:
            detection = self._detect_with_yolo(image_np)
            if detection is not None:
                return detection
        
        # Fallback to classical detection
        detection = self._detect_classical(image_np, segmentation_mask)
        
        return detection
    
    def _detect_with_yolo(self, image_np: np.ndarray) -> Optional[ContainerDetection]:
        """Detect container using YOLO."""
        results = self._yolo_model.predict(
            image_np,
            conf=0.3,
            verbose=False
        )
        
        if len(results) == 0:
            return None
        
        result = results[0]
        
        # Container-related COCO classes
        container_classes = {
            'cup': 'cup',
            'bowl': 'bowl',
            'wine glass': 'glass',
            'bottle': 'glass'
        }
        
        for i, (box, cls, conf) in enumerate(zip(
            result.boxes.xyxy.cpu().numpy(),
            result.boxes.cls.cpu().numpy(),
            result.boxes.conf.cpu().numpy()
        )):
            class_name = result.names[int(cls)]
            
            if class_name in container_classes:
                x1, y1, x2, y2 = map(int, box)
                center = ((x1 + x2) // 2, (y1 + y2) // 2)
                width = x2 - x1
                height = y2 - y1
                
                return ContainerDetection(
                    container_type=container_classes[class_name],
                    bbox=(x1, y1, x2, y2),
                    center=center,
                    confidence=float(conf),
                    estimated_diameter_pixels=float(width),
                    estimated_height_pixels=float(height),
                    mask=None
                )
        
        return None
    
    def _detect_classical(self, 
                          image_np: np.ndarray,
                          mask: Optional[np.ndarray] = None) -> Optional[ContainerDetection]:
        """Detect container using classical CV methods."""
        h, w = image_np.shape[:2]
        
        # Convert to grayscale
        gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
        
        # Try to detect circular/elliptical objects (top of cup/bowl)
        blurred = cv2.GaussianBlur(gray, (9, 9), 2)
        
        # Edge detection
        edges = cv2.Canny(blurred, 50, 150)
        
        # Find ellipses (more general than circles)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        best_ellipse = None
        best_score = 0
        
        for contour in contours:
            if len(contour) < 5:
                continue
            
            area = cv2.contourArea(contour)
            if area < 500 or area > h * w * 0.5:
                continue
            
            # Fit ellipse
            ellipse = cv2.fitEllipse(contour)
            center, axes, angle = ellipse
            
            # Check if it could be a container (circular-ish, in upper-middle region)
            aspect_ratio = min(axes) / max(axes) if max(axes) > 0 else 0
            
            # Score based on circularity and position
            score = aspect_ratio * (1 - abs(center[0] / w - 0.5))
            
            if score > best_score:
                best_score = score
                best_ellipse = ellipse
        
        if best_ellipse is not None and best_score > 0.3:
            center, axes, angle = best_ellipse
            cx, cy = int(center[0]), int(center[1])
            diameter = max(axes)
            
            # Estimate container height from diameter (heuristic)
            estimated_height = diameter * 1.2
            
            return ContainerDetection(
                container_type='cup',  # Default assumption
                bbox=(int(cx - diameter/2), int(cy - estimated_height/2),
                      int(cx + diameter/2), int(cy + estimated_height/2)),
                center=(cx, cy),
                confidence=min(0.5, best_score),
                estimated_diameter_pixels=diameter,
                estimated_height_pixels=estimated_height,
                mask=None
            )
        
        # Fallback: use mask centroid if available
        if mask is not None and np.sum(mask) > 0:
            moments = cv2.moments(mask.astype(np.uint8))
            if moments['m00'] > 0:
                cx = int(moments['m10'] / moments['m00'])
                cy = int(moments['m01'] / moments['m00'])
                
                # Estimate from mask extent
                ys, xs = np.where(mask > 0)
                width = np.max(xs) - np.min(xs)
                height = np.max(ys) - np.min(ys)
                
                return ContainerDetection(
                    container_type='unknown',
                    bbox=(int(np.min(xs)), int(np.min(ys)),
                          int(np.max(xs)), int(np.max(ys))),
                    center=(cx, cy),
                    confidence=0.3,
                    estimated_diameter_pixels=float(width),
                    estimated_height_pixels=float(height),
                    mask=mask
                )
        
        return None
    
    def estimate_fill_level(self,
                            image: Image.Image,
                            container: ContainerDetection,
                            liquid_mask: Optional[np.ndarray] = None) -> FillLevelResult:
        """
        Estimate fill level of a detected container.
        
        Args:
            image: PIL Image
            container: Detected container
            liquid_mask: Optional mask of liquid region
        
        Returns:
            FillLevelResult with volume estimation
        """
        warnings = []
        image_np = np.array(image)
        h, w = image_np.shape[:2]
        
        x1, y1, x2, y2 = container.bbox
        container_height = y2 - y1
        
        # Method 1: Use liquid mask if available
        if liquid_mask is not None and np.sum(liquid_mask) > 0:
            # Find liquid extent within container bbox
            roi_mask = liquid_mask[y1:y2, x1:x2]
            
            if np.sum(roi_mask) > 0:
                ys = np.where(np.any(roi_mask, axis=1))[0]
                if len(ys) > 0:
                    liquid_top = np.min(ys)
                    liquid_bottom = np.max(ys)
                    liquid_height = liquid_bottom - liquid_top
                    
                    fill_ratio = liquid_height / container_height if container_height > 0 else 0.5
                    fill_ratio = np.clip(fill_ratio, 0.1, 1.0)
                    
                    volume_ml = self._estimate_volume(container, fill_ratio)
                    
                    return FillLevelResult(
                        fill_ratio=float(fill_ratio),
                        liquid_height_pixels=float(liquid_height),
                        container_height_pixels=float(container_height),
                        estimated_volume_ml=volume_ml,
                        method='mask_analysis',
                        confidence=0.6,
                        warnings=warnings
                    )
        
        # Method 2: Color analysis within container region
        roi = image_np[y1:y2, x1:x2]
        
        if roi.size > 0:
            # Look for liquid-like color patterns (darker at top for empty space)
            gray_roi = cv2.cvtColor(roi, cv2.COLOR_RGB2GRAY)
            
            # Simple heuristic: liquid appears in lower portion
            # Assume ~70% fill by default
            fill_ratio = 0.7
            warnings.append("Using default fill ratio (70%)")
        else:
            fill_ratio = 0.7
            warnings.append("Container ROI invalid, using default")
        
        volume_ml = self._estimate_volume(container, fill_ratio)
        
        return FillLevelResult(
            fill_ratio=fill_ratio,
            liquid_height_pixels=float(container_height * fill_ratio),
            container_height_pixels=float(container_height),
            estimated_volume_ml=volume_ml,
            method='heuristic',
            confidence=0.4,
            warnings=warnings
        )
    
    def _estimate_volume(self, container: ContainerDetection, fill_ratio: float) -> float:
        """Estimate volume in ml from container dimensions and fill ratio."""
        dims = CONTAINER_DIMENSIONS.get(container.container_type, 
                                         CONTAINER_DIMENSIONS['unknown'])
        
        # Scale typical volume by fill ratio
        typical_volume = dims['typical_volume_ml']
        estimated_volume = typical_volume * fill_ratio
        
        # Adjust based on container size relative to typical
        # (If container looks larger/smaller than typical)
        size_ratio = container.estimated_diameter_pixels / 200.0  # Assume 200px is typical
        size_ratio = np.clip(size_ratio, 0.5, 2.0)
        
        estimated_volume *= size_ratio
        
        return float(np.clip(estimated_volume, 30, 600))


def estimate_liquid_volume(image: Image.Image,
                           liquid_mask: Optional[np.ndarray] = None,
                           container_type: str = 'cup') -> Tuple[float, float, List[str]]:
    """
    Estimate liquid volume from an image.
    
    Args:
        image: PIL Image
        liquid_mask: Optional liquid segmentation mask
        container_type: Assumed container type
    
    Returns:
        Tuple of (volume_ml, confidence, warnings)
    """
    detector = ContainerDetector(use_yolo=True)
    
    # Detect container
    container = detector.detect_container(image, liquid_mask)
    
    if container is None:
        # Use default container
        h, w = np.array(image).shape[:2]
        container = ContainerDetection(
            container_type=container_type,
            bbox=(w//4, h//4, 3*w//4, 3*h//4),
            center=(w//2, h//2),
            confidence=0.3,
            estimated_diameter_pixels=w * 0.4,
            estimated_height_pixels=h * 0.5,
            mask=None
        )
    
    # Estimate fill level
    result = detector.estimate_fill_level(image, container, liquid_mask)
    
    return result.estimated_volume_ml, result.confidence, result.warnings
