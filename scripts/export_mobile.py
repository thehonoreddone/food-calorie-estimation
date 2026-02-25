"""
Export trained models to mobile-optimized formats (ONNX)
========================================================
Eğitilmiş modelleri mobil cihazlarda çalışacak şekilde export eder.

Segmentasyon (YOLOv8):
  - Ultralytics zaten ONNX export destekliyor
  - INT8 quantization ile ~4x küçültme

Sınıflandırma (EfficientNet-B2):
  - PyTorch → ONNX → Quantize
  - FP32: ~31MB → INT8: ~8MB

Kullanım:
    # Her iki modeli de export et
    python scripts/export_mobile.py

    # Sadece segmentasyon
    python scripts/export_mobile.py --seg-only

    # Sadece sınıflandırma
    python scripts/export_mobile.py --cls-only

Çıktı:
    app/backend/models/food_seg_mobile.onnx        -> Seg model (ONNX)
    app/backend/models/food_cls_mobile.onnx        -> Cls model (ONNX)
    app/mobile/assets/models/food_seg.onnx         -> Mobil kopyası
    app/mobile/assets/models/food_cls.onnx         -> Mobil kopyası
"""

import argparse
import json
import shutil
from pathlib import Path

import torch
import torch.nn as nn

ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = ROOT / "app" / "backend" / "models"
MOBILE_MODELS_DIR = ROOT / "app" / "mobile" / "assets" / "models"


def export_segmentation(seg_model_path: Path, output_dir: Path, imgsz: int = 640):
    """Export YOLOv8 segmentation model to ONNX."""
    from ultralytics import YOLO

    print("\n" + "=" * 50)
    print("EXPORTING SEGMENTATION MODEL")
    print("=" * 50)

    if not seg_model_path.exists():
        print(f"  ERROR: Model not found: {seg_model_path}")
        print("  Run segmentation training first or check path")
        return None

    model = YOLO(str(seg_model_path))

    # Export to ONNX
    onnx_path = model.export(
        format="onnx",
        imgsz=imgsz,
        simplify=True,
        dynamic=False,  # Fixed size for mobile
        opset=13,
        half=False,     # FP32 for compatibility
    )

    onnx_path = Path(onnx_path)
    dst = output_dir / "food_seg.onnx"
    shutil.copy2(onnx_path, dst)

    orig_size = seg_model_path.stat().st_size / 1024 / 1024
    onnx_size = dst.stat().st_size / 1024 / 1024
    print(f"  Original:  {orig_size:.1f} MB (.pt)")
    print(f"  ONNX:      {onnx_size:.1f} MB")
    print(f"  Saved to:  {dst}")

    return dst


