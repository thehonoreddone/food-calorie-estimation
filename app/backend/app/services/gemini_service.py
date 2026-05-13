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

Model: gemini-2.5-flash (upgraded from deprecated gemini-2.0-flash)
"""
import json
import re
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field

from loguru import logger

try:
    from google import genai
    from google.genai import types as genai_types
    from PIL import Image
    GEMINI_AVAILABLE = True
except ImportError:
    try:
        import google.generativeai as genai  # type: ignore
        genai_types = None
        from PIL import Image
        GEMINI_AVAILABLE = True
        logger.warning("Using deprecated google-generativeai. Please install google-genai.")
    except ImportError:
        GEMINI_AVAILABLE = False
        logger.warning("No Gemini SDK installed. Run: pip install google-genai")

# ── Language name mapping ─────────────────────────────────────────────────────
LANGUAGE_NAMES: Dict[str, str] = {
    "tr": "Turkish",
    "en": "English",
    "de": "German",
    "fr": "French",
    "es": "Spanish",
    "ar": "Arabic",
    "zh": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "ru": "Russian",
    "pt": "Portuguese",
    "it": "Italian",
}


@dataclass
class GeminiFoodResult:
    """Result from Gemini Vision API food classification."""
    food_class: str
    food_class_tr: str       # Turkish name (legacy, always kept)
    food_class_local: str    # Name in the user's requested language
    confidence: float
    portion_grams: float
    calories: float
    calories_min: float
    calories_max: float
    macros: Dict[str, float]  # protein, carbs, fat in grams
    description: str
    is_food: bool
    source: str = "gemini"


# ── Base prompt template ──────────────────────────────────────────────────────

def _build_prompt(language: str = "tr", hint_class: Optional[str] = None, hint_confidence: Optional[float] = None) -> str:
    """
    Build a single unified prompt with dynamic language support.
    If hint_class is provided, includes the model hint instruction.
    """
    language_name = LANGUAGE_NAMES.get(language, "English")

    hint_section = ""
    if hint_class and hint_confidence is not None:
        hint_section = f"""
Our classification model thinks this might be: {hint_class} (confidence: {hint_confidence:.0%})
Consider this hint but trust your own visual analysis over the hint if they conflict.
"""

    return f"""You are an expert nutritionist AI with encyclopedic knowledge of foods from around the world, including:
- All Turkish foods and dishes (Turkish cuisine, street food, home cooking)
- Branded Turkish products: Torku, Ulker, ETI, Sarıyer, Pinar, Tat, Penguen, Banvit, Cola Turka, etc.
- International branded foods: Fanta, Coca-Cola, Pepsi, Lay's, Pringles, Nutella, KitKat, etc.
- All global cuisines: Italian, Japanese, Chinese, Mexican, Indian, American, etc.
- Restaurant meals, street food, home-cooked meals, packaged snacks, beverages
{hint_section}
Analyze this food/beverage image carefully and identify what it is.

IMPORTANT RULES:
- Even if you're not 100% sure, provide your BEST GUESS — never return empty calorie values
- For packaged/canned drinks (cola, fanta, etc.): use standard portion (330ml can = typical)
- For branded snacks/cakes: use typical package size as portion
- Identify specific brands when visible (e.g., "Torku Favorimo Kek" not just "cake")
- For Turkish foods, always provide Turkish name in food_name_tr
- If image has multiple foods, analyze the PRIMARY/LARGEST item
- For food_name_local: provide the food name in **{language_name}** language

Return a JSON object with EXACTLY this format (pure JSON, no markdown, no code blocks):
{{
    "is_food": true,
    "food_name_en": "food name in English lowercase with underscores (e.g. torku_favorimo_cake)",
    "food_name_tr": "Türkçe yemek/ürün adı (örn: Torku Favorimo Kek)",
    "food_name_local": "Food name in {language_name} (e.g. for English: Torku Favorimo Cake)",
    "confidence": 0.92,
    "portion_grams": 45,
    "calories": 185,
    "calories_min": 160,
    "calories_max": 210,
    "protein_g": 3.0,
    "carbs_g": 25.0,
    "fat_g": 8.0,
    "fiber_g": 0.5,
    "description": "Brief description of the food/product in {language_name}",
    "is_branded": false
}}

