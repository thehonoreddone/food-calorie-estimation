"""
Label Studio JSON → YOLO Segmentation Format Converter
=======================================================
Label Studio'dan export edilen polygon annotation JSON dosyasını
YOLO segmentation format'ına dönüştürür.

Çıktı yapısı:
    dataset_labelstudio/
    ├── data.yaml
    ├── images/
    │   ├── train/
    │   └── val/
    └── labels/
        ├── train/    (YOLO .txt formatında polygon koordinatları)
        └── val/

Kullanım:
    cd food_calorie_estimation/seg_dataset

    python convert_labelstudio.py \
        --json "../../project-3-at-2026-03-26-19-36-09024ed5.json" \
        --images "C:/Users/User/Desktop/labelstudio-sam/dataset_200" \
        --output "./dataset_labelstudio" \
        --val-ratio 0.15

Gereksinimler:
    pip install Pillow tqdm
"""

import argparse
import json
import os
import random
import shutil
import sys
import urllib.parse
from collections import Counter, defaultdict
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from tqdm import tqdm


def parse_args():
    parser = argparse.ArgumentParser(
        description="Label Studio JSON → YOLO Segmentation Format Converter"
    )
    parser.add_argument(
        "--json", "-j",
        required=True,
        help="Label Studio JSON export file path"
    )
    parser.add_argument(
        "--images", "-i",
        required=True,
        help="Root directory containing the original images (dataset_200 folder)"
    )
    parser.add_argument(
        "--output", "-o",
        default="./dataset_labelstudio",
        help="Output directory for YOLO dataset (default: ./dataset_labelstudio)"
    )
    parser.add_argument(
        "--val-ratio",
        type=float,
        default=0.15,
        help="Validation split ratio (default: 0.15)"
    )
    parser.add_argument(
        "--min-points",
        type=int,
        default=3,
        help="Minimum polygon points to include (default: 3)"
    )
    parser.add_argument(
        "--min-images-per-class",
        type=int,
        default=5,
        help="Minimum images per class to include class (default: 5)"
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for train/val split (default: 42)"
    )
    return parser.parse_args()


def extract_image_path(data_field: dict, images_root: str) -> Optional[str]:
    """
    Label Studio'nun data.image alanından gerçek dosya yolunu çıkar.
    
    Format örnekleri:
    - /data/local-files/?d=dataset_200%5Chamburger%5C100057.jpg
    - /data/upload/1/image.jpg
    """
    image_url = data_field.get("image", "")
    
    if not image_url:
        return None
    
    # Local-files format: /data/local-files/?d=dataset_200%5Chamburger%5C100057.jpg
    if "local-files" in image_url:
        # d= parametresinden path'i çıkar
        if "?d=" in image_url:
            relative_path = image_url.split("?d=")[-1]
            # URL decode
            relative_path = urllib.parse.unquote(relative_path)
            # Backslash → forward slash
            relative_path = relative_path.replace("\\", "/")
            
            # dataset_200/ prefix'ini kaldır (eğer images_root zaten bunu içeriyorsa)
            images_root_name = os.path.basename(images_root.rstrip("/\\"))
            if relative_path.startswith(images_root_name + "/"):
                relative_path = relative_path[len(images_root_name) + 1:]
            elif relative_path.startswith("dataset_200/"):
                relative_path = relative_path[len("dataset_200/"):]
            
            full_path = os.path.join(images_root, relative_path)
            return full_path
    
    return None


def convert_polygon_to_yolo(
    points: List[List[float]],
    original_width: int,
    original_height: int,
) -> List[float]:
    """
    Label Studio polygon points'i YOLO segmentation formatına dönüştür.
    
    Label Studio: [[x%, y%], ...]  (yüzde olarak, 0-100)
    YOLO: [x1_norm y1_norm x2_norm y2_norm ...]  (normalize, 0-1)
    """
    yolo_points = []
    for point in points:
        x_percent, y_percent = point[0], point[1]
        # Yüzde → normalize (0-1)
        x_norm = max(0.0, min(1.0, x_percent / 100.0))
        y_norm = max(0.0, min(1.0, y_percent / 100.0))
        yolo_points.extend([x_norm, y_norm])
    
    return yolo_points


