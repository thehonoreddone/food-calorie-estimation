"""
Label Studio JSON export -> YOLOv8-seg dataset converter
========================================================

This script converts a Label Studio image segmentation export (polygonlabels)
into a YOLOv8-seg compatible dataset layout:

  <out>/
    images/
      train/*.jpg
      val/*.jpg
    labels/
      train/*.txt
      val/*.txt
    data.yaml

It supports two modes:
- mode=food  : class-agnostic segmentation (single class "food", id=0)
- mode=class : multi-class segmentation using polygonlabels values as classes

It also understands Label Studio local-files URLs like:
  /data/local-files/?d=dataset_200%5Chamburger%5C100057.jpg

In that case, you must pass --ls-root (the Label Studio local files document root),
and the script will resolve the real image path as:
  <ls-root>\\dataset_200\\hamburger\\100057.jpg

Usage examples (PowerShell):
  python tools/label_studio/ls_export_to_yolo_seg.py `
    --export-json project-3-at-2026-02-09-14-17-c1370e87.json `
    --ls-root C:\\labelstudio\\data `
    --out datasets\\ls_yolo_food `
    --mode food

  python tools/label_studio/ls_export_to_yolo_seg.py `
    --export-json project-3-at-2026-02-09-14-17-c1370e87.json `
    --ls-root C:\\labelstudio\\data `
    --out datasets\\ls_yolo_multiclass `
    --mode class
"""

from __future__ import annotations

import argparse
import json
import random
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple
from urllib.parse import parse_qs, unquote, urlparse


def _norm_label_for_ls(label: str) -> str:
    # Your LS export uses underscores, not hyphens.
    return label.strip().replace("-", "_")


def _clamp01(x: float) -> float:
    return 0.0 if x < 0.0 else (1.0 if x > 1.0 else x)


def _is_url(s: str) -> bool:
    try:
        u = urlparse(s)
        return u.scheme in ("http", "https")
    except Exception:
        return False


def resolve_ls_image_to_path(image_field: str, ls_root: Optional[Path]) -> Path:
    """
    Resolve Label Studio task['data']['image'] to a local filesystem path.
    Currently supports local-files URLs (/data/local-files/?d=...).
    """
    if not isinstance(image_field, str) or not image_field:
        raise ValueError("task.data.image must be a non-empty string")

    # Local file serving
    if image_field.startswith("/data/local-files/"):
        if ls_root is None:
            raise ValueError(
                "task.data.image is a Label Studio local-files URL, but --ls-root was not provided"
            )
        u = urlparse(image_field)
        qs = parse_qs(u.query)
        d_vals = qs.get("d") or []
        if not d_vals:
            raise ValueError(f"Could not find ?d= in local-files URL: {image_field}")
        rel = unquote(d_vals[0])  # may contain backslashes
        return (ls_root / Path(rel)).resolve()

    # Already a local path?
    p = Path(image_field)
    if p.exists():
        return p.resolve()

    # URL to a remote image is not supported in this converter (backend can fetch).
    if _is_url(image_field):
        raise ValueError(
            "task.data.image is a URL; converter only supports local files. "
            "Export with local files, or download images locally first."
        )

    raise ValueError(f"Unrecognized image field format or file does not exist: {image_field}")


def ls_points_to_yolo_poly(points_percent: Sequence[Sequence[float]]) -> List[float]:
    """
    Label Studio polygon 'points' are in percent-of-image (0..100).
    YOLO expects normalized (0..1) polygon coords.
    """
    poly: List[float] = []
    for xy in points_percent:
        if not (isinstance(xy, (list, tuple)) and len(xy) == 2):
            continue
        x = _clamp01(float(xy[0]) / 100.0)
        y = _clamp01(float(xy[1]) / 100.0)
        poly.extend([x, y])
    return poly


@dataclass(frozen=True)
class Region:
    label: str
    polygon: List[float]  # flat list x1 y1 x2 y2 ... (normalized 0..1)


def extract_regions_from_task(task: Dict[str, Any]) -> List[Region]:
    regions: List[Region] = []
    for ann in task.get("annotations") or []:
        for r in ann.get("result") or []:
            if r.get("type") != "polygonlabels":
                continue
            v = r.get("value") or {}
            pts = v.get("points") or []
            poly = ls_points_to_yolo_poly(pts)
            if len(poly) < 6:  # < 3 points
                continue
            labels = v.get("polygonlabels") or []
            if not labels:
                continue
            # LS allows multiple labels; we take the first one.
            label = _norm_label_for_ls(str(labels[0]))
            regions.append(Region(label=label, polygon=poly))
    return regions


