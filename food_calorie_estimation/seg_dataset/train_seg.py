"""
FoodSeg103 YOLOv8-seg Training Script
======================================
Bu script, hazırlanan FoodSeg103 dataseti üzerinde YOLOv8-seg modelini eğitir.

Özellikler:
- 103 yemek sınıfı için instance segmentation
- Transfer learning (yolov8n-seg pretrained)
- Mixed precision training (FP16)
- Otomatik checkpoint kaydetme

Kullanım:
    cd food_calorie_estimation/seg_dataset
    
    # Temel eğitim
    python train_seg.py
    
    # Özel parametrelerle
    python train_seg.py --epochs 100 --batch 16 --imgsz 640

Gereksinimler:
    pip install ultralytics

Çıktı:
    runs/segment/foodseg103/weights/best.pt  -> En iyi model
    runs/segment/foodseg103/weights/last.pt  -> Son model
"""

import argparse
import sys
from pathlib import Path
import shutil

# Script dizini
SCRIPT_DIR = Path(__file__).parent.resolve()
DATASET_DIR = SCRIPT_DIR / "dataset"
DATA_YAML = DATASET_DIR / "data.yaml"


def parse_args():
    """Komut satırı argümanlarını parse et."""
    parser = argparse.ArgumentParser(
        description="FoodSeg103 YOLOv8-seg Training",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument(
        '--model', '-m',
        type=str,
        default='yolov8n-seg.pt',
        help='Başlangıç modeli (default: yolov8n-seg.pt pretrained)'
    )
    
    parser.add_argument(
        '--epochs', '-e',
        type=int,
        default=50,
        help='Eğitim epoch sayısı (default: 50)'
    )
    
    parser.add_argument(
        '--batch', '-b',
        type=int,
        default=8,
        help='Batch size (default: 8, GPU belleğine göre ayarla)'
    )
    
    parser.add_argument(
        '--imgsz', '-i',
        type=int,
        default=640,
        help='Input görüntü boyutu (default: 640)'
    )
    
    parser.add_argument(
        '--device',
        type=str,
        default=None,
        help='Device (cuda:0, cpu, vb. Default: auto)'
    )
    
    parser.add_argument(
        '--workers',
        type=int,
        default=4,
        help='DataLoader worker sayısı (default: 4)'
    )
    
    parser.add_argument(
        '--name',
        type=str,
        default='foodseg103',
        help='Eğitim run adı (default: foodseg103)'
    )
    
    parser.add_argument(
        '--resume',
        type=str,
        default=None,
        help='Checkpoint path (eğitime devam etmek için)'
    )
    
    parser.add_argument(
        '--patience',
        type=int,
        default=20,
        help='Early stopping patience (default: 20)'
    )
    
    parser.add_argument(
        '--lr0',
        type=float,
        default=0.01,
        help='Initial learning rate (default: 0.01)'
    )
    
    parser.add_argument(
        '--optimizer',
        type=str,
        default='auto',
        choices=['SGD', 'Adam', 'AdamW', 'auto'],
        help='Optimizer (default: auto)'
    )
    
    parser.add_argument(
        '--augment',
        action='store_true',
        default=True,
        help='Data augmentation kullan (default: True)'
    )
    
    parser.add_argument(
        '--no-augment',
        action='store_true',
        help='Data augmentation kapalı'
    )
    
    parser.add_argument(
        '--cache',
        action='store_true',
        help='Dataset RAM\'e cache\'le (hızlı ama çok RAM kullanır)'
    )
    
    parser.add_argument(
        '--pretrained',
        action='store_true',
        default=True,
        help='Pretrained weights kullan (default: True)'
    )
    
    parser.add_argument(
        '--freeze',
        type=int,
        default=0,
        help='Dondurulacak layer sayısı (transfer learning için)'
    )
    
    parser.add_argument(
        '--val',
        action='store_true',
        default=True,
        help='Eğitim sırasında validation yap'
    )
    
    parser.add_argument(
        '--plots',
        action='store_true',
        default=True,
        help='Eğitim grafikleri oluştur'
    )
    
    return parser.parse_args()


def check_dataset():
    """Dataset'in hazır olup olmadığını kontrol et."""
    if not DATA_YAML.exists():
        print("❌ data.yaml bulunamadı!")
        print(f"   Beklenen konum: {DATA_YAML}")
        print("\n🔧 Önce dataset hazırla:")
        print("   python prepare_dataset.py")
        return False
    
    # Train ve val klasörlerini kontrol et
    train_images = DATASET_DIR / "images" / "train"
    val_images = DATASET_DIR / "images" / "val"
    
    if not train_images.exists() or not list(train_images.glob("*.jpg")):
        print("❌ Train görselleri bulunamadı!")
        print(f"   Beklenen konum: {train_images}")
        return False
    
    train_count = len(list(train_images.glob("*.jpg")))
    val_count = len(list(val_images.glob("*.jpg"))) if val_images.exists() else 0
    
    print(f"✅ Dataset bulundu:")
    print(f"   Train: {train_count} görsel")
    print(f"   Val: {val_count} görsel")
    
    return True


def main():
    """Ana eğitim fonksiyonu."""
    args = parse_args()
    
    print("=" * 60)
    print("🍕 FoodSeg103 YOLOv8-seg Training")
    print("=" * 60)
    
    # Dataset kontrolü
    if not check_dataset():
        sys.exit(1)
    
    # Ultralytics import
    try:
        from ultralytics import YOLO
    except ImportError:
        print("❌ ultralytics paketi yüklü değil!")
        print("   Yüklemek için: pip install ultralytics")
        sys.exit(1)
    
    # GPU kontrolü
    import torch
    if torch.cuda.is_available():
        device = args.device or 'cuda:0'
        gpu_name = torch.cuda.get_device_name(0)
        gpu_mem = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        print(f"\n🖥️ GPU: {gpu_name} ({gpu_mem:.1f} GB)")
    else:
        device = 'cpu'
        print("\n⚠️ GPU bulunamadı, CPU kullanılacak (yavaş olacak!)")
    
    # Model yükle
    print(f"\n📦 Model yükleniyor: {args.model}")
    
    if args.resume:
        # Eğitime devam et
        model = YOLO(args.resume)
        print(f"   Checkpoint'tan devam ediliyor: {args.resume}")
    else:
        model = YOLO(args.model)
        print("   Pretrained weights yüklendi")
    
    # Augmentation ayarı
    augment = args.augment and not args.no_augment
    
    # Eğitim parametreleri
    print(f"\n⚙️ Eğitim Parametreleri:")
    print(f"   Epochs: {args.epochs}")
    print(f"   Batch size: {args.batch}")
    print(f"   Image size: {args.imgsz}")
    print(f"   Device: {device}")
    print(f"   Workers: {args.workers}")
    print(f"   Augmentation: {augment}")
    print(f"   Patience: {args.patience}")
    print(f"   LR0: {args.lr0}")
    
    # Eğitimi başlat
    print("\n" + "=" * 60)
    print("🚀 Eğitim başlıyor...")
    print("=" * 60 + "\n")
    
    try:
        results = model.train(
            data=str(DATA_YAML),
            epochs=args.epochs,
            batch=args.batch,
            imgsz=args.imgsz,
            device=device,
            workers=args.workers,
            name=args.name,
            patience=args.patience,
            lr0=args.lr0,
            optimizer=args.optimizer,
            augment=augment,
            cache=args.cache,
            freeze=args.freeze if args.freeze > 0 else None,
            val=args.val,
            plots=args.plots,
            save=True,
            save_period=10,  # Her 10 epoch'ta checkpoint kaydet
            exist_ok=True,
            pretrained=args.pretrained,
            verbose=True,
            seed=42,
            
            # Segmentation-specific augmentations
            mosaic=0.5 if augment else 0,
            mixup=0.1 if augment else 0,
            copy_paste=0.1 if augment else 0,
            
            # Regularization
            dropout=0.1,
            
            # Multi-scale training
            scale=0.5 if augment else 0,
        )
        
        print("\n" + "=" * 60)
        print("✅ Eğitim tamamlandı!")
        print("=" * 60)
        
        # Sonuçları göster
        if hasattr(results, 'save_dir'):
            save_dir = Path(results.save_dir)
            best_model = save_dir / "weights" / "best.pt"
            last_model = save_dir / "weights" / "last.pt"
            
            print(f"\n📂 Sonuçlar: {save_dir}")
            print(f"   Best model: {best_model}")
            print(f"   Last model: {last_model}")
            
            # Best model'i ana klasöre kopyala
            output_model = SCRIPT_DIR / "foodseg103_best.pt"
            if best_model.exists():
                shutil.copy(best_model, output_model)
                print(f"\n🎯 Best model kopyalandı: {output_model}")
                
                # Modeli projenin ana klasörüne de kopyala
                project_root = SCRIPT_DIR.parent.parent
                project_model = project_root / "foodseg103_seg.pt"
                shutil.copy(best_model, project_model)
                print(f"   Proje klasörüne de kopyalandı: {project_model}")
        
        # Validation metrikleri
        print("\n📊 Validation Metrikleri:")
        if hasattr(results, 'box'):
            print(f"   mAP50 (box): {results.box.map50:.4f}")
            print(f"   mAP50-95 (box): {results.box.map:.4f}")
        if hasattr(results, 'seg'):
            print(f"   mAP50 (seg): {results.seg.map50:.4f}")
            print(f"   mAP50-95 (seg): {results.seg.map:.4f}")
        
        # Kullanım talimatları
        print("\n" + "=" * 60)
        print("🚀 Modeli kullanmak için:")
        print("=" * 60)
        print(f"""
    from ultralytics import YOLO
    
    # Model yükle
    model = YOLO("{output_model}")
    
    # Inference
    results = model.predict("food_image.jpg")
    
    # Sonuçları işle
    for result in results:
        masks = result.masks  # Segmentation masks
        boxes = result.boxes  # Bounding boxes
        names = result.names  # Class names
""")
        
    except Exception as e:
        print(f"\n❌ Eğitim hatası: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
