"""
FoodSeg103 Segmentation Module
================================
FoodSeg103 dataseti ile eğitilmiş YOLOv8-seg modelini kullanarak
yemek segmentasyonu yapar.

Özellikler:
- 103 yemek sınıfı desteği
- Sadece yemek alanlarını segmente eder (arka plan hariç)
- Her yemek instance'ı için sınıf tahmini
- Derinlik hesaplaması için temiz mask'lar

Kullanım:
    from food_calorie_estimation.modules.segmentation_foodseg103 import FoodSeg103Segmentor
    
    segmentor = FoodSeg103Segmentor(model_path="foodseg103_seg.pt")
    result = segmentor.segment(image)
    
    for instance in result.instances:
        print(f"{instance.class_name}: {instance.area_pixels} px")
"""

import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field

import numpy as np
from PIL import Image
import cv2

logger = logging.getLogger(__name__)


@dataclass
class FoodInstance:
    """
    Tek bir yemek instance'ı.
    
    FoodSeg103 modeli tarafından tespit edilen her yemek parçası.
    """
    mask: np.ndarray  # Binary mask (H, W), uint8
    bbox: Tuple[int, int, int, int]  # x1, y1, x2, y2
    area_pixels: int
    confidence: float
    class_id: int  # FoodSeg103 class ID (0-102)
    class_name: str  # FoodSeg103 class name
    contour: Optional[np.ndarray] = None
    centroid: Optional[Tuple[int, int]] = None  # (cx, cy)
    
    # Ek özellikler
    aspect_ratio: float = 1.0  # width / height
    circularity: float = 0.0  # 4*pi*area / perimeter^2
    

@dataclass
class FoodSegmentationResult:
    """
    Yemek segmentasyonu sonucu.
    
    Tüm tespit edilen yemek instance'larını ve birleşik mask'ları içerir.
    """
    instances: List[FoodInstance]
    image_shape: Tuple[int, int]  # (H, W)
    num_instances: int
    total_area_pixels: int
    
    # Birleşik mask'lar
    combined_food_mask: Optional[np.ndarray] = None  # Tüm yemeklerin birleşik mask'ı
    per_class_masks: Optional[Dict[int, np.ndarray]] = None  # Sınıf bazında mask'lar
    
    # Meta bilgiler
    segmentor_type: str = 'foodseg103'
    model_path: Optional[str] = None
    warnings: List[str] = field(default_factory=list)
    
    # Sınıf dağılımı
    class_distribution: Dict[str, int] = field(default_factory=dict)  # class_name -> pixel_count
    

