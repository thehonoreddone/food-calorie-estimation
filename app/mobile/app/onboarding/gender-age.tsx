import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { OnboardingLayout, PrimaryButton } from '@/components/ui';
import { useUser, Gender } from '@/contexts/UserContext';
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';

const genderOptions: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Erkek' },
  { value: 'female', label: 'Kadın' },
  { value: 'other', label: 'Non-binary' },
];

export default function GenderAgeScreen() {
  const { profile, updateProfile } = useUser();
  const [gender, setGender] = useState<Gender | undefined>(profile.gender);
  const [ageText, setAgeText] = useState(profile.age ? String(profile.age) : '');

  const handleGenderSelect = (value: Gender) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGender(value);
  };

  const handleContinue = () => {
    const age = parseInt(ageText, 10);
    if (gender && age >= 14 && age <= 100) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      updateProfile({ gender, age });
      router.push('/onboarding/body-info');
    }
  };

  const isValid = gender && ageText && parseInt(ageText, 10) >= 14;

  return (
    <OnboardingLayout stepKey="gender-age" title="Cinsiyetiniz nedir?">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        {/* Gender Chips */}
        <View style={styles.chipRow}>
          {genderOptions.map((option) => {
            const isSelected = gender === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => handleGenderSelect(option.value)}
                activeOpacity={0.7}
                style={[
                  styles.chip,
                  isSelected && styles.chipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Age Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kaç yaşındasınız?</Text>
          <View style={[styles.inputContainer, Shadows.sm]}>
            <TextInput
              style={styles.input}
              value={ageText}
              onChangeText={(text) => setAgeText(text.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="25"
              placeholderTextColor={Colors.text.light}
              maxLength={3}
            />
          </View>
        </View>

        <View style={styles.spacer} />

        {/* Continue Button */}
        <View style={styles.footer}>
          <PrimaryButton
            title="Sonraki"
            onPress={handleContinue}
            disabled={!isValid}
          />
        </View>
      </KeyboardAvoidingView>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  chip: {
    flex: 1,
    backgroundColor: Colors.neutral[100],
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: Colors.accent.orange + '18',
    borderColor: Colors.accent.orange,
  },
  chipText: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  chipTextSelected: {
    color: Colors.accent.orange,
    fontWeight: '700',
  },
  section: {
    marginTop: Spacing['3xl'],
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
  },
  inputContainer: {
    backgroundColor: '#FFF8F0',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  input: {
    fontSize: FontSize['2xl'],
    fontWeight: '700',
    color: Colors.text.primary,
  },
  spacer: {
    flex: 1,
  },
  footer: {
    paddingBottom: Spacing['3xl'],
  },
});
