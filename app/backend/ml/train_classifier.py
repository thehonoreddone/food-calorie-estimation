"""
Food Classification Training Script - EfficientNet-B2
=====================================================
Trains an EfficientNet-B2 classifier on the merged food dataset.
Handles class imbalance with weighted sampling and aggressive augmentation.

Usage:
    python train_classifier.py --data ../../merged_datasetf/images --epochs 100
    python train_classifier.py --data ../../merged_datasetf/images --epochs 120 --batch 32 --lr 0.0003
"""
import argparse
import json
import os
import sys
import time
import shutil
from datetime import datetime
from pathlib import Path
from typing import List, Tuple, Dict, Optional

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, WeightedRandomSampler
from torchvision import datasets, transforms, models
from PIL import Image

try:
    from loguru import logger
except ImportError:
    import logging
    logger = logging.getLogger(__name__)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")


# ============================================================
# Configuration
# ============================================================
IMG_SIZE = 260       # EfficientNet-B2 optimal input
CROP_SIZE = 224      # Center crop for validation
MEAN = [0.485, 0.456, 0.406]
STD = [0.229, 0.224, 0.225]

# Minimum images per class - classes below this get extra augmentation weight
MIN_IMAGES_PER_CLASS = 200


def parse_args():
    parser = argparse.ArgumentParser(description="Train EfficientNet-B2 Food Classifier")

    # Dataset
    parser.add_argument("--data", type=str, required=True,
                        help="Path to dataset root (e.g., ../../merged_datasetf/images)")
    parser.add_argument("--val-split", type=float, default=0.15,
                        help="Validation split ratio (default: 0.15)")

    # Model
    parser.add_argument("--arch", type=str, default="efficientnet_b2",
                        choices=["efficientnet_b0", "efficientnet_b1", "efficientnet_b2",
                                 "efficientnet_b3", "efficientnet_b4"],
                        help="Model architecture (default: efficientnet_b2)")
    parser.add_argument("--pretrained", action="store_true", default=True,
                        help="Use ImageNet pretrained weights")
    parser.add_argument("--resume", type=str, default=None,
                        help="Resume from checkpoint path")

    # Training
    parser.add_argument("--epochs", type=int, default=100,
                        help="Number of epochs (default: 100)")
    parser.add_argument("--batch", type=int, default=24,
                        help="Batch size (default: 24)")
    parser.add_argument("--lr", type=float, default=0.0003,
                        help="Learning rate (default: 0.0003)")
    parser.add_argument("--weight-decay", type=float, default=1e-4,
                        help="Weight decay for AdamW")
    parser.add_argument("--patience", type=int, default=15,
                        help="Early stopping patience")
    parser.add_argument("--workers", type=int, default=4,
                        help="DataLoader workers")
    parser.add_argument("--device", type=str, default=None,
                        help="Device (cuda/cpu/auto)")

    # Augmentation
    parser.add_argument("--mixup-alpha", type=float, default=0.2,
                        help="Mixup alpha (0 to disable)")
    parser.add_argument("--label-smoothing", type=float, default=0.1,
                        help="Label smoothing factor")

    # Output
    parser.add_argument("--output", type=str, default="runs/classifier",
                        help="Output directory")
    parser.add_argument("--name", type=str, default=None,
                        help="Run name (auto-generated if None)")

    return parser.parse_args()


# ============================================================
# Data Augmentation
# ============================================================
def get_train_transform(img_size: int = IMG_SIZE) -> transforms.Compose:
    """Strong augmentation for training - especially important for low-count classes."""
    return transforms.Compose([
        transforms.RandomResizedCrop(img_size, scale=(0.7, 1.0), ratio=(0.8, 1.2)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomVerticalFlip(p=0.05),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.3, hue=0.05),
        transforms.RandomAffine(degrees=0, translate=(0.1, 0.1), scale=(0.9, 1.1)),
        transforms.RandomPerspective(distortion_scale=0.2, p=0.3),
        transforms.RandomGrayscale(p=0.05),
        transforms.GaussianBlur(kernel_size=3, sigma=(0.1, 1.0)),
        transforms.ToTensor(),
        transforms.Normalize(mean=MEAN, std=STD),
        transforms.RandomErasing(p=0.2, scale=(0.02, 0.15)),
    ])


