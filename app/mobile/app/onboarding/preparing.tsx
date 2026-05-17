import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '@/contexts/UserContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BG_DARK    = '#080E0C';
const NEON_GREEN = '#2DD4A0';

const STEPS = [
  { label: 'Kalori',       delay: 800  },
  { label: 'Karbonhidrat', delay: 1600 },
  { label: 'Protein',      delay: 2400 },
  { label: 'Yağ',          delay: 3200 },
  { label: 'Sağlık puanı', delay: 4000 },
];

const STATUS_MESSAGES = [
  { at: 0,  text: 'Profiliniz analiz ediliyor...' },
  { at: 20, text: 'Metabolik yaşınız hesaplanıyor...' },
  { at: 40, text: 'Günlük kalori hedefiniz belirleniyor...' },
  { at: 60, text: 'Makro besin değerleri hesaplanıyor...' },
  { at: 80, text: 'Kişisel planınız hazırlanıyor...' },
];

export default function PreparingScreen() {
  const { calculateMacros, updateProfile } = useUser();
  const [progress,      setProgress]      = useState(0);
  const [checkedSteps,  setCheckedSteps]  = useState<boolean[]>(new Array(STEPS.length).fill(false));
  const [statusMessage, setStatusMessage] = useState(STATUS_MESSAGES[0].text);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const stepAnims    = useRef(STEPS.map(() => new Animated.Value(0))).current;
  const orbAnim      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbAnim, { toValue: 1, duration: 8000, useNativeDriver: true }),
        Animated.timing(orbAnim, { toValue: 0, duration: 8000, useNativeDriver: true }),
      ])
    ).start();

    Animated.timing(progressAnim, { toValue: 1, duration: 4800, useNativeDriver: false }).start();

    const listener = progressAnim.addListener(({ value }) => {
      const pct = Math.round(value * 100);
      setProgress(pct);
      const msg = [...STATUS_MESSAGES].reverse().find(m => pct >= m.at);
      if (msg) setStatusMessage(msg.text);
    });

    STEPS.forEach((step, i) => {
      setTimeout(() => {
        Animated.spring(stepAnims[i], { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }).start();
        setCheckedSteps(prev => { const next = [...prev]; next[i] = true; return next; });
      }, step.delay);
    });

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

    return () => { progressAnim.removeListener(listener); clearTimeout(timer); };
  }, []);

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const orbY = orbAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });

  return (
    <View style={styles.root}>

      <View style={styles.container}>
        {/* Percentage */}
        <View style={styles.percentSection}>
          <Text style={styles.percentText}>{progress}%</Text>
          <Text style={styles.settingUpText}>Her şeyi sizin için{'\n'}ayarlıyoruz</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarTrack}>
            <Animated.View style={[styles.progressBarFill, { width: progressWidth }]}>
              <LinearGradient
                colors={['#4ade80', '#2DD4A0', '#06b6d4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
          <Text style={styles.statusMessage}>{statusMessage}</Text>
        </View>

        {/* Checklist */}
        <View style={styles.checklistCard}>
          <Text style={styles.checklistTitle}>Günlük öneriler</Text>
          {STEPS.map((step, i) => (
            <View key={i} style={styles.checklistRow}>
              <View style={[styles.bullet, checkedSteps[i] && styles.bulletActive]} />
              <Text style={[styles.checklistLabel, checkedSteps[i] && styles.checklistLabelActive]}>
                {step.label}
              </Text>
              <Animated.View
                style={[styles.checkCircle, checkedSteps[i] && styles.checkCircleActive, { transform: [{ scale: stepAnims[i] }] }]}
              >
                {checkedSteps[i] && <Text style={styles.checkMark}>✓</Text>}
              </Animated.View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_DARK, overflow: 'hidden' },
  container: {
    flex: 1, justifyContent: 'center', paddingHorizontal: 20,
  },
  percentSection: { alignItems: 'center', marginBottom: 32 },
  percentText: {
    fontSize: 80, fontWeight: '900', color: NEON_GREEN, letterSpacing: -2,
    textShadowColor: 'rgba(45,212,160,0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20,
  },
  settingUpText: {
    fontSize: 22, fontWeight: '800', color: '#F0FDF4',
    textAlign: 'center', lineHeight: 32, marginTop: 8,
  },
  progressBarContainer: { marginBottom: 32, alignItems: 'center' },
  progressBarTrack: {
    width: '100%', height: 8,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 4, overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 4, overflow: 'hidden' },
  statusMessage: {
    fontSize: 15, color: 'rgba(255,255,255,0.50)', marginTop: 16, fontWeight: '500',
  },
  checklistCard: {
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 20, padding: 20,
  },
  checklistTitle: {
    fontSize: 17, fontWeight: '700', color: '#F0FDF4', marginBottom: 20,
  },
  checklistRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
  },
  bullet: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.20)',
    marginRight: 14,
  },
  bulletActive: { backgroundColor: NEON_GREEN },
  checklistLabel: {
    flex: 1, fontSize: 15, color: 'rgba(255,255,255,0.55)', fontWeight: '500',
  },
  checklistLabelActive: { color: '#F0FDF4', fontWeight: '600' },
  checkCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  checkCircleActive: { backgroundColor: NEON_GREEN, borderColor: NEON_GREEN },
  checkMark: { color: '#030E08', fontSize: 16, fontWeight: '800' },
});
