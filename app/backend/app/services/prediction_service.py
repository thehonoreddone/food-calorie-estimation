"""Prediction service - orchestrates the food prediction pipeline"""
import asyncio
import hashlib
import time
import base64
from io import BytesIO
from typing import Optional, Dict, Tuple

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
from app.core.config import settings

# Try to use legacy pipeline for better accuracy
try:
    from app.services.legacy_pipeline_service import legacy_pipeline, LEGACY_AVAILABLE
except ImportError:
    LEGACY_AVAILABLE = False
    legacy_pipeline = None

# Gemini Vision API fallback
try:
    from app.services.gemini_service import gemini_service
    GEMINI_IMPORTED = True
except ImportError:
    GEMINI_IMPORTED = False
    gemini_service = None


class PredictionService:
    """Service for food prediction pipeline with 3-tier confidence caching"""
    
    def __init__(self):
        self.default_plate_diameter_cm = 25.0
        self.default_pixels_per_cm = 10.0
        self.use_legacy = LEGACY_AVAILABLE
        self.gemini_enabled = False
        # In-memory Gemini result cache: image_hash -> (PredictionResponse, timestamp)
        self._gemini_cache: Dict[str, Tuple[PredictionResponse, float]] = {}
        self._cache_ttl = settings.GEMINI_CACHE_TTL  # seconds

    @staticmethod
    def _image_hash(image: Image.Image) -> str:
        """Compute a quick hash for cache lookup"""
        thumb = image.copy()
        thumb.thumbnail((64, 64))
        arr = np.array(thumb)
        return hashlib.md5(arr.tobytes()).hexdigest()

    def _cache_get(self, key: str) -> Optional[PredictionResponse]:
        """Get a cached Gemini result if not expired"""
        entry = self._gemini_cache.get(key)
        if entry is None:
            return None
        response, ts = entry
        if time.time() - ts > self._cache_ttl:
            del self._gemini_cache[key]
            return None
        return response

    def _cache_set(self, key: str, response: PredictionResponse) -> None:
        """Store a Gemini result in cache"""
        self._gemini_cache[key] = (response, time.time())
        # Evict old entries if cache grows too large
        if len(self._gemini_cache) > 500:
            cutoff = time.time() - self._cache_ttl
            expired = [k for k, (_, ts) in self._gemini_cache.items() if ts < cutoff]
            for k in expired:
                del self._gemini_cache[k]
    
    async def initialize_legacy(self) -> bool:
        """Initialize legacy pipeline if available"""
        if not LEGACY_AVAILABLE or legacy_pipeline is None:
            logger.info("Legacy pipeline not available, using YOLO-only mode")
            return False
        
        try:
            success = await legacy_pipeline.load()
            if success:
                self.use_legacy = True  # Enable legacy for better accuracy
                logger.info("✅ Using legacy pipeline for better accuracy")
            return success
        except Exception as e:
            logger.warning(f"Failed to initialize legacy pipeline: {e}")
            return False

    async def initialize_gemini(self) -> bool:
        """Initialize Gemini Vision API fallback"""
        if not GEMINI_IMPORTED or gemini_service is None:
            logger.info("Gemini service not available")
            return False
        
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            logger.info("No GEMINI_API_KEY set - Gemini fallback disabled")
            return False
        
        success = gemini_service.configure(api_key)
        if success:
            self.gemini_enabled = True
            logger.info("✅ Gemini Vision API fallback enabled")
        return success
    
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
        """
        3-tier confidence caching with Gemini fallback:
          - >80% (HIGH):   Trust model, return immediately
          - 50-80% (MID):  Return model result now, fire background Gemini call + cache
          - <50% (LOW):    Wait for Gemini result, then return it
        """
        result = await legacy_pipeline.predict(image, top_k=5)
        confidence = result.confidence
        high_thresh = settings.GEMINI_HIGH_CONFIDENCE_THRESHOLD
        low_thresh = settings.GEMINI_CONFIDENCE_THRESHOLD

        # Check cache first (for MID-tier background results from a previous call)
        img_hash = self._image_hash(image)
        cached = self._cache_get(img_hash)
        if cached is not None:
            logger.info(f"[Cache HIT] Returning cached Gemini result for {img_hash[:8]}")
            cached.mask_base64 = self._encode_mask(result.mask) if include_mask else None
            return cached

        # ---- TIER 1: HIGH confidence (>=80%) → trust model directly ----
        if confidence >= high_thresh:
            logger.info(
                f"[Tier-1 HIGH] confidence {confidence:.2f} >= {high_thresh} "
                f"- trusting model: {result.predicted_class}"
            )
            return self._build_legacy_response(result, include_mask, start_time, source="model")

        # ---- TIER 2: MID confidence (50-80%) → return model + background Gemini ----
        if confidence >= low_thresh:
            logger.info(
                f"[Tier-2 MID] confidence {confidence:.2f} in [{low_thresh},{high_thresh}) "
                f"- returning model, scheduling background Gemini"
            )
            # Fire-and-forget background Gemini call
            if self.gemini_enabled and gemini_service is not None:
                asyncio.create_task(
                    self._background_gemini(image, result.predicted_class, confidence, img_hash)
                )
            return self._build_legacy_response(result, include_mask, start_time, source="model")

        # ---- TIER 3: LOW confidence (<50%) → wait for Gemini ----
        logger.info(
            f"[Tier-3 LOW] confidence {confidence:.2f} < {low_thresh} "
            f"- waiting for Gemini..."
        )
        if self.gemini_enabled and gemini_service is not None:
            try:
                gemini_result = await gemini_service.classify_food(
                    image,
                    hint_class=result.predicted_class,
                    hint_confidence=confidence,
                )
                if gemini_result and gemini_result.is_food and gemini_result.confidence > confidence:
                    logger.info(
                        f"[Tier-3] Gemini override: {gemini_result.food_class} "
                        f"({gemini_result.confidence:.2f}) > model {result.predicted_class} "
                        f"({confidence:.2f})"
                    )
                    mask_b64 = self._encode_mask(result.mask) if include_mask else None
                    resp = PredictionResponse(
                        class_name=gemini_result.food_class,
                        confidence=gemini_result.confidence,
                        estimated_weight_grams=round(gemini_result.portion_grams, 1),
                        estimated_calories=round(gemini_result.calories, 1),
                        calories_min=round(gemini_result.calories_min, 1),
                        calories_max=round(gemini_result.calories_max, 1),
                        mask_base64=mask_b64,
                        source="gemini",
                    )
                    self._cache_set(img_hash, resp)
                    return resp
            except Exception as e:
                logger.warning(f"[Tier-3] Gemini failed, using model result: {e}")

        # Gemini disabled or failed → fall back to model
        return self._build_legacy_response(result, include_mask, start_time, source="model")

    async def _background_gemini(
        self, image: Image.Image, hint_class: str, hint_conf: float, img_hash: str
    ) -> None:
        """Background task: call Gemini and cache the result for future requests"""
        try:
            gemini_result = await gemini_service.classify_food(
                image,
                hint_class=hint_class,
                hint_confidence=hint_conf,
            )
            if gemini_result and gemini_result.is_food:
                resp = PredictionResponse(
                    class_name=gemini_result.food_class,
                    confidence=gemini_result.confidence,
                    estimated_weight_grams=round(gemini_result.portion_grams, 1),
                    estimated_calories=round(gemini_result.calories, 1),
                    calories_min=round(gemini_result.calories_min, 1),
                    calories_max=round(gemini_result.calories_max, 1),
                    mask_base64=None,
                    source="gemini",
                )
                self._cache_set(img_hash, resp)
                logger.info(
                    f"[Background Gemini] Cached result for {img_hash[:8]}: "
                    f"{gemini_result.food_class} ({gemini_result.confidence:.2f})"
                )
        except Exception as e:
            logger.warning(f"[Background Gemini] Failed: {e}")

    @staticmethod
    def _encode_mask(mask) -> Optional[str]:
        """Encode a numpy mask to base64 PNG string"""
        if mask is None:
            return None
        mask_img = Image.fromarray((mask * 255).astype(np.uint8))
        buffer = BytesIO()
        mask_img.save(buffer, format="PNG")
        return base64.b64encode(buffer.getvalue()).decode("utf-8")

    def _build_legacy_response(
        self, result, include_mask: bool, start_time: float, source: str = "model"
    ) -> PredictionResponse:
        """Build PredictionResponse from a legacy pipeline result"""
        mask_b64 = self._encode_mask(result.mask) if include_mask else None
        processing_time = (time.time() - start_time) * 1000
        logger.info(
            f"[Legacy] {result.predicted_class} ({result.confidence:.2f}) "
            f"- {result.estimated_calories:.0f} kcal in {processing_time:.0f}ms [src={source}]"
        )
        return PredictionResponse(
            class_name=result.predicted_class,
            confidence=result.confidence,
            estimated_weight_grams=round(result.estimated_weight_grams, 1),
            estimated_calories=round(result.estimated_calories, 1),
            mask_base64=mask_b64,
            source=source,
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
