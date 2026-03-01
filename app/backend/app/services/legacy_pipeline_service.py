"""
Legacy Pipeline Service - Integrates food_calorie_estimation system
This service uses the proven classification and segmentation from the old pipeline.
"""
import sys
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass

import numpy as np
from PIL import Image
from loguru import logger

# Add food_calorie_estimation to path
FOOD_CALORIE_PATH = Path(__file__).resolve().parent.parent.parent.parent.parent / "food_calorie_estimation"
if str(FOOD_CALORIE_PATH) not in sys.path:
    sys.path.insert(0, str(FOOD_CALORIE_PATH.parent))

# Try to import from food_calorie_estimation
try:
    from food_calorie_estimation.inference.classify_food import FoodClassifier, ClassificationResult
    from food_calorie_estimation.inference.segment_food import FoodSegmentor, FoodSegmentationResult
    from food_calorie_estimation.inference.estimate_portion import PortionEstimator, PortionEstimationResult
    from food_calorie_estimation.inference.estimate_calories import CalorieEstimator, CalorieEstimationResult
    from food_calorie_estimation.modules.food_type_analyzer import FoodTypeAnalyzer
    from food_calorie_estimation.utils.config import get_config
    LEGACY_AVAILABLE = True
    logger.info("✅ Legacy food_calorie_estimation pipeline available")
except ImportError as e:
    LEGACY_AVAILABLE = False
    logger.warning(f"⚠️ Legacy pipeline not available: {e}")


@dataclass
class LegacyPredictionResult:
    """Result from legacy pipeline"""
    predicted_class: str
    confidence: float
    top_k_predictions: List[Tuple[str, float]]
    food_type: str
    estimated_weight_grams: float
    estimated_calories: float
    calories_min: float
    calories_max: float
    kcal_per_gram: float
    mask: Optional[np.ndarray] = None
    segmentation_info: Optional[Dict] = None


