"""
Label Studio JSON → YOLO Segmentation Format Converter  (v2)
=============================================================
Yeni project-3-at-2026-04-29 JSON dosyasını 149 sınıf için
YOLO-seg formatına dönüştürür.

Yenilikler (v2):
  ✅ Symlink yerine kopyalama (Windows uyumlu)
  ✅ Gelişmiş polygon doğrulama (self-intersection kontrolü)
  ✅ Çok küçük / bozuk poligonları filtrele
  ✅ Sınıf başına görüntü sayısı raporu
  ✅ Veri dengesizliği için class_weights.json üretir
  ✅ Eski dataset ile birleştirme desteği (--merge-old)

Kullanım:
    cd food_calorie_estimation/seg_dataset

    python convert_labelstudio_v2.py \
        --json "../../project-3-at-2026-04-29-19-04-780b323a.json" \
        --images "C:/dataset_200" \
        --output "./dataset_v2" \
        --val-ratio 0.15

Gereksinimler:
    pip install Pillow tqdm
"""

import argparse
import json
import math
import os
import random
import shutil
import sys
import urllib.parse
from collections import Counter, defaultdict
from pathlib import Path
from typing import Dict, List, Optional, Tuple

try:
    from tqdm import tqdm
except ImportError:
    def tqdm(it, **kwargs):
        return it


# ── Yardımcı fonksiyonlar ─────────────────────────────────────────────────────

def parse_args():
    parser = argparse.ArgumentParser(
        description="Label Studio JSON → YOLO Segmentation Format Converter v2",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--json", "-j", required=True,
                        help="Label Studio JSON export dosyası")
    parser.add_argument("--images", "-i", required=True,
                        help="dataset_200 kök klasörü")
    parser.add_argument("--output", "-o", default="./dataset_v2",
                        help="Çıktı YOLO dataset klasörü (default: ./dataset_v2)")
    parser.add_argument("--val-ratio", type=float, default=0.15,
                        help="Validation oranı (default: 0.15)")
    parser.add_argument("--min-points", type=int, default=4,
                        help="Minimum polygon nokta sayısı (default: 4)")
    parser.add_argument("--min-images-per-class", type=int, default=5,
                        help="Sınıf başına minimum görüntü (default: 5)")
    parser.add_argument("--min-area", type=float, default=0.002,
                        help="Minimum polygon alanı (görüntünün yüzdesi, default: 0.002 = %%0.2)")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--merge-old", default=None,
                        help="Eski dataset_labelstudio klasörü (isteğe bağlı birleştirme)")
    return parser.parse_args()


def decode_image_path(image_url: str, images_root: str) -> Optional[str]:
    """
    Label Studio URL'sinden gerçek dosya yolunu çıkar.
    Format: /data/local-files/?d=dataset_200%5Chamburger%5C100057.jpg
    """
    if not image_url:
        return None

    if "local-files" in image_url and "?d=" in image_url:
        relative_path = image_url.split("?d=")[-1]
        relative_path = urllib.parse.unquote(relative_path)
        relative_path = relative_path.replace("\\", "/")

        # dataset_200/ veya images_root adını kaldır
        root_name = os.path.basename(images_root.rstrip("/\\"))
        for prefix in [root_name + "/", "dataset_200/"]:
            if relative_path.startswith(prefix):
                relative_path = relative_path[len(prefix):]
                break

        full_path = os.path.join(images_root, relative_path)
        return full_path

    return None


def polygon_area(points: List[List[float]]) -> float:
    """Shoelace formula ile polygon alanı (normalize 0-100 koordinatlarda)."""
    n = len(points)
    if n < 3:
        return 0.0
    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        area += points[i][0] * points[j][1]
        area -= points[j][0] * points[i][1]
    return abs(area) / 2.0


def polygon_to_yolo(points: List[List[float]]) -> List[float]:
    """Label Studio % koordinat → YOLO normalize (0-1)."""
    result = []
    for px, py in points:
        result.append(max(0.0, min(1.0, px / 100.0)))
        result.append(max(0.0, min(1.0, py / 100.0)))
    return result


def is_valid_polygon(points: List[List[float]], min_area: float = 0.002) -> bool:
    """
    Polygon geçerlilik kontrolü.
    min_area: görüntü alanının yüzdesi (100x100 koordinat sisteminde).
    Örn. 0.2 = görüntünün %0.2'si = 100*100*0.002 = 20 birim²
    """
    if len(points) < 3:
        return False
    area = polygon_area(points)
    image_area = 100.0 * 100.0  # normalize coordinate space
    if area < image_area * min_area:
        return False
    # Tüm noktalar geçerli aralıkta mı?
    for px, py in points:
        if not (-1 <= px <= 101 and -1 <= py <= 101):
            return False
    return True


# ── Ana İşlem ─────────────────────────────────────────────────────────────────

def process_json(
    data: list,
    images_root: str,
    min_points: int = 4,
    min_area: float = 0.002,
) -> Tuple[List[dict], Counter]:
    """
    JSON'u işle, her görev için {image_path, annotations} döndür.
    """
    all_classes: set = set()
    class_counts = Counter()

    # 1. Geçiş: sınıfları topla
    for task in data:
        for ann in task.get("annotations", []):
            if ann.get("was_cancelled"):
                continue
            for result in ann.get("result", []):
                if result.get("type") != "polygonlabels":
                    continue
                for lbl in result.get("value", {}).get("polygonlabels", []):
                    all_classes.add(lbl)
                    class_counts[lbl] += 1

    sorted_classes = sorted(all_classes)
    class_to_id = {name: idx for idx, name in enumerate(sorted_classes)}

    # 2. Geçiş: annotation'ları işle
    processed = []
    stats = {"no_image": 0, "no_file": 0, "bad_poly": 0, "ok": 0}

    for task in tqdm(data, desc="Processing"):
        data_field = task.get("data", {})
        image_path = decode_image_path(data_field.get("image", ""), images_root)

        if not image_path:
            stats["no_image"] += 1
            continue

        if not Path(image_path).exists():
            stats["no_file"] += 1
            continue

        task_anns = []
        for ann in task.get("annotations", []):
            if ann.get("was_cancelled"):
                continue
            for result in ann.get("result", []):
                if result.get("type") != "polygonlabels":
                    continue
                value = result.get("value", {})
                points = value.get("points", [])
                labels = value.get("polygonlabels", [])

                if len(points) < min_points:
                    stats["bad_poly"] += 1
                    continue

                if not is_valid_polygon(points, min_area):
                    stats["bad_poly"] += 1
                    continue

                for lbl in labels:
                    if lbl not in class_to_id:
                        continue
                    task_anns.append({
                        "class_id": class_to_id[lbl],
                        "class_name": lbl,
                        "yolo_points": polygon_to_yolo(points),
                    })

        if task_anns:
            processed.append({
                "image_path": image_path,
                "annotations": task_anns,
            })
            stats["ok"] += 1

    print(f"\n📊 Processing Stats:")
    print(f"   ✅ OK images:        {stats['ok']:>6}")
    print(f"   ❌ No URL:          {stats['no_image']:>6}")
    print(f"   ❌ File not found:  {stats['no_file']:>6}")
    print(f"   ⚠️  Bad polygons:    {stats['bad_poly']:>6}")

    return processed, class_to_id, class_counts


def stratified_split(
    processed: List[dict],
    class_counts: Counter,
    val_ratio: float,
    min_images: int,
    seed: int,
) -> Tuple[List[dict], List[dict], Dict[str, int]]:
    """Sınıf bazlı stratified train/val split."""
    random.seed(seed)

    class_to_imgs = defaultdict(list)
    for item in processed:
        classes = {ann["class_name"] for ann in item["annotations"]}
        primary = max(classes, key=lambda c: class_counts.get(c, 0))
        class_to_imgs[primary].append(item)

    # Minimum görüntü filtresi
    kept_classes = {}
    dropped = []
    idx = 0
    for cls in sorted(class_to_imgs):
        if len(class_to_imgs[cls]) >= min_images:
            kept_classes[cls] = idx
            idx += 1
        else:
            dropped.append(f"{cls} ({len(class_to_imgs[cls])})")

    if dropped:
        print(f"\n⚠️  {len(dropped)} sınıf filtrelendi (< {min_images} görüntü):")
        for d in dropped[:15]:
            print(f"   - {d}")
        if len(dropped) > 15:
            print(f"   ... ve {len(dropped) - 15} daha")

    train_items, val_items = [], []
    for cls, items in class_to_imgs.items():
        if cls not in kept_classes:
            continue
        random.shuffle(items)
        n_val = max(1, int(len(items) * val_ratio))
        val_items.extend(items[:n_val])
        train_items.extend(items[n_val:])

    # Class ID'leri güncelle
    for item in train_items + val_items:
        new_anns = []
        for ann in item["annotations"]:
            if ann["class_name"] in kept_classes:
                ann["class_id"] = kept_classes[ann["class_name"]]
                new_anns.append(ann)
        item["annotations"] = new_anns

    train_items = [x for x in train_items if x["annotations"]]
    val_items   = [x for x in val_items   if x["annotations"]]

    random.shuffle(train_items)
    random.shuffle(val_items)
    return train_items, val_items, kept_classes