def get_val_transform(img_size: int = IMG_SIZE) -> transforms.Compose:
    """Standard validation transform."""
    return transforms.Compose([
        transforms.Resize(img_size + 32),
        transforms.CenterCrop(img_size),
        transforms.ToTensor(),
        transforms.Normalize(mean=MEAN, std=STD),
    ])


# ============================================================
# Dataset Splitting
# ============================================================
def create_train_val_split(data_dir: str, val_ratio: float = 0.15, seed: int = 42):
    """
    Split the ImageFolder-style dataset into train/val.
    Returns train and val datasets with separate transforms.
    """
    data_path = Path(data_dir)
    if not data_path.exists():
        raise FileNotFoundError(f"Dataset not found: {data_path}")

    # First load everything to get class info
    full_dataset = datasets.ImageFolder(str(data_path))
    class_names = full_dataset.classes
    num_classes = len(class_names)

    logger.info(f"Found {len(full_dataset)} images in {num_classes} classes")

    # Count per class
    class_counts = {}
    for _, label in full_dataset.samples:
        class_counts[label] = class_counts.get(label, 0) + 1

    # Print distribution
    sorted_counts = sorted(class_counts.items(), key=lambda x: x[1])
    low_count_classes = [(class_names[idx], count) for idx, count in sorted_counts if count < MIN_IMAGES_PER_CLASS]
    if low_count_classes:
        logger.warning(f"⚠️  {len(low_count_classes)} classes have < {MIN_IMAGES_PER_CLASS} images:")
        for name, count in low_count_classes:
            logger.warning(f"   {name}: {count} images")

    # Stratified split
    np.random.seed(seed)
    train_indices = []
    val_indices = []

    # Group indices by class
    class_indices = {}
    for idx, (_, label) in enumerate(full_dataset.samples):
        if label not in class_indices:
            class_indices[label] = []
        class_indices[label].append(idx)

    for label, indices in class_indices.items():
        np.random.shuffle(indices)
        n_val = max(1, int(len(indices) * val_ratio))
        # For very small classes, keep at least 70% for training
        if len(indices) < 50:
            n_val = max(1, int(len(indices) * 0.1))
        val_indices.extend(indices[:n_val])
        train_indices.extend(indices[n_val:])

    logger.info(f"Train: {len(train_indices)} images, Val: {len(val_indices)} images")

    # Create subset datasets with different transforms
    train_dataset = SubsetWithTransform(full_dataset, train_indices, get_train_transform())
    val_dataset = SubsetWithTransform(full_dataset, val_indices, get_val_transform())

    return train_dataset, val_dataset, class_names, class_counts


class SubsetWithTransform(torch.utils.data.Dataset):
    """Subset of a dataset with a separate transform."""

    def __init__(self, dataset, indices, transform):
        self.dataset = dataset
        self.indices = indices
        self.transform = transform
        # Store labels for sampler
        self.targets = [dataset.targets[i] for i in indices]

    def __len__(self):
        return len(self.indices)

    def __getitem__(self, idx):
        real_idx = self.indices[idx]
        path, label = self.dataset.samples[real_idx]
        image = self.dataset.loader(path)
        if self.transform:
            image = self.transform(image)
        return image, label


# ============================================================
# Weighted Sampler for Class Imbalance
# ============================================================
def get_weighted_sampler(dataset, class_counts: dict, num_classes: int) -> WeightedRandomSampler:
    """Create a weighted random sampler to handle class imbalance."""
    # Inverse frequency weighting with smoothing
    max_count = max(class_counts.values())
    class_weights = {}
    for cls_id in range(num_classes):
        count = class_counts.get(cls_id, 1)
        # Square root dampening - not too aggressive
        class_weights[cls_id] = np.sqrt(max_count / count)

    # Assign weight to each sample
    sample_weights = [class_weights[label] for label in dataset.targets]
    sample_weights = torch.DoubleTensor(sample_weights)

    # Create sampler
    sampler = WeightedRandomSampler(
        weights=sample_weights,
        num_samples=len(sample_weights),
        replacement=True
    )
    return sampler


