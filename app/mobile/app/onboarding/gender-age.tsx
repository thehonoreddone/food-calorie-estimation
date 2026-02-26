import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { OnboardingLayout, PrimaryButton } from '@/components/ui';
import { useUser, Gender } from '@/contexts/UserContext';
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';

const genderOptions: { value: Gender; label: string; icon: string }[] = [
  { value: 'male', label: 'Erkek', icon: '👨' },
  { value: 'female', label: 'Kadın', icon: '👩' },
  { value: 'other', label: 'Diğer', icon: '🧑' },
];

export default function GenderAgeScreen() {
  const { profile, updateProfile } = useUser();
  const [gender, setGender] = useState<Gender | undefined>(profile.gender);

  // Birth date fields
  const existingDate = profile.birthDate ? new Date(profile.birthDate) : null;
  const [day, setDay] = useState(existingDate ? String(existingDate.getDate()) : '');
  const [month, setMonth] = useState(existingDate ? String(existingDate.getMonth() + 1) : '');
  const [year, setYear] = useState(existingDate ? String(existingDate.getFullYear()) : '');

  const handleGenderSelect = (value: Gender) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGender(value);
  };

  const parsedDay = parseInt(day, 10);
  const parsedMonth = parseInt(month, 10);
  const parsedYear = parseInt(year, 10);

  const isValidDate =
    parsedDay >= 1 && parsedDay <= 31 &&
    parsedMonth >= 1 && parsedMonth <= 12 &&
    parsedYear >= 1920 && parsedYear <= new Date().getFullYear() - 13;

  const isValid = !!gender && isValidDate;

  const handleContinue = () => {
    if (isValid) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const birthDate = `${parsedYear}-${String(parsedMonth).padStart(2, '0')}-${String(parsedDay).padStart(2, '0')}`;
      const today = new Date();
      let calcAge = today.getFullYear() - parsedYear;
      const mDiff = today.getMonth() + 1 - parsedMonth;
      if (mDiff < 0 || (mDiff === 0 && today.getDate() < parsedDay)) calcAge--;
      updateProfile({ gender, birthDate, age: calcAge });
      router.push('/onboarding/body-info');
    }
  };

  return (
    <OnboardingLayout stepKey="gender-age" title="Kişisel Bilgileriniz">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Gender Chips */}
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

          {/* Birth Date Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Doğum Tarihiniz</Text>
            <Text style={styles.sectionSubtitle}>
              Yaşınızı otomatik hesaplayacağız
            </Text>
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>Gün</Text>
                <View style={[styles.dateInputContainer, Shadows.sm]}>
                  <TextInput
                    style={styles.dateInput}
                    value={day}
                    onChangeText={(t) => setDay(t.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    placeholder="15"
                    placeholderTextColor={Colors.text.light}
                    maxLength={2}
                  />
                </View>
              </View>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>Ay</Text>
                <View style={[styles.dateInputContainer, Shadows.sm]}>
                  <TextInput
                    style={styles.dateInput}
                    value={month}
                    onChangeText={(t) => setMonth(t.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    placeholder="06"
                    placeholderTextColor={Colors.text.light}
                    maxLength={2}
                  />
                </View>
              </View>
              <View style={styles.dateFieldLarge}>
                <Text style={styles.dateLabel}>Yıl</Text>
                <View style={[styles.dateInputContainer, Shadows.sm]}>
                  <TextInput
                    style={styles.dateInput}
                    value={year}
                    onChangeText={(t) => setYear(t.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    placeholder="1998"
                    placeholderTextColor={Colors.text.light}
                    maxLength={4}
                  />
                </View>
              </View>
            </View>

            {isValidDate && (
              <View style={styles.agePreview}>
                <Text style={styles.agePreviewText}>
                  🎂 {(() => {
                    const today = new Date();
                    let a = today.getFullYear() - parsedYear;
                    const m = today.getMonth() + 1 - parsedMonth;
                    if (m < 0 || (m === 0 && today.getDate() < parsedDay)) a--;
                    return a;
                  })()} yaşındasınız
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

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
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xl,
  },
  sectionSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.lg,
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
  section: {
    marginTop: Spacing['2xl'],
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  dateField: {
    flex: 1,
  },
  dateFieldLarge: {
    flex: 1.4,
  },
  dateLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  dateInputContainer: {
    backgroundColor: '#FFF8F0',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  dateInput: {
    fontSize: FontSize['2xl'],
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
    width: '100%',
  },
  agePreview: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary[50],
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  agePreviewText: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.primary[700],
  },
  spacer: {
    flex: 1,
  },
  footer: {
    paddingBottom: Spacing['3xl'],
  },
});
