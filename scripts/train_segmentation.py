"""
Food Segmentation Model Training Script
========================================
Label Studio'dan dönüştürülen 149 sınıflı multi-class segmentation dataseti
üzerinde YOLOv8-seg modelini eğitir.

Dataset: datasets/ls_yolo_food_multiclass (4866 görsel, 149 sınıf)
  - train: 3894 görsel
  - val: 972 görsel

Kullanım:
    # Varsayılan ayarlarla
    python scripts/train_segmentation.py

    # Özel batch size ve epoch
    python scripts/train_segmentation.py --epochs 150 --batch 16 --imgsz 640

    # Resume (durdurulmuş eğitimi devam ettir)
    python scripts/train_segmentation.py --resume

Çıktı:
    runs/segment/food_seg_v4/weights/best.pt  -> En iyi model
"""

import argparse
import torch
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DATA_YAML = ROOT / "datasets" / "ls_yolo_food_multiclass" / "data.yaml"
PROJECT_DIR = ROOT / "runs" / "segment"
RUN_NAME = "food_seg_v4"


def parse_args():
    p = argparse.ArgumentParser(description="Train food segmentation model (YOLOv8-seg)")
    p.add_argument("--model", type=str, default="yolov8n-seg.pt", help="Base model")
    p.add_argument("--data", type=str, default=str(DATA_YAML), help="data.yaml path")
    p.add_argument("--epochs", type=int, default=100, help="Training epochs")
    p.add_argument("--batch", type=int, default=8, help="Batch size (adjust for GPU memory)")
    p.add_argument("--imgsz", type=int, default=640, help="Image size")
    p.add_argument("--device", type=str, default=None, help="Device (auto if None)")
    p.add_argument("--patience", type=int, default=30, help="Early stopping patience")
    p.add_argument("--name", type=str, default=RUN_NAME, help="Run name")
    p.add_argument("--resume", action="store_true", help="Resume interrupted training")
    return p.parse_args()


def main():
    args = parse_args()

    # Device auto-detection
    if args.device is None:
        device = 0 if torch.cuda.is_available() else "cpu"
    else:
        device = args.device

    print("=" * 60)
    print("FOOD SEGMENTATION MODEL TRAINING")
    print("=" * 60)
    print(f"  Data:      {args.data}")
    print(f"  Model:     {args.model}")
    print(f"  Epochs:    {args.epochs}")
    print(f"  Batch:     {args.batch}")
    print(f"  ImgSz:     {args.imgsz}")
    print(f"  Device:    {device}")
    print(f"  Patience:  {args.patience}")
    print(f"  Output:    {PROJECT_DIR / args.name}")
    if args.resume:
        print("  ** RESUMING from last checkpoint **")
    print("=" * 60)

    from ultralytics import YOLO

    if args.resume:
        last_pt = PROJECT_DIR / args.name / "weights" / "last.pt"
        if last_pt.exists():
            model = YOLO(str(last_pt))
            print(f"Resuming from {last_pt}")
        else:
            print(f"No checkpoint found at {last_pt}, starting fresh")
            model = YOLO(args.model)
    else:
        model = YOLO(args.model)

    results = model.train(
        data=args.data,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=device,
        project=str(PROJECT_DIR),
        name=args.name,
        patience=args.patience,
        save=True,
        save_period=10,  # Save checkpoint every 10 epochs
        exist_ok=True,
        pretrained=True,
        optimizer="auto",
        verbose=True,
        val=True,
        plots=True,
        # Augmentation
        mosaic=1.0,
        mixup=0.1,
        copy_paste=0.1,
        degrees=10.0,
        translate=0.1,
        scale=0.5,
        fliplr=0.5,
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
    )

    best_pt = PROJECT_DIR / args.name / "weights" / "best.pt"
    print(f"\nTraining complete! Best model: {best_pt}")

    # Copy best model to app/backend/models/ for deployment
    deploy_dst = ROOT / "app" / "backend" / "models" / "food_seg_best.pt"
    if best_pt.exists():
        import shutil
        shutil.copy2(best_pt, deploy_dst)
        print(f"Deployed to: {deploy_dst}")


if __name__ == "__main__":
    main()
