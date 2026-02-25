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
import Slider from '@react-native-community/slider';
import { useUser, Gender, Goal, ActivityLevel } from '@/contexts/UserContext';
import { PrimaryButton } from '@/components/ui';
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';

export default function EditProfileScreen() {
  const { profile, updateProfile } = useUser();

  const [name, setName] = useState(profile.name ?? '');
  const [avatarUri, setAvatarUri] = useState(profile.avatarUri ?? '');
  const [age, setAge] = useState(profile.age ?? 25);
  const [height, setHeight] = useState(profile.height ?? 170);
  const [weight, setWeight] = useState(profile.weight ?? 70);
  const [gender, setGender] = useState<Gender>(profile.gender ?? 'male');
  const [goal, setGoal] = useState<Goal>(profile.goal ?? 'maintain');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile.activityLevel ?? 'moderate');

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    updateProfile({
      name,
      avatarUri: avatarUri || undefined,
      age,
      height,
      weight,
      gender,
      goal,
      activityLevel,
    });
    Alert.alert('Başarılı', 'Profiliniz güncellendi.', [
      { text: 'Tamam', onPress: () => router.back() },
    ]);
  };

  const genderOptions: { value: Gender; label: string; icon: string }[] = [
    { value: 'male', label: 'Erkek', icon: '👨' },
    { value: 'female', label: 'Kadın', icon: '👩' },
    { value: 'other', label: 'Diğer', icon: '🧑' },
  ];

  const goalOptions: { value: Goal; label: string; icon: string }[] = [
    { value: 'lose', label: 'Kilo Ver', icon: '🔥' },
    { value: 'maintain', label: 'Koru', icon: '⚖️' },
    { value: 'gain', label: 'Kilo Al', icon: '💪' },
  ];

  const activityOptions: { value: ActivityLevel; label: string }[] = [
    { value: 'sedentary', label: 'Hareketsiz' },
    { value: 'light', label: 'Az Hareketli' },
    { value: 'moderate', label: 'Orta Düzey' },
    { value: 'active', label: 'Çok Aktif' },
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

        {/* Gender */}
        <View style={styles.section}>
          <Text style={styles.label}>Cinsiyet</Text>
          <View style={styles.chipRow}>
            {genderOptions.map(opt => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setGender(opt.value)}
                style={[
                  styles.chip,
                  gender === opt.value && styles.chipActive,
                ]}
              >
                <Text style={styles.chipIcon}>{opt.icon}</Text>
                <Text
                  style={[
                    styles.chipLabel,
                    gender === opt.value && styles.chipLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Age */}
        <View style={styles.section}>
          <View style={styles.sliderHeader}>
            <Text style={styles.label}>Yaş</Text>
            <Text style={styles.sliderValue}>{age}</Text>
          </View>
          <Slider
            minimumValue={14}
            maximumValue={80}
            step={1}
            value={age}
            onValueChange={setAge}
            minimumTrackTintColor={Colors.primary[500]}
            maximumTrackTintColor={Colors.neutral[200]}
            thumbTintColor={Colors.primary[600]}
          />
        </View>

        {/* Height */}
        <View style={styles.section}>
          <View style={styles.sliderHeader}>
            <Text style={styles.label}>Boy</Text>
            <Text style={styles.sliderValue}>{height} cm</Text>
          </View>
          <Slider
            minimumValue={120}
            maximumValue={220}
            step={1}
            value={height}
            onValueChange={setHeight}
            minimumTrackTintColor={Colors.primary[500]}
            maximumTrackTintColor={Colors.neutral[200]}
            thumbTintColor={Colors.primary[600]}
          />
        </View>

        {/* Weight */}
        <View style={styles.section}>
          <View style={styles.sliderHeader}>
            <Text style={styles.label}>Kilo</Text>
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
          <Text style={styles.label}>Hedef</Text>
          <View style={styles.chipRow}>
            {goalOptions.map(opt => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setGoal(opt.value)}
                style={[
                  styles.chip,
                  goal === opt.value && styles.chipActive,
                ]}
              >
                <Text style={styles.chipIcon}>{opt.icon}</Text>
                <Text
                  style={[
                    styles.chipLabel,
                    goal === opt.value && styles.chipLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Activity */}
        <View style={styles.section}>
          <Text style={styles.label}>Aktivite Seviyesi</Text>
          <View style={styles.chipRow}>
            {activityOptions.map(opt => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setActivityLevel(opt.value)}
                style={[
                  styles.chipSmall,
                  activityLevel === opt.value && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipLabel,
                    activityLevel === opt.value && styles.chipLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.saveSection}>
          <PrimaryButton title="Kaydet" onPress={handleSave} />
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
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholder: {
    fontSize: 42,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 24,
    right: '35%',
    backgroundColor: Colors.primary[500],
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  cameraIcon: {
    fontSize: 14,
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
  chipSmall: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
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
  saveSection: {
    marginTop: Spacing.lg,
  },
});