def write_yolo_label_file(label_path: Path, lines: Iterable[str]) -> None:
    label_path.parent.mkdir(parents=True, exist_ok=True)
    label_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def build_data_yaml(
    out_dir: Path, class_names: List[str], train_rel: str = "images/train", val_rel: str = "images/val"
) -> None:
    data = {
        "path": str(out_dir.resolve()),
        "train": train_rel,
        "val": val_rel,
        "names": {i: name for i, name in enumerate(class_names)},
    }
    (out_dir / "data.yaml").write_text(
        "\n".join(
            [
                f"path: {data['path']}",
                f"train: {data['train']}",
                f"val: {data['val']}",
                "names:",
                *[f"  {i}: {name}" for i, name in enumerate(class_names)],
                "",
            ]
        ),
        encoding="utf-8",
    )


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser()
    ap.add_argument("--export-json", type=str, required=True, help="Label Studio export JSON file")
    ap.add_argument("--ls-root", type=str, default=None, help="Label Studio local files document root (for /data/local-files URLs)")
    ap.add_argument("--out", type=str, required=True, help="Output dataset folder")
    ap.add_argument("--mode", choices=("food", "class"), default="food", help="food=single class, class=multi-class")
    ap.add_argument("--seed", type=int, default=42, help="Random seed for train/val split")
    ap.add_argument("--val-ratio", type=float, default=0.2, help="Validation ratio")
    ap.add_argument("--copy-images", action="store_true", help="Copy images into output dataset (recommended). If false, only labels+yaml are written.")
    return ap.parse_args()


def main() -> None:
    args = parse_args()
    export_path = Path(args.export_json)
    out_dir = Path(args.out)
    ls_root = Path(args.ls_root) if args.ls_root else None

    tasks = json.loads(export_path.read_text(encoding="utf-8"))
    if not isinstance(tasks, list):
        raise ValueError("Expected Label Studio export to be a JSON list of tasks")

    random.seed(args.seed)
    idxs = list(range(len(tasks)))
    random.shuffle(idxs)
    n_val = int(len(idxs) * float(args.val_ratio))
    val_set = set(idxs[:n_val])

    # Collect class names
    class_names: List[str]
    if args.mode == "food":
        class_names = ["food"]
        cls_to_id = {"food": 0}
    else:
        labels = set()
        for t in tasks:
            for reg in extract_regions_from_task(t):
                labels.add(reg.label)
        class_names = sorted(labels)
        cls_to_id = {c: i for i, c in enumerate(class_names)}

    # Output dirs
    img_train = out_dir / "images" / "train"
    img_val = out_dir / "images" / "val"
    lab_train = out_dir / "labels" / "train"
    lab_val = out_dir / "labels" / "val"
    for d in (img_train, img_val, lab_train, lab_val):
        d.mkdir(parents=True, exist_ok=True)

    copied = 0
    written = 0
    skipped_no_regions = 0
    skipped_missing = 0

    for i, t in enumerate(tasks):
        data = t.get("data") or {}
        image_field = data.get("image")
        if not image_field:
            continue

        try:
            src_img = resolve_ls_image_to_path(str(image_field), ls_root)
        except ValueError:
            skipped_missing += 1
            continue

        if not src_img.exists():
            skipped_missing += 1
            continue

        regions = extract_regions_from_task(t)
        if not regions:
            skipped_no_regions += 1
            continue

        split = "val" if i in val_set else "train"
        out_img_dir = img_val if split == "val" else img_train
        out_lab_dir = lab_val if split == "val" else lab_train

        # Use stable name based on task id when possible
        stem = str(t.get("id") or src_img.stem)
        out_img = out_img_dir / (stem + src_img.suffix.lower())
        out_lab = out_lab_dir / (stem + ".txt")

        if args.copy_images:
            if not out_img.exists():
                shutil.copy2(src_img, out_img)
                copied += 1

        lines: List[str] = []
        for reg in regions:
            if args.mode == "food":
                cls_id = 0
            else:
                if reg.label not in cls_to_id:
                    continue
                cls_id = cls_to_id[reg.label]
            # YOLO seg format: class x1 y1 x2 y2 ...
            coords = " ".join(f"{v:.6f}" for v in reg.polygon)
            lines.append(f"{cls_id} {coords}")

        if lines:
            write_yolo_label_file(out_lab, lines)
            written += 1

    build_data_yaml(out_dir, class_names)

    print("OK")
    print(" tasks_total:", len(tasks))
    print(" mode:", args.mode)
    print(" classes:", len(class_names))
    print(" labels_written:", written)
    print(" images_copied:", copied if args.copy_images else 0)
    print(" skipped_no_regions:", skipped_no_regions)
    print(" skipped_missing:", skipped_missing)
    print(" out:", str(out_dir.resolve()))


if __name__ == "__main__":
    main()