def process_annotations(
    data: list,
    images_root: str,
    min_points: int = 3,
) -> Tuple[List[dict], Dict[str, int], Counter]:
    """
    Label Studio JSON'dan annotation'ları işle.
    
    Returns:
        - processed: Her biri {image_path, annotations: [{class_name, yolo_points}]} olan liste
        - class_to_id: Sınıf adı → ID mapping
        - class_counts: Her sınıftan kaç annotation var
    """
    all_classes = set()
    class_counts = Counter()
    
    # İlk geçiş: Tüm sınıfları topla
    for task in data:
        annotations = task.get("annotations", [])
        for annotation in annotations:
            if annotation.get("was_cancelled", False):
                continue
            for result in annotation.get("result", []):
                if result.get("type") != "polygonlabels":
                    continue
                labels = result.get("value", {}).get("polygonlabels", [])
                for label in labels:
                    all_classes.add(label)
                    class_counts[label] += 1
    
    # Sınıfları sırala ve ID ata
    sorted_classes = sorted(all_classes)
    class_to_id = {name: idx for idx, name in enumerate(sorted_classes)}
    
    # İkinci geçiş: Annotation'ları işle
    processed = []
    skipped_no_image = 0
    skipped_few_points = 0
    
    for task in tqdm(data, desc="Processing annotations"):
        annotations_list = task.get("annotations", [])
        data_field = task.get("data", {})
        
        # Görüntü yolunu bul
        image_path = extract_image_path(data_field, images_root)
        if not image_path:
            skipped_no_image += 1
            continue
        
        task_annotations = []
        
        for annotation in annotations_list:
            if annotation.get("was_cancelled", False):
                continue
            
            for result in annotation.get("result", []):
                if result.get("type") != "polygonlabels":
                    continue
                
                value = result.get("value", {})
                points = value.get("points", [])
                labels = value.get("polygonlabels", [])
                orig_w = result.get("original_width", 0)
                orig_h = result.get("original_height", 0)
                
                if len(points) < min_points:
                    skipped_few_points += 1
                    continue
                
                for label in labels:
                    class_id = class_to_id[label]
                    yolo_points = convert_polygon_to_yolo(points, orig_w, orig_h)
                    
                    task_annotations.append({
                        "class_id": class_id,
                        "class_name": label,
                        "yolo_points": yolo_points,
                    })
        
        if task_annotations:
            processed.append({
                "image_path": image_path,
                "annotations": task_annotations,
            })
    
    print(f"\n📊 Processing Summary:")
    print(f"   Total tasks: {len(data)}")
    print(f"   Processed images: {len(processed)}")
    print(f"   Skipped (no image): {skipped_no_image}")
    print(f"   Skipped (few points): {skipped_few_points}")
    
    return processed, class_to_id, class_counts


