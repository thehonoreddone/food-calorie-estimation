"""Domain interfaces - Ports for Clean Architecture"""
from abc import ABC, abstractmethod
from typing import List, Optional
import numpy as np
from PIL import Image

from app.domain.entities import (
    FoodEntity,
    PredictionEntity,
    SegmentEntity,
    CalibrationEntity,
    VolumeEstimate,
)


class IFoodRepository(ABC):
    """Food repository interface (port)"""
    
    @abstractmethod
    async def get_all(self) -> List[FoodEntity]:
        """Get all food entities"""
        pass
    
    @abstractmethod
    async def get_by_id(self, food_id: str) -> Optional[FoodEntity]:
        """Get food by ID"""
        pass
    
    @abstractmethod
    async def get_by_class_name(self, class_name: str) -> Optional[FoodEntity]:
        """Get food by class name"""
        pass
    
    @abstractmethod
    async def create(self, food: FoodEntity) -> FoodEntity:
        """Create new food"""
        pass
    
    @abstractmethod
    async def update(self, food_id: str, food: FoodEntity) -> Optional[FoodEntity]:
        """Update existing food"""
        pass
    
    @abstractmethod
    async def delete(self, food_id: str) -> bool:
        """Delete food by ID"""
        pass


class ISegmentationService(ABC):
    """Segmentation service interface"""
    
    @abstractmethod
    async def segment(self, image: Image.Image) -> List[SegmentEntity]:
        """Perform food segmentation on image"""
        pass
    
    @abstractmethod
    def is_loaded(self) -> bool:
        """Check if model is loaded"""
        pass


class ICalorieEstimator(ABC):
    """Calorie estimation interface"""
    
    @abstractmethod
    async def estimate(
        self,
        segments: List[SegmentEntity],
        calibration: CalibrationEntity,
        depth_map: Optional[np.ndarray] = None,
    ) -> float:
        """Estimate total calories from segments"""
        pass


class IDepthEstimator(ABC):
    """Depth estimation interface"""
    
    @abstractmethod
    async def estimate(self, image: Image.Image) -> np.ndarray:
        """Generate depth map from image"""
        pass


class IPortionEstimator(ABC):
    """Portion (volume/mass) estimation interface"""
    
    @abstractmethod
    async def estimate(
        self,
        segment: SegmentEntity,
        calibration: CalibrationEntity,
        depth_map: Optional[np.ndarray] = None,
    ) -> VolumeEstimate:
        """Estimate portion size for a segment"""
        pass
