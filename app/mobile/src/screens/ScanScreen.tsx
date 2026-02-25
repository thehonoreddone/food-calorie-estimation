import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  Modal,
  Dimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions, CameraType } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { predictionService } from "../services";
import { logMeal, MealType } from "../services/firestoreService";
import { PredictionResponse, ImagePickerResult } from "../types";
import { useUser } from "../contexts/UserContext";
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from "../constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type ScanMode = "camera" | "result" | "loading";

// ─── Meal type selector data ────────────────────────────────────────────────
const MEAL_TYPES: { key: MealType; label: string; icon: string }[] = [
  { key: "breakfast", label: "Kahvaltı", icon: "🌅" },
  { key: "lunch", label: "Öğle Yemeği", icon: "☀️" },
  { key: "dinner", label: "Akşam Yemeği", icon: "🌆" },
  { key: "snack", label: "Aperatif", icon: "🍿" },
];

export const ScanScreen: React.FC = () => {
  // Camera state
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>("back");
  const [mode, setMode] = useState<ScanMode>("camera");

  // Detection state  
  const [liveResult, setLiveResult] = useState<PredictionResponse | null>(null);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [autoDetect, setAutoDetect] = useState(false);
  const autoDetectRef = useRef(false);
  const detectingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Full result state (after manual capture)
  const [fullResult, setFullResult] = useState<PredictionResponse | null>(null);
  const [fullImageUri, setFullImageUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Meal add modal
  const [showMealModal, setShowMealModal] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType>("lunch");

  const { profile } = useUser();

  // ─── Auto-detect loop ──────────────────────────────────────────────────
  useEffect(() => {
    autoDetectRef.current = autoDetect;
    if (autoDetect && mode === "camera") {
      startAutoDetection();
    } else {
      stopAutoDetection();
    }
    return () => stopAutoDetection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDetect, mode]);

  const startAutoDetection = useCallback(() => {
    if (intervalRef.current) return;
    // Immediately try one detection
    captureAndDetect();
    // Then every 3 seconds
    intervalRef.current = setInterval(() => {
      if (autoDetectRef.current && !detectingRef.current) {
        captureAndDetect();
      }
    }, 3000);
  }, []);

  const stopAutoDetection = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ─── Capture & quick detect (for live overlay) ─────────────────────────
  const captureAndDetect = async () => {
    if (!cameraRef.current || detectingRef.current) return;
    detectingRef.current = true;
    setIsDetecting(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.4,
        skipProcessing: true,
      });
      if (!photo) {
        detectingRef.current = false;
        setIsDetecting(false);
        return;
      }
      const image: ImagePickerResult = {
        uri: photo.uri,
        type: "image/jpeg",
        name: `frame_${Date.now()}.jpg`,
      };
      const result = await predictionService.predict(image);
      setLiveResult(result);
      setCapturedImageUri(photo.uri);
    } catch (err) {
      console.log("Auto-detect error (non-critical):", err);
    } finally {
      detectingRef.current = false;
      setIsDetecting(false);
    }
  };

  // ─── Manual capture for full analysis ──────────────────────────────────
  const handleCapture = async () => {
    if (!cameraRef.current) return;
    setAutoDetect(false);
    setMode("loading");
    setIsAnalyzing(true);
    setError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      if (!photo) {
        setMode("camera");
        setIsAnalyzing(false);
        return;
      }
      const image: ImagePickerResult = {
        uri: photo.uri,
        type: "image/jpeg",
        name: `capture_${Date.now()}.jpg`,
      };
      const result = await predictionService.predict(image);
      setFullResult(result);
      setFullImageUri(photo.uri);
      setMode("result");
    } catch (err: unknown) {
      console.error("Capture error:", err);
      const axiosErr = err as { response?: { data?: { detail?: unknown } }; message?: string };
      let errorMessage = "Analiz başarısız. Bağlantınızı kontrol edin.";
      if (axiosErr.response?.data?.detail) {
        errorMessage = String(axiosErr.response.data.detail);
      } else if (axiosErr.message) {
        errorMessage = String(axiosErr.message);
      }
      setError(errorMessage);
      setMode("camera");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ─── Gallery pick ──────────────────────────────────────────────────────
  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setAutoDetect(false);
        setMode("loading");
        setIsAnalyzing(true);
        setError(null);
        const image: ImagePickerResult = {
          uri: asset.uri,
          type: asset.mimeType || "image/jpeg",
          name: asset.fileName || `gallery_${Date.now()}.jpg`,
        };
        const prediction = await predictionService.predict(image);
        setFullResult(prediction);
        setFullImageUri(asset.uri);
        setMode("result");
        setIsAnalyzing(false);
      }
    } catch (err: unknown) {
      console.error("Gallery error:", err);
      const axiosErr = err as { message?: string };
      setError(axiosErr.message || "Analiz başarısız.");
      setMode("camera");
      setIsAnalyzing(false);
    }
  };

  // ─── Add to meal ──────────────────────────────────────────────────────
  const handleAddToMeal = async () => {
    const predToUse = fullResult || liveResult;
    const imageToUse = fullImageUri || capturedImageUri;
    if (!predToUse || !profile.uid) {
      Alert.alert("Hata", "Giriş yapmadan öğün eklenemez.");
      return;
    }

    try {
      const today = new Date().toISOString().split("T")[0];
      // Estimate macros from calories
      const protein = Math.round(predToUse.estimated_calories * 0.25 / 4);
      const carbs = Math.round(predToUse.estimated_calories * 0.45 / 4);
      const fat = Math.round(predToUse.estimated_calories * 0.30 / 9);

      await logMeal(profile.uid, {
        date: today,
        mealType: selectedMealType,
        foodName: predToUse.class_name.replace(/_/g, " ").replace(/-/g, " "),
        calories: Math.round(predToUse.estimated_calories),
        protein,
        carbs,
        fat,
        weight: Math.round(predToUse.estimated_weight_grams),
        confidence: predToUse.confidence,
        imageUri: imageToUse || undefined,
      });

      setShowMealModal(false);
      Alert.alert("Eklendi! ✅", `${predToUse.class_name.replace(/_/g, " ")} ${getMealLabel(selectedMealType)} öğününe eklendi.`);
      handleReset();
    } catch (err) {
      console.error("Meal log error:", err);
      Alert.alert("Hata", "Öğün kaydedilemedi. Tekrar deneyin.");
    }
  };

  const getMealLabel = (mt: MealType): string => {
    return MEAL_TYPES.find((m) => m.key === mt)?.label || mt;
  };

  // ─── Reset ────────────────────────────────────────────────────────────
  const handleReset = () => {
    setMode("camera");
    setFullResult(null);
    setFullImageUri(null);
    setLiveResult(null);
    setCapturedImageUri(null);
    setError(null);
  };

  // ─── Permission check ─────────────────────────────────────────────────
  if (!permission) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.permissionIcon}>📷</Text>
        <Text style={styles.permissionTitle}>Kamera İzni Gerekli</Text>
        <Text style={styles.permissionDesc}>
          Yemekleri taramak için kamera erişimine ihtiyacımız var
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>İzin Ver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─── Loading screen ───────────────────────────────────────────────────
  if (mode === "loading") {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={styles.loadingTitle}>Yemek Analiz Ediliyor...</Text>
          <Text style={styles.loadingDesc}>Yapay zeka çalışıyor{"\n"}Bu biraz zaman alabilir</Text>
          <TouchableOpacity onPress={handleReset} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>İptal Et</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Result screen ────────────────────────────────────────────────────
  if (mode === "result" && fullResult && fullImageUri) {
    const confidencePercentage = (fullResult.confidence * 100).toFixed(1);
    const isGoodConfidence = fullResult.confidence > 0.5;

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#111827" }} edges={["top"]}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.resultHeader}>
            <Text style={styles.resultHeaderText}>✨ Analiz Sonuçları</Text>
          </View>

          <View style={{ padding: 16, backgroundColor: "#111827" }}>
            {/* Image */}
            <View style={styles.resultImageContainer}>
              <View style={styles.resultImageFrame}>
                <Image source={{ uri: fullImageUri }} style={styles.resultImage} resizeMode="cover" />
              </View>
            </View>

            {/* Food name */}
            <View
              style={[
                styles.resultNameCard,
                {
                  backgroundColor: isGoodConfidence ? "#065f46" : "#7f1d1d",
                  borderColor: isGoodConfidence ? "#10b981" : "#ef4444",
                },
              ]}
            >
              <Text style={[styles.resultNameLabel, { color: isGoodConfidence ? "#6ee7b7" : "#fca5a5" }]}>
                🍽️ TESPİT EDİLEN YEMEK
              </Text>
              <Text style={styles.resultNameValue}>
                {fullResult.class_name.replace(/_/g, " ").replace(/-/g, " ")}
              </Text>
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceBadgeText}>%{confidencePercentage} Güven</Text>
              </View>
            </View>

            {/* Weight & Calories */}
            <View style={{ flexDirection: "row", marginBottom: 20 }}>
              <View style={styles.statCardBlue}>
                <Text style={{ fontSize: 40 }}>⚖️</Text>
                <Text style={styles.statValueBlue}>{fullResult.estimated_weight_grams.toFixed(0)}</Text>
                <Text style={styles.statLabelBlue}>gram</Text>
              </View>
              <View style={styles.statCardOrange}>
                <Text style={{ fontSize: 40 }}>🔥</Text>
                <Text style={styles.statValueOrange}>{fullResult.estimated_calories.toFixed(0)}</Text>
                <Text style={styles.statLabelOrange}>kcal</Text>
              </View>
            </View>

            {/* Add to meal button */}
            <TouchableOpacity
              onPress={() => setShowMealModal(true)}
              style={styles.addMealBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.addMealBtnText}>➕ Öğüne Ekle</Text>
            </TouchableOpacity>

            {/* New analysis */}
            <TouchableOpacity onPress={handleReset} style={styles.newAnalysisBtn} activeOpacity={0.8}>
              <Text style={styles.newAnalysisBtnText}>📷 Yeni Analiz Yap</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Meal type selector modal */}
        {renderMealModal()}
      </SafeAreaView>
    );
  }

  // ─── Meal type modal ──────────────────────────────────────────────────
  function renderMealModal() {
    return (
      <Modal visible={showMealModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Öğün Seçin</Text>
            {MEAL_TYPES.map((mt) => (
              <TouchableOpacity
                key={mt.key}
                style={[
                  styles.mealTypeOption,
                  selectedMealType === mt.key && styles.mealTypeOptionActive,
                ]}
                onPress={() => setSelectedMealType(mt.key)}
              >
                <Text style={styles.mealTypeIcon}>{mt.icon}</Text>
                <Text
                  style={[
                    styles.mealTypeLabel,
                    selectedMealType === mt.key && styles.mealTypeLabelActive,
                  ]}
                >
                  {mt.label}
                </Text>
                {selectedMealType === mt.key && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>
            ))}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowMealModal(false)}
              >
                <Text style={styles.modalCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleAddToMeal}>
                <Text style={styles.modalConfirmText}>Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // ─── Camera view (main) ───────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />

      {/* Top bar */}
      <SafeAreaView edges={["top"]} style={styles.cameraOverlay}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.topBarBtn}
            onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
          >
            <Text style={styles.topBarBtnText}>🔄</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>📸 Yemek Tara</Text>
          <TouchableOpacity style={styles.topBarBtn} onPress={handlePickFromGallery}>
            <Text style={styles.topBarBtnText}>🖼️</Text>
          </TouchableOpacity>
        </View>

        {/* Auto-detect toggle */}
        <View style={styles.autoDetectRow}>
          <TouchableOpacity
            style={[styles.autoDetectBtn, autoDetect && styles.autoDetectBtnActive]}
            onPress={() => setAutoDetect(!autoDetect)}
          >
            <Text style={styles.autoDetectText}>
              {autoDetect ? "⏸ Otomatik Tanıma Açık" : "▶️ Otomatik Tanıma"}
            </Text>
          </TouchableOpacity>
          {isDetecting && (
            <ActivityIndicator size="small" color={Colors.primary[400]} style={{ marginLeft: 8 }} />
          )}
        </View>
      </SafeAreaView>

      {/* Error banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Text style={styles.errorDismiss}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Live result card (bottom) */}
      {liveResult && mode === "camera" && (
        <View style={styles.liveResultCard}>
          <View style={styles.liveResultTop}>
            {capturedImageUri && (
              <Image source={{ uri: capturedImageUri }} style={styles.liveResultThumb} />
            )}
            <View style={styles.liveResultInfo}>
              <Text style={styles.liveResultName} numberOfLines={1}>
                {liveResult.class_name.replace(/_/g, " ").replace(/-/g, " ")}
              </Text>
              <Text style={styles.liveResultDetail}>
                ⚖️ {liveResult.estimated_weight_grams.toFixed(0)}g  •  🔥 {liveResult.estimated_calories.toFixed(0)} kcal
              </Text>
              <Text style={styles.liveResultConfidence}>
                %{(liveResult.confidence * 100).toFixed(0)} güven
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.liveAddBtn}
            onPress={() => {
              setFullResult(liveResult);
              setFullImageUri(capturedImageUri);
              setShowMealModal(true);
            }}
          >
            <Text style={styles.liveAddBtnText}>➕ Öğüne Ekle</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom capture bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarInner}>
          <TouchableOpacity style={styles.captureRing} onPress={handleCapture} activeOpacity={0.7}>
            <View style={styles.captureCircle} />
          </TouchableOpacity>
        </View>
        <Text style={styles.bottomHint}>Fotoğraf çekip analiz edin veya otomatik tanıma açın</Text>
      </View>

      {/* Meal type modal (shared) */}
      {renderMealModal()}
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
    padding: Spacing["2xl"],
  },
  // Permission
  permissionIcon: { fontSize: 64, marginBottom: Spacing.xl },
  permissionTitle: {
    fontSize: FontSize["2xl"],
    fontWeight: "700",
    color: Colors.text.primary,
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  permissionDesc: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    textAlign: "center",
    marginBottom: Spacing["2xl"],
    lineHeight: 22,
  },
  permissionBtn: {
    backgroundColor: Colors.primary[500],
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: BorderRadius.lg,
  },
  permissionBtnText: {
    color: "#fff",
    fontSize: FontSize.lg,
    fontWeight: "700",
  },
  // Loading
  loadingCard: {
    backgroundColor: "#fff",
    padding: 40,
    borderRadius: 24,
    ...Shadows.lg,
    alignItems: "center",
    marginHorizontal: 24,
  },
  loadingTitle: {
    color: Colors.text.primary,
    marginTop: 20,
    fontSize: FontSize.lg,
    fontWeight: "600",
  },
  loadingDesc: {
    color: Colors.text.light,
    marginTop: 8,
    textAlign: "center",
    fontSize: FontSize.sm,
  },
  cancelBtn: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  cancelBtnText: { color: Colors.error, fontWeight: "600" },
  // Camera overlay
  cameraOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  topBarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  topBarBtnText: { fontSize: 24 },
  topBarTitle: {
    color: "#fff",
    fontSize: FontSize.lg,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  autoDetectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  autoDetectBtn: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  autoDetectBtnActive: {
    backgroundColor: Colors.primary[600],
    borderColor: Colors.primary[400],
  },
  autoDetectText: {
    color: "#fff",
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
  // Live result card
  liveResultCard: {
    position: "absolute",
    bottom: 160,
    right: 16,
    left: 16,
    backgroundColor: "rgba(0,0,0,0.85)",
    borderRadius: 16,
    padding: 12,
    zIndex: 20,
    borderWidth: 1,
    borderColor: Colors.primary[500],
  },
  liveResultTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  liveResultThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 12,
  },
  liveResultInfo: {
    flex: 1,
  },
  liveResultName: {
    color: "#fff",
    fontSize: FontSize.base,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  liveResultDetail: {
    color: Colors.primary[300],
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  liveResultConfidence: {
    color: "rgba(255,255,255,0.5)",
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  liveAddBtn: {
    backgroundColor: Colors.primary[500],
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 8,
    alignItems: "center",
  },
  liveAddBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: FontSize.sm,
  },
  // Error banner
  errorBanner: {
    position: "absolute",
    top: 120,
    left: 16,
    right: 16,
    backgroundColor: "rgba(239,68,68,0.9)",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 20,
  },
  errorBannerText: {
    color: "#fff",
    flex: 1,
    fontSize: FontSize.sm,
  },
  errorDismiss: {
    color: "#fff",
    fontSize: 18,
    paddingLeft: 12,
  },
  // Bottom bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingBottom: Platform.OS === "ios" ? 36 : 20,
    zIndex: 10,
  },
  bottomBarInner: {
    alignItems: "center",
  },
  captureRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#fff",
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  captureCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
  },
  bottomHint: {
    color: "rgba(255,255,255,0.6)",
    fontSize: FontSize.xs,
    marginTop: 8,
    textAlign: "center",
  },
  // Result screen
  resultHeader: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 12,
  },
  resultHeaderText: {
    color: "#fff",
    fontSize: FontSize["2xl"],
    fontWeight: "bold",
    textAlign: "center",
  },
  resultImageContainer: {
    backgroundColor: "#1f2937",
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
    alignItems: "center",
  },
  resultImageFrame: {
    width: 280,
    height: 280,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#374151",
  },
  resultImage: {
    width: "100%",
    height: "100%",
  },
  resultNameCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 2,
  },
  resultNameLabel: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    marginBottom: 8,
    letterSpacing: 1,
  },
  resultNameValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    textTransform: "capitalize",
  },
  confidenceBadge: {
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  confidenceBadgeText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: FontSize.base,
  },
  // Stat cards
  statCardBlue: {
    flex: 1,
    backgroundColor: "#1e3a5f",
    borderRadius: 20,
    padding: 20,
    marginRight: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#3b82f6",
  },
  statValueBlue: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#60a5fa",
    marginTop: 8,
  },
  statLabelBlue: {
    color: "#93c5fd",
    fontSize: FontSize.base,
    fontWeight: "500",
  },
  statCardOrange: {
    flex: 1,
    backgroundColor: "#431407",
    borderRadius: 20,
    padding: 20,
    marginLeft: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f97316",
  },
  statValueOrange: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fb923c",
    marginTop: 8,
  },
  statLabelOrange: {
    color: "#fdba74",
    fontSize: FontSize.base,
    fontWeight: "500",
  },
  // Add to meal buttons
  addMealBtn: {
    backgroundColor: Colors.primary[500],
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 12,
  },
  addMealBtnText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: FontSize.lg,
  },
  newAnalysisBtn: {
    backgroundColor: "transparent",
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    marginBottom: 24,
  },
  newAnalysisBtnText: {
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    fontWeight: "600",
    fontSize: FontSize.base,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 44 : 24,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    color: Colors.text.primary,
    marginBottom: 16,
    textAlign: "center",
  },
  mealTypeOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: Colors.neutral[50],
  },
  mealTypeOptionActive: {
    backgroundColor: Colors.primary[50],
    borderWidth: 2,
    borderColor: Colors.primary[500],
  },
  mealTypeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  mealTypeLabel: {
    flex: 1,
    fontSize: FontSize.base,
    fontWeight: "600",
    color: Colors.text.primary,
  },
  mealTypeLabelActive: {
    color: Colors.primary[700],
  },
  checkMark: {
    fontSize: 20,
    color: Colors.primary[500],
    fontWeight: "bold",
  },
  modalActions: {
    flexDirection: "row",
    marginTop: 16,
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  modalCancelText: {
    color: Colors.text.secondary,
    fontWeight: "600",
    fontSize: FontSize.base,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary[500],
    alignItems: "center",
  },
  modalConfirmText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: FontSize.base,
  },
});

export default ScanScreen;
