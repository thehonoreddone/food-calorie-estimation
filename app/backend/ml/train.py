"""
Training Script for Food Segmentation Model
Run with a single command to train on fused dataset.
"""
import argparse
import os
from pathlib import Path
from datetime import datetime
import json

from loguru import logger


def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description="Train YOLOv8-seg on food segmentation dataset"
    )
    
    # Dataset
    parser.add_argument(
        "--data",
        type=str,
        default="datasets/food_fusion/data.yaml",
        help="Path to data.yaml",
    )
    
    # Model
    parser.add_argument(
        "--model",
        type=str,
        default="yolov8n-seg.pt",
        help="Base model (yolov8n-seg, yolov8s-seg, yolov8m-seg)",
    )
    
    # Training
    parser.add_argument("--epochs", type=int, default=100, help="Training epochs")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--imgsz", type=int, default=640, help="Image size")
    parser.add_argument("--device", type=str, default="0", help="CUDA device")
    
    # Optimization
    parser.add_argument("--lr0", type=float, default=0.01, help="Initial learning rate")
    parser.add_argument("--lrf", type=float, default=0.01, help="Final LR factor")
    parser.add_argument("--optimizer", type=str, default="SGD", help="Optimizer")
    parser.add_argument("--patience", type=int, default=50, help="Early stopping patience")
    
    # Augmentation
    parser.add_argument("--augment", action="store_true", help="Enable augmentation")
    parser.add_argument("--mosaic", type=float, default=1.0, help="Mosaic probability")
    parser.add_argument("--mixup", type=float, default=0.0, help="Mixup probability")
    
    # Output
    parser.add_argument(
        "--project",
        type=str,
        default="runs/train",
        help="Project directory",
    )
    parser.add_argument("--name", type=str, default="food_seg", help="Run name")
    
    # Export
    parser.add_argument("--export-onnx", action="store_true", help="Export to ONNX")
    
    return parser.parse_args()


def train(args):
    """Main training function"""
    from ultralytics import YOLO
    
    # Create output directory
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_name = f"{args.name}_{timestamp}"
    
    logger.info("=" * 60)
    logger.info("Food Segmentation Training")
    logger.info("=" * 60)
    logger.info(f"Dataset: {args.data}")
    logger.info(f"Model: {args.model}")
    logger.info(f"Epochs: {args.epochs}")
    logger.info(f"Batch size: {args.batch}")
    logger.info(f"Image size: {args.imgsz}")
    logger.info("=" * 60)
    
    # Load model
    model = YOLO(args.model)
    
    # Train
    results = model.train(
        data=args.data,
        epochs=args.epochs,
        batch=args.batch,
        imgsz=args.imgsz,
        device=args.device,
        lr0=args.lr0,
        lrf=args.lrf,
        optimizer=args.optimizer,
        patience=args.patience,
        mosaic=args.mosaic,
        mixup=args.mixup,
        project=args.project,
        name=run_name,
        exist_ok=True,
        pretrained=True,
        verbose=True,
        save=True,
        save_period=10,
        val=True,
    )
    
    logger.info("Training complete!")
    
    # Save training config
    config_path = Path(args.project) / run_name / "training_config.json"
    with open(config_path, "w") as f:
        json.dump(vars(args), f, indent=2)
    
    # Copy best model to project root
    best_model_path = Path(args.project) / run_name / "weights" / "best.pt"
    if best_model_path.exists():
        output_model = Path("models") / "foodseg_best.pt"
        output_model.parent.mkdir(exist_ok=True)
        
        import shutil
        shutil.copy2(best_model_path, output_model)
        logger.info(f"Best model copied to: {output_model}")
    
    # Export to ONNX if requested
    if args.export_onnx:
        export_onnx(best_model_path)
    
    return results


def export_onnx(model_path: Path):
    """Export model to ONNX format"""
    from ultralytics import YOLO
    
    logger.info("Exporting to ONNX...")
    
    model = YOLO(str(model_path))
    model.export(
        format="onnx",
        dynamic=True,
        simplify=True,
        opset=12,
    )
    
    onnx_path = model_path.with_suffix(".onnx")
    logger.info(f"ONNX model exported: {onnx_path}")


def validate(model_path: str, data_path: str):
    """Validate trained model"""
    from ultralytics import YOLO
    
    model = YOLO(model_path)
    results = model.val(data=data_path, verbose=True)
    
    print("\n" + "=" * 60)
    print("Validation Results")
    print("=" * 60)
    print(f"mAP50: {results.box.map50:.4f}")
    print(f"mAP50-95: {results.box.map:.4f}")
    print(f"Mask mAP50: {results.seg.map50:.4f}")
    print(f"Mask mAP50-95: {results.seg.map:.4f}")
    print("=" * 60)
    
    return results


def main():
    """Entry point"""
    args = parse_args()
    
    # Check data exists
    if not Path(args.data).exists():
        logger.error(f"Data file not found: {args.data}")
        logger.info("Run dataset preparation first:")
        logger.info("  python ml/dataset_fusion.py")
        return
    
    # Create models directory
    Path("models").mkdir(exist_ok=True)
    
    # Train
    train(args)


if __name__ == "__main__":
    main()
