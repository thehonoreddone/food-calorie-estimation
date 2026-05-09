import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

const { width: W, height: H } = Dimensions.get('window');

const BG_DARK    = '#080E0C';
const NEON_GREEN = '#2DD4A0';
const ORB_GREEN  = 'rgba(45, 212, 160, 0.30)';
const ORB_PINK   = 'rgba(236, 72, 153, 0.20)';

// ─── Animated orb ────────────────────────────────────────────────────────────
function FloatingOrb({
  color, size, style, delay = 0, duration = 8000,
}: { color: string; size: number; style?: any; delay?: number; duration?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration, delay, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: 0.9,
        },
        style,
        { transform: [{ translateY }] },
      ]}
    />
  );
}

// ─── Ring decoration ─────────────────────────────────────────────────────────
function Ring({ top, right, delay = 0 }: { top: number; right: number; delay?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 9000, delay, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 9000, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 18] });
  return (
    <Animated.View style={{ position: 'absolute', top, right, transform: [{ translateY }] }}>
      <View style={styles.ringOval} />
      <View style={styles.ringBall} />
    </Animated.View>
  );
}

// ─── Screen icon ─────────────────────────────────────────────────────────────
function AppIcon() {
  return (
    <View style={styles.iconWrap}>
      <Text style={styles.iconEmoji}>🥑</Text>
    </View>
  );
}

// ─── Glow CTA button ─────────────────────────────────────────────────────────
function GlowButton({ title, onPress }: { title: string; onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View style={[styles.glowBtnWrap, { transform: [{ scale: scaleAnim }] }]}>
        {/* Glow behind */}
        <View style={styles.glowBtnGlow} />
        <LinearGradient
          colors={['#4ade80', '#2DD4A0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.glowBtn}
        >
          <Text style={styles.glowBtnText}>{title}</Text>
          <Text style={styles.glowBtnArrow}>→</Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function WelcomeScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>
      {/* ── Floating orbs ── */}
      <FloatingOrb color={ORB_GREEN} size={220} style={{ top: -70, left: -70 }} duration={8000} />
      <FloatingOrb color={ORB_PINK}  size={150} style={{ top: H * 0.32, left: -50 }} delay={1200} duration={10000} />
      <FloatingOrb color={ORB_GREEN} size={90}  style={{ bottom: 130, left: W * 0.38 }} delay={2000} duration={6500} />
      <Ring top={H * 0.45} right={10} delay={500} />

      {/* ── Ambient bottom glow ── */}
      <View style={styles.bottomGlow} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* ── Logo pill ── */}
        <View style={styles.logoPill}>
          <Text style={styles.logoText}>nutrino</Text>
        </View>

        {/* ── AI badge ── */}
        <View style={styles.aiBadge}>
          <View style={styles.aiBadgeDot} />
          <Text style={styles.aiBadgeText}>AI-Powered Analysis</Text>
        </View>

        {/* ── Center content ── */}
        <Animated.View
          style={[styles.center, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <AppIcon />

          <Text style={styles.headline}>
            Motivasyonlarınız{'\n'}ne olursa olsun,{' '}
            <Text style={styles.headlineAccent}>beslenme{'\n'}rehberiniz</Text>
          </Text>

          <Text style={styles.subtext}>
            Yapay zeka destekli besin takibi ile{'\n'}sağlıklı yaşamın kapısını aralayın.
          </Text>
        </Animated.View>

        <View style={styles.spacer} />

        {/* ── CTA ── */}
        <View style={styles.bottom}>
          <GlowButton title="Başla" onPress={() => router.push('/onboarding/goal')} />

          <TouchableOpacity
            onPress={() => router.replace('/auth/login')}
            style={styles.loginBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.loginText}>Zaten bir hesabınız var mı? </Text>
            <Text style={[styles.loginText, { color: NEON_GREEN }]}>Giriş yap</Text>
          </TouchableOpacity>

          {/* ── Progress dots ── */}
          <View style={styles.dots}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[styles.dot, i === 0 && styles.dotActive]}
              />
            ))}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG_DARK,
    overflow: 'hidden',
  },
  safe: {
    flex: 1,
    alignItems: 'center',
  },
  bottomGlow: {
    position: 'absolute',
    bottom: -60,
    left: -W * 0.5,
    right: -W * 0.5,
    height: 200,
    borderRadius: W,
    backgroundColor: 'transparent',
    shadowColor: NEON_GREEN,
    shadowOffset: { width: 0, height: -20 },
    shadowOpacity: 0.15,
    shadowRadius: 80,
    elevation: 0,
  },
  // ── Logo ──
  logoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  logoEmoji: {
    fontSize: 28,
    color: NEON_GREEN,
  },
  logoText: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: '#F0FDF4',
    letterSpacing: -0.5,
  },
  // ── AI badge ──
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(45,212,160,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(45,212,160,0.25)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs + 2,
    gap: Spacing.xs,
    marginTop: Spacing.lg,
  },
  aiBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: NEON_GREEN,
  },
  aiBadgeText: {
    color: NEON_GREEN,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  // ── Center ──
  center: {
    alignItems: 'center',
    paddingHorizontal: Spacing['3xl'],
    marginTop: Spacing.xl,
  },
  // ── App icon ──
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: 'rgba(45,212,160,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(45,212,160,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['2xl'],
    shadowColor: NEON_GREEN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  iconEmoji: {
    fontSize: 40,
  },
  // ── Headline ──
  headline: {
    fontSize: FontSize['3xl'],
    fontWeight: '800',
    color: '#F0FDF4',
    textAlign: 'center',
    lineHeight: 42,
  },
  headlineAccent: {
    color: NEON_GREEN,
  },
  subtext: {
    fontSize: FontSize.base,
    color: 'rgba(255,255,255,0.50)',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: Spacing.lg,
  },
  spacer: { flex: 1 },
  // ── Bottom ──
  bottom: {
    width: '100%',
    paddingHorizontal: Spacing['3xl'],
    paddingBottom: Spacing['2xl'],
    alignItems: 'center',
    gap: Spacing.lg,
  },
  // ── Glow button ──
  glowBtnWrap: {
    width: W - Spacing['3xl'] * 2,
    position: 'relative',
  },
  glowBtnGlow: {
    position: 'absolute',
    inset: 0,
    borderRadius: BorderRadius['3xl'],
    backgroundColor: NEON_GREEN,
    opacity: 0.25,
    transform: [{ scaleX: 0.95 }, { scaleY: 0.6 }, { translateY: 8 }],
    zIndex: 0,
  },
  glowBtn: {
    borderRadius: BorderRadius['3xl'],
    paddingVertical: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    zIndex: 1,
  },
  glowBtnText: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: '#030E08',
  },
  glowBtnArrow: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: '#030E08',
  },
  // ── Login link ──
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginText: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.45)',
  },
  // ── Dots ──
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  dotActive: {
    width: 24,
    backgroundColor: NEON_GREEN,
  },
  // ── Ring ──
  ringOval: {
    width: 64,
    height: 30,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: 'rgba(236,72,153,0.45)',
    transform: [{ scaleY: 0.55 }],
  },
  ringBall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(45,212,160,0.7)',
    alignSelf: 'center',
    marginTop: -8,
    shadowColor: NEON_GREEN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },
});
