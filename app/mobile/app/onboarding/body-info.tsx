import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { OnboardingLayout, PrimaryButton } from '@/components/ui';
import { useUser } from '@/contexts/UserContext';
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';

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
            <Text style={styles.label}>Boyunuz (cm)</Text>
            <View style={[styles.inputContainer, Shadows.sm]}>
              <TextInput
                style={styles.input}
                value={heightText}
                onChangeText={(text) => setHeightText(text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="170"
                placeholderTextColor={Colors.text.light}
                maxLength={3}
              />
              <Text style={styles.unit}>cm</Text>
            </View>
            {heightText.length > 0 && height >= 100 && height <= 250 && (
              <View style={styles.validRow}>
                <Text style={styles.validIcon}>✓</Text>
                <Text style={styles.validText}>Harika!</Text>
              </View>
            )}
          </View>

          {/* Weight */}
          <View style={styles.section}>
            <Text style={styles.label}>Kilonuz (kg)</Text>
            <View style={[styles.inputContainer, Shadows.sm]}>
              <TextInput
                style={styles.input}
                value={weightText}
                onChangeText={(text) => setWeightText(text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="70"
                placeholderTextColor={Colors.text.light}
                maxLength={3}
              />
              <Text style={styles.unit}>kg</Text>
            </View>
            {weightText.length > 0 && weight >= 30 && weight <= 300 && (
              <View style={styles.validRow}>
                <Text style={styles.validIcon}>✓</Text>
                <Text style={styles.validText}>Harika!</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Continue */}
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
  scrollContent: {
    paddingTop: Spacing.lg,
    gap: Spacing['2xl'],
  },
  section: {},
  label: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  inputContainer: {
    backgroundColor: '#FFF8F0',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: FontSize['2xl'],
    fontWeight: '700',
    color: Colors.text.primary,
  },
  unit: {
    fontSize: FontSize.lg,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  validRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    justifyContent: 'center',
  },
  validIcon: {
    color: Colors.success,
    fontSize: FontSize.base,
    fontWeight: '700',
    marginRight: Spacing.xs,
  },
  validText: {
    color: Colors.success,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  footer: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
});
