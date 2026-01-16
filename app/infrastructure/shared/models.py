"""
Shared types and models for Food Calorie Estimation System.
Used by both frontend (via TypeScript conversion) and backend.
"""
from dataclasses import dataclass, field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class FoodType(str, Enum):
    """Food type enumeration for estimation strategy"""
    SOLID = "solid"
    LIQUID = "liquid"
    FLAT = "flat"
    MULTI_INSTANCE = "multi_instance"
    SINGLE_VOLUME = "single_volume"


@dataclass
class FoodItem:
    """Food item data model"""
    id: str
    class_name: str
    calories_per_100g: float
    default_portion_grams: float = 100.0
    image_url: Optional[str] = None
    food_type: FoodType = FoodType.SOLID
    density: float = 0.85
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class PredictionResult:
    """Prediction result data model"""
    class_name: str
    confidence: float
    estimated_weight_grams: float
    estimated_calories: float
    mask_base64: Optional[str] = None
    processing_time_ms: float = 0.0


@dataclass
class SegmentInfo:
    """Segmentation segment information"""
    class_id: int
    class_name: str
    confidence: float
    bbox: List[float]  # [x1, y1, x2, y2]
    area_pixels: int = 0
    estimated_area_cm2: float = 0.0


@dataclass
class CalibrationInfo:
    """Image calibration information"""
    pixels_per_cm: float = 10.0
    reference_object: Optional[str] = None
    reference_diameter_cm: float = 25.0
    calibration_confidence: float = 0.8


# TypeScript type definitions (for frontend reference)
TYPESCRIPT_TYPES = """
// Auto-generated from Python models

export interface FoodItem {
  id: string;
  class_name: string;
  calories_per_100g: number;
  default_portion_grams: number;
  image_url?: string;
  food_type: 'solid' | 'liquid' | 'flat' | 'multi_instance' | 'single_volume';
  density: number;
  created_at?: string;
  updated_at?: string;
}

export interface PredictionResult {
  class_name: string;
  confidence: number;
  estimated_weight_grams: number;
  estimated_calories: number;
  mask_base64?: string;
  processing_time_ms: number;
}

export interface SegmentInfo {
  class_id: number;
  class_name: string;
  confidence: number;
  bbox: number[];
  area_pixels: number;
  estimated_area_cm2: number;
}

export interface CalibrationInfo {
  pixels_per_cm: number;
  reference_object?: string;
  reference_diameter_cm: number;
  calibration_confidence: number;
}

export type FoodType = 'solid' | 'liquid' | 'flat' | 'multi_instance' | 'single_volume';
"""


def generate_typescript_types(output_path: str = "types.ts") -> None:
    """Generate TypeScript type definitions"""
    with open(output_path, "w") as f:
        f.write(TYPESCRIPT_TYPES)
    print(f"TypeScript types written to {output_path}")


if __name__ == "__main__":
    generate_typescript_types()
