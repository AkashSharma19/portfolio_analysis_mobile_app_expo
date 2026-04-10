import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioHealth } from '@/hooks/usePortfolioHealth';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Circle, G, Path, Svg } from 'react-native-svg';

// ─── Gauge geometry (viewBox units) ─────────────────────────────────────────
const VW = 260;
const VH = 165; // extra bottom clearance for the hub circle
const CX = VW / 2; // 130
const CY = VH - 22; // 143 — base of semicircle, hub fits without clipping
const RO = 108; // outer radius
const RI = 72; // inner radius
const GAP = 0; // no gap between segments

function pt(r: number, score: number) {
  const a = (1 - score / 100) * Math.PI;
  return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) };
}

function segPath(from: number, to: number, N = 48): string {
  const outer: string[] = [];
  const inner: string[] = [];
  for (let i = 0; i <= N; i++) {
    const s = from + (to - from) * (i / N);
    const o = pt(RO, s);
    outer.push(`${o.x.toFixed(2)},${o.y.toFixed(2)}`);
  }
  for (let i = N; i >= 0; i--) {
    const s = from + (to - from) * (i / N);
    const p = pt(RI, s);
    inner.push(`${p.x.toFixed(2)},${p.y.toFixed(2)}`);
  }
  return `M ${outer[0]} L ${outer.slice(1).join(' ')} L ${inner[0]} L ${inner.slice(1).join(' ')} Z`;
}

function needlePath(score: number): string {
  const a = (1 - score / 100) * Math.PI;
  const tip = {
    x: CX + (RO - 12) * Math.cos(a),
    y: CY - (RO - 12) * Math.sin(a),
  };
  const hw = 5;
  const bl = { x: CX + hw * Math.sin(a), y: CY + hw * Math.cos(a) };
  const br = { x: CX - hw * Math.sin(a), y: CY - hw * Math.cos(a) };
  return `M ${bl.x.toFixed(2)},${bl.y.toFixed(2)} L ${tip.x.toFixed(2)},${tip.y.toFixed(2)} L ${br.x.toFixed(2)},${br.y.toFixed(2)} Z`;
}

const SEGS = [
  { from: 0, to: 25, color: '#FF3B30' },
  { from: 25, to: 50, color: '#FF9500' },
  { from: 50, to: 75, color: '#FFCC00' },
  { from: 75, to: 100, color: '#34C759' },
];

