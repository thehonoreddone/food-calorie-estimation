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
import { router } from 'expo-router';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import { useUser } from '@/contexts/UserContext';
import { useTranslation } from '@/i18n';
import { hapticSelection, hapticLight, hapticMedium } from '../../src/utils/haptics';
import { SkeletonCalorieRing, SkeletonCard, Skeleton } from '../../src/components/ui/SkeletonLoader';
import {
  getMealsForDate,
  getExercisesForDate,
  MealEntry,
  ExerciseEntry,
  getDailyHealth,
  saveDailyHealth,
  DailyHealthData,
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
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';

const { width: SW } = Dimensions.get('window');

// ─── Date helpers ───────────────────────────────────────────────────────────

function fmtDate(d: Date) { return d.toISOString().split('T')[0]; }
function sameDay(a: Date, b: Date) { return fmtDate(a) === fmtDate(b); }

function dayLabels(l: string) {
  return l === 'en'
    ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    : ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];
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

// ─── Calorie Ring (SVG) ────────────────────────────────────────────────────

function CalRing({ eaten, target, sz = 150 }: { eaten: number; target: number; sz?: number }) {
  const sw = 14, r = (sz - sw) / 2, c = 2 * Math.PI * r;
  const rem = Math.max(0, target - eaten);
  const p = target > 0 ? Math.min(eaten / target, 1) : 0;
  return (
    <View style={{ width: sz, height: sz, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={sz} height={sz}>
        <Defs>
          <SvgGrad id="rg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={Colors.primary[400]} />
            <Stop offset="100%" stopColor={Colors.primary[600]} />
          </SvgGrad>
        </Defs>
        <Circle cx={sz/2} cy={sz/2} r={r} stroke={Colors.neutral[200]} strokeWidth={sw} fill="none" />
        <Circle cx={sz/2} cy={sz/2} r={r} stroke="url(#rg)" strokeWidth={sw} fill="none"
          strokeDasharray={`${c}`} strokeDashoffset={c*(1-p)} strokeLinecap="round"
          transform={`rotate(-90 ${sz/2} ${sz/2})`} />
      </Svg>
      <View style={{ position:'absolute', alignItems:'center' }}>
        <Text style={{ fontSize: 30, fontWeight: '900', color: Colors.text.primary }}>{rem.toLocaleString('tr-TR')}</Text>
        <Text style={{ fontSize: 12, color: Colors.text.secondary, fontWeight: '500' }}>Kalan</Text>
      </View>
    </View>
  );
}

// ─── Small ring for macros ──────────────────────────────────────────────────

function MiniRing({ p, sz = 42, clr, children }: { p: number; sz?: number; clr: string; children: React.ReactNode }) {
  const w = 4, r = (sz-w)/2, c = 2*Math.PI*r;
  return (
    <View style={{ width: sz, height: sz, alignItems:'center', justifyContent:'center' }}>
      <Svg width={sz} height={sz}>
        <Circle cx={sz/2} cy={sz/2} r={r} stroke={Colors.neutral[100]} strokeWidth={w} fill="none" />
        <Circle cx={sz/2} cy={sz/2} r={r} stroke={clr} strokeWidth={w} fill="none"
          strokeDasharray={`${c}`} strokeDashoffset={c*(1-Math.min(p,1))} strokeLinecap="round"
          transform={`rotate(-90 ${sz/2} ${sz/2})`} />
      </Svg>
      <View style={{ position:'absolute' }}>{children}</View>
    </View>
  );
}

// ─── Macro bar item ─────────────────────────────────────────────────────────

function MacroItem({ label, eaten, goal, clr }: { label: string; eaten: number; goal: number; clr: string }) {
  const p = goal > 0 ? eaten / goal : 0;
  return (
    <View style={S.macroItem}>
      <MiniRing p={p} clr={clr}><Text style={{ fontSize:10, fontWeight:'700', color: clr }}>{Math.round(p*100)}%</Text></MiniRing>
      <View style={{ marginLeft: 8 }}>
        <Text style={{ fontSize:11, color: Colors.text.secondary, fontWeight:'500' }}>{label}</Text>
        <Text style={{ fontSize:13, fontWeight:'800', color: Colors.text.primary }}>{eaten}/{goal}g</Text>
      </View>
    </View>
  );
}

// ─── Dashboard card ─────────────────────────────────────────────────────────

function DCard({ icon, title, val, sub, clr, onPress }: { icon: string; title: string; val: string; sub: string; clr: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={[S.dCard, Shadows.sm]} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={[S.dCardIcon, { backgroundColor: clr + '18' }]}><Text style={{ fontSize:22 }}>{icon}</Text></View>
      <Text style={S.dCardTitle}>{title}</Text>
      <Text style={[S.dCardVal, { color: clr }]}>{val}</Text>
      <Text style={S.dCardSub}>{sub}</Text>
    </TouchableOpacity>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function HomeTab() {
  const { profile, calculateDailyCalories, calculateMacros } = useUser();
  const { t, lang } = useTranslation();
  const today = new Date();

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

  const stGoal = health.stepsGoal ?? 10000;
  const wGoal = health.waterGoal ?? 2500;

  // ─── Load ──────────────────────────────────────────────────────────
  const load = useCallback(async (d: Date) => {
    if (!profile.uid) return;
    setLoading(true);
    try {
      const dk = fmtDate(d);
      const td = sameDay(d, new Date());
      const [ml, ex, dh] = await Promise.all([
        getMealsForDate(profile.uid, dk),
        getExercisesForDate(profile.uid, dk),
        getDailyHealth(profile.uid, dk),
      ]);
      setMeals(ml); setExercises(ex); setHealth(dh ?? {}); setWater(dh?.waterMl ?? 0);

      // Health Connect
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
    } catch (e) { console.error('Load error:', e); }
    finally { setLoading(false); setLoaded(true); }
  }, [profile.uid]);

  useEffect(() => {
    (async () => { const a = await isHealthConnectAvailable(); setHcOn(a); if (a) await initHealthConnect(); })();
  }, []);

  const lastDk = useRef('');
  const dk = fmtDate(selDate);
  if (dk !== lastDk.current && profile.uid) { lastDk.current = dk; load(selDate); }

  // ─── Calc ──────────────────────────────────────────────────────────
  const tgt = calculateDailyCalories();
  const eaten = meals.reduce((s, m) => s + m.calories, 0);
  const burned = exercises.reduce((s, e) => s + e.caloriesBurned, 0);
  const macros = calculateMacros();
  const eProt = meals.reduce((s, m) => s + (m.protein ?? 0), 0);
  const eCarb = meals.reduce((s, m) => s + (m.carbs ?? 0), 0);
  const eFat = meals.reduce((s, m) => s + (m.fat ?? 0), 0);

  const days = calDays(today);
  const dN = dayLabels(lang);
  const mN = monthLabels(lang);

  const addWater = async (ml: number) => {
    if (!profile.uid) return;
    const nw = Math.max(0, water + ml);
    setWater(nw);
    saveDailyHealth(profile.uid, fmtDate(selDate), { waterMl: nw, waterGoal: wGoal }).catch(() => {});
  };

  const connectHC = async () => {
    const a = await isHealthConnectAvailable();
    if (!a) { Alert.alert('Health Connect', 'Google Health Connect uygulaması yüklü değil. Lütfen Play Store\'dan yükleyin.'); return; }
    const ok = await requestHealthPermissions();
    if (ok) { setHcOn(true); load(selDate); }
  };

  const goDayDetail = (d: Date) => {
    setSelDate(d);
    router.push({ pathname: '/day-detail', params: { date: fmtDate(d) } });
  };

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <LinearGradient colors={[Colors.primary[500], Colors.primary[700]]} start={{x:0,y:0}} end={{x:1,y:1}} style={S.header}>
        <View style={S.headerTop}>
          <View>
            <Text style={S.greeting}>{t('home.greeting', { name: profile.name ?? (lang === 'en' ? 'User' : 'Kullanıcı') })}</Text>
            <Text style={S.headerSub}>{mN[selDate.getMonth()]} {selDate.getDate()}, {selDate.getFullYear()}</Text>
          </View>
          <TouchableOpacity style={S.settingsBtn} onPress={() => router.push('/settings')}>
            <Text style={{ fontSize: 20 }}>⚙️</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.calStrip}>
          {days.map((day, i) => {
            const sel = sameDay(day, selDate), td = sameDay(day, today);
            return (
              <TouchableOpacity key={i} style={[S.calDay, sel && S.calDaySel, td && !sel && S.calDayTd]}
                onPress={() => { hapticSelection(); setSelDate(day); }} onLongPress={() => goDayDetail(day)}>
                <Text style={[S.calDayN, sel && S.calDayA]}>{dN[day.getDay()]}</Text>
                <Text style={[S.calDayNum, sel && S.calDayA]}>{day.getDate()}</Text>
                {td && <View style={[S.tdDot, sel && S.tdDotA]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.scroll}>
        {loading && !loaded ? (
          <View style={S.loadWrap}>
            {/* Skeleton calorie ring */}
            <SkeletonCalorieRing />
            {/* Skeleton macro row */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20, width: '100%' }}>
              <Skeleton width="30%" height={50} borderRadius={12} />
              <Skeleton width="30%" height={50} borderRadius={12} />
              <Skeleton width="30%" height={50} borderRadius={12} />
            </View>
            {/* Skeleton stat cards */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20, width: '100%' }}>
              <SkeletonCard style={{ flex: 1 }} />
              <SkeletonCard style={{ flex: 1 }} />
            </View>
          </View>
        ) : (
          <>
            {/* ─── Calorie Card ──────────────────────────────────── */}
            <View style={[S.calCard, Shadows.md]}>
              <Text style={S.calCardTitle}>Kaloriler</Text>
              <Text style={S.calFormula}>Kalan = Hedef - Yiyecek + Egzersiz</Text>
              <View style={S.calBody}>
                <CalRing eaten={eaten} target={tgt} />
                <View style={S.calStatsCol}>
                  <CalStat icon="🏁" label="Temel Hedef" value={tgt} color={Colors.text.primary} />
                  <CalStat icon="🍴" label="Yiyecek" value={eaten} color={Colors.primary[600]} />
                  <CalStat icon="🔥" label="Egzersiz" value={burned} color={Colors.accent.orange} />
                </View>
              </View>
            </View>

            {/* ─── Macros ────────────────────────────────────────── */}
            <View style={[S.macroRow, Shadows.sm]}>
              <MacroItem label="Protein" eaten={eProt} goal={macros.protein} clr="#ef4444" />
              <View style={S.macroDivider} />
              <MacroItem label="Karb" eaten={eCarb} goal={macros.carbs} clr={Colors.accent.amber} />
              <View style={S.macroDivider} />
              <MacroItem label="Yağ" eaten={eFat} goal={macros.fat} clr="#3b82f6" />
            </View>

            {/* ─── Stats Grid ────────────────────────────────────── */}
            <View style={S.grid}>
              <DCard icon="👟" title="Adım" val={steps.toLocaleString('tr-TR')}
                sub={`Hedef: ${stGoal.toLocaleString('tr-TR')}`} clr={Colors.primary[500]}
                onPress={hcOn ? undefined : connectHC} />
              <DCard icon="🔥" title="Egzersiz" val={`${burned} kal`}
                sub={exercises.length > 0 ? `${exercises.reduce((s,e) => s + e.duration, 0)} dk` : 'Ekle →'}
                clr={Colors.accent.orange} onPress={() => goDayDetail(selDate)} />
              <DCard icon="🌙" title="Uyku"
                val={sleepH > 0 || sleepM > 0 ? `${sleepH}sa ${sleepM}dk` : '—'}
                sub={sleepH >= 7 ? 'İyi uyku 👍' : sleepH > 0 ? 'Daha fazla uyu' : 'Bağlan →'}
                clr="#8b5cf6" onPress={hcOn ? undefined : connectHC} />
              <DCard icon="💧" title="Su" val={`${water} ml`}
                sub={`Hedef: ${wGoal} ml`} clr="#06b6d4" onPress={() => addWater(250)} />
            </View>

            {/* ─── Connect HC ────────────────────────────────────── */}
            {!hcOn && (
              <TouchableOpacity style={[S.hcCard, Shadows.sm]} onPress={connectHC}>
                <Text style={S.hcIcon}>🔗</Text>
                <View style={{ flex: 1 }}>
                  <Text style={S.hcTitle}>Health Connect Bağla</Text>
                  <Text style={S.hcSub}>Adım ve uyku verilerini otomatik izleyin</Text>
                </View>
                <Text style={{ fontSize: 20, color: Colors.primary[500] }}>›</Text>
              </TouchableOpacity>
            )}

            {/* ─── Meals Link ────────────────────────────────────── */}
            <TouchableOpacity style={[S.linkCard, Shadows.sm]} onPress={() => goDayDetail(selDate)} activeOpacity={0.7}>
              <Text style={S.linkIcon}>🍽️</Text>
              <View style={{ flex: 1 }}>
                <Text style={S.linkTitle}>Öğünleri Görüntüle</Text>
                <Text style={S.linkSub}>
                  {meals.length > 0 ? `${meals.length} kayıt • ${eaten} kcal` : 'Yemek eklemek için dokunun'}
                </Text>
              </View>
              <Text style={{ fontSize: 20, color: Colors.text.light }}>›</Text>
            </TouchableOpacity>

            {/* ─── Diet ──────────────────────────────────────────── */}
            <TouchableOpacity style={[S.dietBtn, Shadows.sm]} onPress={() => router.push('/diet-recommendation')} activeOpacity={0.8}>
              <Text style={{ fontSize: 28 }}>🥗</Text>
              <View style={{ flex: 1 }}>
                <Text style={S.dietTxt}>{t('home.dietSuggestion')}</Text>
                <Text style={S.dietSub}>{t('home.personalPlan')}</Text>
              </View>
              <Text style={{ fontSize: 16, color: Colors.text.light }}>›</Text>
            </TouchableOpacity>

            {/* ─── Weight ────────────────────────────────────────── */}
            <TouchableOpacity style={[S.wCard, Shadows.sm]} onPress={() => router.push('/weight-tracking')} activeOpacity={0.7}>
              <View style={S.wHead}>
                <Text style={S.wTitle}>⚖️ Ağırlık</Text>
                <Text style={S.wAction}>+</Text>
              </View>
              <Text style={S.wVal}>{profile.weight ? `${profile.weight} kg` : '— kg'}</Text>
              <Text style={S.wSub}>{profile.targetWeight ? `Hedef: ${profile.targetWeight} kg` : 'Hedef belirle'}</Text>
            </TouchableOpacity>

            <View style={{ height: 30 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── CalStat helper ─────────────────────────────────────────────────────────

function CalStat({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ fontSize: 18, marginRight: 8 }}>{icon}</Text>
      <View>
        <Text style={{ fontSize: 11, color: Colors.text.secondary, fontWeight: '500' }}>{label}</Text>
        <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color }}>{value.toLocaleString('tr-TR')}</Text>
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const cardW = (SW - Spacing.lg * 2 - Spacing.md) / 2;

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.lg, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  greeting: { fontSize: FontSize['2xl'], fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  settingsBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  calStrip: { paddingVertical: Spacing.sm, gap: 6 },
  calDay: { width: 48, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  calDaySel: { backgroundColor: '#fff' },
  calDayTd: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  calDayN: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  calDayNum: { fontSize: FontSize.lg, color: '#fff', fontWeight: '700', marginTop: 2 },
  calDayA: { color: Colors.primary[700] },
  tdDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#fff', marginTop: 2 },
  tdDotA: { backgroundColor: Colors.primary[500] },
  scroll: { padding: Spacing.lg, paddingBottom: 20 },
  loadWrap: { alignItems: 'center', paddingVertical: Spacing['3xl'] },
  loadTxt: { color: Colors.text.secondary, marginTop: Spacing.md, fontSize: FontSize.sm },
  // Calorie card
  calCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius['2xl'], padding: Spacing.xl, marginBottom: Spacing.md },
  calCardTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text.primary },
  calFormula: { fontSize: FontSize.xs, color: Colors.text.light, marginTop: 2, marginBottom: Spacing.md },
  calBody: { flexDirection: 'row', alignItems: 'center' },
  calStatsCol: { flex: 1, marginLeft: Spacing.xl, gap: Spacing.md },
  // Macros
  macroRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.md, marginBottom: Spacing.md },
  macroItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  macroDivider: { width: 1, height: 36, backgroundColor: Colors.border },
  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.md },
  dCard: { width: cardW, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg },
  dCardIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  dCardTitle: { fontSize: FontSize.xs, color: Colors.text.secondary, fontWeight: '600', marginBottom: 2 },
  dCardVal: { fontSize: FontSize.xl, fontWeight: '800' },
  dCardSub: { fontSize: 11, color: Colors.text.light, marginTop: 2 },
  // HC card
  hcCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary[50], borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.primary[200], gap: Spacing.md },
  hcIcon: { fontSize: 28 },
  hcTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary[700] },
  hcSub: { fontSize: FontSize.xs, color: Colors.primary[500], marginTop: 1 },
  // Link card
  linkCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md, gap: Spacing.md },
  linkIcon: { fontSize: 28 },
  linkTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary },
  linkSub: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 1 },
  // Diet
  dietBtn: { backgroundColor: Colors.primary[50], borderRadius: BorderRadius.xl, padding: Spacing.md, marginBottom: Spacing.md, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.primary[200], gap: Spacing.md },
  dietTxt: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary[700] },
  dietSub: { fontSize: FontSize.xs, color: Colors.primary[500], marginTop: 1 },
  // Weight
  wCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md },
  wHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  wTitle: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  wAction: { fontSize: 22, color: Colors.text.light, fontWeight: '600' },
  wVal: { fontSize: FontSize['2xl'], fontWeight: '900', color: Colors.text.primary },
  wSub: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },
});
