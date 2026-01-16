"""
Model Export Utilities
Export trained models to ONNX, TorchScript, etc.
"""
import argparse
from pathlib import Path
from loguru import logger


def export_onnx(model_path: str, output_path: str = None, imgsz: int = 640):
    """
    Export YOLOv8 model to ONNX format
    
    Args:
        model_path: Path to .pt model file
        output_path: Output ONNX path (auto-generated if None)
        imgsz: Input image size
    """
    from ultralytics import YOLO
    
    model_path = Path(model_path)
    if not model_path.exists():
        logger.error(f"Model not found: {model_path}")
        return None
    
    logger.info(f"Loading model: {model_path}")
    model = YOLO(str(model_path))
    
    logger.info("Exporting to ONNX...")
    model.export(
        format="onnx",
        imgsz=imgsz,
        dynamic=True,
        simplify=True,
        opset=12,
    )
    
    onnx_path = model_path.with_suffix(".onnx")
    
    if output_path:
        import shutil
        shutil.move(str(onnx_path), output_path)
        onnx_path = Path(output_path)
    
    logger.success(f"ONNX model exported: {onnx_path}")
    return onnx_path


def export_torchscript(model_path: str, output_path: str = None, imgsz: int = 640):
    """
    Export YOLOv8 model to TorchScript format
    
    Args:
        model_path: Path to .pt model file
        output_path: Output path (auto-generated if None)
        imgsz: Input image size
    """
    from ultralytics import YOLO
    
    model_path = Path(model_path)
    if not model_path.exists():
        logger.error(f"Model not found: {model_path}")
        return None
    
    logger.info(f"Loading model: {model_path}")
    model = YOLO(str(model_path))
    
    logger.info("Exporting to TorchScript...")
    model.export(
        format="torchscript",
        imgsz=imgsz,
    )
    
    ts_path = model_path.with_suffix(".torchscript")
    
    if output_path:
        import shutil
        shutil.move(str(ts_path), output_path)
        ts_path = Path(output_path)
    
    logger.success(f"TorchScript model exported: {ts_path}")
    return ts_path


def export_tflite(model_path: str, output_path: str = None, imgsz: int = 640):
    """
    Export YOLOv8 model to TensorFlow Lite format
    
    Args:
        model_path: Path to .pt model file
        output_path: Output path (auto-generated if None)
        imgsz: Input image size
    """
    from ultralytics import YOLO
    
    model_path = Path(model_path)
    if not model_path.exists():
        logger.error(f"Model not found: {model_path}")
        return None
    
    logger.info(f"Loading model: {model_path}")
    model = YOLO(str(model_path))
    
    logger.info("Exporting to TFLite (this may take a while)...")
    model.export(
        format="tflite",
        imgsz=imgsz,
    )
    
    tflite_path = model_path.with_suffix(".tflite")
    
    if output_path:
        import shutil
        shutil.move(str(tflite_path), output_path)
        tflite_path = Path(output_path)
    
    logger.success(f"TFLite model exported: {tflite_path}")
    return tflite_path


def verify_onnx(onnx_path: str, test_image: str = None):
    """
    Verify ONNX model works correctly
    
    Args:
        onnx_path: Path to ONNX model
        test_image: Optional test image path
    """
    import onnxruntime as ort
    import numpy as np
    
    onnx_path = Path(onnx_path)
    if not onnx_path.exists():
        logger.error(f"ONNX model not found: {onnx_path}")
        return False
    
    logger.info(f"Loading ONNX model: {onnx_path}")
    
    try:
        session = ort.InferenceSession(str(onnx_path))
        
        # Get input/output info
        inputs = session.get_inputs()
        outputs = session.get_outputs()
        
        logger.info("Model inputs:")
        for inp in inputs:
            logger.info(f"  {inp.name}: {inp.shape} ({inp.type})")
        
        logger.info("Model outputs:")
        for out in outputs:
            logger.info(f"  {out.name}: {out.shape} ({out.type})")
        
        # Run inference with dummy data
        input_shape = inputs[0].shape
        # Handle dynamic dimensions
        batch = 1
        channels = 3
        height = input_shape[2] if isinstance(input_shape[2], int) else 640
        width = input_shape[3] if isinstance(input_shape[3], int) else 640
        
        dummy_input = np.random.randn(batch, channels, height, width).astype(np.float32)
        
        logger.info(f"Running inference with shape: {dummy_input.shape}")
        result = session.run(None, {inputs[0].name: dummy_input})
        
        logger.success("ONNX model verification passed!")
        return True
        
    except Exception as e:
        logger.error(f"ONNX verification failed: {e}")
        return False


def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(description="Export food segmentation model")
    
    parser.add_argument(
        "model",
        type=str,
        help="Path to .pt model file",
    )
    
    parser.add_argument(
        "--format",
        type=str,
        choices=["onnx", "torchscript", "tflite", "all"],
        default="onnx",
        help="Export format",
    )
    
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Output path",
    )
    
    parser.add_argument(
        "--imgsz",
        type=int,
        default=640,
        help="Input image size",
    )
    
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Verify ONNX model after export",
    )
    
    args = parser.parse_args()
    
    # Export
    if args.format == "onnx" or args.format == "all":
        onnx_path = export_onnx(args.model, args.output, args.imgsz)
        if args.verify and onnx_path:
            verify_onnx(onnx_path)
    
    if args.format == "torchscript" or args.format == "all":
        export_torchscript(args.model, args.output, args.imgsz)
    
    if args.format == "tflite" or args.format == "all":
        export_tflite(args.model, args.output, args.imgsz)


if __name__ == "__main__":
    main()
