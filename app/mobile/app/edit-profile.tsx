import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { File as ExpoFile, Paths } from 'expo-file-system';
import Slider from '@react-native-community/slider';
import { useUser, Goal, ActivityLevel } from '@/contexts/UserContext';
import { PrimaryButton } from '@/components/ui';
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';

export default function EditProfileScreen() {
  const { profile, updateProfile, calculateDailyCalories } = useUser();

  const [name, setName] = useState(profile.name ?? '');
  const [avatarUri, setAvatarUri] = useState(profile.avatarUri ?? '');
  const [weight, setWeight] = useState(profile.weight ?? 70);
  const [goal, setGoal] = useState<Goal>(profile.goal ?? 'maintain');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile.activityLevel ?? 'moderate');
  const [dailyCalorieTarget, setDailyCalorieTarget] = useState<string>(
    profile.dailyCalorieTarget ? String(profile.dailyCalorieTarget) : ''
  );
  const [useCustomCalorie, setUseCustomCalorie] = useState(!!profile.dailyCalorieTarget);
  const autoCalories = calculateDailyCalories();

  // Derive display info from profile
  const displayHeight = profile.height ?? 170;
  const displayAge = (() => {
    if (profile.birthDate) {
      const bd = new Date(profile.birthDate);
      const today = new Date();
      let a = today.getFullYear() - bd.getFullYear();
      const m = today.getMonth() - bd.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) a--;
      return a;
    }
    return profile.age ?? null;
  })();

  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Copy image to persistent document directory
        const sourceUri = result.assets[0].uri;
        const fileName = `avatar_${Date.now()}.jpg`;
        try {
          const sourceFile = new ExpoFile(sourceUri);
          const destFile = new ExpoFile(Paths.document, fileName);
          sourceFile.copy(destFile);
          setAvatarUri(destFile.uri);
        } catch {
          // Fallback to original URI if copy fails
          setAvatarUri(sourceUri);
        }
      }
    } catch (err) {
      console.warn('Image picker error:', err);
    }
  };

  const handleSave = () => {
    const calTarget = useCustomCalorie ? parseInt(dailyCalorieTarget) || undefined : undefined;
    updateProfile({
      name,
      avatarUri,
      weight,
      goal,
      activityLevel,
      dailyCalorieTarget: calTarget,
    });
    Alert.alert('Başarılı', 'Profiliniz güncellendi.', [
      { text: 'Tamam', onPress: () => router.back() },
    ]);
  };

  const goalOptions: { value: Goal; label: string; icon: string }[] = [
    { value: 'lose', label: 'Kilo Ver', icon: '🔥' },
    { value: 'maintain', label: 'Koru', icon: '⚖️' },
    { value: 'gain', label: 'Kilo Al', icon: '💪' },
  ];

  const activityOptions: { value: ActivityLevel; label: string; icon: string }[] = [
    { value: 'sedentary', label: 'Hareketsiz', icon: '🛋️' },
    { value: 'light', label: 'Az Hareketli', icon: '🚶' },
    { value: 'moderate', label: 'Orta Düzey', icon: '🏃' },
    { value: 'active', label: 'Çok Aktif', icon: '🏋️' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Geri</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profili Düzenle</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Avatar */}
        <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarSection}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={[Colors.primary[400], Colors.primary[600]]}
              style={styles.avatar}
            >
              <Text style={styles.avatarPlaceholder}>👤</Text>
            </LinearGradient>
          )}
          <View style={styles.cameraOverlay}>
            <Text style={styles.cameraIcon}>📷</Text>
          </View>
          <Text style={styles.changePhotoText}>Fotoğrafı Değiştir</Text>
        </TouchableOpacity>

        {/* Name */}
        <View style={styles.section}>
          <Text style={styles.label}>İsim</Text>
          <View style={[styles.inputContainer, Shadows.sm]}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Adınız"
              placeholderTextColor={Colors.text.light}
            />
          </View>
        </View>

        {/* Read-only Info Card: Height & Age */}
        <View style={[styles.readOnlyCard, Shadows.sm]}>
          <Text style={styles.readOnlyTitle}>📋 Kayıtlı Bilgiler</Text>
          <View style={styles.readOnlyRow}>
            <View style={styles.readOnlyItem}>
              <Text style={styles.readOnlyIcon}>📏</Text>
              <Text style={styles.readOnlyValue}>{displayHeight} cm</Text>
              <Text style={styles.readOnlyLabel}>Boy</Text>
            </View>
            {displayAge !== null && (
              <View style={styles.readOnlyItem}>
                <Text style={styles.readOnlyIcon}>🎂</Text>
                <Text style={styles.readOnlyValue}>{displayAge}</Text>
                <Text style={styles.readOnlyLabel}>Yaş</Text>
              </View>
            )}
            <View style={styles.readOnlyItem}>
              <Text style={styles.readOnlyIcon}>⚖️</Text>
              <Text style={styles.readOnlyValue}>{weight} kg</Text>
              <Text style={styles.readOnlyLabel}>Kilo</Text>
            </View>
          </View>
        </View>

        {/* Weight Slider */}
        <View style={styles.section}>
          <View style={styles.sliderHeader}>
            <Text style={styles.label}>⚖️ Kilo</Text>
            <Text style={styles.sliderValue}>{weight} kg</Text>
          </View>
          <Slider
            minimumValue={30}
            maximumValue={200}
            step={1}
            value={weight}
            onValueChange={setWeight}
            minimumTrackTintColor={Colors.primary[500]}
            maximumTrackTintColor={Colors.neutral[200]}
            thumbTintColor={Colors.primary[600]}
          />
        </View>

        {/* Goal */}
        <View style={styles.section}>
          <Text style={styles.label}>🎯 Hedef</Text>
          <View style={styles.chipRow}>
            {goalOptions.map(opt => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setGoal(opt.value)}
                style={[styles.chip, goal === opt.value && styles.chipActive]}
              >
                <Text style={styles.chipIcon}>{opt.icon}</Text>
                <Text style={[styles.chipLabel, goal === opt.value && styles.chipLabelActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Activity */}
        <View style={styles.section}>
          <Text style={styles.label}>🏃 Aktivite Seviyesi</Text>
          <View style={styles.activityGrid}>
            {activityOptions.map(opt => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setActivityLevel(opt.value)}
                style={[
                  styles.activityCard,
                  activityLevel === opt.value && styles.activityCardActive,
                ]}
              >
                <Text style={styles.activityEmoji}>{opt.icon}</Text>
                <Text
                  style={[
                    styles.activityLabel,
                    activityLevel === opt.value && styles.activityLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Daily Calorie Target */}
        <View style={[styles.section, { marginBottom: Spacing.lg }]}>
          <Text style={styles.label}>🍎 Günlük Kalori Hedefi</Text>
          <View style={[styles.readOnlyCard, Shadows.sm, { marginBottom: 0 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
              <Text style={{ fontSize: FontSize.sm, color: Colors.text.secondary }}>Otomatik Hesaplama</Text>
              <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: Colors.primary[600] }}>{autoCalories} kcal</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.chip,
                useCustomCalorie && styles.chipActive,
                { alignSelf: 'flex-start', marginBottom: useCustomCalorie ? Spacing.md : 0 },
              ]}
              onPress={() => {
                setUseCustomCalorie(!useCustomCalorie);
                if (!useCustomCalorie && !dailyCalorieTarget) {
                  setDailyCalorieTarget(String(autoCalories));
                }
              }}
            >
              <Text style={[styles.chipLabel, useCustomCalorie && styles.chipLabelActive]}>
                {useCustomCalorie ? '✅ Özel Hedef Aktif' : 'Manuel Hedef Belirle'}
              </Text>
            </TouchableOpacity>
            {useCustomCalorie && (
              <View>
                <View style={[styles.inputContainer, Shadows.sm, { flexDirection: 'row', alignItems: 'center' }]}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={dailyCalorieTarget}
                    onChangeText={setDailyCalorieTarget}
                    keyboardType="numeric"
                    placeholder="Ör: 2000"
                    placeholderTextColor={Colors.text.light}
                  />
                  <Text style={{ fontSize: FontSize.sm, color: Colors.text.secondary, marginLeft: Spacing.sm }}>kcal</Text>
                </View>
                <Text style={{ fontSize: FontSize.xs, color: Colors.text.light, marginTop: 6, fontStyle: 'italic' }}>
                  Bu değeri girerseniz otomatik hesaplama yerine sizin belirledik hedef kullanılır.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.saveSection}>
          <PrimaryButton title="💾 Kaydet" onPress={handleSave} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['4xl'],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
  },
  backBtn: {
    width: 60,
  },
  backText: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
    position: 'relative',
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primary[200],
  },
  avatarPlaceholder: {
    fontSize: 46,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 28,
    right: '33%',
    backgroundColor: Colors.primary[500],
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  cameraIcon: {
    fontSize: 16,
  },
  changePhotoText: {
    marginTop: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.primary[600],
    fontWeight: '600',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    height: 52,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    fontSize: FontSize.base,
    color: Colors.text.primary,
  },
  // Read-only info card
  readOnlyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary[100],
  },
  readOnlyTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  readOnlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  readOnlyItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  readOnlyIcon: {
    fontSize: 24,
  },
  readOnlyValue: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.primary[700],
  },
  readOnlyLabel: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
  },
  readOnlyHint: {
    fontSize: FontSize.xs,
    color: Colors.text.light,
    textAlign: 'center',
    marginTop: Spacing.md,
    fontStyle: 'italic',
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  sliderValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.primary[600],
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  chipActive: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  chipIcon: {
    fontSize: 18,
  },
  chipLabel: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  chipLabelActive: {
    color: Colors.primary[700],
    fontWeight: '700',
  },
  // Activity grid (2x2)
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  activityCard: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  activityCardActive: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  activityEmoji: {
    fontSize: 28,
  },
  activityLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  activityLabelActive: {
    color: Colors.primary[700],
    fontWeight: '700',
  },
  saveSection: {
    marginTop: Spacing.lg,
  },
});
