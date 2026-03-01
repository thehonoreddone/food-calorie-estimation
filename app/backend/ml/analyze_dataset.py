"""
Dataset Analysis & Recommendations
====================================
Analyzes the merged_datasetf and provides actionable recommendations
for improving the classification dataset.

Usage:
    python analyze_dataset.py --data ../../merged_datasetf/images
"""
import argparse
import os
import json
from pathlib import Path
from collections import Counter


# Classes that a PROFESSIONAL Turkish food+international calorie tracking app should have
# beyond what's currently in merged_datasetf
RECOMMENDED_NEW_CLASSES = {
    # ============ TURKISH BREAKFAST ESSENTIALS ============
    "pogaca": "Poğaça - extremely common Turkish breakfast pastry",
    "peynir": "Peynir (beyaz peynir/kaşar) - Turkish cheese, eaten daily",
    "bal": "Bal - honey, very common breakfast item",
    "kaymak": "Kaymak - clotted cream, served with honey/bread",
    "tereyagi": "Tereyağı - butter, used in almost every meal",
    "recel": "Reçel - Turkish jam varieties",

    # ============ POPULAR TURKISH MAIN DISHES ============
    "ali-nazik": "Ali Nazik - very popular Hatay kebab dish",
    "pideli-kofte": "Pideli Köfte - köfte served on pide bread",
    "kuzu-tandir": "Kuzu Tandır - slow-roasted lamb, restaurant staple",
    "ciger-kebabi": "Ciğer Kebabı - liver kebab, very popular in Adana/Şanlıurfa",
    "etli-ekmek": "Etli Ekmek - Konya specialty, like lahmacun but thicker",
    "beyti-sarma": "Beyti Sarma - wrapped kebab, very popular",
    "izgara-kofte": "Izgara Köfte - grilled meatballs, super common",
    "tavuk-izgara": "Tavuk Izgara - grilled chicken, very common diet food",
    "cop-sis": "Çöp Şiş - small skewer kebab",
    "urfa-kebap": "Urfa Kebap - mild version of Adana kebab",

    # ============ COMMON SOUPS (Already have some) ============
    "ezogelin-corbasi": "Ezogelin Çorbası - one of the most popular Turkish soups",
    "iskembe-corbasi": "İşkembe Çorbası - tripe soup, late night staple",

    # ============ DRINKS ============
    "limonata": "Limonata - lemonade, very common in restaurants",
    "salgam": "Şalgam - turnip juice, served with kebabs",
    "su": "Su - water (useful for tracking intake)",
    "soda": "Soda - sparkling water, common in Turkey",
    "meyve-suyu": "Meyve Suyu - fruit juice/packaged juice",

    # ============ SNACKS & STREET FOOD ============
    "gozleme": "Gözleme - stuffed flatbread, extremely popular",
    "borek-cesitleri": "Börek (sigara böreği) - cigar börek, very common snack",
    "tost": "Tost - Turkish toast/grilled sandwich, ultra common",
    "kumru": "Kumru - İzmir specialty sandwich",
    "findik": "Fındık - hazelnuts, Turkey is #1 producer",
    "kestane": "Kestane - roasted chestnuts, winter street food",
    "kuruyemis": "Kuruyemiş - mixed nuts/dried fruits",

    # ============ DESSERTS (Already have many) ============
    "kunefe": "Künefe - shredded pastry with cheese, very popular",
    "revani": "Revani - semolina cake, common at gatherings",
    "asure": "Aşure - Noah's pudding, culturally significant",
    "tavuk-gogsu": "Tavuk Göğsü - chicken breast pudding",

    # ============ COMMON INTERNATIONAL (Missing) ============
    "pasta-carbonara": "Pasta/Carbonara/Alfredo - generic pasta dishes",
    "wrap": "Wrap/dürüm - rolled sandwich/wrap",
    "smoothie": "Smoothie - very popular health drink",
    "granola": "Granola/müsli - common breakfast for health-conscious",
    "avocado-toast": "Avocado Toast - trendy breakfast item",
    "acai-bowl": "Açaí Bowl - trendy health food",
    "poke-bowl": "Poke Bowl - trendy healthy meal",
}

# Minimum recommended images per class
MIN_IMAGES_RECOMMENDED = 300
MIN_IMAGES_ACCEPTABLE = 150