class FoodSeg103Segmentor:
    """
    FoodSeg103 dataseti ile eğitilmiş YOLOv8-seg tabanlı yemek segmentor.
    
    Bu segmentor:
    - Sadece yemek sınıflarını tespit eder (arka plan, tabak vb. hariç)
    - Her yemek için ayrı instance mask'ı sağlar
    - Sınıf bazında segmentasyon yapar
    """
    
    # Minimum mask alanı (görüntü alanının yüzdesi olarak)
    MIN_AREA_RATIO = 0.001  # %0.1
    
    # Merge için IoU threshold
    MERGE_IOU_THRESHOLD = 0.7
    
    # Confidence threshold
    DEFAULT_CONF = 0.25
    
    def __init__(self,
                 model_path: Optional[str] = None,
                 device: Optional[str] = None,
                 conf_threshold: float = 0.25,
                 iou_threshold: float = 0.7,
                 class_names_path: Optional[str] = None):
        """
        FoodSeg103 Segmentor'ı initialize et.
        
        Args:
            model_path: Eğitilmiş FoodSeg103 model path'i.
                       None ise varsayılan konumları arar.
            device: Kullanılacak device ('cuda', 'cpu', None=auto)
            conf_threshold: Confidence threshold
            iou_threshold: NMS için IoU threshold
            class_names_path: class_names.json path'i (opsiyonel)
        """
        self.device = device
        self.conf_threshold = conf_threshold
        self.iou_threshold = iou_threshold
        
        # Model path'i bul
        self.model_path = self._find_model_path(model_path)
        
        # Class names yükle
        self.class_names = self._load_class_names(class_names_path)
        self.num_classes = len(self.class_names)
        
        # Model yükle
        self.model = None
        self._model_loaded = False
        
        logger.info(f"FoodSeg103 Segmentor initialized")
        logger.info(f"  Model: {self.model_path}")
        logger.info(f"  Classes: {self.num_classes}")
    
    def _find_model_path(self, model_path: Optional[str]) -> Path:
        """Model dosyasını bul."""
        if model_path is not None:
            path = Path(model_path)
            if path.exists():
                return path
            raise FileNotFoundError(f"Model bulunamadı: {model_path}")
        
        # Varsayılan konumları kontrol et
        search_paths = [
            Path(__file__).parent.parent.parent / "foodseg103_seg.pt",  # Proje kökü
            Path(__file__).parent.parent / "foodseg103_seg.pt",  # food_calorie_estimation/
            Path(__file__).parent.parent / "seg_dataset" / "foodseg103_best.pt",  # seg_dataset/
            Path(__file__).parent.parent / "seg_dataset" / "runs" / "segment" / "foodseg103" / "weights" / "best.pt",
        ]
        
        for path in search_paths:
            if path.exists():
                logger.info(f"FoodSeg103 model bulundu: {path}")
                return path
        
        # Model bulunamadı - kullanıcıya bilgi ver
        logger.warning("FoodSeg103 model bulunamadı!")
        logger.warning("Önce modeli eğitmeniz gerekiyor:")
        logger.warning("  1. cd food_calorie_estimation/seg_dataset")
        logger.warning("  2. python prepare_dataset.py")
        logger.warning("  3. python train_seg.py")
        
        raise FileNotFoundError(
            "FoodSeg103 model bulunamadı!\n"
            "Eğitim için: cd seg_dataset && python prepare_dataset.py && python train_seg.py"
        )
    
    def _load_class_names(self, class_names_path: Optional[str]) -> List[str]:
        """Sınıf isimlerini yükle."""
        import json
        
        if class_names_path is not None:
            path = Path(class_names_path)
            if path.exists():
                with open(path, 'r', encoding='utf-8') as f:
                    return json.load(f)
        
        # Varsayılan konumları kontrol et
        search_paths = [
            Path(__file__).parent.parent / "seg_dataset" / "dataset" / "class_names.json",
            Path(__file__).parent.parent / "seg_dataset" / "class_names.json",
            self.model_path.parent / "class_names.json" if self.model_path else None,
        ]
        
        for path in search_paths:
            if path and path.exists():
                with open(path, 'r', encoding='utf-8') as f:
                    return json.load(f)
        
        # Bulunamadı - model yüklendiğinde names'den alınacak
        logger.warning("class_names.json bulunamadı, model'den alınacak")
        return []
    
    def _load_model(self):
        """Modeli lazy load et."""
        if self._model_loaded:
            return
        
        try:
            from ultralytics import YOLO
        except ImportError:
            raise ImportError(
                "ultralytics paketi yüklü değil!\n"
                "Yüklemek için: pip install ultralytics"
            )
        
        logger.info(f"FoodSeg103 model yükleniyor: {self.model_path}")
        
        self.model = YOLO(str(self.model_path))
        
        # Class names'i modelden al (eğer boşsa)
        if not self.class_names and hasattr(self.model, 'names'):
            self.class_names = list(self.model.names.values())
            self.num_classes = len(self.class_names)
            logger.info(f"Class names modelden alındı: {self.num_classes} sınıf")
        
        self._model_loaded = True
        logger.info("FoodSeg103 model yüklendi")
    
    def segment(self,
                image: Image.Image,
                return_per_class_masks: bool = False) -> FoodSegmentationResult:
        """
        Görüntüdeki yemekleri segmente et.
        
        Args:
            image: PIL Image (RGB)
            return_per_class_masks: Her sınıf için ayrı mask döndür
        
        Returns:
            FoodSegmentationResult
        """
        # Model yükle (lazy)
        self._load_model()
        
        # Numpy'a çevir
        image_np = np.array(image)
        h, w = image_np.shape[:2]
        min_area = int(h * w * self.MIN_AREA_RATIO)
        
        # Inference
        results = self.model.predict(
            image_np,
            conf=self.conf_threshold,
            iou=self.iou_threshold,
            device=self.device,
            verbose=False,
            retina_masks=True  # Yüksek çözünürlüklü mask'lar
        )
        
        instances = []
        warnings = []
        class_distribution = {}
        
        # Sonuç kontrolü
        if len(results) == 0 or results[0].masks is None:
            logger.warning("Hiç yemek tespit edilemedi")
            warnings.append("No food instances detected")
            return FoodSegmentationResult(
                instances=[],
                image_shape=(h, w),
                num_instances=0,
                total_area_pixels=0,
                combined_food_mask=None,
                warnings=warnings,
                segmentor_type='foodseg103',
                model_path=str(self.model_path)
            )
        
        result = results[0]
        masks = result.masks.data.cpu().numpy()  # (N, H, W)
        boxes = result.boxes.xyxy.cpu().numpy()  # (N, 4)
        confidences = result.boxes.conf.cpu().numpy()  # (N,)
        class_ids = result.boxes.cls.cpu().numpy().astype(int)  # (N,)
        
        # Model class names
        model_names = result.names
        
        for i in range(len(masks)):
            mask = masks[i]
            
            # Mask'ı orijinal boyuta resize et
            if mask.shape != (h, w):
                mask = cv2.resize(mask, (w, h), interpolation=cv2.INTER_NEAREST)
            
            # Binary mask
            mask = (mask > 0.5).astype(np.uint8)
            area = int(np.sum(mask))
            
            # Küçük mask'ları filtrele
            if area < min_area:
                continue
            
            # Class bilgileri
            class_id = int(class_ids[i])
            class_name = model_names.get(class_id, f"food_{class_id}")
            
            # Contour çıkar
            contour, centroid, circularity = self._extract_contour_features(mask)
            
            # Bbox
            bbox = tuple(boxes[i].astype(int))
            x1, y1, x2, y2 = bbox
            aspect_ratio = (x2 - x1) / max(y2 - y1, 1)
            
            instance = FoodInstance(
                mask=mask,
                bbox=bbox,
                area_pixels=area,
                confidence=float(confidences[i]),
                class_id=class_id,
                class_name=class_name,
                contour=contour,
                centroid=centroid,
                aspect_ratio=aspect_ratio,
                circularity=circularity
            )
            instances.append(instance)
            
            # Class distribution güncelle
            class_distribution[class_name] = class_distribution.get(class_name, 0) + area
        
        # Overlapping mask'ları merge et
        instances = self._merge_overlapping(instances)
        
        # Alan'a göre sırala
        instances.sort(key=lambda x: x.area_pixels, reverse=True)
        
        total_area = sum(inst.area_pixels for inst in instances)
        
        # Combined food mask oluştur
        combined_food_mask = np.zeros((h, w), dtype=np.uint8)
        for inst in instances:
            combined_food_mask = np.logical_or(combined_food_mask, inst.mask).astype(np.uint8)
        
        # Per-class masks (opsiyonel)
        per_class_masks = None
        if return_per_class_masks:
            per_class_masks = {}
            for inst in instances:
                if inst.class_id not in per_class_masks:
                    per_class_masks[inst.class_id] = np.zeros((h, w), dtype=np.uint8)
                per_class_masks[inst.class_id] = np.logical_or(
                    per_class_masks[inst.class_id], inst.mask
                ).astype(np.uint8)
        
        logger.info(f"FoodSeg103: {len(instances)} yemek tespit edildi (toplam alan: {total_area} px)")
        
        return FoodSegmentationResult(
            instances=instances,
            image_shape=(h, w),
            num_instances=len(instances),
            total_area_pixels=total_area,
            combined_food_mask=combined_food_mask if np.sum(combined_food_mask) > 0 else None,
            per_class_masks=per_class_masks,
            segmentor_type='foodseg103',
            model_path=str(self.model_path),
            warnings=warnings,
            class_distribution=class_distribution
        )
    
    def _extract_contour_features(self, mask: np.ndarray) -> Tuple[Optional[np.ndarray], Optional[Tuple[int, int]], float]:
        """Mask'tan contour ve özellikler çıkar."""
        contours, _ = cv2.findContours(
            mask * 255,
            cv2.RETR_EXTERNAL,
            cv2.CHAIN_APPROX_SIMPLE
        )
        
        if not contours:
            return None, None, 0.0
        
        # En büyük contour
        contour = max(contours, key=cv2.contourArea)
        
        # Centroid
        M = cv2.moments(contour)
        if M["m00"] > 0:
            cx = int(M["m10"] / M["m00"])
            cy = int(M["m01"] / M["m00"])
            centroid = (cx, cy)
        else:
            centroid = None
        
        # Circularity
        area = cv2.contourArea(contour)
        perimeter = cv2.arcLength(contour, True)
        if perimeter > 0:
            circularity = 4 * np.pi * area / (perimeter ** 2)
        else:
            circularity = 0.0
        
        return contour, centroid, circularity
    
    def _merge_overlapping(self, instances: List[FoodInstance]) -> List[FoodInstance]:
        """Yüksek overlap olan instance'ları merge et."""
        if len(instances) <= 1:
            return instances
        
        merged = []
        used = set()
        
        for i, inst1 in enumerate(instances):
            if i in used:
                continue
            
            current_mask = inst1.mask.copy()
            current_area = inst1.area_pixels
            current_conf = inst1.confidence
            
            for j, inst2 in enumerate(instances):
                if j <= i or j in used:
                    continue
                
                # Aynı sınıf mı kontrol et
                if inst1.class_id != inst2.class_id:
                    continue
                
                # IoU hesapla
                intersection = np.sum(np.logical_and(current_mask, inst2.mask))
                union = np.sum(np.logical_or(current_mask, inst2.mask))
                
                if union > 0:
                    iou = intersection / union
                    if iou > self.MERGE_IOU_THRESHOLD:
                        # Merge
                        current_mask = np.logical_or(current_mask, inst2.mask).astype(np.uint8)
                        current_area = int(np.sum(current_mask))
                        current_conf = max(current_conf, inst2.confidence)
                        used.add(j)
            
            # Instance'ı güncelle
            inst1.mask = current_mask
            inst1.area_pixels = current_area
            inst1.confidence = current_conf
            
            # Contour'u yeniden hesapla
            contour, centroid, circularity = self._extract_contour_features(current_mask)
            inst1.contour = contour
            inst1.centroid = centroid
            inst1.circularity = circularity
            
            merged.append(inst1)
        
        return merged
    
    def segment_from_path(self, image_path: str) -> FoodSegmentationResult:
        """Path'ten görüntü yükleyip segmente et."""
        image = Image.open(image_path).convert('RGB')
        return self.segment(image)
    
    def get_class_name(self, class_id: int) -> str:
        """Class ID'den isim al."""
        if 0 <= class_id < len(self.class_names):
            return self.class_names[class_id]
        return f"food_{class_id}"
    
    @property
    def is_loaded(self) -> bool:
        """Model yüklü mü?"""
        return self._model_loaded


def load_foodseg103_segmentor(model_path: Optional[str] = None,
                               device: Optional[str] = None,
                               conf_threshold: float = 0.25) -> FoodSeg103Segmentor:
    """
    FoodSeg103 segmentor yükle.
    
    Convenience function.
    """
    return FoodSeg103Segmentor(
        model_path=model_path,
        device=device,
        conf_threshold=conf_threshold
    )
