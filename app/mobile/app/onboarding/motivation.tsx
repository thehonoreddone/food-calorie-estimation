import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Defs, LinearGradient as SvgGradient, Stop, Line, Rect, Text as SvgText } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '@/contexts/UserContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH  = SCREEN_WIDTH - 80;
const CHART_HEIGHT = 200;
const CHART_PAD_LEFT = 40;
const CHART_PAD_RIGHT = 20;
const CHART_PAD_TOP = 20;
const CHART_PAD_BOTTOM = 35;
const PLOT_WIDTH = CHART_WIDTH - CHART_PAD_LEFT - CHART_PAD_RIGHT;
const PLOT_HEIGHT = CHART_HEIGHT - CHART_PAD_TOP - CHART_PAD_BOTTOM;

const BG_DARK    = '#080E0C';
const NEON_GREEN = '#2DD4A0';

// ─── Skeleton Loader ────────────────────────────────────────────────────────
function ChartSkeleton() {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.chartContainer}>
      <Animated.View style={[styles.skeletonTitle, { opacity: pulseAnim }]} />
      <Animated.View style={[styles.skeletonChart, { opacity: pulseAnim }]}>
        {/* Fake grid lines */}
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={[styles.skeletonLine, { top: `${25 * i + 10}%` }]} />
        ))}
        {/* Fake data line */}
        <View style={styles.skeletonCurve} />
      </Animated.View>
      <View style={styles.skeletonLabels}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Animated.View key={i} style={[styles.skeletonLabel, { opacity: pulseAnim }]} />
        ))}
      </View>
    </View>
  );
}