# ============================================================
# Mixup Augmentation
# ============================================================
def mixup_data(x, y, alpha=0.2):
    """Applies mixup to a batch."""
    if alpha > 0:
        lam = np.random.beta(alpha, alpha)
    else:
        lam = 1.0

    batch_size = x.size(0)
    index = torch.randperm(batch_size).to(x.device)

    mixed_x = lam * x + (1 - lam) * x[index]
    y_a, y_b = y, y[index]
    return mixed_x, y_a, y_b, lam


def mixup_criterion(criterion, pred, y_a, y_b, lam):
    return lam * criterion(pred, y_a) + (1 - lam) * criterion(pred, y_b)


# ============================================================
# Model Creation
# ============================================================
def create_model(arch: str, num_classes: int, pretrained: bool = True) -> nn.Module:
    """Create EfficientNet model with custom head."""
    logger.info(f"Creating {arch} with {num_classes} classes (pretrained={pretrained})")

    weights = None
    if pretrained:
        if arch == "efficientnet_b0":
            weights = models.EfficientNet_B0_Weights.DEFAULT
        elif arch == "efficientnet_b1":
            weights = models.EfficientNet_B1_Weights.DEFAULT
        elif arch == "efficientnet_b2":
            weights = models.EfficientNet_B2_Weights.DEFAULT
        elif arch == "efficientnet_b3":
            weights = models.EfficientNet_B3_Weights.DEFAULT
        elif arch == "efficientnet_b4":
            weights = models.EfficientNet_B4_Weights.DEFAULT

    model_fn = getattr(models, arch)
    model = model_fn(weights=weights)

    # Replace classifier head
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3, inplace=True),
        nn.Linear(in_features, num_classes),
    )

    return model


# ============================================================
# Training Loop
# ============================================================
def train_one_epoch(model, dataloader, criterion, optimizer, device, epoch,
                    mixup_alpha=0.0, scaler=None):
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0

    for batch_idx, (images, labels) in enumerate(dataloader):
        images, labels = images.to(device), labels.to(device)

        # Mixup
        use_mixup = mixup_alpha > 0 and np.random.rand() < 0.5
        if use_mixup:
            images, labels_a, labels_b, lam = mixup_data(images, labels, mixup_alpha)

        optimizer.zero_grad()

        # Mixed precision
        if scaler is not None:
            with torch.amp.autocast(device_type='cuda'):
                outputs = model(images)
                if use_mixup:
                    loss = mixup_criterion(criterion, outputs, labels_a, labels_b, lam)
                else:
                    loss = criterion(outputs, labels)
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            scaler.step(optimizer)
            scaler.update()
        else:
            outputs = model(images)
            if use_mixup:
                loss = mixup_criterion(criterion, outputs, labels_a, labels_b, lam)
            else:
                loss = criterion(outputs, labels)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

        running_loss += loss.item() * images.size(0)

        if not use_mixup:
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()

    avg_loss = running_loss / len(dataloader.dataset)
    accuracy = 100.0 * correct / max(total, 1)
    return avg_loss, accuracy


@torch.no_grad()
def validate(model, dataloader, criterion, device):
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0
    all_preds = []
    all_labels = []

    for images, labels in dataloader:
        images, labels = images.to(device), labels.to(device)
        outputs = model(images)
        loss = criterion(outputs, labels)

        running_loss += loss.item() * images.size(0)
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()

        all_preds.extend(predicted.cpu().numpy())
        all_labels.extend(labels.cpu().numpy())

    avg_loss = running_loss / len(dataloader.dataset)
    accuracy = 100.0 * correct / total

    return avg_loss, accuracy, all_preds, all_labels


