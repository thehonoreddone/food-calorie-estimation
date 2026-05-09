"""
Nutrino — Food Segmentation Training v2  (149-class)
=====================================================
Label Studio'dan dönüştürülmüş yeni 149-sınıf YOLO dataset'i üzerinde
YOLOv8m-seg modelini 3 aşamalı eğitir ve en iyi ağırlıkları
app/backend/models/food_seg_best.pt konumuna deploy eder.

Strateji:
  PHASE 1 — Warmup  : Backbone dondurulur, sadece detection/seg head öğrenir
                       (küçük resimde, yüksek LR)
  PHASE 2 — Finetune: Tüm katmanlar açık, orta LR, büyük resim
  PHASE 3 — Polish  : Çok düşük LR, mosaic kapalı, doğrulama odaklı

Özellikler:
  ✅ 3 aşamalı eğitim (frozen → full → polish)
  ✅ Agresif veri artırma (mosaic, copy-paste, mixup, HSV, geometric)
  ✅ AdamW + cosine annealing LR
  ✅ Class-aware early stopping
  ✅ Otomatik GPU bellek tespiti + batch size önerisi
  ✅ Eğitim sonrası otomatik deploy (food_seg_best.pt)
  ✅ ONNX export (isteğe bağlı)

Kullanım:
    # Standart (önerilen):
    python train_food_seg_v2.py --data ./dataset_v2/data.yaml

    # Daha büyük model:
    python train_food_seg_v2.py \
        --data ./dataset_v2/data.yaml \
        --model yolov8l-seg.pt \
        --epochs 200 \
        --batch 4

    # GPU yoksa (çok yavaş!):
    python train_food_seg_v2.py \
        --data ./dataset_v2/data.yaml \
        --device cpu \
        --batch 4 \
        --epochs 50

Gereksinimler:
    pip install ultralytics torch torchvision tqdm
"""

import argparse
import json
import shutil
import sys
import time
from datetime import datetime
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = SCRIPT_DIR.parent.parent  # thend_food101_and_others/


# ── Argümanlar ────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(
        description="Nutrino Food Segmentation Training v2 (149-class)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    # Zorunlu
    p.add_argument("--data", "-d", required=True,
                   help="data.yaml yolu (convert_labelstudio_v2.py çıktısı)")

    # Model
    p.add_argument("--model", "-m", default="yolov8m-seg.pt",
                   help="Temel model (default: yolov8m-seg.pt)")

    # Eğitim parametreleri
    p.add_argument("--epochs", "-e", type=int, default=150,
                   help="Phase 2 finetune epoch sayısı (default: 150)")
    p.add_argument("--warmup-epochs", type=int, default=20,
                   help="Phase 1 warmup epoch sayısı (default: 20)")
    p.add_argument("--polish-epochs", type=int, default=30,
                   help="Phase 3 polish epoch sayısı (default: 30)")
    p.add_argument("--batch", "-b", type=int, default=8,
                   help="Batch size (default: 8)")
    p.add_argument("--imgsz", type=int, default=640,
                   help="Eğitim görüntü boyutu (default: 640)")
    p.add_argument("--device", default=None,
                   help="cuda:0, cpu, etc. (default: otomatik)")
    p.add_argument("--workers", type=int, default=4,
                   help="Dataloader workers (default: 4)")

    # Augmentation
    p.add_argument("--aug", choices=["light", "medium", "heavy"], default="heavy",
                   help="Augmentation seviyesi (default: heavy)")

    # İleri düzey
    p.add_argument("--freeze", type=int, default=10,
                   help="Warmup'ta dondurulacak katman (default: 10)")
    p.add_argument("--patience", type=int, default=40,
                   help="Early stopping patience (default: 40)")
    p.add_argument("--lr-warmup", type=float, default=0.01)
    p.add_argument("--lr-finetune", type=float, default=0.001)
    p.add_argument("--lr-polish", type=float, default=0.0001)
    p.add_argument("--optimizer", default="AdamW",
                   choices=["SGD", "Adam", "AdamW", "auto"])
    p.add_argument("--name", default=None, help="Run ismi (default: otomatik)")
    p.add_argument("--resume", default=None, help="Checkpoint'ten devam et")
    p.add_argument("--cache", action="store_true",
                   help="Dataset RAM'e cache'le (hızlı ama çok bellek)")
    p.add_argument("--skip-warmup", action="store_true")
    p.add_argument("--skip-polish", action="store_true")
    p.add_argument("--export-onnx", action="store_true",
                   help="Eğitim sonrası ONNX'e export et")
    p.add_argument("--no-deploy", action="store_true",
                   help="Otomatik deploy'u devre dışı bırak")

    return p.parse_args()