// ─── Realistic Weight Chart ─────────────────────────────────────────────────
function WeightChart({ goal, weight, targetWeight }: { goal: string; weight: number; targetWeight: number }) {
  const drawAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [drawProgress, setDrawProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Show skeleton for 1.5 seconds, then draw the chart
    const timer = setTimeout(() => {
      setIsLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(drawAnim, { toValue: 1, duration: 1800, useNativeDriver: false }),
      ]).start();
    }, 1500);

    const listenerId = drawAnim.addListener(({ value }) => setDrawProgress(value));
    return () => {
      clearTimeout(timer);
      drawAnim.removeListener(listenerId);
    };
  }, []);

  if (isLoading) return <ChartSkeleton />;

  const isGain = goal === 'gain';
  const isLose = goal === 'lose';

  // Generate realistic 12-week projection with slight natural variance
  const weeks = 12;
  const startW = weight;
  const endW = targetWeight || (isGain ? weight + 6 : isLose ? weight - 6 : weight);
  const diff = endW - startW;

  // Create points with natural variation (fast at start, slowing down)
  const dataPoints: { week: number; kg: number }[] = [];
  for (let i = 0; i <= weeks; i++) {
    // Logarithmic progress curve (fast start, diminishing returns)
    const linearProgress = i / weeks;
    const curvedProgress = Math.pow(linearProgress, 0.7); // natural deceleration
    // Add small random-looking variance (deterministic based on week)
    const variance = Math.sin(i * 2.7) * 0.3 + Math.cos(i * 1.3) * 0.2;
    const projected = startW + diff * curvedProgress + variance;
    dataPoints.push({ week: i, kg: Math.round(projected * 10) / 10 });
  }
  // Ensure last point is exactly target
  dataPoints[weeks].kg = endW;

  // Calculate bounds
  const allKg = dataPoints.map(p => p.kg);
  const minKg = Math.floor(Math.min(...allKg, startW, endW) - 1);
  const maxKg = Math.ceil(Math.max(...allKg, startW, endW) + 1);
  const rangeKg = maxKg - minKg;

  // Map data to SVG coordinates
  const svgPoints = dataPoints.map(p => ({
    x: CHART_PAD_LEFT + (p.week / weeks) * PLOT_WIDTH,
    y: CHART_PAD_TOP + (1 - (p.kg - minKg) / rangeKg) * PLOT_HEIGHT,
    kg: p.kg,
    week: p.week,
  }));

  // Build smooth bezier path
  const buildPath = (pts: typeof svgPoints) => {
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
      const cpx2 = prev.x + (curr.x - prev.x) * 0.6;
      d += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  };

  // Determine how many points to show based on animation progress
  const visibleCount = Math.max(2, Math.round(drawProgress * svgPoints.length));
  const visiblePoints = svgPoints.slice(0, visibleCount);

  const linePath = buildPath(visiblePoints);
  const lastVisible = visiblePoints[visiblePoints.length - 1];

  // Fill area under the visible curve
  const fillPath = linePath
    ? `${linePath} L ${lastVisible.x} ${CHART_PAD_TOP + PLOT_HEIGHT} L ${svgPoints[0].x} ${CHART_PAD_TOP + PLOT_HEIGHT} Z`
    : '';

  // Y-axis labels (5 marks)
  const yLabels: { kg: number; y: number }[] = [];
  const ySteps = 4;
  for (let i = 0; i <= ySteps; i++) {
    const kg = minKg + (rangeKg * i) / ySteps;
    const y = CHART_PAD_TOP + (1 - i / ySteps) * PLOT_HEIGHT;
    yLabels.push({ kg: Math.round(kg), y });
  }

  // X-axis labels
  const xLabels = [
    { label: 'Şimdi', week: 0 },
    { label: '3 Hf', week: 3 },
    { label: '6 Hf', week: 6 },
    { label: '9 Hf', week: 9 },
    { label: '12 Hf', week: 12 },
  ];

  // Goal line Y position
  const goalY = CHART_PAD_TOP + (1 - (endW - minKg) / rangeKg) * PLOT_HEIGHT;

  return (
    <Animated.View style={[styles.chartContainer, { opacity: fadeAnim }]}>
      <View style={styles.chartHeaderRow}>
        <Text style={styles.chartTitle}>Kilo geçişiniz</Text>
        <View style={styles.chartBadge}>
          <Text style={styles.chartBadgeText}>
            {isGain ? '📈' : isLose ? '📉' : '⚖️'} {Math.abs(diff).toFixed(1)} kg
          </Text>
        </View>
      </View>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
        <Defs>
          <SvgGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={NEON_GREEN} stopOpacity="0.35" />
            <Stop offset="60%" stopColor={NEON_GREEN} stopOpacity="0.08" />
            <Stop offset="100%" stopColor={NEON_GREEN} stopOpacity="0" />
          </SvgGradient>
          <SvgGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#16a34a" />
            <Stop offset="100%" stopColor={NEON_GREEN} />
          </SvgGradient>
        </Defs>

        {/* Grid lines */}
        {yLabels.map((yl, i) => (
          <Line
            key={`grid-${i}`}
            x1={CHART_PAD_LEFT}
            y1={yl.y}
            x2={CHART_WIDTH - CHART_PAD_RIGHT}
            y2={yl.y}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        ))}

        {/* Goal dashed line */}
        <Line
          x1={CHART_PAD_LEFT}
          y1={goalY}
          x2={CHART_WIDTH - CHART_PAD_RIGHT}
          y2={goalY}
          stroke="rgba(45,212,160,0.35)"
          strokeWidth={1.5}
          strokeDasharray="6,4"
        />

        {/* Y-axis labels */}
        {yLabels.map((yl, i) => (
          <SvgText
            key={`ylabel-${i}`}
            x={CHART_PAD_LEFT - 8}
            y={yl.y + 4}
            fill="rgba(255,255,255,0.35)"
            fontSize="10"
            fontWeight="500"
            textAnchor="end"
          >
            {yl.kg}
          </SvgText>
        ))}

        {/* X-axis labels */}
        {xLabels.map((xl, i) => (
          <SvgText
            key={`xlabel-${i}`}
            x={CHART_PAD_LEFT + (xl.week / weeks) * PLOT_WIDTH}
            y={CHART_HEIGHT - 8}
            fill="rgba(255,255,255,0.35)"
            fontSize="10"
            fontWeight="500"
            textAnchor="middle"
          >
            {xl.label}
          </SvgText>
        ))}

        {/* Goal label */}
        <SvgText
          x={CHART_WIDTH - CHART_PAD_RIGHT - 4}
          y={goalY - 6}
          fill="rgba(45,212,160,0.6)"
          fontSize="9"
          fontWeight="600"
          textAnchor="end"
        >
          Hedef: {endW} kg
        </SvgText>

        {/* Area fill */}
        {fillPath ? <Path d={fillPath} fill="url(#areaFill)" /> : null}

        {/* Main line */}
        {linePath ? (
          <Path d={linePath} stroke="url(#lineGrad)" strokeWidth={2.5} fill="none" strokeLinecap="round" />
        ) : null}

        {/* Data points */}
        {visiblePoints.map((p, i) => {
          const isLast = i === visiblePoints.length - 1;
          const isFirst = i === 0;
          // Show every 3rd point, first, and last
          if (!isFirst && !isLast && i % 3 !== 0) return null;
          return (
            <React.Fragment key={i}>
              {isLast && (
                <Circle cx={p.x} cy={p.y} r={10} fill="rgba(45,212,160,0.12)" />
              )}
              <Circle
                cx={p.x}
                cy={p.y}
                r={isLast ? 5 : isFirst ? 4.5 : 3.5}
                fill={isLast ? NEON_GREEN : isFirst ? '#16a34a' : 'rgba(255,255,255,0.15)'}
                stroke={isLast ? '#fff' : NEON_GREEN}
                strokeWidth={isLast ? 2 : 1.5}
              />
            </React.Fragment>
          );
        })}

        {/* Current weight label on last visible point */}
        {drawProgress > 0.8 && lastVisible && (
          <>
            <Rect
              x={lastVisible.x - 20}
              y={lastVisible.y - 26}
              width={40}
              height={18}
              rx={6}
              fill="rgba(45,212,160,0.2)"
              stroke="rgba(45,212,160,0.4)"
              strokeWidth={0.5}
            />
            <SvgText
              x={lastVisible.x}
              y={lastVisible.y - 14}
              fill="#fff"
              fontSize="10"
              fontWeight="700"
              textAnchor="middle"
            >
              {lastVisible.kg} kg
            </SvgText>
          </>
        )}
      </Svg>
    </Animated.View>
  );
}

