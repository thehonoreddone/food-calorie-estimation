/**
 * SkeletonLoader — Shimmer loading placeholder
 * Shows animated shimmer effect while content is loading.
 * Replaces blank screens with elegant loading states.
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, Easing } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#e0e0e0',
          opacity,
        },
        style,
      ]}
    />
  );
};

/**
 * Pre-built skeleton layouts for common patterns
 */
export const SkeletonCard: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[styles.card, style]}>
    <Skeleton width={64} height={64} borderRadius={12} />
    <View style={styles.cardContent}>
      <Skeleton width="60%" height={18} />
      <Skeleton width="40%" height={14} style={{ marginTop: 8 }} />
      <Skeleton width="80%" height={14} style={{ marginTop: 6 }} />
    </View>
  </View>
);

export const SkeletonCalorieRing: React.FC = () => (
  <View style={styles.ringContainer}>
    <Skeleton width={200} height={200} borderRadius={100} />
    <View style={{ marginTop: 16, alignItems: 'center' }}>
      <Skeleton width={120} height={24} />
      <Skeleton width={80} height={16} style={{ marginTop: 8 }} />
    </View>
  </View>
);

export const SkeletonPredictionResult: React.FC = () => (
  <View style={styles.predictionContainer}>
    <Skeleton width="100%" height={200} borderRadius={16} />
    <View style={{ marginTop: 16 }}>
      <Skeleton width="50%" height={24} />
      <Skeleton width="70%" height={16} style={{ marginTop: 10 }} />
      <View style={styles.statsRow}>
        <Skeleton width="30%" height={50} borderRadius={12} />
        <Skeleton width="30%" height={50} borderRadius={12} />
        <Skeleton width="30%" height={50} borderRadius={12} />
      </View>
    </View>
  </View>
);

export const SkeletonHistoryList: React.FC = () => (
  <View>
    {[1, 2, 3, 4].map((i) => (
      <SkeletonCard key={i} style={{ marginBottom: 12 }} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  ringContainer: {
    alignItems: 'center',
    padding: 24,
  },
  predictionContainer: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
});
