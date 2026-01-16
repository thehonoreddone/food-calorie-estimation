# Food Calorie Estimation System

A production-quality, modular food calorie estimation pipeline that takes a single RGB food image and outputs:
- Predicted food class
- Estimated portion size (grams for solids, milliliters for liquids)
- Estimated calories (kcal) with uncertainty range

**⚠️ DISCLAIMER: All outputs are APPROXIMATE estimates. Do not use for medical or nutritional decisions.**

## Features

- **No Demo Mode**: Classifier checkpoint must be provided - the system won't run with fake predictions
- **FoodSeg103 Segmentation**: 103 food-specific classes for accurate food-only segmentation (no background)
- **Multi-Instance Support**: Handles foods with multiple pieces (baklava, sushi, etc.) using instance segmentation
- **YOLOv8-seg Fallback**: Falls back to YOLOv8-seg when FoodSeg103 unavailable
- **Monocular Depth**: Optional depth estimation (MiDaS/ZoeDepth) for improved height estimation
- **Geometry-Based Estimation**: No hardcoded per-food gram values - uses vision + geometry + calibration
- **Uncertainty Propagation**: Reports confidence intervals for calorie estimates
- **Liquid Support**: Detects containers and estimates fill level for beverages

## Installation

```bash
pip install torch torchvision
pip install timm ultralytics opencv-python Pillow numpy matplotlib datasets
```

## FoodSeg103 Training (Recommended)

FoodSeg103 modeli, 103 yemek sınıfı için eğitilmiş özel bir segmentasyon modelidir.
Arka planı dahil etmeden sadece yemek alanlarını segmente eder.

```bash
# 1. Dataset hazırla (HuggingFace'den indirir)
cd food_calorie_estimation/seg_dataset
python prepare_dataset.py

# 2. Modeli eğit
python train_seg.py --epochs 50 --batch 8

# Eğitim tamamlandığında model otomatik olarak proje klasörüne kopyalanır:
#   foodseg103_seg.pt
```

Eğitim sonrası pipeline otomatik olarak FoodSeg103 modelini kullanır.

## Quick Start (Windows Command Prompt)

```cmd
REM Basic usage - classification + portion + calories
python demo\run_pipeline.py --image demo\food.jpg --classifier outputs\run_001\checkpoints\checkpoint_best.pth

REM With visualization
python demo\run_pipeline.py --image demo\food.jpg --classifier path\to\checkpoint.pth --visualize

REM Full options
python demo\run_pipeline.py --image demo\food.jpg --classifier path\to\checkpoint.pth --yolov8_seg path\to\yolov8n-seg.pt --depth_model midas_small --visualize --save --output results
```

## Quick Start (PowerShell / Linux / Mac)

```bash
# Basic usage
python demo/run_pipeline.py --image demo/food.jpg --classifier outputs/run_001/checkpoints/checkpoint_best.pth

# With visualization
python demo/run_pipeline.py --image demo/food.jpg --classifier path/to/checkpoint.pth --visualize

# Full options
python demo/run_pipeline.py \
    --image demo/food.jpg \
    --classifier path/to/checkpoint.pth \
    --yolov8_seg path/to/yolov8n-seg.pt \
    --depth_model midas_small \
    --visualize \
    --save \
    --output results
```

## Command Line Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--image`, `-i` | Yes | Path to input food image |
| `--classifier`, `-c` | Yes | Path to classifier checkpoint (.pth) |
| `--class_names` | No | Path to class_names.json (auto-detected if not provided) |
| `--yolov8_seg` | No | Path to YOLOv8-seg model (uses pretrained if not provided) |
| `--depth_model` | No | Depth model: `midas_small`, `midas_hybrid`, `zoedepth`, or `none` |
| `--visualize`, `-v` | No | Display visualization window |
| `--save`, `-s` | No | Save results to output directory |
| `--output`, `-o` | No | Output directory (default: `results`) |
| `--top_k` | No | Number of top predictions to show (default: 5) |
| `--device` | No | Device: `cuda` or `cpu` (auto-detect if not provided) |
| `--no_segmentation` | No | Disable segmentation (faster but less accurate) |

## Project Structure

