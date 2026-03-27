/**
 * StreakBadge — Gamification streak display with fire animation
 * Shows the user's daily scanning streak with celebration effects.
 * Motivates users to maintain consistent food tracking habits.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { hapticSuccess } from '../../utils/haptics';

interface StreakBadgeProps {
  /** Current streak count (days) */
  streak: number;
  /** Whether to show the celebration animation (for milestones) */
  celebrate?: boolean;
  /** Compact size for inline usage */
  compact?: boolean;
}

const MILESTONES = [3, 7, 14, 30, 60, 100];

export const StreakBadge: React.FC<StreakBadgeProps> = ({
  streak,
  celebrate = false,
  compact = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const isMilestone = MILESTONES.includes(streak);

  useEffect(() => {
    if (celebrate || isMilestone) {
      // Pulse + glow animation
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.3,
            duration: 300,
            easing: Easing.out(Easing.back(2)),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
          { iterations: 3 }
        ),
        // Shake the fire emoji
        Animated.loop(
          Animated.sequence([
            Animated.timing(shakeAnim, {
              toValue: -3,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(shakeAnim, {
              toValue: 3,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(shakeAnim, {
              toValue: 0,
              duration: 100,
              useNativeDriver: true,
            }),
          ]),
          { iterations: 4 }
        ),
      ]).start();

      hapticSuccess();
    }
  }, [celebrate, isMilestone, streak]);

  const getStreakEmoji = () => {
    if (streak >= 100) return '👑';
    if (streak >= 30) return '💎';
    if (streak >= 14) return '⚡';
    if (streak >= 7) return '🔥';
    if (streak >= 3) return '✨';
    return '🌱';
  };

  const getStreakColor = () => {
    if (streak >= 30) return '#f59e0b'; // gold
    if (streak >= 14) return '#8b5cf6'; // purple
    if (streak >= 7) return '#ef4444'; // red-hot
    if (streak >= 3) return '#f97316'; // orange
    return '#16a34a'; // green
  };

  const getStreakLabel = () => {
    if (streak >= 100) return 'Efsane!';
    if (streak >= 30) return 'Harika!';
    if (streak >= 14) return 'Süper!';
    if (streak >= 7) return 'Mükemmel!';
    if (streak >= 3) return 'Güzel!';
    if (streak >= 1) return 'Başlangıç';
    return '';
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.4],
  });

  if (compact) {
    return (
      <Animated.View
        style={[
          styles.compactContainer,
          { backgroundColor: getStreakColor() + '20' },
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Animated.Text
          style={[
            styles.compactEmoji,
            { transform: [{ translateX: shakeAnim }] },
          ]}
        >
          {getStreakEmoji()}
        </Animated.Text>
        <Text style={[styles.compactCount, { color: getStreakColor() }]}>
          {streak}
        </Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[styles.container, { transform: [{ scale: scaleAnim }] }]}
    >
      {/* Glow ring */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            borderColor: getStreakColor(),
            opacity: glowOpacity,
          },
        ]}
      />

      {/* Badge */}
      <View
        style={[
          styles.badge,
          { backgroundColor: getStreakColor() + '15', borderColor: getStreakColor() + '30' },
        ]}
      >
        <Animated.Text
          style={[
            styles.emoji,
            { transform: [{ translateX: shakeAnim }] },
          ]}
        >
          {getStreakEmoji()}
        </Animated.Text>
        <Text style={[styles.streakCount, { color: getStreakColor() }]}>
          {streak}
        </Text>
        <Text style={styles.streakUnit}>gün seri</Text>
        {streak > 0 && (
          <Text style={[styles.streakLabel, { color: getStreakColor() }]}>
            {getStreakLabel()}
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
  },
  badge: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 24,
    borderWidth: 2,
    minWidth: 120,
  },
  emoji: {
    fontSize: 40,
    marginBottom: 4,
  },
  streakCount: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
  },
  streakUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  streakLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },
  // Compact
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  compactEmoji: {
    fontSize: 16,
  },
  compactCount: {
    fontSize: 15,
    fontWeight: '800',
  },
});