def stratified_split(
    processed: List[dict],
    class_counts: Counter,
    val_ratio: float,
    min_images_per_class: int,
    seed: int,
) -> Tuple[List[dict], List[dict], Dict[str, int]]:
    """
    Sınıf bazlı stratified train/val split.
    Her sınıftan eşit oranda val'a gönderilir.
    """
    random.seed(seed)
    
    # Sınıf bazlı görüntü grupla
    class_to_images = defaultdict(list)
    for item in processed:
        classes_in_image = set()
        for ann in item["annotations"]:
            classes_in_image.add(ann["class_name"])
        # Primary class = en çok annotation olan
        primary_class = max(classes_in_image, key=lambda c: class_counts.get(c, 0))
        class_to_images[primary_class].append(item)
    
    # Minimum image sayısını karşılamayan sınıfları filtrele
    final_class_to_id = {}
    filtered_classes = []
    class_idx = 0
    
    for cls_name in sorted(class_to_images.keys()):
        if len(class_to_images[cls_name]) >= min_images_per_class:
            final_class_to_id[cls_name] = class_idx
            class_idx += 1
        else:
            filtered_classes.append(
                f"{cls_name} ({len(class_to_images[cls_name])} images)"
            )
    
    if filtered_classes:
        print(f"\n⚠️ Filtered out {len(filtered_classes)} classes (< {min_images_per_class} images):")
        for fc in filtered_classes[:10]:
            print(f"   - {fc}")
        if len(filtered_classes) > 10:
            print(f"   ... and {len(filtered_classes) - 10} more")
    
    # Stratified split
    train_items = []
    val_items = []
    
    for cls_name, items in class_to_images.items():
        if cls_name not in final_class_to_id:
            continue
        
        random.shuffle(items)
        val_count = max(1, int(len(items) * val_ratio))
        val_items.extend(items[:val_count])
        train_items.extend(items[val_count:])
    
    # Class ID'leri güncelle (filtreleme sonrası)
    for item in train_items + val_items:
        new_annotations = []
        for ann in item["annotations"]:
            if ann["class_name"] in final_class_to_id:
                ann["class_id"] = final_class_to_id[ann["class_name"]]
                new_annotations.append(ann)
        item["annotations"] = new_annotations
    
    # Annotation'sız kalanları kaldır
    train_items = [item for item in train_items if item["annotations"]]
    val_items = [item for item in val_items if item["annotations"]]
    
    random.shuffle(train_items)
    random.shuffle(val_items)
    
    return train_items, val_items, final_class_to_id


def write_yolo_dataset(
    train_items: List[dict],
    val_items: List[dict],
    class_to_id: Dict[str, int],
    output_dir: str,
):
    """
    YOLO formatında dataset dosyalarını yaz.
    """
    output_path = Path(output_dir)
    
    # Klasör yapısı oluştur
    for split in ["train", "val"]:
        (output_path / "images" / split).mkdir(parents=True, exist_ok=True)
        (output_path / "labels" / split).mkdir(parents=True, exist_ok=True)
    
    # data.yaml oluştur
    id_to_class = {v: k for k, v in class_to_id.items()}
    names_list = [id_to_class[i] for i in range(len(id_to_class))]
    
    yaml_content = f"""# Nutrino Food Segmentation Dataset
# Auto-generated from Label Studio annotations
# Classes: {len(names_list)}

path: {output_path.resolve()}
train: images/train
val: images/val

nc: {len(names_list)}
names: {names_list}
"""
    
    with open(output_path / "data.yaml", "w", encoding="utf-8") as f:
        f.write(yaml_content)
    
    print(f"\n📁 Writing dataset to: {output_path.resolve()}")
    
    # Veri yazma
    stats = {"train": {"images": 0, "labels": 0}, "val": {"images": 0, "labels": 0}}
    missing_images = []
    
    for split, items in [("train", train_items), ("val", val_items)]:
        for item in tqdm(items, desc=f"Writing {split}"):
            src_image = Path(item["image_path"])
            
            if not src_image.exists():
                missing_images.append(str(src_image))
                continue
            
            # Benzersiz dosya adı oluştur (sınıf_orijinalad.ext)
            primary_class = item["annotations"][0]["class_name"]
            safe_class = primary_class.replace(" ", "_").replace("/", "_")
            stem = src_image.stem
            ext = src_image.suffix
            filename = f"{safe_class}_{stem}{ext}"
            
            # Çakışma kontrolü
            dst_image = output_path / "images" / split / filename
            counter = 1
            while dst_image.exists():
                filename = f"{safe_class}_{stem}_{counter}{ext}"
                dst_image = output_path / "images" / split / filename
                counter += 1
            
            # Görüntüyü kopyala
            shutil.copy2(src_image, dst_image)
            stats[split]["images"] += 1
            
            # Label dosyası oluştur
            label_filename = dst_image.stem + ".txt"
            label_path = output_path / "labels" / split / label_filename
            
            with open(label_path, "w") as f:
                for ann in item["annotations"]:
                    class_id = ann["class_id"]
                    points_str = " ".join(f"{p:.6f}" for p in ann["yolo_points"])
                    f.write(f"{class_id} {points_str}\n")
            
            stats[split]["labels"] += 1
    
    # Sonuçları yazdır
    print(f"\n✅ Dataset yazıldı!")
    print(f"   Train: {stats['train']['images']} images, {stats['train']['labels']} labels")
    print(f"   Val:   {stats['val']['images']} images, {stats['val']['labels']} labels")
    print(f"   Classes: {len(names_list)}")
    
    if missing_images:
        print(f"\n⚠️ {len(missing_images)} missing images:")
        for mi in missing_images[:5]:
            print(f"   - {mi}")
        if len(missing_images) > 5:
            print(f"   ... and {len(missing_images) - 5} more")
    
    # Sınıf dağılımı
    print(f"\n📊 Class Distribution:")
    class_in_train = Counter()
    class_in_val = Counter()
    for item in train_items:
        for ann in item["annotations"]:
            class_in_train[ann["class_name"]] += 1
    for item in val_items:
        for ann in item["annotations"]:
            class_in_val[ann["class_name"]] += 1
    
    print(f"   {'Class':<30} {'Train':>8} {'Val':>8} {'Total':>8}")
    print(f"   {'-'*30} {'-'*8} {'-'*8} {'-'*8}")
    for cls_name in sorted(class_to_id.keys()):
        t = class_in_train.get(cls_name, 0)
        v = class_in_val.get(cls_name, 0)
        print(f"   {cls_name:<30} {t:>8} {v:>8} {t+v:>8}")
    
    return output_path / "data.yaml"


