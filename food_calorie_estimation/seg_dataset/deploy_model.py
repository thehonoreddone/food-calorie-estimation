"""
Model Deploy Script — Eğitim sonrası otomatik model değiştirici
===============================================================
Eğitim bittikten sonra yeni food_seg_best.pt'yi uygulamaya
entegre eder; eski modeli yedekler.

Kullanım (train_food_seg_v2.py otomatik çağırır):
    python deploy_model.py --model ./runs/.../best.pt

Manuel çalıştırma:
    python deploy_model.py \
        --model "C:/path/to/best.pt" \
        --validate
"""

import argparse
import json
import shutil
import sys
from datetime import datetime
from pathlib import Path

SCRIPT_DIR   = Path(__file__).parent.resolve()
PROJECT_ROOT = SCRIPT_DIR.parent.parent
BACKEND_MODELS = PROJECT_ROOT / "app" / "backend" / "models"
SEG_DATASET_DIR = SCRIPT_DIR


def parse_args():
    p = argparse.ArgumentParser(description="Food Seg Model Deploy")
    p.add_argument("--model", required=True, help="Yeni .pt model yolu")
    p.add_argument("--validate", action="store_true",
                   help="Deploy öncesi modeli doğrula (test predict)")
    p.add_argument("--test-image", default=None,
                   help="Doğrulama için test görüntüsü yolu")
    return p.parse_args()


def validate_model(model_path: str, test_image: str = None) -> bool:
    """Modeli yükle ve basit predict ile doğrula."""
    print("\n🔍 Model doğrulanıyor...")
    try:
        from ultralytics import YOLO
        model = YOLO(model_path)
        
        # Model meta bilgisi
        nc = model.model.nc if hasattr(model.model, "nc") else "?"
        names = model.names if hasattr(model, "names") else {}
        print(f"   ✅ Model yüklendi")
        print(f"   📊 Sınıf sayısı: {nc}")
        print(f"   📋 İlk 10 sınıf: {list(names.values())[:10]}")
        
        # Test predict
        if test_image and Path(test_image).exists():
            results = model.predict(test_image, conf=0.1, verbose=False)
            print(f"   ✅ Test predict OK — {len(results[0].boxes)} tespit")
        
        return True
    except Exception as e:
        print(f"   ❌ Doğrulama hatası: {e}")
        return False


def deploy(model_path: str):
    """Modeli tüm hedef konumlara deploy et."""
    src = Path(model_path)
    if not src.exists():
        print(f"❌ Model bulunamadı: {src}")
        return False

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    deploy_map = {
        "seg_dataset/food_seg_best.pt": SEG_DATASET_DIR / "food_seg_best.pt",
        "backend/food_seg_best.pt":     BACKEND_MODELS / "food_seg_best.pt",
        "backend/food201_seg_best.pt":  BACKEND_MODELS / "food201_seg_best.pt",
    }

    print("\n📦 Deploy ediliyor...")
    for label, target in deploy_map.items():
        target.parent.mkdir(parents=True, exist_ok=True)
        
        # Eski modeli yedekle
        if target.exists():
            backup = target.with_name(f"{target.stem}_backup_{timestamp}{target.suffix}")
            shutil.copy2(target, backup)
            print(f"   📁 Yedeklendi: {backup.name}")
        
        shutil.copy2(src, target)
        size_mb = target.stat().st_size / 1e6
        print(f"   ✅ {label}  ({size_mb:.1f} MB)")

    # Deploy log
    log = {
        "timestamp": timestamp,
        "source": str(src),
        "deployed_to": [str(v) for v in deploy_map.values()],
        "model_size_mb": round(src.stat().st_size / 1e6, 1),
    }
    log_path = BACKEND_MODELS / f"deploy_log_{timestamp}.json"
    log_path.write_text(json.dumps(log, indent=2))
    print(f"\n📝 Deploy log: {log_path}")
    return True


def main():
    args = parse_args()

    print("=" * 60)
    print("🚀 Food Segmentation Model Deploy")
    print("=" * 60)

    if args.validate:
        ok = validate_model(args.model, args.test_image)
        if not ok:
            print("❌ Doğrulama başarısız — deploy iptal edildi")
            sys.exit(1)

    success = deploy(args.model)
    if success:
        print("\n✅ Deploy tamamlandı!")
        print("   Backend'i yeniden başlatmayı unutmayın.")
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
