"""
Food Classification Model Training Script
==========================================
merged_datasetf üzerindeki 201 sınıflı görüntülerden EfficientNet-B2 tabanlı
sınıflandırma modeli eğitir.

Dataset: merged_datasetf/images/{class_name}/*.jpg (201 sınıf, ~145K görsel)

Kullanım:
    # Varsayılan ayarlarla
    python scripts/train_classification.py

    # Özel parametrelerle
    python scripts/train_classification.py --epochs 30 --batch 32 --lr 0.001

    # Resume
    python scripts/train_classification.py --resume

Çıktı:
    runs/classify/food_cls_201/checkpoint_best.pth  -> En iyi model
    runs/classify/food_cls_201/class_names.json      -> Sınıf isimleri
"""

import argparse
import json
import os
import random
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms, models
from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
DATASET_DIR = ROOT / "merged_datasetf" / "images"
OUTPUT_DIR = ROOT / "runs" / "classify" / "food_cls_201"


class FoodImageDataset(Dataset):
    """Custom dataset for folder-organized food images."""

    def __init__(self, samples, class_to_idx, transform=None):
        self.samples = samples  # List of (path, class_idx)
        self.class_to_idx = class_to_idx
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        img = Image.open(path).convert("RGB")
        if self.transform:
            img = self.transform(img)
        return img, label


def build_datasets(data_dir: Path, val_ratio=0.15, seed=42):
    """Scan folder structure and create train/val splits."""
    class_dirs = sorted([d for d in data_dir.iterdir() if d.is_dir()])
    class_names = [d.name for d in class_dirs]
    class_to_idx = {name: i for i, name in enumerate(class_names)}

    all_samples = []
    for cls_dir in class_dirs:
        idx = class_to_idx[cls_dir.name]
        for img_file in cls_dir.iterdir():
            if img_file.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp"):
                all_samples.append((str(img_file), idx))

    random.seed(seed)
    random.shuffle(all_samples)

    n_val = int(len(all_samples) * val_ratio)
    val_samples = all_samples[:n_val]
    train_samples = all_samples[n_val:]

    return train_samples, val_samples, class_names, class_to_idx


