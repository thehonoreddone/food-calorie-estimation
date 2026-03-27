/**
 * DailyGoalCelebration — Full-screen celebration effect
 * Triggered when user completes their daily calorie tracking goal.
 * Shows confetti-like emoji rain for motivation.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { hapticSuccess } from '../../utils/haptics';

const { width, height } = Dimensions.get('window');

const CELEBRATION_EMOJIS = ['🎉', '🌟', '✨', '💪', '🔥', '🏆', '⭐', '🥳'];
const PARTICLE_COUNT = 16;

interface DailyGoalCelebrationProps {
  visible: boolean;
  onComplete?: () => void;
}

const createParticle = () => ({
  x: Math.random() * width,
  emoji: CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)],
  delay: Math.random() * 500,
  size: 20 + Math.random() * 20,
  drift: (Math.random() - 0.5) * 60,
});

export const DailyGoalCelebration: React.FC<DailyGoalCelebrationProps> = ({
  visible,
  onComplete,
}) => {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const textScale = useRef(new Animated.Value(0)).current;
  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      ...createParticle(),
      anim: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (visible) {
      hapticSuccess();

      // Overlay fade in
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Text bounce in
      Animated.sequence([
        Animated.delay(200),
        Animated.spring(textScale, {
          toValue: 1,
          tension: 50,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();

      // Particles fall
      particles.forEach((p) => {
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.timing(p.anim, {
            toValue: 1,
            duration: 2000 + Math.random() * 1000,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
      });

      // Auto-dismiss after 3s
      setTimeout(() => {
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          textScale.setValue(0);
          particles.forEach((p) => p.anim.setValue(0));
          onComplete?.();
        });
      }, 3000);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
      {/* Emoji particles rain */}
      {particles.map((p, i) => {
        const translateY = p.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [-50, height + 50],
        });
        const translateX = p.anim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, p.drift, p.drift * 1.5],
        });
        const rotate = p.anim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${360 * (Math.random() > 0.5 ? 1 : -1)}deg`],
        });
        const opacity = p.anim.interpolate({
          inputRange: [0, 0.8, 1],
          outputRange: [1, 1, 0],
        });

        return (
          <Animated.Text
            key={i}
            style={[
              styles.particle,
              {
                left: p.x,
                fontSize: p.size,
                opacity,
                transform: [{ translateY }, { translateX }, { rotate }],
              },
            ]}
          >
            {p.emoji}
          </Animated.Text>
        );
      })}

      {/* Celebration text */}
      <Animated.View style={{ transform: [{ scale: textScale }] }}>
        <Text style={styles.celebrationEmoji}>🎯</Text>
        <Text style={styles.title}>Günlük Hedef{'\n'}Tamamlandı!</Text>
        <Text style={styles.subtitle}>Harika gidiyorsun, böyle devam! 💪</Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  particle: {
    position: 'absolute',
    top: 0,
  },
  celebrationEmoji: {
    fontSize: 60,
    textAlign: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#a7f3d0',
    textAlign: 'center',
    marginTop: 8,
  },
});
