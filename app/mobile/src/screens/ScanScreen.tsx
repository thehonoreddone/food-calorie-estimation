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
import { logMeal, MealType, createCommunityPost } from "../services/firestoreService";
import { uploadCommunityImage } from "../services/storageService";
import { PredictionResponse, ImagePickerResult } from "../types";
import { useUser } from "../contexts/UserContext";
import { LinearGradient } from "expo-linear-gradient";
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
  const [isSharing, setIsSharing] = useState(false);

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
        skipProcessing: false,
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
      // Send directly to predict endpoint (segmentation is built into the backend pipeline)
      const result = await predictionService.predict(image);
      setFullResult(result);
      setFullImageUri(photo.uri);
      setMode("result");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: unknown } }; message?: string; code?: string };
      let errorMessage: string;

      if (axiosErr.code === 'ERR_NETWORK' || axiosErr.message === 'Network Error') {
        errorMessage = "Backend'e bağlanılamıyor. İnternet bağlantınızı ve backend sunucusunun çalıştığını kontrol edin.";
      } else if (axiosErr.code === 'ECONNABORTED' || axiosErr.message?.includes('timeout')) {
        errorMessage = "İstek zaman aşımına uğradı. Lütfen tekrar deneyin.";
      } else if (axiosErr.response?.status === 503) {
        errorMessage = "ML modeli henüz yüklenmedi. Birkaç saniye bekleyip tekrar deneyin.";
      } else if (axiosErr.response?.data?.detail) {
        errorMessage = String(axiosErr.response.data.detail);
      } else {
        errorMessage = "Analiz başarısız. Lütfen tekrar deneyin.";
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
        // Send directly to predict endpoint (segmentation is built into the backend pipeline)
        const prediction = await predictionService.predict(image);
        setFullResult(prediction);
        setFullImageUri(asset.uri);
        setMode("result");
        setIsAnalyzing(false);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: unknown } }; message?: string; code?: string };
      let errorMessage: string;

      if (axiosErr.code === 'ERR_NETWORK' || axiosErr.message === 'Network Error') {
        errorMessage = "Backend'e bağlanılamıyor. İnternet bağlantınızı kontrol edin.";
      } else if (axiosErr.code === 'ECONNABORTED' || axiosErr.message?.includes('timeout')) {
        errorMessage = "İstek zaman aşımına uğradı. Lütfen tekrar deneyin.";
      } else if (axiosErr.response?.status === 503) {
        errorMessage = "ML modeli henüz yüklenmedi. Birkaç saniye bekleyip tekrar deneyin.";
      } else if (axiosErr.response?.data?.detail) {
        errorMessage = String(axiosErr.response.data.detail);
      } else {
        errorMessage = "Analiz başarısız. Lütfen tekrar deneyin.";
      }
      setError(errorMessage);
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
      // Simple smart notification: if dinner is high-calorie, schedule advice for tomorrow morning
      if (selectedMealType === "dinner" && predToUse.estimated_calories > 800) {
        try {
          const ns = require("../services/notificationService") as typeof import("../services/notificationService");
          await ns.scheduleSmartAdvice({
            type: "heavy_dinner",
            calories: Math.round(predToUse.estimated_calories),
          });
        } catch (notifyErr) {
          console.log("Smart advice notification failed:", notifyErr);
        }
      }
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
    const displayName = fullResult.class_name.replace(/_/g, " ").replace(/-/g, " ");
    
    // Estimated macros (from calories)
    const estProtein = Math.round(fullResult.estimated_calories * 0.25 / 4);
    const estCarbs = Math.round(fullResult.estimated_calories * 0.45 / 4);
    const estFat = Math.round(fullResult.estimated_calories * 0.30 / 9);
    const maxMacro = Math.max(estProtein, estCarbs, estFat, 1);

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0f172a" }} edges={["top"]}>
        <ScrollView 
          style={{ flex: 1 }} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* ── Hero image with overlay ── */}
          <View style={styles.resultHero}>
            <Image source={{ uri: fullImageUri }} style={styles.resultHeroImage} resizeMode="cover" />
            <LinearGradient
              colors={["transparent", "rgba(15,23,42,0.85)", "#0f172a"]}
              style={styles.resultHeroGradient}
            />
            {/* Back button */}
            <TouchableOpacity onPress={handleReset} style={styles.resultBackBtn} activeOpacity={0.7}>
              <Text style={{ fontSize: 18, color: "#fff" }}>✕</Text>
            </TouchableOpacity>
            {/* Confidence pill on image */}
            <View style={[
              styles.resultConfPill,
              { backgroundColor: isGoodConfidence ? "rgba(16,185,129,0.9)" : "rgba(239,68,68,0.9)" },
            ]}>
              <Text style={styles.resultConfPillText}>%{confidencePercentage}</Text>
            </View>
          </View>

          <View style={styles.resultBody}>
            {/* ── Food name ── */}
            <Text style={styles.resultFoodName}>{displayName}</Text>
            <Text style={styles.resultFoodSub}>Tespit Edilen Yemek</Text>

            {/* ── Stats row ── */}
            <View style={styles.resultStatsRow}>
              <View style={styles.resultStatItem}>
                <View style={[styles.resultStatIcon, { backgroundColor: "rgba(59,130,246,0.15)" }]}>
                  <Text style={{ fontSize: 20 }}>⚖️</Text>
                </View>
                <Text style={styles.resultStatValue}>{fullResult.estimated_weight_grams.toFixed(0)}</Text>
                <Text style={styles.resultStatLabel}>gram</Text>
              </View>

              <View style={styles.resultStatDivider} />

              <View style={styles.resultStatItem}>
                <View style={[styles.resultStatIcon, { backgroundColor: "rgba(249,115,22,0.15)" }]}>
                  <Text style={{ fontSize: 20 }}>🔥</Text>
                </View>
                <Text style={[styles.resultStatValue, { color: "#fb923c" }]}>{fullResult.estimated_calories.toFixed(0)}</Text>
                <Text style={styles.resultStatLabel}>kcal</Text>
              </View>
            </View>

            {/* ── Macros ── */}
            <View style={styles.resultMacroCard}>
              <Text style={styles.resultMacroTitle}>Tahmini Besin Değerleri</Text>
              {/* Protein */}
              <View style={styles.resultMacroRow}>
                <View style={[styles.resultMacroDot, { backgroundColor: "#3b82f6" }]} />
                <Text style={styles.resultMacroName}>Protein</Text>
                <View style={styles.resultMacroBarBg}>
                  <View style={[styles.resultMacroBarFill, { backgroundColor: "#3b82f6", width: `${(estProtein / maxMacro) * 100}%` }]} />
                </View>
                <Text style={styles.resultMacroValue}>{estProtein}g</Text>
              </View>
              {/* Carbs */}
              <View style={styles.resultMacroRow}>
                <View style={[styles.resultMacroDot, { backgroundColor: "#f59e0b" }]} />
                <Text style={styles.resultMacroName}>Karbonhidrat</Text>
                <View style={styles.resultMacroBarBg}>
                  <View style={[styles.resultMacroBarFill, { backgroundColor: "#f59e0b", width: `${(estCarbs / maxMacro) * 100}%` }]} />
                </View>
                <Text style={styles.resultMacroValue}>{estCarbs}g</Text>
              </View>
              {/* Fat */}
              <View style={styles.resultMacroRow}>
                <View style={[styles.resultMacroDot, { backgroundColor: "#ef4444" }]} />
                <Text style={styles.resultMacroName}>Yağ</Text>
                <View style={styles.resultMacroBarBg}>
                  <View style={[styles.resultMacroBarFill, { backgroundColor: "#ef4444", width: `${(estFat / maxMacro) * 100}%` }]} />
                </View>
                <Text style={styles.resultMacroValue}>{estFat}g</Text>
              </View>
            </View>

            {/* ── Action buttons ── */}
            <TouchableOpacity
              onPress={() => setShowMealModal(true)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[Colors.primary[500], Colors.primary[600]] as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.resultPrimaryBtn}
              >
                <Text style={styles.resultPrimaryBtnText}>➕ Öğüne Ekle</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.resultSecondaryRow}>
              {/* Share */}
              <TouchableOpacity
                onPress={async () => {
                  if (!profile.uid || !fullResult) return;
                  setIsSharing(true);
                  try {
                    const foodName = fullResult.class_name.replace(/_/g, ' ').replace(/-/g, ' ');
                    let publicImageUrl: string | undefined;
                    if (fullImageUri) {
                      try {
                        publicImageUrl = await uploadCommunityImage(profile.uid, fullImageUri);
                      } catch (uploadErr) {
                        console.warn('Community image upload failed:', uploadErr);
                      }
                    }
                    await createCommunityPost(
                      profile.uid,
                      profile.name || 'Kullanıcı',
                      {
                        mealName: foodName,
                        calories: Math.round(fullResult.estimated_calories),
                        description: `${foodName} • ${fullResult.estimated_weight_grams.toFixed(0)}g`,
                        imageUrl: publicImageUrl,
                      }
                    );
                    Alert.alert('Paylaşıldı! 🎉', 'Yemeğin toplulukta paylaşıldı.\nTopluluk sekmesinden görebilirsin.');
                  } catch (err) {
                    Alert.alert('Hata', 'Paylaşım başarısız oldu.');
                  } finally {
                    setIsSharing(false);
                  }
                }}
                style={styles.resultSecondaryBtn}
                activeOpacity={0.8}
                disabled={isSharing}
              >
                <Text style={styles.resultSecondaryBtnText}>
                  {isSharing ? '⏳' : '👥'} Paylaş
                </Text>
              </TouchableOpacity>

              {/* New analysis */}
              <TouchableOpacity onPress={handleReset} style={styles.resultSecondaryBtn} activeOpacity={0.8}>
                <Text style={styles.resultSecondaryBtnText}>📷 Yeni Tara</Text>
              </TouchableOpacity>
            </View>
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
  // ─── Result screen (redesigned) ─────────────────────────────────────
  resultHero: {
    width: "100%" as const,
    height: 220,
    position: "relative" as const,
  },
  resultHeroImage: {
    width: "100%",
    height: "100%",
  },
  resultHeroGradient: {
    position: "absolute" as const,
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },
  resultBackBtn: {
    position: "absolute" as const,
    top: 12,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  resultConfPill: {
    position: "absolute" as const,
    top: 12,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  resultConfPillText: {
    color: "#fff",
    fontSize: FontSize.xs,
    fontWeight: "700" as const,
  },
  resultBody: {
    paddingHorizontal: 20,
    marginTop: -16,
  },
  resultFoodName: {
    fontSize: FontSize["2xl"],
    fontWeight: "700" as const,
    color: "#fff",
    textTransform: "capitalize" as const,
    marginBottom: 2,
  },
  resultFoodSub: {
    fontSize: FontSize.xs,
    color: "rgba(148,163,184,0.8)",
    marginBottom: 20,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  // Stats row
  resultStatsRow: {
    flexDirection: "row" as const,
    backgroundColor: "rgba(30,41,59,0.7)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  resultStatItem: {
    flex: 1,
    alignItems: "center" as const,
  },
  resultStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginBottom: 6,
  },
  resultStatValue: {
    fontSize: FontSize["2xl"],
    fontWeight: "700" as const,
    color: "#60a5fa",
  },
  resultStatLabel: {
    fontSize: FontSize.xs,
    color: "rgba(148,163,184,0.7)",
    fontWeight: "500" as const,
    marginTop: 1,
  },
  resultStatDivider: {
    width: 1,
    height: 48,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginHorizontal: 8,
  },
  // Macros
  resultMacroCard: {
    backgroundColor: "rgba(30,41,59,0.7)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  resultMacroTitle: {
    fontSize: FontSize.sm,
    fontWeight: "600" as const,
    color: "rgba(148,163,184,0.9)",
    marginBottom: 12,
  },
  resultMacroRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 10,
  },
  resultMacroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  resultMacroName: {
    width: 85,
    fontSize: FontSize.sm,
    color: "rgba(226,232,240,0.85)",
    fontWeight: "500" as const,
  },
  resultMacroBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginRight: 10,
    overflow: "hidden" as const,
  },
  resultMacroBarFill: {
    height: "100%" as const,
    borderRadius: 3,
  },
  resultMacroValue: {
    width: 36,
    fontSize: FontSize.sm,
    color: "#e2e8f0",
    fontWeight: "600" as const,
    textAlign: "right" as const,
  },
  // Action buttons
  resultPrimaryBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center" as const,
    marginBottom: 10,
  },
  resultPrimaryBtnText: {
    color: "#fff",
    fontSize: FontSize.base,
    fontWeight: "700" as const,
  },
  resultSecondaryRow: {
    flexDirection: "row" as const,
    gap: 10,
  },
  resultSecondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(30,41,59,0.5)",
    alignItems: "center" as const,
  },
  resultSecondaryBtnText: {
    color: "rgba(226,232,240,0.85)",
    fontSize: FontSize.sm,
    fontWeight: "600" as const,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end" as const,
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
    fontWeight: "700" as const,
    color: Colors.text.primary,
    marginBottom: 16,
    textAlign: "center" as const,
  },
  mealTypeOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
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
    fontWeight: "600" as const,
    color: Colors.text.primary,
  },
  mealTypeLabelActive: {
    color: Colors.primary[700],
  },
  checkMark: {
    fontSize: 20,
    color: Colors.primary[500],
    fontWeight: "bold" as const,
  },
  modalActions: {
    flexDirection: "row" as const,
    marginTop: 16,
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center" as const,
  },
  modalCancelText: {
    color: Colors.text.secondary,
    fontWeight: "600" as const,
    fontSize: FontSize.base,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary[500],
    alignItems: "center" as const,
  },
  modalConfirmText: {
    color: "#fff",
    fontWeight: "700" as const,
    fontSize: FontSize.base,
  },
});

export default ScanScreen;

