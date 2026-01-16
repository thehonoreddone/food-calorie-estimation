"""
Dataset Fusion Module
Combines FoodSeg103 with custom Turkish Food dataset for training.
"""
import os
import shutil
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import json
import yaml
from loguru import logger


class DatasetFusion:
    """Fuses multiple segmentation datasets into a unified training set"""
    
    def __init__(self, output_dir: str = "datasets/fused"):
        self.output_dir = Path(output_dir)
        self.datasets: List[Dict] = []
        self.class_mapping: Dict[str, int] = {}
        self.next_class_id = 0
        
    def add_dataset(
        self,
        name: str,
        path: str,
        format: str = "yolo",  # "yolo", "coco", "voc"
        class_names: Optional[List[str]] = None,
    ) -> None:
        """
        Add a dataset to the fusion pipeline.
        
        Args:
            name: Dataset name
            path: Path to dataset root
            format: Dataset format (yolo, coco, voc)
            class_names: Optional list of class names (auto-detected if not provided)
        """
        dataset_path = Path(path)
        
        if not dataset_path.exists():
            logger.warning(f"Dataset path does not exist: {path}")
            return
        
        # Auto-detect class names
        if class_names is None:
            class_names = self._detect_classes(dataset_path, format)
        
        self.datasets.append({
            "name": name,
            "path": dataset_path,
            "format": format,
            "class_names": class_names,
        })
        
        logger.info(f"Added dataset: {name} with {len(class_names)} classes")
    
    def _detect_classes(self, path: Path, format: str) -> List[str]:
        """Auto-detect class names from dataset"""
        if format == "yolo":
            # Look for data.yaml
            yaml_path = path / "data.yaml"
            if yaml_path.exists():
                with open(yaml_path, "r") as f:
                    data = yaml.safe_load(f)
                    return data.get("names", [])
        
        return []
    
    def build_class_mapping(self) -> Dict[str, int]:
        """Build unified class mapping from all datasets"""
        self.class_mapping = {}
        self.next_class_id = 0
        
        for dataset in self.datasets:
            for class_name in dataset["class_names"]:
                if class_name not in self.class_mapping:
                    self.class_mapping[class_name] = self.next_class_id
                    self.next_class_id += 1
        
        logger.info(f"Built class mapping with {len(self.class_mapping)} classes")
        return self.class_mapping
    
    def fuse(self, train_ratio: float = 0.8) -> Path:
        """
        Fuse all datasets into a single training dataset.
        
        Args:
            train_ratio: Ratio of training data (rest is validation)
            
        Returns:
            Path to fused dataset
        """
        # Build class mapping
        self.build_class_mapping()
        
        # Create output structure
        self.output_dir.mkdir(parents=True, exist_ok=True)
        (self.output_dir / "train" / "images").mkdir(parents=True, exist_ok=True)
        (self.output_dir / "train" / "labels").mkdir(parents=True, exist_ok=True)
        (self.output_dir / "val" / "images").mkdir(parents=True, exist_ok=True)
        (self.output_dir / "val" / "labels").mkdir(parents=True, exist_ok=True)
        
        # Process each dataset
        total_images = 0
        for dataset in self.datasets:
            count = self._process_dataset(dataset, train_ratio)
            total_images += count
            logger.info(f"Processed {count} images from {dataset['name']}")
        
        # Generate data.yaml
        self._generate_yaml()
        
        logger.info(f"Fusion complete: {total_images} total images")
        return self.output_dir
    
    def _process_dataset(self, dataset: Dict, train_ratio: float) -> int:
        """Process a single dataset and copy to output"""
        import random
        
        path = dataset["path"]
        format = dataset["format"]
        dataset_classes = dataset["class_names"]
        
        if format != "yolo":
            logger.warning(f"Only YOLO format supported, skipping {dataset['name']}")
            return 0
        
        # Find all images
        image_extensions = [".jpg", ".jpeg", ".png", ".webp"]
        images = []
        
        for split in ["train", "val", "images"]:
            split_path = path / split
            if split_path.exists():
                for ext in image_extensions:
                    images.extend(split_path.rglob(f"*{ext}"))
        
        # Shuffle and split
        random.shuffle(images)
        split_idx = int(len(images) * train_ratio)
        train_images = images[:split_idx]
        val_images = images[split_idx:]
        
        # Copy images and remap labels
        count = 0
        for img_path in train_images:
            if self._copy_sample(img_path, dataset_classes, "train"):
                count += 1
        
        for img_path in val_images:
            if self._copy_sample(img_path, dataset_classes, "val"):
                count += 1
        
        return count
    
    def _copy_sample(
        self,
        img_path: Path,
        dataset_classes: List[str],
        split: str,
    ) -> bool:
        """Copy a single image and its label"""
        # Find corresponding label
        label_path = img_path.parent.parent / "labels" / f"{img_path.stem}.txt"
        if not label_path.exists():
            label_path = img_path.with_suffix(".txt")
        
        if not label_path.exists():
            return False
        
        # Generate unique filename
        unique_name = f"{img_path.parent.parent.name}_{img_path.name}"
        
        # Copy image
        dst_img = self.output_dir / split / "images" / unique_name
        shutil.copy2(img_path, dst_img)
        
        # Remap and copy label
        dst_label = self.output_dir / split / "labels" / f"{Path(unique_name).stem}.txt"
        self._remap_label(label_path, dst_label, dataset_classes)
        
        return True
    
    def _remap_label(
        self,
        src_path: Path,
        dst_path: Path,
        dataset_classes: List[str],
    ) -> None:
        """Remap class IDs in label file"""
        with open(src_path, "r") as f:
            lines = f.readlines()
        
        remapped_lines = []
        for line in lines:
            parts = line.strip().split()
            if len(parts) < 5:
                continue
            
            old_class_id = int(parts[0])
            if old_class_id < len(dataset_classes):
                class_name = dataset_classes[old_class_id]
                new_class_id = self.class_mapping.get(class_name, old_class_id)
                parts[0] = str(new_class_id)
            
            remapped_lines.append(" ".join(parts) + "\n")
        
        with open(dst_path, "w") as f:
            f.writelines(remapped_lines)
    
    def _generate_yaml(self) -> None:
        """Generate data.yaml for training"""
        class_names = [""] * len(self.class_mapping)
        for name, idx in self.class_mapping.items():
            class_names[idx] = name
        
        data = {
            "path": str(self.output_dir.absolute()),
            "train": "train/images",
            "val": "val/images",
            "nc": len(class_names),
            "names": class_names,
        }
        
        yaml_path = self.output_dir / "data.yaml"
        with open(yaml_path, "w") as f:
            yaml.dump(data, f, default_flow_style=False)
        
        # Also save class mapping
        mapping_path = self.output_dir / "class_mapping.json"
        with open(mapping_path, "w") as f:
            json.dump(self.class_mapping, f, indent=2)


def main():
    """Example usage"""
    fusion = DatasetFusion(output_dir="datasets/food_fusion")
    
    # Add FoodSeg103 dataset
    fusion.add_dataset(
        name="FoodSeg103",
        path="datasets/FoodSeg103-yolo",
        format="yolo",
    )
    
    # Add custom Turkish food dataset (if available)
    fusion.add_dataset(
        name="TurkishFood",
        path="datasets/turkish_food",
        format="yolo",
    )
    
    # Fuse datasets
    output_path = fusion.fuse(train_ratio=0.8)
    print(f"Fused dataset created at: {output_path}")


if __name__ == "__main__":
    main()
