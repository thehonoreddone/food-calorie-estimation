import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width: W } = Dimensions.get('window');
const BG_DARK    = '#080E0C';
const NEON_GREEN = '#2DD4A0';
const ORB_GREEN  = 'rgba(45, 212, 160, 0.28)';
const ORB_PINK   = 'rgba(236, 72, 153, 0.18)';

export default function PrivacyScreen() {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const cardFade  = useRef(new Animated.Value(0)).current;

  const orbAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbAnim, { toValue: 1, duration: 8000, useNativeDriver: true }),
        Animated.timing(orbAnim, { toValue: 0, duration: 8000, useNativeDriver: true }),
      ])
    ).start();
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
      ]),
      Animated.timing(cardFade, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const orbY = orbAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });

  const handleContinue = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push('/onboarding/preparing');
  };

  return (
    <View style={styles.root}>
      {/* BG Orbs */}
      <Animated.View style={[styles.orbLarge, { backgroundColor: ORB_GREEN, transform: [{ translateY: orbY }] }]} />
      <Animated.View style={[styles.orbMed, { backgroundColor: ORB_PINK }]} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backCircle} activeOpacity={0.7}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={styles.progressWrapper}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '80%' }]} />
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* Illustration */}
          <Animated.View style={[styles.illustrationOuter, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.illustrationRing}>
              <View style={styles.illustrationInner}>
                <Text style={styles.handEmoji}>🤝</Text>
              </View>
            </View>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <View
                key={deg}
                style={[styles.dot, { transform: [{ rotate: `${deg}deg` }, { translateY: -85 }] }]}
              />
            ))}
          </Animated.View>

          {/* Title */}
          <Animated.View style={[styles.titleSection, { opacity: fadeAnim }]}>
            <Text style={styles.title}>Bize güvendiğiniz{'\n'}için teşekkürler!</Text>
            <Text style={styles.subtitle}>Şimdi Nutrino'yu sizin için kişiselleştirelim...</Text>
          </Animated.View>

          {/* Privacy Card */}
          <Animated.View style={[styles.privacyCard, { opacity: cardFade }]}>
            <Text style={styles.lockIcon}>🔐</Text>
            <Text style={styles.privacyTitle}>Gizliliğiniz ve güvenliğiniz bizim için önemlidir.</Text>
            <Text style={styles.privacyDesc}>
              Kişisel bilgilerinizi her zaman gizli ve güvenli tutacağımıza söz veriyoruz.
            </Text>
          </Animated.View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={handleContinue} activeOpacity={0.85} style={styles.btnWrap}>
            <LinearGradient
              colors={['#4ade80', '#2DD4A0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btn}
            >
              <Text style={styles.btnText}>Devam Et →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_DARK, overflow: 'hidden' },
  safe: { flex: 1 },
  orbLarge: {
    position: 'absolute', top: -70, left: -70,
    width: 220, height: 220, borderRadius: 110, opacity: 0.9,
  },
  orbMed: {
    position: 'absolute', top: '30%', left: -50,
    width: 150, height: 150, borderRadius: 75, opacity: 0.8,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12, gap: 12,
  },
  backCircle: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  backArrow: { fontSize: 20, color: '#F0FDF4', marginTop: -2 },
  progressWrapper: { flex: 1 },
  progressTrack: {
    height: 4, backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: NEON_GREEN, borderRadius: 2 },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 20 },
  illustrationOuter: {
    width: 180, height: 180,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 40,
  },
  illustrationRing: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(45,212,160,0.10)',
    borderWidth: 1, borderColor: 'rgba(45,212,160,0.20)',
    alignItems: 'center', justifyContent: 'center',
  },
  illustrationInner: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(45,212,160,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  handEmoji: { fontSize: 56 },
  dot: {
    position: 'absolute',
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: NEON_GREEN, opacity: 0.30,
  },
  titleSection: { alignItems: 'center', marginTop: 32, marginBottom: 20 },
  title: {
    fontSize: 28, fontWeight: '800', color: '#F0FDF4',
    textAlign: 'center', lineHeight: 38,
  },
  subtitle: {
    fontSize: 15, color: 'rgba(255,255,255,0.50)',
    textAlign: 'center', marginTop: 12,
  },
  privacyCard: {
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 20, padding: 20,
    alignItems: 'center', width: '100%',
  },
  lockIcon: { fontSize: 28, marginBottom: 12 },
  privacyTitle: {
    fontSize: 15, fontWeight: '700', color: '#F0FDF4',
    textAlign: 'center', lineHeight: 22,
  },
  privacyDesc: {
    fontSize: 13, color: 'rgba(255,255,255,0.50)',
    textAlign: 'center', marginTop: 8, lineHeight: 20,
  },
  footer: { paddingHorizontal: 20, paddingBottom: 32 },
  btnWrap: { borderRadius: 32, overflow: 'hidden' },
  btn: { paddingVertical: 20, alignItems: 'center', borderRadius: 32 },
  btnText: { fontSize: 17, fontWeight: '800', color: '#030E08' },
});
