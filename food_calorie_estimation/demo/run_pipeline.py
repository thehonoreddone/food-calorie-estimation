"""
Food Calorie Estimation Pipeline
=================================

Main pipeline script for food calorie estimation.
Takes an image and outputs: predicted class, portion size (grams/ml), and calories (kcal).

IMPORTANT:
- NO DEMO MODE: Classifier checkpoint MUST be provided and load successfully.
- If classifier fails, the pipeline raises an error and exits.
- All outputs are APPROXIMATE. No medical/nutritional accuracy claims.

Usage (Windows Command Prompt):
-------------------------------
python demo\\run_pipeline.py --image demo\\food.jpg --classifier outputs\\run_xxx\\checkpoints\\checkpoint_best.pth

python demo\\run_pipeline.py --image demo\\food.jpg --classifier path\\to\\checkpoint.pth --visualize

python demo\\run_pipeline.py --image demo\\food.jpg --classifier path\\to\\checkpoint.pth --yolov8_seg path\\to\\yolov8n-seg.pt --depth_model midas_small --visualize --save --output results

Usage (PowerShell):
-------------------
python demo/run_pipeline.py --image demo/food.jpg --classifier outputs/run_xxx/checkpoints/checkpoint_best.pth

Full options:
python demo/run_pipeline.py `
    --image demo/food.jpg `
    --classifier outputs/run_xxx/checkpoints/checkpoint_best.pth `
    --class_names outputs/run_xxx/class_names.json `
    --yolov8_seg path/to/yolov8n-seg.pt `
    --depth_model midas_small `
    --visualize `
    --save `
    --output results
"""

import argparse
import json
import logging
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List

import numpy as np
from PIL import Image
import cv2

# Add parent directory to path for imports
# We need to add the grandparent directory of this script's parent (i.e. the parent of food_calorie_estimation)
# so that we can import food_calorie_estimation as a package
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from food_calorie_estimation.utils.logging_utils import setup_logging, PipelineTimer
from food_calorie_estimation.utils.config import get_config


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Food Calorie Estimation Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples (Windows Command Prompt):
  python demo\\run_pipeline.py --image demo\\food.jpg --classifier outputs\\run_001\\checkpoints\\checkpoint_best.pth
  
  python demo\\run_pipeline.py --image demo\\food.jpg --classifier path\\to\\model.pth --visualize --save

Examples (PowerShell / Linux):
  python demo/run_pipeline.py --image demo/food.jpg --classifier outputs/run_001/checkpoints/checkpoint_best.pth