export default function MotivationScreen() {
  const { profile } = useUser();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const goalText =
    profile.goal === 'lose'
      ? 'Hedefinize ulaşma potansiyeliniz çok yüksek'
      : profile.goal === 'gain'
      ? 'Kas kazanma potansiyeliniz çok yüksek'
      : 'Sağlıklı yaşam potansiyeliniz çok yüksek';

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
              <View style={[styles.progressFill, { width: '55%' }]} />
            </View>
          </View>
        </View>

        {/* Title */}
        <Animated.View style={[styles.titleSection, { opacity: fadeAnim }]}>
          <Text style={styles.title}>{goalText}</Text>
        </Animated.View>

        {/* Chart */}
        <View style={styles.chartArea}>
          <WeightChart 
            goal={profile.goal ?? 'maintain'} 
            weight={profile.weight ?? 75}
            targetWeight={profile.targetWeight ?? (profile.weight ?? 75)}
          />
        </View>

        {/* Stats summary */}
        <Animated.View style={[styles.statsRow, { opacity: fadeAnim }]}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.weight ?? 75} kg</Text>
            <Text style={styles.statLabel}>Şu anki</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: NEON_GREEN }]}>
              {profile.targetWeight ?? profile.weight ?? 75} kg
            </Text>
            <Text style={styles.statLabel}>Hedef</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12 hf</Text>
            <Text style={styles.statLabel}>Tahmini süre</Text>
          </View>
        </Animated.View>

        <View style={styles.spacer} />

        {/* Continue */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/onboarding/activity');
            }}
            activeOpacity={0.85}
            style={styles.btnWrap}
          >
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
    fontSize: 28, fontWeight: '800', color: '#F0FDF4', lineHeight: 38,
  },
  chartArea: { paddingHorizontal: 20, flex: 1, justifyContent: 'center' },
  chartContainer: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20, padding: 20,
  },
  chartHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 15, fontWeight: '600', color: '#F0FDF4',
  },
  chartBadge: {
    backgroundColor: 'rgba(45,212,160,0.12)',
    borderWidth: 1, borderColor: 'rgba(45,212,160,0.25)',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  chartBadgeText: {
    fontSize: 12, fontWeight: '700', color: NEON_GREEN,
  },

  // ── Skeleton ──
  skeletonTitle: {
    width: 120, height: 16, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  skeletonChart: {
    height: CHART_HEIGHT, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
    position: 'relative',
  },
  skeletonLine: {
    position: 'absolute', left: 40, right: 20,
    height: 1, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  skeletonCurve: {
    position: 'absolute', bottom: '30%', left: 40, right: 20,
    height: 2, borderRadius: 1,
    backgroundColor: 'rgba(45,212,160,0.15)',
  },
  skeletonLabels: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 12,
  },
  skeletonLabel: {
    width: 32, height: 10, borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  // ── Stats Row ──
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16, paddingVertical: 16, paddingHorizontal: 8,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 17, fontWeight: '800', color: '#F0FDF4' },
  statLabel: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.40)', marginTop: 4 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.08)' },

  spacer: { flex: 0.3 },
  footer: { paddingHorizontal: 20, paddingBottom: 32 },
  btnWrap: { borderRadius: 32, overflow: 'hidden' },
  btn: { paddingVertical: 20, alignItems: 'center', borderRadius: 32 },
  btnText: { fontSize: 17, fontWeight: '800', color: '#030E08' },
});