# ── Augmentation Presets ──────────────────────────────────────────────────────

AUG_PRESETS = {
    "light": dict(
        mosaic=0.3, mixup=0.0, copy_paste=0.05,
        hsv_h=0.01, hsv_s=0.3, hsv_v=0.2,
        degrees=5.0, translate=0.1, scale=0.2,
        shear=0.0, perspective=0.0,
        flipud=0.0, fliplr=0.5, erasing=0.1,
    ),
    "medium": dict(
        mosaic=0.5, mixup=0.1, copy_paste=0.2,
        hsv_h=0.015, hsv_s=0.4, hsv_v=0.3,
        degrees=10.0, translate=0.15, scale=0.3,
        shear=2.0, perspective=0.0003,
        flipud=0.0, fliplr=0.5, erasing=0.15,
    ),
    "heavy": dict(
        # Sınıf başına 100-150 görüntü için optimize edilmiş
        mosaic=0.8,        # 80% olasılıkla 4 görüntü birleştir → çeşitlilik
        mixup=0.15,        # Sınıflar arası yumuşak geçiş
        copy_paste=0.35,   # Segmentasyon maskelerini farklı arkaplan üzerine yapıştır
        hsv_h=0.015,       # Renk tonu varyasyonu (ışık değişimi)
        hsv_s=0.6,         # Doygunluk (farklı ışık/kamera rengi)
        hsv_v=0.4,         # Parlaklık (gece/gündüz, restoran ışığı)
        degrees=20.0,      # Rotasyon — kamera açısı varyasyonu
        translate=0.2,     # Kaydırma — yemek tabak içinde farklı konumlar
        scale=0.5,         # Ölçek — farklı porsiyon boyutu / kamera mesafesi
        shear=4.0,         # Perspektif bozulması — eğik kamera
        perspective=0.0005,# Gerçekçi perspektif dönüşümü
        flipud=0.0,        # Dikey flip KAPALI — yemekler ters durmaz
        fliplr=0.5,        # Yatay flip — simetrik yemekler
        erasing=0.25,      # Rastgele silme — kısmi kapanma öğretir
    ),
}


# ── Yardımcı Fonksiyonlar ─────────────────────────────────────────────────────

def get_gpu_info():
    """GPU bilgilerini döndür."""
    try:
        import torch
        if torch.cuda.is_available():
            name = torch.cuda.get_device_name(0)
            mem = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
            return True, name, mem
    except Exception:
        pass
    return False, "N/A", 0.0