Calorie estimation rules:
- If NOT food/drink: set is_food=false, all numbers=0
- Cola/Fanta 330ml can: ~139-148 kcal
- Torku Favorimo kek (mini): ~160-200 kcal per piece
- Always estimate realistic calories based on visible portion size
- Provide min/max range of ±20%
"""


class GeminiService:
    """
    Gemini Vision API service for food recognition.
    Uses gemini-2.5-flash (upgraded from deprecated gemini-2.0-flash).
    Used as fallback when custom model confidence is low.
    """
    
    MODEL_NAME = "gemini-2.5-flash"

    def __init__(self):
        self.model = None
        self.is_configured = False
        self._api_key: Optional[str] = None
        
    def configure(self, api_key: str) -> bool:
        """
        Configure Gemini API with the given key.
        Uses new google.genai SDK (replaces deprecated google.generativeai).
        """
        if not GEMINI_AVAILABLE:
            logger.error("No Gemini SDK installed. Run: pip install google-genai")
            return False
        
        if not api_key or api_key.strip() == "":
            logger.warning("No Gemini API key provided - Gemini fallback disabled")
            return False
            
        try:
            self._api_key = api_key
            # Try new google.genai SDK first
            if hasattr(genai, 'Client'):  # new google.genai
                self._client = genai.Client(api_key=api_key)
                self._use_new_sdk = True
                self.model = self.MODEL_NAME  # model name stored as string
            else:
                # Fall back to old google.generativeai
                genai.configure(api_key=api_key)
                self.model = genai.GenerativeModel(self.MODEL_NAME)
                self._use_new_sdk = False
            
            self.is_configured = True
            sdk_version = "new google.genai" if getattr(self, '_use_new_sdk', False) else "legacy google.generativeai"
            logger.info(f"Gemini Vision API configured (model: {self.MODEL_NAME}, sdk: {sdk_version})")
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
        language: str = "tr",
    ) -> Optional[GeminiFoodResult]:
        """
        Classify food using Gemini Vision API.
        
        Args:
            image: PIL Image to classify
            hint_class: Optional hint from custom model
            hint_confidence: Confidence of the hint
            language: ISO language code for localized food name (default: "tr")
            
        Returns:
            GeminiFoodResult or None if failed
        """
        if not self.is_configured or self.model is None:
            logger.warning("Gemini not configured, skipping")
            return None
            
        result_text: Optional[str] = None

        try:
            # Build unified prompt with language support
            prompt = _build_prompt(
                language=language,
                hint_class=hint_class,
                hint_confidence=hint_confidence,
            )
            
            # Ensure RGB
            if image.mode != "RGB":
                image = image.convert("RGB")
            
            # Call Gemini with retry for rate limits (429)
            import asyncio
            loop = asyncio.get_event_loop()
            
            use_new_sdk = getattr(self, '_use_new_sdk', False)
            
            max_retries = 3
            response = None
            for attempt in range(max_retries):
                try:
                    if use_new_sdk and hasattr(self, '_client'):
                        # New google.genai SDK
                        response = await loop.run_in_executor(
                            None,
                            lambda: self._client.models.generate_content(
                                model=self.model,
                                contents=[prompt, image],
                                config=genai_types.GenerateContentConfig(
                                    temperature=0.1,
                                    max_output_tokens=600,
                                )
                            )
                        )
                    else:
                        # Legacy google.generativeai SDK
                        response = await loop.run_in_executor(
                            None,
                            lambda: self.model.generate_content(
                                [prompt, image],
                                generation_config={
                                    "temperature": 0.1,
                                    "max_output_tokens": 600,
                                }
                            )
                        )
                    break  # Success, exit retry loop
                except Exception as retry_err:
                    err_str = str(retry_err).lower()
                    is_rate_limit = "429" in err_str or "resource_exhausted" in err_str or "rate" in err_str
                    if is_rate_limit and attempt < max_retries - 1:
                        wait_time = 2 ** (attempt + 1)  # 2s, 4s, 8s
                        logger.warning(
                            f"[Gemini] Rate limited (attempt {attempt + 1}/{max_retries}), "
                            f"retrying in {wait_time}s..."
                        )
                        await asyncio.sleep(wait_time)
                    else:
                        raise  # Not a rate limit error or final attempt, re-raise
            
            # Extract text from response (handle different SDK response formats)
            result_text = None
            try:
                result_text = response.text  # may work for both SDKs
            except Exception:
                pass
            
            if not result_text:
                try:
                    # New google.genai SDK path
                    result_text = response.candidates[0].content.parts[0].text
                except Exception:
                    pass
            
            if not result_text:
                logger.error("Gemini returned empty response")
                return None
            
            result_text = result_text.strip()
            
            # ── Clean markdown code blocks ─────────────────────────────
            result_text = re.sub(r'^```(?:json)?\s*', '', result_text, flags=re.MULTILINE)
            result_text = re.sub(r'\s*```\s*$', '', result_text, flags=re.MULTILINE)
            result_text = result_text.strip()
            
            # Extract JSON object if embedded in prose
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
            if json_match:
                result_text = json_match.group(0)
            
            # Remove trailing commas before } or ] (invalid JSON)
            result_text = re.sub(r',\s*([}\]])', r'\1', result_text)
            
            logger.debug(f"[Gemini] Raw response (first 300 chars): {result_text[:300]}")
            
            data = json.loads(result_text)
            
            if not data.get("is_food", True):  # default True if key missing
                logger.info("Gemini: Image does not contain food")
                return GeminiFoodResult(
                    food_class="not_food",
                    food_class_tr="yemek_degil",
                    food_class_local="not food",
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
                food_class_local=data.get("food_name_local", data.get("food_name_tr", "unknown")),
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
                f"[Gemini/{self.MODEL_NAME}] Classified as: {result.food_class} ({result.confidence:.0%}) "
                f"- {result.calories:.0f} kcal ({result.portion_grams:.0f}g) [lang={language}]"
            )
            
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"Gemini returned invalid JSON: {e} | text: {result_text[:300] if result_text else 'N/A'}")
            return None
        except Exception as e:
            logger.error(f"Gemini classification failed: {e}")
            return None


# Global instance
gemini_service = GeminiService()
