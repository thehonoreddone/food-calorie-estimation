import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { OnboardingLayout } from '@/components/ui';
import { useUser } from '@/contexts/UserContext';
import { useTheme } from '@/contexts/ThemeContext';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { kgToLbs, lbsToKg, type UnitSystem } from '@/utils/unitConversion';

const NEON_GREEN = '#2DD4A0';

const paceLabels = ['Yavaş\nama emin', 'Yarı yolda', 'Mümkün olan\nen kısa sürede'];
const paceIcons  = ['🐢', '🚴', '🚀'];

export default function TargetWeightScreen() {
  const { profile, updateProfile } = useUser();
  const { settings } = useTheme();
  const unitSystem: UnitSystem = settings.unitSystem ?? 'metric';

  // Input state in user's display unit
  const [targetWeightText, setTargetWeightText] = useState('');
  const [pace, setPace] = useState(1);

  // Parse target weight → always kg for storage
  const rawNum = parseFloat(targetWeightText.replace(',', '.')) || 0;
  const targetWeightKg = unitSystem === 'imperial' ? lbsToKg(rawNum) : rawNum;

  const isValid = targetWeightKg >= 30 && targetWeightKg <= 300;

  const goalTitle =
    profile.goal === 'lose'
      ? 'Burada kilo vermek için varsınız!'
      : profile.goal === 'gain'
      ? 'Burada kas kazanmak için varsınız!'
      : 'Burada kilomuzu korumak için varsınız!';

  const handleContinue = () => {
    if (isValid) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      updateProfile({ targetWeight: targetWeightKg, dailyCalorieTarget: undefined });
      router.push('/onboarding/motivation');
    }
  };

  const weightLabel = unitSystem === 'imperial' ? 'lbs' : 'kg';
  const placeholder  = unitSystem === 'imperial' ? '154' : '70';

  return (
    <OnboardingLayout
      stepKey="target-weight"
      title={goalTitle}
      illustration={
        <View style={styles.iconBox}>
          <Text style={styles.iconEmoji}>🎯</Text>
        </View>
      }
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        {/* Target Weight */}
        <View style={styles.section}>
          <Text style={styles.label}>İdeal kilonuz nedir?</Text>
          <View style={styles.inputCard}>
            <TextInput
              style={styles.input}
              value={targetWeightText}
              onChangeText={t => setTargetWeightText(t.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              placeholder={placeholder}
              placeholderTextColor="rgba(255,255,255,0.20)"
              maxLength={6}
            />
            <View style={styles.unitBadge}>
              <Text style={styles.unitText}>{weightLabel}</Text>
            </View>
          </View>
          {isValid && (
            <View style={styles.validRow}>
              <View style={styles.validDot} />
              <Text style={styles.validText}>
                {unitSystem === 'imperial'
                  ? `≈ ${targetWeightKg} kg`
                  : 'Harika!'}
              </Text>
            </View>
          )}
        </View>

        {/* Pace */}
        <View style={styles.paceSection}>
          <Text style={styles.label}>Hedefinize hangi hızda ulaşmak istiyorsunuz?</Text>

          <View style={styles.iconsRow}>
            {paceIcons.map((icon, idx) => (
              <Text key={idx} style={[styles.paceIcon, pace === idx && styles.paceIconActive]}>
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
            minimumTrackTintColor={NEON_GREEN}
            maximumTrackTintColor="rgba(255,255,255,0.15)"
            thumbTintColor={NEON_GREEN}
          />

          <View style={styles.labelsRow}>
            {paceLabels.map((label, idx) => (
              <Text key={idx} style={[styles.paceLabel, pace === idx && styles.paceLabelActive]}>
                {label}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.spacer} />

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
  iconEmoji: { fontSize: 38 },
  section: { marginTop: Spacing.lg },
  label: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: '#F0FDF4',
    marginBottom: Spacing.md,
    lineHeight: 28,
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
    flexDirection: 'row', alignItems: 'center',
    marginTop: Spacing.sm, gap: Spacing.xs, paddingLeft: Spacing.sm,
  },
  validDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: NEON_GREEN },
  validText: { color: NEON_GREEN, fontSize: FontSize.sm, fontWeight: '600' },
  paceSection: { marginTop: Spacing['3xl'] },
  iconsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, marginBottom: Spacing.xs,
  },
  paceIcon: { fontSize: 28, opacity: 0.35 },
  paceIconActive: { opacity: 1, fontSize: 32 },
  slider: { width: '100%', height: 40 },
  labelsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  paceLabel: {
    fontSize: FontSize.xs, color: 'rgba(255,255,255,0.35)',
    textAlign: 'center', maxWidth: 80, lineHeight: 16,
  },
  paceLabelActive: { color: NEON_GREEN, fontWeight: '700' },
  spacer: { flex: 1 },
  btnWrap: {
    marginBottom: Spacing['3xl'],
    borderRadius: BorderRadius['3xl'],
    overflow: 'hidden',
  },
  btn: {
    paddingVertical: Spacing.xl, alignItems: 'center',
    borderRadius: BorderRadius['3xl'],
  },
  btnText: { fontSize: FontSize.lg, fontWeight: '800', color: '#030E08' },
  btnTextDisabled: { color: 'rgba(255,255,255,0.30)' },
});
