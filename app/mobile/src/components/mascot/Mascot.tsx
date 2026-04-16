import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, ImageSourcePropType, Text, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  cancelAnimation,
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { MascotBubble } from './MascotBubble';
import { getMascotMood, getRandomMessage, MascotMood, MascotContext } from './mascotMessages';
import { Colors, Shadows, FontSize, BorderRadius, Spacing } from '@/constants/theme';

const { width: SW } = Dimensions.get('window');

// ─── Mascot image map ───────────────────────────────────────────────────────

const mascotImages: Record<MascotMood, ImageSourcePropType> = {
  happy: require('../../../assets/mascot/happy.png'),
  hungry: require('../../../assets/mascot/hungry.png'),
  excited: require('../../../assets/mascot/excited.png'),
  overfull: require('../../../assets/mascot/overfull.png'),
  sleepy: require('../../../assets/mascot/sleepy.png'),
  idle: require('../../../assets/mascot/idle.png'),
  thirsty: require('../../../assets/mascot/hungry.png'), // fallback to hungry image
};

// ─── Mood color mapping ─────────────────────────────────────────────────────

const moodColors: Record<MascotMood, { glow: string; accent: string; bg: [string, string]; emoji: string }> = {
  happy: { glow: '#22c55e', accent: '#16a34a', bg: ['#f0fdf4', '#dcfce7'], emoji: '😊' },
  hungry: { glow: '#f97316', accent: '#ea580c', bg: ['#fff7ed', '#ffedd5'], emoji: '🍽️' },
  excited: { glow: '#eab308', accent: '#ca8a04', bg: ['#fefce8', '#fef9c3'], emoji: '🎉' },
  overfull: { glow: '#ef4444', accent: '#dc2626', bg: ['#fef2f2', '#fee2e2'], emoji: '😅' },
  sleepy: { glow: '#8b5cf6', accent: '#7c3aed', bg: ['#faf5ff', '#f3e8ff'], emoji: '😴' },
  idle: { glow: Colors.primary[400], accent: Colors.primary[600], bg: [Colors.primary[50], '#e0f2fe'], emoji: '👋' },
  thirsty: { glow: '#06b6d4', accent: '#0891b2', bg: ['#ecfeff', '#cffafe'], emoji: '💧' },
};

// ─── Mood motivational messages (Turkish, short) ────────────────────────────

