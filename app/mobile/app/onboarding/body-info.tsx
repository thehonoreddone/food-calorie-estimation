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
import { useTheme } from '@/contexts/ThemeContext';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';
import {
  kgToLbs, lbsToKg, cmToFtIn, ftInToCm,
  type UnitSystem,
} from '@/utils/unitConversion';

const NEON_GREEN = '#2DD4A0';

export default function BodyInfoScreen() {
  const { profile, updateProfile } = useUser();
  const { settings, updateSettings } = useTheme();
  const unitSystem: UnitSystem = settings.unitSystem ?? 'metric';

  // ─── Internal state (always stored in metric) ───────────────────────────────
  // Height fields
  const initCm = profile.height ?? 170;
  const initFtIn = cmToFtIn(initCm);

  const [heightCmText, setHeightCmText] = useState(String(initCm));
  const [heightFtText,  setHeightFtText]  = useState(String(initFtIn.ft));
  const [heightInText,  setHeightInText]  = useState(String(initFtIn.inches));

  // Weight fields
  const initKg = profile.weight ?? 70;
  const [weightKgText,  setWeightKgText]  = useState(String(initKg));
  const [weightLbsText, setWeightLbsText] = useState(String(kgToLbs(initKg)));

  // ─── Derived metric values ───────────────────────────────────────────────────
  const heightCm: number =
    unitSystem === 'imperial'
      ? ftInToCm(parseInt(heightFtText, 10) || 0, parseInt(heightInText, 10) || 0)
      : parseInt(heightCmText, 10) || 0;

  const weightKg: number =
    unitSystem === 'imperial'
      ? lbsToKg(parseFloat(weightLbsText.replace(',', '.')) || 0)
      : parseInt(weightKgText, 10) || 0;

  const isHeightValid = heightCm >= 100 && heightCm <= 250;
  const isWeightValid = weightKg >= 30 && weightKg <= 300;
  const isValid = isHeightValid && isWeightValid;

  // ─── Unit toggle ─────────────────────────────────────────────────────────────
  const toggleUnit = () => {
    const next: UnitSystem = unitSystem === 'metric' ? 'imperial' : 'metric';
    updateSettings({ unitSystem: next });

    if (next === 'imperial') {
      // Convert current metric values → imperial display
      const ftIn = cmToFtIn(parseInt(heightCmText, 10) || 170);
      setHeightFtText(String(ftIn.ft));
      setHeightInText(String(ftIn.inches));
      const lbs = kgToLbs(parseInt(weightKgText, 10) || 70);
      setWeightLbsText(String(lbs));
    } else {
      // Convert current imperial inputs → metric display
      const cm = ftInToCm(parseInt(heightFtText, 10) || 5, parseInt(heightInText, 10) || 7);
      setHeightCmText(String(cm));
      const kg = lbsToKg(parseFloat(weightLbsText) || 154);
      setWeightKgText(String(kg));
    }
  };

  // ─── Continue ────────────────────────────────────────────────────────────────
  const handleContinue = () => {
    if (isValid) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      updateProfile({ height: heightCm, weight: weightKg });
      router.push('/onboarding/target-weight');
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
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
          {/* ── Unit toggle ── */}
          <View style={styles.unitToggleRow}>
            <TouchableOpacity
              onPress={toggleUnit}
              style={[
                styles.unitToggle,
                unitSystem === 'metric' && styles.unitToggleActive,
              ]}
            >
              <Text style={[styles.unitToggleText, unitSystem === 'metric' && styles.unitToggleTextActive]}>
                kg / cm
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={toggleUnit}
              style={[
                styles.unitToggle,
                unitSystem === 'imperial' && styles.unitToggleActive,
              ]}
            >
              <Text style={[styles.unitToggleText, unitSystem === 'imperial' && styles.unitToggleTextActive]}>
                lbs / ft
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Height ── */}
          <View style={styles.section}>
            <Text style={styles.label}>Boyunuz</Text>

            {unitSystem === 'metric' ? (
              <View style={styles.inputCard}>
                <TextInput
                  style={styles.input}
                  value={heightCmText}
                  onChangeText={t => setHeightCmText(t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="170"
                  placeholderTextColor="rgba(255,255,255,0.20)"
                  maxLength={3}
                />
                <View style={styles.unitBadge}>
                  <Text style={styles.unitText}>cm</Text>
                </View>
              </View>
            ) : (
              <View style={styles.imperialRow}>
                <View style={[styles.inputCard, { flex: 1 }]}>
                  <TextInput
                    style={styles.input}
                    value={heightFtText}
                    onChangeText={t => setHeightFtText(t.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    placeholder="5"
                    placeholderTextColor="rgba(255,255,255,0.20)"
                    maxLength={1}
                  />
                  <View style={styles.unitBadge}>
                    <Text style={styles.unitText}>ft</Text>
                  </View>
                </View>
                <View style={[styles.inputCard, { flex: 1 }]}>
                  <TextInput
                    style={styles.input}
                    value={heightInText}
                    onChangeText={t => setHeightInText(t.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    placeholder="7"
                    placeholderTextColor="rgba(255,255,255,0.20)"
                    maxLength={2}
                  />
                  <View style={styles.unitBadge}>
                    <Text style={styles.unitText}>in</Text>
                  </View>
                </View>
              </View>
            )}

            {isHeightValid && (
              <View style={styles.validRow}>
                <View style={styles.validDot} />
                <Text style={styles.validText}>
                  {unitSystem === 'imperial' ? `${heightCm} cm` : 'Harika!'}
                </Text>
              </View>
            )}
          </View>

          {/* ── Weight ── */}
          <View style={styles.section}>
            <Text style={styles.label}>Kilonuz</Text>
            <View style={styles.inputCard}>
              {unitSystem === 'metric' ? (
                <TextInput
                  style={styles.input}
                  value={weightKgText}
                  onChangeText={t => setWeightKgText(t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="70"
                  placeholderTextColor="rgba(255,255,255,0.20)"
                  maxLength={3}
                />
              ) : (
                <TextInput
                  style={styles.input}
                  value={weightLbsText}
                  onChangeText={t => setWeightLbsText(t.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  placeholder="154"
                  placeholderTextColor="rgba(255,255,255,0.20)"
                  maxLength={6}
                />
              )}
              <View style={styles.unitBadge}>
                <Text style={styles.unitText}>
                  {unitSystem === 'imperial' ? 'lbs' : 'kg'}
                </Text>
              </View>
            </View>
            {isWeightValid && (
              <View style={styles.validRow}>
                <View style={styles.validDot} />
                <Text style={styles.validText}>
                  {unitSystem === 'imperial' ? `${weightKg} kg` : 'Harika!'}
                </Text>
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
    paddingTop: Spacing.sm,
    gap: Spacing['2xl'],
    paddingBottom: Spacing.lg,
  },
  section: {},

  // Unit toggle
  unitToggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: BorderRadius.xl,
    padding: 4,
    gap: 4,
  },
  unitToggle: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  unitToggleActive: {
    backgroundColor: NEON_GREEN,
  },
  unitToggleText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
  },
  unitToggleTextActive: {
    color: '#030E08',
  },

  label: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: '#F0FDF4',
    marginBottom: Spacing.md,
  },
  imperialRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
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