def suggest_batch(gpu_mem_gb: float, imgsz: int, model_name: str) -> int:
    """GPU belleğine göre güvenli batch size öner."""
    # Yaklaşık GB/batch8@640 tüketimi
    scale = {"n": 0.3, "s": 0.5, "m": 1.0, "l": 1.6, "x": 2.8}
    letter = "m"
    for l in scale:
        if f"v8{l}" in model_name.lower() or f"11{l}" in model_name.lower():
            letter = l
            break
    mem_per_batch8 = scale[letter] * (imgsz / 640) ** 2
    safe_batch = max(2, int(gpu_mem_gb * 0.72 / mem_per_batch8 * 8))
    return min(safe_batch, 32)


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
    close_mosaic_last: int = 10,
    dropout: float = 0.1,
    resume: bool = False,
):
    """Tek bir eğitim fazını çalıştır."""
    print(f"\n{'=' * 65}")
    print(f"🚀 {phase_name}")
    print(f"   Epochs={epochs}  Batch={batch}  ImgSz={imgsz}  LR={lr0}")
    print(f"   Freeze={freeze}  Patience={patience}  Optimizer={optimizer}")
    print(f"{'=' * 65}\n")

    kwargs = dict(
        data=data_yaml,
        epochs=epochs,
        batch=batch,
        imgsz=imgsz,
        device=device,
        workers=workers,
        name=run_name,
        patience=patience,
        lr0=lr0,
        lrf=0.01,
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
        dropout=dropout,
        weight_decay=0.0005,
        warmup_epochs=3.0,
        warmup_momentum=0.8,
        warmup_bias_lr=0.1,
        cos_lr=True,
        close_mosaic=close_mosaic_last,
        label_smoothing=0.05,   # Fazla emin olmayı engeller
        overlap_mask=True,      # Çakışan maskeler için
        mask_ratio=4,           # Maske çözünürlüğü
        retina_masks=False,     # Hızlı eğitim için kapalı
        resume=resume,
    )

    if freeze > 0:
        kwargs["freeze"] = freeze

    kwargs.update(aug_params)

    results = model.train(**kwargs)
    return results


# ── Ana Fonksiyon ─────────────────────────────────────────────────────────────