```
food_calorie_estimation/
├── demo/
│   └── run_pipeline.py      # Main entry point
├── inference/
│   ├── classify_food.py     # Food classification
│   ├── segment_food.py      # Segmentation interface
│   ├── estimate_depth.py    # Depth estimation
│   ├── estimate_portion.py  # Portion estimation
│   └── estimate_calories.py # Calorie estimation
├── modules/
│   ├── segmentation_foodseg103.py  # FoodSeg103 segmentation (103 food classes)
│   ├── segmentation_yolov8.py      # YOLOv8 segmentation (fallback)
│   ├── container_detector.py       # Container detection for liquids
│   └── food_type_analyzer.py       # Food type classification
├── seg_dataset/
│   ├── prepare_dataset.py   # FoodSeg103 dataset preparation
│   └── train_seg.py         # FoodSeg103 model training
├── utils/
│   ├── config.py            # Configuration loader
│   ├── geometry.py          # Geometry utilities
│   ├── logging_utils.py     # Logging utilities
│   ├── densities.json       # Food densities (g/cm³)
│   ├── kcal_per_gram.json   # Calorie data (kcal/g)
│   └── food_types.json      # Food type mapping
└── requirements.txt
```

## Segmentation Models

### FoodSeg103 (Primary - Recommended)

FoodSeg103, 103 yemek sınıfı için eğitilmiş özel bir YOLOv8-seg modelidir:
- ✅ Sadece yemek alanlarını segmente eder (arka plan, tabak hariç)
- ✅ Her yemek için sınıf tahmini yapar
- ✅ Derinlik hesaplaması için temiz mask'lar sağlar
- ✅ Daha doğru porsiyon tahmini

### YOLOv8-seg (Fallback)

COCO pretrained genel nesne segmentasyonu:
- Yemek-özel eğitim yapılmamış
- Arka plan ve tabak dahil olabilir

### GrabCut (Emergency Fallback)

Model yoksa kullanılır:
- Düşük doğruluk
- Sadece ön plan/arka plan ayrımı

## Pipeline Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Load       │     │  Classify    │     │  Determine   │
│   Image      │────▶│   Food       │────▶│  Food Type   │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                     ┌───────────────────────────┼───────────────────────────┐
                     │                           │                           │
                     ▼                           ▼                           ▼
              ┌──────────────┐           ┌──────────────┐           ┌──────────────┐
              │ FoodSeg103   │           │   Liquid?    │           │ Single/Flat  │
              │ Segmentation │           │   Container  │           │ Volume       │
              │ (103 classes)│           │   Detection  │           │ Estimation   │
              └──────────────┘           └──────────────┘           └──────────────┘
                     │                           │                           │
                     └───────────────────────────┼───────────────────────────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │   Portion    │
                                          │  Estimation  │
                                          │  (geometry)  │
                                          └──────────────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │   Calorie    │
                                          │  Estimation  │
                                          │ (with range) │
                                          └──────────────┘
```

## Food Types

The system classifies foods into types to apply appropriate estimation strategies:

| Type | Description | Example Foods |
|------|-------------|---------------|
| `multi_instance` | Multiple similar pieces | Sushi, baklava, falafel, dumplings |
| `single_volume` | Single continuous mass | Steak, lasagna, cake slice |
| `flat` | Flat foods with low height | Pizza, pancakes, lahmacun |
| `liquid` | Beverages and soups | Tea, coffee, soup |

## Configuration

Configuration files in `utils/`:

- **densities.json**: Food densities (g/cm³) for volume-to-mass conversion
- **kcal_per_gram.json**: Calorie content per gram
- **food_types.json**: Mapping of food classes to food types

Add new foods by editing these JSON files.

## Classifier Requirements

Your classifier checkpoint should:
1. Be a PyTorch `.pth` file
2. Have a corresponding `class_names.json` in the same directory (or parent)
3. Be compatible with timm models (EfficientNet, ResNet, ViT, etc.)

Example `class_names.json`:
```json
["apple_pie", "baklava", "pizza", "sushi", ...]
```

## Output Format

```json
{
  "classification": {
    "predicted_class": "pizza",
    "confidence": 0.95,
    "top_k": [...]
  },
  "food_type": "flat",
  "portion": {
    "total_mass_g": 285.5,
    "total_volume_cm3": 475.8,
    "num_instances": 1,
    "confidence": 0.72
  },
  "calories": {
    "kcal": 771,
    "kcal_min": 617,
    "kcal_max": 925,
    "confidence": 0.68
  }
}
```

## Limitations

- Portion estimation accuracy depends on:
  - Plate/reference object visibility (for calibration)
  - Food visibility (occlusion affects results)
  - Camera angle (overhead is best)
  
- Calorie values are approximations based on:
  - Generic recipe data
  - Estimated portion sizes
  - Standard densities

- Not suitable for:
  - Medical dietary planning
  - Clinical nutrition assessment
  - Foods with highly variable compositions

## License

MIT License
