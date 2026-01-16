"""Use cases - Application business logic"""
from typing import List, Optional
from PIL import Image
import numpy as np

from app.domain.entities import (
    FoodEntity,
    PredictionEntity,
    SegmentEntity,
    CalibrationEntity,
)
from app.domain.interfaces import (
    IFoodRepository,
    ISegmentationService,
    IPortionEstimator,
)


class PredictFoodUseCase:
    """Use case: Predict food from image"""
    
    def __init__(
        self,
        segmentation_service: ISegmentationService,
        portion_estimator: IPortionEstimator,
        food_repository: IFoodRepository,
    ):
        self.segmentation_service = segmentation_service
        self.portion_estimator = portion_estimator
        self.food_repository = food_repository
    
    async def execute(
        self,
        image: Image.Image,
        depth_map: Optional[np.ndarray] = None,
    ) -> PredictionEntity:
        """
        Execute food prediction pipeline:
        1. Segment image to find food regions
        2. Identify food classes
        3. Estimate portions
        4. Calculate calories
        """
        import time
        start_time = time.time()
        
        # Step 1: Segmentation
        segments = await self.segmentation_service.segment(image)
        
        if not segments:
            return PredictionEntity(
                primary_class="unknown",
                confidence=0.0,
                segments=[],
                estimated_weight_grams=0.0,
                estimated_calories=0.0,
                processing_time_ms=(time.time() - start_time) * 1000,
            )
        
        # Step 2: Get primary class (highest confidence)
        primary_segment = max(segments, key=lambda s: s.confidence)
        
        # Step 3: Estimate portions for each segment
        calibration = CalibrationEntity()  # Default calibration
        total_weight = 0.0
        total_calories = 0.0
        
        for segment in segments:
            # Get food data from repository
            food = await self.food_repository.get_by_class_name(segment.class_name)
            
            if food:
                # Estimate volume/mass
                volume_estimate = await self.portion_estimator.estimate(
                    segment, calibration, depth_map
                )
                weight = volume_estimate.to_mass(food.density_g_per_cm3)
                calories = food.calculate_calories(weight)
                
                total_weight += weight
                total_calories += calories
            else:
                # Default estimation if food not in database
                default_portion = 100.0  # grams
                default_kcal_per_100g = 150.0
                
                total_weight += default_portion
                total_calories += default_kcal_per_100g
        
        processing_time = (time.time() - start_time) * 1000
        
        return PredictionEntity(
            primary_class=primary_segment.class_name,
            confidence=primary_segment.confidence,
            segments=segments,
            estimated_weight_grams=total_weight,
            estimated_calories=total_calories,
            processing_time_ms=processing_time,
        )


class ManageFoodsUseCase:
    """Use case: CRUD operations for food database"""
    
    def __init__(self, food_repository: IFoodRepository):
        self.repository = food_repository
    
    async def get_all_foods(self) -> List[FoodEntity]:
        """Get all foods"""
        return await self.repository.get_all()
    
    async def get_food_by_id(self, food_id: str) -> Optional[FoodEntity]:
        """Get food by ID"""
        return await self.repository.get_by_id(food_id)
    
    async def create_food(self, food: FoodEntity) -> FoodEntity:
        """Create new food"""
        return await self.repository.create(food)
    
    async def update_food(
        self, food_id: str, food: FoodEntity
    ) -> Optional[FoodEntity]:
        """Update existing food"""
        return await self.repository.update(food_id, food)
    
    async def delete_food(self, food_id: str) -> bool:
        """Delete food"""
        return await self.repository.delete(food_id)
