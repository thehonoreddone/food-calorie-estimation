import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/ui';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';

export default function PrivacyScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const cardFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(cardFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim, cardFade]);

  const handleContinue = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push('/onboarding/preparing');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.backCircle}>
          <Text style={styles.backArrow} onPress={() => router.back()}>←</Text>
        </View>
        <View style={styles.progressWrapper}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '80%' }]} />
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* Illustration */}
        <Animated.View
          style={[
            styles.illustrationOuter,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={styles.illustrationRing}>
            <View style={styles.illustrationInner}>
              <Text style={styles.handEmoji}>🤝</Text>
            </View>
          </View>
          {/* Decorative dots */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <View
              key={deg}
              style={[
                styles.dot,
                {
                  transform: [
                    { rotate: `${deg}deg` },
                    { translateY: -85 },
                  ],
                },
              ]}
            />
          ))}
        </Animated.View>

        {/* Title */}
        <Animated.View style={[styles.titleSection, { opacity: fadeAnim }]}>
          <Text style={styles.title}>
            Bize güvendiğiniz{'\n'}için teşekkürler!
          </Text>
          <Text style={styles.subtitle}>
            Şimdi Nutrino'yu sizin için kişiselleştirelim...
          </Text>
        </Animated.View>

        {/* Privacy Card */}
        <Animated.View style={[styles.privacyCard, { opacity: cardFade }]}>
          <Text style={styles.lockIcon}>🔐</Text>
          <Text style={styles.privacyTitle}>
            Gizliliğiniz ve güvenliğiniz bizim için önemlidir.
          </Text>
          <Text style={styles.privacyDesc}>
            Kişisel bilgilerinizi her zaman gizli ve güvenli tutacağımıza söz veriyoruz.
          </Text>
        </Animated.View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <PrimaryButton
          title="Devam Et"
          onPress={handleContinue}
          style={styles.continueBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: Colors.text.primary,
    marginTop: -2,
  },
  progressWrapper: { flex: 1 },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.neutral[200],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.text.primary,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  illustrationOuter: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing['4xl'],
  },
  illustrationRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  handEmoji: {
    fontSize: 56,
  },
  dot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.text.primary,
    opacity: 0.15,
  },
  titleSection: {
    alignItems: 'center',
    marginTop: Spacing['3xl'],
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize['3xl'],
    fontWeight: '800',
    color: Colors.text.primary,
    textAlign: 'center',
    lineHeight: 40,
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  privacyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  lockIcon: {
    fontSize: 28,
    marginBottom: Spacing.md,
  },
  privacyTitle: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
    lineHeight: 22,
  },
  privacyDesc: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['3xl'],
  },
  continueBtn: {
    borderRadius: 28,
  },
});
