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
  KeyboardAvoidingView,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions, CameraType } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import Animated, {
  FadeIn,
  FadeInUp,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { predictionService } from "../services";
import { logMeal, MealType, createCommunityPost, recordMealLog } from "../services/firestoreService";
import { uploadCommunityImage } from "../services/storageService";
import { PredictionResponse, ImagePickerResult } from "../types";
import { useUser } from "../contexts/UserContext";
import { useTheme } from "../contexts/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, FontSize, Spacing, BorderRadius } from "../constants/theme";
import { formatFoodWeight, gramsToOz, type UnitSystem } from "../utils/unitConversion";
import Slider from "@react-native-community/slider";
import { barcodeService, BarcodeResult } from "../services/barcodeService";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type ScanMode = "camera" | "barcode" | "result" | "loading" | "saved";

// ─── Neon scan color ────────────────────────────────────────────────────────
const SCAN_COLOR = "#A3E635";      // neon lime
const SCAN_CYAN  = "#22D3EE";

// ─── Meal type selector data ─────────────────────────────────────────────────
const MEAL_TYPES: { key: MealType; label: string; icon: string }[] = [
  { key: "breakfast", label: "Kahvaltı",      icon: "🌅" },
  { key: "lunch",     label: "Öğle Yemeği",   icon: "☀️" },
  { key: "dinner",    label: "Akşam Yemeği",  icon: "🌆" },
  { key: "snack",     label: "Aperatif",       icon: "🍿" },
];

// ─── Date helpers ────────────────────────────────────────────────────────────
function fmtDate(d: Date) { return d.toISOString().split("T")[0]; }
function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today     = new Date();
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow  = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const months = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
  const dateNum   = `${d.getDate()} ${months[d.getMonth()]}`;
  if (fmtDate(d) === fmtDate(today))     return `${dateNum} • Bugün`;
  if (fmtDate(d) === fmtDate(yesterday)) return `${dateNum} • Dün`;
  if (fmtDate(d) === fmtDate(tomorrow))  return `${dateNum} • Yarın`;
  return dateNum;
}

