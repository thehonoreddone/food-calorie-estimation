"""
Calorie estimation module.
Estimates calories (kcal) from portion with uncertainty propagation.
"""

import logging
from typing import Optional, Tuple, List
from dataclasses import dataclass, field

import numpy as np

from ..utils.config import get_config
from .estimate_portion import PortionEstimationResult

logger = logging.getLogger(__name__)


@dataclass
class CalorieEstimationResult:
    """Result of calorie estimation with uncertainty."""
    kcal: float  # Point estimate
    kcal_min: float  # Lower bound (uncertainty)
    kcal_max: float  # Upper bound (uncertainty)
    kcal_per_gram: float
    mass_g: float
    confidence: float
    uncertainty_sources: dict
    warnings: List[str] = field(default_factory=list)


class CalorieEstimator:
    """
    Calorie estimator with uncertainty propagation.
    
    Uncertainty sources:
    - Segmentation uncertainty
    - Depth estimation uncertainty
    - Calibration uncertainty
    - Density uncertainty
    - kcal_per_gram uncertainty
    """
    
    # Uncertainty factors (relative standard deviation)
    UNCERTAINTY_FACTORS = {
        'segmentation': 0.10,  # ±10% from segmentation
        'depth': 0.15,         # ±15% from depth estimation
        'calibration': 0.12,   # ±12% from calibration
        'density': 0.08,       # ±8% from density variability
        'kcal_per_gram': 0.10, # ±10% from calorie data
    }
    
    def __init__(self):
        """Initialize calorie estimator."""
        self.config = get_config()
    
    def estimate(self,
                 food_class: str,
                 portion_result: PortionEstimationResult) -> CalorieEstimationResult:
        """
        Estimate calories from portion result.
        
        Args:
            food_class: Food class name
            portion_result: Portion estimation result
        
        Returns:
            CalorieEstimationResult with uncertainty
        """
        warnings = []
        
        # Get kcal per gram
        kcal_per_gram = self.config.get_kcal_per_gram(food_class)
        
        if kcal_per_gram is None:
            warnings.append(f"No kcal_per_gram data for '{food_class}', using default 1.5 kcal/g")
            kcal_per_gram = 1.5
        
        mass_g = portion_result.total_mass_g
        
        # Point estimate
        kcal = mass_g * kcal_per_gram
        
        # Propagate uncertainties
        uncertainty_sources = self._compute_uncertainties(portion_result)
        
        # Combined relative uncertainty (root sum of squares)
        total_relative_uncertainty = np.sqrt(sum(
            u ** 2 for u in uncertainty_sources.values()
        ))
        
        # Compute bounds (±1.5 sigma for ~87% coverage)
        sigma_factor = 1.5
        kcal_uncertainty = kcal * total_relative_uncertainty * sigma_factor
        
        kcal_min = max(0, kcal - kcal_uncertainty)
        kcal_max = kcal + kcal_uncertainty
        
        # Confidence based on portion confidence and data availability
        confidence = portion_result.confidence_level
        if warnings:
            confidence *= 0.85
        
        logger.info(f"Calorie estimate: {kcal:.0f} kcal (range: {kcal_min:.0f}-{kcal_max:.0f})")
        
        return CalorieEstimationResult(
            kcal=kcal,
            kcal_min=kcal_min,
            kcal_max=kcal_max,
            kcal_per_gram=kcal_per_gram,
            mass_g=mass_g,
            confidence=confidence,
            uncertainty_sources=uncertainty_sources,
            warnings=warnings
        )
    
    def _compute_uncertainties(self, 
                                portion_result: PortionEstimationResult) -> dict:
        """Compute individual uncertainty contributions."""
        uncertainties = {}
        
        # Base uncertainties
        uncertainties['segmentation'] = self.UNCERTAINTY_FACTORS['segmentation']
        uncertainties['density'] = self.UNCERTAINTY_FACTORS['density']
        uncertainties['kcal_data'] = self.UNCERTAINTY_FACTORS['kcal_per_gram']
        
        # Calibration uncertainty (higher if default was used)
        cal_conf = portion_result.calibration.confidence
        base_cal_uncertainty = self.UNCERTAINTY_FACTORS['calibration']
        uncertainties['calibration'] = base_cal_uncertainty * (2.0 - cal_conf)
        
        # Depth uncertainty (if depth was used)
        if 'depth' in portion_result.method_used or portion_result.per_instance:
            # Check if depth was actually used
            if any(inst.method for inst in portion_result.per_instance if 'depth' not in inst.method):
                uncertainties['depth'] = self.UNCERTAINTY_FACTORS['depth'] * 1.5
            else:
                uncertainties['depth'] = self.UNCERTAINTY_FACTORS['depth']
        
        # Instance counting uncertainty (for multi-instance)
        if portion_result.num_instances > 1:
            if portion_result.is_repeatable:
                uncertainties['counting'] = 0.05  # Low if repeatable
            else:
                uncertainties['counting'] = 0.12 + (portion_result.coefficient_of_variation * 0.5)
        
        # Liquid uncertainty
        if portion_result.is_liquid:
            uncertainties['fill_level'] = 0.15
            # Remove depth uncertainty for liquids
            uncertainties.pop('depth', None)
        
        return uncertainties
    
    def estimate_from_mass(self,
                           food_class: str,
                           mass_g: float,
                           confidence: float = 0.5) -> CalorieEstimationResult:
        """
        Estimate calories from known mass.
        
        Args:
            food_class: Food class name
            mass_g: Mass in grams
            confidence: Confidence level
        
        Returns:
            CalorieEstimationResult
        """
        warnings = []
        
        kcal_per_gram = self.config.get_kcal_per_gram(food_class)
        
        if kcal_per_gram is None:
            warnings.append(f"No kcal_per_gram data for '{food_class}'")
            kcal_per_gram = 1.5
        
        kcal = mass_g * kcal_per_gram
        
        # Simple uncertainty for direct mass input
        uncertainty = 0.15  # ±15%
        kcal_min = max(0, kcal * (1 - uncertainty))
        kcal_max = kcal * (1 + uncertainty)
        
        return CalorieEstimationResult(
            kcal=kcal,
            kcal_min=kcal_min,
            kcal_max=kcal_max,
            kcal_per_gram=kcal_per_gram,
            mass_g=mass_g,
            confidence=confidence,
            uncertainty_sources={'kcal_data': 0.10, 'mass_estimate': 0.10},
            warnings=warnings
        )


def estimate_calories(food_class: str,
                      portion_result: PortionEstimationResult) -> CalorieEstimationResult:
    """
    Convenience function to estimate calories.
    
    Args:
        food_class: Food class name
        portion_result: Portion estimation result
    
    Returns:
        CalorieEstimationResult
    """
    estimator = CalorieEstimator()
    return estimator.estimate(food_class, portion_result)
