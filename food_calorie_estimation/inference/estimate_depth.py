"""
Monocular depth estimation module.
Uses MiDaS or ZoeDepth for relative depth estimation.
IMPORTANT: Depth values are RELATIVE, not metric.
"""

import logging
from pathlib import Path
from typing import Optional, Tuple, Dict, Any
from dataclasses import dataclass

import numpy as np
from PIL import Image
import torch
import cv2

logger = logging.getLogger(__name__)


@dataclass
class DepthResult:
    """Result of depth estimation."""
    depth_map: np.ndarray  # (H, W) float32, relative depth values
    depth_min: float
    depth_max: float
    depth_range: float
    model_type: str
    normalized_depth: np.ndarray  # 0-1 normalized depth map
    warnings: list


class DepthEstimator:
    """
    Monocular depth estimator using MiDaS or ZoeDepth.
    Provides RELATIVE depth only - not metric/absolute depth.
    """
    
    SUPPORTED_MODELS = {
        'midas_small': 'MiDaS_small',
        'midas_hybrid': 'DPT_Hybrid',
        'midas_large': 'DPT_Large',
        'zoedepth': 'zoedepth'
    }
    
    def __init__(self,
                 model_type: str = 'midas_small',
                 device: Optional[str] = None):
        """
        Initialize depth estimator.
        
        Args:
            model_type: Type of depth model to use
            device: Device to use ('cuda', 'cpu', or None for auto)
        """
        self.model_type = model_type.lower()
        self.device = self._get_device(device)
        
        if self.model_type not in self.SUPPORTED_MODELS:
            logger.warning(f"Unknown model type '{model_type}', using 'midas_small'")
            self.model_type = 'midas_small'
        
        self.model = None
        self.transform = None
        self._loaded = False
        
        # Lazy loading
        logger.info(f"Depth estimator configured with model: {self.model_type}")
    
    def _get_device(self, device: Optional[str]) -> torch.device:
        """Determine device to use."""
        if device is not None:
            return torch.device(device)
        
        if torch.cuda.is_available():
            return torch.device('cuda')
        
        return torch.device('cpu')
    
    def _load_model(self):
        """Load the depth model (lazy loading)."""
        if self._loaded:
            return
        
        if self.model_type.startswith('midas'):
            self._load_midas()
        elif self.model_type == 'zoedepth':
            self._load_zoedepth()
        else:
            self._load_midas()
        
        self._loaded = True
    
    def _load_midas(self):
        """Load MiDaS model."""
        try:
            # Use torch hub to load MiDaS
            model_name = self.SUPPORTED_MODELS[self.model_type]
            
            self.model = torch.hub.load(
                'intel-isl/MiDaS',
                model_name,
                pretrained=True,
                trust_repo=True
            )
            self.model = self.model.to(self.device)
            self.model.eval()
            
            # Load transforms
            midas_transforms = torch.hub.load(
                'intel-isl/MiDaS',
                'transforms',
                trust_repo=True
            )
            
            if self.model_type == 'midas_small':
                self.transform = midas_transforms.small_transform
            else:
                self.transform = midas_transforms.dpt_transform
            
            logger.info(f"MiDaS model loaded: {model_name}")
            
        except Exception as e:
            logger.error(f"Failed to load MiDaS model: {e}")
            raise RuntimeError(f"Failed to load MiDaS model: {e}")
    
    def _load_zoedepth(self):
        """Load ZoeDepth model."""
        try:
            # ZoeDepth via torch hub
            self.model = torch.hub.load(
                'isl-org/ZoeDepth',
                'ZoeD_N',
                pretrained=True,
                trust_repo=True
            )
            self.model = self.model.to(self.device)
            self.model.eval()
            
            # ZoeDepth has its own preprocessing
            self.transform = None
            
            logger.info("ZoeDepth model loaded")
            
        except Exception as e:
            logger.warning(f"Failed to load ZoeDepth, falling back to MiDaS: {e}")
            self.model_type = 'midas_small'
            self._load_midas()
    
    @torch.no_grad()
    def estimate(self, image: Image.Image) -> DepthResult:
        """
        Estimate relative depth from an image.
        
        Args:
            image: PIL Image (RGB)
        
        Returns:
            DepthResult with depth map and statistics
        """
        self._load_model()
        
        warnings = []
        
        # Convert to numpy array
        image_np = np.array(image)
        h, w = image_np.shape[:2]
        
        if self.model_type == 'zoedepth':
            depth_map = self._estimate_zoedepth(image)
        else:
            depth_map = self._estimate_midas(image_np)
        
        # Resize depth map to original size if needed
        if depth_map.shape != (h, w):
            depth_map = cv2.resize(depth_map, (w, h), interpolation=cv2.INTER_LINEAR)
        
        # Compute statistics
        depth_min = float(np.min(depth_map))
        depth_max = float(np.max(depth_map))
        depth_range = depth_max - depth_min
        
        # Normalize to 0-1
        if depth_range > 0:
            normalized = (depth_map - depth_min) / depth_range
        else:
            normalized = np.zeros_like(depth_map)
            warnings.append("Depth map has zero range")
        
        return DepthResult(
            depth_map=depth_map,
            depth_min=depth_min,
            depth_max=depth_max,
            depth_range=depth_range,
            model_type=self.model_type,
            normalized_depth=normalized.astype(np.float32),
            warnings=warnings
        )
    
    def _estimate_midas(self, image_np: np.ndarray) -> np.ndarray:
        """Run MiDaS inference."""
        # Apply transform
        input_batch = self.transform(image_np).to(self.device)
        
        # Inference
        prediction = self.model(input_batch)
        
        # Resize and convert
        prediction = torch.nn.functional.interpolate(
            prediction.unsqueeze(1),
            size=image_np.shape[:2],
            mode='bicubic',
            align_corners=False
        ).squeeze()
        
        depth_map = prediction.cpu().numpy()
        
        return depth_map.astype(np.float32)
    
    def _estimate_zoedepth(self, image: Image.Image) -> np.ndarray:
        """Run ZoeDepth inference."""
        # ZoeDepth expects PIL image directly
        depth_map = self.model.infer_pil(image)
        
        return depth_map.astype(np.float32)
    
    def estimate_from_path(self, image_path: str) -> DepthResult:
        """Estimate depth from image path."""
        image = Image.open(image_path).convert('RGB')
        return self.estimate(image)


