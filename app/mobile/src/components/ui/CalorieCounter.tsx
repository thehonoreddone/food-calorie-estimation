/**
 * CalorieCounter — Animated calorie ring with fill animation
 * Displays daily calorie progress with a smooth circular fill animation.
 * Uses react-native-reanimated for 60fps performance.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { hapticSuccess } from '../../utils/haptics';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CalorieCounterProps {
  consumed: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
  showAnimation?: boolean;
}

export const CalorieCounter: React.FC<CalorieCounterProps> = ({
  consumed,
  goal,
  size = 200,
  strokeWidth = 14,
  showAnimation = true,
}) => {
  const progress = useSharedValue(0);
  const counterValue = useSharedValue(0);
  const scaleValue = useSharedValue(0.8);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(consumed / goal, 1);
  const remaining = Math.max(goal - consumed, 0);

  useEffect(() => {
    if (showAnimation) {
      progress.value = withDelay(
        300,
        withTiming(percentage, {
          duration: 1500,
          easing: Easing.out(Easing.cubic),
        })
      );
      counterValue.value = withDelay(
        300,
        withTiming(consumed, {
          duration: 1500,
          easing: Easing.out(Easing.cubic),
        })
      );
      scaleValue.value = withDelay(
        200,
        withTiming(1, {
          duration: 600,
          easing: Easing.out(Easing.back(1.2)),
        })
      );

      // Haptic when goal reached
      if (percentage >= 1) {
        setTimeout(() => hapticSuccess(), 1500);
      }
    } else {
      progress.value = percentage;
      counterValue.value = consumed;
      scaleValue.value = 1;
    }
  }, [consumed, goal, showAnimation]);

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
    opacity: interpolate(scaleValue.value, [0.8, 1], [0, 1]),
  }));

  const getProgressColor = () => {
    if (percentage >= 1) return '#ef4444'; // red — over
    if (percentage >= 0.8) return '#f59e0b'; // amber — almost there
    return '#16a34a'; // green — good
  };

  const getTrackColor = () => {
    if (percentage >= 1) return '#fecaca';
    return '#e2e8f0';
  };

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getTrackColor()}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getProgressColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedCircleProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* Center text */}
      <View style={[styles.centerContent, { width: size, height: size }]}>
        <Text style={styles.consumedValue}>{Math.round(consumed)}</Text>
        <Text style={styles.consumedLabel}>kcal</Text>
        <View style={styles.divider} />
        <Text style={styles.remainingValue}>
          {remaining > 0 ? `${Math.round(remaining)} kalan` : 'Hedefe ulaşıldı! 🎉'}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  consumedValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1a1a2e',
    letterSpacing: -1,
  },
  consumedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: -2,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
    borderRadius: 1,
  },
  remainingValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
});
