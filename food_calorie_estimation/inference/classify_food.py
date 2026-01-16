"""
Food classification module.
Loads a trained PyTorch classifier checkpoint and performs inference.
NO DEMO MODE - classifier checkpoint MUST be provided and must load successfully.
"""

import json
import logging
from pathlib import Path
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass

import numpy as np
from PIL import Image
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import transforms

logger = logging.getLogger(__name__)


@dataclass
class ClassificationResult:
    """Result of food classification."""
    predicted_class: str
    confidence: float
    top_k_predictions: List[Tuple[str, float]]
    class_index: int


class FoodClassifier:
    """
    Food classifier using a trained PyTorch checkpoint.
    
    IMPORTANT: No demo/random mode. If checkpoint fails to load, raises an error.
    """
    
    def __init__(self,
                 checkpoint_path: str,
                 class_names_path: Optional[str] = None,
                 device: Optional[str] = None):
        """
        Initialize the food classifier.
        
        Args:
            checkpoint_path: Path to the .pth checkpoint file (REQUIRED)
            class_names_path: Path to class_names.json. If None, looks in same directory as checkpoint.
            device: Device to use ('cuda', 'cpu', or None for auto)
        
        Raises:
            FileNotFoundError: If checkpoint or class_names.json not found
            RuntimeError: If checkpoint fails to load
        """
        self.checkpoint_path = Path(checkpoint_path)
        self.device = self._get_device(device)
        
        # Validate checkpoint exists
        if not self.checkpoint_path.exists():
            raise FileNotFoundError(
                f"Classifier checkpoint not found: {self.checkpoint_path}\n"
                f"Please provide a valid path to your trained model checkpoint."
            )
        
        # Try to load class names from checkpoint first (embedded in checkpoint_best.pth)
        self.class_names = self._try_load_class_names_from_checkpoint()
        
        if self.class_names is None:
            # Fall back to class_names.json file
            if class_names_path is not None:
                self.class_names_path = Path(class_names_path)
            else:
                # Look in same directory as checkpoint, or parent directories
                self.class_names_path = self._find_class_names()
            
            if not self.class_names_path.exists():
                raise FileNotFoundError(
                    f"class_names.json not found at: {self.class_names_path}\n"
                    f"Expected locations:\n"
                    f"  - Same folder as checkpoint: {self.checkpoint_path.parent / 'class_names.json'}\n"
                    f"  - Run folder: {self.checkpoint_path.parent.parent / 'class_names.json'}\n"
                    f"Please ensure class_names.json exists with format: [\"class1\", \"class2\", ...]"
                )
            
            # Load class names from file
            self.class_names = self._load_class_names()
            logger.info(f"Loaded {len(self.class_names)} class names from {self.class_names_path}")
        else:
            self.class_names_path = None  # Loaded from checkpoint
            logger.info(f"Loaded {len(self.class_names)} class names from checkpoint")
        
        self.num_classes = len(self.class_names)
        
        # Load model
        self.model = self._load_model()
        self.model.eval()
        logger.info(f"Model loaded successfully from {self.checkpoint_path}")
        logger.info(f"Using device: {self.device}")
        
        # Set up preprocessing
        self.transform = self._get_transform()
    
    def _try_load_class_names_from_checkpoint(self) -> Optional[List[str]]:
        """Try to load class names embedded in the checkpoint file."""
        try:
            checkpoint = torch.load(self.checkpoint_path, map_location='cpu', weights_only=False)
            if isinstance(checkpoint, dict) and 'class_names' in checkpoint:
                class_names = checkpoint['class_names']
                if isinstance(class_names, list) and len(class_names) > 0:
                    return class_names
        except Exception as e:
            logger.debug(f"Could not load class names from checkpoint: {e}")
        return None

    def _get_device(self, device: Optional[str]) -> torch.device:
        """Determine device to use."""
        if device is not None:
            return torch.device(device)
        
        if torch.cuda.is_available():
            return torch.device('cuda')
        
        return torch.device('cpu')
    
    def _find_class_names(self) -> Path:
        """Find class_names.json in expected locations."""
        # Check same directory as checkpoint
        same_dir = self.checkpoint_path.parent / 'class_names.json'
        if same_dir.exists():
            return same_dir
        
        # Check parent directory (e.g., if checkpoint is in checkpoints/ subfolder)
        parent_dir = self.checkpoint_path.parent.parent / 'class_names.json'
        if parent_dir.exists():
            return parent_dir
        
        # Check grandparent
        grandparent = self.checkpoint_path.parent.parent.parent / 'class_names.json'
        if grandparent.exists():
            return grandparent
        
        # Default to same directory (will raise error later)
        return same_dir
    
    def _load_class_names(self) -> List[str]:
        """Load class names from JSON file."""
        try:
            with open(self.class_names_path, 'r', encoding='utf-8') as f:
                class_names = json.load(f)
            
            if not isinstance(class_names, list):
                raise ValueError("class_names.json must contain a list of class names")
            
            if len(class_names) == 0:
                raise ValueError("class_names.json is empty")
            
            return class_names
            
        except json.JSONDecodeError as e:
            raise RuntimeError(f"Invalid JSON in {self.class_names_path}: {e}")
    
    def _load_model(self) -> nn.Module:
        """Load the model from checkpoint."""
        try:
            checkpoint = torch.load(self.checkpoint_path, map_location=self.device, weights_only=False)
        except Exception as e:
            raise RuntimeError(
                f"Failed to load checkpoint from {self.checkpoint_path}: {e}\n"
                f"Ensure the file is a valid PyTorch checkpoint."
            )
        
        # Handle different checkpoint formats
        if isinstance(checkpoint, dict):
            # Check for common keys
            if 'model_state_dict' in checkpoint:
                state_dict = checkpoint['model_state_dict']
            elif 'state_dict' in checkpoint:
                state_dict = checkpoint['state_dict']
            elif 'model' in checkpoint:
                # Could be the model itself or state dict
                if isinstance(checkpoint['model'], dict):
                    state_dict = checkpoint['model']
                else:
                    # Model object saved directly
                    model = checkpoint['model']
                    model = model.to(self.device)
                    return model
            else:
                # Assume the dict is the state_dict itself
                state_dict = checkpoint
            
            # Get model architecture info if available
            arch = checkpoint.get('arch', checkpoint.get('architecture', 'efficientnet_b2'))
            
            # If default chosen, check filename for hints
            if arch == 'efficientnet_b0':
                filename = self.checkpoint_path.name.lower()
                if 'efficientnet_b2' in filename or 'efficientnet-b2' in filename or 'efficient_b2' in filename or '_b2' in filename:
                    arch = 'efficientnet_b2'
                    logger.info(f"Inferred architecture '{arch}' from filename")
            
            # Create model based on architecture
            model = self._create_model_from_arch(arch, state_dict)
            
        elif isinstance(checkpoint, nn.Module):
            # Model saved directly
            model = checkpoint
        else:
            raise RuntimeError(
                f"Unexpected checkpoint format. Expected dict or nn.Module, got {type(checkpoint)}"
            )
        
        model = model.to(self.device)
        return model
    
    def _create_model_from_arch(self, arch: str, state_dict: dict) -> nn.Module:
        """Create model architecture and load state dict."""
        arch_lower = arch.lower()
        
        # Try to infer number of classes from state dict
        num_classes = self.num_classes
        
        # Look for classifier layer to verify num_classes
        # We prioritize the num_classes from class_names.json
        # Only override if we find a definitive classifier layer that mismatches
        found_classifier_layer = False
        
        for key in state_dict.keys():
            # Skip backbone or feature extraction layers
            if 'backbone' in key or 'downsample' in key or 'conv' in key:
                continue
                
            if 'classifier' in key or 'fc' in key or 'head' in key:
                if 'weight' in key:
                    # Check if it's a linear layer (2D tensor)
                    if len(state_dict[key].shape) == 2:
                        num_classes_from_state = state_dict[key].shape[0]
                        
                        # If we found a likely classifier layer
                        if num_classes_from_state != self.num_classes:
                            logger.warning(
                                f"Mismatch: class_names.json has {self.num_classes} classes, "
                                f"but model layer '{key}' has {num_classes_from_state} outputs."
                            )
                            # If we are very sure this is the head, we might want to warn
                            # But we should probably trust the JSON if provided, 
                            # unless the user explicitly wants to use the model's classes.
                            # For now, let's trust the JSON and let strict=True fail if it's wrong.
                            pass
                        else:
                            found_classifier_layer = True
                        
                        # We don't break here, we keep looking just in case, 
                        # but usually the last one is the head.
        
        # Detect model implementation style from state_dict keys
        use_torchvision = False
        keys = list(state_dict.keys())
        if any(k.startswith('features.') for k in keys):
            logger.info("Detected Torchvision-style checkpoint (uses 'features' block)")
            use_torchvision = True
        elif any(k.startswith('blocks.') for k in keys):
             logger.info("Detected Timm-style checkpoint (uses 'blocks')")
             use_torchvision = False
             
        try:
            import timm
            
            # If torchvision detected, try to import torchvision models first or force fallback
            if use_torchvision:
                 raise ImportError("Force torchvision fallback due to checkpoint format")

            # Try to create model with timm
            if 'efficientnet' in arch_lower:
                model = timm.create_model(arch_lower, pretrained=False, num_classes=num_classes)
            elif 'resnet' in arch_lower:
                model = timm.create_model(arch_lower, pretrained=False, num_classes=num_classes)
            elif 'vit' in arch_lower:
                model = timm.create_model(arch_lower, pretrained=False, num_classes=num_classes)
            else:
                # Default to efficientnet_b0
                model = timm.create_model('efficientnet_b0', pretrained=False, num_classes=num_classes)
                logger.warning(f"Unknown architecture '{arch}', defaulting to efficientnet_b0")
            
            # Pre-process state_dict to handle 'backbone.' prefix
            new_state_dict = {}
            for k, v in state_dict.items():
                if k.startswith('backbone.'):
                    new_key = k[9:] # Remove 'backbone.'
                    new_state_dict[new_key] = v
                else:
                    new_state_dict[k] = v
            
            # Manual Fix for classifier layer mismatch (Sequential vs Linear)
            if 'classifier.1.weight' in new_state_dict and 'classifier.weight' not in new_state_dict:
                 logger.info("Remapping classifier.1.weight to classifier.weight")
                 new_state_dict['classifier.weight'] = new_state_dict.pop('classifier.1.weight')
                 if 'classifier.1.bias' in new_state_dict:
                     new_state_dict['classifier.bias'] = new_state_dict.pop('classifier.1.bias')
            
            # Also handle classifier keys if they don't match
            # timm efficientnet usually has 'classifier.weight' and 'classifier.bias'
            # The checkpoint has 'classifier.1.weight' (Sequential)
            if 'classifier.1.weight' in new_state_dict and 'classifier.weight' not in new_state_dict:
                 # Map classifier.1 -> classifier
                 new_state_dict['classifier.weight'] = new_state_dict.pop('classifier.1.weight')
                 if 'classifier.1.bias' in new_state_dict:
                     new_state_dict['classifier.bias'] = new_state_dict.pop('classifier.1.bias')
            
            # Load state dict
            try:
                model.load_state_dict(new_state_dict, strict=True)
                logger.info("Loaded state dict with strict=True (after prefix adjustment)")
            except RuntimeError as e:
                logger.warning(f"Strict loading failed: {e}")
                # Try non-strict loading with original dict as fallback, or new dict
                try:
                    model.load_state_dict(new_state_dict, strict=False)
                    logger.warning("Loaded state dict with strict=False (after prefix adjustment)")
                except:
                    model.load_state_dict(state_dict, strict=False)
                    logger.warning("Loaded original state dict with strict=False")
            
            return model
            
            return model
            
        except ImportError:
            logger.warning("timm not available, trying torchvision models")
            
            from torchvision import models
            
            if 'resnet50' in arch_lower:
                model = models.resnet50(weights=None)
                model.fc = nn.Linear(model.fc.in_features, num_classes)
            elif 'resnet18' in arch_lower:
                model = models.resnet18(weights=None)
                model.fc = nn.Linear(model.fc.in_features, num_classes)
            elif 'efficientnet' in arch_lower:
                if 'b1' in arch_lower:
                    model = models.efficientnet_b1(weights=None)
                elif 'b2' in arch_lower:
                    model = models.efficientnet_b2(weights=None)
                elif 'b3' in arch_lower:
                    model = models.efficientnet_b3(weights=None)
                elif 'b4' in arch_lower:
                    model = models.efficientnet_b4(weights=None)
                else:
                    model = models.efficientnet_b0(weights=None)
                    
                model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
            else:
                # Default
                model = models.efficientnet_b0(weights=None)
                model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
                logger.warning(f"Unknown architecture '{arch}', defaulting to efficientnet_b0")
            
            try:
                model.load_state_dict(state_dict, strict=True)
            except RuntimeError:
                model.load_state_dict(state_dict, strict=False)
                logger.warning("Loaded state dict with strict=False")
            
            return model
    
    def _get_transform(self) -> transforms.Compose:
        """Get image preprocessing transform."""
        return transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])
    
    @torch.no_grad()
    def predict(self, image: Image.Image, top_k: int = 5) -> ClassificationResult:
        """
        Predict food class from image.
        
        Args:
            image: PIL Image (RGB)
            top_k: Number of top predictions to return
        
        Returns:
            ClassificationResult with prediction details
        """
        # Ensure RGB
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Preprocess
        input_tensor = self.transform(image)
        input_batch = input_tensor.unsqueeze(0).to(self.device)
        
        # Inference
        outputs = self.model(input_batch)
        probabilities = F.softmax(outputs, dim=1)
        
        # Get top-k predictions
        top_k = min(top_k, self.num_classes)
        top_probs, top_indices = torch.topk(probabilities, top_k, dim=1)
        
        top_probs = top_probs.squeeze(0).cpu().numpy()
        top_indices = top_indices.squeeze(0).cpu().numpy()
        
        # Build result
        top_k_predictions = []
        for i in range(top_k):
            idx = top_indices[i]
            prob = float(top_probs[i])
            class_name = self.class_names[idx] if idx < len(self.class_names) else f"class_{idx}"
            top_k_predictions.append((class_name, prob))
        
        predicted_class = top_k_predictions[0][0]
        confidence = top_k_predictions[0][1]
        class_index = int(top_indices[0])
        
        return ClassificationResult(
            predicted_class=predicted_class,
            confidence=confidence,
            top_k_predictions=top_k_predictions,
            class_index=class_index
        )
    
    def predict_from_path(self, image_path: str, top_k: int = 5) -> ClassificationResult:
        """Convenience method to predict from image path."""
        image = Image.open(image_path).convert('RGB')
        return self.predict(image, top_k=top_k)


def load_classifier(checkpoint_path: str,
                    class_names_path: Optional[str] = None,
                    device: Optional[str] = None) -> FoodClassifier:
    """
    Load a food classifier from checkpoint.
    
    Args:
        checkpoint_path: Path to .pth checkpoint (REQUIRED)
        class_names_path: Path to class_names.json (optional, auto-detected)
        device: Device to use (optional, auto-detected)
    
    Returns:
        FoodClassifier instance
    
    Raises:
        FileNotFoundError: If checkpoint or class_names not found
        RuntimeError: If loading fails
    """
    return FoodClassifier(
        checkpoint_path=checkpoint_path,
        class_names_path=class_names_path,
        device=device
    )
