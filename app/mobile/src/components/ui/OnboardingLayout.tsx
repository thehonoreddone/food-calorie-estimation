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

// Floating orb colors matching the NutriScan reference
const ORB_GREEN  = 'rgba(45, 212, 160, 0.28)';
const ORB_PINK   = 'rgba(236, 72, 153, 0.18)';
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

// ─── Animated floating orb ──────────────────────────────────────────────────
function FloatingOrb({
  color,
  size,
  top,
  left,
  right,
  bottom,
  delay = 0,
  duration = 7000,
}: {
  color: string;
  size: number;
  top?: number | string;
  left?: number | string;
  right?: number | string;
  bottom?: number | string;
  delay?: number;
  duration?: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration, delay, useNativeDriver: true, easing: (t) => Math.sin(t * Math.PI) }),
        Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  return (
    <Animated.View
      style={[
        styles.orb,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color, top, left, right, bottom },
        { transform: [{ translateY }] },
      ]}
    />
  );
}

// ─── Ring / torus shape ──────────────────────────────────────────────────────
function FloatingRing({
  top, right, color = 'rgba(236,72,153,0.35)', size = 72, delay = 0,
}: { top?: number; right?: number; color?: string; size?: number; delay?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 9000, delay, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 9000, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 20] });
  return (
    <Animated.View style={{ position: 'absolute', top, right, transform: [{ translateY }] }}>
      <View
        style={{
          width: size,
          height: size / 2.2,
          borderRadius: size / 4,
          borderWidth: 3,
          borderColor: color,
          opacity: 0.7,
          transform: [{ scaleY: 0.55 }],
        }}
      />
      <View
        style={{
          width: size * 0.45,
          height: size * 0.45,
          borderRadius: size * 0.225,
          backgroundColor: `${color.replace('0.35', '0.6')}`,
          alignSelf: 'center',
          marginTop: -8,
          shadowColor: NEON_GREEN,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 12,
          elevation: 8,
        }}
      />
    </Animated.View>
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
      {/* ── Background orbs ── */}
      <FloatingOrb color={ORB_GREEN} size={200} top={-60} left={-60} duration={8000} />
      <FloatingOrb color={ORB_PINK}  size={140} top={SCREEN_HEIGHT * 0.3} left={-40} delay={1200} duration={10000} />
      <FloatingOrb color={ORB_GREEN} size={100} bottom={120} left={SCREEN_WIDTH * 0.35} delay={2000} duration={6500} />
      <FloatingRing top={SCREEN_HEIGHT * 0.42} right={12} delay={500} />
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
  // ── Orbs / glow ──
  orb: {
    position: 'absolute',
    // blur via opacity + large radius — RN doesn't support CSS blur natively
    opacity: 0.85,
  },
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
