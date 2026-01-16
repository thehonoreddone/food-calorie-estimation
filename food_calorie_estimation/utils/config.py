"""
Configuration loader for food calorie estimation system.
Loads densities, kcal_per_gram, and food_types from JSON files.
"""

import json
import os
from pathlib import Path
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

# Default paths relative to this file
_UTILS_DIR = Path(__file__).parent
_DENSITIES_PATH = _UTILS_DIR / "densities.json"
_KCAL_PER_GRAM_PATH = _UTILS_DIR / "kcal_per_gram.json"
_FOOD_TYPES_PATH = _UTILS_DIR / "food_types.json"


class ConfigLoader:
    """Singleton config loader for food estimation system."""
    
    _instance = None
    _densities: Dict[str, float] = {}
    _kcal_per_gram: Dict[str, float] = {}
    _food_types: Dict[str, str] = {}
    _loaded: bool = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def load_all(self, 
                 densities_path: Optional[Path] = None,
                 kcal_path: Optional[Path] = None,
                 food_types_path: Optional[Path] = None) -> None:
        """Load all configuration files."""
        self._densities = self._load_json(densities_path or _DENSITIES_PATH, "densities")
        self._kcal_per_gram = self._load_json(kcal_path or _KCAL_PER_GRAM_PATH, "kcal_per_gram")
        self._food_types = self._load_json(food_types_path or _FOOD_TYPES_PATH, "food_types")
        self._loaded = True
        logger.info("All configuration files loaded successfully")
    
    def _load_json(self, path: Path, config_name: str) -> Dict[str, Any]:
        """Load a JSON config file with error handling."""
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # Remove comment fields
                return {k: v for k, v in data.items() if not k.startswith('_')}
        except FileNotFoundError:
            logger.warning(f"Config file not found: {path}. Using empty config for {config_name}.")
            return {}
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in {path}: {e}")
            return {}
    
    def _get_default(self, path: Path) -> Any:
        """Get default value from a config file."""
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get('_default')
        except:
            return None
    
    def get_density(self, food_class: str, default: float = 1.0) -> float:
        """Get density (g/cm3) for a food class."""
        if not self._loaded:
            self.load_all()
        
        # Normalize food class name
        food_class = food_class.lower().replace(' ', '_').replace('-', '_')
        
        if food_class in self._densities:
            return self._densities[food_class]
        
        # Try with default from config
        config_default = self._get_default(_DENSITIES_PATH)
        if config_default is not None:
            logger.debug(f"Using default density {config_default} for unknown class: {food_class}")
            return config_default
        
        logger.warning(f"No density found for {food_class}, using {default}")
        return default
    
    def get_kcal_per_gram(self, food_class: str, default: Optional[float] = None) -> Optional[float]:
        """Get kcal per gram for a food class. Returns None if not found and no default."""
        if not self._loaded:
            self.load_all()
        
        food_class = food_class.lower().replace(' ', '_').replace('-', '_')
        
        if food_class in self._kcal_per_gram:
            return self._kcal_per_gram[food_class]
        
        config_default = self._get_default(_KCAL_PER_GRAM_PATH)
        if config_default is not None:
            logger.debug(f"Using default kcal_per_gram {config_default} for unknown class: {food_class}")
            return config_default
        
        if default is not None:
            logger.warning(f"No kcal_per_gram found for {food_class}, using provided default: {default}")
            return default
        
        logger.warning(f"No kcal_per_gram found for {food_class}, returning None")
        return None
    
    def get_food_type(self, food_class: str, default: str = "single_volume") -> str:
        """Get food type for a food class. Valid types: multi_instance, single_volume, flat, liquid."""
        if not self._loaded:
            self.load_all()
        
        food_class = food_class.lower().replace(' ', '_').replace('-', '_')
        
        if food_class in self._food_types:
            return self._food_types[food_class]
        
        config_default = self._get_default(_FOOD_TYPES_PATH)
        if config_default is not None:
            logger.debug(f"Using default food_type '{config_default}' for unknown class: {food_class}")
            return config_default
        
        logger.debug(f"No food_type found for {food_class}, defaulting to '{default}'")
        return default
    
    @property
    def densities(self) -> Dict[str, float]:
        if not self._loaded:
            self.load_all()
        return self._densities.copy()
    
    @property
    def kcal_per_gram(self) -> Dict[str, float]:
        if not self._loaded:
            self.load_all()
        return self._kcal_per_gram.copy()
    
    @property
    def food_types(self) -> Dict[str, str]:
        if not self._loaded:
            self.load_all()
        return self._food_types.copy()


# Global instance
config = ConfigLoader()


def get_config() -> ConfigLoader:
    """Get the global config loader instance."""
    return config