// ✨ Redesigned Circular Progress for Compact View
const CircularProgress = ({
  score,
  size,
  color,
  trackColor,
  textColor,
  grade,
  isPrivacyMode,
}: any) => {
  const r = size * 0.4;
  const center = size / 2;
  const circum = 2 * Math.PI * r;
  const offset = circum - (score / 100) * circum;

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
      }}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={trackColor}
          strokeWidth={size * 0.08}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={color}
          strokeWidth={size * 0.08}
          strokeDasharray={`${circum} ${circum}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={styles.compactScoreBox}>
        <Text style={[styles.compactScoreNum, { color }]}>
          {isPrivacyMode ? '**' : score}
        </Text>
        <Text style={[styles.compactScoreLabel, { color: textColor }]}>
          HEALTH
        </Text>
      </View>
    </View>
  );
};

import { Shield } from 'lucide-react-native';

// ─── Component ───────────────────────────────────────────────────────────────
export const PortfolioHealthCard = ({
  isCompact = false,
}: {
  isCompact?: boolean;
}) => {
  const router = useRouter();
  const theme = useColorScheme() ?? 'dark';
  const c = Colors[theme];
  const health = usePortfolioHealth();
  const isPrivacyMode = usePortfolioStore((s) => s.isPrivacyMode);
  const { width: sw } = useWindowDimensions();

  const [containerWidth, setContainerWidth] = React.useState(150);

  if (health.isEmpty) return null;

  const { totalScore, grade, gradeColor } = health;
  const trackColor = theme === 'dark' ? '#2C2C2E' : '#E5E5EA';
  const needleColor = theme === 'dark' ? '#FFFFFF' : '#1C1C1E';

  // Derive pixel dimensions from container width
  const svgW = isCompact ? containerWidth : sw - 32;
  const svgH = isCompact ? svgW : Math.round(svgW * (VH / VW));

  // Where the hub sits in React Native coords (for the score overlay)
  const hubY = svgH * (CY / VH);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/portfolio-health');
      }}
      onLayout={(e) => {
        if (isCompact) {
          setContainerWidth(e.nativeEvent.layout.width - 32);
        }
      }}
      style={[
        styles.card,
        { backgroundColor: c.card, borderColor: c.border },
        isCompact && {
          flex: 1,
          padding: 16,
          marginBottom: 0,
          borderRadius: 24,
          justifyContent: 'space-between',
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {isCompact && <Shield size={12} color={c.textSecondary} />}
          <Text
            style={[
              styles.sectionLabel,
              { color: c.textSecondary, fontSize: isCompact ? 9 : 10 },
            ]}
          >
            {isCompact ? 'HEALTH' : 'PORTFOLIO HEALTH'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {!isCompact && (
            <View
              style={[
                styles.gradeBadge,
                { backgroundColor: `${gradeColor}22` },
              ]}
            >
              <Text style={[styles.gradeText, { color: gradeColor }]}>
                {grade}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: c.cardSecondary, width: 24, height: 24 },
            ]}
          >
            <ArrowRight size={12} color={c.tint} />
          </View>
        </View>
      </View>

      {isCompact ? (
        <View
          style={[styles.compactMain, { flex: 1, justifyContent: 'center' }]}
        >
          <CircularProgress
            score={totalScore}
            size={svgW * 0.85}
            color={gradeColor}
            trackColor={trackColor}
            textColor={c.textSecondary}
            grade={grade}
            isPrivacyMode={isPrivacyMode}
          />
          <View
            style={[
              styles.compactGradeBadge,
              { backgroundColor: `${gradeColor}11` },
            ]}
          >
            <Text style={[styles.compactGradeText, { color: gradeColor }]}>
              {grade.toUpperCase()}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.gaugeContainer}>
          <Svg width={svgW} height={svgH} viewBox={`0 0 ${VW} ${VH}`}>
            <G>
              <Path d={segPath(0, 100)} fill={trackColor} />
              {SEGS.map((seg) => {
                if (totalScore <= seg.from) return null;
                const clipTo = Math.min(totalScore, seg.to);
                if (seg.from >= clipTo) return null;
                return (
                  <Path
                    key={seg.from}
                    d={segPath(seg.from, clipTo)}
                    fill={seg.color}
                  />
                );
              })}
              <Path
                d={needlePath(totalScore)}
                fill={needleColor}
                opacity={0.95}
              />
              <Circle cx={CX} cy={CY} r={12} fill={gradeColor} />
              <Circle cx={CX} cy={CY} r={6} fill={needleColor} />
            </G>
          </Svg>
          <View
            style={[styles.scoreBox, { bottom: svgH - hubY + 15 }]}
            pointerEvents="none"
          >
            <Text
              style={[
                styles.scoreNum,
                { color: gradeColor, fontSize: 32, lineHeight: 36 },
              ]}
            >
              {totalScore}
            </Text>
            <Text
              style={[
                styles.scoreOut,
                { color: c.textSecondary, fontSize: 14 },
              ]}
            >
              / 100
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    paddingBottom: 24,
    borderWidth: 1,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: 'Outfit_700Bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gradeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  gradeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Outfit_700Bold',
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gaugeContainer: {
    position: 'relative',
    alignItems: 'center',
    marginTop: 4,
  },
  scoreBox: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  scoreNum: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 36,
    fontFamily: 'Outfit_700Bold',
  },
  scoreOut: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 3,
    fontFamily: 'Outfit_500Medium',
  },
  compactMain: {
    alignItems: 'center',
    paddingTop: 8,
  },
  compactScoreBox: {
    position: 'absolute',
    alignItems: 'center',
  },
  compactScoreNum: {
    fontSize: 24,
    fontWeight: '500',
    fontFamily: 'Outfit_500Medium',
  },
  compactScoreLabel: {
    fontSize: 7,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: -2,
    fontFamily: 'Outfit_700Bold',
  },
  compactGradeBadge: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  compactGradeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: 'Outfit_700Bold',
  },
});
