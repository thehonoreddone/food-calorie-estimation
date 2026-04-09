"""
Gemini Vision API Service - Fallback food classifier
=====================================================
Used when the custom EfficientNet model's confidence is low
or when the food class is not in the trained model's vocabulary.

Professional food apps use HYBRID approach:
- Custom model (fast, consistent) for known classes
- Vision LLM API (Gemini/GPT-4V) for unknown foods or low-confidence

This gives the best of both worlds:
- Speed + offline for known foods
- Unlimited food coverage via API
"""
import json
import re
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass

from loguru import logger

try:
    import google.generativeai as genai
    from PIL import Image
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logger.warning("google-generativeai not installed. Run: pip install google-generativeai")


@dataclass
class GeminiFoodResult:
    """Result from Gemini Vision API food classification."""
    food_class: str
    food_class_tr: str  # Turkish name
    confidence: float
    portion_grams: float
    calories: float
    calories_min: float
    calories_max: float
    macros: Dict[str, float]  # protein, carbs, fat in grams
    description: str
    is_food: bool
    source: str = "gemini"


# Prompt template for Gemini food recognition
FOOD_RECOGNITION_PROMPT = """You are an expert nutritionist AI. Analyze this food image carefully.

Return a JSON object with EXACTLY this format (no markdown, no code blocks, just pure JSON):
{
    "is_food": true,
    "food_name_en": "food name in English (lowercase, use underscores for spaces)",
    "food_name_tr": "food name in Turkish",
    "confidence": 0.95,
    "portion_grams": 250,
    "calories": 350,
    "calories_min": 280,
    "calories_max": 420,
    "protein_g": 15.0,
    "carbs_g": 40.0,
    "fat_g": 12.0,
    "fiber_g": 3.0,
    "description": "Brief description of the dish"
}

Rules:
- If the image does NOT contain food, set "is_food": false and set all numbers to 0.
- food_name_en should be lowercase with underscores (e.g., "chicken_curry", "adana_kebap").
- For Turkish foods, use their Turkish name in food_name_en too (e.g., "lahmacun", "kokorec").
- Be very precise with calorie estimation based on visible portion size.
- Consider plate size as reference for portion estimation.
- Provide realistic min/max calorie range (±20%).
- confidence should reflect how sure you are about the food identification (0.0-1.0).
"""

FOOD_RECOGNITION_WITH_HINT_PROMPT = """You are an expert nutritionist AI. Analyze this food image carefully.

Our classification model thinks this might be: {hint_class} (confidence: {hint_confidence:.0%})

Consider this hint but trust your own judgment. If you agree, use the same class name.

Return a JSON object with EXACTLY this format (no markdown, no code blocks, just pure JSON):
{
    "is_food": true,
    "food_name_en": "food name in English (lowercase, use underscores for spaces)",
    "food_name_tr": "food name in Turkish",
    "confidence": 0.95,
    "portion_grams": 250,
    "calories": 350,
    "calories_min": 280,
    "calories_max": 420,
    "protein_g": 15.0,
    "carbs_g": 40.0,
    "fat_g": 12.0,
    "fiber_g": 3.0,
    "description": "Brief description of the dish"
}

Rules:
- food_name_en should be lowercase with underscores (e.g., "chicken_curry", "adana_kebap").
- For Turkish foods, use their Turkish name in food_name_en too (e.g., "lahmacun", "kokorec").
- Be very precise with calorie estimation based on visible portion size.
- Consider plate size as reference for portion estimation.
- confidence should reflect how sure you are about the food identification (0.0-1.0).
"""


