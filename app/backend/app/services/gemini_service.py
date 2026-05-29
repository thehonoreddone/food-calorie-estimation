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
- Water brands: Erikli, Pinar Su, Hayat Su, Saka, Damla, Nestle Pure Life, Ayas, etc.
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

CRITICAL — BEVERAGE & PACKAGED DRINK DETECTION:
You MUST carefully read any labels, text, or volume markings visible on bottles and containers:
1. **READ THE LABEL**: Look for volume info on the bottle/can (e.g., "5L", "1.5L", "500ml", "330ml", "200ml")
2. **Water density**: 1 ml = 1 gram. So: 5L water = 5000g, 1.5L = 1500g, 500ml = 500g, 330ml = 330g
3. **Common bottle sizes**: Recognize standard bottle sizes visually:
   - Small water bottle: 200ml = 200g
   - Standard water bottle: 500ml = 500g
   - Medium water bottle: 1L = 1000g, 1.5L = 1500g
   - Large water bottle/jug: 5L = 5000g, 10L = 10000g
   - Water dispenser bottle: 19L = 19000g
4. **For water**: calories = 0, protein = 0, carbs = 0, fat = 0, fiber = 0
5. **For sugary drinks**: estimate based on volume × sugar content per 100ml
6. **Brand detection**: Read brand names on bottles (Erikli, Pinar, Hayat, Saka, Ayas, Nestle, etc.)
7. **Estimate fill level**: If bottle appears half-full, use half the labeled volume

CRITICAL — PORTION SIZE DETECTION:
You MUST carefully analyze the ACTUAL portion visible in the image. Pay close attention to:
1. **Single piece vs whole**: Is this a single slice/piece or the entire item?
   - A single pizza slice: ~80-130g, ~200-300 kcal
   - A whole pizza (8 slices): ~600-1000g, ~1600-2400 kcal
   - A single börek piece: ~80-120g vs a whole tray: ~800-1500g
   - A single cookie: ~30-50g vs a plate of cookies: ~200-400g
2. **Count visible pieces**: If you see 2 slices, estimate for 2 slices, not 1 and not a whole pizza.
3. **Use visual cues for scale**: Compare food to plate size, hand, utensils, or other reference objects.
4. **Close-up photos are NOT bigger portions**: A zoomed-in photo of a small portion does not mean more food.
5. **Describe the portion in food_name**: Include portion info in the name, e.g.:
   - "pizza_slice" NOT "pizza" (if it's a single slice)
   - "water_5L" NOT "water" (if it's a 5L bottle)
   - "cola_330ml_can" NOT "cola" (if it's a 330ml can)

WEIGHT REFERENCE TABLE (use these as guidelines):
- Single pizza slice: 80-130g | Whole pizza: 600-1000g
- Single börek piece: 80-120g | Börek tray portion: 200-350g
- Rice plate (1 serving): 150-250g | Pilav tabağı: 200-300g
- Soup bowl (1 serving): 250-350g
- Salad plate (1 serving): 150-250g
- Bread slice: 25-40g | Pide piece: 100-200g
- Steak/meat piece: 100-200g | Chicken breast: 120-180g
- Pasta plate (1 serving): 200-350g
- Single köfte: 30-50g | Plate of köfte (4-6): 150-300g
- Water 500ml: 500g | Water 1.5L: 1500g | Water 5L: 5000g
- Cola/Fanta can 330ml: 330g | Pet bottle 1L: 1000g | Pet bottle 2.5L: 2500g
- Tea glass (typical): 100-150ml | Coffee cup: 150-200ml
- Ayran: 200ml = 200g | Large ayran: 300ml = 300g

Return a JSON object with EXACTLY this format (pure JSON, no markdown, no code blocks):
{{
    "is_food": true,
    "food_name_en": "food name in English lowercase with underscores — INCLUDE portion/volume info (e.g. water_5L, cola_330ml_can, pizza_slice)",
    "food_name_tr": "Türkçe yemek/ürün adı — porsiyon/hacim bilgisi dahil (örn: 5L Su, 330ml Cola, Pizza Dilimi)",
    "food_name_local": "Food name in {language_name} — include portion/volume info",
    "confidence": 0.92,
    "portion_grams": 45,
    "calories": 185,
    "calories_min": 160,
    "calories_max": 210,
    "protein_g": 3.0,
    "carbs_g": 25.0,
    "fat_g": 8.0,
    "fiber_g": 0.5,
    "portion_count": 1,
    "portion_type": "bottle",
    "description": "Brief description of the food/product in {language_name}, including portion size and brand if visible",
    "is_branded": false
}}

Calorie estimation rules:
- If NOT food/drink: set is_food=false, all numbers=0
- Plain water: ALWAYS 0 kcal regardless of volume
- Cola/Fanta 330ml can: ~139-148 kcal
- Torku Favorimo kek (mini): ~160-200 kcal per piece
- Always estimate realistic calories based on ACTUAL VISIBLE portion size
- A close-up photo does NOT mean more food — estimate based on what the food actually IS
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
            # Timeout: 30s max to avoid mobile client timing out (120s)
            import asyncio
            loop = asyncio.get_event_loop()
            
            use_new_sdk = getattr(self, '_use_new_sdk', False)
            GEMINI_TIMEOUT = 30  # seconds — mobile has 120s, leave margin
            
            max_retries = 2
            response = None
            for attempt in range(max_retries):
                try:
                    if use_new_sdk and hasattr(self, '_client'):
                        # New google.genai SDK — disable thinking for speed
                        response = await asyncio.wait_for(
                            loop.run_in_executor(
                                None,
                                lambda: self._client.models.generate_content(
                                    model=self.model,
                                    contents=[prompt, image],
                                    config=genai_types.GenerateContentConfig(
                                        temperature=0.1,
                                        max_output_tokens=600,
                                        thinking_config=genai_types.ThinkingConfig(
                                            thinking_budget=0,
                                        ),
                                    )
                                )
                            ),
                            timeout=GEMINI_TIMEOUT,
                        )
                    else:
                        # Legacy google.generativeai SDK
                        response = await asyncio.wait_for(
                            loop.run_in_executor(
                                None,
                                lambda: self.model.generate_content(
                                    [prompt, image],
                                    generation_config={
                                        "temperature": 0.1,
                                        "max_output_tokens": 600,
                                    }
                                )
                            ),
                            timeout=GEMINI_TIMEOUT,
                        )
                    break  # Success, exit retry loop
                except asyncio.TimeoutError:
                    logger.warning(f"[Gemini] Timeout ({GEMINI_TIMEOUT}s) on attempt {attempt + 1}/{max_retries}")
                    if attempt < max_retries - 1:
                        continue
                    logger.warning("[Gemini] All attempts timed out, skipping")
                    return None
                except Exception as retry_err:
                    err_str = str(retry_err).lower()
                    is_rate_limit = "429" in err_str or "resource_exhausted" in err_str or "rate" in err_str
                    if is_rate_limit and attempt < max_retries - 1:
                        wait_time = 2 ** (attempt + 1)  # 2s, 4s
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
