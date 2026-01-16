"""Domain entities - Clean Architecture core"""
from dataclasses import dataclass, field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class FoodType(str, Enum):
    """Food type enumeration"""
    SOLID = "solid"
    LIQUID = "liquid"
    FLAT = "flat"
    MULTI_INSTANCE = "multi_instance"
    SINGLE_VOLUME = "single_volume"


@dataclass
class FoodEntity:
    """Core Food domain entity"""
    id: str
    class_name: str
    calories_per_100g: float
    default_portion_grams: float = 100.0
    image_url: Optional[str] = None
    food_type: FoodType = FoodType.SOLID
    density_g_per_cm3: float = 0.85
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    def calculate_calories(self, grams: float) -> float:
        """Calculate calories for given weight"""
        return (self.calories_per_100g * grams) / 100.0


@dataclass
class SegmentEntity:
    """Segmentation result entity"""
    class_id: int
    class_name: str
    confidence: float
    bbox: List[float]  # [x1, y1, x2, y2]
    mask: Optional[bytes] = None
    area_pixels: int = 0
    estimated_area_cm2: float = 0.0


@dataclass
class PredictionEntity:
    """Prediction result entity"""
    primary_class: str
    confidence: float
    segments: List[SegmentEntity] = field(default_factory=list)
    estimated_weight_grams: float = 0.0
    estimated_calories: float = 0.0
    processing_time_ms: float = 0.0
    timestamp: datetime = field(default_factory=datetime.now)
    
    @property
    def is_successful(self) -> bool:
        """Check if prediction was successful"""
        return self.confidence > 0 and self.primary_class != "unknown"


@dataclass
class CalibrationEntity:
    """Image calibration entity for portion estimation"""
    pixels_per_cm: float = 10.0
    reference_object: Optional[str] = None
    reference_diameter_cm: float = 25.0  # Standard plate
    calibration_confidence: float = 0.8
    
    def pixels_to_cm2(self, pixel_area: int) -> float:
        """Convert pixel area to cm²"""
        return pixel_area / (self.pixels_per_cm ** 2)


@dataclass  
class VolumeEstimate:
    """Volume estimation entity"""
    volume_cm3: float
    height_cm: float
    area_cm2: float
    shape_factor: float = 0.7
    confidence: float = 0.8
    
    def to_mass(self, density_g_per_cm3: float) -> float:
        """Convert volume to mass using density"""
        return self.volume_cm3 * density_g_per_cm3
