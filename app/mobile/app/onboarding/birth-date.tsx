import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/ui';
import { useUser } from '@/contexts/UserContext';
import { Colors, FontSize, Spacing } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1920 - 12 }, (_, i) => currentYear - 13 - i);

// Progress bar component consistent with onboarding
function ProgressBar({ progress }: { progress: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
    </View>
  );
}

interface WheelPickerProps {
  data: (string | number)[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  width: number;
}

function WheelPicker({ data, selectedIndex, onSelect, width }: WheelPickerProps) {
  const flatListRef = useRef<FlatList>(null);
  const paddedData = ['', '', ...data, '', ''];
  const isScrolling = useRef(false);

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const index = Math.round(y / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, data.length - 1));
      onSelect(clampedIndex);
      Haptics.selectionAsync();
      isScrolling.current = false;
    },
    [data.length, onSelect],
  );

  const handleScrollBegin = useCallback(() => {
    isScrolling.current = true;
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: string | number; index: number }) => {
      const dataIndex = index - 2;
      const isSelected = dataIndex === selectedIndex;
      const distance = Math.abs(dataIndex - selectedIndex);
      const opacity = distance === 0 ? 1 : distance === 1 ? 0.4 : 0.15;
      const scale = distance === 0 ? 1 : distance === 1 ? 0.85 : 0.7;

      return (
        <View style={[styles.wheelItem, { height: ITEM_HEIGHT, width }]}>
          <Text
            style={[
              styles.wheelText,
              {
                opacity,
                transform: [{ scale }],
                fontWeight: isSelected ? '700' : '400',
                fontSize: isSelected ? 22 : 17,
                color: isSelected ? Colors.text.primary : Colors.text.light,
              },
            ]}
          >
            {item}
          </Text>
        </View>
      );
    },
    [selectedIndex, width],
  );

  return (
    <View style={[styles.wheelContainer, { width, height: PICKER_HEIGHT }]}>
      <FlatList
        ref={flatListRef}
        data={paddedData}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumEnd}
        onScrollBeginDrag={handleScrollBegin}
        contentOffset={{ x: 0, y: selectedIndex * ITEM_HEIGHT }}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        initialNumToRender={VISIBLE_ITEMS + 4}
        windowSize={3}
      />
    </View>
  );
}

export default function BirthDateScreen() {
  const { profile, updateProfile } = useUser();

  const existingDate = profile.birthDate ? new Date(profile.birthDate) : null;
  const [monthIndex, setMonthIndex] = useState(
    existingDate ? existingDate.getMonth() : 0,
  );
  const [dayIndex, setDayIndex] = useState(
    existingDate ? existingDate.getDate() - 1 : 14,
  );
  const [yearIndex, setYearIndex] = useState(
    existingDate ? YEARS.indexOf(existingDate.getFullYear()) : 0,
  );

  const selectedDay = DAYS[dayIndex] ?? 1;
  const selectedMonth = monthIndex + 1;
  const selectedYear = YEARS[yearIndex] ?? 2000;

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const birthDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    const today = new Date();
    let calcAge = today.getFullYear() - selectedYear;
    const mDiff = today.getMonth() + 1 - selectedMonth;
    if (mDiff < 0 || (mDiff === 0 && today.getDate() < selectedDay)) calcAge--;
    updateProfile({ birthDate, age: calcAge });
    router.push('/onboarding/body-info');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header with back + progress */}
      <View style={styles.header}>
        <View style={styles.backCircle}>
          <Text
            style={styles.backArrow}
            onPress={() => router.back()}
          >
            ←
          </Text>
        </View>
        <View style={styles.progressWrapper}>
          <ProgressBar progress={0.3} />
        </View>
      </View>

      {/* Title */}
      <View style={styles.titleSection}>
        <Text style={styles.title}>Ne zaman doğdunuz?</Text>
        <Text style={styles.subtitle}>
          Günlük beslenme hedeflerinizi hesaplarken dikkate alınacaktır.
        </Text>
      </View>

      {/* Wheel Picker */}
      <View style={styles.pickerArea}>
        {/* Selection highlight */}
        <View style={styles.selectionHighlight} />

        <View style={styles.pickerRow}>
          <WheelPicker
            data={MONTHS}
            selectedIndex={monthIndex}
            onSelect={setMonthIndex}
            width={SCREEN_WIDTH * 0.35}
          />
          <WheelPicker
            data={DAYS}
            selectedIndex={dayIndex}
            onSelect={setDayIndex}
            width={SCREEN_WIDTH * 0.2}
          />
          <WheelPicker
            data={YEARS}
            selectedIndex={yearIndex}
            onSelect={setYearIndex}
            width={SCREEN_WIDTH * 0.3}
          />
        </View>
      </View>

      {/* Continue Button */}
      <View style={styles.footer}>
        <PrimaryButton
          title="Devam Et"
          onPress={handleContinue}
          style={styles.continueBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: Colors.text.primary,
    marginTop: -2,
  },
  progressWrapper: {
    flex: 1,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.neutral[200],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.text.primary,
    borderRadius: 2,
  },
  titleSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['3xl'],
    paddingBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize['3xl'],
    fontWeight: '800',
    color: Colors.text.primary,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  pickerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  selectionHighlight: {
    position: 'absolute',
    left: Spacing.xl,
    right: Spacing.xl,
    height: ITEM_HEIGHT,
    backgroundColor: Colors.neutral[100],
    borderRadius: 14,
    top: '50%',
    marginTop: -ITEM_HEIGHT / 2,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelContainer: {
    overflow: 'hidden',
  },
  wheelItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelText: {
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['3xl'],
  },
  continueBtn: {
    borderRadius: 28,
  },
});
