# 🍽️ Food Calorie Estimation System

AI destekli yemek tanıma, segmentasyon ve kalori tahmini sistemi.

## 📋 İçindekiler

- [Genel Bakış](#-genel-bakış)
- [Sistem Mimarisi](#-sistem-mimarisi)
- [Kurulum](#-kurulum)
- [Çalıştırma](#-çalıştırma)
- [API Kullanımı](#-api-kullanımı)
- [Proje Yapısı](#-proje-yapısı)
- [Modüller](#-modüller)
- [Sorun Giderme](#-sorun-giderme)

---

## 🎯 Genel Bakış

Bu sistem, yemek fotoğraflarından otomatik olarak:
- **Yemek türünü** tanır (201+ sınıf)
- **Porsiyon boyutunu** tahmin eder (gram)
- **Kalori miktarını** hesaplar (kcal)

### Temel Özellikler

| Özellik | Açıklama |
|---------|----------|
| 🔍 Yemek Sınıflandırma | EfficientNet-B0 ile 201+ yemek sınıfı tanıma |
| 🎨 Segmentasyon | FoodSeg103 veya YOLOv8 ile piksel düzeyinde segmentasyon |
| ⚖️ Porsiyon Tahmini | Geometrik hesaplama ile gram cinsinden ağırlık |
| 🔥 Kalori Hesaplama | Besin değeri veritabanı ile kalori tahmini |
| 📱 Web Arayüzü | Next.js ile modern mobil uyumlu arayüz |
| 🔥 Firebase | Gerçek zamanlı veritabanı ve kimlik doğrulama |

---

## 🏗️ Sistem Mimarisi

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │  Home   │  │  Scan   │  │  Foods  │  │Settings │            │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘            │
│       └────────────┴────────────┴────────────┘                  │
│                           │ HTTP/REST                           │
└───────────────────────────┼─────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────┐
│                    BACKEND (FastAPI)                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   API Routers                                ││
│  │  /api/v1/predict  │  /api/v1/foods  │  /health              ││
│  └─────────────────────────────────────────────────────────────┘│
│                           │                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Services                                  ││
│  │  PredictionService │ ModelService │ CalorieService          ││
│  │  LegacyPipelineService (EfficientNet + FoodSeg103)          ││
│  └─────────────────────────────────────────────────────────────┘│
│                           │                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    ML Models                                 ││
│  │  ┌───────────────┐  ┌───────────────┐  ┌─────────────────┐ ││
│  │  │ EfficientNet  │  │  FoodSeg103   │  │    YOLOv8      │ ││
│  │  │  Classifier   │  │  Segmentor    │  │   (fallback)   │ ││
│  │  └───────────────┘  └───────────────┘  └─────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────┐
│                       FIREBASE                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Firestore  │  │   Storage   │  │   Authentication        │ │
│  │  (configs)  │  │  (images)   │  │   (users)               │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Kurulum

### Gereksinimler

- Python 3.10+
- Node.js 18+
- CUDA (opsiyonel, GPU hızlandırma için)

### 1. Backend Kurulumu

```powershell
# Proje dizinine git
cd app/backend

# Sanal ortam oluştur (opsiyonel ama önerilen)
python -m venv .venv
.\.venv\Scripts\activate

# Bağımlılıkları yükle
pip install -r requirements.txt

# Firebase ve Google Cloud kütüphaneleri
pip install firebase-admin google-cloud-storage
```

### 2. Frontend Kurulumu

```powershell
cd app/frontend

# Bağımlılıkları yükle
npm install
```

### 3. Ortam Değişkenleri

**Backend** (`app/backend/.env`):
```env
DEBUG=False
FIREBASE_PROJECT_ID=food-calorie-estimation-2e3bd
YOLO_MODEL_PATH=models/foodseg103_seg.pt
```

**Frontend** (`app/frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=food-calorie-estimation-2e3bd
```

---

## ▶️ Çalıştırma

### Hızlı Başlangıç (Her İki Servis)

**Terminal 1 - Backend:**
```powershell
cd app/backend
python main.py
# veya
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 - Frontend:**
```powershell
cd app/frontend
npm run dev
```

### Erişim Adresleri

| Servis | URL | Açıklama |
|--------|-----|----------|
| Frontend | http://localhost:3000 | Web arayüzü |
| Backend API | http://localhost:8000 | REST API |
| API Docs | http://localhost:8000/docs | Swagger UI |
| API ReDoc | http://localhost:8000/redoc | ReDoc UI |

### Sadece Pipeline Test (CLI)

Eski pipeline'ı doğrudan test etmek için:

```powershell
cd food_calorie_estimation
python demo/run_pipeline.py --image demo/examples/pizza.jpg --classifier outputs/run_20251216_140119/checkpoints/checkpoint_best.pth --visualize
```

---

## 📡 API Kullanımı

### Yemek Tahmini

```bash
# cURL ile
curl -X POST "http://localhost:8000/api/v1/predict/" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@food.jpg"
```

**Yanıt:**
```json
{
  "class_name": "pizza",
  "confidence": 0.95,
  "estimated_weight_grams": 250.5,
  "estimated_calories": 665.3,
  "mask_base64": "iVBORw0KGgo..."
}
```

### Yemek Listesi

```bash
curl "http://localhost:8000/api/v1/foods/"
```

### Sağlık Kontrolü

```bash
curl "http://localhost:8000/health"
```

---

## 📁 Proje Yapısı

```
thend_food101_and_others/
├── app/
│   ├── backend/                 # FastAPI Backend
│   │   ├── main.py              # Uygulama giriş noktası
│   │   ├── requirements.txt     # Python bağımlılıkları
│   │   ├── app/
│   │   │   ├── core/            # Temel ayarlar ve yapılandırma
│   │   │   │   ├── config.py    # Uygulama ayarları
│   │   │   │   └── exceptions.py # Özel hatalar
│   │   │   ├── routers/         # API endpoint'leri
│   │   │   │   ├── predict.py   # /api/v1/predict
│   │   │   │   ├── foods.py     # /api/v1/foods
│   │   │   │   └── health.py    # /health
│   │   │   ├── services/        # İş mantığı
│   │   │   │   ├── prediction_service.py    # Tahmin orkestratör
│   │   │   │   ├── model_service.py         # ML model yönetimi
│   │   │   │   ├── calorie_service.py       # Kalori hesaplama
│   │   │   │   ├── legacy_pipeline_service.py # Eski sistem entegrasyonu
│   │   │   │   └── firebase_config_service.py # Firebase config
│   │   │   ├── models/          # Pydantic şemaları
│   │   │   └── domain/          # Domain entity'leri
│   │   ├── config/              # JSON yapılandırma dosyaları
│   │   │   ├── class_names.json
│   │   │   ├── densities.json
│   │   │   └── kcal_per_gram.json
│   │   └── models/              # ML model dosyaları (.pt)
│   │
│   ├── frontend/                # Next.js Frontend
│   │   ├── app/                 # Next.js App Router
│   │   │   ├── page.tsx         # Ana sayfa
│   │   │   ├── predict/         # Tarama sayfası
│   │   │   ├── foods/           # Yemek listesi
│   │   │   └── settings/        # Ayarlar
│   │   ├── components/          # React bileşenleri
│   │   ├── services/            # API istemcisi
│   │   └── lib/                 # Yardımcı fonksiyonlar
│   │
│   └── infrastructure/          # Firebase ve altyapı
│       ├── firebase/
│       └── scripts/
│
├── food_calorie_estimation/     # Orijinal ML Pipeline
│   ├── demo/
│   │   └── run_pipeline.py      # CLI tahmin aracı
│   ├── inference/               # Tahmin modülleri
│   │   ├── classify_food.py     # Sınıflandırıcı
│   │   ├── segment_food.py      # Segmentasyon
│   │   ├── estimate_portion.py  # Porsiyon tahmini
│   │   └── estimate_calories.py # Kalori hesaplama
│   ├── modules/                 # Alt modüller
│   │   ├── segmentation_foodseg103.py
│   │   ├── segmentation_yolov8.py
│   │   └── food_type_analyzer.py
│   ├── utils/                   # Yardımcı araçlar
│   │   ├── config.py
│   │   ├── densities.json
│   │   └── kcal_per_gram.json
│   └── outputs/                 # Eğitim çıktıları
│       └── run_xxx/
│           └── checkpoints/
│               └── checkpoint_best.pth
│
└── results/                     # Tahmin sonuçları
```

---

## 🧩 Modüller

### Backend Servisleri

#### `PredictionService` (prediction_service.py)
Ana tahmin orkestratörü. Legacy veya YOLO pipeline'ını kullanır.

```python
# Akış:
1. Görüntü al
2. Legacy pipeline varsa → EfficientNet + FoodSeg103 kullan
3. Yoksa → YOLO-only fallback
4. Sonuçları döndür
```

#### `LegacyPipelineService` (legacy_pipeline_service.py)
Orijinal `food_calorie_estimation` sistemini sarmalayan servis.

```python
# Bileşenler:
- FoodClassifier: EfficientNet-B0 tabanlı sınıflandırıcı
- FoodSegmentor: FoodSeg103 veya YOLOv8 segmentasyon
- PortionEstimator: Geometrik porsiyon tahmini
- CalorieEstimator: Besin değeri hesaplama
```

#### `ModelService` (model_service.py)
YOLO model yönetimi ve segmentasyon.

#### `CalorieService` (calorie_service.py)
Besin değeri veritabanı ve kalori hesaplama.

### ML Modeller

| Model | Dosya | Açıklama |
|-------|-------|----------|
| EfficientNet-B0 | `checkpoint_best.pth` | 103 sınıflı yemek sınıflandırıcı |
| FoodSeg103 | `foodseg103_seg.pt` | 103 yemek sınıfı segmentasyon |
| YOLOv8n-seg | `yolov8n-seg.pt` | Genel nesne segmentasyonu (fallback) |

### Frontend Sayfalar

| Sayfa | Yol | İşlev |
|-------|-----|-------|
| Ana Sayfa | `/` | Hızlı erişim menüsü |
| Tarama | `/predict` | Fotoğraf çek/yükle, analiz et |
| Yemekler | `/foods` | Tüm yemek sınıfları listesi |
| Ayarlar | `/settings` | Uygulama ayarları |

---

## 🔧 Sorun Giderme

### Backend Başlamıyor

```powershell
# Gerekli paketleri kontrol et
pip install fastapi uvicorn pydantic-settings loguru pillow numpy opencv-python ultralytics torch torchvision firebase-admin

# Model dosyalarını kontrol et
ls app/backend/models/
```

### Frontend Donuyor / "Starting" Pozisyonunda Kalıyor

Bu genellikle ilk derleme sırasında normaldir. Birkaç dakika bekleyin.

```powershell
# Cache temizle ve yeniden başlat
cd app/frontend
Remove-Item -Recurse -Force .next
npm run dev
```

### "No module named 'X'" Hatası

```powershell
# Backend için
cd app/backend
pip install -r requirements.txt

# Spesifik modül için
pip install <modül_adı>
```

### Model Yanlış Tahmin Yapıyor

1. Doğru model dosyasının yüklendiğinden emin olun:
```powershell
# Model kontrolü
python -c "from ultralytics import YOLO; m = YOLO('app/backend/models/foodseg103_seg.pt'); print(m.names)"
```

2. Legacy pipeline'ın aktif olduğunu kontrol edin (logları inceleyin):
```
✅ Legacy pipeline loaded (EfficientNet + FoodSeg103)
```

### Firebase Bağlantı Hatası

1. `config/firebase_service_account.json` dosyasının var olduğunu kontrol edin
2. Doğru proje ID'sinin ayarlandığından emin olun

---

## 📊 Performans

| Metrik | Değer |
|--------|-------|
| Sınıflandırma Doğruluğu | ~85% (top-1), ~95% (top-5) |
| Segmentasyon mIoU | ~70% |
| Kalori Tahmini Hatası | ±20% |
| Ortalama Yanıt Süresi | 500-1500ms |

---

## 📝 Lisans

Bu proje eğitim amaçlıdır. Tıbbi veya beslenme önerileri için kullanılmamalıdır.

---

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın
