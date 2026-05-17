import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { ONBOARDING_CATEGORIES } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const NEON_GREEN = '#2DD4A0';
const BG_DARK    = '#080E0C';

interface OnboardingLayoutProps {
  children: React.ReactNode;
  stepKey: string;
  title: string;
  subtitle?: string;
  showBack?: boolean;
  illustration?: React.ReactNode;
}

// ─── Subtle floating particle ───────────────────────────────────────────────
interface ParticleConfig {
  size: number;
  color: string;
  top: number;
  left: number;
  durationY: number;
  durationX: number;
  delayMs: number;
  rangeY: number;
  rangeX: number;
  opacity: number;
}

const PARTICLES: ParticleConfig[] = [
  { size: 6,  color: NEON_GREEN, top: 80,  left: 30,  durationY: 5000, durationX: 7000, delayMs: 0,    rangeY: 25, rangeX: 12, opacity: 0.35 },
  { size: 8,  color: NEON_GREEN, top: 180, left: SCREEN_WIDTH - 50, durationY: 6000, durationX: 5500, delayMs: 800, rangeY: 30, rangeX: 15, opacity: 0.25 },
  { size: 5,  color: '#ec4899',  top: 300, left: 60,  durationY: 7000, durationX: 6000, delayMs: 400,  rangeY: 20, rangeX: 18, opacity: 0.20 },
  { size: 10, color: NEON_GREEN, top: 450, left: SCREEN_WIDTH * 0.7, durationY: 8000, durationX: 4500, delayMs: 1200, rangeY: 35, rangeX: 10, opacity: 0.18 },
  { size: 4,  color: '#ec4899',  top: 120, left: SCREEN_WIDTH * 0.5, durationY: 5500, durationX: 8000, delayMs: 600,  rangeY: 22, rangeX: 20, opacity: 0.22 },
  { size: 7,  color: NEON_GREEN, top: SCREEN_HEIGHT * 0.65, left: 40, durationY: 6500, durationX: 7500, delayMs: 1000, rangeY: 28, rangeX: 14, opacity: 0.30 },
  { size: 5,  color: '#a78bfa',  top: SCREEN_HEIGHT * 0.5, left: SCREEN_WIDTH - 80, durationY: 9000, durationX: 6000, delayMs: 1500, rangeY: 18, rangeX: 22, opacity: 0.15 },
  { size: 12, color: NEON_GREEN, top: SCREEN_HEIGHT * 0.8, left: SCREEN_WIDTH * 0.4, durationY: 7500, durationX: 5000, delayMs: 300, rangeY: 32, rangeX: 8, opacity: 0.12 },
];

function FloatingParticle({ config }: { config: ParticleConfig }) {
  const animY = useRef(new Animated.Value(0)).current;
  const animX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animY, { toValue: 1, duration: config.durationY, delay: config.delayMs, useNativeDriver: true }),
        Animated.timing(animY, { toValue: 0, duration: config.durationY, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(animX, { toValue: 1, duration: config.durationX, delay: config.delayMs + 200, useNativeDriver: true }),
        Animated.timing(animX, { toValue: 0, duration: config.durationX, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const translateY = animY.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -config.rangeY, 0] });
  const translateX = animX.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, config.rangeX, 0] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: config.top,
        left: config.left,
        width: config.size,
        height: config.size,
        borderRadius: config.size / 2,
        backgroundColor: config.color,
        opacity: config.opacity,
        shadowColor: config.color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: config.size,
        elevation: 0,
        transform: [{ translateY }, { translateX }],
      }}
    />
  );
}

function FloatingParticles() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {PARTICLES.map((p, i) => (
        <FloatingParticle key={i} config={p} />
      ))}
    </View>
  );
}

// ─── Ambient bottom glow ─────────────────────────────────────────────────────
function AmbientGlow() {
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        { justifyContent: 'flex-end', overflow: 'hidden' },
      ]}
    >
      <View style={styles.ambientGlow} />
    </View>
  );
}

// ─── Main Layout ─────────────────────────────────────────────────────────────
export function OnboardingLayout({
  children,
  stepKey,
  title,
  subtitle,
  showBack = true,
  illustration,
}: OnboardingLayoutProps) {
  const categoryIndex = ONBOARDING_CATEGORIES.findIndex((c) =>
    (c.steps as readonly string[]).includes(stepKey)
  );
  const category = ONBOARDING_CATEGORIES[categoryIndex] ?? ONBOARDING_CATEGORIES[0];
  const stepIndexInCategory = (category.steps as readonly string[]).indexOf(stepKey);
  const stepsInCategory = category.steps.length;

  return (
    <View style={styles.container}>
      {/* ── Subtle floating particles ── */}
      <FloatingParticles />
      <AmbientGlow />

      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* ── Top bar: badge + segmented progress ── */}
        <View style={styles.topBar}>
          {/* Category badge */}
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>{category.label}</Text>
          </View>

          {/* Segmented progress */}
          <View style={styles.segmentRow}>
            {ONBOARDING_CATEGORIES.map((cat, idx) => {
              const isActive    = idx === categoryIndex;
              const isCompleted = idx < categoryIndex;
              const fillPct     = isCompleted ? 100 : isActive ? ((stepIndexInCategory + 1) / stepsInCategory) * 100 : 0;
              return (
                <View key={cat.key} style={styles.segmentTrack}>
                  <View
                    style={[
                      styles.segmentFill,
                      {
                        width: `${fillPct}%` as any,
                        backgroundColor: isCompleted || isActive ? NEON_GREEN : 'rgba(255,255,255,0.15)',
                      },
                    ]}
                  />
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Illustration ── */}
        {illustration && (
          <View style={styles.illustrationWrap}>{illustration}</View>
        )}

        {/* ── Title / Subtitle ── */}
        <View style={styles.headerWrap}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>

        {/* ── Content ── */}
        <View style={styles.content}>{children}</View>

        {/* ── Back button ── */}
        {showBack && (
          <View style={styles.backRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backCircle} activeOpacity={0.7}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_DARK,
    position: 'relative',
    overflow: 'hidden',
  },
  safe: {
    flex: 1,
  },
  // ── Glow ──
  ambientGlow: {
    height: 180,
    width: '100%',
    borderRadius: SCREEN_WIDTH / 2,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    // Simulate bottom glow with a semi-transparent teal gradient
    borderBottomWidth: 0,
    // We use a simple teal shadow approach
    shadowColor: NEON_GREEN,
    shadowOffset: { width: 0, height: -20 },
    shadowOpacity: 0.12,
    shadowRadius: 60,
    elevation: 0,
    alignSelf: 'center',
    marginBottom: -60,
    transform: [{ scaleX: 2 }],
  },
  // ── Top bar ──
  topBar: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    alignItems: 'center',
    gap: Spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(45,212,160,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(45,212,160,0.25)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs + 2,
    gap: Spacing.xs,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: NEON_GREEN,
  },
  badgeText: {
    color: NEON_GREEN,
    fontSize: FontSize.sm,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
  },
  segmentTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  segmentFill: {
    height: '100%',
    borderRadius: 3,
  },
  // ── Illustration ──
  illustrationWrap: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xs,
  },
  // ── Header ──
  headerWrap: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize['3xl'],
    fontWeight: '800',
    color: '#F0FDF4',
    lineHeight: 38,
  },
  subtitle: {
    fontSize: FontSize.base,
    color: 'rgba(255,255,255,0.5)',
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  // ── Content ──
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  // ── Back ──
  backRow: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['2xl'],
    paddingTop: Spacing.sm,
  },
  backCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 20,
    color: '#F0FDF4',
    marginTop: -2,
  },
});