def main():
    args = parse_args()
    
    print("=" * 60)
    print("🏷️ Label Studio → YOLO Segmentation Converter")
    print("=" * 60)
    
    # JSON yükle
    json_path = Path(args.json)
    if not json_path.exists():
        print(f"❌ JSON dosyası bulunamadı: {json_path}")
        sys.exit(1)
    
    print(f"\n📂 Loading: {json_path} ({json_path.stat().st_size / 1024 / 1024:.1f} MB)")
    
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    print(f"   Loaded {len(data)} tasks")
    
    # Images root kontrol
    images_root = args.images
    if not os.path.exists(images_root):
        print(f"❌ Images root bulunamadı: {images_root}")
        print("   Label Studio'daki görüntülerin bulunduğu klasörü belirtin")
        sys.exit(1)
    
    # Annotation'ları işle
    processed, class_to_id, class_counts = process_annotations(
        data, images_root, args.min_points
    )
    
    if not processed:
        print("❌ Hiç işlenebilir annotation bulunamadı!")
        sys.exit(1)
    
    # Sınıf dağılımı özeti
    print(f"\n📊 Class counts (top 20):")
    for cls, count in class_counts.most_common(20):
        print(f"   {cls}: {count}")
    if len(class_counts) > 20:
        print(f"   ... and {len(class_counts) - 20} more classes")
    
    # Stratified split
    train_items, val_items, final_class_to_id = stratified_split(
        processed, class_counts, args.val_ratio, args.min_images_per_class, args.seed
    )
    
    print(f"\n📊 Split:")
    print(f"   Train: {len(train_items)} images")
    print(f"   Val:   {len(val_items)} images")
    print(f"   Final classes: {len(final_class_to_id)}")
    
    # YOLO dataset yaz
    data_yaml = write_yolo_dataset(
        train_items, val_items, final_class_to_id, args.output
    )
    
    print(f"\n{'=' * 60}")
    print(f"✅ Dönüştürme tamamlandı!")
    print(f"   data.yaml: {data_yaml}")
    print(f"\n🚀 Eğitim için:")
    print(f"   python train_food_seg.py --data {data_yaml}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
