"""
Food Image Downloader
Bu script, belirtilen yemek sınıfları için Bing Görseller'den otomatik olarak görsel indirir.
Dataset yapısına uygun şekilde klasörler oluşturur.
"""
import os
import sys
from pathlib import Path

try:
    from icrawler.builtin import BingImageCrawler
except ImportError:
    print("Hata: 'icrawler' kütüphanesi yüklü değil.")
    print("Lütfen yüklemek için şu komutu çalıştırın:")
    print("pip install icrawler")
    sys.exit(1)

# İndirilecek yemek listesi (Sadece sorunlu olanlar ve artırılacaklar)
FOOD_CLASSES = {
    # Daha spesifik aramalar
    "yulaf_ezmesi": "oatmeal porridge bowl close up",  # Yakın çekim kase
    "fistik_ezmesi": "peanut butter jar and spoon",  # Kavanoz ve kaşık
    "protein_shake": "protein shake in glass chocolate vanilla strawberry",  # Bardakta/Shaker'da belirgin
    "kola": "coca cola glass with ice",  # Buzlu bardak
    "misir_cipsi": "nachos chips bowl",  # Kase cips
    "cips": "potato chips bowl close up", # Yakın çekim cips
    "kuruyemis": "mixed nuts bowl roasted", # Çerez kasesi
}

# Hedef klasör (Mevcut datasetin olduğu yer)
DATASET_ROOT = r"C:\dataset_200"
MAX_IMAGES = 300  # Sayıyı artırdık (Daha çok seçenek olsun diye)

def download_images():
    print(f"Hedef Klasör: {DATASET_ROOT}")
    print(f"Sınıf Sayısı: {len(FOOD_CLASSES)}")
    print(f"Sınıf Başına Hedef: {MAX_IMAGES} görsel\n")
    
    for folder_name, search_term in FOOD_CLASSES.items():
        save_dir = os.path.join(DATASET_ROOT, folder_name)
        
        # Önce mevcut kötü resimleri temizle
        if os.path.exists(save_dir) and folder_name in ["yulaf_ezmesi", "fistik_ezmesi", "protein_shake", "kola"]:
             print(f"UYARI: {folder_name} klasörü temizleniyor (Daha iyi resimler için)...")
             for file in os.listdir(save_dir):
                 try:
                     os.remove(os.path.join(save_dir, file))
                 except Exception as e:
                     print(f"Silinemedi: {file} - {e}")
            
        print(f"===== İndiriliyor: {folder_name} ('{search_term}') =====")
        
        crawler = BingImageCrawler(
            feeder_threads=1,
            parser_threads=2,
            downloader_threads=4,
            storage={'root_dir': save_dir}
        )
        
        crawler.crawl(
            keyword=search_term,
            max_num=MAX_IMAGES,
            file_idx_offset=0,
            overwrite=True
        )
        print(f"Tamamlandı: {folder_name}\n")

if __name__ == "__main__":
    # Klasör yoksa oluştur
    Path(DATASET_ROOT).mkdir(parents=True, exist_ok=True)
    download_images()
