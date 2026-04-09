/**
 * Food Database - 222 sınıfla uyumlu kapsamlı yemek veritabanı
 * Her yemek için: display name, birim türü, porsiyon bilgisi, kalori, boyut seçenekleri
 */

// ─── Unit Types ─────────────────────────────────────────────────────────────

export type FoodUnit = 'gram' | 'adet' | 'ml' | 'kase' | 'porsiyon' | 'kucuk' | 'buyuk';

export interface FoodSizes {
  kucuk: number;  // gram per 1 küçük adet
  normal: number; // gram per 1 normal adet
  buyuk: number;  // gram per 1 büyük adet
}

export interface FoodInfo {
  key: string;          // class_names.json'daki key
  displayName: string;  // Türkçe görüntüleme adı
  unit: FoodUnit;       // Birincil birim
  altUnits?: FoodUnit[]; // Alternatif birimler
  kcalPer100g: number;  // 100g başına kalori
  defaultPortion: number; // Varsayılan porsiyon miktarı (birime göre)
  portionGrams: number; // 1 birim kaç gram (adet=1 adet gram, ml=1ml gram, kase=1 kase gram)
  sizes?: FoodSizes;    // Boyut seçenekleri (küçük/normal/büyük gram değerleri)
  emoji: string;
  category: 'meal' | 'soup' | 'drink' | 'fruit' | 'vegetable' | 'dessert' | 'snack' | 'bread' | 'salad';
}

// ─── Food Database ──────────────────────────────────────────────────────────

