import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { OnboardingLayout, PrimaryButton } from '@/components/ui';
import { useUser, Gender } from '@/contexts/UserContext';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';

const genderOptions: { value: Gender; label: string; icon: string }[] = [
  { value: 'male', label: 'Erkek', icon: '👨' },
  { value: 'female', label: 'Kadın', icon: '👩' },
  { value: 'other', label: 'Diğer', icon: '🧑' },
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
    <OnboardingLayout stepKey="gender-age" title="Cinsiyetiniz nedir?">
      <View style={styles.flex}>
        <Text style={styles.sectionTitle}>Cinsiyetiniz</Text>
        <View style={styles.chipRow}>
          {genderOptions.map((option) => {
            const isSelected = gender === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => handleGenderSelect(option.value)}
                activeOpacity={0.7}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <Text style={styles.chipEmoji}>{option.icon}</Text>
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.spacer} />

        <View style={styles.footer}>
          <PrimaryButton
            title="Sonraki"
            onPress={handleContinue}
            disabled={!gender}
          />
        </View>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xl,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  chip: {
    flex: 1,
    backgroundColor: Colors.neutral[100],
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: Spacing.xs,
  },
  chipSelected: {
    backgroundColor: Colors.primary[50],
    borderColor: Colors.primary[500],
  },
  chipEmoji: {
    fontSize: 28,
  },
  chipText: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  chipTextSelected: {
    color: Colors.primary[700],
    fontWeight: '700',
  },
  spacer: {
    flex: 1,
  },
  footer: {
    paddingBottom: Spacing['3xl'],
  },
});
