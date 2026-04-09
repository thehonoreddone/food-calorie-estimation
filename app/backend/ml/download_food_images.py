"""
Food Image Downloader - Multi-source web scraping
===================================================
Downloads food images from Bing/Google for:
  1. Critical classes (< 100 images → target 350)
  2. New recommended classes (0 images → target 350)

Uses icrawler for reliable, rate-limited downloading.
Validates images (removes corrupt, too small, duplicates).

Usage:
    python download_food_images.py --data ../../merged_datasetf/images --mode all
    python download_food_images.py --data ../../merged_datasetf/images --mode critical
    python download_food_images.py --data ../../merged_datasetf/images --mode new
    python download_food_images.py --data ../../merged_datasetf/images --mode single --class-name "gozleme"
"""
import argparse
import hashlib
import os
import sys
import time
import json
import shutil
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO

from PIL import Image

# ============================================================
# Search Queries - Multiple queries per class for diversity
# ============================================================

# Critical existing classes that need more images
CRITICAL_CLASSES: Dict[str, List[str]] = {
    "haslanmis_tavuk": [
        "haşlanmış tavuk göğsü tabak",
        "boiled chicken breast plate",
        "haşlanmış tavuk yemek",
        "boiled chicken meal diet",
        "tavuk haşlama tabağı",
        "poached chicken breast dinner",
    ],
    "tavuk_doner": [
        "tavuk döner porsiyon",
        "chicken doner kebab plate",
        "tavuk döner dürüm",
        "tavuk döner pilav",
        "chicken doner wrap Turkish",
        "tavuk döner tabak",
    ],
    "lor_peyniri": [
        "lor peyniri tabak",
        "lor peyniri kahvaltı",
        "Turkish lor cheese plate",
        "cottage cheese Turkish lor",
        "lor peyniri börek",
        "lor peyniri serpme kahvaltı",
    ],
    "yulaf_ezmesi": [
        "yulaf ezmesi kase",
        "oatmeal bowl breakfast",
        "yulaf lapası kahvaltı",
        "porridge bowl with fruits",
        "oatmeal breakfast healthy",
        "yulaf ezmesi meyve",
    ],
    "acma": [
        "açma tatlı poğaça",
        "açma Turkish sweet bread",
        "açma fırın pastane",
        "açma çörek ekmek",
        "Turkish acma pastry bakery",
        "açma poğaça kahvaltı",
    ],
    "patlamis_misir": [
        "patlamış mısır kase",
        "popcorn bowl snack",
        "mısır patlamış sinema",
        "popcorn movie snack",
        "patlamış mısır tuzlu",
        "buttered popcorn bowl",
    ],
    "kola": [
        "kola bardak buz",
        "cola glass ice drink",
        "coca cola glass",
        "kola şişe bardak",
        "cola drink restaurant",
        "kola meşrubat",
    ],
    "simit": [
        "simit Türk simidi",
        "Turkish simit sesame bagel",
        "simit peynir çay kahvaltı",
        "simit street food Turkey",
        "gevrek simit fırın",
        "simit İstanbul sokak",
    ],
    "fistik_ezmesi": [
        "fıstık ezmesi kavanoz",
        "peanut butter jar spread",
        "fıstık ezmesi ekmek",
        "peanut butter bread toast",
        "fıstık ezmesi kahvaltı",
        "peanut butter breakfast spread",
    ],
    "cips": [
        "cips paket tabak",
        "potato chips bowl snack",
        "patates cipsi kase",
        "chips snack plate",
        "cips aperatif tabak",
        "tortilla chips bowl",
    ],
}