def compute_depth_stats_in_mask(depth_map: np.ndarray,
                                mask: np.ndarray) -> Dict[str, float]:
    """
    Compute robust depth statistics within a mask.
    
    Args:
        depth_map: Depth values (H, W)
        mask: Binary mask (H, W)
    
    Returns:
        Dictionary with depth statistics
    """
    # Extract depth values in mask
    depth_values = depth_map[mask > 0]
    
    if len(depth_values) == 0:
        return {
            'mean': 0.0,
            'median': 0.0,
            'std': 0.0,
            'min': 0.0,
            'max': 0.0,
            'trimmed_mean': 0.0,
            'range': 0.0,
            'count': 0
        }
    
    # Robust statistics
    sorted_depths = np.sort(depth_values)
    n = len(sorted_depths)
    
    # Trimmed mean (exclude top/bottom 10%)
    trim = max(1, n // 10)
    if n > 2 * trim:
        trimmed = sorted_depths[trim:-trim]
        trimmed_mean = float(np.mean(trimmed))
    else:
        trimmed_mean = float(np.mean(sorted_depths))
    
    return {
        'mean': float(np.mean(depth_values)),
        'median': float(np.median(depth_values)),
        'std': float(np.std(depth_values)),
        'min': float(np.min(depth_values)),
        'max': float(np.max(depth_values)),
        'trimmed_mean': trimmed_mean,
        'range': float(np.max(depth_values) - np.min(depth_values)),
        'count': n
    }


def load_depth_estimator(model_type: str = 'midas_small',
                         device: Optional[str] = None) -> DepthEstimator:
    """
    Load a depth estimator.
    
    Args:
        model_type: Model type ('midas_small', 'midas_hybrid', 'midas_large', 'zoedepth')
        device: Device to use
    
    Returns:
        DepthEstimator instance
    """
    return DepthEstimator(model_type=model_type, device=device)