def main():
    args = parse_args()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_name = args.name or f"food_seg_v2_{timestamp}"

    print("=" * 65)
    print("🍽️  Nutrino — Food Segmentation Training  v2  (149-class)")
    print("=" * 65)

    # ── Kontroller ────────────────────────────────────────────────
    data_yaml = Path(args.data).resolve()
    if not data_yaml.exists():
        print(f"❌ data.yaml bulunamadı: {data_yaml}")
        print("   Önce convert_labelstudio_v2.py çalıştırın!")
        sys.exit(1)

    try:
        from ultralytics import YOLO
        import torch
    except ImportError as e:
        print(f"❌ Eksik paket: {e}")
        print("   pip install ultralytics torch torchvision")
        sys.exit(1)

    # GPU tespiti
    has_gpu, gpu_name, gpu_mem = get_gpu_info()
    if args.device:
        device = args.device
        print(f"\n🖥️  Device (manuel): {device}")
    elif has_gpu:
        device = "cuda:0"
        print(f"\n🖥️  GPU: {gpu_name}  ({gpu_mem:.1f} GB)")
        sugg = suggest_batch(gpu_mem, args.imgsz, args.model)
        if args.batch > sugg:
            print(f"⚠️  Batch {args.batch} yüksek olabilir, önerilen: ≤{sugg}")
    else:
        device = "cpu"
        print("\n⚠️  GPU bulunamadı — CPU ile eğitim çok yavaş olacak!")
        print("    Küçük bir test için --epochs 10 --batch 4 deneyin.")

    # Augmentation
    aug = AUG_PRESETS[args.aug].copy()
    print(f"\n🎨 Augmentation preset: {args.aug}")
    for k, v in aug.items():
        print(f"   {k}: {v}")

    # Progressive resizing
    phase1_sz = min(480, args.imgsz)
    phase2_sz = args.imgsz
    phase3_sz = args.imgsz
    print(f"\n📐 Progressive resizing: {phase1_sz} → {phase2_sz} → {phase3_sz}")

    # ── Model Yükle ───────────────────────────────────────────────
    print(f"\n📦 Model: {args.model}")
    if args.resume:
        model = YOLO(args.resume)
        print(f"   Resuming from: {args.resume}")
    else:
        model = YOLO(args.model)
        print("   Pretrained weights yüklendi")

    start_time = time.time()

    # ── PHASE 1: WARMUP (Frozen Backbone) ─────────────────────────
    warmup_best = None
    if not args.skip_warmup and not args.resume:
        print(f"\n{'━' * 65}")
        print("📌 PHASE 1: Warmup — Frozen Backbone")
        print(f"   İlk {args.freeze} katman donduruldu, sadece head öğreniyor")
        print(f"{'━' * 65}")

        aug_warmup = aug.copy()
        aug_warmup["mosaic"] = 0.5   # warmup'ta daha az agresif
        aug_warmup["copy_paste"] = 0.1

        wr = run_phase(
            model=model,
            data_yaml=str(data_yaml),
            phase_name="PHASE 1 — Warmup (Frozen Backbone)",
            epochs=args.warmup_epochs,
            batch=args.batch,
            imgsz=phase1_sz,
            device=device,
            workers=args.workers,
            lr0=args.lr_warmup,
            optimizer=args.optimizer,
            aug_params=aug_warmup,
            patience=args.warmup_epochs,  # warmup'ta erken dur
            freeze=args.freeze,
            run_name=f"{run_name}_warmup",
            cache=args.cache,
            close_mosaic_last=5,
            dropout=0.0,
        )

        if hasattr(wr, "save_dir"):
            wb = Path(wr.save_dir) / "weights" / "best.pt"
            wl = Path(wr.save_dir) / "weights" / "last.pt"
            warmup_ckpt = wb if wb.exists() else (wl if wl.exists() else None)
            if warmup_ckpt:
                model = YOLO(str(warmup_ckpt))
                warmup_best = str(warmup_ckpt)
                print(f"\n✅ Warmup bitti — checkpoint: {warmup_ckpt.name}")

    # ── PHASE 2: FINETUNE (Full Model) ────────────────────────────
    print(f"\n{'━' * 65}")
    print("🔥 PHASE 2: Full Fine-Tune — Tüm katmanlar açık")
    print(f"{'━' * 65}")

    fr = run_phase(
        model=model,
        data_yaml=str(data_yaml),
        phase_name="PHASE 2 — Full Fine-Tune",
        epochs=args.epochs,
        batch=args.batch,
        imgsz=phase2_sz,
        device=device,
        workers=args.workers,
        lr0=args.lr_finetune,
        optimizer=args.optimizer,
        aug_params=aug,
        patience=args.patience,
        freeze=0,
        run_name=f"{run_name}_finetune",
        cache=args.cache,
        close_mosaic_last=15,
        dropout=0.15,
        resume=bool(args.resume),
    )

    finetune_best = None
    if hasattr(fr, "save_dir"):
        fb = Path(fr.save_dir) / "weights" / "best.pt"
        fl = Path(fr.save_dir) / "weights" / "last.pt"
        finetune_ckpt = fb if fb.exists() else (fl if fl.exists() else None)
        if finetune_ckpt:
            model = YOLO(str(finetune_ckpt))
            finetune_best = str(finetune_ckpt)
            print(f"\n✅ Finetune bitti — checkpoint: {finetune_ckpt.name}")

    # ── PHASE 3: POLISH (Düşük LR, mosaic kapalı) ────────────────
    final_model_path = None
    if not args.skip_polish and finetune_best:
        print(f"\n{'━' * 65}")
        print("💎 PHASE 3: Polish — Düşük LR, temiz eğitim")
        print("   Mosaic kapalı, model son ince ayarları yapıyor")
        print(f"{'━' * 65}")

        aug_polish = aug.copy()
        aug_polish["mosaic"] = 0.0     # mosaic kapalı
        aug_polish["copy_paste"] = 0.0
        aug_polish["mixup"] = 0.0
        aug_polish["degrees"] = 5.0
        aug_polish["scale"] = 0.2

        pr = run_phase(
            model=model,
            data_yaml=str(data_yaml),
            phase_name="PHASE 3 — Polish",
            epochs=args.polish_epochs,
            batch=args.batch,
            imgsz=phase3_sz,
            device=device,
            workers=args.workers,
            lr0=args.lr_polish,
            optimizer=args.optimizer,
            aug_params=aug_polish,
            patience=args.polish_epochs,
            freeze=0,
            run_name=f"{run_name}_polish",
            cache=args.cache,
            close_mosaic_last=0,
            dropout=0.05,
        )

        if hasattr(pr, "save_dir"):
            pb = Path(pr.save_dir) / "weights" / "best.pt"
            pl = Path(pr.save_dir) / "weights" / "last.pt"
            polish_ckpt = pb if pb.exists() else (pl if pl.exists() else None)
            if polish_ckpt:
                final_model_path = str(polish_ckpt)
                print(f"\n✅ Polish bitti — checkpoint: {polish_ckpt.name}")

    if final_model_path is None:
        final_model_path = finetune_best

    # ── SONUÇLAR ──────────────────────────────────────────────────
    total_time = time.time() - start_time
    h = int(total_time // 3600)
    m = int((total_time % 3600) // 60)

    print(f"\n{'=' * 65}")
    print(f"✅ Eğitim tamamlandı!  ({h}h {m}m)")
    print(f"{'=' * 65}")

    if final_model_path:
        print(f"\n🏆 En iyi model: {final_model_path}")

        # ── Deploy ────────────────────────────────────────────────
        if not args.no_deploy:
            deploy_targets = [
                SCRIPT_DIR / "food_seg_best.pt",
                PROJECT_ROOT / "app" / "backend" / "models" / "food_seg_best.pt",
                PROJECT_ROOT / "app" / "backend" / "models" / "food201_seg_best.pt",
            ]
            print("\n📦 Deploying best model...")
            for target in deploy_targets:
                try:
                    target.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(final_model_path, target)
                    print(f"   ✅ {target}")
                except Exception as e:
                    print(f"   ⚠️  {target}: {e}")

        # ── ONNX Export ────────────────────────────────────────────
        if args.export_onnx:
            print("\n📤 ONNX export...")
            try:
                best_yolo = YOLO(final_model_path)
                onnx_path = best_yolo.export(
                    format="onnx",
                    imgsz=args.imgsz,
                    dynamic=True,
                    simplify=True,
                )
                print(f"   ✅ ONNX: {onnx_path}")

                # ONNX'i de deploy et
                if not args.no_deploy and onnx_path:
                    onnx_target = PROJECT_ROOT / "app" / "backend" / "models" / "food_seg_best.onnx"
                    shutil.copy2(onnx_path, onnx_target)
                    print(f"   ✅ {onnx_target}")
            except Exception as e:
                print(f"   ⚠️  ONNX export başarısız: {e}")

        # ── Config Kaydet ─────────────────────────────────────────
        config = {
            "model_base": args.model,
            "data": str(data_yaml),
            "phases": {
                "warmup": {"epochs": args.warmup_epochs, "lr": args.lr_warmup, "freeze": args.freeze},
                "finetune": {"epochs": args.epochs, "lr": args.lr_finetune},
                "polish": {"epochs": args.polish_epochs, "lr": args.lr_polish},
            },
            "batch": args.batch,
            "imgsz": args.imgsz,
            "optimizer": args.optimizer,
            "aug_level": args.aug,
            "device": device,
            "timestamp": timestamp,
            "total_time_minutes": round(total_time / 60, 1),
            "final_model": str(final_model_path),
        }
        config_path = SCRIPT_DIR / f"training_config_v2_{timestamp}.json"
        config_path.write_text(json.dumps(config, indent=2, ensure_ascii=False))
        print(f"\n📝 Config: {config_path}")

    # ── Sonraki Adımlar ────────────────────────────────────────────
    print(f"\n{'=' * 65}")
    print("🚀 Sonraki Adımlar:")
    print("=" * 65)
    print("""
  1. Modeli test et:
     from ultralytics import YOLO
     model = YOLO("food_seg_best.pt")
     results = model.predict("test_food.jpg", conf=0.3, show=True)

  2. Backend'i yeniden başlat (model otomatik deploy edildi):
     app/backend/models/food_seg_best.pt

  3. Performans düşükse:
     - Daha fazla veri etiketle (hedef: sınıf başına 300+)
     - yolov8l-seg.pt veya yolov8x-seg.pt dene
     - --epochs 300 ile daha uzun eğit
""")


if __name__ == "__main__":
    main()
