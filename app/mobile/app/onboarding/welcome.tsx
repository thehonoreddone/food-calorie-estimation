import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { PrimaryButton } from '@/components/ui';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      {/* Decorative food elements */}
      <View style={styles.decoTopLeft}>
        <Text style={styles.decoEmoji}>🥗</Text>
      </View>
      <View style={styles.decoTopRight}>
        <Text style={styles.decoEmojiLarge}>🥦</Text>
      </View>
      <View style={styles.decoMidLeft}>
        <Text style={styles.decoEmojiLarge}>🍊</Text>
      </View>
      <View style={styles.decoBottomRight}>
        <Text style={styles.decoEmoji}>🌻</Text>
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Middle: Brand */}
        <View style={styles.center}>
          {/* Mascot / Logo */}
          <View style={styles.mascotContainer}>
            <Text style={styles.mascotEmoji}>🥑</Text>
          </View>

          <Text style={styles.appName}>nutrino</Text>
          <Text style={styles.tagline}>
            Motivasyonlarınız ne{'\n'}olursa olsun, beslenme{'\n'}rehberiniz
          </Text>
        </View>

        {/* Bottom: CTA */}
        <View style={styles.bottomSection}>
          <PrimaryButton
            title="Başla"
            onPress={() => router.push('/onboarding/goal')}
            style={styles.startButton}
          />

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Zaten bir hesabınız var mı?</Text>
            <PrimaryButton
              title="Giriş yap"
              variant="ghost"
              size="sm"
              onPress={() => router.replace('/auth/login')}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF8',
    position: 'relative',
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  // Decorative floating food emojis
  decoTopLeft: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.12,
    left: SCREEN_WIDTH * 0.08,
  },
  decoTopRight: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.08,
    right: -10,
    backgroundColor: '#2d6a4f',
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.85,
  },
  decoMidLeft: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.38,
    left: -20,
    backgroundColor: '#ff6b35',
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
  },
  decoBottomRight: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.35,
    right: SCREEN_WIDTH * 0.15,
  },
  decoEmoji: {
    fontSize: 48,
  },
  decoEmojiLarge: {
    fontSize: 44,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['3xl'],
  },
  mascotContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  mascotEmoji: {
    fontSize: 56,
  },
  appName: {
    fontSize: FontSize['4xl'],
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: -1,
    marginBottom: Spacing.md,
  },
  tagline: {
    fontSize: FontSize.lg,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '400',
  },
  bottomSection: {
    paddingHorizontal: Spacing['3xl'],
    paddingBottom: Spacing.lg,
    alignItems: 'center',
  },
  startButton: {
    width: '60%',
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  loginText: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
});
