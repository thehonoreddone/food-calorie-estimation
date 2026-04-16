import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { PrimaryButton } from '@/components/ui';
import { useUser } from '@/contexts/UserContext';
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.xl * 2 - Spacing.md) / 2;

const AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle);

// ─── Animated Circular Progress ────────────────────────────────────────
interface CircularProgressProps {
  size: number;
  strokeWidth: number;
  progress: number; // 0..1
  color: string;
  delay: number;
  children: React.ReactNode;
}

function CircularProgress({ size, strokeWidth, progress, color, delay, children }: CircularProgressProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(animatedValue, {
        toValue: progress,
        duration: 1200,
        useNativeDriver: false,
      }).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [animatedValue, progress, delay]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, circumference * (1 - 1)], // Will be overridden
  });

  // Since Animated SVG props need special handling, use a listener approach
  const [displayOffset, setDisplayOffset] = React.useState(circumference);

  useEffect(() => {
    const id = animatedValue.addListener(({ value }) => {
      setDisplayOffset(circumference * (1 - value));
    });
    return () => animatedValue.removeListener(id);
  }, [animatedValue, circumference]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Background circle */}
        <SvgCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.neutral[100]}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <SvgCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={displayOffset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        {children}
      </View>
    </View>
  );
}

// ─── Health Score Bar ───────────────────────────────────────────────────
function HealthScoreBar({ score, delay }: { score: number; delay: number }) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(widthAnim, {
        toValue: score / 10,
        duration: 1000,
        useNativeDriver: false,
      }).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [widthAnim, score, delay]);

  const barWidth = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.healthBarTrack}>
      <Animated.View style={[styles.healthBarFill, { width: barWidth }]} />
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────
export default function PlanReadyScreen() {
  const { profile } = useUser();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const cardAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const calories = profile.dailyCalorieTarget ?? 2000;
  const protein = profile.dailyProtein ?? 150;
  const carbs = profile.dailyCarbs ?? 250;
  const fat = profile.dailyFat ?? 65;
  const healthScore = profile.healthScore ?? 7;
  const targetWeight = profile.weight ?? 70;

  const goalText =
    profile.goal === 'lose'
      ? 'Kilo Vermelisiniz:'
      : profile.goal === 'gain'
      ? 'Kilo Almalısınız:'
      : 'Koruyun:';

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Stagger card animations
    cardAnims.forEach((anim, i) => {
      setTimeout(() => {
        Animated.spring(anim, {
          toValue: 1,
          friction: 7,
          tension: 50,
          useNativeDriver: true,
        }).start();
      }, 300 + i * 150);
    });
  }, [fadeAnim, slideAnim, cardAnims]);

  const macroCards = [
    {
      label: 'Kalori',
      value: calories.toString(),
      unit: '',
      icon: '🔥',
      color: Colors.text.primary,
      progress: 0.75,
    },
    {
      label: 'Karbonhidrat',
      value: `${carbs}g`,
      unit: '',
      icon: '🌾',
      color: Colors.accent.orange,
      progress: 0.65,
    },
    {
      label: 'Protein',
      value: `${protein}g`,
      unit: '',
      icon: '🥩',
      color: '#ef4444',
      progress: 0.7,
    },
    {
      label: 'Yağ',
      value: `${fat}g`,
      unit: '',
      icon: '💧',
      color: '#3b82f6',
      progress: 0.55,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* BG orbs */}
      <View style={styles.orbLarge} />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.backCircle}>
          <Text style={styles.backArrow} onPress={() => router.back()}>←</Text>
        </View>
        <View style={styles.progressWrapper}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Title */}
        <Animated.View
          style={[
            styles.titleSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.congratsText}>Tebrikler</Text>
          <Text style={styles.planReadyText}>kişisel planınız hazır!</Text>

          <Text style={styles.maintainLabel}>{goalText}</Text>
          <View style={styles.weightBadge}>
            <Text style={styles.weightText}>{targetWeight.toFixed(1)} kg</Text>
          </View>
        </Animated.View>

        {/* Daily Recommendation */}
        <View style={styles.recommendSection}>
          <Text style={styles.recommendTitle}>Günlük Öneri</Text>
          <Text style={styles.recommendSubtitle}>İstediğiniz zaman düzenleyebilirsiniz</Text>

          {/* Macro Cards Grid */}
          <View style={styles.cardGrid}>
            {macroCards.map((card, i) => (
              <Animated.View
                key={card.label}
                style={[
                  styles.macroCard,
                  {
                    opacity: cardAnims[i],
                    transform: [
                      {
                        scale: cardAnims[i].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.macroCardHeader}>
                  <Text style={styles.macroIcon}>{card.icon}</Text>
                  <Text style={styles.macroLabel}>{card.label}</Text>
                </View>

                <CircularProgress
                  size={90}
                  strokeWidth={7}
                  progress={card.progress}
                  color={card.color}
                  delay={400 + i * 200}
                >
                  <Text style={styles.macroValue}>{card.value}</Text>
                </CircularProgress>

                {/* Edit icon */}
                <View style={styles.editIcon}>
                  <Text style={styles.editIconText}>✏️</Text>
                </View>
              </Animated.View>
            ))}
          </View>

          {/* Health Score */}
          <Animated.View
            style={[
              styles.healthCard,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <View style={styles.healthRow}>
              <Text style={styles.healthIcon}>💗</Text>
              <Text style={styles.healthLabel}>Sağlık puanı</Text>
              <Text style={styles.healthValue}>{healthScore}/10</Text>
            </View>
            <HealthScoreBar score={healthScore} delay={1200} />
          </Animated.View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <PrimaryButton
          title="Devam Et"
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.push('/onboarding/signup');
          }}
          style={styles.continueBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const NEON_GREEN = '#2DD4A0';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080E0C',
    overflow: 'hidden',
  },
  orbLarge: {
    position: 'absolute', top: -70, left: -70,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(45,212,160,0.28)', opacity: 0.9,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  backCircle: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  backArrow: {
    fontSize: 20, color: '#F0FDF4', marginTop: -2,
  },
  progressWrapper: { flex: 1 },
  progressTrack: {
    height: 4, backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 2, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: NEON_GREEN, borderRadius: 2,
  },
  scrollContent: {
    paddingBottom: Spacing['3xl'],
  },
  titleSection: {
    alignItems: 'center',
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing.xl,
  },
  congratsText: {
    fontSize: FontSize['3xl'], fontWeight: '800', color: '#F0FDF4',
  },
  planReadyText: {
    fontSize: FontSize['2xl'], fontWeight: '800', color: NEON_GREEN,
    marginTop: Spacing.xs,
  },
  maintainLabel: {
    fontSize: FontSize.base, fontWeight: '600',
    color: 'rgba(255,255,255,0.50)', marginTop: Spacing.xl,
  },
  weightBadge: {
    backgroundColor: 'rgba(45,212,160,0.12)',
    borderWidth: 1, borderColor: 'rgba(45,212,160,0.30)',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  weightText: {
    fontSize: FontSize.lg, fontWeight: '700', color: NEON_GREEN,
  },
  recommendSection: {
    paddingHorizontal: Spacing.xl, marginTop: Spacing.lg,
  },
  recommendTitle: {
    fontSize: FontSize.xl, fontWeight: '700', color: '#F0FDF4',
  },
  recommendSubtitle: {
    fontSize: FontSize.sm, color: 'rgba(255,255,255,0.45)',
    marginTop: Spacing.xs, marginBottom: Spacing.xl,
  },
  cardGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md,
  },
  macroCard: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg, alignItems: 'center',
  },
  macroCardHeader: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start', marginBottom: Spacing.md, gap: Spacing.xs,
  },
  macroIcon: { fontSize: 18 },
  macroLabel: {
    fontSize: FontSize.sm, fontWeight: '600', color: 'rgba(255,255,255,0.70)',
  },
  macroValue: {
    fontSize: FontSize.xl, fontWeight: '800', color: '#F0FDF4',
  },
  editIcon: {
    position: 'absolute', bottom: Spacing.md, right: Spacing.md,
  },
  editIconText: { fontSize: 14, opacity: 0.4 },
  healthCard: {
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl, marginTop: Spacing.md,
  },
  healthRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md,
  },
  healthIcon: { fontSize: 22, marginRight: Spacing.md },
  healthLabel: {
    flex: 1, fontSize: FontSize.base, fontWeight: '600', color: '#F0FDF4',
  },
  healthValue: {
    fontSize: FontSize.lg, fontWeight: '800', color: NEON_GREEN,
  },
  healthBarTrack: {
    height: 8, backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 4, overflow: 'hidden',
  },
  healthBarFill: {
    height: '100%', backgroundColor: NEON_GREEN, borderRadius: 4,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['3xl'],
    paddingTop: Spacing.sm,
  },
  continueBtn: {
    borderRadius: 28,
  },
});
