import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '@/contexts/UserContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH  = SCREEN_WIDTH - 80;
const CHART_HEIGHT = 180;

const BG_DARK    = '#080E0C';
const NEON_GREEN = '#2DD4A0';
const ORB_GREEN  = 'rgba(45, 212, 160, 0.28)';
const ORB_PINK   = 'rgba(236, 72, 153, 0.18)';

function WeightChart({ goal }: { goal: string }) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  const isGain = goal === 'gain';
  const points = isGain
    ? [{ x: 20, y: 140 }, { x: CHART_WIDTH * 0.25, y: 120 }, { x: CHART_WIDTH * 0.5, y: 80 }, { x: CHART_WIDTH - 20, y: 30 }]
    : [{ x: 20, y: 30 }, { x: CHART_WIDTH * 0.25, y: 50 }, { x: CHART_WIDTH * 0.5, y: 80 }, { x: CHART_WIDTH - 20, y: 140 }];

  const linePath = points.reduce((path, point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = points[i - 1];
    const cpX  = (prev.x + point.x) / 2;
    return `${path} C ${cpX} ${prev.y}, ${cpX} ${point.y}, ${point.x} ${point.y}`;
  }, '');

  const fillPath = `${linePath} L ${CHART_WIDTH - 20} ${CHART_HEIGHT} L 20 ${CHART_HEIGHT} Z`;

  return (
    <Animated.View style={[styles.chartContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <Text style={styles.chartTitle}>Kilo geçişiniz</Text>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT + 40} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT + 40}`}>
        <Defs>
          <SvgGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={NEON_GREEN} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={NEON_GREEN} stopOpacity="0.02" />
          </SvgGradient>
        </Defs>
        <Path d={fillPath} fill="url(#fillGrad)" />
        <Path d={linePath} stroke={NEON_GREEN} strokeWidth={2.5} fill="none" />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={5} fill="rgba(255,255,255,0.15)" stroke={NEON_GREEN} strokeWidth={2} />
        ))}
        <Circle cx={points[3].x} cy={points[3].y} r={6} fill={NEON_GREEN} stroke="#fff" strokeWidth={2} />
      </Svg>
      <View style={styles.chartLabels}>
        <Text style={styles.chartLabel}>3 Gün</Text>
        <Text style={styles.chartLabel}>7 Gün</Text>
        <Text style={styles.chartLabel}>30 Gün</Text>
      </View>
    </Animated.View>
  );
}

export default function MotivationScreen() {
  const { profile } = useUser();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const orbAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbAnim, { toValue: 1, duration: 8000, useNativeDriver: true }),
        Animated.timing(orbAnim, { toValue: 0, duration: 8000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const orbY = orbAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });

  const goalText =
    profile.goal === 'lose'
      ? 'Hedefinize ulaşma potansiyeliniz çok yüksek'
      : profile.goal === 'gain'
      ? 'Kas kazanma potansiyeliniz çok yüksek'
      : 'Sağlıklı yaşam potansiyeliniz çok yüksek';

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.orbLarge, { backgroundColor: ORB_GREEN, transform: [{ translateY: orbY }] }]} />
      <View style={[styles.orbMed, { backgroundColor: ORB_PINK }]} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backCircle} activeOpacity={0.7}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={styles.progressWrapper}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '55%' }]} />
            </View>
          </View>
        </View>

        {/* Title */}
        <Animated.View style={[styles.titleSection, { opacity: fadeAnim }]}>
          <Text style={styles.title}>{goalText}</Text>
        </Animated.View>

        {/* Chart */}
        <View style={styles.chartArea}>
          <WeightChart goal={profile.goal ?? 'maintain'} />
        </View>

        <View style={styles.spacer} />

        {/* Continue */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/onboarding/activity');
            }}
            activeOpacity={0.85}
            style={styles.btnWrap}
          >
            <LinearGradient
              colors={['#4ade80', '#2DD4A0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btn}
            >
              <Text style={styles.btnText}>Devam Et →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_DARK, overflow: 'hidden' },
  safe: { flex: 1 },
  orbLarge: {
    position: 'absolute', top: -70, left: -70,
    width: 220, height: 220, borderRadius: 110, opacity: 0.9,
  },
  orbMed: {
    position: 'absolute', top: '30%', left: -50,
    width: 150, height: 150, borderRadius: 75, opacity: 0.8,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12, gap: 12,
  },
  backCircle: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  backArrow: { fontSize: 20, color: '#F0FDF4', marginTop: -2 },
  progressWrapper: { flex: 1 },
  progressTrack: {
    height: 4, backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: NEON_GREEN, borderRadius: 2 },
  titleSection: { paddingHorizontal: 20, paddingTop: 32, paddingBottom: 20 },
  title: {
    fontSize: 28, fontWeight: '800', color: '#F0FDF4', lineHeight: 38,
  },
  chartArea: { paddingHorizontal: 20, flex: 1, justifyContent: 'center' },
  chartContainer: {
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 20, padding: 20,
  },
  chartTitle: {
    fontSize: 15, fontWeight: '600', color: '#F0FDF4', marginBottom: 12,
  },
  chartLabels: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 12, marginTop: 8,
  },
  chartLabel: { fontSize: 11, color: 'rgba(255,255,255,0.40)', fontWeight: '500' },
  spacer: { flex: 0.3 },
  footer: { paddingHorizontal: 20, paddingBottom: 32 },
  btnWrap: { borderRadius: 32, overflow: 'hidden' },
  btn: { paddingVertical: 20, alignItems: 'center', borderRadius: 32 },
  btnText: { fontSize: 17, fontWeight: '800', color: '#030E08' },
});