export const FOOD_DATABASE: FoodInfo[] = [
  // ═══ KEBAPLAR & ET YEMEKLERİ ═══
  { key: 'adana-kebap', displayName: 'Adana Kebap', unit: 'gram', kcalPer100g: 205, defaultPortion: 200, portionGrams: 1, emoji: '🥩', category: 'meal' },
  { key: 'anne-koftesi', displayName: 'Anne Köftesi', unit: 'adet', kcalPer100g: 195, defaultPortion: 4, portionGrams: 30, sizes: { kucuk: 20, normal: 30, buyuk: 45 }, emoji: '🧆', category: 'meal' },
  { key: 'et-sote', displayName: 'Et Sote', unit: 'gram', kcalPer100g: 155, defaultPortion: 250, portionGrams: 1, emoji: '🍖', category: 'meal' },
  { key: 'hunkar-begendi', displayName: 'Hünkar Beğendi', unit: 'gram', kcalPer100g: 160, defaultPortion: 300, portionGrams: 1, emoji: '🍛', category: 'meal' },
  { key: 'icli-kofte', displayName: 'İçli Köfte', unit: 'adet', kcalPer100g: 245, defaultPortion: 3, portionGrams: 55, sizes: { kucuk: 40, normal: 55, buyuk: 75 }, emoji: '🧆', category: 'meal' },
  { key: 'iskender', displayName: 'İskender', unit: 'gram', kcalPer100g: 230, defaultPortion: 300, portionGrams: 1, emoji: '🥩', category: 'meal' },
  { key: 'kokorec', displayName: 'Kokoreç', unit: 'gram', kcalPer100g: 250, defaultPortion: 200, portionGrams: 1, emoji: '🌯', category: 'meal' },
  { key: 'patlican-kebabi', displayName: 'Patlıcan Kebabı', unit: 'gram', kcalPer100g: 160, defaultPortion: 250, portionGrams: 1, emoji: '🍆', category: 'meal' },
  { key: 'tas-kebabi', displayName: 'Tas Kebabı', unit: 'gram', kcalPer100g: 175, defaultPortion: 250, portionGrams: 1, emoji: '🍖', category: 'meal' },
  { key: 'tavuk-sote', displayName: 'Tavuk Sote', unit: 'gram', kcalPer100g: 135, defaultPortion: 250, portionGrams: 1, emoji: '🍗', category: 'meal' },
  { key: 'tantuni', displayName: 'Tantuni', unit: 'adet', kcalPer100g: 220, defaultPortion: 1, portionGrams: 180, sizes: { kucuk: 140, normal: 180, buyuk: 230 }, emoji: '🌯', category: 'meal' },

  // ═══ DÖNER & PİDE & LAHMACUN ═══
  { key: 'doner', displayName: 'Döner', unit: 'gram', kcalPer100g: 220, defaultPortion: 180, portionGrams: 1, emoji: '🥙', category: 'meal' },
  { key: 'lahmacun', displayName: 'Lahmacun', unit: 'adet', kcalPer100g: 195, defaultPortion: 2, portionGrams: 100, sizes: { kucuk: 80, normal: 100, buyuk: 130 }, emoji: '🫓', category: 'meal' },
  { key: 'kiymali-pide', displayName: 'Kıymalı Pide', unit: 'adet', kcalPer100g: 230, defaultPortion: 1, portionGrams: 280, sizes: { kucuk: 220, normal: 280, buyuk: 360 }, emoji: '🫓', category: 'meal' },

  // ═══ BÖREKLER ═══
  { key: 'kiymali-borek', displayName: 'Kıymalı Börek', unit: 'adet', kcalPer100g: 260, defaultPortion: 3, portionGrams: 70, sizes: { kucuk: 50, normal: 70, buyuk: 95 }, emoji: '🥟', category: 'bread' },
  { key: 'peynirli-borek', displayName: 'Peynirli Börek', unit: 'adet', kcalPer100g: 290, defaultPortion: 3, portionGrams: 70, sizes: { kucuk: 50, normal: 70, buyuk: 95 }, emoji: '🥟', category: 'bread' },
  { key: 'su-boregi', displayName: 'Su Böreği', unit: 'gram', kcalPer100g: 230, defaultPortion: 200, portionGrams: 1, emoji: '🥟', category: 'bread' },

  // ═══ ÇORBALAR ═══
  { key: 'domates-corbasi', displayName: 'Domates Çorbası', unit: 'kase', altUnits: ['ml'], kcalPer100g: 40, defaultPortion: 1, portionGrams: 250, emoji: '🍅', category: 'soup' },
  { key: 'mercimek-corbasi', displayName: 'Mercimek Çorbası', unit: 'kase', altUnits: ['ml'], kcalPer100g: 56, defaultPortion: 1, portionGrams: 250, emoji: '🍲', category: 'soup' },
  { key: 'sehriye-corbasi', displayName: 'Şehriye Çorbası', unit: 'kase', altUnits: ['ml'], kcalPer100g: 45, defaultPortion: 1, portionGrams: 250, emoji: '🍜', category: 'soup' },
  { key: 'tarhana-corbasi', displayName: 'Tarhana Çorbası', unit: 'kase', altUnits: ['ml'], kcalPer100g: 50, defaultPortion: 1, portionGrams: 250, emoji: '🥣', category: 'soup' },
  { key: 'yayla-corbasi', displayName: 'Yayla Çorbası', unit: 'kase', altUnits: ['ml'], kcalPer100g: 45, defaultPortion: 1, portionGrams: 250, emoji: '🥣', category: 'soup' },

  // ═══ SULU YEMEKLER ═══
  { key: 'ispanak-yemegi', displayName: 'Ispanak Yemeği', unit: 'gram', kcalPer100g: 70, defaultPortion: 250, portionGrams: 1, emoji: '🥬', category: 'meal' },
  { key: 'kabak-mucver', displayName: 'Kabak Mücver', unit: 'adet', kcalPer100g: 165, defaultPortion: 4, portionGrams: 35, sizes: { kucuk: 25, normal: 35, buyuk: 50 }, emoji: '🥒', category: 'meal' },
  { key: 'karniyarik', displayName: 'Karnıyarık', unit: 'adet', kcalPer100g: 145, defaultPortion: 2, portionGrams: 140, sizes: { kucuk: 100, normal: 140, buyuk: 180 }, emoji: '🍆', category: 'meal' },
  { key: 'sulu-bamya-yemegi', displayName: 'Sulu Bamya Yemeği', unit: 'gram', kcalPer100g: 55, defaultPortion: 250, portionGrams: 1, emoji: '🍲', category: 'meal' },
  { key: 'sulu-barbunya-yemegi', displayName: 'Sulu Barbunya Yemeği', unit: 'gram', kcalPer100g: 75, defaultPortion: 250, portionGrams: 1, emoji: '🫘', category: 'meal' },
  { key: 'sulu-bezelye-yemegi', displayName: 'Sulu Bezelye Yemeği', unit: 'gram', kcalPer100g: 65, defaultPortion: 250, portionGrams: 1, emoji: '🫛', category: 'meal' },
  { key: 'sulu-kuru-fasulye-yemegi', displayName: 'Sulu Kuru Fasulye', unit: 'gram', kcalPer100g: 90, defaultPortion: 250, portionGrams: 1, emoji: '🫘', category: 'meal' },
  { key: 'sulu-mercimek-yemegi', displayName: 'Sulu Mercimek Yemeği', unit: 'gram', kcalPer100g: 80, defaultPortion: 250, portionGrams: 1, emoji: '🍲', category: 'meal' },
  { key: 'sulu-nohut-yemegi', displayName: 'Sulu Nohut Yemeği', unit: 'gram', kcalPer100g: 90, defaultPortion: 250, portionGrams: 1, emoji: '🍛', category: 'meal' },
  { key: 'sulu-patates-yemegi', displayName: 'Sulu Patates Yemeği', unit: 'gram', kcalPer100g: 75, defaultPortion: 250, portionGrams: 1, emoji: '🥔', category: 'meal' },
  { key: 'zeytinyagli-fasulye', displayName: 'Zeytinyağlı Fasulye', unit: 'gram', kcalPer100g: 70, defaultPortion: 200, portionGrams: 1, emoji: '🫘', category: 'meal' },

  // ═══ DOLMALAR & SARMALAR ═══
  { key: 'beyaz-lahana-sarmasi', displayName: 'Beyaz Lahana Sarması', unit: 'adet', kcalPer100g: 80, defaultPortion: 4, portionGrams: 45, sizes: { kucuk: 30, normal: 45, buyuk: 60 }, emoji: '🥬', category: 'meal' },
  { key: 'biber-dolma', displayName: 'Biber Dolma', unit: 'adet', kcalPer100g: 105, defaultPortion: 3, portionGrams: 75, sizes: { kucuk: 55, normal: 75, buyuk: 100 }, emoji: '🫑', category: 'meal' },
  { key: 'canak-enginar', displayName: 'Çanak Enginar', unit: 'adet', kcalPer100g: 80, defaultPortion: 2, portionGrams: 110, sizes: { kucuk: 80, normal: 110, buyuk: 150 }, emoji: '🌿', category: 'meal' },
  { key: 'midye-dolma', displayName: 'Midye Dolma', unit: 'adet', kcalPer100g: 165, defaultPortion: 6, portionGrams: 22, sizes: { kucuk: 15, normal: 22, buyuk: 30 }, emoji: '🦪', category: 'snack' },
  { key: 'mumbar-dolmasi', displayName: 'Mumbar Dolması', unit: 'adet', kcalPer100g: 200, defaultPortion: 3, portionGrams: 55, sizes: { kucuk: 40, normal: 55, buyuk: 75 }, emoji: '🍖', category: 'meal' },
  { key: 'yaprak-sarma', displayName: 'Yaprak Sarma', unit: 'adet', kcalPer100g: 140, defaultPortion: 6, portionGrams: 22, sizes: { kucuk: 15, normal: 22, buyuk: 30 }, emoji: '🌿', category: 'meal' },

  // ═══ PİLAV & MAKARNA ═══
  { key: 'bulgur-pilavi', displayName: 'Bulgur Pilavı', unit: 'gram', kcalPer100g: 130, defaultPortion: 200, portionGrams: 1, emoji: '🍚', category: 'meal' },
  { key: 'pilav', displayName: 'Pilav', unit: 'gram', kcalPer100g: 140, defaultPortion: 200, portionGrams: 1, emoji: '🍚', category: 'meal' },
  { key: 'salcali-makarna', displayName: 'Salçalı Makarna', unit: 'gram', kcalPer100g: 140, defaultPortion: 250, portionGrams: 1, emoji: '🍝', category: 'meal' },
  { key: 'yogurtlu-makarna', displayName: 'Yoğurtlu Makarna', unit: 'gram', kcalPer100g: 130, defaultPortion: 250, portionGrams: 1, emoji: '🍝', category: 'meal' },
  { key: 'manti', displayName: 'Mantı', unit: 'gram', kcalPer100g: 175, defaultPortion: 250, portionGrams: 1, emoji: '🥟', category: 'meal' },
  { key: 'kisir', displayName: 'Kısır', unit: 'gram', kcalPer100g: 130, defaultPortion: 200, portionGrams: 1, emoji: '🥗', category: 'salad' },

  // ═══ KAHVALTILIK ═══
  { key: 'menemen', displayName: 'Menemen', unit: 'gram', kcalPer100g: 115, defaultPortion: 200, portionGrams: 1, emoji: '🍳', category: 'meal' },
  { key: 'omlet', displayName: 'Omlet', unit: 'adet', kcalPer100g: 155, defaultPortion: 1, portionGrams: 130, sizes: { kucuk: 90, normal: 130, buyuk: 180 }, emoji: '🍳', category: 'meal' },
  { key: 'sucuklu-yumurta', displayName: 'Sucuklu Yumurta', unit: 'gram', kcalPer100g: 265, defaultPortion: 180, portionGrams: 1, emoji: '🍳', category: 'meal' },
  { key: 'haslanmis-yumurta', displayName: 'Haşlanmış Yumurta', unit: 'adet', kcalPer100g: 155, defaultPortion: 2, portionGrams: 50, sizes: { kucuk: 40, normal: 50, buyuk: 65 }, emoji: '🥚', category: 'meal' },
  { key: 'ekmek', displayName: 'Ekmek', unit: 'adet', kcalPer100g: 265, defaultPortion: 2, portionGrams: 30, sizes: { kucuk: 20, normal: 30, buyuk: 40 }, emoji: '🍞', category: 'bread' },
  { key: 'sandvic', displayName: 'Sandviç', unit: 'adet', kcalPer100g: 230, defaultPortion: 1, portionGrams: 180, sizes: { kucuk: 130, normal: 180, buyuk: 240 }, emoji: '🥪', category: 'meal' },

  // ═══ İÇECEKLER ═══
  { key: 'ayran', displayName: 'Ayran', unit: 'ml', kcalPer100g: 38, defaultPortion: 200, portionGrams: 1, emoji: '🥛', category: 'drink' },
  { key: 'cay', displayName: 'Çay', unit: 'ml', kcalPer100g: 1, defaultPortion: 200, portionGrams: 1, emoji: '🍵', category: 'drink' },
  { key: 'turk-kahvesi', displayName: 'Türk Kahvesi', unit: 'ml', kcalPer100g: 2, defaultPortion: 80, portionGrams: 1, emoji: '☕', category: 'drink' },
  { key: 'sahlep', displayName: 'Sahlep', unit: 'ml', kcalPer100g: 80, defaultPortion: 200, portionGrams: 1, emoji: '☕', category: 'drink' },
  { key: 'cacik', displayName: 'Cacık', unit: 'kase', altUnits: ['ml'], kcalPer100g: 60, defaultPortion: 1, portionGrams: 200, emoji: '🥛', category: 'drink' },

  // ═══ SALATALAR ═══
  { key: 'coban-salatasi', displayName: 'Çoban Salatası', unit: 'gram', kcalPer100g: 35, defaultPortion: 200, portionGrams: 1, emoji: '🥗', category: 'salad' },
  { key: 'patates-salatasi', displayName: 'Patates Salatası', unit: 'gram', kcalPer100g: 130, defaultPortion: 200, portionGrams: 1, emoji: '🥗', category: 'salad' },

  // ═══ MEYVELER ═══
  { key: 'armut', displayName: 'Armut', unit: 'adet', kcalPer100g: 57, defaultPortion: 1, portionGrams: 170, sizes: { kucuk: 130, normal: 170, buyuk: 220 }, emoji: '🍐', category: 'fruit' },
  { key: 'avokado', displayName: 'Avokado', unit: 'adet', kcalPer100g: 160, defaultPortion: 1, portionGrams: 140, sizes: { kucuk: 100, normal: 140, buyuk: 200 }, emoji: '🥑', category: 'fruit' },
  { key: 'cilek', displayName: 'Çilek', unit: 'gram', kcalPer100g: 32, defaultPortion: 150, portionGrams: 1, emoji: '🍓', category: 'fruit' },
  { key: 'domates', displayName: 'Domates', unit: 'adet', kcalPer100g: 18, defaultPortion: 2, portionGrams: 90, sizes: { kucuk: 60, normal: 90, buyuk: 140 }, emoji: '🍅', category: 'vegetable' },
  { key: 'elma', displayName: 'Elma', unit: 'adet', kcalPer100g: 52, defaultPortion: 1, portionGrams: 170, sizes: { kucuk: 130, normal: 170, buyuk: 220 }, emoji: '🍎', category: 'fruit' },
  { key: 'erik', displayName: 'Erik', unit: 'adet', kcalPer100g: 46, defaultPortion: 3, portionGrams: 35, sizes: { kucuk: 25, normal: 35, buyuk: 50 }, emoji: '🫐', category: 'fruit' },
  { key: 'incir', displayName: 'İncir', unit: 'adet', kcalPer100g: 74, defaultPortion: 3, portionGrams: 45, sizes: { kucuk: 30, normal: 45, buyuk: 65 }, emoji: '🍈', category: 'fruit' },
  { key: 'karpuz', displayName: 'Karpuz', unit: 'gram', kcalPer100g: 30, defaultPortion: 300, portionGrams: 1, emoji: '🍉', category: 'fruit' },
  { key: 'kavun', displayName: 'Kavun', unit: 'gram', kcalPer100g: 34, defaultPortion: 300, portionGrams: 1, emoji: '🍈', category: 'fruit' },
  { key: 'kayisi', displayName: 'Kayısı', unit: 'adet', kcalPer100g: 48, defaultPortion: 3, portionGrams: 35, sizes: { kucuk: 25, normal: 35, buyuk: 50 }, emoji: '🍑', category: 'fruit' },
  { key: 'kiraz', displayName: 'Kiraz', unit: 'gram', kcalPer100g: 50, defaultPortion: 150, portionGrams: 1, emoji: '🍒', category: 'fruit' },
  { key: 'kivi', displayName: 'Kivi', unit: 'adet', kcalPer100g: 61, defaultPortion: 2, portionGrams: 70, sizes: { kucuk: 50, normal: 70, buyuk: 90 }, emoji: '🥝', category: 'fruit' },
  { key: 'mango', displayName: 'Mango', unit: 'adet', kcalPer100g: 60, defaultPortion: 1, portionGrams: 180, sizes: { kucuk: 130, normal: 180, buyuk: 250 }, emoji: '🥭', category: 'fruit' },
  { key: 'muz', displayName: 'Muz', unit: 'adet', kcalPer100g: 89, defaultPortion: 1, portionGrams: 115, sizes: { kucuk: 80, normal: 115, buyuk: 150 }, emoji: '🍌', category: 'fruit' },
  { key: 'nar', displayName: 'Nar', unit: 'adet', kcalPer100g: 83, defaultPortion: 1, portionGrams: 180, sizes: { kucuk: 130, normal: 180, buyuk: 250 }, emoji: '🍎', category: 'fruit' },
  { key: 'portakal', displayName: 'Portakal', unit: 'adet', kcalPer100g: 47, defaultPortion: 1, portionGrams: 180, sizes: { kucuk: 130, normal: 180, buyuk: 240 }, emoji: '🍊', category: 'fruit' },
  { key: 'seftali', displayName: 'Şeftali', unit: 'adet', kcalPer100g: 39, defaultPortion: 1, portionGrams: 140, sizes: { kucuk: 100, normal: 140, buyuk: 190 }, emoji: '🍑', category: 'fruit' },
  { key: 'uzum', displayName: 'Üzüm', unit: 'gram', kcalPer100g: 69, defaultPortion: 150, portionGrams: 1, emoji: '🍇', category: 'fruit' },

  // ═══ SEBZELER ═══
  { key: 'brokoli', displayName: 'Brokoli', unit: 'gram', kcalPer100g: 34, defaultPortion: 200, portionGrams: 1, emoji: '🥦', category: 'vegetable' },
  { key: 'bruksel-lahanasi', displayName: 'Brüksel Lahanası', unit: 'gram', kcalPer100g: 43, defaultPortion: 200, portionGrams: 1, emoji: '🥬', category: 'vegetable' },
  { key: 'havuc', displayName: 'Havuç', unit: 'adet', kcalPer100g: 41, defaultPortion: 2, portionGrams: 70, sizes: { kucuk: 50, normal: 70, buyuk: 100 }, emoji: '🥕', category: 'vegetable' },
  { key: 'karnabahar', displayName: 'Karnabahar', unit: 'gram', kcalPer100g: 25, defaultPortion: 200, portionGrams: 1, emoji: '🥦', category: 'vegetable' },
  { key: 'pirasa', displayName: 'Pırasa', unit: 'gram', kcalPer100g: 55, defaultPortion: 200, portionGrams: 1, emoji: '🥬', category: 'vegetable' },
  { key: 'salatalik', displayName: 'Salatalık', unit: 'adet', kcalPer100g: 15, defaultPortion: 1, portionGrams: 130, sizes: { kucuk: 90, normal: 130, buyuk: 180 }, emoji: '🥒', category: 'vegetable' },

  // ═══ SÜT ÜRÜNLERİ ═══
  { key: 'yogurt', displayName: 'Yoğurt', unit: 'gram', kcalPer100g: 59, defaultPortion: 200, portionGrams: 1, emoji: '🥛', category: 'snack' },

  // ═══ TURŞU & ZEYTİN ═══
  { key: 'tursu', displayName: 'Turşu', unit: 'gram', kcalPer100g: 20, defaultPortion: 100, portionGrams: 1, emoji: '🥒', category: 'snack' },
  { key: 'siyah-zeytin', displayName: 'Siyah Zeytin', unit: 'gram', kcalPer100g: 115, defaultPortion: 30, portionGrams: 1, emoji: '🫒', category: 'snack' },
  { key: 'yesil-zeytin', displayName: 'Yeşil Zeytin', unit: 'gram', kcalPer100g: 145, defaultPortion: 30, portionGrams: 1, emoji: '🫒', category: 'snack' },

  // ═══ TATLILAR ═══
  { key: 'baklava', displayName: 'Baklava', unit: 'adet', kcalPer100g: 430, defaultPortion: 2, portionGrams: 35, sizes: { kucuk: 25, normal: 35, buyuk: 50 }, emoji: '🍯', category: 'dessert' },
  { key: 'dondurma', displayName: 'Dondurma', unit: 'gram', kcalPer100g: 190, defaultPortion: 100, portionGrams: 1, emoji: '🍦', category: 'dessert' },
  { key: 'kalburabasti', displayName: 'Kalburabastı', unit: 'adet', kcalPer100g: 370, defaultPortion: 2, portionGrams: 45, sizes: { kucuk: 30, normal: 45, buyuk: 60 }, emoji: '🍮', category: 'dessert' },
  { key: 'kazandibi', displayName: 'Kazandibi', unit: 'gram', kcalPer100g: 270, defaultPortion: 150, portionGrams: 1, emoji: '🍮', category: 'dessert' },
  { key: 'kemal-pasa-tatlisi', displayName: 'Kemalpaşa Tatlısı', unit: 'adet', kcalPer100g: 340, defaultPortion: 3, portionGrams: 25, sizes: { kucuk: 18, normal: 25, buyuk: 35 }, emoji: '🍬', category: 'dessert' },
  { key: 'lokma', displayName: 'Lokma', unit: 'adet', kcalPer100g: 340, defaultPortion: 6, portionGrams: 12, sizes: { kucuk: 8, normal: 12, buyuk: 18 }, emoji: '🍩', category: 'dessert' },
  { key: 'sutlac', displayName: 'Sütlaç', unit: 'gram', kcalPer100g: 130, defaultPortion: 200, portionGrams: 1, emoji: '🍮', category: 'dessert' },
  { key: 'tulumba-tatlisi', displayName: 'Tulumba Tatlısı', unit: 'adet', kcalPer100g: 370, defaultPortion: 5, portionGrams: 18, sizes: { kucuk: 12, normal: 18, buyuk: 25 }, emoji: '🍩', category: 'dessert' },

  // ═══ DENİZ ÜRÜNLERİ ═══
  { key: 'cipura', displayName: 'Çipura', unit: 'gram', kcalPer100g: 105, defaultPortion: 200, portionGrams: 1, emoji: '🐟', category: 'meal' },
  { key: 'hamsi-tava', displayName: 'Hamsi Tava', unit: 'gram', kcalPer100g: 200, defaultPortion: 180, portionGrams: 1, emoji: '🐟', category: 'meal' },
  { key: 'levrek', displayName: 'Levrek', unit: 'gram', kcalPer100g: 100, defaultPortion: 200, portionGrams: 1, emoji: '🐟', category: 'meal' },
  { key: 'midye-tava', displayName: 'Midye Tava', unit: 'adet', kcalPer100g: 200, defaultPortion: 6, portionGrams: 22, sizes: { kucuk: 15, normal: 22, buyuk: 30 }, emoji: '🦪', category: 'meal' },

  // ═══ DİĞER TÜRK YEMEKLERİ ═══
  { key: 'cig-kofte', displayName: 'Çiğ Köfte', unit: 'gram', kcalPer100g: 160, defaultPortion: 180, portionGrams: 1, emoji: '🧆', category: 'meal' },
  { key: 'mercimek-koftesi', displayName: 'Mercimek Köftesi', unit: 'adet', kcalPer100g: 170, defaultPortion: 5, portionGrams: 25, sizes: { kucuk: 18, normal: 25, buyuk: 35 }, emoji: '🧆', category: 'snack' },
  { key: 'patates-kizartmasi', displayName: 'Patates Kızartması', unit: 'gram', kcalPer100g: 290, defaultPortion: 150, portionGrams: 1, emoji: '🍟', category: 'snack' },
  { key: 'patates-puresi', displayName: 'Patates Püresi', unit: 'gram', kcalPer100g: 90, defaultPortion: 200, portionGrams: 1, emoji: '🥔', category: 'meal' },

  // ═══ ULUSLARARASI ANA YEMEKLER ═══
  { key: 'apple_pie', displayName: 'Elmalı Turta', unit: 'adet', kcalPer100g: 240, defaultPortion: 1, portionGrams: 115, sizes: { kucuk: 80, normal: 115, buyuk: 155 }, emoji: '🥧', category: 'dessert' },
  { key: 'baby_back_ribs', displayName: 'Kaburga', unit: 'gram', kcalPer100g: 265, defaultPortion: 220, portionGrams: 1, emoji: '🍖', category: 'meal' },
  { key: 'beef_carpaccio', displayName: 'Beef Carpaccio', unit: 'gram', kcalPer100g: 140, defaultPortion: 130, portionGrams: 1, emoji: '🥩', category: 'meal' },
  { key: 'beef_tartare', displayName: 'Beef Tartare', unit: 'gram', kcalPer100g: 160, defaultPortion: 130, portionGrams: 1, emoji: '🥩', category: 'meal' },
  { key: 'beet_salad', displayName: 'Pancar Salatası', unit: 'gram', kcalPer100g: 40, defaultPortion: 200, portionGrams: 1, emoji: '🥗', category: 'salad' },
  { key: 'beignets', displayName: 'Beignets', unit: 'adet', kcalPer100g: 330, defaultPortion: 3, portionGrams: 35, sizes: { kucuk: 25, normal: 35, buyuk: 50 }, emoji: '🍩', category: 'dessert' },
  { key: 'bibimbap', displayName: 'Bibimbap', unit: 'gram', kcalPer100g: 165, defaultPortion: 320, portionGrams: 1, emoji: '🍲', category: 'meal' },
  { key: 'bread_pudding', displayName: 'Ekmek Puddingi', unit: 'gram', kcalPer100g: 250, defaultPortion: 140, portionGrams: 1, emoji: '🍮', category: 'dessert' },
  { key: 'breakfast_burrito', displayName: 'Kahvaltı Burritosu', unit: 'adet', kcalPer100g: 195, defaultPortion: 1, portionGrams: 230, sizes: { kucuk: 170, normal: 230, buyuk: 300 }, emoji: '🌯', category: 'meal' },
  { key: 'bruschetta', displayName: 'Bruschetta', unit: 'adet', kcalPer100g: 170, defaultPortion: 3, portionGrams: 45, sizes: { kucuk: 30, normal: 45, buyuk: 60 }, emoji: '🥖', category: 'snack' },
  { key: 'caesar_salad', displayName: 'Sezar Salata', unit: 'gram', kcalPer100g: 120, defaultPortion: 230, portionGrams: 1, emoji: '🥗', category: 'salad' },
  { key: 'cannoli', displayName: 'Cannoli', unit: 'adet', kcalPer100g: 340, defaultPortion: 2, portionGrams: 45, sizes: { kucuk: 30, normal: 45, buyuk: 60 }, emoji: '🥐', category: 'dessert' },
  { key: 'caprese_salad', displayName: 'Caprese Salatası', unit: 'gram', kcalPer100g: 140, defaultPortion: 200, portionGrams: 1, emoji: '🥗', category: 'salad' },
  { key: 'carrot_cake', displayName: 'Havuçlu Kek', unit: 'adet', kcalPer100g: 330, defaultPortion: 1, portionGrams: 90, sizes: { kucuk: 65, normal: 90, buyuk: 130 }, emoji: '🎂', category: 'dessert' },
  { key: 'ceviche', displayName: 'Ceviche', unit: 'gram', kcalPer100g: 80, defaultPortion: 180, portionGrams: 1, emoji: '🐟', category: 'meal' },
  { key: 'cheese_plate', displayName: 'Peynir Tabağı', unit: 'gram', kcalPer100g: 330, defaultPortion: 80, portionGrams: 1, emoji: '🧀', category: 'snack' },
  { key: 'cheesecake', displayName: 'Cheesecake', unit: 'adet', kcalPer100g: 300, defaultPortion: 1, portionGrams: 110, sizes: { kucuk: 75, normal: 110, buyuk: 150 }, emoji: '🍰', category: 'dessert' },
  { key: 'chicken_curry', displayName: 'Tavuk Köri', unit: 'gram', kcalPer100g: 165, defaultPortion: 280, portionGrams: 1, emoji: '🍛', category: 'meal' },
  { key: 'chicken_quesadilla', displayName: 'Tavuk Quesadilla', unit: 'adet', kcalPer100g: 220, defaultPortion: 1, portionGrams: 180, sizes: { kucuk: 130, normal: 180, buyuk: 240 }, emoji: '🫓', category: 'meal' },
  { key: 'chicken_wings', displayName: 'Tavuk Kanat', unit: 'adet', kcalPer100g: 265, defaultPortion: 6, portionGrams: 28, sizes: { kucuk: 20, normal: 28, buyuk: 38 }, emoji: '🍗', category: 'meal' },
  { key: 'chocolate_cake', displayName: 'Çikolatalı Kek', unit: 'adet', kcalPer100g: 350, defaultPortion: 1, portionGrams: 85, sizes: { kucuk: 60, normal: 85, buyuk: 120 }, emoji: '🎂', category: 'dessert' },
  { key: 'chocolate_mousse', displayName: 'Çikolata Mousse', unit: 'gram', kcalPer100g: 260, defaultPortion: 90, portionGrams: 1, emoji: '🍫', category: 'dessert' },
  { key: 'churros', displayName: 'Churros', unit: 'adet', kcalPer100g: 330, defaultPortion: 4, portionGrams: 25, sizes: { kucuk: 18, normal: 25, buyuk: 35 }, emoji: '🍩', category: 'dessert' },
  { key: 'clam_chowder', displayName: 'İstiridye Çorbası', unit: 'kase', altUnits: ['ml'], kcalPer100g: 90, defaultPortion: 1, portionGrams: 250, emoji: '🍲', category: 'soup' },
  { key: 'club_sandwich', displayName: 'Kulüp Sandviç', unit: 'adet', kcalPer100g: 260, defaultPortion: 1, portionGrams: 230, sizes: { kucuk: 170, normal: 230, buyuk: 300 }, emoji: '🥪', category: 'meal' },
  { key: 'crab_cakes', displayName: 'Yengeç Köftesi', unit: 'adet', kcalPer100g: 200, defaultPortion: 2, portionGrams: 70, sizes: { kucuk: 50, normal: 70, buyuk: 95 }, emoji: '🦀', category: 'meal' },
  { key: 'creme_brulee', displayName: 'Crème Brûlée', unit: 'adet', kcalPer100g: 270, defaultPortion: 1, portionGrams: 110, sizes: { kucuk: 80, normal: 110, buyuk: 150 }, emoji: '🍮', category: 'dessert' },
  { key: 'croque_madame', displayName: 'Croque Madame', unit: 'adet', kcalPer100g: 320, defaultPortion: 1, portionGrams: 180, sizes: { kucuk: 130, normal: 180, buyuk: 230 }, emoji: '🥪', category: 'meal' },
  { key: 'cup_cakes', displayName: 'Cupcake', unit: 'adet', kcalPer100g: 310, defaultPortion: 1, portionGrams: 55, sizes: { kucuk: 38, normal: 55, buyuk: 75 }, emoji: '🧁', category: 'dessert' },
  { key: 'deviled_eggs', displayName: 'Dolgulu Yumurta', unit: 'adet', kcalPer100g: 190, defaultPortion: 4, portionGrams: 30, sizes: { kucuk: 22, normal: 30, buyuk: 40 }, emoji: '🥚', category: 'snack' },
  { key: 'donuts', displayName: 'Donut', unit: 'adet', kcalPer100g: 400, defaultPortion: 1, portionGrams: 60, sizes: { kucuk: 42, normal: 60, buyuk: 80 }, emoji: '🍩', category: 'dessert' },
  { key: 'dumplings', displayName: 'Dumplings', unit: 'adet', kcalPer100g: 210, defaultPortion: 6, portionGrams: 28, sizes: { kucuk: 20, normal: 28, buyuk: 38 }, emoji: '🥟', category: 'meal' },
  { key: 'edamame', displayName: 'Edamame', unit: 'gram', kcalPer100g: 120, defaultPortion: 150, portionGrams: 1, emoji: '🫛', category: 'snack' },
  { key: 'eggs_benedict', displayName: 'Eggs Benedict', unit: 'adet', kcalPer100g: 260, defaultPortion: 2, portionGrams: 90, sizes: { kucuk: 65, normal: 90, buyuk: 120 }, emoji: '🍳', category: 'meal' },
  { key: 'escargots', displayName: 'Escargots', unit: 'adet', kcalPer100g: 140, defaultPortion: 6, portionGrams: 12, emoji: '🐌', category: 'meal' },
  { key: 'falafel', displayName: 'Falafel', unit: 'adet', kcalPer100g: 310, defaultPortion: 5, portionGrams: 18, sizes: { kucuk: 12, normal: 18, buyuk: 25 }, emoji: '🧆', category: 'meal' },
  { key: 'filet_mignon', displayName: 'Filet Mignon', unit: 'gram', kcalPer100g: 230, defaultPortion: 180, portionGrams: 1, emoji: '🥩', category: 'meal' },
  { key: 'fish_and_chips', displayName: 'Fish & Chips', unit: 'gram', kcalPer100g: 240, defaultPortion: 280, portionGrams: 1, emoji: '🐟', category: 'meal' },
  { key: 'foie_gras', displayName: 'Foie Gras', unit: 'gram', kcalPer100g: 460, defaultPortion: 50, portionGrams: 1, emoji: '🍽️', category: 'meal' },
  { key: 'french_fries', displayName: 'Patates Kızartması', unit: 'gram', kcalPer100g: 290, defaultPortion: 130, portionGrams: 1, emoji: '🍟', category: 'snack' },
  { key: 'french_onion_soup', displayName: 'Soğan Çorbası', unit: 'kase', altUnits: ['ml'], kcalPer100g: 65, defaultPortion: 1, portionGrams: 250, emoji: '🍲', category: 'soup' },
  { key: 'french_toast', displayName: 'Fransız Tostu', unit: 'adet', kcalPer100g: 250, defaultPortion: 2, portionGrams: 55, sizes: { kucuk: 40, normal: 55, buyuk: 75 }, emoji: '🍞', category: 'meal' },
  { key: 'fried_calamari', displayName: 'Kalamar Tava', unit: 'gram', kcalPer100g: 200, defaultPortion: 140, portionGrams: 1, emoji: '🦑', category: 'meal' },
  { key: 'fried_rice', displayName: 'Kızarmış Pilav', unit: 'gram', kcalPer100g: 175, defaultPortion: 230, portionGrams: 1, emoji: '🍚', category: 'meal' },
  { key: 'frozen_yogurt', displayName: 'Frozen Yogurt', unit: 'gram', kcalPer100g: 150, defaultPortion: 140, portionGrams: 1, emoji: '🍦', category: 'dessert' },
  { key: 'garlic_bread', displayName: 'Sarımsaklı Ekmek', unit: 'adet', kcalPer100g: 330, defaultPortion: 2, portionGrams: 35, sizes: { kucuk: 25, normal: 35, buyuk: 50 }, emoji: '🧄', category: 'bread' },
  { key: 'gnocchi', displayName: 'Gnocchi', unit: 'gram', kcalPer100g: 170, defaultPortion: 230, portionGrams: 1, emoji: '🍝', category: 'meal' },
  { key: 'greek_salad', displayName: 'Yunan Salatası', unit: 'gram', kcalPer100g: 80, defaultPortion: 200, portionGrams: 1, emoji: '🥗', category: 'salad' },
  { key: 'grilled_cheese_sandwich', displayName: 'Tost', unit: 'adet', kcalPer100g: 320, defaultPortion: 1, portionGrams: 130, sizes: { kucuk: 90, normal: 130, buyuk: 180 }, emoji: '🧀', category: 'meal' },
  { key: 'grilled_salmon', displayName: 'Izgara Somon', unit: 'gram', kcalPer100g: 185, defaultPortion: 170, portionGrams: 1, emoji: '🐟', category: 'meal' },
  { key: 'guacamole', displayName: 'Guacamole', unit: 'gram', kcalPer100g: 140, defaultPortion: 80, portionGrams: 1, emoji: '🥑', category: 'snack' },
  { key: 'gyoza', displayName: 'Gyoza', unit: 'adet', kcalPer100g: 200, defaultPortion: 6, portionGrams: 22, sizes: { kucuk: 15, normal: 22, buyuk: 30 }, emoji: '🥟', category: 'meal' },
  { key: 'hamburger', displayName: 'Hamburger', unit: 'adet', kcalPer100g: 270, defaultPortion: 1, portionGrams: 185, sizes: { kucuk: 130, normal: 185, buyuk: 260 }, emoji: '🍔', category: 'meal' },
  { key: 'hot_and_sour_soup', displayName: 'Ekşili Çorba', unit: 'kase', altUnits: ['ml'], kcalPer100g: 40, defaultPortion: 1, portionGrams: 250, emoji: '🍲', category: 'soup' },
  { key: 'hot_dog', displayName: 'Sosisli', unit: 'adet', kcalPer100g: 270, defaultPortion: 1, portionGrams: 130, sizes: { kucuk: 95, normal: 130, buyuk: 175 }, emoji: '🌭', category: 'meal' },
  { key: 'huevos_rancheros', displayName: 'Huevos Rancheros', unit: 'gram', kcalPer100g: 165, defaultPortion: 230, portionGrams: 1, emoji: '🍳', category: 'meal' },
  { key: 'hummus', displayName: 'Humus', unit: 'gram', kcalPer100g: 165, defaultPortion: 80, portionGrams: 1, emoji: '🫘', category: 'snack' },
  { key: 'ice_cream', displayName: 'Dondurma', unit: 'gram', kcalPer100g: 200, defaultPortion: 90, portionGrams: 1, emoji: '🍨', category: 'dessert' },
  { key: 'lasagna', displayName: 'Lazanya', unit: 'gram', kcalPer100g: 185, defaultPortion: 280, portionGrams: 1, emoji: '🍝', category: 'meal' },
  { key: 'lobster_bisque', displayName: 'Istakoz Çorbası', unit: 'kase', altUnits: ['ml'], kcalPer100g: 130, defaultPortion: 1, portionGrams: 250, emoji: '🦞', category: 'soup' },
  { key: 'lobster_roll_sandwich', displayName: 'Istakoz Sandviç', unit: 'adet', kcalPer100g: 230, defaultPortion: 1, portionGrams: 180, sizes: { kucuk: 130, normal: 180, buyuk: 240 }, emoji: '🦞', category: 'meal' },
  { key: 'macaroni_and_cheese', displayName: 'Macaroni & Cheese', unit: 'gram', kcalPer100g: 260, defaultPortion: 230, portionGrams: 1, emoji: '🧀', category: 'meal' },
  { key: 'macarons', displayName: 'Macarons', unit: 'adet', kcalPer100g: 400, defaultPortion: 3, portionGrams: 12, sizes: { kucuk: 8, normal: 12, buyuk: 18 }, emoji: '🍪', category: 'dessert' },
  { key: 'miso_soup', displayName: 'Miso Çorbası', unit: 'kase', altUnits: ['ml'], kcalPer100g: 30, defaultPortion: 1, portionGrams: 250, emoji: '🍲', category: 'soup' },
  { key: 'mussels', displayName: 'Midye', unit: 'gram', kcalPer100g: 160, defaultPortion: 180, portionGrams: 1, emoji: '🦪', category: 'meal' },
  { key: 'nachos', displayName: 'Nachos', unit: 'gram', kcalPer100g: 330, defaultPortion: 130, portionGrams: 1, emoji: '🌮', category: 'snack' },
  { key: 'onion_rings', displayName: 'Soğan Halkası', unit: 'gram', kcalPer100g: 330, defaultPortion: 90, portionGrams: 1, emoji: '🧅', category: 'snack' },
  { key: 'oysters', displayName: 'İstiridye', unit: 'adet', kcalPer100g: 80, defaultPortion: 6, portionGrams: 12, emoji: '🦪', category: 'meal' },
  { key: 'pad_thai', displayName: 'Pad Thai', unit: 'gram', kcalPer100g: 170, defaultPortion: 280, portionGrams: 1, emoji: '🍜', category: 'meal' },
  { key: 'paella', displayName: 'Paella', unit: 'gram', kcalPer100g: 155, defaultPortion: 280, portionGrams: 1, emoji: '🥘', category: 'meal' },
  { key: 'pancakes', displayName: 'Pankek', unit: 'adet', kcalPer100g: 215, defaultPortion: 3, portionGrams: 45, sizes: { kucuk: 30, normal: 45, buyuk: 65 }, emoji: '🥞', category: 'meal' },
  { key: 'panna_cotta', displayName: 'Panna Cotta', unit: 'adet', kcalPer100g: 270, defaultPortion: 1, portionGrams: 110, sizes: { kucuk: 80, normal: 110, buyuk: 150 }, emoji: '🍮', category: 'dessert' },
  { key: 'peking_duck', displayName: 'Pekin Ördeği', unit: 'gram', kcalPer100g: 320, defaultPortion: 180, portionGrams: 1, emoji: '🦆', category: 'meal' },
  { key: 'pho', displayName: 'Pho', unit: 'kase', altUnits: ['ml'], kcalPer100g: 70, defaultPortion: 1, portionGrams: 450, emoji: '🍜', category: 'soup' },
  { key: 'pizza', displayName: 'Pizza', unit: 'adet', kcalPer100g: 250, defaultPortion: 2, portionGrams: 90, sizes: { kucuk: 65, normal: 90, buyuk: 120 }, emoji: '🍕', category: 'meal' },
  { key: 'pork_chop', displayName: 'Pirzola', unit: 'gram', kcalPer100g: 260, defaultPortion: 180, portionGrams: 1, emoji: '🥩', category: 'meal' },
  { key: 'poutine', displayName: 'Poutine', unit: 'gram', kcalPer100g: 330, defaultPortion: 230, portionGrams: 1, emoji: '🍟', category: 'meal' },
  { key: 'prime_rib', displayName: 'Prime Rib', unit: 'gram', kcalPer100g: 330, defaultPortion: 230, portionGrams: 1, emoji: '🥩', category: 'meal' },
  { key: 'pulled_pork_sandwich', displayName: 'Pulled Pork Sandviç', unit: 'adet', kcalPer100g: 260, defaultPortion: 1, portionGrams: 230, sizes: { kucuk: 170, normal: 230, buyuk: 300 }, emoji: '🥪', category: 'meal' },
  { key: 'ramen', displayName: 'Ramen', unit: 'kase', altUnits: ['ml'], kcalPer100g: 160, defaultPortion: 1, portionGrams: 450, emoji: '🍜', category: 'soup' },
  { key: 'ravioli', displayName: 'Ravioli', unit: 'gram', kcalPer100g: 185, defaultPortion: 230, portionGrams: 1, emoji: '🍝', category: 'meal' },
  { key: 'red_velvet_cake', displayName: 'Red Velvet Kek', unit: 'adet', kcalPer100g: 330, defaultPortion: 1, portionGrams: 90, sizes: { kucuk: 60, normal: 90, buyuk: 130 }, emoji: '🎂', category: 'dessert' },
  { key: 'risotto', displayName: 'Risotto', unit: 'gram', kcalPer100g: 160, defaultPortion: 260, portionGrams: 1, emoji: '🍚', category: 'meal' },
  { key: 'samosa', displayName: 'Samosa', unit: 'adet', kcalPer100g: 245, defaultPortion: 3, portionGrams: 45, sizes: { kucuk: 30, normal: 45, buyuk: 65 }, emoji: '🥟', category: 'snack' },
  { key: 'sashimi', displayName: 'Sashimi', unit: 'gram', kcalPer100g: 125, defaultPortion: 130, portionGrams: 1, emoji: '🍣', category: 'meal' },
  { key: 'scallops', displayName: 'Deniz Tarağı', unit: 'adet', kcalPer100g: 100, defaultPortion: 5, portionGrams: 18, emoji: '🦪', category: 'meal' },
  { key: 'seaweed_salad', displayName: 'Deniz Yosunu Salatası', unit: 'gram', kcalPer100g: 45, defaultPortion: 80, portionGrams: 1, emoji: '🥗', category: 'salad' },
  { key: 'shrimp_and_grits', displayName: 'Karidesli Mısır', unit: 'gram', kcalPer100g: 185, defaultPortion: 230, portionGrams: 1, emoji: '🦐', category: 'meal' },
  { key: 'spaghetti_bolognese', displayName: 'Bolonez Makarna', unit: 'gram', kcalPer100g: 150, defaultPortion: 280, portionGrams: 1, emoji: '🍝', category: 'meal' },
  { key: 'spaghetti_carbonara', displayName: 'Carbonara', unit: 'gram', kcalPer100g: 185, defaultPortion: 280, portionGrams: 1, emoji: '🍝', category: 'meal' },
  { key: 'spring_rolls', displayName: 'Spring Rolls', unit: 'adet', kcalPer100g: 260, defaultPortion: 3, portionGrams: 35, sizes: { kucuk: 25, normal: 35, buyuk: 50 }, emoji: '🥟', category: 'snack' },
  { key: 'steak', displayName: 'Biftek', unit: 'gram', kcalPer100g: 260, defaultPortion: 220, portionGrams: 1, emoji: '🥩', category: 'meal' },
  { key: 'strawberry_shortcake', displayName: 'Çilekli Pasta', unit: 'adet', kcalPer100g: 260, defaultPortion: 1, portionGrams: 110, sizes: { kucuk: 80, normal: 110, buyuk: 150 }, emoji: '🍰', category: 'dessert' },
  { key: 'sushi', displayName: 'Suşi', unit: 'adet', kcalPer100g: 140, defaultPortion: 8, portionGrams: 22, sizes: { kucuk: 16, normal: 22, buyuk: 30 }, emoji: '🍣', category: 'meal' },
  { key: 'tacos', displayName: 'Taco', unit: 'adet', kcalPer100g: 210, defaultPortion: 2, portionGrams: 80, sizes: { kucuk: 55, normal: 80, buyuk: 110 }, emoji: '🌮', category: 'meal' },
  { key: 'takoyaki', displayName: 'Takoyaki', unit: 'adet', kcalPer100g: 190, defaultPortion: 6, portionGrams: 28, sizes: { kucuk: 20, normal: 28, buyuk: 38 }, emoji: '🍡', category: 'snack' },
  { key: 'tiramisu', displayName: 'Tiramisu', unit: 'gram', kcalPer100g: 275, defaultPortion: 110, portionGrams: 1, emoji: '🍰', category: 'dessert' },
  { key: 'tuna_tartare', displayName: 'Ton Balığı Tartare', unit: 'gram', kcalPer100g: 130, defaultPortion: 130, portionGrams: 1, emoji: '🐟', category: 'meal' },
  { key: 'waffles', displayName: 'Waffle', unit: 'adet', kcalPer100g: 270, defaultPortion: 1, portionGrams: 90, sizes: { kucuk: 65, normal: 90, buyuk: 130 }, emoji: '🧇', category: 'dessert' },

  // ═══ YENİ EKLENEN SINIFLAR (dataset_200 güncellemesi) ═══
  { key: 'acma', displayName: 'Açma', unit: 'adet', kcalPer100g: 295, defaultPortion: 1, portionGrams: 75, sizes: { kucuk: 55, normal: 75, buyuk: 100 }, emoji: '🥐', category: 'bread' },
  { key: 'cig_kofte', displayName: 'Çiğ Köfte', unit: 'gram', kcalPer100g: 160, defaultPortion: 180, portionGrams: 1, emoji: '🧆', category: 'meal' },
  { key: 'cips', displayName: 'Cips', unit: 'gram', kcalPer100g: 536, defaultPortion: 30, portionGrams: 1, emoji: '🥔', category: 'snack' },
  { key: 'fistik_ezmesi', displayName: 'Fıstık Ezmesi', unit: 'gram', kcalPer100g: 588, defaultPortion: 20, portionGrams: 1, emoji: '🥜', category: 'snack' },
  { key: 'haslanmis_tavuk', displayName: 'Haşlanmış Tavuk', unit: 'gram', kcalPer100g: 165, defaultPortion: 180, portionGrams: 1, emoji: '🍗', category: 'meal' },
  { key: 'kola', displayName: 'Kola', unit: 'ml', kcalPer100g: 42, defaultPortion: 330, portionGrams: 1, emoji: '🥤', category: 'drink' },
  { key: 'kunefe', displayName: 'Künefe', unit: 'gram', kcalPer100g: 380, defaultPortion: 130, portionGrams: 1, emoji: '🧀', category: 'dessert' },
  { key: 'kuruyemis', displayName: 'Kuruyemiş', unit: 'gram', kcalPer100g: 580, defaultPortion: 30, portionGrams: 1, emoji: '🥜', category: 'snack' },
  { key: 'kuru_fasulye', displayName: 'Kuru Fasulye', unit: 'gram', kcalPer100g: 90, defaultPortion: 250, portionGrams: 1, emoji: '🫘', category: 'meal' },
  { key: 'lor_peyniri', displayName: 'Lor Peyniri', unit: 'gram', kcalPer100g: 120, defaultPortion: 40, portionGrams: 1, emoji: '🧀', category: 'snack' },
  { key: 'misir_cipsi', displayName: 'Mısır Cipsi', unit: 'gram', kcalPer100g: 480, defaultPortion: 30, portionGrams: 1, emoji: '🌽', category: 'snack' },
  { key: 'patlamis_misir', displayName: 'Patlamış Mısır', unit: 'gram', kcalPer100g: 375, defaultPortion: 35, portionGrams: 1, emoji: '🍿', category: 'snack' },
  { key: 'pogaca', displayName: 'Poğaça', unit: 'adet', kcalPer100g: 310, defaultPortion: 1, portionGrams: 65, sizes: { kucuk: 45, normal: 65, buyuk: 90 }, emoji: '🥐', category: 'bread' },
  { key: 'protein_shake', displayName: 'Protein Shake', unit: 'ml', kcalPer100g: 75, defaultPortion: 350, portionGrams: 1, emoji: '🥛', category: 'drink' },
  { key: 'simit', displayName: 'Simit', unit: 'adet', kcalPer100g: 285, defaultPortion: 1, portionGrams: 95, sizes: { kucuk: 70, normal: 95, buyuk: 120 }, emoji: '🥯', category: 'bread' },
  { key: 'sucuklu_yumurta', displayName: 'Sucuklu Yumurta', unit: 'gram', kcalPer100g: 265, defaultPortion: 180, portionGrams: 1, emoji: '🍳', category: 'meal' },
  { key: 'su_boregi', displayName: 'Su Böreği', unit: 'gram', kcalPer100g: 230, defaultPortion: 200, portionGrams: 1, emoji: '🥟', category: 'bread' },
  { key: 'tavuk_doner', displayName: 'Tavuk Döner', unit: 'gram', kcalPer100g: 190, defaultPortion: 180, portionGrams: 1, emoji: '🥙', category: 'meal' },
  { key: 'tost', displayName: 'Tost', unit: 'adet', kcalPer100g: 280, defaultPortion: 1, portionGrams: 130, sizes: { kucuk: 90, normal: 130, buyuk: 180 }, emoji: '🧀', category: 'meal' },
  { key: 'turk_kahvesi', displayName: 'Türk Kahvesi', unit: 'ml', kcalPer100g: 2, defaultPortion: 80, portionGrams: 1, emoji: '☕', category: 'drink' },
  { key: 'yulaf_ezmesi', displayName: 'Yulaf Ezmesi', unit: 'gram', kcalPer100g: 370, defaultPortion: 40, portionGrams: 1, emoji: '🥣', category: 'meal' },
];

