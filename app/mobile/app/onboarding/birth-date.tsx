import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '@/contexts/UserContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_HEIGHT   = 52;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const BG_DARK    = '#080E0C';
const NEON_GREEN = '#2DD4A0';

const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1920 - 12 }, (_, i) => currentYear - 13 - i);

interface WheelPickerProps {
  data: (string | number)[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  width: number;
}

function WheelPicker({ data, selectedIndex, onSelect, width }: WheelPickerProps) {
  const flatListRef = useRef<FlatList>(null);
  const paddedData  = ['', '', ...data, '', ''];

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const index = Math.round(y / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, data.length - 1));
      onSelect(clampedIndex);
      Haptics.selectionAsync();
    },
    [data.length, onSelect]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: string | number; index: number }) => {
      const dataIndex = index - 2;
      const isSelected = dataIndex === selectedIndex;
      const distance   = Math.abs(dataIndex - selectedIndex);
      const opacity    = distance === 0 ? 1 : distance === 1 ? 0.4 : 0.12;
      const scale      = distance === 0 ? 1 : distance === 1 ? 0.85 : 0.7;
      return (
        <View style={[styles.wheelItem, { height: ITEM_HEIGHT, width }]}>
          <Text
            style={[
              styles.wheelText,
              {
                opacity,
                transform: [{ scale }],
                fontWeight: isSelected ? '700' : '400',
                fontSize:   isSelected ? 22 : 17,
                color:      isSelected ? NEON_GREEN : 'rgba(255,255,255,0.50)',
              },
            ]}
          >
            {item}
          </Text>
        </View>
      );
    },
    [selectedIndex, width]
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
        contentOffset={{ x: 0, y: selectedIndex * ITEM_HEIGHT }}
        getItemLayout={(_, i) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * i, index: i })}
        initialNumToRender={VISIBLE_ITEMS + 4}
        windowSize={3}
      />
    </View>
  );
}

export default function BirthDateScreen() {
  const { profile, updateProfile } = useUser();
  const existingDate = profile.birthDate ? new Date(profile.birthDate) : null;
  const [monthIndex, setMonthIndex] = useState(existingDate ? existingDate.getMonth() : 0);
  const [dayIndex,   setDayIndex]   = useState(existingDate ? existingDate.getDate() - 1 : 14);
  const [yearIndex,  setYearIndex]  = useState(existingDate ? YEARS.indexOf(existingDate.getFullYear()) : 0);

  const selectedDay   = DAYS[dayIndex] ?? 1;
  const selectedMonth = monthIndex + 1;
  const selectedYear  = YEARS[yearIndex] ?? 2000;

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
    <View style={styles.root}>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backCircle} activeOpacity={0.7}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={styles.progressWrapper}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '30%' }]} />
            </View>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Doğum tarihiniz</Text>
          <Text style={styles.subtitle}>Günlük kalori ve besin ihtiyacınızı hesaplarken yaşınız da dikkate alınacaktır.</Text>
        </View>

        {/* Picker Area */}
        <View style={styles.pickerArea}>
          {/* Selection highlight */}
          <View style={styles.selectionHighlight} />
          <View style={styles.pickerRow}>
            <WheelPicker data={MONTHS} selectedIndex={monthIndex} onSelect={setMonthIndex} width={SCREEN_WIDTH * 0.35} />
            <WheelPicker data={DAYS}   selectedIndex={dayIndex}   onSelect={setDayIndex}   width={SCREEN_WIDTH * 0.2} />
            <WheelPicker data={YEARS}  selectedIndex={yearIndex}  onSelect={setYearIndex}  width={SCREEN_WIDTH * 0.3} />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={handleContinue} activeOpacity={0.85} style={styles.btnWrap}>
            <LinearGradient
              colors={['#4ade80', '#2DD4A0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btn}
            >
              <Text style={styles.btnText}>Devam Et →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_DARK, overflow: 'hidden' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12, gap: 12,
  },
  backCircle: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  backArrow: { fontSize: 20, color: '#F0FDF4', marginTop: -2 },
  progressWrapper: { flex: 1 },
  progressTrack: {
    height: 4, backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: NEON_GREEN, borderRadius: 2 },
  titleSection: { paddingHorizontal: 20, paddingTop: 32, paddingBottom: 20 },
  title: {
    fontSize: 28, fontWeight: '800', color: '#F0FDF4', lineHeight: 36,
  },
  subtitle: {
    fontSize: 15, color: 'rgba(255,255,255,0.50)', marginTop: 10, lineHeight: 22,
  },
  pickerArea: {
    flex: 1, justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  selectionHighlight: {
    position: 'absolute',
    left: 20, right: 20,
    height: ITEM_HEIGHT,
    backgroundColor: 'rgba(45,212,160,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(45,212,160,0.25)',
    borderRadius: 14,
    top: '50%',
    marginTop: -ITEM_HEIGHT / 2,
  },
  pickerRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
  },
  wheelContainer: { overflow: 'hidden' },
  wheelItem: { justifyContent: 'center', alignItems: 'center' },
  wheelText: { textAlign: 'center' },
  footer: { paddingHorizontal: 20, paddingBottom: 32 },
  btnWrap: { borderRadius: 32, overflow: 'hidden' },
  btn: { paddingVertical: 20, alignItems: 'center', borderRadius: 32 },
  btnText: { fontSize: 17, fontWeight: '800', color: '#030E08' },
});