class LegacyPipelineService:
    """
    Service that wraps the proven food_calorie_estimation pipeline.
    Uses EfficientNet classifier + FoodSeg103/YOLOv8 segmentation.
    """
    
    def __init__(self):
        self.classifier: Optional[FoodClassifier] = None
        self.segmentor: Optional[FoodSegmentor] = None
        self.portion_estimator: Optional[PortionEstimator] = None
        self.calorie_estimator: Optional[CalorieEstimator] = None
        self.food_analyzer: Optional[FoodTypeAnalyzer] = None
        self.config = None
        self.is_loaded = False
        
    async def load(self, classifier_path: Optional[str] = None) -> bool:
        """
        Load the legacy pipeline components.
        
        Args:
            classifier_path: Path to trained classifier checkpoint
            
        Returns:
            True if loaded successfully
        """
        if not LEGACY_AVAILABLE:
            logger.error("Legacy pipeline not available")
            return False
            
        try:
            # Find classifier checkpoint
            if classifier_path is None:
                classifier_path = self._find_classifier_checkpoint()
            
            if classifier_path is None:
                logger.error("No classifier checkpoint found")
                return False
            
            logger.info(f"Loading legacy classifier from: {classifier_path}")
            
            # Initialize classifier
            self.classifier = FoodClassifier(
                checkpoint_path=str(classifier_path),
                device=None  # Auto-detect
            )
            logger.info(f"✅ Classifier loaded with {self.classifier.num_classes} classes")
            
            # Initialize segmentor with FoodSeg103
            self._init_segmentor()
            
            # Initialize other components
            self.portion_estimator = PortionEstimator()
            self.calorie_estimator = CalorieEstimator()
            self.food_analyzer = FoodTypeAnalyzer()
            self.config = get_config()
            self.config.load_all()
            
            self.is_loaded = True
            logger.info("✅ Legacy pipeline fully loaded")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load legacy pipeline: {e}")
            return False
    
    def _find_classifier_checkpoint(self) -> Optional[Path]:
        """Find the best classifier checkpoint, including latest training runs"""
        backend_models = Path(__file__).resolve().parent.parent.parent / "models"
        ml_runs = Path(__file__).resolve().parent.parent.parent / "ml" / "runs" / "classifier"
        
        possible_paths = [
            # Priority 1: The deployed best checkpoint
            backend_models / "checkpoint_best.pth",
        ]
        
        # Priority 2: Latest training run (auto-discover newest run folder)
        if ml_runs.exists():
            run_dirs = sorted(
                [d for d in ml_runs.iterdir() if d.is_dir()],
                key=lambda d: d.stat().st_mtime,
                reverse=True,
            )
            for run_dir in run_dirs:
                best = run_dir / "checkpoints" / "checkpoint_best.pth"
                if best.exists():
                    possible_paths.append(best)
                    break  # Only add newest
        
        # Priority 3: Legacy fallback paths
        possible_paths.extend([
            FOOD_CALORIE_PATH / "outputs" / "run_20251216_140119" / "checkpoints" / "checkpoint_best.pth",
            backend_models / "efficientnet_b2_best.pt",
        ])
        
        for path in possible_paths:
            if path.exists():
                logger.info(f"Found classifier checkpoint: {path}")
                return path
        
        return None
    
    def _init_segmentor(self):
        """Initialize segmentation with FoodSeg103 priority, using local models only"""
        try:
            backend_models = Path(__file__).resolve().parent.parent.parent / "models"
            
            # Find FoodSeg103 model
            foodseg103_paths = [
                backend_models / "foodseg103_seg.pt",
                FOOD_CALORIE_PATH / "foodseg103_seg.pt",
                FOOD_CALORIE_PATH / "seg_dataset" / "foodseg103_best.pt",
            ]
            
            foodseg103_path = None
            for path in foodseg103_paths:
                if path.exists():
                    foodseg103_path = str(path)
                    break
            
            # Find YOLOv8 segmentation model (use local models, NEVER download)
            yolov8_seg_paths = [
                backend_models / "food_seg_best.pt",
                backend_models / "food201_seg_best.pt",
            ]
            
            yolov8_path = None
            for path in yolov8_seg_paths:
                if path.exists():
                    yolov8_path = str(path)
                    logger.info(f"Using local YOLOv8 seg model: {path}")
                    break
            
            self.segmentor = FoodSegmentor(
                foodseg103_path=foodseg103_path,
                yolov8_path=yolov8_path,  # Use local model, no download
                device=None,
                enabled=True,
                use_fallback=True,
                prefer_foodseg103=True
            )
            
            if self.segmentor._foodseg103_available:
                logger.info("✅ FoodSeg103 segmentor loaded")
            elif self.segmentor._yolo_available:
                logger.info("✅ YOLOv8 segmentor loaded (FoodSeg103 not available)")
            else:
                logger.warning("⚠️ Using GrabCut fallback for segmentation")
                
        except Exception as e:
            logger.warning(f"Failed to load segmentor: {e}")
            self.segmentor = None
    
    async def predict(self, image: Image.Image, top_k: int = 5) -> LegacyPredictionResult:
        """
        Run full prediction pipeline.
        
        Args:
            image: PIL Image to analyze
            top_k: Number of top predictions to return
            
        Returns:
            LegacyPredictionResult with all estimation data
        """
        if not self.is_loaded:
            raise RuntimeError("Pipeline not loaded")
        
        # Step 1: Classification
        classification = self.classifier.predict(image, top_k=top_k)
        food_class = classification.predicted_class
        confidence = classification.confidence
        
        logger.info(f"Classified as: {food_class} ({confidence:.1%})")
        
        # Step 2: Get food type and estimation strategy
        food_type = self.food_analyzer.get_food_type(food_class)
        strategy = self.food_analyzer.get_estimation_strategy(food_class)
        
        # Step 3: Segmentation
        mask = None
        instance_masks = []
        seg_info = None
        if self.segmentor is not None:
            try:
                seg_result = self.segmentor.segment(image, depth_map=None)
                if seg_result.combined_food_mask is not None:
                    mask = seg_result.combined_food_mask
                    # Get individual instance masks from instances list
                    if seg_result.instances:
                        for inst in seg_result.instances:
                            if hasattr(inst, 'mask') and inst.mask is not None:
                                instance_masks.append(inst.mask)
                    # If no instance masks found, use combined mask
                    if not instance_masks:
                        instance_masks = [mask]
                    seg_info = {
                        "num_instances": seg_result.num_instances,
                        "total_area_pixels": seg_result.total_area_pixels,
                        "segmentor_type": seg_result.segmentor_type,
                        "detected_classes": seg_result.detected_food_classes,
                    }
            except Exception as e:
                logger.warning(f"Segmentation failed: {e}")
        
        # Step 4: Portion estimation - call with correct signature
        portion_result = self.portion_estimator.estimate(
            image=image,
            food_class=food_class,
            instance_masks=instance_masks,
            depth_map=None,
            depth_range=None
        )
        
        # Step 5: Calorie estimation
        calorie_result = self.calorie_estimator.estimate(
            food_class=food_class,
            portion_result=portion_result
        )
        
        return LegacyPredictionResult(
            predicted_class=food_class,
            confidence=confidence,
            top_k_predictions=classification.top_k_predictions,
            food_type=food_type,
            estimated_weight_grams=portion_result.total_mass_g,
            estimated_calories=calorie_result.kcal,
            calories_min=calorie_result.kcal_min,
            calories_max=calorie_result.kcal_max,
            kcal_per_gram=calorie_result.kcal_per_gram,
            mask=mask,
            segmentation_info=seg_info
        )


# Global instance
legacy_pipeline = LegacyPipelineService()
