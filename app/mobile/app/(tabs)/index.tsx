import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import { useUser } from '@/contexts/UserContext';
import { useTranslation } from '@/i18n';
import { hapticSelection, hapticLight, hapticMedium } from '../../src/utils/haptics';
import { SkeletonCalorieRing, SkeletonCard, Skeleton } from '../../src/components/ui/SkeletonLoader';
import { Mascot } from '../../src/components/mascot';
import {
  getMealsForDate,
  getExercisesForDate,
  MealEntry,
  ExerciseEntry,
  getDailyHealth,
  saveDailyHealth,
  DailyHealthData,
  getUserAchievements,
} from '../../src/services/firestoreService';
import {
  getTodaySteps,
  getLastNightSleep,
  getStepsForDate,
  getSleepForDate,
  isHealthConnectAvailable,
  requestHealthPermissions,
  initHealthConnect,
} from '../../src/services/healthService';
import {
  Colors,
  MacroColors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
  Shadows,
  Glass,
  GradientPresets,
} from '@/constants/theme';

const { width: SW } = Dimensions.get('window');

// ─── Date helpers ───────────────────────────────────────────────────────────

function fmtDate(d: Date) { return d.toISOString().split('T')[0]; }
function sameDay(a: Date, b: Date) { return fmtDate(a) === fmtDate(b); }

function dayLabels(l: string) {
  return l === 'en'
    ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    : ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];
}
function dayLabelsShort(l: string) {
  return l === 'en'
    ? ['S','M','T','W','T','F','S']
    : ['P','P','S','Ç','P','C','C'];
}
function monthLabels(l: string) {
  return l === 'en'
    ? ['January','February','March','April','May','June','July','August','September','October','November','December']
    : ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
}
function calDays(center: Date) {
  const d: Date[] = [];
  for (let i = -7; i <= 7; i++) { const x = new Date(center); x.setDate(x.getDate()+i); d.push(x); }
  return d;
}
function getMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const startDow = first.getDay();
  const grid: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) grid.push(null);
  for (let d = 1; d <= lastDay; d++) grid.push(new Date(year, month, d));
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
}

// ─── Premium Calorie Ring ───────────────────────────────────────────────────

