import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '@/contexts/UserContext';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STEPS = [
  { label: 'Kalori', delay: 800 },
  { label: 'Karbonhidrat', delay: 1600 },
  { label: 'Protein', delay: 2400 },
  { label: 'Yağ', delay: 3200 },
  { label: 'Sağlık puanı', delay: 4000 },
];

const STATUS_MESSAGES = [
  { at: 0, text: 'Profiliniz analiz ediliyor...' },
  { at: 20, text: 'Metabolik yaşınız hesaplanıyor...' },
  { at: 40, text: 'Günlük kalori hedefiniz belirleniyor...' },
  { at: 60, text: 'Makro besin değerleri hesaplanıyor...' },
  { at: 80, text: 'Kişisel planınız hazırlanıyor...' },
];

export default function PreparingScreen() {
  const { profile, calculateMacros, updateProfile } = useUser();
  const [progress, setProgress] = useState(0);
  const [checkedSteps, setCheckedSteps] = useState<boolean[]>(new Array(STEPS.length).fill(false));
  const [statusMessage, setStatusMessage] = useState(STATUS_MESSAGES[0].text);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const percentAnim = useRef(new Animated.Value(0)).current;
  const stepAnims = useRef(STEPS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 4800,
      useNativeDriver: false,
    }).start();

    // Track progress value for percentage display
    const listener = progressAnim.addListener(({ value }) => {
      const pct = Math.round(value * 100);
      setProgress(pct);

      // Update status message
      const msg = [...STATUS_MESSAGES].reverse().find(m => pct >= m.at);
      if (msg) setStatusMessage(msg.text);
    });

    // Animate each step checkmark
    STEPS.forEach((step, i) => {
      setTimeout(() => {
        Animated.spring(stepAnims[i], {
          toValue: 1,
          friction: 6,
          tension: 60,
          useNativeDriver: true,
        }).start();
        setCheckedSteps(prev => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, step.delay);
    });

    // Calculate macros and save to profile, then navigate
    const timer = setTimeout(() => {
      const macros = calculateMacros();
      updateProfile({
        dailyCalorieTarget: macros.calories,
        dailyProtein: macros.protein,
        dailyCarbs: macros.carbs,
        dailyFat: macros.fat,
        healthScore: macros.healthScore,
      });
      router.replace('/onboarding/plan-ready');
    }, 5200);

    return () => {
      progressAnim.removeListener(listener);
      clearTimeout(timer);
    };
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Percentage */}
      <View style={styles.percentSection}>
        <Text style={styles.percentText}>{progress}%</Text>
        <Text style={styles.settingUpText}>
          Her şeyi sizin için{'\n'}ayarlıyoruz
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarTrack}>
          <Animated.View style={[styles.progressBarFill, { width: progressWidth }]}>
            <LinearGradient
              colors={['#ef4444', '#f97316', '#8b5cf6', '#3b82f6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
        <Text style={styles.statusMessage}>{statusMessage}</Text>
      </View>

      {/* Recommendation checklist */}
      <View style={styles.checklistCard}>
        <Text style={styles.checklistTitle}>Günlük öneriler</Text>

        {STEPS.map((step, i) => (
          <View key={i} style={styles.checklistRow}>
            <Text style={styles.checklistDot}>•</Text>
            <Text style={styles.checklistLabel}>{step.label}</Text>
            <Animated.View
              style={[
                styles.checkCircle,
                checkedSteps[i] && styles.checkCircleActive,
                { transform: [{ scale: stepAnims[i] }] },
              ]}
            >
              {checkedSteps[i] && (
                <Text style={styles.checkMark}>✓</Text>
              )}
            </Animated.View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  percentSection: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  percentText: {
    fontSize: 72,
    fontWeight: '900',
    color: Colors.text.primary,
    letterSpacing: -2,
  },
  settingUpText: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: Colors.text.primary,
    textAlign: 'center',
    lineHeight: 32,
    marginTop: Spacing.sm,
  },
  progressBarContainer: {
    marginBottom: Spacing['3xl'],
    alignItems: 'center',
  },
  progressBarTrack: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.neutral[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  statusMessage: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    marginTop: Spacing.lg,
    fontWeight: '500',
  },
  checklistCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  checklistTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.xl,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  checklistDot: {
    fontSize: FontSize.lg,
    color: Colors.text.secondary,
    marginRight: Spacing.md,
  },
  checklistLabel: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleActive: {
    backgroundColor: Colors.text.primary,
  },
  checkMark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
