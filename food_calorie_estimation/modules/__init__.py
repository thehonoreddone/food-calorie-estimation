# Core modules for food calorie estimation

from .segmentation_yolov8 import (
    YOLOv8Segmentor,
    SegmentationInstance,
    SegmentationResult,
    create_food_mask,
    load_segmentor
)

# FoodSeg103 module (available after training)
try:
    from .segmentation_foodseg103 import (
        FoodSeg103Segmentor,
        FoodInstance,
        FoodSegmentationResult,
        load_foodseg103_segmentor
    )
    FOODSEG103_AVAILABLE = True
except ImportError:
    FOODSEG103_AVAILABLE = False

from .container_detector import ContainerDetector
from .food_type_analyzer import FoodTypeAnalyzer

__all__ = [
    'YOLOv8Segmentor',
    'SegmentationInstance', 
    'SegmentationResult',
    'create_food_mask',
    'load_segmentor',
    'FoodSeg103Segmentor',
    'FoodInstance',
    'FoodSegmentationResult',
    'load_foodseg103_segmentor',
    'FOODSEG103_AVAILABLE',
    'ContainerDetector',
    'FoodTypeAnalyzer'
]