function CalRing({ eaten, target, sz = 190 }: { eaten: number; target: number; sz?: number }) {
  const sw = 14;
  const r = (sz - sw) / 2;
  const c = 2 * Math.PI * r;
  const rem = Math.max(0, target - eaten);
  const p = target > 0 ? Math.min(eaten / target, 1) : 0;
  const isOver = eaten > target;

  // Dynamic gradient colors based on progress
  const getColors = () => {
    if (isOver) return { start: '#FB923C', end: '#F472B6' };
    if (p >= 0.7) return { start: '#22c55e', end: '#16a34a' };
    if (p >= 0.5) return { start: '#3b82f6', end: '#22c55e' };
    return { start: '#8b5cf6', end: '#3b82f6' };
  };
  const gradColors = getColors();

  return (
    <View style={{ width: sz, height: sz, alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer glow */}
      <View style={[
        {
          position: 'absolute',
          width: sz + 40,
          height: sz + 40,
          borderRadius: (sz + 40) / 2,
          backgroundColor: `${gradColors.start}15`,
        },
      ]} />
      <View style={[
        {
          position: 'absolute',
          width: sz + 20,
          height: sz + 20,
          borderRadius: (sz + 20) / 2,
          backgroundColor: `${gradColors.start}08`,
        },
      ]} />
      <Svg width={sz} height={sz}>
        <Defs>
          <SvgGrad id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={gradColors.start} />
            <Stop offset="100%" stopColor={gradColors.end} />
          </SvgGrad>
        </Defs>
        {/* Track */}
        <Circle
          cx={sz / 2} cy={sz / 2} r={r}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={sw} fill="none"
        />
        {/* Progress */}
        <Circle
          cx={sz / 2} cy={sz / 2} r={r}
          stroke="url(#ringGrad)"
          strokeWidth={sw} fill="none"
          strokeDasharray={`${c}`}
          strokeDashoffset={c * (1 - p)}
          strokeLinecap="round"
          transform={`rotate(-90 ${sz / 2} ${sz / 2})`}
        />
      </Svg>
      {/* Center content */}
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={S.ringValue}>{eaten.toLocaleString('tr-TR')}</Text>
        <Text style={S.ringLabel}>of {target.toLocaleString('tr-TR')} kcal</Text>
        <View style={S.ringRemRow}>
          <View style={[S.ringDot, { backgroundColor: gradColors.start }]} />
          <Text style={S.ringRemText}>{rem.toLocaleString('tr-TR')} left</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Macro Progress Bar ─────────────────────────────────────────────────────

function MacroBar({ label, eaten, goal, color }: {
  label: string; eaten: number; goal: number; color: string;
}) {
  const p = goal > 0 ? Math.min(eaten / goal, 1) : 0;
  return (
    <View style={S.macroBarItem}>
      <View style={S.macroBarHeader}>
        <Text style={S.macroBarLabel}>{label}</Text>
        <Text style={[S.macroBarVal, { color: Colors.text.primary }]}>{eaten}/{goal}g</Text>
      </View>
      <View style={S.macroBarTrack}>
        <View style={[S.macroBarFill, {
          width: `${p * 100}%` as any,
          backgroundColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 6,
          elevation: 4,
        }]} />
      </View>
    </View>
  );
}

// ─── Water Drop Bars ─────────────────────────────────────────────────────────

function WaterDropBars({ glasses, goal }: { glasses: number; goal: number }) {
  return (
    <View style={S.waterDropRow}>
      {Array.from({ length: goal }).map((_, i) => (
        <View
          key={i}
          style={[
            S.waterDropBar,
            i < glasses
              ? S.waterDropFilled
              : S.waterDropEmpty,
          ]}
        />
      ))}
    </View>
  );
}

// ─── Steps Mini Progress Ring ────────────────────────────────────────────────

function StepsBadge({ percent }: { percent: number }) {
  const sz = 32;
  const sw = 3;
  const r = (sz - sw) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: sz, height: sz, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={sz} height={sz}>
        <Circle cx={sz/2} cy={sz/2} r={r} stroke="rgba(255,255,255,0.1)" strokeWidth={sw} fill="none" />
        <Circle cx={sz/2} cy={sz/2} r={r} stroke="#22c55e" strokeWidth={sw} fill="none"
          strokeDasharray={`${c}`} strokeDashoffset={c * (1 - percent / 100)}
          strokeLinecap="round" transform={`rotate(-90 ${sz/2} ${sz/2})`}
        />
      </Svg>
      <Text style={S.stepsBadgeText}>{percent}%</Text>
    </View>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function HomeTab() {
  const { profile, calculateDailyCalories, calculateMacros } = useUser();
  const { t, lang } = useTranslation();
  const today = new Date();
  const isExpoGo = Constants.executionEnvironment === 'storeClient';

  const [selDate, setSelDate] = useState(today);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [health, setHealth] = useState<Partial<DailyHealthData>>({});
  const [steps, setSteps] = useState(0);
  const [sleepH, setSleepH] = useState(0);
  const [sleepM, setSleepM] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hcOn, setHcOn] = useState(false);
  const [water, setWater] = useState(0);
  const [loginStreak, setLoginStreak] = useState(0);

  // Calendar
  const [calExpanded, setCalExpanded] = useState(false);
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const stGoal = health.stepsGoal ?? 10000;
  const wGoal = health.waterGoal ?? 2500;
  const waterGlasses = Math.round(water / 250); // Convert ml to glasses (250ml each)
  const waterGlassGoal = Math.round(wGoal / 250);

  // ─── Load ──────────────────────────────────────────────────────────
  const load = useCallback(async (d: Date) => {
    if (!profile.uid) return;
    setLoading(true);
    try {
      const dk = fmtDate(d);
      const td = sameDay(d, new Date());

      let ml: MealEntry[] = [];
      let ex: ExerciseEntry[] = [];
      let dh: DailyHealthData | null = null;
      try { ml = await getMealsForDate(profile.uid, dk); } catch (e) { console.warn('[Home] meals:', e); }
      try { ex = await getExercisesForDate(profile.uid, dk); } catch (e) { console.warn('[Home] exercises:', e); }
      try { dh = await getDailyHealth(profile.uid, dk); } catch (e) { console.warn('[Home] health:', e); }
      setMeals(ml); setExercises(ex); setHealth(dh ?? {}); setWater(dh?.waterMl ?? 0);

      try {
        const [sd, sl] = await Promise.all([
          td ? getTodaySteps() : getStepsForDate(dk),
          td ? getLastNightSleep() : getSleepForDate(dk),
        ]);
        if (sd.steps > 0) setSteps(sd.steps); else setSteps(dh?.steps ?? 0);
        if (sl.totalMinutes > 0) { setSleepH(sl.hours); setSleepM(sl.minutes); }
        else { setSleepH(dh?.sleepHours ?? 0); setSleepM(dh?.sleepMins ?? 0); }
        if (td && (sd.steps > 0 || sl.totalMinutes > 0)) {
          saveDailyHealth(profile.uid, dk, {
            steps: sd.steps, sleepMinutes: sl.totalMinutes, sleepHours: sl.hours, sleepMins: sl.minutes,
          }).catch(() => {});
        }
      } catch {
        setSteps(dh?.steps ?? 0); setSleepH(dh?.sleepHours ?? 0); setSleepM(dh?.sleepMins ?? 0);
      }
    } catch (e) { console.warn('Dashboard load issue:', e); }
    finally { setLoading(false); setLoaded(true); }
  }, [profile.uid]);

  useEffect(() => {
    (async () => { const a = await isHealthConnectAvailable(); setHcOn(a); if (a) await initHealthConnect(); })();
  }, []);

  useEffect(() => {
    if (profile.uid) {
      getUserAchievements(profile.uid).then(a => setLoginStreak(a.loginStreakCurrent)).catch(() => {});
    }
  }, [profile.uid]);

  useFocusEffect(
    useCallback(() => {
      if (profile.uid) load(selDate);
    }, [profile.uid, selDate, load])
  );

  // ─── Calc ──────────────────────────────────────────────────────────
  const tgt = calculateDailyCalories();
  const eaten = meals.reduce((s, m) => s + (Number(m.calories) || 0), 0);
  const burned = exercises.reduce((s, e) => s + (Number(e.caloriesBurned) || 0), 0);
  const macros = calculateMacros();
  const eProt = meals.reduce((s, m) => s + (Number(m.protein) || 0), 0);
  const eCarb = meals.reduce((s, m) => s + (Number(m.carbs) || 0), 0);
  const eFat = meals.reduce((s, m) => s + (Number(m.fat) || 0), 0);
  const stepsPercent = stGoal > 0 ? Math.min(Math.round((steps / stGoal) * 100), 100) : 0;
  const stepsBurned = Math.round(steps * 0.04); // approx kcal burned

  const days = calDays(today);
  const dN = dayLabels(lang);
  const dNShort = dayLabelsShort(lang);
  const mN = monthLabels(lang);
  const monthGrid = getMonthGrid(viewYear, viewMonth);

  // Average calories (simple: eaten today as proxy)
  const avgCal = eaten > 0 ? eaten : tgt;

  const calExpandAnim = useAnimatedStyle(() => ({
    maxHeight: withTiming(calExpanded ? 350 : 0, { duration: 300, easing: Easing.inOut(Easing.ease) }),
    opacity: withTiming(calExpanded ? 1 : 0, { duration: 250 }),
    overflow: 'hidden' as const,
  }));

  const toggleCalendar = () => {
    hapticLight();
    if (!calExpanded) { setViewMonth(selDate.getMonth()); setViewYear(selDate.getFullYear()); }
    setCalExpanded(!calExpanded);
  };

  const prevMonth = () => {
    hapticSelection();
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };

  const nextMonth = () => {
    hapticSelection();
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const selectCalDay = (d: Date) => { hapticSelection(); setSelDate(d); setCalExpanded(false); };
  const stripScrollRef = useRef<ScrollView>(null);
  useEffect(() => { setTimeout(() => { stripScrollRef.current?.scrollTo({ x: 7 * 56, animated: false }); }, 100); }, []);

  const addWater = async (ml: number) => {
    if (!profile.uid) return;
    hapticLight();
    const nw = Math.max(0, water + ml);
    setWater(nw);
    saveDailyHealth(profile.uid, fmtDate(selDate), { waterMl: nw, waterGoal: wGoal }).catch(() => {});
  };

  const connectHC = async () => {
    if (isExpoGo) {
      Alert.alert('Health Connect', 'Health Connect özelliği Expo Go ile çalışmaz. Adım ve uyku verilerini şu an ayarlar sayfasından girebilirsiniz.\n\nOtomatik takip için EAS Build gerekir.', [{ text: 'Anladım' }]);
      return;
    }
    const a = await isHealthConnectAvailable();
    if (!a) { Alert.alert('Health Connect', 'Google Health Connect uygulaması yüklü değil.'); return; }
    const ok = await requestHealthPermissions();
    if (ok) { setHcOn(true); load(selDate); }
  };

  const goDayDetail = (d: Date) => {
    setSelDate(d);
    router.push({ pathname: '/day-detail', params: { date: fmtDate(d) } });
  };

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Günaydın' : greetingHour < 18 ? 'İyi öğleden sonralar' : 'İyi akşamlar';

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={S.container} edges={['top']}>
      {/* ── Ambient Background Glows ───────── */}
      <View style={S.ambientTop} pointerEvents="none" />
      <View style={S.ambientMid} pointerEvents="none" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.scroll}>

        {/* ── Header ─────────────────────────── */}
        <View style={S.header}>
          <View>
            <Text style={S.greetingSub}>{greeting}</Text>
            <Text style={S.greetingName}>{profile.name?.split(' ')[0] ?? 'Nutrino'}</Text>
          </View>
          <View style={S.headerRight}>
            <TouchableOpacity style={S.headerBtn} onPress={() => router.push('/notifications')} activeOpacity={0.7}>
              <Text style={S.headerBtnIcon}>🔔</Text>
            </TouchableOpacity>
            <TouchableOpacity style={S.headerBtn} onPress={() => router.push('/settings')} activeOpacity={0.7}>
              <Text style={S.headerBtnIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Calendar Strip ─────────────────── */}
        <View style={S.calStripRow}>
          <ScrollView
            ref={stripScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={S.calStrip}
          >
            {days.map((day, i) => {
              const sel = sameDay(day, selDate), td = sameDay(day, today);
              return (
                <TouchableOpacity
                  key={i}
                  style={[S.calDay, sel && S.calDaySel, td && !sel && S.calDayTd]}
                  onPress={() => { hapticSelection(); setSelDate(day); }}
                  onLongPress={() => goDayDetail(day)}
                >
                  <Text style={[S.calDayN, sel && S.calDayTextSel]}>{dN[day.getDay()]}</Text>
                  <Text style={[S.calDayNum, sel && S.calDayTextSel]}>{day.getDate()}</Text>
                  {td && <View style={[S.tdDot, sel && S.tdDotSel]} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={S.calExpandBtn} onPress={toggleCalendar} activeOpacity={0.7}>
            <Text style={S.calExpandIcon}>{calExpanded ? '▲' : '▼'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Expanded Month Calendar ─────────── */}
        <Animated.View style={calExpandAnim}>
          <View style={[S.monthCal, Glass.card]}>
            <View style={S.monthNav}>
              <TouchableOpacity onPress={prevMonth} style={S.monthNavBtn}>
                <Text style={S.monthNavArrow}>◀</Text>
              </TouchableOpacity>
              <Text style={S.monthNavTitle}>{mN[viewMonth]} {viewYear}</Text>
              <TouchableOpacity onPress={nextMonth} style={S.monthNavBtn}>
                <Text style={S.monthNavArrow}>▶</Text>
              </TouchableOpacity>
            </View>
            <View style={S.monthDayHeaders}>
              {dN.map((_, i) => (
                <Text key={i} style={S.monthDayHeader}>{dNShort[i]}</Text>
              ))}
            </View>
            <View style={S.monthGrid}>
              {monthGrid.map((day, i) => {
                if (!day) return <View key={`e${i}`} style={S.monthDayEmpty} />;
                const sel = sameDay(day, selDate), td = sameDay(day, today);
                return (
                  <TouchableOpacity
                    key={fmtDate(day)}
                    style={[S.monthDay, sel && S.monthDaySel, td && !sel && S.monthDayTd]}
                    onPress={() => selectCalDay(day)}
                    activeOpacity={0.7}
                  >
                    <Text style={[S.monthDayText, sel && S.monthDayTextSel, td && !sel && S.monthDayTextTd]}>
                      {day.getDate()}
                    </Text>
                    {td && <View style={[S.monthTdDot, sel && S.monthTdDotSel]} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Animated.View>

        {/* ── Mascot (Centered) ────────────────── */}
        <Mascot
          caloriesEaten={eaten}
          calorieGoal={tgt}
          streak={loginStreak}
          waterMl={water}
          waterGoal={wGoal}
          mealCount={meals.length}
        />

        {/* ── Loading Skeleton ─────────────────── */}
        {loading && !loaded ? (
          <View style={S.loadWrap}>
            <SkeletonCalorieRing />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20, width: '100%' }}>
              <Skeleton width="30%" height={50} borderRadius={12} />
              <Skeleton width="30%" height={50} borderRadius={12} />
              <Skeleton width="30%" height={50} borderRadius={12} />
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, width: '100%' }}>
              <SkeletonCard style={{ flex: 1 }} />
              <SkeletonCard style={{ flex: 1 }} />
            </View>
          </View>
        ) : (
          <>
            {/* ── Hero Calorie Ring ────────────── */}
            <View style={S.ringSection}>
              <CalRing eaten={eaten} target={tgt} sz={190} />
            </View>

            {/* ── Macros Card ─────────────────── */}
            <View style={[S.macroCard, Glass.card]}>
              {/* Glow accent */}
              <View style={S.macroCardGlow} />
              <View style={S.macroCardHeader}>
                <LinearGradient
                  colors={['#8b5cf6', '#6d28d9'] as any}
                  style={S.macroCardIcon}
                >
                  <Text style={{ fontSize: 16, color: '#fff' }}>📊</Text>
                </LinearGradient>
                <Text style={S.macroCardTitle}>Macros</Text>
              </View>
              <View style={S.macroList}>
                <MacroBar label="Protein" eaten={eProt} goal={macros.protein} color="#22c55e" />
                <MacroBar label="Carbs" eaten={eCarb} goal={macros.carbs} color="#3b82f6" />
                <MacroBar label="Fat" eaten={eFat} goal={macros.fat} color="#f59e0b" />
              </View>
            </View>

            {/* ── Water + Steps Row ───────────── */}
            <View style={S.dualCardRow}>
              {/* Water Card */}
              <View style={[S.halfCard, Glass.card]}>
                <View style={S.halfCardGlow} />
                <View style={S.halfCardHeader}>
                  <View style={S.halfCardIconRow}>
                    <LinearGradient colors={['#3b82f6', '#06b6d4'] as any} style={S.halfCardIconBg}>
                      <Text style={{ fontSize: 14, color: '#fff' }}>💧</Text>
                    </LinearGradient>
                    <Text style={S.halfCardTitle}>Water</Text>
                  </View>
                  <TouchableOpacity
                    style={S.waterAddBtn}
                    onPress={() => addWater(250)}
                    activeOpacity={0.7}
                  >
                    <Text style={S.waterAddIcon}>+</Text>
                  </TouchableOpacity>
                </View>
                <View style={S.waterContent}>
                  <View>
                    <Text style={S.waterValue}>{waterGlasses}</Text>
                    <Text style={S.waterGoalText}>/{waterGlassGoal} glasses</Text>
                  </View>
                  <WaterDropBars glasses={waterGlasses} goal={waterGlassGoal} />
                </View>
                {/* Progress bar */}
                <View style={S.miniProgressTrack}>
                  <View style={[S.miniProgressFill, {
                    width: `${Math.min((waterGlasses / waterGlassGoal) * 100, 100)}%` as any,
                    backgroundColor: '#3b82f6',
                    shadowColor: '#3b82f6',
                    shadowOpacity: 0.5,
                    shadowRadius: 4,
                  }]} />
                </View>
              </View>

              {/* Steps Card */}
              <View style={[S.halfCard, Glass.card]}>
                <View style={[S.halfCardGlow, { backgroundColor: 'rgba(34,197,94,0.06)' }]} />
                <View style={S.halfCardHeader}>
                  <View style={S.halfCardIconRow}>
                    <LinearGradient colors={['#22c55e', '#16a34a'] as any} style={S.halfCardIconBg}>
                      <Text style={{ fontSize: 14, color: '#fff' }}>👟</Text>
                    </LinearGradient>
                    <Text style={S.halfCardTitle}>Steps</Text>
                  </View>
                </View>
                <Text style={S.stepsValue}>{steps.toLocaleString('tr-TR')}</Text>
                <Text style={S.stepsGoalText}>/{stGoal.toLocaleString('tr-TR')}</Text>
                <View style={S.stepsExtraRow}>
                  <Text style={S.stepsBurnedText}>• {stepsBurned} kcal burned</Text>
                </View>
                <View style={S.stepsProgressRow}>
                  <StepsBadge percent={stepsPercent} />
                  <View style={{ flex: 1 }}>
                    <View style={S.miniProgressTrack}>
                      <LinearGradient
                        colors={['#22c55e', '#f59e0b'] as any}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[S.miniProgressFill, {
                          width: `${stepsPercent}%` as any,
                        }]}
                      />
                    </View>
                    <Text style={S.stepsToGoText}>{Math.max(stGoal - steps, 0).toLocaleString('tr-TR')} to go</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ── Stats Row ───────────────────── */}
            <View style={S.statsRow}>
              <View style={S.statCard}>
                <Text style={S.statValue}>{loginStreak}<Text style={S.statUnit}> days</Text></Text>
                <Text style={S.statLabel}>Streak</Text>
              </View>
              <View style={S.statCard}>
                <Text style={S.statValue}>{avgCal >= 1000 ? `${(avgCal / 1000).toFixed(1)}k` : avgCal}<Text style={S.statUnit}> /day</Text></Text>
                <Text style={S.statLabel}>Avg Cal</Text>
              </View>
              <View style={S.statCard}>
                <Text style={S.statValue}>{profile.weight ?? '—'}<Text style={S.statUnit}> kg</Text></Text>
                <Text style={S.statLabel}>Weight</Text>
              </View>
            </View>

            {/* ── Meals Summary ─────────────────── */}
            <TouchableOpacity
              style={[S.mealsSummary, Glass.card]}
              onPress={() => goDayDetail(selDate)}
              activeOpacity={0.7}
            >
              <View style={S.mealsSummaryLeft}>
                <LinearGradient colors={['#A3E635', '#65a30d'] as any} style={S.mealsSummaryIconBg}>
                  <Text style={{ fontSize: 18 }}>🍽️</Text>
                </LinearGradient>
                <View>
                  <Text style={S.mealsSummaryTitle}>Öğünleri Görüntüle</Text>
                  <Text style={S.mealsSummarySub}>
                    {meals.length > 0 ? `${meals.length} kayıt • ${eaten} kcal` : 'Yemek eklemek için dokunun'}
                  </Text>
                </View>
              </View>
              <Text style={S.mealsSummaryArrow}>›</Text>
            </TouchableOpacity>

            {/* ── Quick Actions Row ─────────────── */}
            <View style={[S.quickActionsCard, Glass.card]}>
              <Text style={S.sectionTitle}>Hızlı İşlemler</Text>
              <View style={S.quickActionsRow}>
                <TouchableOpacity style={S.quickAction} onPress={() => goDayDetail(selDate)} activeOpacity={0.7}>
                  <LinearGradient colors={[`${Colors.neon.lime}22`, `${Colors.neon.lime}08`] as any} style={S.quickActionGrad}>
                    <Text style={{ fontSize: 24 }}>🍽️</Text>
                  </LinearGradient>
                  <Text style={S.quickActionLabel}>Öğünler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.quickAction} onPress={() => router.push('/diet-recommendation')} activeOpacity={0.7}>
                  <LinearGradient colors={[`${Colors.neon.cyan}22`, `${Colors.neon.cyan}08`] as any} style={S.quickActionGrad}>
                    <Text style={{ fontSize: 24 }}>🥗</Text>
                  </LinearGradient>
                  <Text style={S.quickActionLabel}>Diyet</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.quickAction} onPress={() => router.push('/weight-tracking')} activeOpacity={0.7}>
                  <LinearGradient colors={[`${Colors.neon.purple}22`, `${Colors.neon.purple}08`] as any} style={S.quickActionGrad}>
                    <Text style={{ fontSize: 24 }}>⚖️</Text>
                  </LinearGradient>
                  <Text style={S.quickActionLabel}>Kilo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.quickAction} onPress={() => router.push('/achievements')} activeOpacity={0.7}>
                  <LinearGradient colors={[`${Colors.neon.orange}22`, `${Colors.neon.orange}08`] as any} style={S.quickActionGrad}>
                    <Text style={{ fontSize: 24 }}>🏆</Text>
                  </LinearGradient>
                  <Text style={S.quickActionLabel}>Başarımlar</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Health Connect Banner ─────────── */}
            {!hcOn && (
              <TouchableOpacity style={[S.hcBanner, Glass.card]} onPress={connectHC} activeOpacity={0.7}>
                <LinearGradient colors={['#A3E63520', '#22D3EE20'] as any} style={S.hcBannerIconBg}>
                  <Text style={{ fontSize: 20 }}>🔗</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={S.hcBannerTitle}>Health Connect Bağla</Text>
                  <Text style={S.hcBannerSub}>
                    Adım ve uyku verilerini otomatik izleyin{isExpoGo ? ' (EAS Build gerekli)' : ''}
                  </Text>
                </View>
                <Text style={[S.mealsSummaryArrow, { color: Colors.neon.lime }]}>›</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const HALF_W = (SW - Spacing.lg * 2 - Spacing.sm) / 2;

const S = StyleSheet.create({
  // ── Base ──────────────────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 24,
  },

  // ── Ambient glows ─────────────────────────────────────────────────
  ambientTop: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(139,92,246,0.06)',
  },
  ambientMid: {
    position: 'absolute',
    top: '40%',
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(34,211,238,0.05)',
  },

  // ── Header ─────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  greetingSub: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    fontWeight: FontWeight.medium,
  },
  greetingName: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.extrabold,
    color: Colors.text.primary,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnIcon: {
    fontSize: 18,
  },

  // ── Calendar Strip ─────────────────────────────────────────────────
  calStripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  calStrip: {
    paddingVertical: Spacing.sm,
    gap: 6,
    paddingRight: 48,
  },
  calDay: {
    width: 50,
    height: 66,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  calDaySel: {
    backgroundColor: Colors.neon.lime,
    borderColor: Colors.neon.lime,
  },
  calDayTd: {
    borderWidth: 1.5,
    borderColor: `${Colors.neon.lime}60`,
  },
  calDayN: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  calDayNum: {
    fontSize: FontSize.lg,
    color: Colors.text.primary,
    fontWeight: FontWeight.bold,
    marginTop: 2,
  },
  calDayTextSel: {
    color: Colors.text.inverse,
  },
  tdDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.neon.lime,
    marginTop: 3,
  },
  tdDotSel: {
    backgroundColor: Colors.text.inverse,
  },
  calExpandBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  calExpandIcon: {
    color: Colors.neon.lime,
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },

  // ── Month Calendar ─────────────────────────────────────────────────
  monthCal: {
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavArrow: { color: Colors.neon.lime, fontSize: 12, fontWeight: FontWeight.bold },
  monthNavTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
  },
  monthDayHeaders: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  monthDayHeader: {
    width: (SW - Spacing.lg * 2 - Spacing.lg * 2) / 7,
    textAlign: 'center',
    color: Colors.text.muted,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthDay: {
    width: (SW - Spacing.lg * 2 - Spacing.lg * 2) / 7,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  monthDaySel: { backgroundColor: Colors.neon.lime },
  monthDayTd: { backgroundColor: Colors.neon.limeGlow, borderRadius: 10 },
  monthDayEmpty: { width: (SW - Spacing.lg * 2 - Spacing.lg * 2) / 7, height: 36 },
  monthDayText: { color: Colors.text.secondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  monthDayTextSel: { color: Colors.text.inverse, fontWeight: FontWeight.bold },
  monthDayTextTd: { color: Colors.neon.lime, fontWeight: FontWeight.bold },
  monthTdDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.neon.lime, position: 'absolute', bottom: 2 },
  monthTdDotSel: { backgroundColor: Colors.text.inverse },

  // ── Skeleton ─────────────────────────────────────────────────────
  loadWrap: { alignItems: 'center', paddingVertical: Spacing['3xl'] },

  // ── Calorie Ring Hero ────────────────────────────────────────────
  ringSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
  },
  ringValue: {
    fontSize: 42,
    fontWeight: FontWeight.black,
    color: Colors.text.primary,
    letterSpacing: -1.5,
  },
  ringLabel: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    fontWeight: FontWeight.medium,
    marginTop: 2,
  },
  ringRemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  ringDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  ringRemText: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    fontWeight: FontWeight.medium,
  },

  // ── Section titles ────────────────────────────────────────────────
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },

  // ── Macro Card ────────────────────────────────────────────────────
  macroCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  macroCardGlow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(139,92,246,0.08)',
  },
  macroCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  macroCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroCardTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
  },
  macroList: {
    gap: Spacing.lg,
  },
  macroBarItem: {
    gap: 6,
  },
  macroBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  macroBarLabel: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    fontWeight: FontWeight.medium,
  },
  macroBarVal: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  macroBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  // ── Dual Card Row ─────────────────────────────────────────────────
  dualCardRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  halfCard: {
    width: HALF_W,
    padding: Spacing.md,
    overflow: 'hidden',
  },
  halfCardGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59,130,246,0.08)',
  },
  halfCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  halfCardIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  halfCardIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halfCardTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
  },

  // Water
  waterAddBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(59,130,246,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterAddIcon: {
    color: '#60a5fa',
    fontSize: 16,
    fontWeight: FontWeight.bold,
    marginTop: -1,
  },
  waterContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  waterValue: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.extrabold,
    color: Colors.text.primary,
  },
  waterGoalText: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    fontWeight: FontWeight.medium,
  },
  waterDropRow: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'flex-end',
  },
  waterDropBar: {
    width: 6,
    height: 22,
    borderRadius: 3,
  },
  waterDropFilled: {
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 3,
  },
  waterDropEmpty: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // Steps
  stepsValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    color: Colors.text.primary,
  },
  stepsGoalText: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    fontWeight: FontWeight.medium,
    marginTop: 1,
  },
  stepsExtraRow: {
    marginTop: 4,
  },
  stepsBurnedText: {
    fontSize: 10,
    color: Colors.text.secondary,
    fontWeight: FontWeight.medium,
  },
  stepsProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
  },
  stepsBadgeText: {
    position: 'absolute',
    fontSize: 8,
    fontWeight: FontWeight.bold,
    color: '#22c55e',
  },
  stepsToGoText: {
    fontSize: 9,
    color: Colors.text.muted,
    marginTop: 3,
    fontWeight: FontWeight.medium,
  },

  // Mini progress bar (shared)
  miniProgressTrack: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2.5,
  },

  // ── Stats Row ─────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  statUnit: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.text.secondary,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.text.muted,
    fontWeight: FontWeight.medium,
    marginTop: 4,
  },

  // ── Meals Summary ─────────────────────────────────────────────────
  mealsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  mealsSummaryLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  mealsSummaryIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealsSummaryTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
  },
  mealsSummarySub: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  mealsSummaryArrow: {
    fontSize: 24,
    color: Colors.text.muted,
    fontWeight: FontWeight.medium,
  },

  // ── Quick Actions ─────────────────────────────────────────────────
  quickActionsCard: {
    padding: Spacing.xl,
    marginBottom: Spacing.md,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  quickAction: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  quickActionGrad: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  quickActionLabel: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    fontWeight: FontWeight.semibold,
  },

  // ── Health Connect Banner ─────────────────────────────────────────
  hcBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  hcBannerIconBg: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hcBannerTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.neon.lime,
  },
  hcBannerSub: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    marginTop: 2,
  },
});
