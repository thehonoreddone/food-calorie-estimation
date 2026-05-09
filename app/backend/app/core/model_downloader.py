"""
Model download utility — downloads ML models if not present locally.
Supports direct URLs and Google Drive share links.
"""
import os
import httpx
from loguru import logger

from app.core.config import settings


def _gdrive_direct_url(share_url: str) -> str:
    """Convert a Google Drive share link to a direct download link."""
    # Handle: https://drive.google.com/file/d/{FILE_ID}/view?...
    if "drive.google.com/file/d/" in share_url:
        file_id = share_url.split("/file/d/")[1].split("/")[0]
        return f"https://drive.google.com/uc?export=download&id={file_id}&confirm=t"
    # Handle: https://drive.google.com/uc?id=...
    if "drive.google.com/uc" in share_url:
        return share_url if "confirm=" in share_url else share_url + "&confirm=t"
    return share_url


async def download_model(url: str, dest_path: str) -> bool:
    """Download a model file from a URL to dest_path."""
    if not url:
        return False
    if os.path.exists(dest_path):
        logger.info(f"Model already exists at {dest_path}, skipping download")
        return True

    # Ensure directory exists
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)

    download_url = _gdrive_direct_url(url)
    logger.info(f"Downloading model to {dest_path} from {download_url[:80]}...")

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=300.0) as client:
            response = await client.get(download_url)
            response.raise_for_status()

            # Write to a temp file first, then rename (atomic)
            temp_path = dest_path + ".tmp"
            with open(temp_path, "wb") as f:
                f.write(response.content)

            os.rename(temp_path, dest_path)
            size_mb = os.path.getsize(dest_path) / (1024 * 1024)
            logger.info(f"Model downloaded successfully: {dest_path} ({size_mb:.1f} MB)")
            return True

    except Exception as e:
        logger.error(f"Failed to download model from {url}: {e}")
        # Clean up partial file
        for p in [dest_path, dest_path + ".tmp"]:
            if os.path.exists(p):
                try:
                    os.remove(p)
                except OSError:
                    pass
        return False


async def ensure_models():
    """Download models if not present and URLs are configured."""
    tasks = [
        (settings.MODEL_DOWNLOAD_URL, settings.YOLO_MODEL_PATH),
        (settings.MODEL_FALLBACK_DOWNLOAD_URL, settings.YOLO_FALLBACK_MODEL),
    ]

    for url, path in tasks:
        if url and not os.path.exists(path):
            await download_model(url, path)
