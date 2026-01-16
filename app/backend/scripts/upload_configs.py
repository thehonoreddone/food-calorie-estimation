import os
import sys
import json
import firebase_admin
from firebase_admin import credentials, storage
from google.cloud import storage as gcs
from pathlib import Path

# Add parent directory to path to import settings
sys.path.append(str(Path(__file__).parent.parent))

# Mock settings if needed or import
try:
    from app.core.config import settings
except ImportError as e:
    print(f"Could not import settings. Error: {e}")
    print("Please run from app/backend directory.")
    sys.exit(1)

def upload_configs():
    print("Initializing Firebase...")
    
    cred_path = Path("config/firebase_service_account.json")
    if not cred_path.exists():
        print(f"Error: Credentials not found at {cred_path}")
        return

    # Use Google Cloud Storage client directly to find buckets
    try:
        client = gcs.Client.from_service_account_json(str(cred_path))
        buckets = list(client.list_buckets())
        
        if not buckets:
            print("No buckets found in this project.")
            return
            
        # Prefer the one with project id if multiple
        bucket = buckets[0]
        for b in buckets:
            if settings.FIREBASE_PROJECT_ID in b.name:
                bucket = b
                break
        
        print(f"Using bucket: {bucket.name}")
        
    except Exception as e:
        print(f"Error listing buckets: {e}")
        return
    
    files_to_upload = [
        "class_names.json",
        "densities.json",
        "kcal_per_gram.json"
    ]
    
    config_dir = Path("config")
    
    for filename in files_to_upload:
        file_path = config_dir / filename
        if file_path.exists():
            print(f"Uploading {filename}...")
            blob = bucket.blob(f"config/{filename}")
            blob.upload_from_filename(str(file_path))
            print(f"Uploaded {filename} to config/{filename}")
        else:
            print(f"Warning: {filename} not found locally.")

if __name__ == "__main__":
    upload_configs()
