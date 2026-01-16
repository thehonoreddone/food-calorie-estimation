"""Domain module exports"""
from app.domain.entities import (
    FoodType,
    FoodEntity,
    SegmentEntity,
    PredictionEntity,
    CalibrationEntity,
    VolumeEstimate,
)
from app.domain.interfaces import (
    IFoodRepository,
    ISegmentationService,
    ICalorieEstimator,
    IDepthEstimator,
    IPortionEstimator,
)
from app.domain.use_cases import (
    PredictFoodUseCase,
    ManageFoodsUseCase,
)

__all__ = [
    # Entities
    "FoodType",
    "FoodEntity",
    "SegmentEntity",
    "PredictionEntity",
    "CalibrationEntity",
    "VolumeEstimate",
    # Interfaces
    "IFoodRepository",
    "ISegmentationService",
    "ICalorieEstimator",
    "IDepthEstimator",
    "IPortionEstimator",
    # Use Cases
    "PredictFoodUseCase",
    "ManageFoodsUseCase",
]
