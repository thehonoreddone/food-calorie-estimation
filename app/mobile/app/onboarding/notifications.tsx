import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { OnboardingLayout } from '@/components/ui/OnboardingLayout';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';

// Lazy import notification service to avoid Expo Go push token warnings at import time
const getNotificationService = () =>
  require('@/services/notificationService') as typeof import('@/services/notificationService');

export default function OnboardingNotificationsScreen() {
  const { profile, updateProfile } = useUser();
  const ns = getNotificationService();

  const [enabled, setEnabled] = useState(profile.notificationsEnabled ?? true);
  const [breakfastTime, setBreakfastTime] = useState(profile.breakfastReminderTime ?? '08:00');
  const [lunchTime, setLunchTime] = useState(profile.lunchReminderTime ?? '12:30');
  const [dinnerTime, setDinnerTime] = useState(profile.dinnerReminderTime ?? '19:00');

  const handleToggle = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (value) {
      const granted = await ns.requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'İzin Gerekli',
          'Bildirimleri açmak için lütfen cihaz ayarlarından bildirim izni verin.'
        );
        return;
      }
      await ns.scheduleMealReminders({
        breakfast: breakfastTime,
        lunch: lunchTime,
        dinner: dinnerTime,
      });
    } else {
      await ns.cancelAllNotifications();
    }

    setEnabled(value);
    updateProfile({
      notificationsEnabled: value,
      mealReminders: value,
      breakfastReminderTime: breakfastTime,
      lunchReminderTime: lunchTime,
      dinnerReminderTime: dinnerTime,
    });
  };

  const handleTimeSelect = (meal: 'breakfast' | 'lunch' | 'dinner', value: string) => {
    if (meal === 'breakfast') setBreakfastTime(value);
    if (meal === 'lunch') setLunchTime(value);
    if (meal === 'dinner') setDinnerTime(value);

    updateProfile({
      breakfastReminderTime: meal === 'breakfast' ? value : breakfastTime,
      lunchReminderTime: meal === 'lunch' ? value : lunchTime,
      dinnerReminderTime: meal === 'dinner' ? value : dinnerTime,
    });
  };

  const handleContinue = async () => {
    if (enabled) {
      await ns.scheduleMealReminders({
        breakfast: breakfastTime,
        lunch: lunchTime,
        dinner: dinnerTime,
      });
    }
    router.push('/onboarding/preparing');
  };

  return (
    <OnboardingLayout
      stepKey="notifications"
      title="Gün içinde seni nazikçe hatırlatalım"
      subtitle="Kahvaltı, öğle ve akşam için hatırlatma saatlerini seçebilirsin."
    >
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Bildirimler</Text>
            <Text style={styles.desc}>Tüm öğün hatırlatıcılarını aç/kapa</Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={handleToggle}
            trackColor={{ false: 'rgba(255,255,255,0.10)', true: 'rgba(45,212,160,0.40)' }}
            thumbColor={enabled ? '#2DD4A0' : 'rgba(255,255,255,0.40)'}
          />
        </View>

        <View style={styles.divider} />

        <Text style={styles.subTitle}>Önerilen saatler</Text>

        <View style={styles.timesRow}>
          <TimeOption
            icon="🌅"
            label="Kahvaltı"
            value={breakfastTime}
            presets={['07:30', '08:00', '08:30']}
            onSelect={(v) => handleTimeSelect('breakfast', v)}
          />
          <TimeOption
            icon="☀️"
            label="Öğle"
            value={lunchTime}
            presets={['12:00', '12:30', '13:00']}
            onSelect={(v) => handleTimeSelect('lunch', v)}
          />
          <TimeOption
            icon="🌙"
            label="Akşam"
            value={dinnerTime}
            presets={['18:30', '19:00', '19:30']}
            onSelect={(v) => handleTimeSelect('dinner', v)}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.skipBtn} onPress={() => router.push('/onboarding/preparing')}>
          <Text style={styles.skipText}>Daha Sonra Ayarlayacağım</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
          <Text style={styles.continueText}>Devam Et</Text>
        </TouchableOpacity>
      </View>
    </OnboardingLayout>
  );
}

interface TimeOptionProps {
  icon: string;
  label: string;
  value: string;
  presets: string[];
  onSelect: (value: string) => void;
}

function TimeOption({ icon, label, value, presets, onSelect }: TimeOptionProps) {
  return (
    <View style={styles.timeItem}>
      <Text style={styles.timeIcon}>{icon}</Text>
      <Text style={styles.timeLabel}>{label}</Text>
      <View style={styles.pillRow}>
        {presets.map((p) => {
          const selected = p === value;
          return (
            <TouchableOpacity
              key={p}
              style={[styles.pill, selected && styles.pillSelected]}
              onPress={() => onSelect(p)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{p}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const NEON_GREEN = '#2DD4A0';

const styles = StyleSheet.create({
  card: {
    marginTop: Spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#F0FDF4',
  },
  desc: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: Spacing.lg,
  },
  subTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  timesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  timeItem: {
    flex: 1,
    backgroundColor: 'rgba(45,212,160,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(45,212,160,0.20)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  timeIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  timeLabel: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.50)',
    marginBottom: 4,
  },
  pillRow: {
    flexDirection: 'column',
    gap: 4,
  },
  pill: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  pillSelected: {
    backgroundColor: 'rgba(45,212,160,0.25)',
    borderColor: NEON_GREEN,
  },
  pillText: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.50)',
    textAlign: 'center',
  },
  pillTextSelected: {
    color: NEON_GREEN,
    fontWeight: '700',
  },
  footer: {
    marginTop: Spacing['2xl'],
    gap: Spacing.sm,
  },
  skipBtn: {
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  skipText: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.45)',
  },
  continueBtn: {
    paddingVertical: 16,
    borderRadius: 32,
    backgroundColor: NEON_GREEN,
    alignItems: 'center',
  },
  continueText: {
    fontSize: FontSize.base,
    fontWeight: '800',
    color: '#030E08',
  },
});

