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

// ─── Subtle floating particles ───────────────────────────────────────────────
const PARTICLE_CONFIGS = [
  { size: 6,  color: NEON_GREEN, top: 60,  left: 40,  dy: 5000, dx: 7000, delay: 0,    ry: 22, rx: 10, o: 0.30 },
  { size: 8,  color: NEON_GREEN, top: 200, left: W - 60, dy: 6000, dx: 5500, delay: 800, ry: 28, rx: 14, o: 0.22 },
  { size: 5,  color: '#ec4899',  top: 340, left: 70,  dy: 7000, dx: 6000, delay: 400,  ry: 18, rx: 16, o: 0.18 },
  { size: 10, color: NEON_GREEN, top: H * 0.55, left: W * 0.65, dy: 8000, dx: 4500, delay: 1200, ry: 30, rx: 8, o: 0.15 },
  { size: 4,  color: '#a78bfa',  top: 140, left: W * 0.45, dy: 5500, dx: 8000, delay: 600,  ry: 20, rx: 18, o: 0.20 },
  { size: 7,  color: NEON_GREEN, top: H * 0.7, left: 50, dy: 6500, dx: 7500, delay: 1000, ry: 25, rx: 12, o: 0.25 },
];

function WelcomeParticle({ cfg }: { cfg: typeof PARTICLE_CONFIGS[0] }) {
  const ay = useRef(new Animated.Value(0)).current;
  const ax = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(ay, { toValue: 1, duration: cfg.dy, delay: cfg.delay, useNativeDriver: true }),
      Animated.timing(ay, { toValue: 0, duration: cfg.dy, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(ax, { toValue: 1, duration: cfg.dx, delay: cfg.delay + 200, useNativeDriver: true }),
      Animated.timing(ax, { toValue: 0, duration: cfg.dx, useNativeDriver: true }),
    ])).start();
  }, []);
  const tY = ay.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -cfg.ry, 0] });
  const tX = ax.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, cfg.rx, 0] });
  return (
    <Animated.View style={{
      position: 'absolute', top: cfg.top, left: cfg.left,
      width: cfg.size, height: cfg.size, borderRadius: cfg.size / 2,
      backgroundColor: cfg.color, opacity: cfg.o,
      shadowColor: cfg.color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: cfg.size,
      transform: [{ translateY: tY }, { translateX: tX }],
    }} />
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
      {/* ── Subtle floating particles ── */}
      {PARTICLE_CONFIGS.map((cfg, i) => (
        <WelcomeParticle key={i} cfg={cfg} />
      ))}

      {/* ── Ambient bottom glow ── */}
      <View style={styles.bottomGlow} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* ── Logo pill ── */}
        <View style={styles.logoPill}>
          <Text style={styles.logoText}>nutrino</Text>
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
});

