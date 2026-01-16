"""
FoodSeg103 Dataset Preparation for YOLOv8-seg Training
========================================================
Bu script, FoodSeg103 datasetini HuggingFace'den indirir ve YOLOv8-seg formatına dönüştürür.

FoodSeg103: 103 yemek sınıfı + 1 background sınıfı içerir.
Segmentasyon mask'larını polygon formatına çevirir.

Kullanım:
    cd food_calorie_estimation/seg_dataset
    python prepare_dataset.py

Çıktı:
    dataset/
    ├── images/
    │   ├── train/
    │   └── val/
    ├── labels/
    │   ├── train/
    │   └── val/
    └── data.yaml
"""

import os
import sys
from pathlib import Path
import cv2
import numpy as np
from tqdm import tqdm
import yaml
import json

# =========================
# CONFIG
# =========================
SCRIPT_DIR = Path(__file__).parent.resolve()
OUT_ROOT = SCRIPT_DIR / "dataset"
IMG_SIZE = 640  # YOLOv8 için standart boyut

# Dizinleri oluştur
(OUT_ROOT / "images" / "train").mkdir(parents=True, exist_ok=True)
(OUT_ROOT / "images" / "val").mkdir(parents=True, exist_ok=True)
(OUT_ROOT / "labels" / "train").mkdir(parents=True, exist_ok=True)
(OUT_ROOT / "labels" / "val").mkdir(parents=True, exist_ok=True)

print("=" * 60)
print("FoodSeg103 Dataset Hazırlama")
print("=" * 60)

# =========================
# LOAD DATASET
# =========================
print("\n📥 FoodSeg103 dataset indiriliyor...")

try:
    from datasets import load_dataset
except ImportError:
    print("❌ 'datasets' paketi yüklü değil!")
    print("   Yüklemek için: pip install datasets")
    sys.exit(1)

# FoodSeg103 datasetini yükle
ds = load_dataset("EduardoPacheco/FoodSeg103")

# Split isimlerini kontrol et
available_splits = list(ds.keys())
print(f"✅ Mevcut split'ler: {available_splits}")

# Class names al - FoodSeg103 features yapısını kontrol et
if "train" in ds:
    features = ds["train"].features
    
    # Label features'ı bul - farklı format olabilir
    if "label" in features:
        label_feature = features["label"]
        # ClassLabel tipinde mi kontrol et
        if hasattr(label_feature, 'names'):
            class_names = label_feature.names
        elif hasattr(label_feature, 'feature') and hasattr(label_feature.feature, 'names'):
            class_names = label_feature.feature.names
        else:
            # Manuel class names - FoodSeg103 için
            print("⚠️ Class names otomatik alınamadı, manuel liste kullanılıyor...")
            class_names = [f"food_{i}" for i in range(104)]  # 103 food + 1 background
    else:
        print("⚠️ 'label' feature bulunamadı. Features:", list(features.keys()))
        class_names = [f"food_{i}" for i in range(104)]
else:
    print("⚠️ 'train' split bulunamadı!")
    class_names = [f"food_{i}" for i in range(104)]

num_classes = len(class_names)
print(f"✅ Toplam sınıf sayısı: {num_classes}")

# Background sınıfını (index 0) çıkar - YOLO için
# YOLOv8-seg'de class ID'ler 0'dan başlar ve background yoktur
food_class_names = class_names[1:] if class_names[0].lower() in ['background', 'bg', 'food_0'] else class_names
num_food_classes = len(food_class_names)
print(f"✅ Yemek sınıfı sayısı (background hariç): {num_food_classes}")

# =========================
# MASK → POLYGON (Geliştirilmiş)
# =========================
def mask_to_polygons(mask: np.ndarray, class_id: int, min_area: int = 100):
    """
    Binary mask'tan polygon koordinatları çıkar.
    
    Args:
        mask: (H, W) semantic segmentation mask
        class_id: Çıkarılacak sınıf ID'si
        min_area: Minimum polygon alanı (gürültü filtresi)
    
    Returns:
        List of contours (her biri (N, 1, 2) shaped numpy array)
    """
    binary = (mask == class_id).astype(np.uint8)
    
    # Gürültüyü azalt
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
    
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Küçük contour'ları filtrele
    filtered_contours = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area >= min_area and len(cnt) >= 3:
            # Polygon'u basitleştir (nokta sayısını azalt)
            epsilon = 0.002 * cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, epsilon, True)
            if len(approx) >= 3:
                filtered_contours.append(approx)
    
    return filtered_contours