const moodMotivation: Record<MascotMood, string[]> = {
  happy: ['Harika gidiyorsun! 🎉', 'Bugün çok iyisin! ✨', 'Böyle devam! 💪'],
  hungry: ['Biraz atıştır! 🍎', 'Yemek vakti geldi!', 'Kalori hedefine ulaş! 🎯'],
  excited: ['Muhteşem performans! 🏆', 'Enerji dolu bir gün! ⚡', 'Rekor kırıyorsun! 🚀'],
  overfull: ['Biraz fazla oldu 😅', 'Yarın telafi ederiz!', 'Dinlenme zamanı 🧘'],
  sleepy: ['İyi uykular 🌙', 'Dinlen biraz 😴', 'Yarın yeni bir gün ✨'],
  idle: ['Haydi başlayalım! 👋', 'Bugün ne yesek? 🤔', 'Seni bekliyorum! 😊'],
  thirsty: ['Su içmeyi unutma! 💧', 'Bir bardak su iç 🥤', 'Hidrasyon önemli! 💦'],
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface MascotProps {
  caloriesEaten: number;
  calorieGoal: number;
  streak?: number;
  waterMl?: number;
  waterGoal?: number;
  mealCount?: number;
  size?: number;
  compact?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function Mascot({
  caloriesEaten,
  calorieGoal,
  streak = 0,
  waterMl = 0,
  waterGoal = 2500,
  mealCount = 0,
  size = 100,
  compact = false,
}: MascotProps) {
  const [motivation, setMotivation] = useState('');
  const motivationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animation values
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const glowOpacity = useSharedValue(0.4);
  const glowScale = useSharedValue(1);
  const sparkle = useSharedValue(0);

  // Calculate mood with full context
  const ctx: MascotContext = {
    caloriesEaten,
    calorieGoal,
    waterMl,
    waterGoal,
    mealCount,
    hour: new Date().getHours(),
  };
  const mood = getMascotMood(ctx);
  const colors = moodColors[mood];

  // ─── Idle breathing animation ───────────────────────────────────────
  useEffect(() => {
    // Gentle floating animation
    translateY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(6, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    // Glow pulse
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.25, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    // Glow scale breathing
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.85, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    return () => {
      cancelAnimation(translateY);
      cancelAnimation(glowOpacity);
      cancelAnimation(glowScale);
    };
  }, []);

  // ─── Mood-change bounce ────────────────────────────────────────────
  useEffect(() => {
    // Bounce when mood changes
    scale.value = withSequence(
      withTiming(1.15, { duration: 200 }),
      withSpring(1, { damping: 6, stiffness: 200 }),
    );

    // Sparkle effect
    sparkle.value = 0;
    sparkle.value = withSequence(
      withTiming(1, { duration: 600 }),
      withDelay(800, withTiming(0, { duration: 400 })),
    );

    // Update motivation on mood change
    updateMotivation();
  }, [mood]);

  // ─── Auto-update motivation ────────────────────────────────────────
  useEffect(() => {
    updateMotivation();
    const interval = setInterval(() => {
      updateMotivation();
    }, 20000);
    return () => {
      clearInterval(interval);
      if (motivationTimer.current) clearTimeout(motivationTimer.current);
    };
  }, []);

  const updateMotivation = useCallback(() => {
    const msgs = moodMotivation[mood];
    const msg = msgs[Math.floor(Math.random() * msgs.length)];
    setMotivation(msg);
  }, [mood]);

  // ─── Tap interaction ──────────────────────────────────────────────
  const handleTap = useCallback(() => {
    // Dramatic wiggle animation
    rotation.value = withSequence(
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(-6, { duration: 60 }),
      withTiming(6, { duration: 60 }),
      withTiming(-3, { duration: 60 }),
      withTiming(3, { duration: 60 }),
      withTiming(0, { duration: 60 }),
    );

    // Big bounce
    scale.value = withSequence(
      withTiming(0.85, { duration: 100 }),
      withSpring(1.12, { damping: 4, stiffness: 300 }),
      withSpring(1, { damping: 8, stiffness: 200 }),
    );

    // Sparkle
    sparkle.value = 0;
    sparkle.value = withSequence(
      withTiming(1, { duration: 400 }),
      withDelay(600, withTiming(0, { duration: 300 })),
    );

    // New motivation
    updateMotivation();
  }, [mood]);

  // ─── Animated styles ──────────────────────────────────────────────
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: sparkle.value,
    transform: [{ scale: interpolate(sparkle.value, [0, 1], [0.5, 1.3]) }],
  }));

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <TouchableOpacity onPress={handleTap} activeOpacity={0.9}>
          <Animated.View style={[styles.compactWrapper, animatedStyle]}>
            <Image
              source={mascotImages[mood]}
              style={[styles.compactImage, { width: size, height: size }]}
              resizeMode="contain"
            />
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.outerContainer}>
      {/* Radial glow behind mascot */}
      <Animated.View
        style={[
          styles.radialGlow,
          { backgroundColor: colors.glow },
          glowStyle,
        ]}
      />

      {/* Sparkle particles */}
      <Animated.View style={[styles.sparkleContainer, sparkleStyle]}>
        <Text style={styles.sparkle1}>✨</Text>
        <Text style={styles.sparkle2}>⭐</Text>
        <Text style={styles.sparkle3}>✨</Text>
      </Animated.View>

      {/* Mascot Image - Centered */}
      <TouchableOpacity
        onPress={handleTap}
        activeOpacity={0.85}
        style={styles.touchable}
      >
        <Animated.View style={[styles.mascotWrapper, animatedStyle]}>
          <View style={[styles.imageContainer, {
            width: size,
            height: size,
            shadowColor: colors.glow,
          }]}>
            <Image
              source={mascotImages[mood]}
              style={[styles.mascotImage, { width: size, height: size }]}
              resizeMode="contain"
            />
          </View>
        </Animated.View>
      </TouchableOpacity>

      {/* Motivational Message */}
      <Animated.Text
        entering={FadeIn.duration(500)}
        style={[styles.motivationText, { color: colors.glow }]}
      >
        {motivation}
      </Animated.Text>
    </Animated.View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    position: 'relative',
  },
  radialGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.25,
  },
  sparkleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
  sparkle1: { position: 'absolute', top: 4, right: SW * 0.25, fontSize: 16 },
  sparkle2: { position: 'absolute', top: 16, left: SW * 0.25, fontSize: 12 },
  sparkle3: { position: 'absolute', bottom: 20, right: SW * 0.3, fontSize: 14 },
  touchable: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  mascotWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  mascotImage: {
    borderRadius: 999,
  },
  motivationText: {
    marginTop: Spacing.md,
    fontSize: FontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  // Compact mode
  compactContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactImage: {
    borderRadius: 16,
  },
});