// ─── Auto-generate altUnits for all foods ───────────────────────────────────
FOOD_DATABASE.forEach(food => {
  if (!food.altUnits) food.altUnits = [];

  if (food.unit === 'adet') {
    if (!food.sizes) {
      food.sizes = {
        kucuk: Math.round(food.portionGrams * 0.75),
        normal: food.portionGrams,
        buyuk: Math.round(food.portionGrams * 1.3),
      };
    }
    if (!food.altUnits.includes('kucuk')) food.altUnits.push('kucuk');
    if (!food.altUnits.includes('buyuk')) food.altUnits.push('buyuk');
    if (!food.altUnits.includes('gram')) food.altUnits.push('gram');
  } else if (food.unit === 'gram') {
    if (!food.altUnits.includes('porsiyon')) food.altUnits.push('porsiyon');
  } else if (food.unit === 'kase') {
    if (!food.altUnits.includes('porsiyon')) food.altUnits.push('porsiyon');
    if (!food.altUnits.includes('gram')) food.altUnits.push('gram');
  } else if (food.unit === 'ml') {
    if (!food.altUnits.includes('porsiyon')) food.altUnits.push('porsiyon');
  }
});

// ─── Alternate key map (hyphen↔underscore variants in dataset) ──────────────
const ALTERNATE_KEYS: Record<string, string> = {
  'cig_kofte': 'cig-kofte',
  'sucuklu_yumurta': 'sucuklu-yumurta',
  'su_boregi': 'su-boregi',
  'turk_kahvesi': 'turk-kahvesi',
  'haslanmis_tavuk': 'haslanmis_tavuk',
  'tavuk_doner': 'tavuk_doner',
};

