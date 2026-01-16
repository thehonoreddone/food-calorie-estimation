"""Prediction service - orchestrates the food prediction pipeline"""
import time
import base64
from io import BytesIO
from typing import Optional

from PIL import Image
import numpy as np
from loguru import logger

from app.domain.entities import (
    PredictionEntity,
    SegmentEntity,
    CalibrationEntity,
    VolumeEstimate,
)
from app.services.model_service import model_service
from app.services.calorie_service import calorie_service
from app.models.schemas import PredictionResponse

# Try to use legacy pipeline for better accuracy
try:
    from app.services.legacy_pipeline_service import legacy_pipeline, LEGACY_AVAILABLE
except ImportError:
    LEGACY_AVAILABLE = False
    legacy_pipeline = None


class PredictionService:
    """Service for food prediction pipeline"""
    
    def __init__(self):
        self.default_plate_diameter_cm = 25.0
        self.default_pixels_per_cm = 10.0
        self.use_legacy = LEGACY_AVAILABLE
    
    async def initialize_legacy(self) -> bool:
        """Initialize legacy pipeline if available"""
        if not LEGACY_AVAILABLE or legacy_pipeline is None:
            logger.info("Legacy pipeline not available, using YOLO-only mode")
            return False
        
        try:
            success = await legacy_pipeline.load()
            if success:
                self.use_legacy = True
                logger.info("✅ Using legacy pipeline for better accuracy")
            return success
        except Exception as e:
            logger.warning(f"Failed to initialize legacy pipeline: {e}")
            return False
    
    async def predict(
        self,
        image: Image.Image,
        include_mask: bool = True,
    ) -> PredictionResponse:
        """
        Run complete prediction pipeline on an image
        
        Args:
            image: PIL Image to analyze
            include_mask: Whether to include base64 mask in response
            
        Returns:
            PredictionResponse with class, calories, weight, etc.
        """
        start_time = time.time()
        
        # Try legacy pipeline first for better accuracy
        if self.use_legacy and legacy_pipeline is not None and legacy_pipeline.is_loaded:
            try:
                return await self._predict_legacy(image, include_mask, start_time)
            except Exception as e:
                logger.warning(f"Legacy pipeline failed, falling back to YOLO: {e}")
        
        # Fallback to YOLO-only pipeline
        return await self._predict_yolo(image, include_mask, start_time)
        
        # Preprocess image
        image = model_service.preprocess_image(image)
        
        # Segment image
        segments = await model_service.segment_image(image)
        
        if not segments:
            logger.warning("No food segments detected")
            return PredictionResponse(
                class_name="unknown",
                confidence=0.0,
                estimated_weight_grams=0.0,
                estimated_calories=0.0,
                mask_base64=None,
            )
        
        # Get primary segment (highest confidence)
        primary_segment = max(segments, key=lambda s: s.confidence)
        
        # Estimate calibration from image size
        calibration = self._estimate_calibration(image)
        
        # Estimate portion and calories
        total_weight = 0.0
        total_calories = 0.0
        
        for segment in segments:
            # Estimate volume from segment area
            area_cm2 = calibration.pixels_to_cm2(segment.area_pixels)
            height_cm = self._estimate_height(segment.class_name)
            shape_factor = 0.7  # Account for non-rectangular shape
            
            volume_cm3 = area_cm2 * height_cm * shape_factor
            
            # Get food info and calculate calories
            food_info = calorie_service.get_food_info(segment.class_name)
            density = food_info.get("density", 0.85)
            kcal_per_100g = food_info.get("kcal_per_100g", 150)
            
            weight_g = volume_cm3 * density
            calories = (kcal_per_100g * weight_g) / 100.0
            
            total_weight += weight_g
            total_calories += calories
        
        # Get mask from primary segment
        mask_base64 = None
        if include_mask and primary_segment.mask:
            mask_base64 = primary_segment.mask.decode("utf-8")
        
        processing_time = (time.time() - start_time) * 1000
        logger.info(
            f"Prediction complete: {primary_segment.class_name} "
            f"({primary_segment.confidence:.2f}) - {total_calories:.0f} kcal "
            f"in {processing_time:.0f}ms"
        )
        
        return PredictionResponse(
            class_name=primary_segment.class_name,
            confidence=primary_segment.confidence,
            estimated_weight_grams=round(total_weight, 1),
            estimated_calories=round(total_calories, 1),
            mask_base64=mask_base64,
        )
    
    def _estimate_calibration(self, image: Image.Image) -> CalibrationEntity:
        """Estimate pixel-to-cm calibration from image"""
        # Assume standard plate fills ~60% of image width
        image_width = image.width
        plate_width_pixels = image_width * 0.6
        pixels_per_cm = plate_width_pixels / self.default_plate_diameter_cm
        
        return CalibrationEntity(
            pixels_per_cm=pixels_per_cm,
            reference_object="estimated_plate",
            reference_diameter_cm=self.default_plate_diameter_cm,
            calibration_confidence=0.6,  # Low confidence for estimation
        )
    
    def _estimate_height(self, class_name: str) -> float:
        """Estimate food height based on class"""
        # Height priors based on food type
        flat_foods = ["bread", "pizza", "pancake", "cookie", "cracker"]
        tall_foods = ["burger", "sandwich", "cake", "pie"]
        liquid_foods = ["soup", "drink", "juice", "milk"]
        
        class_lower = class_name.lower()
        
        for food in flat_foods:
            if food in class_lower:
                return 1.0  # 1 cm
        
        for food in tall_foods:
            if food in class_lower:
                return 5.0  # 5 cm
        
        for food in liquid_foods:
            if food in class_lower:
                return 3.0  # 3 cm (in container)
        
        # Default height
        return 2.5  # 2.5 cm

    async def _predict_legacy(
        self,
        image: Image.Image,
        include_mask: bool,
        start_time: float,
    ) -> PredictionResponse:
        """Use legacy pipeline for better accuracy"""
        result = await legacy_pipeline.predict(image, top_k=5)
        
        # Convert mask to base64 if available
        mask_base64 = None
        if include_mask and result.mask is not None:
            mask_img = Image.fromarray((result.mask * 255).astype(np.uint8))
            buffer = BytesIO()
            mask_img.save(buffer, format="PNG")
            mask_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
        
        processing_time = (time.time() - start_time) * 1000
        logger.info(
            f"[Legacy] Prediction complete: {result.predicted_class} "
            f"({result.confidence:.2f}) - {result.estimated_calories:.0f} kcal "
            f"in {processing_time:.0f}ms"
        )
        
        return PredictionResponse(
            class_name=result.predicted_class,
            confidence=result.confidence,
            estimated_weight_grams=round(result.estimated_weight_grams, 1),
            estimated_calories=round(result.estimated_calories, 1),
            mask_base64=mask_base64,
        )

    async def _predict_yolo(
        self,
        image: Image.Image,
        include_mask: bool,
        start_time: float,
    ) -> PredictionResponse:
        """Fallback YOLO-only prediction"""
        # Preprocess image
        image = model_service.preprocess_image(image)
        
        # Segment image
        segments = await model_service.segment_image(image)
        
        if not segments:
            logger.warning("No food segments detected")
            return PredictionResponse(
                class_name="unknown",
                confidence=0.0,
                estimated_weight_grams=0.0,
                estimated_calories=0.0,
                mask_base64=None,
            )
        
        # Get primary segment (highest confidence)
        primary_segment = max(segments, key=lambda s: s.confidence)
        
        # Estimate calibration from image size
        calibration = self._estimate_calibration(image)
        
        # Estimate portion and calories
        total_weight = 0.0
        total_calories = 0.0
        
        for segment in segments:
            # Estimate volume from segment area
            area_cm2 = calibration.pixels_to_cm2(segment.area_pixels)
            height_cm = self._estimate_height(segment.class_name)
            shape_factor = 0.7  # Account for non-rectangular shape
            
            volume_cm3 = area_cm2 * height_cm * shape_factor
            
            # Get food info and calculate calories
            food_info = calorie_service.get_food_info(segment.class_name)
            density = food_info.get("density", 0.85)
            kcal_per_100g = food_info.get("kcal_per_100g", 150)
            
            weight_g = volume_cm3 * density
            calories = (kcal_per_100g * weight_g) / 100.0
            
            total_weight += weight_g
            total_calories += calories
        
        # Get mask from primary segment
        mask_base64 = None
        if include_mask and primary_segment.mask:
            mask_base64 = primary_segment.mask.decode("utf-8")
        
        processing_time = (time.time() - start_time) * 1000
        logger.info(
            f"[YOLO] Prediction complete: {primary_segment.class_name} "
            f"({primary_segment.confidence:.2f}) - {total_calories:.0f} kcal "
            f"in {processing_time:.0f}ms"
        )
        
        return PredictionResponse(
            class_name=primary_segment.class_name,
            confidence=primary_segment.confidence,
            estimated_weight_grams=round(total_weight, 1),
            estimated_calories=round(total_calories, 1),
            mask_base64=mask_base64,
        )


# Global prediction service instance
prediction_service = PredictionService()
