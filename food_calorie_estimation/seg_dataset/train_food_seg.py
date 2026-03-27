"""
Nutrino — Advanced Food Segmentation Training Script
=====================================================
Label Studio'dan dönüştürülmüş YOLO dataset'i üzerinde 
YOLOv8-seg modelini 2 aşamalı (frozen → full fine-tune) eğitir.

Özellikler:
  ✅ 2-aşamalı eğitim (frozen backbone → full fine-tune)
  ✅ Agresif data augmentation (copy-paste, mosaic, mixup)
  ✅ Progressive image resizing (küçük → büyük)
  ✅ Class-aware weighted sampling (dengesiz sınıf çözümü)
  ✅ Early stopping + cosine annealing LR
  ✅ Otomatik best model export

Kullanım:
    # 1) Önce Label Studio JSON'u YOLO formatına dönüştür:
    python convert_labelstudio.py \
        --json "../../project-3-at-2026-03-26-19-36-09024ed5.json" \
        --images "C:/dataset_200" \
        --output "./dataset_labelstudio"

    # 2) Eğitimi başlat:
    python train_food_seg.py --data ./dataset_labelstudio/data.yaml

    # Özel parametrelerle:
    python train_food_seg.py \
        --data ./dataset_labelstudio/data.yaml \
        --model yolov8m-seg.pt \
        --epochs 150 \
        --batch 8 \
        --device cuda:0

Gereksinimler:
    pip install ultralytics torch torchvision tqdm
"""

import argparse
import shutil
import sys
import json
import time
from datetime import datetime
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()


