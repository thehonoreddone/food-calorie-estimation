"""ML Model service - YOLO segmentation and inference"""
import os
import json
import base64
from io import BytesIO
from typing import List, Optional, Tuple
from pathlib import Path

import numpy as np
from PIL import Image
import cv2
from loguru import logger

from app.core.config import settings
from app.domain.entities import SegmentEntity
from app.services.firebase_config_service import firebase_config_service


# Default class names (251 food classes - EfficientNet-B2 classifier model)
# NOTE: These are CLASSIFIER class names, not segmentation class names.
# The YOLO segmentation model has its own internal class names (model.names).
DEFAULT_CLASS_NAMES = [
    "acai-bowl", "acma", "adana-kebap", "ali-nazik", "anne-koftesi", "apple_pie", "armut",
    "asure", "avocado-toast", "avokado", "ayran",
    "baby_back_ribs", "baklava", "bal", "beef_carpaccio", "beef_tartare", "beet_salad",
    "beignets", "beyaz-lahana-sarmasi", "beyti-sarma", "biber-dolma", "bibimbap",
    "borek-cesitleri", "bread_pudding", "breakfast_burrito", "brokoli", "bruksel-lahanasi",
    "bruschetta", "bulgur-pilavi", "cacik", "caesar_salad", "canak-enginar", "cannoli",
    "caprese_salad", "carrot_cake", "cay", "ceviche", "cheese_plate", "cheesecake",
    "chicken_curry", "chicken_quesadilla", "chicken_wings", "chocolate_cake",
    "chocolate_mousse", "churros", "cig-kofte", "ciger-kebabi", "cilek", "cips", "cipura",
    "clam_chowder", "club_sandwich", "coban-salatasi", "cop-sis", "crab_cakes", "creme_brulee",
    "croque_madame", "cup_cakes", "deviled_eggs", "domates", "domates-corbasi", "dondurma",
    "doner", "donuts", "dumplings", "edamame", "eggs_benedict", "ekmek", "elma", "erik",
    "escargots", "et-sote", "etli-ekmek", "ezogelin-corbasi", "falafel", "filet_mignon",
    "findik", "fish_and_chips", "fistik_ezmesi", "foie_gras", "french_fries",
    "french_onion_soup", "french_toast", "fried_calamari", "fried_rice", "frozen_yogurt",
    "garlic_bread", "gnocchi", "gozleme", "granola", "greek_salad", "grilled_cheese_sandwich",
    "grilled_salmon", "guacamole", "gyoza", "hamburger", "hamsi-tava", "haslanmis-yumurta",
    "haslanmis_tavuk", "havuc", "hot_and_sour_soup", "hot_dog", "huevos_rancheros", "hummus",
    "hunkar-begendi", "ice_cream", "icli-kofte", "incir", "iskembe-corbasi", "iskender",
    "ispanak-yemegi", "izgara-kofte", "kabak-mucver", "kalburabasti", "karnabahar", "karniyarik",
    "karpuz", "kavun", "kayisi", "kaymak", "kazandibi", "kemal-pasa-tatlisi", "kestane",
    "kiraz", "kisir", "kivi", "kiymali-borek", "kiymali-pide", "kokorec", "kola", "kumru",
    "kunefe", "kuruyemis", "kuzu-tandir", "lahmacun", "lasagna", "levrek", "limonata",
    "lobster_bisque", "lobster_roll_sandwich", "lokma", "lor_peyniri", "macaroni_and_cheese",
    "macarons", "mango", "manti", "menemen", "mercimek-corbasi", "mercimek-koftesi",
    "meyve-suyu", "midye-dolma", "midye-tava", "miso_soup", "mumbar-dolmasi", "mussels", "muz",
    "nachos", "nar", "omlet", "onion_rings", "oysters", "pad_thai", "paella", "pancakes",
    "panna_cotta", "patates-kizartmasi", "patates-puresi", "patates-salatasi", "patlamis_misir",
    "patlican-kebabi", "peking_duck", "peynir", "peynirli-borek", "pho", "pideli-kofte",
    "pilav", "pirasa", "pizza", "pogaca", "poke-bowl", "pork_chop", "portakal", "poutine",
    "prime_rib", "pulled_pork_sandwich", "ramen", "ravioli", "recel", "red_velvet_cake",
    "revani", "risotto", "sahlep", "salatalik", "salcali-makarna", "salgam", "samosa",
    "sandvic", "sashimi", "scallops", "seaweed_salad", "seftali", "sehriye-corbasi",
    "shrimp_and_grits", "simit", "siyah-zeytin", "smoothie", "soda", "spaghetti_bolognese",
    "spaghetti_carbonara", "spring_rolls", "steak", "strawberry_shortcake", "su", "su-boregi",
    "sucuklu-yumurta", "sulu-bamya-yemegi", "sulu-barbunya-yemegi", "sulu-bezelye-yemegi",
    "sulu-kuru-fasulye-yemegi", "sulu-mercimek-yemegi", "sulu-nohut-yemegi",
    "sulu-patates-yemegi", "sushi", "sutlac", "tacos", "takoyaki", "tantuni",
    "tarhana-corbasi", "tas-kebabi", "tavuk-gogsu", "tavuk-izgara", "tavuk-sote",
    "tavuk_doner", "tereyagi", "tiramisu", "tost", "tulumba-tatlisi", "tuna_tartare",
    "turk-kahvesi", "tursu", "uzum", "waffles", "wrap", "yaprak-sarma",
    "yayla-corbasi", "yesil-zeytin", "yogurt", "yogurtlu-makarna", "yulaf_ezmesi",
    "zeytinyagli-fasulye"
]


