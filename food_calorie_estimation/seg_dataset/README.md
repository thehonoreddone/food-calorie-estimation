# FoodSeg103 Segmentation Model Training

Bu klasör, FoodSeg103 dataseti ile YOLOv8-seg modelini eğitmek için gerekli scriptleri içerir.

## FoodSeg103 Nedir?

FoodSeg103, 103 farklı yemek sınıfı için piksel düzeyinde segmentasyon annotation'larına sahip bir datasettir.
Bu dataset sayesinde:
- Sadece yemek alanları segmente edilir (arka plan, tabak hariç)
- Her yemek instance'ı için sınıf tahmini yapılabilir
- Derinlik hesaplaması için temiz mask'lar elde edilir

## Hızlı Başlangıç

```bash
# 1. Gerekli paketleri yükle
pip install datasets ultralytics pyyaml tqdm opencv-python

# 2. Dataset'i hazırla (HuggingFace'den indirir)
python prepare_dataset.py

# 3. Modeli eğit
python train_seg.py
```

## Detaylı Kullanım

### Dataset Hazırlama

```bash
python prepare_dataset.py
```

Bu script:
1. FoodSeg103 datasetini HuggingFace'den indirir
2. Mask'ları YOLOv8-seg formatına (polygon) dönüştürür
3. `dataset/` klasörüne train/val split'lerini kaydeder
4. `data.yaml` ve `class_names.json` oluşturur

Çıktı yapısı:
```
dataset/
├── images/
│   ├── train/
│   └── val/
├── labels/
│   ├── train/
│   └── val/
├── data.yaml
└── class_names.json
```

### Model Eğitimi

```bash
# Varsayılan ayarlarla eğitim (50 epoch)
python train_seg.py

# Özel parametrelerle
python train_seg.py --epochs 100 --batch 16 --imgsz 640

# GPU belleği az ise
python train_seg.py --epochs 50 --batch 4 --imgsz 512
```

#### Eğitim Parametreleri

| Parametre | Varsayılan | Açıklama |
|-----------|------------|----------|
| `--epochs` | 50 | Eğitim epoch sayısı |
| `--batch` | 8 | Batch size (GPU belleğine göre ayarla) |
| `--imgsz` | 640 | Input görüntü boyutu |
| `--device` | auto | Device (cuda:0, cpu) |
| `--patience` | 20 | Early stopping patience |
| `--lr0` | 0.01 | Başlangıç learning rate |
| `--freeze` | 0 | Dondurulacak layer sayısı |

### Eğitim Çıktıları

Eğitim tamamlandığında:
```
seg_dataset/
├── foodseg103_best.pt       # En iyi model
├── runs/segment/foodseg103/ # Detaylı loglar
│   ├── weights/
│   │   ├── best.pt
│   │   └── last.pt
│   └── results.csv

thend_food101_and_others/
└── foodseg103_seg.pt        # Proje ana klasörüne kopyalanır
```

## Modeli Kullanma

Eğitim sonrası pipeline otomatik olarak FoodSeg103 modelini kullanır:

```bash
cd ..
python demo/run_pipeline.py --image test.jpg --classifier outputs/run_001/checkpoints/checkpoint_best.pth
```

Manuel kullanım:
```python
from modules.segmentation_foodseg103 import FoodSeg103Segmentor

# Model yükle
segmentor = FoodSeg103Segmentor(model_path="foodseg103_seg.pt")

# Inference
from PIL import Image
image = Image.open("food.jpg")
result = segmentor.segment(image)

# Sonuçları işle
for instance in result.instances:
    print(f"{instance.class_name}: {instance.area_pixels} px, conf: {instance.confidence:.2f}")
```

## GPU Bellek Gereksinimleri

| Batch Size | ~GPU Bellek |
|------------|-------------|
| 4 | ~4 GB |
| 8 | ~8 GB |
| 16 | ~12 GB |
| 32 | ~20 GB |

## Sorun Giderme

### "CUDA out of memory"
```bash
# Batch size'ı düşür
python train_seg.py --batch 4

# veya görüntü boyutunu küçült
python train_seg.py --batch 8 --imgsz 512
```

### Dataset indirme hatası
```bash
# HuggingFace cache'ini temizle
rm -rf ~/.cache/huggingface/datasets/EduardoPacheco___food_seg103
python prepare_dataset.py
```

### Model bulunamadı hatası
Pipeline çalıştırırken "FoodSeg103 model bulunamadı" hatası alıyorsanız:
1. Eğitimi tamamlayın
2. `foodseg103_seg.pt` dosyasının proje kök klasöründe olduğundan emin olun

## Sınıf Listesi

FoodSeg103 aşağıdaki 103 yemek sınıfını içerir:
- Meyveler: apple, banana, orange, grape, ...
- Sebzeler: carrot, broccoli, tomato, ...
- Et: steak, chicken, ...
- Deniz ürünleri: fish, shrimp, ...
- Tatlılar: cake, cookie, ice_cream, ...
- Ve daha fazlası...

Tam liste için eğitim sonrası oluşturulan `class_names.json` dosyasına bakın.
