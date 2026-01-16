"""
Food type analyzer module.
Determines food type (multi_instance, single_volume, flat, liquid) from config.
"""

import logging
from typing import Dict, Any, Optional

from ..utils.config import get_config

logger = logging.getLogger(__name__)


# Valid food types
VALID_FOOD_TYPES = {'multi_instance', 'single_volume', 'flat', 'liquid'}


class FoodTypeAnalyzer:
    """
    Analyzes and determines food type for portion estimation strategy.
    """
    
    def __init__(self):
        """Initialize the food type analyzer."""
        self.config = get_config()
    
    def get_food_type(self, food_class: str) -> str:
        """
        Get the food type for a given food class.
        
        Args:
            food_class: Predicted food class name
        
        Returns:
            Food type string: 'multi_instance', 'single_volume', 'flat', or 'liquid'
        """
        food_type = self.config.get_food_type(food_class, default='single_volume')
        
        # Validate
        if food_type not in VALID_FOOD_TYPES:
            logger.warning(f"Invalid food type '{food_type}' for {food_class}, using 'single_volume'")
            food_type = 'single_volume'
        
        return food_type
    
    def is_liquid(self, food_class: str) -> bool:
        """Check if a food class is a liquid."""
        return self.get_food_type(food_class) == 'liquid'
    
    def is_multi_instance(self, food_class: str) -> bool:
        """Check if a food class consists of multiple instances."""
        return self.get_food_type(food_class) == 'multi_instance'
    
    def is_flat(self, food_class: str) -> bool:
        """Check if a food class is flat (e.g., pizza, pancakes)."""
        return self.get_food_type(food_class) == 'flat'
    
    def get_estimation_strategy(self, food_class: str) -> Dict[str, Any]:
        """
        Get the estimation strategy for a food class.
        
        Returns a dict with strategy parameters:
        - type: food type
        - use_segmentation: whether to use instance segmentation
        - count_instances: whether to count individual pieces
        - use_depth: whether depth estimation helps
        - height_prior: expected height category
        """
        food_type = self.get_food_type(food_class)
        
        strategies = {
            'multi_instance': {
                'type': 'multi_instance',
                'use_segmentation': True,
                'count_instances': True,
                'use_depth': True,
                'height_prior': 'medium',
                'shape_factor': 0.65,  # Account for irregular shapes
                'description': 'Count instances, estimate per-piece volume, multiply'
            },
            'single_volume': {
                'type': 'single_volume',
                'use_segmentation': True,
                'count_instances': False,
                'use_depth': True,
                'height_prior': 'medium',
                'shape_factor': 0.6,
                'description': 'Estimate total volume from single mass'
            },
            'flat': {
                'type': 'flat',
                'use_segmentation': True,
                'count_instances': False,
                'use_depth': True,
                'height_prior': 'low',
                'shape_factor': 0.8,  # Flat foods are more cylinder-like
                'description': 'Estimate from area with low height'
            },
            'liquid': {
                'type': 'liquid',
                'use_segmentation': False,  # Container detection instead
                'count_instances': False,
                'use_depth': False,  # Container geometry instead
                'height_prior': 'container',
                'shape_factor': 1.0,  # Liquid fills container
                'description': 'Detect container, estimate fill level, compute volume'
            }
        }
        
        return strategies.get(food_type, strategies['single_volume'])
    
    def get_density(self, food_class: str) -> float:
        """Get density (g/cm3) for a food class."""
        return self.config.get_density(food_class)
    
    def get_kcal_per_gram(self, food_class: str) -> Optional[float]:
        """Get kcal per gram for a food class."""
        return self.config.get_kcal_per_gram(food_class)


def analyze_food_type(food_class: str) -> Dict[str, Any]:
    """
    Analyze food type and return estimation strategy.
    
    Args:
        food_class: Food class name
    
    Returns:
        Strategy dictionary
    """
    analyzer = FoodTypeAnalyzer()
    return analyzer.get_estimation_strategy(food_class)