# ============================================================
# Main Training
# ============================================================
def main():
    args = parse_args()

    # Device
    if args.device:
        device = torch.device(args.device)
    elif torch.cuda.is_available():
        device = torch.device("cuda")
    else:
        device = torch.device("cpu")
    logger.info(f"Using device: {device}")

    if device.type == "cuda":
        logger.info(f"GPU: {torch.cuda.get_device_name(0)}")
        logger.info(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")

    # Output directory
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_name = args.name or f"food_cls_{timestamp}"
    output_dir = Path(args.output) / run_name
    output_dir.mkdir(parents=True, exist_ok=True)
    checkpoints_dir = output_dir / "checkpoints"
    checkpoints_dir.mkdir(exist_ok=True)

    logger.info(f"Output: {output_dir}")

    # Dataset
    train_dataset, val_dataset, class_names, class_counts = create_train_val_split(
        args.data, val_ratio=args.val_split
    )
    num_classes = len(class_names)

    # Save class names
    class_names_path = output_dir / "class_names.json"
    with open(class_names_path, "w", encoding="utf-8") as f:
        json.dump(class_names, f, ensure_ascii=False, indent=2)
    logger.info(f"Saved {num_classes} class names to {class_names_path}")

    # Weighted sampler
    sampler = get_weighted_sampler(train_dataset, class_counts, num_classes)

    # DataLoaders
    train_loader = DataLoader(
        train_dataset,
        batch_size=args.batch,
        sampler=sampler,
        num_workers=args.workers,
        pin_memory=True,
        drop_last=True,
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=args.batch * 2,
        shuffle=False,
        num_workers=args.workers,
        pin_memory=True,
    )

    # Model
    model = create_model(args.arch, num_classes, pretrained=args.pretrained)

    # Resume if requested
    start_epoch = 0
    if args.resume:
        checkpoint = torch.load(args.resume, map_location=device, weights_only=False)
        if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
            model.load_state_dict(checkpoint["model_state_dict"])
            start_epoch = checkpoint.get("epoch", 0)
            logger.info(f"Resumed from epoch {start_epoch}")
        else:
            model.load_state_dict(checkpoint)
            logger.info("Loaded model weights (no epoch info)")

    model = model.to(device)

    # Loss with label smoothing
    criterion = nn.CrossEntropyLoss(label_smoothing=args.label_smoothing)

    # Optimizer - AdamW with different LR for backbone vs head
    backbone_params = []
    head_params = []
    for name, param in model.named_parameters():
        if "classifier" in name:
            head_params.append(param)
        else:
            backbone_params.append(param)

    optimizer = optim.AdamW([
        {"params": backbone_params, "lr": args.lr * 0.1},   # Lower LR for pretrained backbone
        {"params": head_params, "lr": args.lr},              # Normal LR for new head
    ], weight_decay=args.weight_decay)

    # Scheduler - Cosine with warmup
    warmup_epochs = 5
    scheduler = optim.lr_scheduler.CosineAnnealingWarmRestarts(
        optimizer, T_0=args.epochs - warmup_epochs, T_mult=1, eta_min=1e-6
    )

    # Mixed precision
    scaler = torch.amp.GradScaler('cuda') if device.type == "cuda" else None

    # Training state
    best_val_acc = 0.0
    best_val_loss = float("inf")
    patience_counter = 0

    # Save training config
    config = {
        "arch": args.arch,
        "num_classes": num_classes,
        "epochs": args.epochs,
        "batch_size": args.batch,
        "learning_rate": args.lr,
        "weight_decay": args.weight_decay,
        "label_smoothing": args.label_smoothing,
        "mixup_alpha": args.mixup_alpha,
        "val_split": args.val_split,
        "img_size": IMG_SIZE,
        "dataset": str(Path(args.data).resolve()),
        "class_counts": {class_names[k]: v for k, v in class_counts.items()},
    }
    with open(output_dir / "training_config.json", "w") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

    # ========== TRAINING LOOP ==========
    logger.info("=" * 70)
    logger.info(f"FOOD CLASSIFICATION TRAINING")
    logger.info(f"  Model:       {args.arch}")
    logger.info(f"  Classes:     {num_classes}")
    logger.info(f"  Train:       {len(train_dataset)} images")
    logger.info(f"  Val:         {len(val_dataset)} images")
    logger.info(f"  Batch:       {args.batch}")
    logger.info(f"  Epochs:      {args.epochs}")
    logger.info(f"  LR:          {args.lr} (backbone: {args.lr * 0.1})")
    logger.info(f"  Mixup:       {args.mixup_alpha}")
    logger.info(f"  Label Smooth:{args.label_smoothing}")
    logger.info("=" * 70)

    history = {"train_loss": [], "train_acc": [], "val_loss": [], "val_acc": []}

    for epoch in range(start_epoch, args.epochs):
        epoch_start = time.time()

        # Warmup LR
        if epoch < warmup_epochs:
            warmup_factor = (epoch + 1) / warmup_epochs
            for pg in optimizer.param_groups:
                if pg == optimizer.param_groups[0]:  # backbone
                    pg["lr"] = args.lr * 0.1 * warmup_factor
                else:  # head
                    pg["lr"] = args.lr * warmup_factor

        # Train
        train_loss, train_acc = train_one_epoch(
            model, train_loader, criterion, optimizer, device, epoch,
            mixup_alpha=args.mixup_alpha, scaler=scaler
        )

        # Validate
        val_loss, val_acc, _, _ = validate(model, val_loader, criterion, device)

        # Scheduler step (after warmup)
        if epoch >= warmup_epochs:
            scheduler.step()

        epoch_time = time.time() - epoch_start
        current_lr = optimizer.param_groups[1]["lr"]

        # Log
        logger.info(
            f"Epoch [{epoch+1}/{args.epochs}] "
            f"Train Loss: {train_loss:.4f} Acc: {train_acc:.2f}% | "
            f"Val Loss: {val_loss:.4f} Acc: {val_acc:.2f}% | "
            f"LR: {current_lr:.6f} | Time: {epoch_time:.1f}s"
        )

        history["train_loss"].append(train_loss)
        history["train_acc"].append(train_acc)
        history["val_loss"].append(val_loss)
        history["val_acc"].append(val_acc)

        # Save best model
        improved = False
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            improved = True
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            improved = True

        if improved:
            patience_counter = 0
            checkpoint = {
                "epoch": epoch + 1,
                "arch": args.arch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "val_acc": val_acc,
                "val_loss": val_loss,
                "num_classes": num_classes,
                "class_names": class_names,  # Embed class names in checkpoint!
            }
            torch.save(checkpoint, checkpoints_dir / "checkpoint_best.pth")
            logger.info(f"  ✅ Best model saved! Val Acc: {val_acc:.2f}%")
        else:
            patience_counter += 1
            if patience_counter >= args.patience:
                logger.info(f"Early stopping at epoch {epoch+1} (patience={args.patience})")
                break

        # Save periodic checkpoint
        if (epoch + 1) % 10 == 0:
            torch.save({
                "epoch": epoch + 1,
                "arch": args.arch,
                "model_state_dict": model.state_dict(),
                "val_acc": val_acc,
                "num_classes": num_classes,
                "class_names": class_names,
            }, checkpoints_dir / f"checkpoint_epoch_{epoch+1}.pth")

    # Save final model
    final_checkpoint = {
        "epoch": epoch + 1,
        "arch": args.arch,
        "model_state_dict": model.state_dict(),
        "val_acc": val_acc,
        "num_classes": num_classes,
        "class_names": class_names,
    }
    torch.save(final_checkpoint, checkpoints_dir / "checkpoint_last.pth")

    # Save history
    with open(output_dir / "training_history.json", "w") as f:
        json.dump(history, f, indent=2)

    # Copy best model to models/ directory
    best_model = checkpoints_dir / "checkpoint_best.pth"
    if best_model.exists():
        models_dir = Path(__file__).parent.parent / "models"
        models_dir.mkdir(exist_ok=True)
        dest = models_dir / "checkpoint_best.pth"
        shutil.copy2(best_model, dest)
        logger.info(f"Best model copied to: {dest}")

        # Also save class_names.json alongside
        shutil.copy2(class_names_path, models_dir / "class_names.json")

    logger.info("=" * 70)
    logger.info(f"TRAINING COMPLETE")
    logger.info(f"  Best Val Accuracy: {best_val_acc:.2f}%")
    logger.info(f"  Best Val Loss:     {best_val_loss:.4f}")
    logger.info(f"  Output:            {output_dir}")
    logger.info("=" * 70)


if __name__ == "__main__":
    main()
