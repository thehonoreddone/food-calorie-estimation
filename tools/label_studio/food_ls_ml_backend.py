
from __future__ import annotations

import base64
import io
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import parse_qs, unquote, urlparse

import numpy as np
import torch
from fastapi import FastAPI, HTTPException
from PIL import Image


def _norm_label(label: str) -> str:
    # Label Studio project labels in your export are underscore-style.
    return label.strip().replace("-", "_")


def _infer_label_from_localfiles_url(image_url: str) -> Optional[str]:
    """
    From: /data/local-files/?d=dataset_200%5Chamburger%5C100057.jpg
    Infer: hamburger
    """
    try:
        u = urlparse(image_url)
        qs = parse_qs(u.query)
        d = (qs.get("d") or [None])[0]
        if not d:
            return None
        rel = unquote(d)  # can contain backslashes
        p = Path(rel)
        if p.parent.name:
            return _norm_label(p.parent.name)
        return None
    except Exception:
        return None


def _resolve_localfiles_to_path(image_url: str, ls_root: Path) -> Path:
    u = urlparse(image_url)
    qs = parse_qs(u.query)
    d = (qs.get("d") or [None])[0]
    if not d:
        raise ValueError("Missing ?d= in /data/local-files/ URL")
    
    rel = unquote(d) # Bu değer 'dataset_200\baby_back_ribs\1550594.jpg'
    
    # DİKKAT: Burada ls_root'u ve her şeyi boşverip direkt C sürücüsüne bakıyoruz
    # Eğer resimlerin tam yolu C:\dataset_200\... ise:
    final_path = Path("C:/") / Path(rel)
    
    print(f"DEBUG: Backend su dosyayi ariyor: {final_path}")
    return final_path.resolve()


def load_image_from_task(task: Dict[str, Any]) -> Tuple[Image.Image, str]:
    """
    Returns: (PIL image, inferred_label)
    """
    data = task.get("data") or {}
    img_field = data.get("image")
    if not isinstance(img_field, str) or not img_field:
        raise ValueError("task.data.image must be a non-empty string")

    # Base64
    if img_field.startswith("data:image"):
        try:
            b64 = img_field.split(",", 1)[1]
            image_bytes = base64.b64decode(b64)
            im = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            return im, "food"
        except Exception as e:
            raise ValueError(f"Failed to decode base64 image: {e}") from e

    # Local-files URL
    if img_field.startswith("/data/local-files/"):
        ls_root = os.getenv("LS_LOCAL_FILES_ROOT", "C:\\")  # Default to C:\
        label = _infer_label_from_localfiles_url(img_field) or "food"
        path = _resolve_localfiles_to_path(img_field, Path(ls_root))
        if not path.exists():
            raise ValueError(f"Local file not found: {path}")
        im = Image.open(path).convert("RGB")
        return im, label

    # URL fetch (optional)
    if _is_url(img_field):
        try:
            import httpx

            with httpx.Client(timeout=30) as client:
                r = client.get(img_field)
                r.raise_for_status()
                im = Image.open(io.BytesIO(r.content)).convert("RGB")
                return im, "food"
        except Exception as e:
            raise ValueError(f"Failed to fetch remote image: {e}") from e

    # Local path
    p = Path(img_field)
    if p.exists():
        im = Image.open(p).convert("RGB")
        return im, _norm_label(p.parent.name) if p.parent.name else "food"

    raise ValueError(f"Unrecognized image path/URL: {img_field}")


def _poly_pixels_to_ls_points(poly_xy: np.ndarray, w: int, h: int) -> List[List[float]]:
    pts: List[List[float]] = []
    for x, y in poly_xy:
        pts.append([float(x) / w * 100.0, float(y) / h * 100.0])
    return pts


