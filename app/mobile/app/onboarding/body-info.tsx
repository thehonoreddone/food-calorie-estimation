import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { OnboardingLayout } from '@/components/ui';
import { useUser } from '@/contexts/UserContext';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

const NEON_GREEN = '#2DD4A0';

export default function BodyInfoScreen() {
  const { profile, updateProfile } = useUser();
  const [heightText, setHeightText] = useState(
    profile.height ? String(profile.height) : ''
  );
  const [weightText, setWeightText] = useState(
    profile.weight ? String(profile.weight) : ''
  );

  const height = parseInt(heightText, 10);
  const weight = parseInt(weightText, 10);
  const isValid =
    height >= 100 && height <= 250 && weight >= 30 && weight <= 300;

  const handleContinue = () => {
    if (isValid) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      updateProfile({ height, weight });
      router.push('/onboarding/target-weight');
    }
  };

  return (
    <OnboardingLayout
      stepKey="body-info"
      title="Fiziksel bilgileriniz"
      subtitle="Günlük kalori ihtiyacınızı hesaplamak için"
      illustration={
        <View style={styles.iconBox}>
          <Text style={styles.iconEmoji}>📏</Text>
        </View>
      }
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Height */}
          <View style={styles.section}>
            <Text style={styles.label}>Boyunuz</Text>
            <View style={styles.inputCard}>
              <TextInput
                style={styles.input}
                value={heightText}
                onChangeText={(text) => setHeightText(text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="170"
                placeholderTextColor="rgba(255,255,255,0.20)"
                maxLength={3}
              />
              <View style={styles.unitBadge}>
                <Text style={styles.unitText}>cm</Text>
              </View>
            </View>
            {heightText.length > 0 && height >= 100 && height <= 250 && (
              <View style={styles.validRow}>
                <View style={styles.validDot} />
                <Text style={styles.validText}>Harika!</Text>
              </View>
            )}
          </View>

          {/* Weight */}
          <View style={styles.section}>
            <Text style={styles.label}>Kilonuz</Text>
            <View style={styles.inputCard}>
              <TextInput
                style={styles.input}
                value={weightText}
                onChangeText={(text) => setWeightText(text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="70"
                placeholderTextColor="rgba(255,255,255,0.20)"
                maxLength={3}
              />
              <View style={styles.unitBadge}>
                <Text style={styles.unitText}>kg</Text>
              </View>
            </View>
            {weightText.length > 0 && weight >= 30 && weight <= 300 && (
              <View style={styles.validRow}>
                <View style={styles.validDot} />
                <Text style={styles.validText}>Harika!</Text>
              </View>
            )}
          </View>
        </ScrollView>

        <TouchableOpacity
          onPress={handleContinue}
          disabled={!isValid}
          activeOpacity={0.85}
          style={styles.btnWrap}
        >
          <LinearGradient
            colors={isValid ? ['#4ade80', '#2DD4A0'] : ['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.04)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btn}
          >
            <Text style={[styles.btnText, !isValid && styles.btnTextDisabled]}>Sonraki →</Text>
          </LinearGradient>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  iconBox: {
    width: 76, height: 76, borderRadius: 20,
    backgroundColor: 'rgba(45,212,160,0.13)',
    borderWidth: 1, borderColor: 'rgba(45,212,160,0.28)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: NEON_GREEN, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  iconEmoji: { fontSize: 36 },
  scrollContent: {
    paddingTop: Spacing.lg,
    gap: Spacing['2xl'],
    paddingBottom: Spacing.lg,
  },
  section: {},
  label: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: '#F0FDF4',
    marginBottom: Spacing.md,
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  input: {
    flex: 1,
    fontSize: FontSize['3xl'],
    fontWeight: '700',
    color: '#F0FDF4',
  },
  unitBadge: {
    backgroundColor: 'rgba(45,212,160,0.15)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  unitText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: NEON_GREEN,
  },
  validRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.xs,
    paddingLeft: Spacing.sm,
  },
  validDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: NEON_GREEN,
  },
  validText: {
    color: NEON_GREEN,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  btnWrap: {
    marginTop: Spacing.lg,
    marginBottom: Spacing['3xl'],
    borderRadius: BorderRadius['3xl'],
    overflow: 'hidden',
  },
  btn: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    borderRadius: BorderRadius['3xl'],
  },
  btnText: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: '#030E08',
  },
  btnTextDisabled: {
    color: 'rgba(255,255,255,0.30)',
  },
});