// ─── Animated Scanning Brackets ─────────────────────────────────────────────
const ScanningBrackets: React.FC<{ active: boolean }> = ({ active }) => {
  const scanLine = useSharedValue(0);
  const pulse    = useSharedValue(1);
  const rotate   = useSharedValue(0);
  const bracketOpacity = useSharedValue(0);

  useEffect(() => {
    bracketOpacity.value = withTiming(1, { duration: 600 });
    if (active) {
      scanLine.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000 }),
          withTiming(1,    { duration: 1000 }),
        ),
        -1,
        true,
      );
      rotate.value = withRepeat(
        withTiming(360, { duration: 8000, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      scanLine.value = withTiming(0, { duration: 400 });
      pulse.value    = withTiming(1, { duration: 400 });
    }
  }, [active]);

  const scanLineStyle = useAnimatedStyle(() => ({
    top: `${scanLine.value * 100}%` as any,
    opacity: active ? interpolate(scanLine.value, [0, 0.05, 0.95, 1], [0, 1, 1, 0]) : 0,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const crosshairStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  const BRACKET = 260;

  return (
    <View style={styles.bracketsContainer} pointerEvents="none">
      <Animated.View style={[styles.bracketBox, { width: BRACKET, height: BRACKET }, pulseStyle]}>
        {/* Corner brackets */}
        {[
          { t: 0,           l: 0,           r: undefined, b: undefined, rot: "0deg"   },
          { t: 0,           r: 0,           l: undefined, b: undefined, rot: "90deg"  },
          { b: 0,           r: 0,           l: undefined, t: undefined, rot: "180deg" },
          { b: 0,           l: 0,           r: undefined, t: undefined, rot: "270deg" },
        ].map((pos, i) => (
          <View
            key={i}
            style={[
              styles.corner,
              { top: pos.t, bottom: pos.b, left: pos.l, right: pos.r },
            ]}
          >
            {/* Outer bracket */}
            <View style={[styles.cornerOuter, { transform: [{ rotate: pos.rot }] }]}>
              <View style={[styles.cornerH, { backgroundColor: SCAN_COLOR }]} />
              <View style={[styles.cornerV, { backgroundColor: SCAN_COLOR }]} />
            </View>
            {/* Inner bracket */}
            <View style={[styles.cornerInner, { transform: [{ rotate: pos.rot }] }]}>
              <View style={[styles.cornerHInner, { backgroundColor: SCAN_CYAN }]} />
              <View style={[styles.cornerVInner, { backgroundColor: SCAN_CYAN }]} />
            </View>
          </View>
        ))}

        {/* Scanning line */}
        <Animated.View style={[styles.scanLine, scanLineStyle]} pointerEvents="none">
          <LinearGradient
            colors={["transparent", SCAN_COLOR, "transparent"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ flex: 1 }}
          />
        </Animated.View>

        {/* Center crosshair */}
        <View style={styles.crosshairWrap}>
          <Animated.View style={[styles.crosshairRing, crosshairStyle]}>
            <View style={[styles.crosshairCircle, { borderColor: `${SCAN_COLOR}66` }]} />
            <View style={[styles.crosshairLineH, { backgroundColor: SCAN_COLOR }]} />
            <View style={[styles.crosshairLineV, { backgroundColor: SCAN_COLOR }]} />
          </Animated.View>
          <Animated.View
            style={[styles.crosshairDot, { backgroundColor: SCAN_COLOR }]}
            entering={ZoomIn.duration(400)}
          />
        </View>

        {/* Pulsing border */}
        <Animated.View style={[styles.pulseBorder, { borderColor: `${SCAN_COLOR}4D` }, pulseStyle]} />
      </Animated.View>
    </View>
  );
};

// ─── HUD Overlay ─────────────────────────────────────────────────────────────
const HudOverlay: React.FC<{ active: boolean; detecting: boolean }> = ({ active, detecting }) => {
  const blink = useSharedValue(1);
  useEffect(() => {
    if (active) {
      blink.value = withRepeat(
        withSequence(withTiming(0, { duration: 500 }), withTiming(1, { duration: 500 })),
        -1, true,
      );
    } else {
      blink.value = withTiming(1);
    }
  }, [active]);

  const blinkStyle = useAnimatedStyle(() => ({ opacity: blink.value }));

  return (
    <>
      {/* Top HUD status bar */}
      <Animated.View entering={FadeIn.duration(600).delay(300)} style={styles.hudTopBar}>
        <View style={styles.hudLeft}>
          <View style={[styles.hudDot, { backgroundColor: active ? SCAN_COLOR : "#555" }]} />
          <Text style={[styles.hudMono, { color: active ? SCAN_COLOR : "#555" }]}>
            {active ? "AI AKTİF" : "HAZIR"}
          </Text>
        </View>
        <Animated.View style={blinkStyle}>
          <Text style={[styles.hudMono, { color: active ? SCAN_COLOR : "#666" }]}>
            {detecting ? "ANALİZ EDİLİYOR..." : active ? "TARAMA DEVAM EDİYOR..." : "KAMERA HAZIR"}
          </Text>
        </Animated.View>
        <View style={styles.hudRight}>
          <Text style={[styles.hudMono, { color: "#666" }]}>NUTRİNO</Text>
        </View>
      </Animated.View>

      {/* Grid overlay */}
      <View style={styles.gridOverlay} pointerEvents="none" />

      {/* Vignette */}
      <View style={styles.vignette} pointerEvents="none" />
    </>
  );
};

// ─── Main ScanScreen ─────────────────────────────────────────────────────────
export const ScanScreen: React.FC = () => {
  // Camera state
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing]  = useState<CameraType>("back");
  const [mode,   setMode]    = useState<ScanMode>("camera");

  // Detection state
  const [liveResult,       setLiveResult]       = useState<PredictionResponse | null>(null);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [isDetecting,      setIsDetecting]      = useState(false);
  const [autoDetect,       setAutoDetect]       = useState(false);
  const autoDetectRef  = useRef(false);
  const detectingRef   = useRef(false);
  const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  // Full result
  const [fullResult,   setFullResult]   = useState<PredictionResponse | null>(null);
  const [fullImageUri, setFullImageUri] = useState<string | null>(null);
  const [isAnalyzing,  setIsAnalyzing]  = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  // Portion size adjustment
  const [portionGrams, setPortionGrams] = useState<number | null>(null);  // null = use AI value

  // Meal modal
  const [showMealModal,    setShowMealModal]    = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType>("lunch");
  const [selectedDate,     setSelectedDate]     = useState(fmtDate(new Date()));
  const [isSharing,        setIsSharing]        = useState(false);
  const [savedFoodName,    setSavedFoodName]    = useState("");

  // Share modal
  const [showShareModal,   setShowShareModal]   = useState(false);
  const [shareDescription, setShareDescription] = useState("");
  const [shareFoodName,    setShareFoodName]    = useState("");

  const { profile } = useUser();
  const { settings } = useTheme();
  const language = settings.language ?? 'tr';
  const unitSystem: UnitSystem = settings.unitSystem ?? 'metric';

  // Barcode scanning state
  const [barcodeResult,  setBarcodeResult]  = useState<BarcodeResult | null>(null);
  const [isBarcodeLoading, setIsBarcodeLoading] = useState(false);
  const barcodeScannedRef = useRef(false); // prevent duplicate scans

  // Auto-select meal type by time
  useEffect(() => {
    const hour = new Date().getHours();
    if      (hour >= 5  && hour < 11) setSelectedMealType("breakfast");
    else if (hour >= 11 && hour < 15) setSelectedMealType("lunch");
    else if (hour >= 15 && hour < 21) setSelectedMealType("dinner");
    else                              setSelectedMealType("snack");
  }, []);

  // Auto-detect loop
  useEffect(() => {
    autoDetectRef.current = autoDetect;
    if (autoDetect && mode === "camera") startAutoDetection();
    else stopAutoDetection();
    return () => stopAutoDetection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDetect, mode]);

  const startAutoDetection = useCallback(() => {
    if (intervalRef.current) return;
    captureAndDetect();
    intervalRef.current = setInterval(() => {
      if (autoDetectRef.current && !detectingRef.current) captureAndDetect();
    }, 3000);
  }, []);

  const stopAutoDetection = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  // Quick capture for live overlay
  const captureAndDetect = async () => {
    if (!cameraRef.current || detectingRef.current) return;
    detectingRef.current = true;
    setIsDetecting(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.4, skipProcessing: false });
      if (!photo) { detectingRef.current = false; setIsDetecting(false); return; }
      const image: ImagePickerResult = { uri: photo.uri, type: "image/jpeg", name: `frame_${Date.now()}.jpg` };
      const result = await predictionService.predict(image, language);
      setLiveResult(result);
      setCapturedImageUri(photo.uri);
    } catch (err) {
      console.log("Auto-detect error (non-critical):", err);
    } finally {
      detectingRef.current = false;
      setIsDetecting(false);
    }
  };

  // Manual capture
  const handleCapture = async () => {
    if (!cameraRef.current) return;
    setAutoDetect(false);
    setMode("loading");
    setIsAnalyzing(true);
    setError(null);
    try {
      let photo;
      try {
        photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      } catch (camErr) {
        setError("Kamera fotoğraf çekemedi. Kamera izinlerini kontrol edin.");
        setMode("camera"); setIsAnalyzing(false); return;
      }
      if (!photo) { setMode("camera"); setIsAnalyzing(false); return; }
      const image: ImagePickerResult = { uri: photo.uri, type: "image/jpeg", name: `capture_${Date.now()}.jpg` };
      const result = await predictionService.predict(image, language);
      setFullResult(result);
      setPortionGrams(null); // reset portion to AI value on new scan
      setFullImageUri(photo.uri);
      setMode("result");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: unknown } }; message?: string; code?: string };
      let errorMessage: string;
      if (axiosErr.code === "ERR_NETWORK" || axiosErr.message?.includes("Network"))
        errorMessage = "Backend'e bağlanılamıyor.\nAPI: " + process.env.EXPO_PUBLIC_API_URL;
      else if (axiosErr.code === "ECONNABORTED" || axiosErr.message?.includes("timeout"))
        errorMessage = "İstek zaman aşımına uğradı. Lütfen tekrar deneyin.";
      else if (axiosErr.response?.status === 503)
        errorMessage = "ML modeli henüz yüklenmedi. Birkaç saniye bekleyip tekrar deneyin.";
      else if (axiosErr.response?.status === 500)
        errorMessage = "Sunucu hatası. Backend loglarını kontrol edin.";
      else if (axiosErr.response?.data?.detail)
        errorMessage = String(axiosErr.response.data.detail);
      else
        errorMessage = `Analiz başarısız: ${axiosErr.message || "Bilinmeyen hata"}`;
      setError(errorMessage);
      setMode("camera");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Gallery pick
  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: false, quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setAutoDetect(false);
        setMode("loading");
        setIsAnalyzing(true);
        setError(null);
        const image: ImagePickerResult = { uri: asset.uri, type: asset.mimeType || "image/jpeg", name: asset.fileName || `gallery_${Date.now()}.jpg` };
        const prediction = await predictionService.predict(image, language);
        setFullResult(prediction);
        setPortionGrams(null); // reset portion to AI value
        setFullImageUri(asset.uri);
        setMode("result");
        setIsAnalyzing(false);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: unknown } }; message?: string; code?: string };
      let errorMessage: string;
      if (axiosErr.code === "ERR_NETWORK" || axiosErr.message?.includes("Network"))
        errorMessage = "Backend'e bağlanılamıyor.\nAPI: " + process.env.EXPO_PUBLIC_API_URL;
      else if (axiosErr.code === "ECONNABORTED" || axiosErr.message?.includes("timeout"))
        errorMessage = "İstek zaman aşımına uğradı.";
      else if (axiosErr.response?.status === 503)
        errorMessage = "ML modeli henüz yüklenmedi.";
      else if (axiosErr.response?.status === 500)
        errorMessage = "Sunucu hatası.";
      else if (axiosErr.response?.data?.detail)
        errorMessage = String(axiosErr.response.data.detail);
      else
        errorMessage = `Analiz başarısız: ${axiosErr.message || "Bilinmeyen hata"}`;
      setError(errorMessage);
      setMode("camera");
      setIsAnalyzing(false);
    }
  };

  // Add to meal
  const handleAddToMeal = async () => {
    const predToUse  = fullResult || liveResult;
    const imageToUse = fullImageUri || capturedImageUri;
    if (!predToUse || !profile.uid) { Alert.alert("Hata", "Giriş yapmadan öğün eklenemez."); return; }
    try {
      // Use real macros from Gemini if available, else estimate — scaled by portion
      const aiGramsForLog = predToUse.estimated_weight_grams;
      const effectiveGramsForLog = portionGrams ?? aiGramsForLog;
      const ratioForLog = aiGramsForLog > 0 ? effectiveGramsForLog / aiGramsForLog : 1;
      const adjustedCalForLog = Math.round(predToUse.estimated_calories * ratioForLog);

      const protein = Math.round((predToUse.macros
        ? predToUse.macros.protein
        : predToUse.estimated_calories * 0.25 / 4) * ratioForLog);
      const carbs = Math.round((predToUse.macros
        ? predToUse.macros.carbs
        : predToUse.estimated_calories * 0.45 / 4) * ratioForLog);
      const fat = Math.round((predToUse.macros
        ? predToUse.macros.fat
        : predToUse.estimated_calories * 0.30 / 9) * ratioForLog);
      const fiber = Math.round((predToUse.macros?.fiber ?? 0) * ratioForLog);
      // Display localised name: prefer food_name_local (user's lang), fallback to food_name_tr
      const foodName = predToUse.food_name_local
        || predToUse.food_name_tr
        || predToUse.class_name.replace(/_/g, " ").replace(/-/g, " ");
      await logMeal(profile.uid, {
        date: selectedDate, mealType: selectedMealType,
        foodName, calories: adjustedCalForLog,
        protein, carbs, fat,
        fiber: fiber > 0 ? fiber : undefined,
        weight: Math.round(effectiveGramsForLog),
        confidence: predToUse.confidence,
        imageUri: imageToUse || undefined,
      });
      try { await recordMealLog(profile.uid); } catch {}
      setSavedFoodName(foodName);
      setShowMealModal(false);
      setMode("saved");
      if (selectedMealType === "dinner" && predToUse.estimated_calories > 800) {
        try {
          const ns = require("../services/notificationService") as typeof import("../services/notificationService");
          await ns.scheduleSmartAdvice({ type: "heavy_dinner", calories: Math.round(predToUse.estimated_calories) });
        } catch {}
      }
    } catch {
      Alert.alert("Hata", "Öğün kaydedilemedi. Tekrar deneyin.");
    }
  };

  const getMealLabel = (mt: MealType) => MEAL_TYPES.find((m) => m.key === mt)?.label || mt;
  const shiftDate = (days: number) => { const d = new Date(selectedDate); d.setDate(d.getDate() + days); setSelectedDate(fmtDate(d)); };

  // ─── Barcode Handler ─────────────────────────────────────────────────────
  const handleBarcodeScanned = useCallback(async ({ data }: { data: string }) => {
    if (barcodeScannedRef.current || isBarcodeLoading) return;
    barcodeScannedRef.current = true;
    setIsBarcodeLoading(true);

    try {
      const result = await barcodeService.lookup(data);
      if (!result) {
        Alert.alert(
          '🔍 Ürün Bulunamadı',
          `"${data}" barkoduna ait ürün veritabanında yok. Fotoğrafla tarayabilirsiniz.`,
          [{ text: 'Tamam', onPress: () => { barcodeScannedRef.current = false; } }]
        );
        setIsBarcodeLoading(false);
        return;
      }
      setBarcodeResult(result);
      const prediction = barcodeService.toPrediction(result);
      setFullResult(prediction);
      setPortionGrams(null);
      setFullImageUri(result.imageFront ?? '');
      setMode('result');
    } catch (err) {
      Alert.alert('Hata', 'Barkod okunamadı. Tekrar deneyin.');
      barcodeScannedRef.current = false;
    } finally {
      setIsBarcodeLoading(false);
    }
  }, [isBarcodeLoading]);

  const handleReset = () => {
    setMode('camera'); setFullResult(null); setFullImageUri(null);
    setLiveResult(null); setCapturedImageUri(null); setError(null);
    setSelectedDate(fmtDate(new Date()));
    setBarcodeResult(null);
    barcodeScannedRef.current = false;
  };

  // ─── Permission ─────────────────────────────────────────────────────────
  if (!permission) return <SafeAreaView style={styles.centered}><ActivityIndicator size="large" color={SCAN_COLOR} /></SafeAreaView>;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centered}>
        <LinearGradient colors={[Colors.background, Colors.backgroundAlt]} style={StyleSheet.absoluteFill} />
        <Animated.View entering={ZoomIn.duration(700)} style={styles.permissionCard}>
          <View style={styles.permissionIconRing}>
            <Text style={styles.permissionIconEmoji}>📷</Text>
          </View>
          <Text style={styles.permissionTitle}>Kamera İzni Gerekli</Text>
          <Text style={styles.permissionDesc}>Yemekleri AI ile taramak için kamera erişimine ihtiyacımız var</Text>
          <TouchableOpacity onPress={requestPermission} activeOpacity={0.8}>
            <LinearGradient colors={[SCAN_COLOR, "#65a30d"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.permissionBtn}>
              <Text style={styles.permissionBtnText}>İzin Ver</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ─── Barcode Scanner Screen ───────────────────────────────────────────────
  if (mode === 'barcode') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['top']}>
        {/* Camera with barcode scanning */}
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr', 'code128', 'code39'] }}
          onBarcodeScanned={isBarcodeLoading ? undefined : handleBarcodeScanned}
        />

        {/* Dark vignette */}
        <View style={styles.barcodeVignette} pointerEvents="none" />

        {/* Top bar */}
        <View style={styles.barcodeTopBar}>
          <TouchableOpacity onPress={handleReset} style={styles.barcodeBackBtn}>
            <Text style={styles.barcodeBackIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.barcodeTitle}>🔍 Barkod Tara</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Scan frame */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.barcodeScanFrame}>
          {/* Corner brackets */}
          <View style={[styles.barcodeCorner, { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 }]} />
          <View style={[styles.barcodeCorner, { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 }]} />
          <View style={[styles.barcodeCorner, { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 }]} />
          <View style={[styles.barcodeCorner, { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 }]} />

          {isBarcodeLoading ? (
            <View style={styles.barcodeLoadingOverlay}>
              <ActivityIndicator size="large" color="#2DD4A0" />
              <Text style={styles.barcodeLoadingText}>Ürün aranıyor...</Text>
            </View>
          ) : (
            <View style={styles.barcodeScanLine} />
          )}
        </Animated.View>

        {/* Instruction */}
        <Animated.View entering={FadeInUp.delay(300).duration(500)} style={styles.barcodeInstruction}>
          <Text style={styles.barcodeInstructionText}>
            📦 Ürün barkodunu çerçeveye hizalayın
          </Text>
          <Text style={styles.barcodeInstructionSub}>
            EAN-13 · EAN-8 · UPC · QR desteklenir
          </Text>
        </Animated.View>

        {/* Or AI scan button */}
        <View style={styles.barcodeBottomBar}>
          <TouchableOpacity
            onPress={() => { barcodeScannedRef.current = false; setMode('camera'); }}
            style={styles.barcodeSwitchBtn}
          >
            <Text style={styles.barcodeSwitchText}>📷 Fotoğrafla Tara</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Loading ─────────────────────────────────────────────────────────────
  if (mode === "loading") {
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <LinearGradient colors={["#000", Colors.background]} style={StyleSheet.absoluteFill} />
        {/* Scanning brackets even for loading */}
        <ScanningBrackets active={true} />
        <HudOverlay active={true} detecting={true} />
        <SafeAreaView style={styles.loadingCenter}>
          <Animated.View entering={ZoomIn.duration(600)} style={styles.loadingCard}>
            <ActivityIndicator size="large" color={SCAN_COLOR} />
            <Text style={styles.loadingTitle}>Yemek Analiz Ediliyor</Text>
            <Text style={styles.loadingDesc}>Yapay zeka çalışıyor{"\n"}Bu biraz zaman alabilir</Text>
            <TouchableOpacity onPress={handleReset} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>İptal Et</Text>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  // ─── Saved ───────────────────────────────────────────────────────────────
  if (mode === "saved") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={["top"]}>
        <LinearGradient colors={[Colors.background, Colors.backgroundAlt]} style={StyleSheet.absoluteFill} />
        <View style={styles.savedContainer}>
          <Animated.View entering={ZoomIn.duration(500).springify()} style={styles.savedIconWrap}>
            <LinearGradient colors={[SCAN_COLOR, "#65a30d"]} style={styles.savedIconGrad}>
              <Text style={styles.savedIcon}>✓</Text>
            </LinearGradient>
          </Animated.View>
          <Animated.Text entering={FadeInUp.delay(200).duration(400)} style={styles.savedTitle}>
            Kaydedildi!
          </Animated.Text>
          <Animated.View entering={FadeInUp.delay(350).duration(400)} style={styles.savedPill}>
            <Text style={styles.savedPillText}>{savedFoodName}</Text>
          </Animated.View>
          <Animated.Text entering={FadeInUp.delay(400).duration(400)} style={styles.savedSub}>
            {getMealLabel(selectedMealType)} • {formatDateLabel(selectedDate)}
          </Animated.Text>

          <Animated.View entering={FadeInUp.delay(500).duration(400)} style={styles.savedActions}>
            <TouchableOpacity onPress={() => { router.push("/(tabs)"); handleReset(); }} activeOpacity={0.8} style={styles.savedPrimaryBtn}>
              <LinearGradient colors={[SCAN_COLOR, "#65a30d"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.savedPrimaryBtnInner}>
                <Text style={styles.savedPrimaryBtnText}>Ana Sayfaya Git</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleReset} activeOpacity={0.8} style={styles.savedSecondaryBtn}>
              <Text style={styles.savedSecondaryBtnText}>📷 Yeni Tara</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Result Screen (Premium v0 Design) ───────────────────────────────────────
  if (mode === "result" && fullResult && fullImageUri) {
    // Portion-adjusted values: user can override AI estimate
    const aiGrams = fullResult.estimated_weight_grams;
    const effectiveGrams = portionGrams ?? aiGrams;
    const portionRatio   = aiGrams > 0 ? effectiveGrams / aiGrams : 1;

    const adjustedCalories = Math.round(fullResult.estimated_calories * portionRatio);
    const adjustedCalMin   = fullResult.calories_min  != null ? Math.round(fullResult.calories_min  * portionRatio) : null;
    const adjustedCalMax   = fullResult.calories_max  != null ? Math.round(fullResult.calories_max  * portionRatio) : null;

    // Use real macros from Gemini if available, else estimate — then scale
    const hasMacros = !!fullResult.macros;
    const estProtein = Math.round((hasMacros ? fullResult.macros!.protein : fullResult.estimated_calories * 0.25 / 4) * portionRatio);
    const estCarbs   = Math.round((hasMacros ? fullResult.macros!.carbs   : fullResult.estimated_calories * 0.45 / 4) * portionRatio);
    const estFat     = Math.round((hasMacros ? fullResult.macros!.fat     : fullResult.estimated_calories * 0.30 / 9) * portionRatio);
    const estFiber   = Math.round((hasMacros ? fullResult.macros!.fiber   : aiGrams * 0.02) * portionRatio);

    // Show localised name (user's language) > Turkish name > English class name
    const displayName = fullResult.food_name_local
      || fullResult.food_name_tr
      || fullResult.class_name.replace(/_/g, " ").replace(/-/g, " ");
    // Keep English slug for community share
    const displayNameEn = fullResult.class_name.replace(/_/g, " ").replace(/-/g, " ");

    // Format food weight in user's unit system
    const foodWeightDisplay = formatFoodWeight(effectiveGrams, unitSystem);

    const isGeminiSource = fullResult.source === "gemini";
    const dailyCalGoal = 2000;
    const calPercent   = Math.round(Math.min((adjustedCalories / dailyCalGoal) * 100, 100));
    const confidencePct = Math.round((fullResult.confidence || 0.9) * 100);

    // Macro max for bar widths
    const macroMax = Math.max(estProtein * 4, estCarbs * 4, estFat * 9, 50);
    const macros = [
      { label: "Protein", value: estProtein, unit: "g", color: "#16a34a", barPct: (estProtein * 4) / macroMax },
      { label: "Karb",    value: estCarbs,   unit: "g", color: "#f59e0b", barPct: (estCarbs * 4)   / macroMax },
      { label: "Yağ",     value: estFat,     unit: "g", color: "#3b82f6", barPct: (estFat * 9)     / macroMax },
    ];

    // Slider display range depends on unit system
    const sliderMin = 10;
    const sliderMax = 800;
    const sliderStep = 5;

    return (
      <SafeAreaView style={styles.premiumResultContainer} edges={["top"]}>
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* ── Hero Image ─────────────────────────────────── */}
          <View style={styles.premiumHeroWrap}>
            <Image
              source={{ uri: fullImageUri }}
              style={styles.premiumHeroImage}
              resizeMode="cover"
            />
            {/* Soft gradient to blend into card below */}
            <LinearGradient
              colors={["transparent", "rgba(249,249,247,0.6)", "#f9f9f7"]}
              style={styles.premiumHeroGrad}
            />

            {/* Top action buttons */}
            <SafeAreaView edges={["top"]} style={StyleSheet.absoluteFill} pointerEvents="box-none">
              <View style={styles.premiumTopBar}>
                <TouchableOpacity onPress={handleReset} style={styles.premiumTopBtn} activeOpacity={0.7}>
                  <Text style={styles.premiumTopBtnIcon}>←</Text>
                </TouchableOpacity>
                <View style={styles.premiumTopRight}>
                  <TouchableOpacity
                    style={styles.premiumTopBtn}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (!profile.uid || !fullResult) return;
                      const fn = fullResult.class_name.replace(/_/g, " ").replace(/-/g, " ");
                      setShareFoodName(fn); setShareDescription(""); setShowShareModal(true);
                    }}
                  >
                    <Text style={styles.premiumTopBtnIcon}>↗</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </SafeAreaView>

            {/* AI Analysis Complete badge + Source badge */}
            <Animated.View entering={FadeIn.delay(200).duration(400)} style={styles.premiumAiBadgeWrap}>
              <View style={styles.premiumAiBadge}>
                <View style={styles.premiumAiDot} />
                <Text style={styles.premiumAiBadgeText}>
                  {fullResult.source === 'barcode' ? 'Barkod Veritabanı' : 'AI Analiz Tamamlandı'}
                </Text>
              </View>
              {/* Source badge */}
              <View style={[
                styles.sourceBadge,
                fullResult.source === 'barcode'  ? styles.sourceBadgeBarcode :
                isGeminiSource                   ? styles.sourceBadgeGemini  :
                                                   styles.sourceBadgeModel,
              ]}>
                <Text style={styles.sourceBadgeText}>
                  {fullResult.source === 'barcode' ? '📦 Barkod' : isGeminiSource ? '✨ Gemini' : '🤖 Model'}
                </Text>
              </View>
            </Animated.View>
          </View>

          {/* ── Floating Card ──────────────────────────────── */}
          <Animated.View entering={FadeInUp.delay(150).duration(500)} style={styles.premiumCard}>
            {/* Handle */}
            <View style={styles.premiumHandle} />

            {/* Food name + confidence */}
            <View style={styles.premiumFoodRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.premiumFoodName}>{displayName}</Text>
                {fullResult.food_name_tr && displayNameEn !== displayName && (
                  <Text style={styles.premiumFoodSlug}>{displayNameEn}</Text>
                )}
                {fullResult.description ? (
                  <Text style={styles.premiumFoodSub} numberOfLines={2}>{fullResult.description}</Text>
                ) : (
                  <Text style={styles.premiumFoodSub}>AI Tarafından Tespit Edildi</Text>
                )}
              </View>
              <View style={styles.premiumConfidenceBadge}>
                <Text style={styles.premiumConfidenceIcon}>✦</Text>
                <Text style={styles.premiumConfidenceText}>{confidencePct}% Doğruluk</Text>
              </View>
            </View>

            {/* Health Points badge */}
            <View style={styles.premiumHealthBadgeWrap}>
              <View style={styles.premiumHealthBadge}>
                <Text style={styles.premiumHealthIcon}>⚡</Text>
                <Text style={styles.premiumHealthText}>+50 Sağlık Puanı</Text>
              </View>
            </View>

            {/* ── 3-column Nutrient Pills ─────────────────── */}
            <View style={styles.premiumPillsRow}>
              {/* Calories */}
              <View style={styles.premiumPill}>
                <View style={[styles.premiumPillIcon, { backgroundColor: "#fee2e2" }]}>
                  <Text style={{ fontSize: 18 }}>🔥</Text>
                </View>
                <Text style={styles.premiumPillLabel}>Kalori</Text>
                <Text style={styles.premiumPillValue}>{Math.round(fullResult.estimated_calories)}</Text>
                <Text style={styles.premiumPillUnit}>kcal</Text>
              </View>
              {/* Fiber */}
              <View style={styles.premiumPill}>
                <View style={[styles.premiumPillIcon, { backgroundColor: "#d1fae5" }]}>
                  <Text style={{ fontSize: 18 }}>💧</Text>
                </View>
                <Text style={styles.premiumPillLabel}>Fiber</Text>
                <Text style={styles.premiumPillValue}>{estFiber}</Text>
                <Text style={styles.premiumPillUnit}>g</Text>
              </View>
              {/* Weight */}
              <View style={styles.premiumPill}>
                <View style={[styles.premiumPillIcon, { backgroundColor: "#dbeafe" }]}>
                  <Text style={{ fontSize: 18 }}>⚖️</Text>
                </View>
                <Text style={styles.premiumPillLabel}>Ağırlık</Text>
                <Text style={styles.premiumPillValue}>{foodWeightDisplay.replace(/[^0-9.]/g, '')}</Text>
                <Text style={styles.premiumPillUnit}>{unitSystem === 'imperial' ? 'oz' : 'g'}</Text>
              </View>
            </View>

            {/* ── Calorie range adjusted ───────────────────── */}
            {adjustedCalMin != null && adjustedCalMax != null && (
              <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.calorieRangeRow}>
                <Text style={styles.calorieRangeLabel}>Aralık:</Text>
                <Text style={styles.calorieRangeValue}>
                  {adjustedCalMin} – {adjustedCalMax} kcal
                </Text>
                {hasMacros && (
                  <View style={styles.realMacroBadge}>
                    <Text style={styles.realMacroBadgeText}>✓ Gerçek Makrolar</Text>
                  </View>
                )}
              </Animated.View>
            )}

            {/* ── Portion Slider ───────────────────────────── */}
            <Animated.View entering={FadeInUp.delay(250).duration(400)} style={styles.portionCard}>
              <View style={styles.portionHeader}>
                <Text style={styles.portionTitle}>⚖️ Porsiyon Ayarla</Text>
                <View style={styles.portionBadge}>
                  <Text style={styles.portionBadgeText}>{foodWeightDisplay}</Text>
                </View>
              </View>
              <Slider
                style={{ width: "100%", height: 36, marginVertical: 4 }}
                minimumValue={sliderMin}
                maximumValue={sliderMax}
                step={sliderStep}
                value={portionGrams ?? aiGrams}
                onValueChange={(v) => setPortionGrams(Math.round(v / sliderStep) * sliderStep)}
                minimumTrackTintColor="#2DD4A0"
                maximumTrackTintColor="rgba(0,0,0,0.15)"
                thumbTintColor="#2DD4A0"
              />
              <View style={styles.portionRangeRow}>
                <Text style={styles.portionRangeText}>{sliderMin}g</Text>
                <TouchableOpacity onPress={() => setPortionGrams(null)} style={styles.portionResetBtn}>
                  <Text style={styles.portionResetText}>AI Tahminine Dön</Text>
                </TouchableOpacity>
                <Text style={styles.portionRangeText}>{sliderMax}g</Text>
              </View>
            </Animated.View>

            {/* ── Macronutrients ──────────────────────────── */}
            <View style={styles.premiumMacroSection}>
              <View style={styles.premiumMacroHeader}>
                <Text style={styles.premiumMacroTitle}>Makro Besinler</Text>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={styles.premiumMacroDetails}>Detaylar ›</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.premiumMacroCard}>
                {macros.map((macro, idx) => (
                  <View key={macro.label} style={[
                    styles.premiumMacroRow,
                    idx < macros.length - 1 && styles.premiumMacroRowBorder,
                  ]}>
                    <Text style={styles.premiumMacroName}>{macro.label}</Text>
                    <View style={{ flex: 1, marginHorizontal: 12 }}>
                      <View style={styles.premiumMacroBarBg}>
                        <Animated.View
                          entering={FadeInUp.delay(400 + idx * 100).duration(600)}
                          style={[
                            styles.premiumMacroBarFill,
                            { width: `${macro.barPct * 100}%`, backgroundColor: macro.color },
                          ]}
                        />
                      </View>
                    </View>
                    <Text style={styles.premiumMacroValue}>
                      {macro.value}<Text style={styles.premiumMacroUnit}>{macro.unit}</Text>
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── Daily Goal Progress ─────────────────────── */}
            <View style={styles.premiumGoalCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.premiumGoalTitle}>Günlük Hedef İlerlemesi</Text>
                <Text style={styles.premiumGoalSub}>Harikasın! Günlük hedefe yaklaşıyorsun.</Text>
              </View>
              {/* Circular ring */}
              <View style={styles.premiumGoalRingWrap}>
                <View style={styles.premiumGoalRingOuter}>
                  <View style={[styles.premiumGoalRingInner, {
                    // Simulate arc with border: top portion colored
                    borderTopColor: "#16a34a",
                    borderRightColor: calPercent > 25 ? "#16a34a" : "#e5e7eb",
                    borderBottomColor: calPercent > 50 ? "#16a34a" : "#e5e7eb",
                    borderLeftColor: calPercent > 75 ? "#16a34a" : "#e5e7eb",
                  }]} />
                  <Text style={styles.premiumGoalRingText}>{calPercent}%</Text>
                </View>
              </View>
            </View>

            {/* ── Add to Meals CTA ────────────────────────── */}
            <TouchableOpacity
              onPress={() => setShowMealModal(true)}
              activeOpacity={0.85}
              style={styles.premiumAddBtn}
            >
              <Text style={styles.premiumAddBtnText}>Öğüne Ekle</Text>
            </TouchableOpacity>

            {/* Rescan small link */}
            <TouchableOpacity onPress={handleReset} activeOpacity={0.7} style={styles.premiumRescanRow}>
              <Text style={styles.premiumRescanText}>📷  Yeniden Tara</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>

        {renderMealModal()}
        {renderShareModal()}
      </SafeAreaView>
    );
  }

  // ─── Share Modal ─────────────────────────────────────────────────────────
  function renderShareModal() {
    const handleShareSubmit = async () => {
      if (!profile.uid || !fullResult) return;
      setIsSharing(true); setShowShareModal(false);
      try {
        let publicImageUrl: string | undefined;
        if (fullImageUri) {
          try { publicImageUrl = await uploadCommunityImage(profile.uid, fullImageUri); } catch {}
        }
        await createCommunityPost(
          profile.uid, profile.name || "Kullanıcı",
          {
            postType: "meal",
            mealName: shareFoodName.trim() || fullResult.class_name.replace(/_/g, " "),
            calories: Math.round(fullResult.estimated_calories),
            description: shareDescription.trim() || `${shareFoodName} • ${fullResult.estimated_weight_grams.toFixed(0)}g`,
            imageUrl: publicImageUrl,
          },
        );
        Alert.alert("Paylaşıldı! 🎉", "Yemeğin toplulukta paylaşıldı.\nTopluluk sekmesinden görebilirsin.");
      } catch {
        Alert.alert("Hata", "Paylaşım başarısız oldu.");
      } finally { setIsSharing(false); }
    };

    return (
      <Modal visible={showShareModal} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.modalOverlay}>
            <View style={styles.shareModalContent}>
              <Text style={styles.modalTitle}>👥 Toplulukta Paylaş</Text>
              <Text style={styles.modalSubtitle}>Yemeğini düzenle ve paylaş!</Text>
              {fullImageUri && <Image source={{ uri: fullImageUri }} style={styles.sharePreviewImage} resizeMode="cover" />}
              <View style={styles.shareInputGroup}>
                <Text style={styles.shareInputLabel}>Yemek Adı</Text>
                <TextInput style={styles.shareTextInput} value={shareFoodName} onChangeText={setShareFoodName} placeholder="Yemek adı" placeholderTextColor={Colors.text.muted} maxLength={60} />
              </View>
              {fullResult && (
                <View style={styles.shareCalorieRow}>
                  <Text style={styles.shareCalorieLabel}>🔥 {Math.round(fullResult.estimated_calories)} kcal</Text>
                  <Text style={styles.shareCalorieSep}>•</Text>
                  <Text style={styles.shareCalorieLabel}>⚖️ {fullResult.estimated_weight_grams.toFixed(0)}g</Text>
                </View>
              )}
              <View style={styles.shareInputGroup}>
                <Text style={styles.shareInputLabel}>Açıklama / Yorum</Text>
                <TextInput style={[styles.shareTextInput, styles.shareTextArea]} value={shareDescription} onChangeText={setShareDescription} placeholder="Bu yemek hakkında bir şeyler yaz... 🎉" placeholderTextColor={Colors.text.muted} multiline maxLength={500} textAlignVertical="top" />
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowShareModal(false)}>
                  <Text style={styles.modalCancelText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleShareSubmit} disabled={isSharing}>
                  <LinearGradient colors={[SCAN_COLOR, "#65a30d"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalConfirmGrad}>
                    <Text style={styles.modalConfirmText}>{isSharing ? "⏳ Paylaşılıyor..." : "🚀 Paylaş"}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  // ─── Meal Modal ───────────────────────────────────────────────────────────
  function renderMealModal() {
    return (
      <Modal visible={showMealModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.mealModalContent}>
            <View style={styles.mealModalHandle} />
            <Text style={styles.modalTitle}>Öğün Seçin</Text>
            {/* Date selector */}
            <View style={styles.dateSelectorRow}>
              <TouchableOpacity onPress={() => shiftDate(-1)} style={styles.dateNavBtn}>
                <Text style={styles.dateNavText}>◀</Text>
              </TouchableOpacity>
              <View style={styles.dateLabelWrap}>
                <Text style={styles.dateLabel}>📅 {formatDateLabel(selectedDate)}</Text>
              </View>
              <TouchableOpacity onPress={() => shiftDate(1)} style={styles.dateNavBtn}>
                <Text style={styles.dateNavText}>▶</Text>
              </TouchableOpacity>
            </View>

            {MEAL_TYPES.map((mt) => (
              <TouchableOpacity
                key={mt.key}
                style={[styles.mealTypeOption, selectedMealType === mt.key && styles.mealTypeOptionActive]}
                onPress={() => setSelectedMealType(mt.key)}
              >
                <Text style={styles.mealTypeIcon}>{mt.icon}</Text>
                <Text style={[styles.mealTypeLabel, selectedMealType === mt.key && styles.mealTypeLabelActive]}>{mt.label}</Text>
                {selectedMealType === mt.key && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>
            ))}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowMealModal(false)}>
                <Text style={styles.modalCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleAddToMeal}>
                <LinearGradient colors={[SCAN_COLOR, "#65a30d"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalConfirmGrad}>
                  <Text style={styles.modalConfirmText}>Kaydet</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // ─── Camera view ──────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />

      {/* HUD overlay (grid, vignette, telemetry) */}
      <HudOverlay active={autoDetect} detecting={isDetecting} />

      {/* Scanning brackets */}
      <ScanningBrackets active={autoDetect} />

      {/* Safe area overlay — top controls */}
      <SafeAreaView edges={["top"]} style={styles.cameraOverlay}>
        {/* Top bar */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.topBar}>
          <TouchableOpacity
            style={styles.topBarBtn}
            onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
          >
            <Text style={styles.topBarBtnText}>🔄</Text>
          </TouchableOpacity>

          <View style={styles.topBarCenter}>
            <View style={[styles.hudDot, { backgroundColor: autoDetect ? SCAN_COLOR : "#fff" }]} />
            <Text style={styles.topBarTitle}>Yemek Tara</Text>
          </View>

          <TouchableOpacity style={styles.topBarBtn} onPress={handlePickFromGallery}>
            <Text style={styles.topBarBtnText}>🖼️</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Auto-detect toggle */}
        <Animated.View entering={FadeIn.delay(300).duration(500)} style={styles.autoDetectRow}>
          <TouchableOpacity
            style={[styles.autoDetectBtn, autoDetect && styles.autoDetectBtnActive]}
            onPress={() => setAutoDetect(!autoDetect)}
            activeOpacity={0.8}
          >
            {autoDetect
              ? <LinearGradient colors={[SCAN_COLOR, "#65a30d"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.autoDetectGrad}>
                  <Text style={[styles.autoDetectText, { color: "#000" }]}>⏸ Otomatik Açık</Text>
                </LinearGradient>
              : <Text style={styles.autoDetectText}>▶ Otomatik Tanıma</Text>
            }
          </TouchableOpacity>
          {isDetecting && <ActivityIndicator size="small" color={SCAN_COLOR} style={{ marginLeft: 8 }} />}
        </Animated.View>
      </SafeAreaView>

      {/* Error banner */}
      {error && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Text style={styles.errorDismiss}>✕</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Live result card */}
      {liveResult && mode === "camera" && (
        <Animated.View entering={FadeInUp.duration(400)} style={styles.liveResultCard}>
          <LinearGradient
            colors={["rgba(163,230,53,0.08)", "rgba(0,0,0,0.92)"]}
            style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
          />
          <View style={styles.liveResultTop}>
            {capturedImageUri && <Image source={{ uri: capturedImageUri }} style={styles.liveResultThumb} />}
            <View style={styles.liveResultInfo}>
              <View style={styles.liveResultTitleRow}>
                <View style={[styles.hudDot, { backgroundColor: SCAN_COLOR }]} />
                <Text style={styles.liveResultName} numberOfLines={1}>
                  {liveResult.class_name.replace(/_/g, " ").replace(/-/g, " ")}
                </Text>
              </View>
              <Text style={styles.liveResultDetail}>
                ⚖️ {liveResult.estimated_weight_grams.toFixed(0)}g  •  🔥 {liveResult.estimated_calories.toFixed(0)} kcal
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.liveAddBtn}
            onPress={() => { setFullResult(liveResult); setFullImageUri(capturedImageUri); setShowMealModal(true); }}
            activeOpacity={0.8}
          >
            <LinearGradient colors={[SCAN_COLOR, "#65a30d"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.liveAddBtnGrad}>
              <Text style={styles.liveAddBtnText}>➕ Öğüne Ekle</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Bottom capture bar */}
      <View style={styles.bottomBar}>
        {/* Capture hint text */}
        <Text style={styles.bottomHint}>
          {autoDetect ? "Otomatik tarama aktif" : "Fotoğraf çek veya otomatik tanıma aç"}
        </Text>

        <View style={styles.bottomBarInner}>
          {/* Gallery shortcut */}
          <TouchableOpacity style={styles.bottomSideBtn} onPress={handlePickFromGallery} activeOpacity={0.7}>
            <Text style={styles.bottomSideBtnText}>🖼️</Text>
          </TouchableOpacity>

          {/* Shutter */}
          <TouchableOpacity onPress={handleCapture} activeOpacity={0.7} style={styles.captureRingOuter}>
            <LinearGradient
              colors={[SCAN_COLOR, "#65a30d"]}
              style={styles.captureRingGrad}
            >
              <View style={styles.captureCircle} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Barcode scanner shortcut */}
          <TouchableOpacity
            style={[styles.bottomSideBtn, { borderColor: '#2DD4A0', borderWidth: 1 }]}
            onPress={() => { barcodeScannedRef.current = false; setMode('barcode'); }}
            activeOpacity={0.7}
          >
            <Text style={styles.bottomSideBtnText}>📦</Text>
          </TouchableOpacity>
        </View>

        {/* Barcode hint row */}
        <TouchableOpacity
          onPress={() => { barcodeScannedRef.current = false; setMode('barcode'); }}
          activeOpacity={0.7}
          style={styles.barcodeHintRow}
        >
          <Text style={styles.barcodeHintText}>📦 Barkod ile tara</Text>
        </TouchableOpacity>
      </View>

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
  },

  // ── Permission ─────────────────────────────────────────────────────────
  permissionCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: `${SCAN_COLOR}33`,
    borderRadius: BorderRadius["2xl"],
    padding: 36,
    alignItems: "center",
    marginHorizontal: 24,
  },
  permissionIconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${SCAN_COLOR}15`,
    borderWidth: 2,
    borderColor: `${SCAN_COLOR}55`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  permissionIconEmoji: { fontSize: 48 },
  permissionTitle: {
    fontSize: FontSize["2xl"],
    fontWeight: "800",
    color: Colors.text.primary,
    marginBottom: 12,
    textAlign: "center",
  },
  permissionDesc: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  permissionBtn: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: BorderRadius.lg,
  },
  permissionBtnText: {
    color: "#000",
    fontSize: FontSize.base,
    fontWeight: "800",
  },

  // ── Loading ────────────────────────────────────────────────────────────
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingCard: {
    backgroundColor: "rgba(163,230,53,0.06)",
    borderWidth: 1,
    borderColor: `${SCAN_COLOR}33`,
    borderRadius: BorderRadius["2xl"],
    padding: 40,
    alignItems: "center",
    marginHorizontal: 32,
  },
  loadingTitle: {
    color: SCAN_COLOR,
    marginTop: 20,
    fontSize: FontSize.lg,
    fontWeight: "700",
    letterSpacing: 1,
  },
  loadingDesc: {
    color: Colors.text.secondary,
    marginTop: 8,
    textAlign: "center",
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  cancelBtn: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  cancelBtnText: { color: Colors.error, fontWeight: "600", fontSize: FontSize.sm },

  // ── Saved ──────────────────────────────────────────────────────────────
  savedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing["2xl"],
  },
  savedIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: "hidden",
    marginBottom: 24,
    ...Shadows.neonLime,
  },
  savedIconGrad: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  savedIcon: {
    fontSize: 42,
    color: "#000",
    fontWeight: "900",
  },
  savedTitle: {
    fontSize: FontSize["4xl"],
    fontWeight: "900",
    color: Colors.text.primary,
    marginBottom: 12,
  },
  savedPill: {
    backgroundColor: `${SCAN_COLOR}15`,
    borderWidth: 1,
    borderColor: `${SCAN_COLOR}44`,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    marginBottom: 8,
  },
  savedPillText: {
    color: SCAN_COLOR,
    fontWeight: "700",
    fontSize: FontSize.base,
    textTransform: "capitalize",
  },
  savedSub: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    textAlign: "center",
    marginBottom: Spacing["2xl"],
  },
  savedActions: { width: "100%", gap: 12 },
  savedPrimaryBtn: { borderRadius: BorderRadius.lg, overflow: "hidden" },
  savedPrimaryBtnInner: { paddingVertical: 16, borderRadius: BorderRadius.lg, alignItems: "center" },
  savedPrimaryBtnText: { color: "#000", fontSize: FontSize.base, fontWeight: "800" },
  savedSecondaryBtn: {
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: "center",
    backgroundColor: Colors.glass,
  },
  savedSecondaryBtnText: { color: Colors.text.secondary, fontSize: FontSize.sm, fontWeight: "600" },

  // ── Scanning brackets ──────────────────────────────────────────────────
  bracketsContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  bracketBox: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  corner: {
    position: "absolute",
    width: 64,
    height: 64,
  },
  cornerOuter: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 64,
    height: 64,
  },
  cornerH: {
    position: "absolute",
    top: 4,
    left: 4,
    width: 24,
    height: 2.5,
    borderRadius: 1,
  },
  cornerV: {
    position: "absolute",
    top: 4,
    left: 4,
    width: 2.5,
    height: 24,
    borderRadius: 1,
  },
  cornerInner: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 64,
    height: 64,
    opacity: 0.5,
  },
  cornerHInner: {
    position: "absolute",
    top: 9,
    left: 9,
    width: 14,
    height: 1.5,
    borderRadius: 1,
  },
  cornerVInner: {
    position: "absolute",
    top: 9,
    left: 9,
    width: 1.5,
    height: 14,
    borderRadius: 1,
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    zIndex: 2,
  },
  crosshairWrap: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  crosshairRing: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  crosshairCircle: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
  },
  crosshairLineH: {
    position: "absolute",
    width: "100%",
    height: 1,
    opacity: 0.6,
  },
  crosshairLineV: {
    position: "absolute",
    width: 1,
    height: "100%",
    opacity: 0.6,
  },
  crosshairDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pulseBorder: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 1,
    borderRadius: 12,
  },

  // ── HUD ───────────────────────────────────────────────────────────────
  hudTopBar: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    zIndex: 8,
  },
  hudLeft:  { flexDirection: "row", alignItems: "center", gap: 6 },
  hudRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  hudDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: SCAN_COLOR },
  hudMono:  { fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", fontSize: 10.5, letterSpacing: 0.5 },
  hudSideBars: {
    position: "absolute",
    left: 12,
    top: "50%",
    zIndex: 8,
    gap: 6,
  },
  hudBarRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  hudBarTrack: {
    width: 4,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  hudBarFill: { borderRadius: 2 },
  hudSideData: {
    position: "absolute",
    right: 12,
    top: "50%",
    zIndex: 8,
    alignItems: "flex-end",
    gap: 4,
  },
  hudDataRow: { flexDirection: "row" },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    opacity: 0.03,
    // Can't use style backgroundImage in RN, so we use a simple overlay
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
    backgroundColor: "transparent",
    // Simulated vignette via a LinearGradient would need the component — handled inline
  },

  // ── Camera overlay ────────────────────────────────────────────────────
  cameraOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    zIndex: 10,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  topBarBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    justifyContent: "center", alignItems: "center",
  },
  topBarBtnText: { fontSize: 22 },
  topBarCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  topBarTitle: {
    color: "#fff",
    fontSize: FontSize.sm,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  autoDetectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  autoDetectBtn: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
  },
  autoDetectBtnActive: {
    borderColor: SCAN_COLOR,
    padding: 0,
  },
  autoDetectGrad: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
  },
  autoDetectText: { color: "#fff", fontSize: FontSize.sm, fontWeight: "700", letterSpacing: 0.3 },

  // ── Error banner ──────────────────────────────────────────────────────
  errorBanner: {
    position: "absolute",
    top: 120, left: 16, right: 16,
    backgroundColor: "rgba(239,68,68,0.9)",
    borderRadius: BorderRadius.md,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 20,
  },
  errorBannerText: { color: "#fff", flex: 1, fontSize: FontSize.sm },
  errorDismiss: { color: "#fff", fontSize: 18, paddingLeft: 12 },

  // ── Live result card ──────────────────────────────────────────────────
  liveResultCard: {
    position: "absolute",
    bottom: 160, left: 16, right: 16,
    backgroundColor: "rgba(0,0,0,0.9)",
    borderRadius: 20,
    padding: 14,
    zIndex: 20,
    borderWidth: 1,
    borderColor: `${SCAN_COLOR}55`,
    overflow: "hidden",
  },
  liveResultTop: { flexDirection: "row", alignItems: "center" },
  liveResultThumb: {
    width: 60, height: 60, borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: `${SCAN_COLOR}44`,
  },
  liveResultInfo: { flex: 1 },
  liveResultTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  liveResultName: { color: "#fff", fontSize: FontSize.sm, fontWeight: "700", flex: 1, textTransform: "capitalize" },
  liveResultDetail: { color: Colors.text.secondary, fontSize: FontSize.xs, marginTop: 2 },
  liveAddBtn: { marginTop: 10, borderRadius: 12, overflow: "hidden" },
  liveAddBtnGrad: { paddingVertical: 10, alignItems: "center", borderRadius: 12 },
  liveAddBtnText: { color: "#000", fontWeight: "800", fontSize: FontSize.sm },

  // ── Bottom bar ────────────────────────────────────────────────────────
  bottomBar: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    alignItems: "center",
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    zIndex: 10,
  },
  bottomHint: {
    color: "rgba(255,255,255,0.5)",
    fontSize: FontSize.xs,
    marginBottom: 16,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    letterSpacing: 0.5,
  },
  bottomBarInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
  },
  bottomSideBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center",
  },
  bottomSideBtnText: { fontSize: 22 },
  captureRingOuter: {
    width: 76, height: 76, borderRadius: 38,
    ...Shadows.neonLime,
  },
  captureRingGrad: {
    width: 76, height: 76, borderRadius: 38,
    justifyContent: "center", alignItems: "center",
    padding: 4,
  },
  captureCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "#000",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },

  // ── Result screen (Legacy — kept for fallback reference) ──────────────────
  resultHero: { width: "100%", height: 280, position: "relative" },
  resultHeroImage: { width: "100%", height: "100%" },
  resultHeroGradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: 160 },
  resultTopBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 12 },
  resultBackBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.5)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  resultAiBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.55)", borderWidth: 1, borderColor: `${SCAN_COLOR}44`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full },
  resultHeroLabel: { position: "absolute", bottom: 16, left: 20, right: 20 },
  resultHeroFoodName: { fontSize: FontSize["3xl"], fontWeight: "900", color: "#fff", textTransform: "capitalize" },
  resultHeroSubtitle: { fontSize: FontSize.xs, color: SCAN_COLOR, marginTop: 2 },
  resultBody: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  resultCalCard: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(20,20,28,0.95)", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: `${SCAN_COLOR}33`, overflow: "hidden" },
  resultCalLeft: { flex: 1 },
  resultCalValue: { fontSize: FontSize["5xl"], fontWeight: "900", color: SCAN_COLOR },
  resultCalUnit: { fontSize: FontSize.sm, color: Colors.text.secondary, fontWeight: "600", marginTop: -4 },
  resultCalGoalRow: { marginTop: 8 },
  resultCalGoalText: { fontSize: FontSize.xs, color: Colors.text.secondary },
  resultCalRight: { alignItems: "center", gap: 10 },
  resultCalProgressRing: { alignItems: "center" },
  resultCalRingOuter: { width: 16, height: 60, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden", justifyContent: "flex-end" },
  resultCalRingFill: { width: "100%", borderRadius: 8 },
  resultCalRingLabel: { fontSize: 24, marginTop: 4 },
  resultWeightPill: { backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full },
  resultWeightPillText: { color: Colors.text.secondary, fontSize: FontSize.xs, fontWeight: "600" },
  resultMacroRow: { flexDirection: "row", gap: 10 },
  resultMacroCard: { flex: 1, backgroundColor: "rgba(20,20,28,0.95)", borderRadius: 14, padding: 14, borderWidth: 1, alignItems: "center", overflow: "hidden" },
  resultMacroValue: { fontSize: FontSize.xl, fontWeight: "900" },
  resultMacroLabel: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2, marginBottom: 8, fontWeight: "600" },
  resultMacroMiniBarBg: { width: "100%", height: 3, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" },
  resultMacroMiniBarFill: { height: "100%", borderRadius: 2 },
  resultNutritionCard: { backgroundColor: "rgba(20,20,28,0.95)", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  resultNutritionTitle: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.text.secondary, marginBottom: 14, textTransform: "uppercase" },
  resultNutrRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  resultNutrDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  resultNutrName: { width: 90, fontSize: FontSize.sm, color: Colors.text.primary, fontWeight: "500" },
  resultNutrBarBg: { flex: 1, height: 6, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden", marginRight: 10 },
  resultNutrBarFill: { height: "100%", borderRadius: 3 },
  resultNutrValue: { width: 36, fontSize: FontSize.sm, fontWeight: "700", textAlign: "right" },
  resultInsightCard: { backgroundColor: `${SCAN_COLOR}08`, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: `${SCAN_COLOR}22` },
  resultInsightHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  resultInsightText: { fontSize: FontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  resultPrimaryBtnWrap: { borderRadius: BorderRadius.lg, overflow: "hidden" },
  resultPrimaryBtn: { paddingVertical: 16, borderRadius: BorderRadius.lg, alignItems: "center" },
  resultPrimaryBtnText: { color: "#000", fontSize: FontSize.base, fontWeight: "800" },
  resultSecondaryRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  resultSecondaryBtn: { flex: 1, paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)", alignItems: "center" },
  resultSecondaryBtnText: { color: Colors.text.secondary, fontSize: FontSize.sm, fontWeight: "600" },

  // ── Premium Result Screen (v0 Design) ────────────────────────────────────
  premiumResultContainer: { flex: 1, backgroundColor: "#f9f9f7" },

  // Hero
  premiumHeroWrap: { width: "100%", height: 300, position: "relative" },
  premiumHeroImage: { width: "100%", height: "100%" },
  premiumHeroGrad: { position: "absolute", left: 0, right: 0, bottom: 0, height: 120 },

  // Top buttons
  premiumTopBar: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 16, paddingTop: 8,
  },
  premiumTopRight: { flexDirection: "row", gap: 8 },
  premiumTopBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.35)",
  },
  premiumTopBtnIcon: { fontSize: 16, color: "#fff", fontWeight: "700" },

  // AI badge
  premiumAiBadgeWrap: {
    position: "absolute", bottom: 14, left: 16,
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  premiumAiBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
  },
  premiumAiDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#4ade80" },
  premiumAiBadgeText: { fontSize: 11, color: "#4ade80", fontWeight: "700", letterSpacing: 0.3 },

  // Floating card
  premiumCard: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -28,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 16,
    elevation: 12,
  },
  premiumHandle: {
    width: 44, height: 4, borderRadius: 2,
    backgroundColor: "#e0e0e0", alignSelf: "center", marginBottom: 20,
  },

  // Food name row
  premiumFoodRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 4 },
  premiumFoodName: {
    fontSize: 22, fontWeight: "800", color: "#111",
    textTransform: "capitalize", lineHeight: 28,
  },
  premiumFoodSub: { fontSize: 13, color: "#888", marginTop: 2 },
  premiumConfidenceBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#f0fdf4",
    borderWidth: 1, borderColor: "#bbf7d0",
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, marginLeft: 10, marginTop: 3,
  },
  premiumConfidenceIcon: { fontSize: 11, color: "#16a34a" },
  premiumConfidenceText: { fontSize: 11, color: "#16a34a", fontWeight: "700" },

  // Health badge
  premiumHealthBadgeWrap: { alignItems: "center", marginVertical: 16 },
  premiumHealthBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#f97316",
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 30,
    shadowColor: "#f97316", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12,
    elevation: 6,
  },
  premiumHealthIcon: { fontSize: 18, color: "#fff" },
  premiumHealthText: { fontSize: 15, fontWeight: "800", color: "#fff" },

  // 3-column nutrient pills
  premiumPillsRow: { flexDirection: "row", gap: 10, marginBottom: 22 },
  premiumPill: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16, padding: 12,
    alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6,
    elevation: 3,
    borderWidth: 1, borderColor: "#f0f0f0",
  },
  premiumPillIcon: {
    width: 38, height: 38, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
    marginBottom: 6,
  },
  premiumPillLabel: { fontSize: 10, color: "#aaa", fontWeight: "600", marginBottom: 2 },
  premiumPillValue: { fontSize: 18, fontWeight: "900", color: "#111" },
  premiumPillUnit: { fontSize: 10, color: "#888", fontWeight: "600" },

  // Macronutrients
  premiumMacroSection: { marginBottom: 16 },
  premiumMacroHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 12,
  },
  premiumMacroTitle: { fontSize: 17, fontWeight: "800", color: "#111" },
  premiumMacroDetails: { fontSize: 13, fontWeight: "700", color: "#16a34a" },
  premiumMacroCard: {
    backgroundColor: "#f8f8f6",
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#ececea",
  },
  premiumMacroRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 10,
  },
  premiumMacroRowBorder: { borderBottomWidth: 1, borderBottomColor: "#f0f0ee" },
  premiumMacroName: { width: 60, fontSize: 13, color: "#444", fontWeight: "600" },
  premiumMacroBarBg: {
    height: 8, borderRadius: 4, backgroundColor: "#e8e8e6", overflow: "hidden",
  },
  premiumMacroBarFill: { height: "100%", borderRadius: 4 },
  premiumMacroValue: { fontSize: 14, fontWeight: "800", color: "#111", minWidth: 36, textAlign: "right" },
  premiumMacroUnit: { fontSize: 11, fontWeight: "400", color: "#888" },

  // Daily goal card
  premiumGoalCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#bbf7d0",
    marginBottom: 22,
  },
  premiumGoalTitle: { fontSize: 14, fontWeight: "800", color: "#111", marginBottom: 4 },
  premiumGoalSub: { fontSize: 11, color: "#555" },
  premiumGoalRingWrap: { marginLeft: 16 },
  premiumGoalRingOuter: {
    width: 58, height: 58,
    justifyContent: "center", alignItems: "center",
  },
  premiumGoalRingInner: {
    position: "absolute",
    width: 54, height: 54, borderRadius: 27,
    borderWidth: 5,
    borderTopColor: "#16a34a",
    borderRightColor: "#e5e7eb",
    borderBottomColor: "#e5e7eb",
    borderLeftColor: "#e5e7eb",
    transform: [{ rotate: "-45deg" }],
  },
  premiumGoalRingText: {
    fontSize: 13, fontWeight: "800", color: "#16a34a",
  },

  // Add to Meals button
  premiumAddBtn: {
    backgroundColor: "#16a34a",
    paddingVertical: 18, borderRadius: 20,
    alignItems: "center",
    shadowColor: "#16a34a", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12,
    elevation: 8,
    marginBottom: 14,
  },
  premiumAddBtnText: { fontSize: 16, fontWeight: "800", color: "#fff", letterSpacing: 0.3 },

  // Rescan
  premiumRescanRow: { alignItems: "center", paddingVertical: 4 },
  premiumRescanText: { fontSize: 13, color: "#888", fontWeight: "600" },

  // ── Modals ────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  mealModalContent: {
    backgroundColor: Colors.backgroundAlt,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 44 : 24,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 0,
  },
  mealModalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center", marginBottom: 16,
  },
  shareModalContent: {
    backgroundColor: Colors.backgroundAlt,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 44 : 24,
    maxHeight: "90%",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 0,
  },
  modalTitle: {
    fontSize: FontSize.xl, fontWeight: "800",
    color: Colors.text.primary,
    textAlign: "center", marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    textAlign: "center", marginBottom: 16,
  },
  sharePreviewImage: {
    width: "100%", height: 150,
    borderRadius: BorderRadius.lg,
    marginBottom: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  shareInputGroup: { marginBottom: 12 },
  shareInputLabel: {
    fontSize: 10, fontWeight: "700",
    color: Colors.text.secondary,
    marginBottom: 6,
    textTransform: "uppercase", letterSpacing: 0.8,
  },
  shareTextInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: FontSize.base,
    color: Colors.text.primary,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  shareTextArea: { height: 80, paddingTop: 12 },
  shareCalorieRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginBottom: 12, paddingHorizontal: 4,
  },
  shareCalorieLabel: { fontSize: FontSize.sm, color: Colors.text.secondary, fontWeight: "600" },
  shareCalorieSep:   { fontSize: FontSize.sm, color: Colors.text.muted },

  // Date selector
  dateSelectorRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", marginBottom: 16, gap: 12,
  },
  dateNavBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  dateNavText: { fontSize: 12, color: Colors.text.secondary, fontWeight: "700" },
  dateLabelWrap: {
    paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: BorderRadius.md,
    backgroundColor: `${SCAN_COLOR}12`,
    borderWidth: 1, borderColor: `${SCAN_COLOR}44`,
  },
  dateLabel: { fontSize: FontSize.sm, fontWeight: "700", color: SCAN_COLOR },

  // Meal type options
  mealTypeOption: {
    flexDirection: "row", alignItems: "center",
    padding: 14, borderRadius: 14, marginBottom: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  mealTypeOptionActive: {
    backgroundColor: `${SCAN_COLOR}10`,
    borderColor: `${SCAN_COLOR}55`,
  },
  mealTypeIcon:  { fontSize: 22, marginRight: 12 },
  mealTypeLabel: { flex: 1, fontSize: FontSize.base, fontWeight: "600", color: Colors.text.secondary },
  mealTypeLabelActive: { color: SCAN_COLOR },
  checkMark: { fontSize: 18, color: SCAN_COLOR, fontWeight: "900" },

  modalActions: { flexDirection: "row", marginTop: 16, gap: 12 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    backgroundColor: Colors.surface,
  },
  modalCancelText: { color: Colors.text.secondary, fontWeight: "600", fontSize: FontSize.base },
  modalConfirmBtn: { flex: 1, borderRadius: 14, overflow: "hidden" },
  modalConfirmGrad: { paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  modalConfirmText: { color: "#000", fontWeight: "800", fontSize: FontSize.base },

  // ── Source badge (Gemini / Model) ──────────────────────────────────────
  sourceBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, marginLeft: 8,
    borderWidth: 1,
  },
  sourceBadgeGemini: {
    backgroundColor: "rgba(139,92,246,0.12)",
    borderColor: "rgba(139,92,246,0.4)",
  },
  sourceBadgeModel: {
    backgroundColor: "rgba(34,211,238,0.1)",
    borderColor: "rgba(34,211,238,0.35)",
  },
  sourceBadgeText: { fontSize: 11, fontWeight: "700", color: "#6d28d9" },

  // ── Calorie range row ─────────────────────────────────────────────────
  calorieRangeRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: "#f0fdf4",
    borderRadius: 12, marginBottom: 12,
    borderWidth: 1, borderColor: "#bbf7d0", gap: 8,
  },
  calorieRangeLabel: { fontSize: 12, color: "#555", fontWeight: "600" },
  calorieRangeValue: { fontSize: 12, color: "#16a34a", fontWeight: "700", flex: 1 },

  // ── Real macros badge ─────────────────────────────────────────────────
  realMacroBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, borderWidth: 1, borderColor: "#86efac",
  },
  realMacroBadgeText: { fontSize: 10, color: "#15803d", fontWeight: "700" },

  // ── Food name slug (English) ──────────────────────────────────────────
  premiumFoodSlug: {
    fontSize: FontSize.xs,
    color: "#999",
    fontWeight: "500",
    marginBottom: 2,
    textTransform: "capitalize",
  },

  // ── Portion Slider Card ───────────────────────────────────────────────
  portionCard: {
    backgroundColor: "#f0fdf4",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: 16,
    marginBottom: 12,
  },
  portionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  portionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#15803d",
  },
  portionBadge: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  portionBadgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
  },
  portionRangeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  portionRangeText: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "600",
  },
  portionResetBtn: {
    backgroundColor: "rgba(22,163,74,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  portionResetText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16a34a",
  },

  // ── Source badge — Barcode ─────────────────────────────────────────────
  sourceBadgeBarcode: {
    backgroundColor: "rgba(45,212,160,0.12)",
    borderColor: "rgba(45,212,160,0.4)",
  },

  // ── Barcode Scanner Screen ─────────────────────────────────────────────
  barcodeVignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    // Dark outer ring — clip the center, simulate with shadow
    shadowColor: "#000",
    shadowOpacity: 0.9,
    shadowRadius: 80,
    shadowOffset: { width: 0, height: 0 },
  },
  barcodeTopBar: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 36,
    left: 0, right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 20,
  },
  barcodeBackBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  barcodeBackIcon: { color: "#fff", fontSize: 28, lineHeight: 32, marginTop: -2 },
  barcodeTitle: {
    color: "#fff", fontSize: FontSize.base, fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.8)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  barcodeScanFrame: {
    position: "absolute",
    top: "28%",
    alignSelf: "center",
    width: SCREEN_WIDTH * 0.78,
    height: 160,
    zIndex: 15,
  },
  barcodeCorner: {
    position: "absolute",
    width: 28, height: 28,
    borderColor: "#2DD4A0",
    borderRadius: 2,
  },
  barcodeScanLine: {
    position: "absolute",
    top: "50%",
    left: 10, right: 10,
    height: 2,
    backgroundColor: "#2DD4A0",
    opacity: 0.85,
    borderRadius: 2,
    shadowColor: "#2DD4A0",
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  barcodeLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 8,
    gap: 12,
  },
  barcodeLoadingText: {
    color: "#2DD4A0", fontSize: FontSize.sm, fontWeight: "700",
  },
  barcodeInstruction: {
    position: "absolute",
    top: "57%",
    alignSelf: "center",
    alignItems: "center",
    gap: 4,
    zIndex: 15,
  },
  barcodeInstructionText: {
    color: "#fff", fontSize: FontSize.base, fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.8)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  barcodeInstructionSub: {
    color: "rgba(255,255,255,0.55)", fontSize: FontSize.xs, fontWeight: "600",
  },
  barcodeBottomBar: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    alignItems: "center",
    paddingBottom: Platform.OS === "ios" ? 44 : 28,
    paddingTop: 16,
    zIndex: 20,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  barcodeSwitchBtn: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
  },
  barcodeSwitchText: {
    color: "#fff", fontSize: FontSize.base, fontWeight: "700",
  },

  // ── Barcode hint row (in camera bottom bar) ────────────────────────────
  barcodeHintRow: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(45,212,160,0.10)",
    borderWidth: 1,
    borderColor: "rgba(45,212,160,0.25)",
  },
  barcodeHintText: {
    color: "#2DD4A0",
    fontSize: FontSize.xs,
    fontWeight: "700",
  },
});

export default ScanScreen;
export { ScanScreen };