// ─── Lookup Helpers ─────────────────────────────────────────────────────────

/** Map for O(1) lookup by key */
const _foodByKey = new Map<string, FoodInfo>();
FOOD_DATABASE.forEach(f => _foodByKey.set(f.key, f));

/** Get food info by class key (supports alternate hyphen/underscore keys) */
export function getFoodByKey(key: string): FoodInfo | undefined {
  return _foodByKey.get(key) ?? _foodByKey.get(ALTERNATE_KEYS[key] ?? '');
}

/** Get unit label in Turkish */
export function getUnitLabel(unit: FoodUnit, plural = false): string {
  switch (unit) {
    case 'gram': return 'gram';
    case 'adet': return 'adet';
    case 'ml': return 'ml';
    case 'kase': return plural ? 'kase' : 'kase';
    case 'porsiyon': return 'porsiyon';
    case 'kucuk': return 'küçük';
    case 'buyuk': return 'büyük';
  }
}

/** Get unit display for portion input */
export function getUnitPlaceholder(unit: FoodUnit): string {
  switch (unit) {
    case 'gram': return 'Porsiyon (gram)';
    case 'adet': return 'Adet';
    case 'ml': return 'Miktar (ml)';
    case 'kase': return 'Kase sayısı';
    case 'porsiyon': return 'Porsiyon sayısı';
    case 'kucuk': return 'Küçük adet';
    case 'buyuk': return 'Büyük adet';
  }
}