def export_classification(cls_model_path: Path, output_dir: Path, imgsz: int = 260):
    """Export EfficientNet classification model to ONNX with quantization."""
    from torchvision import models

    print("\n" + "=" * 50)
    print("EXPORTING CLASSIFICATION MODEL")
    print("=" * 50)

    if not cls_model_path.exists():
        print(f"  ERROR: Model not found: {cls_model_path}")
        print("  Run classification training first or check path")
        return None

    # Load checkpoint
    ckpt = torch.load(cls_model_path, map_location="cpu", weights_only=False)
    arch = ckpt.get("arch", "efficientnet_b2")
    num_classes = ckpt.get("num_classes", 201)
    class_names = ckpt.get("class_names", [])
    state_dict = ckpt.get("model_state_dict", ckpt)

    print(f"  Architecture: {arch}")
    print(f"  Classes:      {num_classes}")

    # Recreate model
    if arch == "efficientnet_b2":
        model = models.efficientnet_b2(weights=None)
        in_features = model.classifier[1].in_features
        model.classifier = nn.Sequential(
            nn.Dropout(p=0.3),
            nn.Linear(in_features, num_classes),
        )
    elif arch == "efficientnet_b0":
        model = models.efficientnet_b0(weights=None)
        in_features = model.classifier[1].in_features
        model.classifier = nn.Sequential(
            nn.Dropout(p=0.2),
            nn.Linear(in_features, num_classes),
        )
    else:
        print(f"  ERROR: Unsupported architecture: {arch}")
        return None

    model.load_state_dict(state_dict)
    model.eval()

    # Export to ONNX
    dummy_input = torch.randn(1, 3, imgsz, imgsz)
    onnx_fp32 = output_dir / "food_cls.onnx"

    torch.onnx.export(
        model,
        dummy_input,
        str(onnx_fp32),
        export_params=True,
        opset_version=13,
        do_constant_folding=True,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes=None,  # Fixed size for mobile
    )

    # Quantize to INT8
    try:
        from onnxruntime.quantization import quantize_dynamic, QuantType
        onnx_int8 = output_dir / "food_cls_int8.onnx"
        quantize_dynamic(
            str(onnx_fp32),
            str(onnx_int8),
            weight_type=QuantType.QUInt8,
        )
        print(f"  INT8 quantized model created")
    except ImportError:
        onnx_int8 = None
        print("  WARNING: onnxruntime not installed, skipping quantization")
        print("  Install with: pip install onnxruntime")

    # Save class names alongside model
    if class_names:
        cls_json = output_dir / "food_cls_classes.json"
        with open(cls_json, "w", encoding="utf-8") as f:
            json.dump(class_names, f, indent=2, ensure_ascii=False)
        print(f"  Class names: {cls_json}")

    orig_size = cls_model_path.stat().st_size / 1024 / 1024
    fp32_size = onnx_fp32.stat().st_size / 1024 / 1024
    print(f"  Original:  {orig_size:.1f} MB (.pth)")
    print(f"  ONNX FP32: {fp32_size:.1f} MB")
    if onnx_int8 and onnx_int8.exists():
        int8_size = onnx_int8.stat().st_size / 1024 / 1024
        print(f"  ONNX INT8: {int8_size:.1f} MB (mobile-ready)")

    return onnx_fp32


def parse_args():
    p = argparse.ArgumentParser(description="Export models for mobile deployment")
    p.add_argument("--seg-model", type=str, default=str(MODELS_DIR / "food_seg_best.pt"),
                   help="Segmentation model path")
    p.add_argument("--cls-model", type=str, default=str(MODELS_DIR / "checkpoint_best.pth"),
                   help="Classification model path")
    p.add_argument("--seg-only", action="store_true", help="Export only segmentation")
    p.add_argument("--cls-only", action="store_true", help="Export only classification")
    p.add_argument("--imgsz-seg", type=int, default=640, help="Seg input size")
    p.add_argument("--imgsz-cls", type=int, default=260, help="Cls input size")
    return p.parse_args()


def main():
    args = parse_args()

    MOBILE_MODELS_DIR.mkdir(parents=True, exist_ok=True)

    do_seg = not args.cls_only
    do_cls = not args.seg_only

    if do_seg:
        # Also try runs/ if not in models/
        seg_path = Path(args.seg_model)
        if not seg_path.exists():
            alt = ROOT / "runs" / "segment" / "food_seg_v4" / "weights" / "best.pt"
            if alt.exists():
                seg_path = alt
        export_segmentation(seg_path, MOBILE_MODELS_DIR, args.imgsz_seg)

    if do_cls:
        # Also try runs/ if not in models/
        cls_path = Path(args.cls_model)
        if not cls_path.exists():
            alt = ROOT / "runs" / "classify" / "food_cls_201" / "checkpoint_best.pth"
            if alt.exists():
                cls_path = alt
        export_classification(cls_path, MOBILE_MODELS_DIR, args.imgsz_cls)

    print("\n" + "=" * 50)
    print("EXPORT COMPLETE")
    print("=" * 50)
    print(f"Mobile models: {MOBILE_MODELS_DIR}")
    if MOBILE_MODELS_DIR.exists():
        for f in sorted(MOBILE_MODELS_DIR.iterdir()):
            sz = f.stat().st_size / 1024 / 1024
            print(f"  {f.name}: {sz:.1f} MB")


if __name__ == "__main__":
    main()
