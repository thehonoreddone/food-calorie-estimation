"""Calorie estimation service"""
import json
from pathlib import Path
from typing import Dict, Any, Optional
from loguru import logger


from app.services.firebase_config_service import firebase_config_service

# FoodSeg103 calorie data (kcal per 100g)
FOODSEG103_KCAL = {
    "Candy": 380, "Egg_tart": 280, "French_fries": 312, "Chocolate": 546, "Biscuit": 460,
    "Popcorn": 387, "Pudding": 130, "Ice_cream": 207, "Bread": 265, "Cake": 347,
    "Mooncake": 420, "Pancake": 227, "Pastry": 380, "Peach": 39, "Pear": 57,
    "Strawberry": 32, "Apple": 52, "Grape": 69, "Orange": 47, "Kiwi": 61,
    "Watermelon": 30, "Banana": 89, "Cherry": 50, "Blueberry": 57, "Raspberry": 52,
    "Mango": 60, "Pineapple": 50, "Dragon_fruit": 60, "Durian": 147, "Okra": 33,
    "Bean": 31, "Pea": 81, "Lentil": 116, "Peanut": 567, "Cashew": 553,
    "Walnut": 654, "Almond": 579, "Hazelnut": 628, "Pistachio": 560, "Sesame": 573,
    "Walnut_kernel": 654, "Sunflower_seed": 584, "Pumpkin_seed": 559, "Chestnut": 213,
    "Water_chestnut": 97, "Lotus_seed": 89, "Ginkgo": 182, "Pine_nut": 673,
    "Macadamia": 718, "Pecan": 691, "Grains": 340, "Wheat": 339, "Rice": 130,
    "Beef": 250, "Pork": 242, "Chicken": 239, "Ham": 145, "Duck": 337,
    "Fish": 206, "Shrimp": 99, "Seafood": 120, "Dried_meat": 280, "Vegetable": 25,
    "Lettuce": 14, "Spinach": 23, "Broccoli": 34, "Cabbage": 25, "Cauliflower": 25,
    "Celery": 16, "Eggplant": 25, "Bell_pepper": 31, "Chili_pepper": 40, "Cucumber": 15,
    "Pumpkin": 26, "Tomato": 18, "Carrot": 41, "Radish": 16, "Asparagus": 20,
    "Bamboo_shoots": 27, "Corn": 96, "Mushroom": 22, "Onion": 40, "Garlic": 149,
    "Ginger": 80, "Scallion": 32, "Tofu": 144, "Egg": 155, "Milk": 42,
    "Yogurt": 59, "Cheese": 402, "Butter": 717, "Cream": 340, "Honey": 304,
    "Jam": 278, "Sauce": 50, "Pasta": 131, "Noodles": 138, "Pizza": 266,
    "Hamburger": 295, "Sandwich": 250, "Hot_dog": 290, "Taco": 226, "Sushi": 143
}

FOODSEG103_DENSITIES = {
    "Candy": 1.2, "Egg_tart": 0.7, "French_fries": 0.5, "Chocolate": 1.3, "Biscuit": 0.45,
    "Popcorn": 0.08, "Pudding": 1.0, "Ice_cream": 0.55, "Bread": 0.35, "Cake": 0.55,
    "Mooncake": 0.9, "Pancake": 0.5, "Pastry": 0.5, "Peach": 0.9, "Pear": 0.85,
    "Strawberry": 0.8, "Apple": 0.85, "Grape": 1.05, "Orange": 0.9, "Kiwi": 1.0,
    "Watermelon": 0.95, "Banana": 0.95, "Cherry": 1.0, "Blueberry": 0.9, "Raspberry": 0.5,
    "Mango": 0.9, "Pineapple": 0.95, "Dragon_fruit": 0.9, "Durian": 0.75, "Okra": 0.7,
    "Bean": 0.75, "Pea": 0.8, "Lentil": 0.85, "Peanut": 0.65, "Cashew": 0.65,
    "Walnut": 0.55, "Almond": 0.6, "Hazelnut": 0.6, "Pistachio": 0.55, "Sesame": 0.7,
    "Walnut_kernel": 0.55, "Sunflower_seed": 0.5, "Pumpkin_seed": 0.55, "Chestnut": 0.8,
    "Water_chestnut": 0.95, "Lotus_seed": 0.9, "Ginkgo": 0.85, "Pine_nut": 0.65,
    "Macadamia": 0.7, "Pecan": 0.55, "Grains": 0.75, "Wheat": 0.8, "Rice": 0.85,
    "Beef": 1.05, "Pork": 1.0, "Chicken": 0.95, "Ham": 1.0, "Duck": 0.95,
    "Fish": 1.0, "Shrimp": 0.9, "Seafood": 0.95, "Dried_meat": 0.85, "Vegetable": 0.6,
    "Lettuce": 0.25, "Spinach": 0.35, "Broccoli": 0.45, "Cabbage": 0.4, "Cauliflower": 0.4,
    "Celery": 0.5, "Eggplant": 0.55, "Bell_pepper": 0.45, "Chili_pepper": 0.5, "Cucumber": 0.95,
    "Pumpkin": 0.65, "Tomato": 0.95, "Carrot": 0.9, "Radish": 0.85, "Asparagus": 0.7,
    "Bamboo_shoots": 0.8, "Corn": 0.75, "Mushroom": 0.4, "Onion": 0.9, "Garlic": 0.95,
    "Ginger": 0.85, "Scallion": 0.5, "Tofu": 0.95, "Egg": 1.0, "Milk": 1.03,
    "Yogurt": 1.05, "Cheese": 1.1, "Butter": 0.9, "Cream": 0.95, "Honey": 1.4,
    "Jam": 1.35, "Sauce": 1.05, "Pasta": 0.85, "Noodles": 0.75, "Pizza": 0.6,
    "Hamburger": 0.7, "Sandwich": 0.55, "Hot_dog": 0.8, "Taco": 0.6, "Sushi": 0.9
}