# New recommended classes
NEW_CLASSES: Dict[str, List[str]] = {
    "pogaca": [
        "poğaça Türk fırın",
        "Turkish pogaca pastry",
        "poğaça kahvaltı tabak",
        "pogaca breakfast bakery",
        "peynirli poğaça",
        "zeytinli poğaça fırın",
    ],
    "peynir": [
        "beyaz peynir tabak kahvaltı",
        "Turkish white cheese plate",
        "kaşar peyniri dilim",
        "peynir tabağı çeşit",
        "cheese plate Turkish breakfast",
        "tulum peyniri eski kaşar",
    ],
    "bal": [
        "bal petek kavanoz",
        "honey jar honeycomb",
        "bal kahvaltı tabak",
        "honey breakfast plate",
        "kaymak bal kahvaltı",
        "süzme bal petek",
    ],
    "kaymak": [
        "kaymak tabak kahvaltı",
        "Turkish kaymak clotted cream",
        "kaymak bal kahvaltı",
        "kaymak cream plate breakfast",
        "Afyon kaymak tabak",
        "kaymak ekmek çanak",
    ],
    "tereyagi": [
        "tereyağı tabak kahvaltı",
        "butter plate breakfast",
        "tereyağı ekmek",
        "butter bread plate",
        "tereyağı kalıp dilim",
        "köy tereyağı tabak",
    ],
    "recel": [
        "reçel kavanoz kahvaltı",
        "Turkish jam jar breakfast",
        "çilek reçeli tabak",
        "reçel çeşitleri kahvaltı",
        "homemade jam variety",
        "kayısı reçeli kavanoz",
    ],
    "ali-nazik": [
        "Ali Nazik kebap tabak",
        "Ali Nazik kebab eggplant",
        "Ali Nazik Gaziantep yemek",
        "ali nazik kebab plate Turkish",
        "Ali Nazik yoğurt patlıcan",
        "ali nazik kebap porsiyon",
    ],
    "pideli-kofte": [
        "pideli köfte tabak",
        "köfte on pide bread",
        "pideli köfte yoğurt",
        "Turkish pideli kofte plate",
        "Bursa pideli köfte",
        "pideli köfte porsiyon",
    ],
    "kuzu-tandir": [
        "kuzu tandır tabak",
        "slow roasted lamb Turkish",
        "kuzu tandır porsiyon",
        "tandır kebabı kuzu",
        "lamb tandir plate",
        "kuzu tandır et yemek",
    ],
    "ciger-kebabi": [
        "ciğer kebabı tabak",
        "liver kebab Adana plate",
        "Şanlıurfa ciğer kebap",
        "liver kebab Turkish street food",
        "ciğer şiş kebap",
        "arnavut ciğeri tabak",
    ],
    "etli-ekmek": [
        "etli ekmek Konya",
        "Turkish etli ekmek flatbread",
        "etli ekmek porsiyon",
        "Konya etli ekmek plate",
        "etli ekmek tabak",
        "etli ekmek lahmacun Konya",
    ],
    "beyti-sarma": [
        "beyti sarma kebap",
        "beyti kebab wrap plate",
        "beyti sarma tabak porsiyon",
        "Turkish beyti sarma",
        "beyti kebabı lavaş",
        "beyti sarma yoğurt sos",
    ],
    "izgara-kofte": [
        "ızgara köfte tabak",
        "grilled Turkish meatballs plate",
        "köfte ızgara pilav",
        "grilled kofte rice salad",
        "ızgara köfte porsiyon",
        "köfte mangal tabak",
    ],
    "tavuk-izgara": [
        "tavuk ızgara tabak",
        "grilled chicken breast plate",
        "ızgara tavuk salata",
        "grilled chicken salad diet",
        "tavuk ızgara pilav",
        "chicken grill plate Turkish",
    ],
    "cop-sis": [
        "çöp şiş kebap tabak",
        "Turkish cop sis kebab plate",
        "çöp şiş mangal",
        "cop sis skewer plate",
        "çöp şiş porsiyon",
        "çöp şiş ekmek",
    ],
    "urfa-kebap": [
        "Urfa kebap tabak",
        "Urfa kebab plate Turkish",
        "Urfa kebabı porsiyon",
        "Turkish urfa kebab mild",
        "Urfa kebap lavaş",
        "Urfa kebap pilav",
    ],
    "ezogelin-corbasi": [
        "ezogelin çorbası kase",
        "Turkish ezogelin soup bowl",
        "ezogelin çorba tabak",
        "red lentil ezogelin soup",
        "ezogelin çorbası porsiyon",
        "ezogelin mercimek çorba",
    ],
    "iskembe-corbasi": [
        "işkembe çorbası kase",
        "Turkish tripe soup bowl",
        "işkembe çorba sirke sarımsak",
        "tripe soup iskembe Turkish",
        "işkembe çorbası porsiyon",
        "işkembe çorba kase tabak",
    ],
    "limonata": [
        "limonata bardak buz",
        "Turkish lemonade glass ice",
        "ev yapımı limonata sürahi",
        "fresh lemonade pitcher glass",
        "limonata restoran",
        "naneli limonata bardak",
    ],
    "salgam": [
        "şalgam suyu bardak",
        "Turkish turnip juice salgam",
        "şalgam bardak Adana",
        "salgam juice purple drink",
        "şalgam suyu kebap",
        "şalgam acılı bardak",
    ],
    "su": [
        "su bardak şişe",
        "glass of water bottle",
        "su bardak restoran",
        "water glass restaurant table",
        "pet şişe su",
        "drinking water glass clear",
    ],
    "soda": [
        "soda şişe bardak",
        "sparkling water bottle glass",
        "maden suyu bardak",
        "Turkish soda bottle restaurant",
        "soda meşrubat bardak",
        "soda water fizzy glass",
    ],
    "meyve-suyu": [
        "meyve suyu bardak",
        "fruit juice glass",
        "portakal suyu bardak taze",
        "fresh orange juice glass",
        "meyve suyu kutu paket",
        "packaged fruit juice box",
    ],
    "gozleme": [
        "gözleme tabak Türk",
        "Turkish gozleme flatbread",
        "gözleme peynir ıspanak",
        "gozleme cheese spinach plate",
        "gözleme kıymalı patatesli",
        "gözleme bazlama pazar",
    ],
    "borek-cesitleri": [
        "sigara böreği tabak",
        "Turkish cigarette borek plate",
        "sigara böreği kızartma",
        "fried borek cigar shaped",
        "börek çeşitleri tabak",
        "sigara böreği peynirli",
    ],
    "tost": [
        "tost Türk tostçu",
        "Turkish tost grilled sandwich",
        "tost kaşarlı sucuklu",
        "Turkish toast kashar cheese",
        "karışık tost tabak",
        "tost makinesinde tost",
    ],
    "kumru": [
        "kumru sandviç İzmir",
        "İzmir kumru sandwich",
        "kumru ekmek sandviç",
        "kumru İzmir sokak yemek",
        "kumru tost İzmir",
        "kumru sandviç peynir sucuk",
    ],
    "findik": [
        "fındık kase tabak",
        "hazelnuts bowl plate",
        "fındık iç fındık",
        "Turkish hazelnuts snack",
        "kavrulmuş fındık kase",
        "roasted hazelnuts bowl",
    ],
    "kestane": [
        "kestane kebap sokak",
        "roasted chestnuts street food",
        "kestane kebap kağıt",
        "roasted chestnut paper bag",
        "kış kestane kebap",
        "chestnut roasted winter street",
    ],
    "kuruyemis": [
        "kuruyemiş tabak karışık",
        "mixed nuts dried fruits plate",
        "kuruyemiş kase çeşit",
        "assorted nuts bowl",
        "kuruyemiş tabağı",
        "mixed nuts snack bowl plate",
    ],
    "kunefe": [
        "künefe tatlı tabak",
        "Turkish kunefe dessert plate",
        "künefe peynir kadayıf",
        "kunefe cheese dessert Hatay",
        "künefe porsiyon",
        "künefe sıcak tatlı",
    ],
    "revani": [
        "revani tatlı tabak",
        "Turkish revani semolina cake",
        "revani şerbetli tatlı",
        "revani dessert plate",
        "revani kek tabak",
        "revani porsiyon tatlı",
    ],
    "asure": [
        "aşure kase tatlı",
        "Turkish ashure Noah pudding",
        "aşure kase Muharrem",
        "ashure dessert bowl",
        "aşure tatlı porsiyon",
        "aşure kase süslü",
    ],
    "tavuk-gogsu": [
        "tavuk göğsü tatlı tabak",
        "Turkish tavuk gogsu dessert",
        "tavuk göğsü muhallebi",
        "chicken breast pudding Turkish",
        "tavuk göğsü tatlı porsiyon",
        "tavuk göğsü kazandibi tatlı",
    ],
    "wrap": [
        "wrap dürüm sandviç",
        "wrap sandwich tortilla",
        "tavuk wrap dürüm",
        "chicken wrap tortilla",
        "wrap lavaş dürüm",
        "healthy wrap sandwich plate",
    ],
    "smoothie": [
        "smoothie bardak meyve",
        "fruit smoothie glass",
        "smoothie sağlıklı içecek",
        "healthy smoothie drink berry",
        "yeşil smoothie bardak",
        "green smoothie protein shake",
    ],
    "granola": [
        "granola kase yoğurt",
        "granola bowl yogurt fruit",
        "granola müsli kahvaltı",
        "granola breakfast bowl",
        "granola kase meyve",
        "granola yogurt bowl healthy",
    ],
    "avocado-toast": [
        "avocado toast kahvaltı",
        "avocado toast breakfast plate",
        "avokado tost ekmek",
        "avocado toast egg",
        "avokado ekmek kahvaltı",
        "avocado toast sourdough",
    ],
    "acai-bowl": [
        "açaí bowl meyve",
        "acai bowl fruit granola",
        "açaí kase sağlıklı",
        "acai bowl breakfast healthy",
        "açaí bowl porsiyon",
        "acai smoothie bowl topping",
    ],
    "poke-bowl": [
        "poke bowl somon",
        "poke bowl salmon rice",
        "poke bowl Türkiye",
        "poke bowl fresh fish",
        "poke bowl porsiyon",
        "Hawaiian poke bowl restaurant",
    ],
}


