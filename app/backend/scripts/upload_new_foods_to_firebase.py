"""
Upload new food class data to Firebase:
  1) Update config/*.json files (class_names, densities, kcal_per_gram)
  2) Upload them to Firebase Storage  (config/ bucket path)
  3) Upsert Firestore 'foods' collection documents for each new class

Usage:
  cd app/backend
  python scripts/upload_new_foods_to_firebase.py
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime

# Add parent directory so we can import project modules
sys.path.append(str(Path(__file__).parent.parent))

# ----- NEW 40 CLASSES: master data -----
NEW_FOODS = {
    # class_name: (kcal_per_gram, density_g_cm3, default_portion_g, food_type)
    "pogaca":            (3.20, 0.55, 80,  "single_volume"),
    "peynir":            (3.50, 1.10, 50,  "single_volume"),
    "bal":               (3.04, 1.40, 30,  "liquid"),
    "kaymak":            (3.00, 0.95, 30,  "single_volume"),
    "tereyagi":          (7.17, 0.90, 15,  "single_volume"),
    "recel":             (2.50, 1.35, 30,  "liquid"),
    "ali-nazik":         (1.40, 0.85, 350, "single_volume"),
    "pideli-kofte":      (2.00, 0.75, 350, "single_volume"),
    "kuzu-tandir":       (2.20, 0.95, 300, "single_volume"),
    "ciger-kebabi":      (1.90, 1.00, 250, "single_volume"),
    "etli-ekmek":        (2.10, 0.60, 350, "flat"),
    "beyti-sarma":       (2.30, 0.80, 300, "single_volume"),
    "izgara-kofte":      (2.50, 0.90, 200, "multi_instance"),
    "tavuk-izgara":      (1.60, 1.00, 200, "single_volume"),
    "cop-sis":           (2.40, 0.85, 200, "multi_instance"),
    "urfa-kebap":        (2.30, 0.90, 200, "single_volume"),
    "ezogelin-corbasi":  (0.50, 1.00, 300, "liquid"),
    "iskembe-corbasi":   (0.60, 1.00, 300, "liquid"),
    "limonata":          (0.40, 1.04, 300, "liquid"),
    "salgam":            (0.20, 1.02, 250, "liquid"),
    "su":                (0.00, 1.00, 250, "liquid"),
    "soda":              (0.00, 1.00, 250, "liquid"),
    "meyve-suyu":        (0.45, 1.04, 250, "liquid"),
    "gozleme":           (2.20, 0.60, 200, "flat"),
    "borek-cesitleri":   (3.00, 0.65, 200, "single_volume"),
    "tost":              (2.50, 0.55, 180, "single_volume"),
    "kumru":             (2.40, 0.60, 250, "single_volume"),
    "findik":            (6.28, 0.60, 30,  "multi_instance"),
    "kestane":           (2.13, 0.80, 100, "multi_instance"),
    "kuruyemis":         (5.50, 0.60, 50,  "multi_instance"),
    "kunefe":            (3.50, 0.75, 150, "single_volume"),
    "revani":            (3.20, 0.70, 120, "single_volume"),
    "asure":             (1.20, 1.00, 200, "liquid"),
    "tavuk-gogsu":       (1.60, 0.85, 150, "single_volume"),
    "wrap":              (1.80, 0.60, 250, "single_volume"),
    "smoothie":          (0.60, 1.02, 350, "liquid"),
    "granola":           (4.50, 0.40, 60,  "single_volume"),
    "avocado-toast":     (2.00, 0.55, 200, "flat"),
    "acai-bowl":         (1.10, 0.90, 300, "single_volume"),
    "poke-bowl":         (1.30, 0.85, 350, "single_volume"),
}


def load_json(path: Path) -> dict | list:
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  Saved {path}")


# ---------- STEP 1: Update local config files ----------
def update_local_configs():
    config_dir = Path("config")
    config_dir.mkdir(exist_ok=True)

    # 1a) class_names.json  (sorted list)
    from app.services.model_service import DEFAULT_CLASS_NAMES
    cn_path = config_dir / "class_names.json"
    class_names = list(set(DEFAULT_CLASS_NAMES))
    class_names.sort()
    save_json(cn_path, class_names)
    print(f"  class_names.json: {len(class_names)} classes")

    # 1b) kcal_per_gram.json
    kcal_path = config_dir / "kcal_per_gram.json"
    kcal = load_json(kcal_path)
    for name, (kcal_val, _, _, _) in NEW_FOODS.items():
        kcal[name] = kcal_val
    save_json(kcal_path, kcal)

    # 1c) densities.json
    den_path = config_dir / "densities.json"
    den = load_json(den_path)
    for name, (_, density, _, _) in NEW_FOODS.items():
        den[name] = density
    save_json(den_path, den)

    return config_dir


# ---------- STEP 2: Upload to Firebase Storage ----------
def upload_to_storage(config_dir: Path):
    try:
        from google.cloud import storage as gcs
        from app.core.config import settings
    except ImportError:
        print("  google-cloud-storage not installed. Skipping Storage upload.")
        return

    cred_path = Path("config/firebase_service_account.json")
    if not cred_path.exists():
        cred_path = Path("firebase-credentials.json")
    if not cred_path.exists():
        print("  Firebase credentials not found. Skipping Storage upload.")
        return

    client = gcs.Client.from_service_account_json(str(cred_path))
    buckets = list(client.list_buckets())
    if not buckets:
        print("  No GCS buckets found. Skipping.")
        return

    from app.core.config import settings
    bucket = buckets[0]
    for b in buckets:
        if settings.FIREBASE_PROJECT_ID in b.name:
            bucket = b
            break

    print(f"  Using bucket: {bucket.name}")
    for filename in ["class_names.json", "densities.json", "kcal_per_gram.json"]:
        fp = config_dir / filename
        if fp.exists():
            blob = bucket.blob(f"config/{filename}")
            blob.upload_from_filename(str(fp))
            print(f"  Uploaded {filename}")


# ---------- STEP 3: Upsert Firestore 'foods' collection ----------
def upsert_firestore_foods():
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
    except ImportError:
        print("  firebase-admin not installed. Skipping Firestore upsert.")
        return

    cred_path = Path("config/firebase_service_account.json")
    if not cred_path.exists():
        cred_path = Path("firebase-credentials.json")
    if not cred_path.exists():
        print("  Firebase credentials not found. Skipping Firestore upsert.")
        return

    if not firebase_admin._apps:
        cred = credentials.Certificate(str(cred_path))
        firebase_admin.initialize_app(cred)

    db = firestore.client()
    collection = db.collection("foods")

    # Check which foods already exist
    existing = {}
    for doc in collection.stream():
        data = doc.to_dict()
        existing[data.get("class_name", "")] = doc.id

    created = 0
    updated = 0
    for name, (kcal_g, density, portion, ftype) in NEW_FOODS.items():
        doc_data = {
            "class_name": name,
            "calories_per_100g": round(kcal_g * 100, 1),
            "default_portion_grams": portion,
            "density_g_per_cm3": density,
            "food_type": ftype,
            "updated_at": datetime.now(),
        }

        if name in existing:
            collection.document(existing[name]).update(doc_data)
            updated += 1
        else:
            doc_data["created_at"] = datetime.now()
            collection.add(doc_data)
            created += 1

    print(f"  Firestore: {created} created, {updated} updated (total {len(NEW_FOODS)})")


# ---------- MAIN ----------
def main():
    print("=" * 60)
    print("Upload 40 new food classes to Firebase")
    print("=" * 60)

    print("\n[1/3] Updating local config files...")
    config_dir = update_local_configs()

    print("\n[2/3] Uploading to Firebase Storage...")
    upload_to_storage(config_dir)

    print("\n[3/3] Upserting Firestore 'foods' documents...")
    upsert_firestore_foods()

    print("\nDone!")


if __name__ == "__main__":
    main()
