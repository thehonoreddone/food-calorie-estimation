import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { OnboardingLayout, PrimaryButton } from '@/components/ui';
import { useUser, Gender } from '@/contexts/UserContext';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

const NEON_GREEN = '#2DD4A0';
const BG_CARD    = 'rgba(255,255,255,0.055)';
const BORDER     = 'rgba(255,255,255,0.10)';

const genderOptions: { value: Gender; label: string; icon: string }[] = [
  { value: 'male',   label: 'Erkek', icon: '👨' },
  { value: 'female', label: 'Kadın', icon: '👩' },
  { value: 'other',  label: 'Diğer', icon: '🧑' },
];

export default function GenderAgeScreen() {
  const { profile, updateProfile } = useUser();
  const [gender, setGender] = useState<Gender | undefined>(profile.gender);

  const handleGenderSelect = (value: Gender) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGender(value);
  };

  const handleContinue = () => {
    if (gender) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      updateProfile({ gender });
      router.push('/onboarding/birth-date');
    }
  };

  return (
    <OnboardingLayout
      stepKey="gender-age"
      title="Cinsiyetiniz nedir?"
      illustration={
        <View style={styles.iconBox}>
          <Text style={styles.iconEmoji}>🧑</Text>
        </View>
      }
    >
      <View style={styles.flex}>
        <Text style={styles.sectionLabel}>Cinsiyetinizi seçin</Text>

        <View style={styles.chipRow}>
          {genderOptions.map((option) => {
            const isSelected = gender === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => handleGenderSelect(option.value)}
                activeOpacity={0.75}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <Text style={styles.chipEmoji}>{option.icon}</Text>
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {option.label}
                </Text>
                {isSelected && <View style={styles.chipDot} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.spacer} />

        <TouchableOpacity
          onPress={handleContinue}
          disabled={!gender}
          activeOpacity={0.85}
          style={styles.btnWrap}
        >
          <LinearGradient
            colors={gender ? ['#4ade80', '#2DD4A0'] : ['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.04)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btn}
          >
            <Text style={[styles.btnText, !gender && styles.btnTextDisabled]}>Sonraki →</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
  iconEmoji: { fontSize: 38 },
  sectionLabel: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.50)',
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chip: {
    flex: 1,
    backgroundColor: BG_CARD,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.xs,
    position: 'relative',
  },
  chipSelected: {
    backgroundColor: 'rgba(45,212,160,0.12)',
    borderColor: 'rgba(45,212,160,0.45)',
  },
  chipEmoji: { fontSize: 28 },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.70)',
  },
  chipTextSelected: {
    color: NEON_GREEN,
    fontWeight: '700',
  },
  chipDot: {
    position: 'absolute',
    top: 8, right: 8,
    width: 10, height: 10,
    borderRadius: 5,
    backgroundColor: NEON_GREEN,
  },
  spacer: { flex: 1 },
  btnWrap: {
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
