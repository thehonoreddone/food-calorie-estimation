/**
 * FoodRecognitionAnimation — Scanning/analyzing animation
 * Shows a pulsing scan effect while the AI processes the food image.
 * Creates an engaging waiting experience for the user.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

interface FoodRecognitionAnimationProps {
  /** Current stage of recognition */
  stage: 'scanning' | 'analyzing' | 'complete';
  /** Food class name (shown after recognition) */
  foodName?: string;
}

export const FoodRecognitionAnimation: React.FC<
  FoodRecognitionAnimationProps
> = ({ stage, foodName }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (stage === 'scanning') {
      // Pulse icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Scan line sweep
      Animated.loop(
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      ).start();

      // Expanding rings
      const startRing = (anim: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 2000,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        );
      startRing(ring1, 0).start();
      startRing(ring2, 700).start();
      startRing(ring3, 1400).start();
    }

    if (stage === 'analyzing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }

    if (stage === 'complete') {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [stage]);

  const renderRing = (anim: Animated.Value) => {
    const scale = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 2],
    });
    const opacity = anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.6, 0.3, 0],
    });
    return (
      <Animated.View
        style={[
          styles.ring,
          { transform: [{ scale }], opacity },
        ]}
      />
    );
  };

  const scanLineTranslate = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 60],
  });

  const stageLabels = {
    scanning: '🔍 Yemek taranıyor...',
    analyzing: '🧠 AI analiz ediyor...',
    complete: '✅ Tanıma tamamlandı!',
  };

  return (
    <View style={styles.container}>
      {/* Expanding rings (scanning only) */}
      {stage === 'scanning' && (
        <View style={styles.ringsContainer}>
          {renderRing(ring1)}
          {renderRing(ring2)}
          {renderRing(ring3)}
        </View>
      )}

      {/* Main icon */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <View style={styles.iconContainer}>
          {stage === 'scanning' && (
            <>
              <Text style={styles.mainEmoji}>📸</Text>
              {/* Scan line */}
              <Animated.View
                style={[
                  styles.scanLine,
                  { transform: [{ translateY: scanLineTranslate }] },
                ]}
              />
            </>
          )}
          {stage === 'analyzing' && <Text style={styles.mainEmoji}>🍽️</Text>}
          {stage === 'complete' && (
            <Animated.Text
              style={[styles.mainEmoji, { opacity: fadeAnim }]}
            >
              ✨
            </Animated.Text>
          )}
        </View>
      </Animated.View>

      {/* Stage label */}
      <Text style={styles.stageLabel}>{stageLabels[stage]}</Text>

      {/* Food name (complete stage) */}
      {stage === 'complete' && foodName && (
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.foodName}>{foodName}</Text>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  ringsContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#16a34a',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#16a34a40',
  },
  mainEmoji: {
    fontSize: 40,
  },
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 3,
    backgroundColor: '#16a34a',
    opacity: 0.6,
    borderRadius: 2,
  },
  stageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginTop: 20,
  },
  foodName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#16a34a',
    marginTop: 8,
  },
});
