# Nutrino - AI Destekli Beslenme Takip Uygulaması

Yapay zeka ile yemek tanıma, kalori hesaplama ve kişisel beslenme takibi yapan React Native mobil uygulama.

## Gereksinimler

- Node.js 18+
- npm
- Android Studio + Emulator veya fiziksel cihaz
- Firebase hesabı (Auth, Firestore, Storage)

## Hızlı Başlangıç

```bash
cd app/mobile
npm install
npm run dev          # Android emulator ile başlat (cache temizleyerek)
npm run clean        # Sadece cache temizle ve başlat
npx expo start       # Normal başlat
```

## Proje Yapısı

```
mobile/
├── app/                        # Expo Router - Sayfa dosyaları
│   ├── _layout.tsx             # Root layout (Stack navigator)
│   ├── index.tsx               # Giriş yönlendirme
│   ├── edit-profile.tsx        # Profil düzenleme
│   ├── diet-recommendation.tsx # Diyet önerileri & haftalık rapor
│   ├── notifications.tsx       # Bildirimler
│   ├── help.tsx                # Yardım & destek
│   ├── auth/                   # Giriş / Kayıt sayfaları
│   ├── onboarding/             # İlk kurulum adımları (12 ekran)
│   └── (tabs)/                 # Ana sekmeler
│       ├── index.tsx           # Ana sayfa (takvim, öğünler, egzersiz)
│       ├── scan.tsx            # Kamera ile yemek tarama
│       ├── history.tsx         # Geçmiş taramalar
│       └── profile.tsx         # Profil & ayarlar
├── src/
│   ├── components/             # Yeniden kullanılabilir bileşenler
│   │   ├── ErrorBoundary.tsx   # Hata yakalayıcı
│   │   └── ui/                 # UI bileşenleri (Button, Select, Layout)
│   ├── config/
│   │   ├── firebase.ts         # Firebase yapılandırması
│   │   └── sentry.ts           # Sentry hata takibi
│   ├── constants/
│   │   └── theme.ts            # Renk, font, spacing sabitleri
│   ├── contexts/
│   │   └── UserContext.tsx      # Kullanıcı state yönetimi
│   ├── screens/
│   │   ├── ScanScreen.tsx      # Kamera / galeri tarama ekranı
│   │   └── HistoryScreen.tsx   # Geçmiş sonuçlar
│   ├── services/
│   │   ├── apiClient.ts        # Backend API istemcisi (Axios)
│   │   ├── firebaseAuth.ts     # Firebase kimlik doğrulama
│   │   ├── firestoreService.ts # Firestore CRUD işlemleri
│   │   ├── predictionService.ts# ML tahmin servisi
│   │   ├── secureStorage.ts    # Güvenli token depolama
│   │   └── dietRecommendationService.ts # Diyet öneri motoru
│   └── types/
│       └── prediction.ts       # TypeScript tipleri
├── global.css                  # Tailwind CSS
├── tailwind.config.js          # NativeWind yapılandırması
├── metro.config.js             # Metro bundler yapılandırması
└── app.json                    # Expo yapılandırması
```

## Özellikler

- AI ile yemek tanıma (201 kategori)
- Otomatik kalori hesaplama (200+ yiyecek veritabanı)
- Günlük öğün takibi (kahvaltı, öğle, akşam, atıştırma)
- Egzersiz takibi ve kalori yakma hesaplama
- Kişisel diyet önerileri ve haftalık rapor
- Onboarding ile kişiselleştirilmiş profil
- E-posta doğrulama, şifre sıfırlama
- Firebase ile bulut senkronizasyon

## Teknolojiler

- **Expo SDK 54** / React Native 0.81
- **Expo Router 6** - Dosya tabanlı navigasyon
- **NativeWind** - Tailwind CSS for React Native
- **Firebase** - Auth, Firestore, Storage
- **TypeScript** - Tip güvenliği
- **Sentry** - Hata takibi

## Derleme

```bash
npx eas build --platform android --profile preview   # APK
npx eas build --platform android --profile production # AAB (Play Store)
```

## Destek

nutrinooapp@gmail.com