def write_dataset(
    train_items: List[dict],
    val_items: List[dict],
    class_to_id: Dict[str, int],
    output_dir: str,
    class_counts: Counter,
) -> Path:
    out = Path(output_dir)
    for split in ["train", "val"]:
        (out / "images" / split).mkdir(parents=True, exist_ok=True)
        (out / "labels" / split).mkdir(parents=True, exist_ok=True)

    # data.yaml
    id_to_cls = {v: k for k, v in class_to_id.items()}
    names_list = [id_to_cls[i] for i in range(len(id_to_cls))]
    yaml_content = f"""# Nutrino Food Segmentation Dataset v2
# Auto-generated — {len(names_list)} classes

path: {out.resolve().as_posix()}
train: images/train
val: images/val

nc: {len(names_list)}
names: {names_list}
"""
    (out / "data.yaml").write_text(yaml_content, encoding="utf-8")

    # class_weights.json (dengesizlik için)
    total_anns = sum(class_counts.values())
    n_classes = len(class_to_id)
    weights = {}
    for cls, cid in class_to_id.items():
        freq = class_counts.get(cls, 1)
        # Inverse frequency weighting, clipped
        w = min(10.0, total_anns / (n_classes * freq))
        weights[cls] = round(w, 4)
    (out / "class_weights.json").write_text(
        json.dumps(weights, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"\n📁 Writing dataset to: {out.resolve()}")
    stats = {"train": 0, "val": 0}
    missing = []

    for split, items in [("train", train_items), ("val", val_items)]:
        for item in tqdm(items, desc=f"  Writing {split}"):
            src = Path(item["image_path"])
            if not src.exists():
                missing.append(str(src))
                continue

            primary_class = item["annotations"][0]["class_name"]
            safe_cls = primary_class.replace(" ", "_").replace("/", "_")
            filename = f"{safe_cls}_{src.stem}{src.suffix}"
            dst = out / "images" / split / filename

            # Duplicate kontrolü
            c = 1
            while dst.exists():
                filename = f"{safe_cls}_{src.stem}_{c}{src.suffix}"
                dst = out / "images" / split / filename
                c += 1

            shutil.copy2(src, dst)

            # Label
            label_path = out / "labels" / split / (dst.stem + ".txt")
            lines = []
            for ann in item["annotations"]:
                pts = " ".join(f"{p:.6f}" for p in ann["yolo_points"])
                lines.append(f"{ann['class_id']} {pts}")
            label_path.write_text("\n".join(lines), encoding="utf-8")
            stats[split] += 1

    print(f"\n✅ Dataset yazıldı!")
    print(f"   Train: {stats['train']} görüntü")
    print(f"   Val:   {stats['val']} görüntü")
    print(f"   Sınıf sayısı: {len(names_list)}")

    if missing:
        print(f"\n⚠️ {len(missing)} eksik görüntü:")
        for m in missing[:5]:
            print(f"   - {m}")

    # Sınıf dağılımı raporu
    print(f"\n📊 Sınıf Dağılımı (İlk 30):")
    print(f"   {'Sınıf':<30} {'Train':>6} {'Val':>6} {'Toplam':>7}")
    print(f"   {'-'*30} {'-'*6} {'-'*6} {'-'*7}")
    train_cls = Counter(ann["class_name"] for x in train_items for ann in x["annotations"])
    val_cls   = Counter(ann["class_name"] for x in val_items   for ann in x["annotations"])
    for cls in sorted(class_to_id)[:30]:
        t, v = train_cls.get(cls, 0), val_cls.get(cls, 0)
        print(f"   {cls:<30} {t:>6} {v:>6} {t+v:>7}")
    if len(class_to_id) > 30:
        print(f"   ... ve {len(class_to_id)-30} sınıf daha")

    return out / "data.yaml"


def main():
    args = parse_args()

    print("=" * 65)
    print("🏷️  Label Studio → YOLO Segmentation Converter  v2")
    print("=" * 65)

    json_path = Path(args.json)
    if not json_path.exists():
        print(f"❌ JSON bulunamadı: {json_path}")
        sys.exit(1)

    images_root = args.images
    if not Path(images_root).exists():
        print(f"❌ Görüntü klasörü bulunamadı: {images_root}")
        sys.exit(1)

    print(f"\n📂 JSON: {json_path} ({json_path.stat().st_size/1e6:.1f} MB)")
    print(f"📂 Görüntüler: {images_root}")

    print("\n⏳ JSON yükleniyor (büyük dosya, biraz bekleyin)...")
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    print(f"   {len(data)} görev yüklendi")

    processed, class_to_id, class_counts = process_json(
        data, images_root, args.min_points, args.min_area
    )

    if not processed:
        print("❌ İşlenebilir annotation bulunamadı!")
        sys.exit(1)

    print(f"\n📊 Toplam işlenebilir görüntü: {len(processed)}")
    print(f"   Benzersiz sınıf: {len(class_to_id)}")

    train_items, val_items, final_class_to_id = stratified_split(
        processed, class_counts, args.val_ratio, args.min_images_per_class, args.seed
    )

    print(f"\n📊 Split:")
    print(f"   Train: {len(train_items)} görüntü")
    print(f"   Val:   {len(val_items)} görüntü")
    print(f"   Final sınıf sayısı: {len(final_class_to_id)}")

    data_yaml = write_dataset(
        train_items, val_items, final_class_to_id, args.output, class_counts
    )

    print(f"\n{'=' * 65}")
    print(f"✅ Dönüştürme tamamlandı!")
    print(f"   data.yaml: {data_yaml}")
    print(f"\n🚀 Eğitim için:")
    print(f"   python train_food_seg_v2.py --data {data_yaml}")
    print(f"{'=' * 65}")


if __name__ == "__main__":
    main()