def get_transforms(imgsz=224):
    """Train and val transforms."""
    train_tf = transforms.Compose([
        transforms.RandomResizedCrop(imgsz, scale=(0.7, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.3, hue=0.05),
        transforms.RandomRotation(15),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    val_tf = transforms.Compose([
        transforms.Resize(int(imgsz * 1.14)),
        transforms.CenterCrop(imgsz),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    return train_tf, val_tf


def create_model(num_classes: int, arch: str = "efficientnet_b2"):
    """Create model with pretrained backbone."""
    if arch == "efficientnet_b2":
        model = models.efficientnet_b2(weights=models.EfficientNet_B2_Weights.DEFAULT)
        in_features = model.classifier[1].in_features
        model.classifier = nn.Sequential(
            nn.Dropout(p=0.3),
            nn.Linear(in_features, num_classes),
        )
    elif arch == "efficientnet_b0":
        model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)
        in_features = model.classifier[1].in_features
        model.classifier = nn.Sequential(
            nn.Dropout(p=0.2),
            nn.Linear(in_features, num_classes),
        )
    else:
        raise ValueError(f"Unknown architecture: {arch}")
    return model


def train_one_epoch(model, loader, criterion, optimizer, device, scaler):
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0

    for imgs, labels in loader:
        imgs, labels = imgs.to(device), labels.to(device)
        optimizer.zero_grad()

        with torch.amp.autocast("cuda", enabled=scaler is not None):
            outputs = model(imgs)
            loss = criterion(outputs, labels)

        if scaler:
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
        else:
            loss.backward()
            optimizer.step()

        running_loss += loss.item() * imgs.size(0)
        _, preds = outputs.max(1)
        correct += preds.eq(labels).sum().item()
        total += imgs.size(0)

    return running_loss / total, correct / total


@torch.no_grad()
def validate(model, loader, criterion, device):
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0

    for imgs, labels in loader:
        imgs, labels = imgs.to(device), labels.to(device)
        outputs = model(imgs)
        loss = criterion(outputs, labels)

        running_loss += loss.item() * imgs.size(0)
        _, preds = outputs.max(1)
        correct += preds.eq(labels).sum().item()
        total += imgs.size(0)

    return running_loss / total, correct / total


def parse_args():
    p = argparse.ArgumentParser(description="Train food classification model (EfficientNet)")
    p.add_argument("--data", type=str, default=str(DATASET_DIR), help="Image folder root")
    p.add_argument("--arch", type=str, default="efficientnet_b2", choices=["efficientnet_b0", "efficientnet_b2"])
    p.add_argument("--epochs", type=int, default=50, help="Training epochs (201 sınıf için 50+ önerilir)")
    p.add_argument("--batch", type=int, default=32, help="Batch size")
    p.add_argument("--imgsz", type=int, default=260, help="EfficientNet-B2 optimal: 260")
    p.add_argument("--lr", type=float, default=0.001, help="Learning rate")
    p.add_argument("--warmup-epochs", type=int, default=3, help="Warmup epochs (gradual LR increase)")
    p.add_argument("--val-ratio", type=float, default=0.15, help="Validation ratio")
    p.add_argument("--workers", type=int, default=4, help="Dataloader workers")
    p.add_argument("--patience", type=int, default=15, help="Early stopping patience")
    p.add_argument("--out", type=str, default=str(OUTPUT_DIR), help="Output directory")
    p.add_argument("--resume", action="store_true", help="Resume from last checkpoint")
    return p.parse_args()


def main():
    args = parse_args()
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    use_amp = device.type == "cuda"

    print("=" * 60)
    print("FOOD CLASSIFICATION MODEL TRAINING")
    print("=" * 60)
    print(f"  Data:      {args.data}")
    print(f"  Arch:      {args.arch}")
    print(f"  Epochs:    {args.epochs}")
    print(f"  Batch:     {args.batch}")
    print(f"  ImgSz:     {args.imgsz}")
    print(f"  LR:        {args.lr}")
    print(f"  Device:    {device}")
    print(f"  AMP:       {use_amp}")
    print(f"  Output:    {out_dir}")
    print("=" * 60)

    # Build datasets
    print("Building datasets...")
    train_samples, val_samples, class_names, class_to_idx = build_datasets(
        Path(args.data), val_ratio=args.val_ratio
    )
    print(f"  Classes: {len(class_names)}")
    print(f"  Train:   {len(train_samples)}")
    print(f"  Val:     {len(val_samples)}")

    # Save class names
    with open(out_dir / "class_names.json", "w", encoding="utf-8") as f:
        json.dump(class_names, f, indent=2, ensure_ascii=False)

    # Transforms
    train_tf, val_tf = get_transforms(args.imgsz)

    train_ds = FoodImageDataset(train_samples, class_to_idx, train_tf)
    val_ds = FoodImageDataset(val_samples, class_to_idx, val_tf)

    train_loader = DataLoader(train_ds, batch_size=args.batch, shuffle=True,
                              num_workers=args.workers, pin_memory=True, drop_last=True)
    val_loader = DataLoader(val_ds, batch_size=args.batch, shuffle=False,
                            num_workers=args.workers, pin_memory=True)

    # Model
    model = create_model(len(class_names), args.arch).to(device)
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=args.epochs - args.warmup_epochs, eta_min=1e-6
    )
    scaler = torch.amp.GradScaler("cuda") if use_amp else None

    start_epoch = 0
    best_val_acc = 0.0
    patience_counter = 0

    # Resume
    if args.resume:
        ckpt_path = out_dir / "checkpoint_latest.pth"
        if ckpt_path.exists():
            ckpt = torch.load(ckpt_path, map_location=device, weights_only=False)
            model.load_state_dict(ckpt["model_state_dict"])
            optimizer.load_state_dict(ckpt["optimizer_state_dict"])
            scheduler.load_state_dict(ckpt["scheduler_state_dict"])
            start_epoch = ckpt["epoch"] + 1
            best_val_acc = ckpt.get("best_val_acc", 0.0)
            print(f"Resumed from epoch {start_epoch}, best_val_acc={best_val_acc:.4f}")
        else:
            print("No checkpoint found, starting fresh")

    # Training loop
    print(f"\nStarting training from epoch {start_epoch}...")
    for epoch in range(start_epoch, args.epochs):
        t0 = time.time()

        # Warmup: linearly increase LR for first N epochs
        if epoch < args.warmup_epochs:
            warmup_lr = args.lr * (epoch + 1) / args.warmup_epochs
            for pg in optimizer.param_groups:
                pg["lr"] = warmup_lr

        train_loss, train_acc = train_one_epoch(model, train_loader, criterion, optimizer, device, scaler)
        val_loss, val_acc = validate(model, val_loader, criterion, device)

        # Only step scheduler after warmup
        if epoch >= args.warmup_epochs:
            scheduler.step()

        elapsed = time.time() - t0
        lr_now = optimizer.param_groups[0]["lr"]

        print(
            f"Epoch {epoch+1:3d}/{args.epochs} | "
            f"train_loss={train_loss:.4f} train_acc={train_acc:.4f} | "
            f"val_loss={val_loss:.4f} val_acc={val_acc:.4f} | "
            f"lr={lr_now:.6f} | {elapsed:.1f}s"
        )

        # Save checkpoint
        ckpt = {
            "epoch": epoch,
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "scheduler_state_dict": scheduler.state_dict(),
            "arch": args.arch,
            "num_classes": len(class_names),
            "class_names": class_names,
            "val_acc": val_acc,
            "best_val_acc": best_val_acc,
        }

        # Save latest
        torch.save(ckpt, out_dir / "checkpoint_latest.pth")

        # Save best
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            patience_counter = 0
            torch.save(ckpt, out_dir / "checkpoint_best.pth")
            print(f"  >> New best: {best_val_acc:.4f}")
        else:
            patience_counter += 1

        # Early stopping
        if patience_counter >= args.patience:
            print(f"Early stopping at epoch {epoch+1} (patience={args.patience})")
            break

    print(f"\nTraining complete! Best val_acc: {best_val_acc:.4f}")
    print(f"Best model: {out_dir / 'checkpoint_best.pth'}")

    # Deploy to backend
    deploy_dst = ROOT / "app" / "backend" / "models" / "checkpoint_best.pth"
    import shutil
    best_ckpt = out_dir / "checkpoint_best.pth"
    if best_ckpt.exists():
        shutil.copy2(best_ckpt, deploy_dst)
        # Also copy class_names.json
        shutil.copy2(out_dir / "class_names.json", deploy_dst.parent / "class_names.json")
        print(f"Deployed to: {deploy_dst}")


if __name__ == "__main__":
    main()
