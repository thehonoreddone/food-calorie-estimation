"""
Data Augmentation Pipeline for Food Segmentation
"""
import random
from typing import Tuple, List, Optional, Dict, Any
from pathlib import Path

import numpy as np
from PIL import Image
import cv2


class AugmentationPipeline:
    """
    Augmentation pipeline for food images and segmentation masks.
    Designed for YOLOv8-seg training.
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize augmentation pipeline.
        
        Args:
            config: Augmentation configuration
        """
        self.config = config or self._default_config()
    
    def _default_config(self) -> Dict[str, Any]:
        """Default augmentation configuration"""
        return {
            # Geometric transforms
            "flip_horizontal": 0.5,
            "flip_vertical": 0.1,
            "rotate_range": (-15, 15),
            "scale_range": (0.8, 1.2),
            
            # Color transforms
            "brightness_range": (0.8, 1.2),
            "contrast_range": (0.8, 1.2),
            "saturation_range": (0.8, 1.2),
            "hue_range": (-0.1, 0.1),
            
            # Advanced
            "mixup": 0.0,
            "cutout": 0.0,
            "mosaic": 0.0,
            
            # Food-specific
            "plate_color_shift": 0.3,  # Shift background plate color
            "lighting_variation": 0.5,  # Simulate different lighting
        }
    
    def apply(
        self,
        image: np.ndarray,
        mask: Optional[np.ndarray] = None,
    ) -> Tuple[np.ndarray, Optional[np.ndarray]]:
        """
        Apply augmentation pipeline to image and mask.
        
        Args:
            image: Input image (H, W, C)
            mask: Optional segmentation mask (H, W)
            
        Returns:
            Tuple of (augmented_image, augmented_mask)
        """
        # Horizontal flip
        if random.random() < self.config["flip_horizontal"]:
            image = cv2.flip(image, 1)
            if mask is not None:
                mask = cv2.flip(mask, 1)
        
        # Vertical flip
        if random.random() < self.config["flip_vertical"]:
            image = cv2.flip(image, 0)
            if mask is not None:
                mask = cv2.flip(mask, 0)
        
        # Rotation
        if self.config["rotate_range"][1] > 0:
            angle = random.uniform(*self.config["rotate_range"])
            image, mask = self._rotate(image, mask, angle)
        
        # Scale
        if self.config["scale_range"][1] > 1.0:
            scale = random.uniform(*self.config["scale_range"])
            image, mask = self._scale(image, mask, scale)
        
        # Color augmentation
        image = self._color_augment(image)
        
        # Lighting variation
        if random.random() < self.config["lighting_variation"]:
            image = self._lighting_augment(image)
        
        return image, mask
    
    def _rotate(
        self,
        image: np.ndarray,
        mask: Optional[np.ndarray],
        angle: float,
    ) -> Tuple[np.ndarray, Optional[np.ndarray]]:
        """Rotate image and mask"""
        h, w = image.shape[:2]
        center = (w // 2, h // 2)
        matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
        
        image = cv2.warpAffine(image, matrix, (w, h), borderMode=cv2.BORDER_REFLECT)
        
        if mask is not None:
            mask = cv2.warpAffine(mask, matrix, (w, h), borderMode=cv2.BORDER_CONSTANT)
        
        return image, mask
    
    def _scale(
        self,
        image: np.ndarray,
        mask: Optional[np.ndarray],
        scale: float,
    ) -> Tuple[np.ndarray, Optional[np.ndarray]]:
        """Scale image and mask"""
        h, w = image.shape[:2]
        new_h, new_w = int(h * scale), int(w * scale)
        
        image = cv2.resize(image, (new_w, new_h))
        
        if mask is not None:
            mask = cv2.resize(mask, (new_w, new_h), interpolation=cv2.INTER_NEAREST)
        
        # Crop or pad to original size
        if scale > 1.0:
            # Center crop
            start_h = (new_h - h) // 2
            start_w = (new_w - w) // 2
            image = image[start_h:start_h+h, start_w:start_w+w]
            if mask is not None:
                mask = mask[start_h:start_h+h, start_w:start_w+w]
        else:
            # Pad
            pad_h = (h - new_h) // 2
            pad_w = (w - new_w) // 2
            image = cv2.copyMakeBorder(
                image, pad_h, h-new_h-pad_h, pad_w, w-new_w-pad_w,
                cv2.BORDER_REFLECT
            )
            if mask is not None:
                mask = cv2.copyMakeBorder(
                    mask, pad_h, h-new_h-pad_h, pad_w, w-new_w-pad_w,
                    cv2.BORDER_CONSTANT, value=0
                )
        
        return image, mask
    
    def _color_augment(self, image: np.ndarray) -> np.ndarray:
        """Apply color augmentation"""
        # Convert to float
        image = image.astype(np.float32) / 255.0
        
        # Brightness
        brightness = random.uniform(*self.config["brightness_range"])
        image = image * brightness
        
        # Contrast
        contrast = random.uniform(*self.config["contrast_range"])
        mean = image.mean()
        image = (image - mean) * contrast + mean
        
        # Saturation (in HSV)
        hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
        saturation = random.uniform(*self.config["saturation_range"])
        hsv[:, :, 1] = hsv[:, :, 1] * saturation
        image = cv2.cvtColor(hsv, cv2.COLOR_HSV2RGB)
        
        # Clip and convert back
        image = np.clip(image, 0, 1)
        image = (image * 255).astype(np.uint8)
        
        return image
    
    def _lighting_augment(self, image: np.ndarray) -> np.ndarray:
        """Simulate different lighting conditions"""
        # Random lighting direction
        h, w = image.shape[:2]
        
        # Create gradient mask for directional lighting
        direction = random.choice(["top", "bottom", "left", "right", "center"])
        
        if direction == "top":
            gradient = np.linspace(1.2, 0.8, h)[:, np.newaxis]
        elif direction == "bottom":
            gradient = np.linspace(0.8, 1.2, h)[:, np.newaxis]
        elif direction == "left":
            gradient = np.linspace(1.2, 0.8, w)[np.newaxis, :]
        elif direction == "right":
            gradient = np.linspace(0.8, 1.2, w)[np.newaxis, :]
        else:  # center (vignette)
            y, x = np.ogrid[:h, :w]
            center_y, center_x = h // 2, w // 2
            dist = np.sqrt((x - center_x)**2 + (y - center_y)**2)
            max_dist = np.sqrt(center_x**2 + center_y**2)
            gradient = 1.0 - 0.3 * (dist / max_dist)
        
        # Apply gradient
        image = image.astype(np.float32)
        for c in range(3):
            image[:, :, c] = image[:, :, c] * gradient
        
        image = np.clip(image, 0, 255).astype(np.uint8)
        return image


def create_augmentation_config(intensity: str = "medium") -> Dict[str, Any]:
    """
    Create augmentation configuration preset.
    
    Args:
        intensity: "light", "medium", or "heavy"
        
    Returns:
        Configuration dictionary
    """
    if intensity == "light":
        return {
            "flip_horizontal": 0.5,
            "flip_vertical": 0.0,
            "rotate_range": (-5, 5),
            "scale_range": (0.95, 1.05),
            "brightness_range": (0.9, 1.1),
            "contrast_range": (0.9, 1.1),
            "saturation_range": (0.9, 1.1),
            "hue_range": (-0.05, 0.05),
            "lighting_variation": 0.2,
            "plate_color_shift": 0.1,
        }
    elif intensity == "heavy":
        return {
            "flip_horizontal": 0.5,
            "flip_vertical": 0.2,
            "rotate_range": (-30, 30),
            "scale_range": (0.5, 1.5),
            "brightness_range": (0.5, 1.5),
            "contrast_range": (0.5, 1.5),
            "saturation_range": (0.5, 1.5),
            "hue_range": (-0.2, 0.2),
            "lighting_variation": 0.8,
            "plate_color_shift": 0.5,
        }
    else:  # medium
        return AugmentationPipeline()._default_config()
