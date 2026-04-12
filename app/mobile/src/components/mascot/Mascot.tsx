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

// ─── Mood label (Turkish) ───────────────────────────────────────────────────

const moodLabels: Record<MascotMood, string> = {
  happy: '😊 Mutlu',
  hungry: '🍽️ Aç',
  excited: '🎉 Heyecanlı',
  overfull: '😅 Tok',
  sleepy: '😴 Uykulu',
  idle: '👋 Hazır',
  thirsty: '💧 Susuz',
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
  size = 110,
  compact = false,
}: MascotProps) {
  const [showBubble, setShowBubble] = useState(true);
  const [message, setMessage] = useState('');
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animation values
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const glowOpacity = useSharedValue(0.3);
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
        withTiming(-5, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(5, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    // Glow pulse
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.2, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    // Glow scale breathing
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.9, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
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

    // Update message on mood change
    updateMessage();
  }, [mood]);

  // ─── Auto-show bubble on mount and periodically ────────────────────
  useEffect(() => {
    updateMessage();

    // Refresh message every 25 seconds
    const interval = setInterval(() => {
      updateMessage();
    }, 25000);

    return () => {
      clearInterval(interval);
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    };
  }, []);

  const updateMessage = useCallback(() => {
    const newMessage = getRandomMessage(mood, streak);
    setMessage(newMessage);
    setShowBubble(true);

    // Auto-hide after 10 seconds
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => {
      setShowBubble(false);
    }, 10000);
  }, [mood, streak]);

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
      withTiming(0.8, { duration: 100 }),
      withSpring(1.1, { damping: 4, stiffness: 300 }),
      withSpring(1, { damping: 8, stiffness: 200 }),
    );

    // Sparkle
    sparkle.value = 0;
    sparkle.value = withSequence(
      withTiming(1, { duration: 400 }),
      withDelay(600, withTiming(0, { duration: 300 })),
    );

    // New message
    updateMessage();
  }, [mood, streak]);

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
    <Animated.View entering={FadeInDown.duration(700).springify()} style={styles.outerContainer}>
      <LinearGradient
        colors={colors.bg as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        {/* Background glow effects */}
        <Animated.View
          style={[
            styles.glowCircle,
            { backgroundColor: colors.glow },
            glowStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.glowCircleRight,
            { backgroundColor: colors.accent },
            glowStyle,
          ]}
        />

        {/* Sparkle particles */}
        <Animated.View style={[styles.sparkleContainer, sparkleStyle]}>
          <Text style={styles.sparkle1}>✨</Text>
          <Text style={styles.sparkle2}>⭐</Text>
          <Text style={styles.sparkle3}>✨</Text>
        </Animated.View>

        <View style={styles.contentRow}>
          {/* Mascot Image - Bigger & Centered */}
          <TouchableOpacity
            onPress={handleTap}
            activeOpacity={0.85}
            style={styles.touchable}
          >
            <Animated.View style={[styles.mascotWrapper, animatedStyle]}>
              <View style={[styles.imageContainer, {
                width: size,
                height: size,
                borderColor: colors.glow + '50',
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

          {/* Info Column */}
          <View style={styles.infoCol}>
            {/* Mood Badge */}
            <View style={styles.nameRow}>
              <View style={[styles.moodBadge, {
                backgroundColor: colors.glow + '20',
                borderColor: colors.glow + '50',
              }]}>
                <Text style={[styles.moodBadgeText, { color: colors.accent }]}>
                  {moodLabels[mood]}
                </Text>
              </View>
            </View>

            {/* Message Bubble */}
            <MascotBubble
              message={message}
              visible={showBubble}
              position="inline"
              accentColor={colors.accent}
            />

            {/* Quick status indicators */}
            <View style={styles.statusRow}>
              {waterMl !== undefined && (
                <View style={[styles.statusChip, {
                  backgroundColor: waterMl > 0 ? '#06b6d420' : '#ef444420',
                }]}>
                  <Text style={styles.statusChipText}>
                    💧 {waterMl > 0 ? `${waterMl}ml` : 'Su ekle'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outerContainer: {
    marginHorizontal: Spacing.lg,
    marginTop: -14,
    marginBottom: Spacing.md,
    zIndex: 10,
  },
  container: {
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
    overflow: 'hidden',
    position: 'relative',
    ...Shadows.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  glowCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    left: -30,
    top: -30,
  },
  glowCircleRight: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    right: -20,
    bottom: -20,
    opacity: 0.15,
  },
  sparkleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
  sparkle1: { position: 'absolute', top: 8, right: 30, fontSize: 16 },
  sparkle2: { position: 'absolute', top: 20, left: 60, fontSize: 12 },
  sparkle3: { position: 'absolute', bottom: 12, right: 60, fontSize: 14 },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  touchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#fff',
    ...Shadows.md,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  mascotImage: {
    borderRadius: 21,
  },
  infoCol: {
    flex: 1,
    gap: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mascotName: {
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Colors.text.primary,
    letterSpacing: 0.5,
  },
  moodBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  moodBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.secondary,
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