"""
    )
    
    # Required arguments
    parser.add_argument(
        '--image', '-i',
        type=str,
        required=True,
        help='Path to input food image (REQUIRED)'
    )
    
    parser.add_argument(
        '--classifier', '-c',
        type=str,
        required=True,
        help='Path to classifier checkpoint .pth file (REQUIRED). NO DEMO MODE.'
    )
    
    # Optional arguments
    parser.add_argument(
        '--class_names',
        type=str,
        default=None,
        help='Path to class_names.json. If not provided, looks in same directory as checkpoint.'
    )
    
    parser.add_argument(
        '--yolov8_seg',
        type=str,
        default=None,
        help='Path to YOLOv8-seg model weights. If not provided, uses pretrained yolov8n-seg.'
    )
    
    parser.add_argument(
        '--foodseg103',
        type=str,
        default=None,
        help='Path to FoodSeg103 model weights. Auto-detected if not provided.'
    )
    
    parser.add_argument(
        '--depth_model',
        type=str,
        default='midas_small',
        choices=['midas_small', 'midas_hybrid', 'midas_large', 'zoedepth', 'none'],
        help='Depth estimation model to use (default: midas_small). Use "none" to disable.'
    )
    
    parser.add_argument(
        '--visualize', '-v',
        action='store_true',
        help='Display visualization of results'
    )
    
    parser.add_argument(
        '--save', '-s',
        action='store_true',
        help='Save results and visualizations to output directory'
    )
    
    parser.add_argument(
        '--output', '-o',
        type=str,
        default='results',
        help='Output directory for saved results (default: results)'
    )
    
    parser.add_argument(
        '--top_k',
        type=int,
        default=5,
        help='Number of top predictions to show (default: 5)'
    )
    
    parser.add_argument(
        '--device',
        type=str,
        default=None,
        choices=['cuda', 'cpu'],
        help='Device to use (default: auto-detect)'
    )
    
    parser.add_argument(
        '--log_level',
        type=str,
        default='INFO',
        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
        help='Logging level (default: INFO)'
    )
    
    parser.add_argument(
        '--no_segmentation',
        action='store_true',
        help='Disable segmentation (lower accuracy but faster)'
    )
    
    return parser.parse_args()


class FoodCaloriePipeline:
    """
    Main food calorie estimation pipeline.
    
    Pipeline stages:
    1. Load image
    2. Classify food (using trained classifier - NO DEMO MODE)
    3. Determine food type
    4. Segment instances (YOLOv8-seg)
    5. Estimate depth (optional)
    6. Estimate portion
    7. Estimate calories
    """
    
    def __init__(self,
                 classifier_path: str,
                 class_names_path: Optional[str] = None,
                 yolov8_seg_path: Optional[str] = None,
                 depth_model: str = 'midas_small',
                 device: Optional[str] = None,
                 enable_segmentation: bool = True):
        """
        Initialize the pipeline.
        
        Args:
            classifier_path: Path to classifier checkpoint (REQUIRED)
            class_names_path: Path to class_names.json (optional, auto-detected)
            yolov8_seg_path: Path to YOLOv8-seg model (optional)
            depth_model: Depth model type ('midas_small', 'midas_hybrid', 'zoedepth', 'none')
            device: Device to use (optional, auto-detected)
            enable_segmentation: Whether to enable segmentation
        """
        self.logger = logging.getLogger("food_calorie_estimation")
        self.device = device
        
        # Validate classifier path
        if not classifier_path:
            raise ValueError("Classifier path is REQUIRED. NO DEMO MODE.")
        
        classifier_path = Path(classifier_path)
        if not classifier_path.exists():
            raise FileNotFoundError(
                f"Classifier checkpoint not found: {classifier_path}\n"
                f"Please provide a valid path to your trained model."
            )
        
        self.logger.info("=" * 60)
        self.logger.info("FOOD CALORIE ESTIMATION PIPELINE")
        self.logger.info("=" * 60)
        
        # Initialize classifier (MUST succeed, no fallback to demo mode)
        self._init_classifier(str(classifier_path), class_names_path)
        
        # Initialize segmentation (optional)
        self.segmentor = None
        self.enable_segmentation = enable_segmentation
        if enable_segmentation:
            self._init_segmentation(yolov8_seg_path)
        
        # Initialize depth estimation (optional)
        self.depth_estimator = None
        if depth_model != 'none':
            self._init_depth(depth_model)
        
        # Load config
        self.config = get_config()
        self.config.load_all()
        
        self.logger.info("Pipeline initialized successfully")
        self.logger.info("=" * 60)
    
    def _init_classifier(self, checkpoint_path: str, class_names_path: Optional[str]):
        """Initialize classifier - MUST succeed, no demo mode."""
        from food_calorie_estimation.inference.classify_food import FoodClassifier
        
        self.logger.info("Loading classifier...")
        self.logger.info(f"  Checkpoint: {checkpoint_path}")
        
        try:
            self.classifier = FoodClassifier(
                checkpoint_path=checkpoint_path,
                class_names_path=class_names_path,
                device=self.device
            )
            self.logger.info(f"  Classes: {self.classifier.num_classes}")
            self.logger.info("  Classifier loaded successfully")
        except Exception as e:
            self.logger.error(f"FAILED to load classifier: {e}")
            raise RuntimeError(
                f"Classifier failed to load. This is REQUIRED - no demo mode.\n"
                f"Error: {e}\n"
                f"Please check:\n"
                f"  1. Checkpoint path is correct\n"
                f"  2. class_names.json exists in the same directory or parent directory\n"
                f"  3. Checkpoint is a valid PyTorch model"
            )
    
    def _init_segmentation(self, yolov8_path: Optional[str]):
        """Initialize segmentation module with FoodSeg103 support."""
        from food_calorie_estimation.inference.segment_food import FoodSegmentor
        
        self.logger.info("Loading segmentation model...")
        
        try:
            # FoodSeg103 path'i bul (varsa)
            from pathlib import Path
            project_root = Path(__file__).resolve().parent.parent.parent
            foodseg103_path = None
            
            # Olası FoodSeg103 model konumları
            possible_paths = [
                project_root / "foodseg103_seg.pt",
                Path(__file__).parent.parent / "foodseg103_seg.pt",
                Path(__file__).parent.parent / "seg_dataset" / "foodseg103_best.pt",
            ]
            
            for path in possible_paths:
                if path.exists():
                    foodseg103_path = str(path)
                    break
            
            self.segmentor = FoodSegmentor(
                foodseg103_path=foodseg103_path,
                yolov8_path=yolov8_path,
                device=self.device,
                enabled=True,
                use_fallback=True,  # Enable GrabCut fallback when models fail
                prefer_foodseg103=True  # FoodSeg103'ü tercih et
            )
            
            # Aktif segmentor'u logla
            if self.segmentor._foodseg103_available:
                self.logger.info("  ✅ FoodSeg103 segmentor loaded (103 food classes)")
            elif self.segmentor._yolo_available:
                self.logger.info("  YOLOv8 segmentor loaded (FoodSeg103 unavailable)")
                self.logger.info("  💡 FoodSeg103 için: cd seg_dataset && python train_seg.py")
            elif self.segmentor.use_fallback:
                self.logger.info("  GrabCut fallback enabled (no models available)")
                self.logger.info("  💡 FoodSeg103 için: cd seg_dataset && python train_seg.py")
            else:
                self.logger.warning("  Segmentation disabled (failed to load)")
                
        except Exception as e:
            self.logger.warning(f"  Failed to load segmentor: {e}")
            self.logger.warning("  Continuing without segmentation (lower accuracy)")
            self.segmentor = None
    
    def _init_depth(self, depth_model: str):
        """Initialize depth estimation module."""
        from food_calorie_estimation.inference.estimate_depth import DepthEstimator
        
        self.logger.info(f"Configuring depth estimator ({depth_model})...")
        
        try:
            self.depth_estimator = DepthEstimator(
                model_type=depth_model,
                device=self.device
            )
            self.logger.info("  Depth estimator configured (lazy loading)")
        except Exception as e:
            self.logger.warning(f"  Failed to configure depth estimator: {e}")
            self.depth_estimator = None
    
    def process(self, image_path: str, top_k: int = 5) -> Dict[str, Any]:
        """
        Process an image through the full pipeline.
        
        Args:
            image_path: Path to input image
            top_k: Number of top predictions to return
        
        Returns:
            Dictionary with all results
        """
        results = {
            'input_image': image_path,
            'timestamp': datetime.now().isoformat(),
            'success': False,
            'error': None
        }
        
        try:
            # Load image
            with PipelineTimer("Load Image", self.logger):
                image = Image.open(image_path).convert('RGB')
                results['image_size'] = image.size
                self.logger.info(f"Image loaded: {image.size[0]}x{image.size[1]}")
            
            # Step 1: Classification
            with PipelineTimer("Classification", self.logger):
                classification = self.classifier.predict(image, top_k=top_k)
                
                results['classification'] = {
                    'predicted_class': classification.predicted_class,
                    'confidence': float(classification.confidence),
                    'top_k': [
                        {'class': c, 'confidence': float(p)} 
                        for c, p in classification.top_k_predictions
                    ]
                }
                
                self.logger.info(f"Predicted: {classification.predicted_class} "
                               f"({classification.confidence:.1%})")
            
            food_class = classification.predicted_class
            
            # Step 2: Determine food type
            from food_calorie_estimation.modules.food_type_analyzer import FoodTypeAnalyzer
            analyzer = FoodTypeAnalyzer()
            food_type = analyzer.get_food_type(food_class)
            strategy = analyzer.get_estimation_strategy(food_class)
            
            results['food_type'] = food_type
            results['estimation_strategy'] = strategy['description']
            self.logger.info(f"Food type: {food_type}")
            
            # Step 3: Depth estimation (moved before segmentation for fallback refinement)
            depth_map = None
            depth_range = None
            
            if self.depth_estimator is not None:
                with PipelineTimer("Depth Estimation", self.logger):
                    try:
                        depth_result = self.depth_estimator.estimate(image)
                        depth_map = depth_result.depth_map
                        depth_range = (depth_result.depth_min, depth_result.depth_max)
                        
                        results['depth'] = {
                            'model': depth_result.model_type,
                            'depth_range': depth_range,
                            'warnings': depth_result.warnings
                        }
                        
                        self.logger.info(f"Depth estimated (range: {depth_range[0]:.2f}-{depth_range[1]:.2f})")
                    except Exception as e:
                        self.logger.warning(f"Depth estimation failed: {e}")
                        results['depth'] = {'error': str(e)}
            
            # Step 4: Segmentation (now with depth map for fallback refinement)
            instance_masks = []
            segmentation_result = None
            combined_food_mask = None
            
            if self.enable_segmentation and self.segmentor is not None:
                with PipelineTimer("Segmentation", self.logger):
                    # Pass depth map for fallback refinement when YOLOv8 unavailable
                    segmentation_result = self.segmentor.segment(image, depth_map=depth_map)
                    
                    instance_masks = [inst.mask for inst in segmentation_result.instances]
                    combined_food_mask = segmentation_result.combined_food_mask
                    
                    results['segmentation'] = {
                        'num_instances': segmentation_result.num_instances,
                        'total_area_pixels': segmentation_result.total_area_pixels,
                        'segmentor_type': segmentation_result.segmentor_type,
                        'has_combined_mask': combined_food_mask is not None,
                        'has_container_mask': segmentation_result.container_mask is not None,
                        'warnings': segmentation_result.warnings,
                        'detected_food_classes': segmentation_result.detected_food_classes,
                        'class_distribution': segmentation_result.class_distribution
                    }
                    
                    self.logger.info(f"Segmented {segmentation_result.num_instances} instances ({segmentation_result.segmentor_type})")
                    
                    # FoodSeg103 ile tespit edilen yemek sınıflarını göster
                    if segmentation_result.detected_food_classes:
                        detected_str = ", ".join(segmentation_result.detected_food_classes[:5])
                        if len(segmentation_result.detected_food_classes) > 5:
                            detected_str += f" +{len(segmentation_result.detected_food_classes) - 5} more"
                        self.logger.info(f"Detected food classes: {detected_str}")
                    
                    if combined_food_mask is not None:
                        mask_coverage = np.sum(combined_food_mask) / (combined_food_mask.shape[0] * combined_food_mask.shape[1])
                        self.logger.info(f"Combined food mask coverage: {mask_coverage:.1%}")
            else:
                results['segmentation'] = {
                    'num_instances': 0,
                    'warnings': ['Segmentation disabled']
                }
            
            # Step 5: Refine depth with segmentation mask
            if depth_map is not None and combined_food_mask is not None:
                with PipelineTimer("Depth Masking", self.logger):
                    # Only keep depth values within the food/container area
                    # This prevents background from affecting volume estimation
                    masked_depth = depth_map.copy()
                    
                    # Resize mask if needed
                    if combined_food_mask.shape != depth_map.shape:
                        combined_food_mask_resized = cv2.resize(
                            combined_food_mask.astype(np.uint8),
                            (depth_map.shape[1], depth_map.shape[0]),
                            interpolation=cv2.INTER_NEAREST
                        )
                    else:
                        combined_food_mask_resized = combined_food_mask
                    
                    # Apply mask - set background depth to minimum (far away)
                    background_mask = combined_food_mask_resized == 0
                    masked_depth[background_mask] = np.min(depth_map)
                    
                    # Recalculate depth range only for food region
                    food_depths = depth_map[combined_food_mask_resized > 0]
                    if len(food_depths) > 0:
                        depth_range = (float(np.min(food_depths)), float(np.max(food_depths)))
                        self.logger.info(f"Masked depth range (food only): {depth_range[0]:.2f}-{depth_range[1]:.2f}")
                    
                    depth_map = masked_depth
                    
                    # Update depth results
                    if 'depth' in results:
                        results['depth']['masked_with_segmentation'] = True
                        results['depth']['depth_range'] = depth_range
            
            # Step 6: Portion estimation
            from food_calorie_estimation.inference.estimate_portion import estimate_portion
            
            with PipelineTimer("Portion Estimation", self.logger):
                # Pass combined food mask to portion estimator for better accuracy
                portion_result = estimate_portion(
                    image=image,
                    food_class=food_class,
                    instance_masks=instance_masks if instance_masks else ([combined_food_mask] if combined_food_mask is not None else []),
                    depth_map=depth_map,
                    depth_range=depth_range
                )
                
                results['portion'] = {
                    'total_mass_g': float(portion_result.total_mass_g),
                    'total_volume_cm3': float(portion_result.total_volume_cm3),
                    'num_instances': portion_result.num_instances,
                    'is_repeatable': portion_result.is_repeatable,
                    'cv': float(portion_result.coefficient_of_variation),
                    'method': portion_result.method_used,
                    'calibration_method': portion_result.calibration.method,
                    'calibration_confidence': float(portion_result.calibration.confidence),
                    'confidence': float(portion_result.confidence_level),
                    'warnings': portion_result.warnings,
                    'is_liquid': portion_result.is_liquid
                }
                
                if portion_result.is_liquid:
                    results['portion']['volume_ml'] = float(portion_result.volume_ml)
                    self.logger.info(f"Portion: {portion_result.volume_ml:.0f} ml "
                                   f"({portion_result.total_mass_g:.0f} g)")
                else:
                    self.logger.info(f"Portion: {portion_result.total_mass_g:.0f} g "
                                   f"({portion_result.num_instances} instances)")
            
            # Step 6: Calorie estimation
            from food_calorie_estimation.inference.estimate_calories import estimate_calories
            
            with PipelineTimer("Calorie Estimation", self.logger):
                calorie_result = estimate_calories(food_class, portion_result)
                
                results['calories'] = {
                    'kcal': float(calorie_result.kcal),
                    'kcal_min': float(calorie_result.kcal_min),
                    'kcal_max': float(calorie_result.kcal_max),
                    'kcal_per_gram': float(calorie_result.kcal_per_gram),
                    'confidence': float(calorie_result.confidence),
                    'uncertainty_sources': calorie_result.uncertainty_sources,
                    'warnings': calorie_result.warnings
                }
                
                self.logger.info(f"Calories: {calorie_result.kcal:.0f} kcal "
                               f"(range: {calorie_result.kcal_min:.0f}-{calorie_result.kcal_max:.0f})")
            
            # Store intermediate results for visualization
            results['_internal'] = {
                'image': image,
                'segmentation_result': segmentation_result,
                'depth_map': depth_map,
                'portion_result': portion_result
            }
            
            results['success'] = True
            
        except Exception as e:
            self.logger.error(f"Pipeline error: {e}")
            results['error'] = str(e)
            results['success'] = False
            raise
        
        return results
    
    def visualize(self, results: Dict[str, Any]) -> np.ndarray:
        """
        Create visualization of results.
        
        Args:
            results: Pipeline results dictionary
        
        Returns:
            Visualization image as numpy array
        """
        if not results.get('success'):
            raise ValueError("Cannot visualize failed results")
        
        internal = results.get('_internal', {})
        image = internal.get('image')
        
        if image is None:
            raise ValueError("No image in results")
        
        image_np = np.array(image)
        h, w = image_np.shape[:2]
        
        # Create visualization canvas
        # Layout: 
        # [ Original Image ] [ Segmentation ]
        # [ Depth Map      ] [ Info Panel   ]
        
        has_depth = internal.get('depth_map') is not None
        
        # Resize images to fixed size for grid
        grid_h, grid_w = 400, 600
        
        img_resized = cv2.resize(image_np, (grid_w, grid_h))
        
        # Panel 2: Segmentation
        seg_vis = img_resized.copy()
        seg_result = internal.get('segmentation_result')
        if seg_result is not None and seg_result.num_instances > 0:
            # Create colored mask overlay
            colors = [
                (255, 0, 0), (0, 255, 0), (0, 0, 255),
                (255, 255, 0), (255, 0, 255), (0, 255, 255)
            ]
            
            # Resize masks to grid size
            scale_x = grid_w / w
            scale_y = grid_h / h
            
            for i, inst in enumerate(seg_result.instances):
                color = colors[i % len(colors)]
                
                # Resize mask
                mask_resized = cv2.resize(inst.mask.astype(np.uint8), (grid_w, grid_h), interpolation=cv2.INTER_NEAREST)
                mask_bool = mask_resized > 0
                
                # Apply overlay
                overlay = seg_vis.copy()
                overlay[mask_bool] = color
                cv2.addWeighted(overlay, 0.4, seg_vis, 0.6, 0, seg_vis)
                
                # Draw contour
                contours, _ = cv2.findContours(mask_resized, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                cv2.drawContours(seg_vis, contours, -1, color, 2)
        else:
            cv2.putText(seg_vis, "No segmentation", (50, 50),
                       cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 2)
        
        # Panel 3: Depth
        depth_vis = np.zeros((grid_h, grid_w, 3), dtype=np.uint8)
        if has_depth:
            depth_map = internal['depth_map']
            depth_norm = (depth_map - depth_map.min()) / (depth_map.max() - depth_map.min() + 1e-6)
            depth_colored = (plt_cm.plasma(depth_norm)[:, :, :3] * 255).astype(np.uint8)
            depth_vis = cv2.resize(depth_colored, (grid_w, grid_h))
        else:
            cv2.putText(depth_vis, "No Depth", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)

        # Panel 4: Info Panel
        info_vis = np.ones((grid_h, grid_w, 3), dtype=np.uint8) * 240 # Light gray
        
        # Draw text on info panel
        y_pos = 40
        line_height = 35
        font = cv2.FONT_HERSHEY_SIMPLEX
        
        # Classification
        cv2.putText(info_vis, "CLASSIFICATION", (20, y_pos), font, 0.8, (0, 0, 0), 2)
        y_pos += line_height
        cv2.putText(info_vis, f"{results['classification']['predicted_class']}", (20, y_pos), font, 1.0, (0, 100, 0), 2)
        y_pos += line_height
        cv2.putText(info_vis, f"Conf: {results['classification']['confidence']:.1%}", (20, y_pos), font, 0.6, (50, 50, 50), 1)
        y_pos += int(line_height * 1.5)
        
        # Portion
        cv2.putText(info_vis, "PORTION", (20, y_pos), font, 0.8, (0, 0, 0), 2)
        y_pos += line_height
        portion = results['portion']
        if portion['is_liquid']:
            cv2.putText(info_vis, f"Vol: {portion['volume_ml']:.0f} ml", (20, y_pos), font, 0.7, (0, 0, 0), 2)
        else:
            cv2.putText(info_vis, f"Mass: {portion['total_mass_g']:.0f} g", (20, y_pos), font, 0.7, (0, 0, 0), 2)
        y_pos += line_height
        cv2.putText(info_vis, f"Instances: {portion['num_instances']}", (20, y_pos), font, 0.6, (50, 50, 50), 1)
        y_pos += int(line_height * 1.5)
        
        # Calories
        cv2.putText(info_vis, "CALORIES", (20, y_pos), font, 0.8, (0, 0, 0), 2)
        y_pos += line_height
        calories = results['calories']
        cv2.putText(info_vis, f"{calories['kcal']:.0f} kcal", (20, y_pos), font, 1.2, (0, 0, 150), 3)
        y_pos += line_height
        cv2.putText(info_vis, f"Range: {calories['kcal_min']:.0f}-{calories['kcal_max']:.0f}", (20, y_pos), font, 0.6, (50, 50, 50), 1)
        
        # Combine panels
        top_row = np.hstack([img_resized, seg_vis])
        bottom_row = np.hstack([depth_vis, info_vis])
        canvas = np.vstack([top_row, bottom_row])
        
        # Add titles
        cv2.putText(canvas, "Original", (10, 30), font, 0.7, (255, 255, 255), 2)
        cv2.putText(canvas, "Segmentation", (grid_w + 10, 30), font, 0.7, (255, 255, 255), 2)
        cv2.putText(canvas, "Depth Map", (10, grid_h + 30), font, 0.7, (255, 255, 255), 2)
        
        return canvas


def print_results(results: Dict[str, Any]):
    """Print results in a formatted way."""
    print("\n" + "=" * 60)
    print("FOOD CALORIE ESTIMATION RESULTS")
    print("=" * 60)
    
    if not results.get('success'):
        print(f"\nERROR: {results.get('error', 'Unknown error')}")
        return
    
    # Classification
    cls = results['classification']
    print(f"\n📋 CLASSIFICATION")
    print(f"   Predicted: {cls['predicted_class']}")
    print(f"   Confidence: {cls['confidence']:.1%}")
    print(f"   Food Type: {results['food_type']}")
    
    if len(cls['top_k']) > 1:
        print(f"   Top predictions:")
        for i, pred in enumerate(cls['top_k'][:3], 1):
            print(f"      {i}. {pred['class']} ({pred['confidence']:.1%})")
    
    # Portion
    portion = results['portion']
    print(f"\n📦 PORTION ESTIMATE")
    
    if portion['is_liquid']:
        print(f"   Volume: {portion['volume_ml']:.0f} ml")
        print(f"   Mass: {portion['total_mass_g']:.0f} g")
    else:
        print(f"   Mass: {portion['total_mass_g']:.0f} g")
        print(f"   Volume: {portion['total_volume_cm3']:.1f} cm³")
    
    print(f"   Instances: {portion['num_instances']}")
    print(f"   Method: {portion['method']}")
    print(f"   Confidence: {portion['confidence']:.0%}")
    
    if portion['warnings']:
        print(f"   ⚠️  Warnings: {', '.join(portion['warnings'][:2])}")
    
    # Calories
    cal = results['calories']
    print(f"\n🔥 CALORIE ESTIMATE")
    print(f"   Calories: {cal['kcal']:.0f} kcal")
    print(f"   Range: {cal['kcal_min']:.0f} - {cal['kcal_max']:.0f} kcal")
    print(f"   kcal/g: {cal['kcal_per_gram']:.2f}")
    print(f"   Confidence: {cal['confidence']:.0%}")
    
    print("\n" + "=" * 60)
    print("⚠️  DISCLAIMER: All values are APPROXIMATE estimates.")
    print("   Do not use for medical or nutritional decisions.")
    print("=" * 60 + "\n")


def save_results(results: Dict[str, Any], 
                 output_dir: Path,
                 visualization: Optional[np.ndarray] = None):
    """Save results to output directory."""
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate filename from input
    input_path = Path(results['input_image'])
    base_name = input_path.stem
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Save JSON results (excluding internal data)
    results_to_save = {k: v for k, v in results.items() if not k.startswith('_')}
    json_path = output_dir / f"{base_name}_{timestamp}_results.json"
    
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(results_to_save, f, indent=2, default=str)
    
    print(f"Results saved to: {json_path}")
    
    # Save visualization
    if visualization is not None:
        vis_path = output_dir / f"{base_name}_{timestamp}_visualization.jpg"
        cv2.imwrite(str(vis_path), cv2.cvtColor(visualization, cv2.COLOR_RGB2BGR))
        print(f"Visualization saved to: {vis_path}")


def main():
    """Main entry point."""
    args = parse_args()
    
    # Setup logging
    logger = setup_logging(level=args.log_level)
    
    # Validate inputs
    image_path = Path(args.image)
    if not image_path.exists():
        logger.error(f"Image not found: {image_path}")
        print(f"\nERROR: Image file not found: {image_path}")
        sys.exit(1)
    
    classifier_path = Path(args.classifier)
    if not classifier_path.exists():
        logger.error(f"Classifier checkpoint not found: {classifier_path}")
        print(f"\nERROR: Classifier checkpoint not found: {classifier_path}")
        print("The classifier is REQUIRED. No demo mode available.")
        sys.exit(1)
    
    try:
        # Import matplotlib for visualization (optional)
        global plt_cm
        try:
            import matplotlib.cm as plt_cm
        except ImportError:
            plt_cm = None
        
        # Initialize pipeline
        pipeline = FoodCaloriePipeline(
            classifier_path=str(classifier_path),
            class_names_path=args.class_names,
            yolov8_seg_path=args.yolov8_seg,
            depth_model=args.depth_model,
            device=args.device,
            enable_segmentation=not args.no_segmentation
        )
        
        # Process image
        results = pipeline.process(str(image_path), top_k=args.top_k)
        
        # Print results
        print_results(results)
        
        # Visualize if requested
        visualization = None
        if args.visualize or args.save:
            try:
                visualization = pipeline.visualize(results)
                
                if args.visualize:
                    cv2.imshow("Food Calorie Estimation", cv2.cvtColor(visualization, cv2.COLOR_RGB2BGR))
                    print("Press any key to close visualization...")
                    cv2.waitKey(0)
                    cv2.destroyAllWindows()
            except Exception as e:
                logger.warning(f"Visualization failed: {e}")
        
        # Save if requested
        if args.save:
            output_dir = Path(args.output)
            save_results(results, output_dir, visualization)
        
        return 0
        
    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        print(f"\nERROR: {e}")
        sys.exit(1)


if __name__ == "__main__":
    sys.exit(main() or 0)
