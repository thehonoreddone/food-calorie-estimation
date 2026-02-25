# Nutrino — Yayınlama Rehberi

## Ön Hazırlık Kontrol Listesi

### 1. .env Dosyasını Ayarla
```bash
# .env dosyasındaki boş değerleri doldur:
EXPO_PUBLIC_API_URL=https://nutrino-backend.onrender.com
EXPO_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx  # Sentry'den al
```

### 2. EAS Hesabını Kur
```bash
# Expo hesabı oluştur (yoksa)
npx eas login

# EAS projesi oluştur
npx eas build:configure

# app.json'daki projectId'yi güncelle
# eas build:configure bunu otomatik yapar
```

### 3. Sentry Hesabı Kur
1. https://sentry.io → Ücretsiz hesap oluştur
2. "nutrino-mobile" projesi oluştur (React Native seç)
3. DSN'yi `.env` dosyasına yapıştır
4. `eas.json`'daki organization/project değerlerini güncelle

---

## Android — Play Store Yayınlama

### Adım 1: Internal Test Build
```bash
# Development build (testing için)
npx eas build --platform android --profile preview

# Ya da production build (store'a göndermek için)
npx eas build --platform android --profile production
```

### Adım 2: Google Play Console
1. https://play.google.com/console → Geliştirici hesabı oluştur (**25$ tek seferlik**)
2. "Uygulama oluştur" → Ad: "Nutrino", Kategori: Sağlık & Fitness
3. Store listing bilgilerini doldur (STORE_LISTING.md'den kopyala)
4. İçerik derecelendirme anketini tamamla
5. Gizlilik politikası URL'sini ekle: `https://nutrino.app/privacy`

### Adım 3: Internal Testing
```bash
# AAB dosyasını Play Console'a yükle
npx eas submit --platform android --profile production
```
- Internal Testing track'ine yükle
- Test e-postalarını ekle (max 100 kişi)
- Test linkini paylaş

### Adım 4: Closed Beta (Kapalı Beta)
- Internal test başarılı → "Promote to Closed Testing"
- Google Groups veya e-posta listesi ile beta kullanıcıları ekle
- Min 20 kullanıcı ile 14 gün test

### Adım 5: Production Release
- Closed beta başarılı → "Promote to Production"
- %10-25-50-100 staged rollout önerilir
- İnceleme süresi: 1-3 gün

---

## iOS — App Store Yayınlama

### Adım 1: Apple Developer Hesabı
- https://developer.apple.com → Kayıt ol (**99$/yıl**)
- App ID oluştur: `com.nutrino.app`
- Provisioning profile oluştur

### Adım 2: Build
```bash
# iOS production build
npx eas build --platform ios --profile production
```

### Adım 3: App Store Connect
1. https://appstoreconnect.apple.com
2. "Yeni Uygulama" → Bundle ID: `com.nutrino.app`
3. App Information & Store listing bilgilerini doldur
4. Screenshot'ları yükle (iPhone 6.7" + iPad gerekli)
5. Privacy URL ekle

### Adım 4: TestFlight (Internal + External Beta)
```bash
# App Store Connect'e gönder
npx eas submit --platform ios --profile production
```
- Internal Test: Ekip üyeleri (limit 25)
- External Test: Beta Review gerekir (1-2 gün)
- Max 10.000 test kullanıcısı

### Adım 5: App Store Review
- TestFlight testleri tamam → "Submit for Review"
- İnceleme süresi: 1-3 gün (ilk başvurularda 5-7 gün olabilir)

---

## Her İki Platform İçin Komutlar

```bash
# Tüm platformlar için build
npx eas build --platform all --profile production

# Tüm platformlara submit
npx eas submit --platform all --profile production

# Build durumunu kontrol et
npx eas build:list

# OTA güncelleme gönder (küçük değişiklikler için)
npx eas update --branch production --message "Bug fix v1.0.1"
```

---

## Maliyet Özeti

| Kalem | Tutar | Periyot |
|-------|-------|---------|
| Google Play Console | $25 | Tek seferlik |
| Apple Developer | $99 | Yıllık |
| EAS Build (Free tier) | $0 | 30 build/ay |
| EAS Build (Production) | $99/ay | Opsiyonel |
| Sentry (Free tier) | $0 | 5K event/ay |
| Firebase (Spark plan) | $0 | 50K read/gün |
| **Toplam (minimum)** | **$124** | **İlk yıl** |

---

## Yayın Sonrası

1. **Crash raporlarını izle** → Sentry dashboard
2. **Kullanıcı yorumlarını takip et** → Play Console / App Store Connect
3. **Analytics ekle** → Firebase Analytics veya Mixpanel
4. **OTA update** ile küçük bugfix'leri hızla yayınla
5. **Versiyon güncelleme** → package.json + app.json version'ı artır