class ModelService:
    """Service for managing and running ML models"""
    
    def __init__(self):
        self.segmentation_model = None
        self.model_loaded = False
        self.class_names: List[str] = []  # Classifier class names (EfficientNet)
        self.seg_class_names: List[str] = []  # Segmentation class names (YOLO)
        self.using_foodseg103 = False
        
    async def load_models(self) -> None:
        """Load ML models"""
        await self._load_segmentation_model()
    
    async def _load_class_names(self) -> List[str]:
        """Load class names from Firebase, config file or use FoodSeg103 defaults"""
        # Try Firebase first
        try:
            firebase_classes = await firebase_config_service.get_class_names()
            if firebase_classes:
                logger.info(f"Loaded {len(firebase_classes)} class names from Firebase")
                return firebase_classes
        except Exception as e:
            logger.warning(f"Failed to load class names from Firebase: {e}")

        # Try to load from config
        config_paths = [
            Path("config/class_names.json"),
            Path("../config/class_names.json"),
        ]
        
        for path in config_paths:
            if path.exists():
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        class_names = json.load(f)
                    logger.info(f"Loaded {len(class_names)} class names from {path}")
                    return class_names
                except Exception as e:
                    logger.warning(f"Failed to load class names from {path}: {e}")
        
        # Fallback to hardcoded default class names
        logger.info(f"Using default class names ({len(DEFAULT_CLASS_NAMES)} classes)")
        return DEFAULT_CLASS_NAMES
    
    async def _load_segmentation_model(self) -> None:
        """Load YOLO segmentation model"""
        try:
            from ultralytics import YOLO
            
            # Try primary model path first
            model_path = Path(settings.YOLO_MODEL_PATH)
            
            # Check alternative paths for models (prioritize food_seg_best.pt)
            possible_paths = [
                model_path,
                Path("models") / "food_seg_best.pt",  # NEW: Training output model
                Path("models") / "food201_seg_best.pt", # Legacy model fallback
                Path("models") / "foodseg103_seg.pt",
                Path("..") / "foodseg103_seg.pt",
                Path(settings.YOLO_FALLBACK_MODEL),
            ]
            
            loaded_path = None
            for path in possible_paths:
                if path.exists():
                    loaded_path = path
                    break
            
            if loaded_path is None:
                # Do NOT download models - require local models
                logger.error("No segmentation model found in models/ directory!")
                logger.error("Expected one of: food_seg_best.pt, food201_seg_best.pt, foodseg103_seg.pt")
                raise FileNotFoundError(
                    "No segmentation model found. Place your trained model in the models/ directory."
                )
            else:
                logger.info(f"Loading model from: {loaded_path}")
                self.segmentation_model = YOLO(str(loaded_path))
                # Check if this is the FoodSeg103 model
                self.using_foodseg103 = "foodseg103" in str(loaded_path).lower()
            
            # Load classifier class names from config/Firebase
            self.class_names = await self._load_class_names()
            
            # Determine segmentation class names:
            # The YOLO model has its own internal class names (model.names)
            # which MUST be used for segmentation output mapping.
            # The config class_names are for the EfficientNet classifier.
            if hasattr(self.segmentation_model, "names"):
                model_classes = self.segmentation_model.names
                model_class_count = len(model_classes)
                config_class_count = len(self.class_names)
                
                logger.info(f"YOLO model has {model_class_count} internal classes")
                logger.info(f"Config has {config_class_count} classifier classes")
                
                if model_class_count != config_class_count:
                    # Class count mismatch: use model's own names for segmentation
                    # This is the correct behavior - the YOLO model knows its own classes
                    self.seg_class_names = list(model_classes.values())
                    logger.info(
                        f"✅ Using YOLO model's internal class names for segmentation "
                        f"({model_class_count} classes) — config has different count ({config_class_count})"
                    )
                else:
                    # Counts match - check if model has generic names ("food_X")
                    model_names = list(model_classes.values())
                    if model_names and model_names[0].startswith("food_"):
                        # Model has generic placeholder names, use config names
                        self.seg_class_names = self.class_names[:]
                        logger.info(f"Model has generic names, using config class names for segmentation")
                    else:
                        # Counts match and model has real names - verify consistency
                        first_id = list(model_classes.keys())[0]
                        if model_classes[first_id] != self.class_names[0]:
                            logger.warning(
                                f"⚠️ Class name mismatch at index 0! "
                                f"Model: {model_classes[first_id]}, Config: {self.class_names[0]}. "
                                f"Using model's own names for segmentation."
                            )
                            self.seg_class_names = model_names
                        else:
                            self.seg_class_names = self.class_names[:]
                            logger.info(f"Config and model class names match")
            else:
                # No model names available, fallback to config
                self.seg_class_names = self.class_names[:]
            
            self.model_loaded = True
            logger.info(f"✅ Segmentation model loaded with {len(self.seg_class_names)} seg classes")
            
        except Exception as e:
            logger.error(f"Failed to load segmentation model: {e}")
            self.model_loaded = False
            raise
    
    def is_loaded(self) -> bool:
        """Check if models are loaded"""
        return self.model_loaded
    
    async def segment_image(
        self,
        image: Image.Image,
        conf_threshold: float = None,
        iou_threshold: float = None,
    ) -> List[SegmentEntity]:
        """
        Perform segmentation on image
        
        Args:
            image: PIL Image to segment
            conf_threshold: Confidence threshold
            iou_threshold: IoU threshold for NMS
            
        Returns:
            List of SegmentEntity objects
        """
        if not self.model_loaded:
            raise RuntimeError("Model not loaded")
        
        conf = conf_threshold or settings.CONFIDENCE_THRESHOLD
        iou = iou_threshold or settings.IOU_THRESHOLD
        
        # Convert PIL to numpy array
        image_np = np.array(image)
        
        # Run inference
        results = self.segmentation_model(
            image_np,
            conf=conf,
            iou=iou,
            verbose=False,
        )
        
        segments: List[SegmentEntity] = []
        
        for result in results:
            if result.boxes is None:
                continue
                
            boxes = result.boxes
            masks = result.masks
            
            for i, box in enumerate(boxes):
                # Get class info
                class_id = int(box.cls[0])
                confidence = float(box.conf[0])
                bbox = box.xyxy[0].tolist()  # [x1, y1, x2, y2]
                
                # Get class name — use segmentation-specific class names
                class_name = self.seg_class_names[class_id] if class_id < len(self.seg_class_names) else f"class_{class_id}"
                
                # Get mask if available
                mask_bytes = None
                area_pixels = 0
                
                if masks is not None and i < len(masks):
                    mask_data = masks[i].data.cpu().numpy()[0]
                    mask_img = (mask_data * 255).astype(np.uint8)
                    
                    # Calculate area
                    area_pixels = int(np.sum(mask_data > 0.5))
                    
                    # Encode mask as base64 PNG
                    mask_pil = Image.fromarray(mask_img)
                    buffer = BytesIO()
                    mask_pil.save(buffer, format="PNG")
                    mask_bytes = base64.b64encode(buffer.getvalue()).decode("utf-8")
                
                segment = SegmentEntity(
                    class_id=class_id,
                    class_name=class_name,
                    confidence=confidence,
                    bbox=bbox,
                    mask=mask_bytes.encode() if mask_bytes else None,
                    area_pixels=area_pixels,
                )
                segments.append(segment)
        
        logger.debug(f"Found {len(segments)} food segments")
        return segments
    
    def preprocess_image(
        self,
        image: Image.Image,
        target_size: Tuple[int, int] = (640, 640),
    ) -> Image.Image:
        """Preprocess image for inference"""
        # Ensure RGB
        if image.mode != "RGB":
            image = image.convert("RGB")
        
        # Resize maintaining aspect ratio
        image.thumbnail(target_size, Image.Resampling.LANCZOS)
        
        return image
    
    def get_class_name(self, class_id: int) -> str:
        """Get segmentation class name from ID"""
        if 0 <= class_id < len(self.seg_class_names):
            return self.seg_class_names[class_id]
        return f"class_{class_id}"
    
    def get_classifier_class_name(self, class_id: int) -> str:
        """Get classifier class name from ID"""
        if 0 <= class_id < len(self.class_names):
            return self.class_names[class_id]
        return f"class_{class_id}"


# Global model service instance
model_service = ModelService()
