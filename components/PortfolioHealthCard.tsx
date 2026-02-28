import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioHealth } from '@/hooks/usePortfolioHealth';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Circle, G, Path, Svg } from 'react-native-svg';

// ─── Gauge geometry (viewBox units) ─────────────────────────────────────────
const VW = 260;
const VH = 165;         // extra bottom clearance for the hub circle
const CX = VW / 2;      // 130
const CY = VH - 22;     // 143 — base of semicircle, hub fits without clipping
const RO = 108;         // outer radius
const RI = 72;          // inner radius
const GAP = 0;          // no gap between segments

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
    const tip = { x: CX + (RO - 12) * Math.cos(a), y: CY - (RO - 12) * Math.sin(a) };
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

// ─── Component ───────────────────────────────────────────────────────────────
export const PortfolioHealthCard = () => {
    const router = useRouter();
    const theme = useColorScheme() ?? 'dark';
    const c = Colors[theme];
    const health = usePortfolioHealth();
    const { width: sw } = useWindowDimensions();

    if (health.isEmpty) return null;

    const { totalScore, grade, gradeColor } = health;
    const trackColor = theme === 'dark' ? '#2C2C2E' : '#E5E5EA';
    const needleColor = theme === 'dark' ? '#FFFFFF' : '#1C1C1E';

    // Derive pixel dimensions from screen width (card has 16px padding each side)
    const svgW = sw - 32;
    const svgH = Math.round(svgW * (VH / VW));

    // Where the hub sits in React Native coords (for the score overlay)
    const hubY = svgH * (CY / VH);

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/portfolio-health');
            }}
            style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>
                    PORTFOLIO HEALTH
                </Text>
                <View style={styles.headerRight}>
                    <View style={[styles.gradeBadge, { backgroundColor: `${gradeColor}22` }]}>
                        <Text style={[styles.gradeText, { color: gradeColor }]}>{grade}</Text>
                    </View>
                    <View style={[styles.iconCircle, { backgroundColor: c.cardSecondary }]}>
                        <ArrowRight size={14} color={c.tint} />
                    </View>
                </View>
            </View>

            {/* Speedometer */}
            <View style={styles.gaugeContainer}>
                <Svg width={svgW} height={svgH} viewBox={`0 0 ${VW} ${VH}`}>
                    <G>
                        {/* Full track */}
                        <Path d={segPath(0, 100)} fill={trackColor} />

                        {/* Filled segments */}
                        {SEGS.map((seg) => {
                            if (totalScore <= seg.from) return null;
                            const clipTo = Math.min(totalScore, seg.to);
                            if (seg.from >= clipTo) return null;
                            return <Path key={seg.from} d={segPath(seg.from, clipTo)} fill={seg.color} />;
                        })}

                        {/* Needle */}
                        <Path d={needlePath(totalScore)} fill={needleColor} opacity={0.95} />

                        {/* Hub */}
                        <Circle cx={CX} cy={CY} r={12} fill={gradeColor} />
                        <Circle cx={CX} cy={CY} r={6} fill={needleColor} />
                    </G>
                </Svg>

                {/* Score text positioned above the hub */}
                <View style={[styles.scoreBox, { bottom: svgH - hubY + 15 }]} pointerEvents="none">
                    <Text style={[styles.scoreNum, { color: gradeColor }]}>{totalScore}</Text>
                    <Text style={[styles.scoreOut, { color: c.textSecondary }]}>/ 100</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        padding: 16,
        paddingBottom: 24, // Added more bottom padding for symmetry
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
        fontWeight: '800',
        lineHeight: 36,
    },
    scoreOut: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 3,
    },
});