class CalorieService:
    """Service for food calorie lookups and estimation"""
    
    def __init__(self):
        self.food_data: Dict[str, Dict[str, Any]] = {}
        self.densities: Dict[str, float] = {}
        self.kcal_per_100g: Dict[str, float] = {}
        self.typical_portions: Dict[str, Any] = {}
        # Load defaults immediately
        self.densities = FOODSEG103_DENSITIES.copy()
        self.kcal_per_100g = FOODSEG103_KCAL.copy()
    
    async def initialize(self) -> None:
        """Initialize service by loading data from Firebase/Config"""
        await self._load_data()
        self._load_typical_portions()

    async def _load_data(self) -> None:
        """Load food data from Firebase, JSON files or use FoodSeg103 defaults"""
        # Defaults are already loaded in __init__
        
        # Try to load densities from Firebase
        try:
            firebase_densities = await firebase_config_service.get_densities()
            if firebase_densities:
                # Remove comment keys
                firebase_densities = {k: v for k, v in firebase_densities.items() if not k.startswith("_")}
                self.densities.update(firebase_densities)
                logger.info(f"Extended densities with {len(firebase_densities)} entries from Firebase")
        except Exception as e:
            logger.warning(f"Failed to load densities from Firebase: {e}")

        # Try to load from config files to override/extend
        config_paths = [
            Path("config/densities.json"),
            Path("../infrastructure/shared/densities.json"),
            Path("../../food_calorie_estimation/utils/densities.json"),
        ]
        
        for path in config_paths:
            if path.exists():
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        loaded_densities = json.load(f)
                    # Remove comment keys
                    loaded_densities = {k: v for k, v in loaded_densities.items() if not k.startswith("_")}
                    self.densities.update(loaded_densities)
                    logger.info(f"Extended densities with {len(loaded_densities)} entries from {path}")
                    break
                except Exception as e:
                    logger.warning(f"Failed to load {path}: {e}")
        
        # Try to load kcal from Firebase
        try:
            firebase_kcal = await firebase_config_service.get_kcal_per_gram()
            if firebase_kcal:
                self.kcal_per_100g.update(firebase_kcal)
                logger.info(f"Extended kcal data with {len(firebase_kcal)} entries from Firebase")
        except Exception as e:
            logger.warning(f"Failed to load kcal data from Firebase: {e}")

        # Load kcal data from config
        kcal_paths = [
            Path("config/kcal_per_gram.json"),
            Path("../infrastructure/shared/kcal_per_gram.json"),
            Path("../../food_calorie_estimation/utils/kcal_per_gram.json"),
        ]

        
        for path in kcal_paths:
            if path.exists():
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        loaded_kcal = json.load(f)
                    # Remove comment keys
                    loaded_kcal = {k: v for k, v in loaded_kcal.items() if not k.startswith("_")}
                    self.kcal_per_100g.update(loaded_kcal)
                    logger.info(f"Extended kcal data with {len(loaded_kcal)} entries from {path}")
                    break
                except Exception as e:
                    logger.warning(f"Failed to load {path}: {e}")
        
        # Build combined food data
        self._build_food_data()
    
    def _load_typical_portions(self) -> None:
        """Load typical portion weights from config"""
        portions_paths = [
            Path("config/typical_portions.json"),
            Path("../infrastructure/shared/typical_portions.json"),
            Path("../../food_calorie_estimation/utils/typical_portions.json"),
        ]
        
        for path in portions_paths:
            if path.exists():
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        loaded_portions = json.load(f)
                    # Remove comment keys
                    loaded_portions = {k: v for k, v in loaded_portions.items() if not k.startswith('_')}
                    self.typical_portions.update(loaded_portions)
                    logger.info(f"Loaded {len(loaded_portions)} typical portions from {path}")
                    break
                except Exception as e:
                    logger.warning(f"Failed to load {path}: {e}")
    
    def _build_food_data(self) -> None:
        """Build combined food data dictionary"""
        # Combine all food classes
        all_classes = set(self.densities.keys()) | set(self.kcal_per_100g.keys())
        
        for class_name in all_classes:
            # Skip food_X placeholder entries
            if class_name.startswith("food_"):
                continue
                
            self.food_data[class_name] = {
                "class_name": class_name,
                "density": self.densities.get(class_name, 0.85),
                "kcal_per_100g": self.kcal_per_100g.get(class_name, 150),
            }
        
        logger.info(f"Built food database with {len(self.food_data)} entries")
    
    def get_food_info(self, class_name: str) -> Dict[str, Any]:
        """Get food information by class name"""
        # Try exact match
        if class_name in self.food_data:
            return self.food_data[class_name]
        
        # Try lowercase match
        lower_name = class_name.lower()
        for key, value in self.food_data.items():
            if key.lower() == lower_name:
                return value
        
        # Try partial match
        for key, value in self.food_data.items():
            if lower_name in key.lower() or key.lower() in lower_name:
                return value
        
        # Return defaults
        return {
            "class_name": class_name,
            "density": 0.85,
            "kcal_per_100g": 150,
        }
    
    def calculate_calories(
        self,
        class_name: str,
        weight_grams: float,
    ) -> float:
        """Calculate calories for given food and weight"""
        info = self.get_food_info(class_name)
        kcal_per_100g = info.get("kcal_per_100g", 150)
        return (kcal_per_100g * weight_grams) / 100.0
    
    def get_density(self, class_name: str) -> float:
        """Get food density in g/cm³"""
        info = self.get_food_info(class_name)
        return info.get("density", 0.85)
    
    def get_typical_portion(self, class_name: str) -> Dict[str, Any]:
        """Get typical portion info for a food class"""
        class_name_lower = class_name.lower().replace(' ', '_').replace('-', '_')
        
        if class_name_lower in self.typical_portions:
            return self.typical_portions[class_name_lower]
        
        # Try partial match
        for key in self.typical_portions:
            if key in class_name_lower or class_name_lower in key:
                return self.typical_portions[key]
        
        # Default portion
        return {"typical": 150, "min": 75, "max": 300}
    
    def validate_weight(self, class_name: str, weight_grams: float) -> float:
        """Validate and adjust weight based on typical portions"""
        portion_info = self.get_typical_portion(class_name)
        
        if isinstance(portion_info, dict):
            typical = portion_info.get("typical", 150)
            min_w = portion_info.get("min", typical * 0.5)
            max_w = portion_info.get("max", typical * 1.5)
        else:
            typical = portion_info
            min_w = typical * 0.5
            max_w = typical * 1.5
        
        # If weight is outside reasonable range, use typical
        if weight_grams < min_w * 0.5 or weight_grams > max_w * 2:
            logger.warning(
                f"Weight {weight_grams:.1f}g outside typical range "
                f"[{min_w:.1f}, {max_w:.1f}]g for {class_name}. "
                f"Using typical: {typical:.1f}g"
            )
            return typical
        
        # Clip to reasonable range
        return max(min_w, min(weight_grams, max_w))
    
    def add_food(
        self,
        class_name: str,
        kcal_per_100g: float,
        density: float = 0.85,
    ) -> None:
        """Add or update food in database"""
        self.food_data[class_name] = {
            "class_name": class_name,
            "density": density,
            "kcal_per_100g": kcal_per_100g,
        }
        self.densities[class_name] = density
        self.kcal_per_gram[class_name] = kcal_per_100g / 100.0


# Global calorie service instance
calorie_service = CalorieService()
