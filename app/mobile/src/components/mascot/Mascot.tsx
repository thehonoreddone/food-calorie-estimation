import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, ImageSourcePropType, Text } from 'react-native';
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
  interpolateColor,
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { MascotBubble } from './MascotBubble';
import { getMascotMood, getRandomMessage, MascotMood } from './mascotMessages';
import { Colors, Shadows, FontSize, BorderRadius, Spacing } from '@/constants/theme';

// ─── Mascot image map ───────────────────────────────────────────────────────

const mascotImages: Record<MascotMood, ImageSourcePropType> = {
  happy: require('../../../assets/mascot/happy.png'),
  hungry: require('../../../assets/mascot/hungry.png'),
  excited: require('../../../assets/mascot/excited.png'),
  overfull: require('../../../assets/mascot/overfull.png'),
  sleepy: require('../../../assets/mascot/sleepy.png'),
  idle: require('../../../assets/mascot/idle.png'),
};

// ─── Mood color mapping ─────────────────────────────────────────────────────

const moodColors: Record<MascotMood, { glow: string; accent: string; bg: [string, string] }> = {
  happy: { glow: '#22c55e', accent: '#16a34a', bg: ['#f0fdf4', '#dcfce7'] },
  hungry: { glow: '#f97316', accent: '#ea580c', bg: ['#fff7ed', '#ffedd5'] },
  excited: { glow: '#eab308', accent: '#ca8a04', bg: ['#fefce8', '#fef9c3'] },
  overfull: { glow: '#ef4444', accent: '#dc2626', bg: ['#fef2f2', '#fee2e2'] },
  sleepy: { glow: '#8b5cf6', accent: '#7c3aed', bg: ['#faf5ff', '#f3e8ff'] },
  idle: { glow: Colors.primary[400], accent: Colors.primary[600], bg: [Colors.primary[50], '#e0f2fe'] },
};

// ─── Mood label (Turkish) ───────────────────────────────────────────────────

const moodLabels: Record<MascotMood, string> = {
  happy: '😊 Mutlu',
  hungry: '🍽️ Aç',
  excited: '🎉 Heyecanlı',
  overfull: '😅 Tok',
  sleepy: '😴 Uykulu',
  idle: '👋 Hazır',
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface MascotProps {
  caloriesEaten: number;
  calorieGoal: number;
  streak?: number;
  size?: number;
  compact?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function Mascot({ caloriesEaten, calorieGoal, streak = 0, size = 72, compact = false }: MascotProps) {
  const [showBubble, setShowBubble] = useState(true);
  const [message, setMessage] = useState('');
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animation values
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const glowOpacity = useSharedValue(0.4);

  // Calculate mood
  const mood = getMascotMood(caloriesEaten, calorieGoal);
  const colors = moodColors[mood];

  // ─── Idle breathing animation ───────────────────────────────────────
  useEffect(() => {
    // Gentle floating animation
    translateY.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(3, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, // infinite
      true,
    );

    // Glow pulse
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    return () => {
      cancelAnimation(translateY);
      cancelAnimation(glowOpacity);
    };
  }, []);

  // ─── Mood-change bounce ────────────────────────────────────────────
  useEffect(() => {
    // Bounce when mood changes
    scale.value = withSequence(
      withTiming(1.12, { duration: 200 }),
      withSpring(1, { damping: 8, stiffness: 200 }),
    );

    // Update message on mood change
    updateMessage();
  }, [mood]);

  // ─── Auto-show bubble on mount and periodically ────────────────────
  useEffect(() => {
    updateMessage();

    // Refresh message every 30 seconds
    const interval = setInterval(() => {
      updateMessage();
    }, 30000);

    return () => {
      clearInterval(interval);
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    };
  }, []);

  const updateMessage = useCallback(() => {
    const newMessage = getRandomMessage(mood, streak);
    setMessage(newMessage);
    setShowBubble(true);

    // Auto-hide after 8 seconds
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => {
      setShowBubble(false);
    }, 8000);
  }, [mood, streak]);

  // ─── Tap interaction ──────────────────────────────────────────────
  const handleTap = useCallback(() => {
    // Wiggle animation
    rotation.value = withSequence(
      withTiming(-6, { duration: 70 }),
      withTiming(6, { duration: 70 }),
      withTiming(-4, { duration: 70 }),
      withTiming(4, { duration: 70 }),
      withTiming(0, { duration: 70 }),
    );

    // Bounce
    scale.value = withSequence(
      withTiming(0.85, { duration: 100 }),
      withSpring(1, { damping: 6, stiffness: 300 }),
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
    <Animated.View entering={FadeIn.duration(600)} style={styles.outerContainer}>
      <LinearGradient
        colors={colors.bg as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        {/* Glow effect */}
        <Animated.View style={[styles.glowCircle, { backgroundColor: colors.glow }, glowStyle]} />

        <View style={styles.innerRow}>
          {/* Mascot Image */}
          <TouchableOpacity
            onPress={handleTap}
            activeOpacity={0.9}
            style={styles.touchable}
          >
            <Animated.View style={[styles.mascotWrapper, animatedStyle]}>
              <View style={[styles.imageContainer, { width: size, height: size, borderColor: colors.glow + '40' }]}>
                <Image
                  source={mascotImages[mood]}
                  style={[styles.mascotImage, { width: size, height: size }]}
                  resizeMode="contain"
                />
              </View>
            </Animated.View>
          </TouchableOpacity>

          {/* Info + Bubble */}
          <View style={styles.infoCol}>
            <View style={styles.nameRow}>
              <Text style={styles.mascotName}>Nutrino</Text>
              <View style={[styles.moodBadge, { backgroundColor: colors.glow + '20', borderColor: colors.glow + '40' }]}>
                <Text style={[styles.moodBadgeText, { color: colors.accent }]}>{moodLabels[mood]}</Text>
              </View>
            </View>
            <MascotBubble
              message={message}
              visible={showBubble}
              position="inline"
            />
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
    marginTop: -12,
    marginBottom: Spacing.sm,
    zIndex: 10,
  },
  container: {
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.md,
    overflow: 'hidden',
    position: 'relative',
    ...Shadows.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  glowCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    left: -10,
    top: -10,
    transform: [{ scale: 1.5 }],
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
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
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
    ...Shadows.sm,
    borderWidth: 2,
  },
  mascotImage: {
    borderRadius: 18,
  },
  infoCol: {
    flex: 1,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mascotName: {
    fontSize: FontSize.base,
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: 0.3,
  },
  moodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  moodBadgeText: {
    fontSize: 10,
    fontWeight: '700',
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