# ============================================================
# Image Downloader
# ============================================================
class FoodImageDownloader:
    """Downloads and validates food images using icrawler."""

    def __init__(self, dataset_dir: str, target_count: int = 350, max_per_query: int = 80):
        self.dataset_dir = Path(dataset_dir)
        self.target_count = target_count
        self.max_per_query = max_per_query
        self.stats: Dict[str, Dict] = {}

    def count_existing(self, class_name: str) -> int:
        """Count existing valid images in a class directory."""
        class_dir = self.dataset_dir / class_name
        if not class_dir.exists():
            return 0
        return len([f for f in class_dir.iterdir() if f.is_file() and f.suffix.lower() in {'.jpg', '.jpeg', '.png', '.webp'}])

    def download_class(self, class_name: str, queries: List[str], force_target: Optional[int] = None) -> Dict:
        """Download images for a single class using multiple search queries."""
        class_dir = self.dataset_dir / class_name
        class_dir.mkdir(parents=True, exist_ok=True)

        existing = self.count_existing(class_name)
        target = force_target or self.target_count
        needed = target - existing

        if needed <= 0:
            print(f"  [OK] {class_name}: already has {existing} images (target: {target})")
            return {"class": class_name, "existing": existing, "downloaded": 0, "final": existing}

        print(f"\n{'='*60}")
        print(f"  [DL] {class_name}: has {existing}, need {needed} more (target: {target})")
        print(f"{'='*60}")

        # Temporary download directory
        temp_dir = class_dir / "_temp_download"
        temp_dir.mkdir(exist_ok=True)

        total_downloaded = 0
        per_query = min(self.max_per_query, max(30, needed // len(queries) + 20))

        for i, query in enumerate(queries):
            if total_downloaded >= needed:
                break

            remaining = needed - total_downloaded
            count = min(per_query, remaining + 20)  # Download extra to account for invalid ones

            print(f"    [{i+1}/{len(queries)}] Searching: '{query}' (max {count})...")

            try:
                self._crawl_bing(query, str(temp_dir), count)
            except Exception as e:
                print(f"    [WARN]  Bing failed: {e}")

            # Count newly downloaded
            new_count = len([f for f in temp_dir.iterdir() if f.is_file()])
            total_downloaded = new_count
            print(f"    [PKG] Downloaded so far: {new_count} raw files")

            time.sleep(0.5)  # Rate limiting

        # Validate and move images
        moved = self._validate_and_move(temp_dir, class_dir, class_name, needed)

        # Cleanup temp
        if temp_dir.exists():
            shutil.rmtree(temp_dir, ignore_errors=True)

        final_count = self.count_existing(class_name)
        print(f"  [STATS] {class_name}: {existing} → {final_count} images (+{moved} new)")

        result = {"class": class_name, "existing": existing, "downloaded": moved, "final": final_count}
        self.stats[class_name] = result
        return result

    def _crawl_bing(self, query: str, save_dir: str, max_num: int):
        """Download from Bing Images."""
        import ssl
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

        from icrawler.builtin import BingImageCrawler

        crawler = BingImageCrawler(
            storage={"root_dir": save_dir},
            log_level=50,  # CRITICAL only - suppress noise
        )
        crawler.crawl(
            keyword=query,
            max_num=max_num,
            min_size=(100, 100),
            file_idx_offset="auto",
        )

    def _validate_and_move(self, temp_dir: Path, target_dir: Path, class_name: str, max_to_move: int) -> int:
        """Validate downloaded images and move good ones to the class directory."""
        # Collect existing hashes to detect duplicates
        existing_hashes = set()
        for f in target_dir.iterdir():
            if f.is_file() and f.suffix.lower() in {'.jpg', '.jpeg', '.png', '.webp'}:
                try:
                    h = self._file_hash(f)
                    existing_hashes.add(h)
                except:
                    pass

        moved = 0
        skipped_corrupt = 0
        skipped_small = 0
        skipped_dup = 0

        # Get existing max index for naming
        existing_files = list(target_dir.glob("*.jpg")) + list(target_dir.glob("*.jpeg")) + list(target_dir.glob("*.png"))
        max_idx = 0
        for f in existing_files:
            try:
                num = int(f.stem.split("_")[-1]) if "_" in f.stem else int(f.stem)
                max_idx = max(max_idx, num)
            except:
                max_idx = max(max_idx, len(existing_files))

        for img_file in sorted(temp_dir.iterdir()):
            if moved >= max_to_move:
                break
            if not img_file.is_file():
                continue
            if img_file.suffix.lower() not in {'.jpg', '.jpeg', '.png', '.webp', '.gif'}:
                continue

            # Validate image
            try:
                img = Image.open(img_file)
                img.verify()
                img = Image.open(img_file)  # Re-open after verify

                # Check minimum size
                if img.width < 100 or img.height < 100:
                    skipped_small += 1
                    continue

                # Check for duplicates
                h = self._file_hash(img_file)
                if h in existing_hashes:
                    skipped_dup += 1
                    continue
                existing_hashes.add(h)

                # Convert to RGB JPG and save
                max_idx += 1
                new_name = f"{class_name}_{max_idx:05d}.jpg"
                new_path = target_dir / new_name

                if img.mode != "RGB":
                    img = img.convert("RGB")
                
                # Resize if too large (save disk space)
                max_dim = 800
                if img.width > max_dim or img.height > max_dim:
                    img.thumbnail((max_dim, max_dim), Image.LANCZOS)

                img.save(new_path, "JPEG", quality=92)
                moved += 1

            except Exception as e:
                skipped_corrupt += 1

        if skipped_corrupt or skipped_small or skipped_dup:
            print(f"    [CHECK] Validation: {skipped_corrupt} corrupt, {skipped_small} too small, {skipped_dup} duplicates skipped")

        return moved

    def _file_hash(self, filepath: Path) -> str:
        """Quick hash of image content for dedup."""
        h = hashlib.md5()
        with open(filepath, "rb") as f:
            chunk = f.read(8192)
            while chunk:
                h.update(chunk)
                chunk = f.read(8192)
        return h.hexdigest()

    def download_critical_classes(self):
        """Download images for all critical classes."""
        print("\n" + "=" * 70)
        print("[!] DOWNLOADING IMAGES FOR CRITICAL CLASSES (< 100 images)")
        print("=" * 70)

        for class_name, queries in CRITICAL_CLASSES.items():
            self.download_class(class_name, queries)

    def download_new_classes(self):
        """Download images for all new recommended classes."""
        print("\n" + "=" * 70)
        print("[NEW] DOWNLOADING IMAGES FOR NEW CLASSES")
        print("=" * 70)

        for class_name, queries in NEW_CLASSES.items():
            self.download_class(class_name, queries)

    def print_summary(self):
        """Print download summary."""
        print("\n" + "=" * 70)
        print("[STATS] DOWNLOAD SUMMARY")
        print("=" * 70)

        total_downloaded = 0
        for class_name, info in sorted(self.stats.items()):
            status = "[OK]" if info["final"] >= 200 else "[WARN]" if info["final"] >= 100 else "[FAIL]"
            print(f"  {status} {class_name:30s}: {info['existing']:4d} → {info['final']:4d} (+{info['downloaded']})")
            total_downloaded += info["downloaded"]

        print(f"\n  Total new images downloaded: {total_downloaded}")
        print(f"  Classes processed: {len(self.stats)}")

        # Save stats
        stats_path = self.dataset_dir.parent / "download_stats.json"
        with open(stats_path, "w", encoding="utf-8") as f:
            json.dump(self.stats, f, indent=2, ensure_ascii=False)
        print(f"  Stats saved to: {stats_path}")


def main():
    parser = argparse.ArgumentParser(description="Download food images for dataset")
    parser.add_argument("--data", type=str, default="../../merged_datasetf/images",
                        help="Path to dataset images directory")
    parser.add_argument("--mode", type=str, default="all",
                        choices=["all", "critical", "new", "single"],
                        help="Download mode")
    parser.add_argument("--class-name", type=str, default=None,
                        help="Class name for single mode")
    parser.add_argument("--target", type=int, default=350,
                        help="Target images per class (default: 350)")
    parser.add_argument("--max-per-query", type=int, default=80,
                        help="Max images per search query (default: 80)")

    args = parser.parse_args()

    downloader = FoodImageDownloader(
        dataset_dir=args.data,
        target_count=args.target,
        max_per_query=args.max_per_query,
    )

    if args.mode == "all":
        downloader.download_critical_classes()
        downloader.download_new_classes()
    elif args.mode == "critical":
        downloader.download_critical_classes()
    elif args.mode == "new":
        downloader.download_new_classes()
    elif args.mode == "single":
        if not args.class_name:
            print("ERROR: --class-name required for single mode")
            sys.exit(1)
        # Find queries
        all_classes = {**CRITICAL_CLASSES, **NEW_CLASSES}
        if args.class_name in all_classes:
            queries = all_classes[args.class_name]
        else:
            # Generate generic queries
            name_clean = args.class_name.replace("-", " ").replace("_", " ")
            queries = [
                f"{name_clean} food plate",
                f"{name_clean} yemek tabak",
                f"{name_clean} meal dish",
                f"{name_clean} Turkish food",
            ]
        downloader.download_class(args.class_name, queries)

    downloader.print_summary()


if __name__ == "__main__":
    main()