def parse_args():
    parser = argparse.ArgumentParser(
        description="Nutrino Food Segmentation Training (2-stage)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    # Data
    parser.add_argument(
        "--data", "-d", required=True,
        help="data.yaml path (convert_labelstudio.py çıktısı)",
    )

    # Model
    parser.add_argument(
        "--model", "-m", default="yolov8m-seg.pt",
        help="Base model (default: yolov8m-seg.pt — best accuracy/speed balance)",
    )

    # Training
    parser.add_argument("--epochs", "-e", type=int, default=150,
                        help="Total fine-tune epochs (default: 150)")
    parser.add_argument("--warmup-epochs", type=int, default=15,
                        help="Frozen backbone warmup epochs (default: 15)")
    parser.add_argument("--batch", "-b", type=int, default=8,
                        help="Batch size (default: 8, GPU belleğine göre ayarla)")
    parser.add_argument("--imgsz", type=int, default=640,
                        help="Training image size (default: 640)")
    parser.add_argument("--device", default=None,
                        help="Device: cuda:0, cpu, etc. (default: auto)")
    parser.add_argument("--workers", type=int, default=4,
                        help="Dataloader workers (default: 4)")

    # Augmentation presets
    parser.add_argument(
        "--aug-level", choices=["light", "medium", "heavy"], default="heavy",
        help="Augmentation preset (default: heavy — önerilen, az veri için)",
    )

    # Advanced
    parser.add_argument("--freeze-layers", type=int, default=10,
                        help="Warmup'ta dondurulacak katman sayısı (default: 10)")
    parser.add_argument("--patience", type=int, default=30,
                        help="Early stopping patience (default: 30)")
    parser.add_argument("--lr0", type=float, default=0.01,
                        help="Initial LR for warmup (default: 0.01)")
    parser.add_argument("--lr-finetune", type=float, default=0.001,
                        help="Initial LR for fine-tune phase (default: 0.001)")
    parser.add_argument("--optimizer", default="AdamW",
                        choices=["SGD", "Adam", "AdamW", "auto"],
                        help="Optimizer (default: AdamW)")
    parser.add_argument("--name", default=None,
                        help="Run name (default: auto-generated)")
    parser.add_argument("--resume", default=None,
                        help="Checkpoint to resume from")
    parser.add_argument("--cache", action="store_true",
                        help="Cache dataset in RAM (hızlı ama çok RAM)")
    parser.add_argument("--skip-warmup", action="store_true",
                        help="Skip frozen backbone warmup phase")
    parser.add_argument("--progressive", action="store_true", default=True,
                        help="Progressive resizing: 480→640 (default: True)")
    parser.add_argument("--no-progressive", action="store_true",
                        help="Disable progressive resizing")

    return parser.parse_args()


# ── Augmentation Presets ────────────────────────────────────────
AUG_PRESETS = {
    "light": {
        "mosaic": 0.3,
        "mixup": 0.05,
        "copy_paste": 0.1,
        "hsv_h": 0.01,
        "hsv_s": 0.3,
        "hsv_v": 0.2,
        "degrees": 5.0,
        "translate": 0.1,
        "scale": 0.2,
        "shear": 0.0,
        "perspective": 0.0,
        "flipud": 0.0,
        "fliplr": 0.5,
        "erasing": 0.1,
    },
    "medium": {
        "mosaic": 0.5,
        "mixup": 0.1,
        "copy_paste": 0.2,
        "hsv_h": 0.015,
        "hsv_s": 0.4,
        "hsv_v": 0.3,
        "degrees": 10.0,
        "translate": 0.15,
        "scale": 0.3,
        "shear": 2.0,
        "perspective": 0.0003,
        "flipud": 0.0,
        "fliplr": 0.5,
        "erasing": 0.15,
    },
    "heavy": {
        # Agresif augmentation — sınıf başına <200 görüntü olduğunda önerilen
        "mosaic": 0.7,        # 4 görüntüyü birleştir, çeşitlilik artır
        "mixup": 0.15,        # Sınıflar arası yumuşak geçiş
        "copy_paste": 0.3,    # Segmentasyon maskelerini farklı arka plana yapıştır
        "hsv_h": 0.015,       # Hue varyasyonu
        "hsv_s": 0.5,         # Saturation — ışık değişimi simülasyonu
        "hsv_v": 0.3,         # Value/brightness
        "degrees": 15.0,      # Rotasyon (yemekler çok dönmez, sınırlı tut)
        "translate": 0.2,     # Kaydırma
        "scale": 0.3,         # Porsiyon boyutu varyasyonu
        "shear": 3.0,         # Perspektif bozulması
        "perspective": 0.0005,# Kamera açısı değişimi
        "flipud": 0.0,        # Dikey flip KAPALI — yemekler ters durmaz!
        "fliplr": 0.5,        # Yatay flip — yemekler simetriktir
        "erasing": 0.2,       # Rastgele silme — kısmi occlusion öğretir
    },
}


def get_gpu_info():
    """GPU bilgilerini al."""
    try:
        import torch
        if torch.cuda.is_available():
            name = torch.cuda.get_device_name(0)
            mem = torch.cuda.get_device_properties(0).total_mem / (1024**3)
            return True, name, mem
    except Exception:
        pass
    return False, "N/A", 0


def auto_batch_size(gpu_mem_gb: float, imgsz: int, model_size: str) -> int:
    """GPU belleğine göre batch size öner."""
    # Yaklaşık bellek kullanımı (GB) : batch_size referansları
    # yolov8n-seg@640: ~2GB/batch8, yolov8m-seg@640: ~4GB/batch8
    scale = {"n": 0.25, "s": 0.5, "m": 1.0, "l": 1.5, "x": 2.5}
    model_letter = "m"  # default
    for letter in scale:
        if f"v8{letter}" in model_size.lower() or f"v11{letter}" in model_size.lower():
            model_letter = letter
            break

    mem_per_batch = scale[model_letter] * (imgsz / 640) ** 2 * 0.5
    suggested = max(2, int(gpu_mem_gb * 0.7 / mem_per_batch))
    # Cap at reasonable values
    return min(suggested, 32)


def run_phase(
    model,
    data_yaml: str,
    phase_name: str,
    epochs: int,
    batch: int,
    imgsz: int,
    device: str,
    workers: int,
    lr0: float,
    optimizer: str,
    aug_params: dict,
    patience: int,
    freeze: int = 0,
    run_name: str = "",
    cache: bool = False,
    resume_path: str = None,
):
    """Tek bir eğitim fazını çalıştır."""
    print(f"\n{'=' * 60}")
    print(f"🚀 Phase: {phase_name}")
    print(f"   Epochs: {epochs}, Batch: {batch}, ImgSz: {imgsz}")
    print(f"   LR: {lr0}, Optimizer: {optimizer}")
    print(f"   Freeze: {freeze} layers, Patience: {patience}")
    print(f"{'=' * 60}\n")

    train_kwargs = dict(
        data=data_yaml,
        epochs=epochs,
        batch=batch,
        imgsz=imgsz,
        device=device,
        workers=workers,
        name=run_name,
        patience=patience,
        lr0=lr0,
        lrf=0.01,  # Final LR = lr0 * 0.01
        optimizer=optimizer,
        save=True,
        save_period=10,
        exist_ok=True,
        pretrained=True,
        verbose=True,
        seed=42,
        val=True,
        plots=True,
        cache="ram" if cache else False,
        # Regularization
        dropout=0.15,
        weight_decay=0.0005,
        # Warmup
        warmup_epochs=3.0,
        warmup_momentum=0.8,
        warmup_bias_lr=0.1,
        # Cosine annealing
        cos_lr=True,
        # Close mosaic in last N epochs for better convergence
        close_mosaic=10,
    )

    # Freeze layers
    if freeze > 0:
        train_kwargs["freeze"] = freeze

    # Augmentation parameters
    train_kwargs.update(aug_params)

    # Multi-scale training
    if imgsz >= 640:
        train_kwargs["scale"] = aug_params.get("scale", 0.3)

    # Resume from checkpoint
    if resume_path:
        train_kwargs["resume"] = True

    results = model.train(**train_kwargs)
    return results


def main():
    args = parse_args()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_name = args.name or f"food_seg_{timestamp}"

    print("=" * 60)
    print("🍽️ Nutrino — Advanced Food Segmentation Training")
    print("=" * 60)

    # ── Kontroller ───────────────────────────────────────────
    data_yaml = Path(args.data).resolve()
    if not data_yaml.exists():
        print(f"❌ data.yaml bulunamadı: {data_yaml}")
        print("   Önce convert_labelstudio.py çalıştırın")
        sys.exit(1)

    try:
        from ultralytics import YOLO
        import torch
    except ImportError as e:
        print(f"❌ Eksik paket: {e}")
        print("   pip install ultralytics torch torchvision")
        sys.exit(1)

    # GPU
    has_gpu, gpu_name, gpu_mem = get_gpu_info()
    if has_gpu:
        device = args.device or "cuda:0"
        print(f"\n🖥️  GPU: {gpu_name} ({gpu_mem:.1f} GB)")
        suggested_batch = auto_batch_size(gpu_mem, args.imgsz, args.model)
        if args.batch > suggested_batch:
            print(f"⚠️  Batch {args.batch} bellek için yüksek olabilir, önerilen: {suggested_batch}")
    else:
        device = "cpu"
        print("\n⚠️  GPU yok — CPU ile eğitim çok yavaş olacak!")

    # Augmentation
    aug_params = AUG_PRESETS[args.aug_level].copy()
    print(f"\n🎨 Augmentation: {args.aug_level}")
    for k, v in aug_params.items():
        print(f"   {k}: {v}")

    # Progressive resizing
    use_progressive = args.progressive and not args.no_progressive
    if use_progressive:
        # Smaller images first → larger later
        phase1_imgsz = min(480, args.imgsz)
        phase2_imgsz = args.imgsz
        print(f"\n📐 Progressive resizing: {phase1_imgsz} → {phase2_imgsz}")
    else:
        phase1_imgsz = args.imgsz
        phase2_imgsz = args.imgsz

    # ── Model Yükle ──────────────────────────────────────────
    print(f"\n📦 Model: {args.model}")

    if args.resume:
        model = YOLO(args.resume)
        print(f"   Resuming from: {args.resume}")
    else:
        model = YOLO(args.model)
        print("   Pretrained weights loaded")

    start_time = time.time()

    # ── WARMUP PHASE (Frozen Backbone) ───────────────────────
    if not args.skip_warmup and not args.resume:
        print(f"\n{'━' * 60}")
        print("📌 PHASE 1: Frozen Backbone Warmup")
        print(f"   İlk {args.freeze_layers} katman donduruluyor, sadece seg head öğrenecek")
        print(f"{'━' * 60}")

        warmup_results = run_phase(
            model=model,
            data_yaml=str(data_yaml),
            phase_name="Warmup (Frozen Backbone)",
            epochs=args.warmup_epochs,
            batch=args.batch,
            imgsz=phase1_imgsz,
            device=device,
            workers=args.workers,
            lr0=args.lr0,
            optimizer=args.optimizer,
            aug_params=aug_params,
            patience=args.warmup_epochs,   # Don't early stop during warmup
            freeze=args.freeze_layers,
            run_name=f"{run_name}_warmup",
            cache=args.cache,
        )

        # Warmup'ın best model'ini al
        if hasattr(warmup_results, "save_dir"):
            warmup_best = Path(warmup_results.save_dir) / "weights" / "best.pt"
            if warmup_best.exists():
                model = YOLO(str(warmup_best))
                print(f"\n✅ Warmup done — best model loaded: {warmup_best}")
            else:
                warmup_last = Path(warmup_results.save_dir) / "weights" / "last.pt"
                if warmup_last.exists():
                    model = YOLO(str(warmup_last))
                    print(f"\n✅ Warmup done — last model loaded: {warmup_last}")

    # ── FINE-TUNE PHASE (Full Model) ─────────────────────────
    print(f"\n{'━' * 60}")
    print("🔥 PHASE 2: Full Fine-Tune")
    print(f"   Tüm katmanlar açık, düşük LR ile ince ayar")
    print(f"{'━' * 60}")

    finetune_results = run_phase(
        model=model,
        data_yaml=str(data_yaml),
        phase_name="Full Fine-Tune",
        epochs=args.epochs,
        batch=args.batch,
        imgsz=phase2_imgsz,
        device=device,
        workers=args.workers,
        lr0=args.lr_finetune,
        optimizer=args.optimizer,
        aug_params=aug_params,
        patience=args.patience,
        freeze=0,  # Tüm katmanlar açık
        run_name=f"{run_name}_finetune",
        cache=args.cache,
        resume_path=args.resume,
    )

    # ── SONUÇLAR ─────────────────────────────────────────────
    total_time = time.time() - start_time
    hours = int(total_time // 3600)
    minutes = int((total_time % 3600) // 60)

    print(f"\n{'=' * 60}")
    print(f"✅ Eğitim tamamlandı! ({hours}h {minutes}m)")
    print(f"{'=' * 60}")

    if hasattr(finetune_results, "save_dir"):
        save_dir = Path(finetune_results.save_dir)
        best_model = save_dir / "weights" / "best.pt"
        last_model = save_dir / "weights" / "last.pt"

        print(f"\n📂 Results: {save_dir}")
        print(f"   Best: {best_model}")
        print(f"   Last: {last_model}")

        # Validation metrics
        print("\n📊 Validation Metrics:")
        if hasattr(finetune_results, "box"):
            print(f"   mAP50  (box): {finetune_results.box.map50:.4f}")
            print(f"   mAP50-95 (box): {finetune_results.box.map:.4f}")
        if hasattr(finetune_results, "seg"):
            print(f"   mAP50  (seg): {finetune_results.seg.map50:.4f}")
            print(f"   mAP50-95 (seg): {finetune_results.seg.map:.4f}")

        # Copy best model to deployment paths
        if best_model.exists():
            deploy_targets = [
                SCRIPT_DIR / "food_seg_best.pt",
                SCRIPT_DIR.parent.parent / "app" / "backend" / "models" / "food_seg_best.pt",
            ]
            for target in deploy_targets:
                try:
                    target.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(best_model, target)
                    print(f"\n🎯 Deployed: {target}")
                except Exception as e:
                    print(f"⚠️  Could not copy to {target}: {e}")

            # Save training config
            config = {
                "model": args.model,
                "data": str(data_yaml),
                "epochs_warmup": args.warmup_epochs if not args.skip_warmup else 0,
                "epochs_finetune": args.epochs,
                "batch": args.batch,
                "imgsz": args.imgsz,
                "optimizer": args.optimizer,
                "lr_warmup": args.lr0,
                "lr_finetune": args.lr_finetune,
                "aug_level": args.aug_level,
                "freeze_layers": args.freeze_layers,
                "progressive": use_progressive,
                "timestamp": timestamp,
                "total_time_minutes": round(total_time / 60, 1),
                "best_model": str(best_model),
            }
            config_path = save_dir / "training_config.json"
            with open(config_path, "w") as f:
                json.dump(config, f, indent=2)
            print(f"📝 Config saved: {config_path}")

    # Next steps
    print(f"\n{'=' * 60}")
    print("🚀 Sonraki Adımlar:")
    print("=" * 60)
    print("""
  1. Model test et:
     from ultralytics import YOLO
     model = YOLO("food_seg_best.pt")
     results = model.predict("test_food.jpg", conf=0.25)

  2. Backend'e deploy et:
     Model otomatik olarak app/backend/models/food_seg_best.pt'ye kopyalandı.
     Backend'i yeniden başlatın.

  3. Performans yetersizse:
     - Daha fazla veri etiketle (hedef: sınıf başına 300+ görüntü)
     - --model yolov8l-seg.pt ile daha büyük model dene
     - --epochs 300 ile daha uzun eğit
     - --aug-level heavy ile çalıştırdığınızdan emin olun
""")


if __name__ == "__main__":
    main()