# =========================
# PROCESS SPLIT (Geliştirilmiş)
# =========================
def process_split(split_name: str, target_name: str = None):
    """
    Bir split'i işle ve YOLOv8 formatına dönüştür.
    
    Args:
        split_name: Dataset split adı ('train', 'test', 'validation')
        target_name: Hedef klasör adı (None ise split_name kullanılır)
    """
    if split_name not in ds:
        print(f"⚠️ '{split_name}' split bulunamadı, atlanıyor...")
        return 0
    
    target = target_name or split_name
    if target == "test":
        target = "val"  # YOLOv8 'val' bekler
    if target == "validation":
        target = "val"
    
    split_data = ds[split_name]
    processed = 0
    skipped = 0
    
    print(f"\n📦 '{split_name}' split işleniyor -> '{target}' klasörüne...")
    
    for i, sample in enumerate(tqdm(split_data, desc=f"  {split_name}")):
        try:
            # Image ve label al
            img = np.array(sample["image"])
            mask = np.array(sample["label"])
            
            # RGB kontrolü
            if len(img.shape) == 2:
                img = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
            elif img.shape[2] == 4:
                img = cv2.cvtColor(img, cv2.COLOR_RGBA2RGB)
            
            # BGR'ye çevir (OpenCV için)
            img_bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
            
            orig_h, orig_w = img_bgr.shape[:2]
            
            # Resize (optional)
            if IMG_SIZE:
                img_bgr = cv2.resize(img_bgr, (IMG_SIZE, IMG_SIZE))
                mask = cv2.resize(mask, (IMG_SIZE, IMG_SIZE), interpolation=cv2.INTER_NEAREST)
            
            h, w = img_bgr.shape[:2]
            img_name = f"{i:06d}.jpg"
            
            # Image kaydet
            img_path = OUT_ROOT / "images" / target / img_name
            cv2.imwrite(str(img_path), img_bgr)
            
            # Label oluştur
            label_lines = []
            
            # Mask'taki benzersiz sınıfları bul
            unique_classes = np.unique(mask)
            
            for cid in unique_classes:
                if cid == 0:
                    continue  # Background'u atla
                
                # YOLOv8 class ID'si (0-indexed, background hariç)
                yolo_class_id = cid - 1
                
                if yolo_class_id < 0 or yolo_class_id >= num_food_classes:
                    continue
                
                polys = mask_to_polygons(mask, cid)
                
                for poly in polys:
                    if len(poly) < 3:
                        continue
                    
                    poly = poly.squeeze()
                    
                    if len(poly.shape) != 2 or poly.shape[1] != 2:
                        continue
                    
                    # Normalize koordinatlar (0-1 arası)
                    poly_norm = []
                    for x, y in poly:
                        poly_norm.append(f"{x / w:.6f}")
                        poly_norm.append(f"{y / h:.6f}")
                    
                    if len(poly_norm) >= 6:  # En az 3 nokta (6 koordinat)
                        label_lines.append(f"{yolo_class_id} " + " ".join(poly_norm))
            
            # Label dosyası kaydet
            label_path = OUT_ROOT / "labels" / target / img_name.replace('.jpg', '.txt')
            with open(label_path, "w") as f:
                f.write("\n".join(label_lines))
            
            processed += 1
            
        except Exception as e:
            print(f"\n⚠️ Örnek {i} işlenirken hata: {e}")
            skipped += 1
            continue
    
    print(f"  ✅ İşlenen: {processed}, Atlanan: {skipped}")
    return processed

# =========================
# RUN
# =========================
print("\n" + "=" * 60)
print("📦 Dataset dönüşümü başlıyor...")
print("=" * 60)

total_train = 0
total_val = 0

# Train split
if "train" in available_splits:
    total_train = process_split("train", "train")

# Validation/Test split - FoodSeg103'te "test" veya "validation" olabilir
if "validation" in available_splits:
    total_val = process_split("validation", "val")
elif "test" in available_splits:
    total_val = process_split("test", "val")

print(f"\n📊 Özet:")
print(f"   Train: {total_train} görsel")
print(f"   Val: {total_val} görsel")

# =========================
# data.yaml (YOLOv8 format)
# =========================
data_yaml = {
    "path": str(OUT_ROOT.resolve()),
    "train": "images/train",
    "val": "images/val",
    "nc": num_food_classes,
    "names": food_class_names
}

yaml_path = OUT_ROOT / "data.yaml"
with open(yaml_path, "w", encoding="utf-8") as f:
    yaml.dump(data_yaml, f, default_flow_style=False, allow_unicode=True)

print(f"\n✅ data.yaml oluşturuldu: {yaml_path}")

# =========================
# class_names.json (Projedeki diğer modüller için)
# =========================
class_names_path = OUT_ROOT / "class_names.json"
with open(class_names_path, "w", encoding="utf-8") as f:
    json.dump(food_class_names, f, indent=2, ensure_ascii=False)

print(f"✅ class_names.json oluşturuldu: {class_names_path}")

# =========================
# SUMMARY
# =========================
print("\n" + "=" * 60)
print("✅ DATASET HAZIR (YOLOv8-seg formatı)")
print("=" * 60)
print(f"\n📂 Çıktı dizini: {OUT_ROOT}")
print(f"📊 Sınıf sayısı: {num_food_classes}")
print(f"\n🚀 Eğitim için:")
print(f"   python train_seg.py")
print("\n" + "=" * 60)
