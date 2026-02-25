import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';
import { OnboardingLayout, PrimaryButton } from '@/components/ui';
import { useUser } from '@/contexts/UserContext';
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';

const paceLabels = ['Yavaş\nama emin', 'Yarı yolda', 'Mümkün olan\nen kısa sürede'];
const paceIcons = ['🐢', '🚴', '🚀'];

export default function TargetWeightScreen() {
  const { profile, updateProfile } = useUser();
  const [targetWeightText, setTargetWeightText] = useState('');
  const [pace, setPace] = useState(1); // 0=slow, 1=medium, 2=fast

  const targetWeight = parseInt(targetWeightText, 10);
  const isValid = targetWeight >= 30 && targetWeight <= 300;

  const goalTitle =
    profile.goal === 'lose'
      ? 'Burada kilo vermek için varsınız!'
      : profile.goal === 'gain'
      ? 'Burada kas kazanmak için varsınız!'
      : 'Burada kilomuzu korumak için varsınız!';

  const handleContinue = () => {
    if (isValid) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      updateProfile({ dailyCalorieTarget: undefined }); // will be calculated
      router.push('/onboarding/activity');
    }
  };

  return (
    <OnboardingLayout stepKey="target-weight" title={goalTitle}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        {/* Target Weight Input */}
        <View style={styles.section}>
          <Text style={styles.label}>İdeal kilonuz nedir?</Text>
          <View style={[styles.inputContainer, Shadows.sm]}>
            <TextInput
              style={styles.input}
              value={targetWeightText}
              onChangeText={(text) =>
                setTargetWeightText(text.replace(/[^0-9]/g, ''))
              }
              keyboardType="number-pad"
              placeholder="70"
              placeholderTextColor={Colors.text.light}
              maxLength={3}
            />
            <Text style={styles.unit}>kg</Text>
          </View>
          {isValid && (
            <View style={styles.validRow}>
              <Text style={styles.validIcon}>✓</Text>
              <Text style={styles.validText}>Harika!</Text>
            </View>
          )}
        </View>

        {/* Pace Slider */}
        <View style={styles.paceSection}>
          <Text style={styles.label}>
            Hedefinize hangi hızda ulaşmak istiyorsunuz?
          </Text>

          {/* Icons row */}
          <View style={styles.iconsRow}>
            {paceIcons.map((icon, idx) => (
              <Text
                key={idx}
                style={[
                  styles.paceIcon,
                  pace === idx && styles.paceIconActive,
                ]}
              >
                {icon}
              </Text>
            ))}
          </View>

          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={2}
            step={1}
            value={pace}
            onValueChange={(val) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setPace(Math.round(val));
            }}
            minimumTrackTintColor={Colors.accent.orange}
            maximumTrackTintColor={Colors.neutral[200]}
            thumbTintColor={Colors.accent.orange}
          />

          {/* Labels row */}
          <View style={styles.labelsRow}>
            {paceLabels.map((label, idx) => (
              <Text
                key={idx}
                style={[
                  styles.paceLabel,
                  pace === idx && styles.paceLabelActive,
                ]}
              >
                {label}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.spacer} />

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
  section: {
    marginTop: Spacing.lg,
  },
  label: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
    lineHeight: 28,
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
  paceSection: {
    marginTop: Spacing['3xl'],
  },
  iconsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  paceIcon: {
    fontSize: 28,
    opacity: 0.4,
  },
  paceIconActive: {
    opacity: 1,
    fontSize: 32,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paceLabel: {
    fontSize: FontSize.xs,
    color: Colors.text.light,
    textAlign: 'center',
    maxWidth: 80,
    lineHeight: 16,
  },
  paceLabelActive: {
    color: Colors.accent.orange,
    fontWeight: '700',
  },
  spacer: {
    flex: 1,
  },
  footer: {
    paddingBottom: Spacing['3xl'],
  },
});