def analyze_dataset(data_dir: str):
    """Analyze the dataset and print recommendations."""
    data_path = Path(data_dir)

    if not data_path.exists():
        print(f"ERROR: Dataset not found at {data_path}")
        return

    # Count images per class
    class_counts = {}
    total_images = 0
    for class_dir in sorted(data_path.iterdir()):
        if class_dir.is_dir():
            count = len([f for f in class_dir.iterdir() if f.is_file()])
            class_counts[class_dir.name] = count
            total_images += count

    num_classes = len(class_counts)

    print("=" * 80)
    print("📊 DATASET ANALYSIS REPORT")
    print("=" * 80)
    print(f"\n📁 Dataset: {data_path.resolve()}")
    print(f"📦 Total Classes: {num_classes}")
    print(f"🖼️  Total Images: {total_images}")
    print(f"📈 Average per class: {total_images / num_classes:.0f}")
    print(f"📉 Min: {min(class_counts.values())} ({min(class_counts, key=class_counts.get)})")
    print(f"📈 Max: {max(class_counts.values())} ({max(class_counts, key=class_counts.get)})")

    # ========== CRITICAL: Classes needing more images ==========
    critical_classes = {k: v for k, v in class_counts.items() if v < 100}
    low_classes = {k: v for k, v in class_counts.items() if 100 <= v < MIN_IMAGES_ACCEPTABLE}
    medium_classes = {k: v for k, v in class_counts.items() if MIN_IMAGES_ACCEPTABLE <= v < MIN_IMAGES_RECOMMENDED}

    print(f"\n{'=' * 80}")
    print("🚨 CRITICAL - Classes with < 100 images (MUST ADD MORE):")
    print("=" * 80)
    if critical_classes:
        for name, count in sorted(critical_classes.items(), key=lambda x: x[1]):
            needed = MIN_IMAGES_RECOMMENDED - count
            print(f"  ❌ {name:30s} → {count:4d} images (need ~{needed} more)")
    else:
        print("  None! ✅")

    print(f"\n{'=' * 80}")
    print(f"⚠️  LOW - Classes with 100-{MIN_IMAGES_ACCEPTABLE} images (should add more):")
    print("=" * 80)
    if low_classes:
        for name, count in sorted(low_classes.items(), key=lambda x: x[1]):
            needed = MIN_IMAGES_RECOMMENDED - count
            print(f"  ⚠️  {name:30s} → {count:4d} images (need ~{needed} more)")
    else:
        print("  None! ✅")

    print(f"\n{'=' * 80}")
    print(f"📋 MEDIUM - Classes with {MIN_IMAGES_ACCEPTABLE}-{MIN_IMAGES_RECOMMENDED} images:")
    print("=" * 80)
    if medium_classes:
        for name, count in sorted(medium_classes.items(), key=lambda x: x[1]):
            needed = MIN_IMAGES_RECOMMENDED - count
            print(f"  📋 {name:30s} → {count:4d} images (ideally need ~{needed} more)")
    else:
        print("  None! ✅")

    ok_classes = {k: v for k, v in class_counts.items() if v >= MIN_IMAGES_RECOMMENDED}
    print(f"\n  ✅ {len(ok_classes)} classes have >= {MIN_IMAGES_RECOMMENDED} images")

    # ========== NEW CLASSES TO ADD ==========
    print(f"\n{'=' * 80}")
    print("🆕 RECOMMENDED NEW CLASSES FOR A PROFESSIONAL TURKISH FOOD APP:")
    print("=" * 80)
    existing_classes = set(class_counts.keys())
    recommended_count = 0
    for cls_name, description in sorted(RECOMMENDED_NEW_CLASSES.items()):
        if cls_name not in existing_classes:
            print(f"  🆕 {cls_name:25s} → {description}")
            recommended_count += 1
        else:
            print(f"  ✅ {cls_name:25s} → Already exists ({class_counts[cls_name]} images)")
    print(f"\n  Total new classes recommended: {recommended_count}")

    # ========== IMBALANCE SUMMARY ==========
    print(f"\n{'=' * 80}")
    print("📊 CLASS DISTRIBUTION SUMMARY:")
    print("=" * 80)
    ranges = [
        ("< 50 images", 0, 50),
        ("50-99 images", 50, 100),
        ("100-199 images", 100, 200),
        ("200-299 images", 200, 300),
        ("300-499 images", 300, 500),
        ("500-999 images", 500, 1000),
        ("1000+ images", 1000, 999999),
    ]
    for label, low, high in ranges:
        count = len([v for v in class_counts.values() if low <= v < high])
        bar = "█" * count
        print(f"  {label:20s}: {count:3d} classes {bar}")

    # ========== ACTION PLAN ==========
    total_images_needed = 0
    for name, count in class_counts.items():
        if count < MIN_IMAGES_RECOMMENDED:
            total_images_needed += (MIN_IMAGES_RECOMMENDED - count)
    total_images_needed += recommended_count * MIN_IMAGES_RECOMMENDED  # New classes

    print(f"\n{'=' * 80}")
    print("📋 ACTION PLAN:")
    print("=" * 80)
    print(f"  1. Add ~{sum(MIN_IMAGES_RECOMMENDED - v for v in critical_classes.values())} images to {len(critical_classes)} CRITICAL classes")
    print(f"  2. Add ~{sum(MIN_IMAGES_RECOMMENDED - v for v in low_classes.values())} images to {len(low_classes)} LOW classes")
    print(f"  3. Add ~{sum(MIN_IMAGES_RECOMMENDED - v for v in medium_classes.values())} images to {len(medium_classes)} MEDIUM classes")
    print(f"  4. Create {recommended_count} new food classes with ~{MIN_IMAGES_RECOMMENDED}+ images each")
    print(f"  5. Total new images needed: ~{total_images_needed}")
    print(f"\n  TIP: Use Google Images, Bing, or web scraping to collect images.")
    print(f"  TIP: Each class should ideally have {MIN_IMAGES_RECOMMENDED}-1000 images.")
    print(f"  TIP: The training script uses weighted sampling to handle remaining imbalance.")

    # Save report as JSON
    report = {
        "num_classes": num_classes,
        "total_images": total_images,
        "class_counts": class_counts,
        "critical_classes": critical_classes,
        "low_classes": low_classes,
        "recommended_new_classes": list(RECOMMENDED_NEW_CLASSES.keys()),
    }
    report_path = Path(data_dir).parent / "dataset_analysis.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"\n  📄 Full report saved to: {report_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Analyze food dataset")
    parser.add_argument("--data", type=str, default="../../merged_datasetf/images",
                        help="Path to dataset images directory")
    args = parser.parse_args()
    analyze_dataset(args.data)