class GeminiService:
    """
    Gemini Vision API service for food recognition.
    Used as fallback when custom model confidence is low.
    """
    
    def __init__(self):
        self.model = None
        self.is_configured = False
        self._api_key: Optional[str] = None
        
    def configure(self, api_key: str) -> bool:
        """
        Configure Gemini API with the given key.
        
        Args:
            api_key: Google AI Studio API key
            
        Returns:
            True if configured successfully
        """
        if not GEMINI_AVAILABLE:
            logger.error("google-generativeai package not installed")
            return False
        
        if not api_key or api_key.strip() == "":
            logger.warning("No Gemini API key provided - Gemini fallback disabled")
            return False
            
        try:
            self._api_key = api_key
            genai.configure(api_key=api_key)
            
            # Use Gemini 2.0 Flash for fast, cost-effective food recognition
            self.model = genai.GenerativeModel("gemini-2.0-flash")
            
            self.is_configured = True
            logger.info("✅ Gemini Vision API configured (model: gemini-2.0-flash)")
            return True
            
        except Exception as e:
            logger.error(f"Failed to configure Gemini: {e}")
            self.is_configured = False
            return False
    
    async def classify_food(
        self,
        image: Image.Image,
        hint_class: Optional[str] = None,
        hint_confidence: Optional[float] = None,
    ) -> Optional[GeminiFoodResult]:
        """
        Classify food using Gemini Vision API.
        
        Args:
            image: PIL Image to classify
            hint_class: Optional hint from custom model
            hint_confidence: Confidence of the hint
            
        Returns:
            GeminiFoodResult or None if failed
        """
        if not self.is_configured or self.model is None:
            logger.warning("Gemini not configured, skipping")
            return None
            
        try:
            # Prepare prompt
            if hint_class and hint_confidence:
                prompt = FOOD_RECOGNITION_WITH_HINT_PROMPT.format(
                    hint_class=hint_class,
                    hint_confidence=hint_confidence
                )
            else:
                prompt = FOOD_RECOGNITION_PROMPT
            
            # Ensure RGB
            if image.mode != "RGB":
                image = image.convert("RGB")
            
            # Call Gemini (async via threadpool)
            import asyncio
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.model.generate_content(
                    [prompt, image],
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.1,  # Low temperature for consistent results
                        max_output_tokens=500,
                    )
                )
            )
            
            # Parse response
            result_text = response.text.strip()
            
            # Clean potential markdown code blocks
            if result_text.startswith("```"):
                result_text = re.sub(r'^```(?:json)?\s*', '', result_text)
                result_text = re.sub(r'\s*```$', '', result_text)
            
            data = json.loads(result_text)
            
            if not data.get("is_food", False):
                logger.info("Gemini: Image does not contain food")
                return GeminiFoodResult(
                    food_class="not_food",
                    food_class_tr="yemek_degil",
                    confidence=data.get("confidence", 0.9),
                    portion_grams=0,
                    calories=0,
                    calories_min=0,
                    calories_max=0,
                    macros={"protein": 0, "carbs": 0, "fat": 0, "fiber": 0},
                    description="This image does not contain food.",
                    is_food=False,
                )
            
            result = GeminiFoodResult(
                food_class=data.get("food_name_en", "unknown").lower().replace(" ", "_").replace("-", "_"),
                food_class_tr=data.get("food_name_tr", "bilinmiyor"),
                confidence=float(data.get("confidence", 0.7)),
                portion_grams=float(data.get("portion_grams", 200)),
                calories=float(data.get("calories", 200)),
                calories_min=float(data.get("calories_min", 150)),
                calories_max=float(data.get("calories_max", 250)),
                macros={
                    "protein": float(data.get("protein_g", 0)),
                    "carbs": float(data.get("carbs_g", 0)),
                    "fat": float(data.get("fat_g", 0)),
                    "fiber": float(data.get("fiber_g", 0)),
                },
                description=data.get("description", ""),
                is_food=True,
            )
            
            logger.info(
                f"[Gemini] Classified as: {result.food_class} ({result.confidence:.0%}) "
                f"- {result.calories:.0f} kcal ({result.portion_grams:.0f}g)"
            )
            
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"Gemini returned invalid JSON: {e}")
            return None
        except Exception as e:
            logger.error(f"Gemini classification failed: {e}")
            return None


# Global instance
gemini_service = GeminiService()
