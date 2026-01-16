# Example Commands for Food Calorie Estimation Pipeline

## Windows Command Prompt Examples

### Basic Usage (requires your own classifier)
```cmd
python demo\run_pipeline.py --image demo\examples\your_food.jpg --classifier path\to\checkpoint.pth
```

### With Visualization
```cmd
python demo\run_pipeline.py --image demo\examples\your_food.jpg --classifier path\to\checkpoint.pth --visualize
```

### Save Results to File
```cmd
python demo\run_pipeline.py --image demo\examples\your_food.jpg --classifier path\to\checkpoint.pth --save --output results
```

### With Custom YOLOv8 Model
```cmd
python demo\run_pipeline.py --image demo\examples\your_food.jpg --classifier path\to\checkpoint.pth --yolov8_seg path\to\yolov8n-seg.pt
```

### With Depth Estimation
```cmd
python demo\run_pipeline.py --image demo\examples\your_food.jpg --classifier path\to\checkpoint.pth --depth_model midas_small
```

### Full Options
```cmd
python demo\run_pipeline.py --image demo\examples\your_food.jpg --classifier path\to\checkpoint.pth --class_names path\to\class_names.json --yolov8_seg path\to\yolov8n-seg.pt --depth_model midas_hybrid --visualize --save --output results --device cuda
```

### Disable Segmentation (faster but less accurate)
```cmd
python demo\run_pipeline.py --image demo\examples\your_food.jpg --classifier path\to\checkpoint.pth --no_segmentation
```


## PowerShell Examples

### Basic Usage
```powershell
python demo/run_pipeline.py --image demo/examples/your_food.jpg --classifier path/to/checkpoint.pth
```

### Full Options (multi-line)
```powershell
python demo/run_pipeline.py `
    --image demo/examples/your_food.jpg `
    --classifier path/to/checkpoint.pth `
    --class_names path/to/class_names.json `
    --yolov8_seg path/to/yolov8n-seg.pt `
    --depth_model midas_hybrid `
    --visualize `
    --save `
    --output results `
    --device cuda
```


## Linux/Mac Examples

### Basic Usage
```bash
python demo/run_pipeline.py --image demo/examples/your_food.jpg --classifier path/to/checkpoint.pth
```

### Full Options
```bash
python demo/run_pipeline.py \
    --image demo/examples/your_food.jpg \
    --classifier path/to/checkpoint.pth \
    --class_names path/to/class_names.json \
    --yolov8_seg path/to/yolov8n-seg.pt \
    --depth_model midas_hybrid \
    --visualize \
    --save \
    --output results \
    --device cuda
```


## Expected Classifier Structure

Your trained classifier should follow this structure:
```
outputs/
  run_001/
    checkpoints/
      checkpoint_best.pth    # Your trained model
    class_names.json         # List of class names ["class1", "class2", ...]
```

The pipeline will automatically look for class_names.json in:
1. Same directory as checkpoint
2. Parent directory of checkpoint
3. Grandparent directory


## Troubleshooting

### "Classifier checkpoint not found"
- Check the path to your .pth file
- Use absolute paths to avoid issues

### "class_names.json not found"
- Create a class_names.json file with format: ["apple_pie", "pizza", ...]
- Place it in the same directory as your checkpoint

### "CUDA out of memory"
- Use --device cpu to force CPU mode
- Use --no_segmentation to reduce memory usage
- Use --depth_model none to skip depth estimation

### Slow performance
- Use --depth_model midas_small (smallest model)
- Use --no_segmentation for faster (but less accurate) results
- Use --device cuda if you have a GPU
