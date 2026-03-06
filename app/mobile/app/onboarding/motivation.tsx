import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { PrimaryButton } from '@/components/ui';
import { useUser } from '@/contexts/UserContext';
import { Colors, FontSize, Spacing } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 80;
const CHART_HEIGHT = 180;

function ProgressBar({ progress }: { progress: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
    </View>
  );
}

function WeightChart({ goal }: { goal: string }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Chart points for line
  const isGain = goal === 'gain';
  const points = isGain
    ? [
        { x: 20, y: 140 },
        { x: CHART_WIDTH * 0.25, y: 120 },
        { x: CHART_WIDTH * 0.5, y: 80 },
        { x: CHART_WIDTH - 20, y: 30 },
      ]
    : [
        { x: 20, y: 30 },
        { x: CHART_WIDTH * 0.25, y: 50 },
        { x: CHART_WIDTH * 0.5, y: 80 },
        { x: CHART_WIDTH - 20, y: 140 },
      ];

  // Build smooth curve
  const linePath = points.reduce((path, point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = points[i - 1];
    const cpX = (prev.x + point.x) / 2;
    return `${path} C ${cpX} ${prev.y}, ${cpX} ${point.y}, ${point.x} ${point.y}`;
  }, '');

  // Fill area under the curve
  const fillPath = `${linePath} L ${CHART_WIDTH - 20} ${CHART_HEIGHT} L 20 ${CHART_HEIGHT} Z`;

  return (
    <Animated.View
      style={[
        styles.chartContainer,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Text style={styles.chartTitle}>Kilo geçişiniz</Text>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT + 40} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT + 40}`}>
        <Defs>
          <SvgGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={Colors.accent.orange} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={Colors.accent.orange} stopOpacity="0.02" />
          </SvgGradient>
        </Defs>
        <Path d={fillPath} fill="url(#fillGrad)" />
        <Path d={linePath} stroke={Colors.accent.orange} strokeWidth={2.5} fill="none" />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={5} fill="#fff" stroke={Colors.text.primary} strokeWidth={2} />
        ))}
        {/* Last point highlighted */}
        <Circle cx={points[3].x} cy={points[3].y} r={6} fill={Colors.accent.orange} stroke="#fff" strokeWidth={2} />
      </Svg>

      {/* Labels */}
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

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const goalText =
    profile.goal === 'lose'
      ? 'Hedefinize ulaşma potansiyeliniz çok yüksek'
      : profile.goal === 'gain'
      ? 'Kas kazanma potansiyeliniz çok yüksek'
      : 'Sağlıklı yaşam potansiyeliniz çok yüksek';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.backCircle}>
          <Text style={styles.backArrow} onPress={() => router.back()}>←</Text>
        </View>
        <View style={styles.progressWrapper}>
          <ProgressBar progress={0.55} />
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
        <PrimaryButton
          title="Devam Et"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/onboarding/activity');
          }}
          style={styles.continueBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: Colors.text.primary,
    marginTop: -2,
  },
  progressWrapper: { flex: 1 },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.neutral[200],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.text.primary,
    borderRadius: 2,
  },
  titleSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['3xl'],
    paddingBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize['3xl'],
    fontWeight: '800',
    color: Colors.text.primary,
    lineHeight: 40,
  },
  chartArea: {
    paddingHorizontal: Spacing.xl,
    flex: 1,
    justifyContent: 'center',
  },
  chartContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  chartTitle: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  chartLabel: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  spacer: { flex: 0.3 },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['3xl'],
  },
  continueBtn: {
    borderRadius: 28,
  },
});