/** Calculate calories from portion */
export function calculateCalories(food: FoodInfo, amount: number, unit?: FoodUnit): number {
  const grams = calculateWeightGrams(food, amount, unit);
  return Math.round((food.kcalPer100g / 100) * grams);
}

/** Calculate weight in grams from portion */
export function calculateWeightGrams(food: FoodInfo, amount: number, unit?: FoodUnit): number {
  const activeUnit = unit ?? food.unit;
  switch (activeUnit) {
    case 'adet':
      return Math.round(amount * food.portionGrams);
    case 'kucuk':
      return Math.round(amount * (food.sizes?.kucuk ?? Math.round(food.portionGrams * 0.75)));
    case 'buyuk':
      return Math.round(amount * (food.sizes?.buyuk ?? Math.round(food.portionGrams * 1.3)));
    case 'kase':
      return Math.round(amount * food.portionGrams);
    case 'porsiyon': {
      if (food.unit === 'gram' || food.unit === 'ml') {
        return Math.round(amount * food.defaultPortion);
      }
      return Math.round(amount * food.defaultPortion * food.portionGrams);
    }
    case 'ml':
      return Math.round(amount);
    case 'gram':
    default:
      return Math.round(amount);
  }
}

/** Search foods by query (for autocomplete) - matches against displayName and key */
export function searchFoods(query: string, maxResults = 10): FoodInfo[] {
  const lower = query.toLowerCase().trim();
  if (!lower || lower.length < 1) return [];

  const results: FoodInfo[] = [];

  // Exact start match first
  for (const food of FOOD_DATABASE) {
    if (food.displayName.toLowerCase().startsWith(lower) ||
        food.key.replace(/-/g, ' ').replace(/_/g, ' ').startsWith(lower)) {
      results.push(food);
      if (results.length >= maxResults) return results;
    }
  }

  // Then partial match
  for (const food of FOOD_DATABASE) {
    if (results.includes(food)) continue;
    if (food.displayName.toLowerCase().includes(lower) ||
        food.key.replace(/-/g, ' ').replace(/_/g, ' ').includes(lower)) {
      results.push(food);
      if (results.length >= maxResults) return results;
    }
  }

  return results;
}

/** Get all foods by category */
export function getFoodsByCategory(category: FoodInfo['category']): FoodInfo[] {
  return FOOD_DATABASE.filter(f => f.category === category);
}

/** Get all food keys (for validation) */
export function getAllFoodKeys(): string[] {
  return FOOD_DATABASE.map(f => f.key);
}