class YoloSegModel:
    def __init__(self, model_path: str, device: str):
        from ultralytics import YOLO

        self.model_path = model_path
        self.device = device
        self.model = YOLO(model_path)

    def predict_regions(self, image: Image.Image, label: str) -> Tuple[List[Dict[str, Any]], float]:
        """
        Returns (regions, score)
        regions: Label Studio `polygonlabels` result items
        score: aggregated confidence
        """
        w, h = image.size
        results = self.model.predict(source=image, device=self.device, verbose=False)
        if not results:
            return [], 0.0

        r = results[0]
        if r.masks is None or r.masks.xy is None:
            return [], 0.0

        confs: List[float] = []
        if r.boxes is not None and r.boxes.conf is not None:
            confs = [float(x) for x in r.boxes.conf.tolist()]
        
        # Get class indices from boxes
        cls_indices = []
        if r.boxes is not None and r.boxes.cls is not None:
            cls_indices = [int(x) for x in r.boxes.cls.tolist()]

        regions: List[Dict[str, Any]] = []
        for i, poly in enumerate(r.masks.xy):
            # poly is Nx2 in pixel coords
            points = _poly_pixels_to_ls_points(np.asarray(poly), w=w, h=h)
            if len(points) < 3:
                continue
            
            # Get the predicted class name from the model
            if i < len(cls_indices):
                class_idx = cls_indices[i]
                class_name = self.model.names.get(class_idx, label)
            else:
                class_name = label
            
            regions.append(
                {
                    "id": f"pred_{i}",
                    "from_name": os.getenv("LS_FROM_NAME", "label"),
                    "to_name": os.getenv("LS_TO_NAME", "image"),
                    "type": "polygonlabels",
                    "value": {
                        "points": points,
                        "closed": True,
                        "polygonlabels": [_norm_label(class_name)],
                    },
                }
            )

        score = float(np.mean(confs)) if confs else (1.0 if regions else 0.0)
        return regions, score


MODEL_PATH = os.getenv("MODEL_PATH", r"C:\Users\User\Desktop\thend_food101_and_others\runs\segment\manual_food_v3\weights\best.pt")
DEVICE = os.getenv("DEVICE", "0") if os.getenv("DEVICE") else ("0" if torch.cuda.is_available() else "cpu")
MODEL_VERSION = os.getenv("MODEL_VERSION", Path(MODEL_PATH).name)

app = FastAPI(title="Food Label Studio ML Backend", version="1.0.0")
model = YoloSegModel(MODEL_PATH, DEVICE)


@app.get("/health")
def health() -> Dict[str, Any]:
    return {"status": "ok", "model": MODEL_PATH, "device": DEVICE, "version": MODEL_VERSION}

@app.post("/setup")
def setup(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Label Studio bu endpoint'e projenin etiketleme konfigürasyonunu gönderir.
    Şu an için sadece 'ok' dönmemiz bağlantı için yeterlidir.
    """
    print(f"Setup received for project: {payload.get('project')}")
    return {"status": "ok", "model_version": MODEL_VERSION}

@app.post("/predict")
def predict(payload: Dict[str, Any]) -> Any:
    """
    Compatible with different LS payload variants:
      - {"tasks": [task1, task2, ...], ...}
      - {"task": task}
    Returns:
      - list of predictions (one per task)
    """
    tasks = payload.get("tasks")
    if tasks is None:
        one = payload.get("task")
        if one is None:
            raise HTTPException(status_code=400, detail="Missing 'tasks' or 'task' in request payload")
        tasks = [one]

    if not isinstance(tasks, list):
        raise HTTPException(status_code=400, detail="'tasks' must be a list")

    preds: List[Dict[str, Any]] = []
    for t in tasks:
        try:
            image, inferred_label = load_image_from_task(t)
            regions, score = model.predict_regions(image, inferred_label)
            print(f"DEBUG: Found {len(regions)} regions with score {score:.2f}")
            for r in regions[:3]:  # Show first 3
                print(f"  -> Label: {r['value']['polygonlabels']}, Points: {len(r['value']['points'])}")
            preds.append(
                {
                    "result": regions,
                    "score": score,
                    "model_version": MODEL_VERSION,
                }
            )
        except Exception as e:
            print(f"DEBUG: Error processing task: {e}")
            # Return empty prediction for this task but keep alignment with tasks list
            preds.append({"result": [], "score": 0.0, "model_version": MODEL_VERSION, "error": str(e)})

    print(f"DEBUG: Returning {len(preds)} predictions")
    # Label Studio expects {"results": [...]} format
    return {"results": preds}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)



