import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioHealth } from '@/hooks/usePortfolioHealth';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Circle, Defs, G, LinearGradient, Path, Stop, Svg } from 'react-native-svg';

// ─── Gauge geometry (viewBox units) ─────────────────────────────────────────
const VW = 260;
const VH = 165;
const CX = VW / 2;
const CY = VH - 22;
const RO = 108;
const RI = 72;

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

export default function PortfolioHealthScreen() {
    const router = useRouter();
    const theme = useColorScheme() ?? 'dark';
    const c = Colors[theme];
    const health = usePortfolioHealth();
    const { width: sw } = useWindowDimensions();

    if (health.isEmpty) return null;

    const { totalScore, grade, gradeColor, dimensions } = health;
    const trackColor = theme === 'dark' ? '#2C2C2E' : '#F2F2F7';
    const needleColor = theme === 'dark' ? '#FFFFFF' : '#1C1C1E';

    const svgW = Math.min(sw - 60, 340);
    const svgH = Math.round(svgW * (VH / VW));
    const hubY = svgH * (CY / VH);

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: c.background }]} edges={['top', 'left', 'right']}>
            <View style={[styles.header, { backgroundColor: c.background }]}>
                <TouchableOpacity
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.back();
                    }}
                    style={[styles.backButton, { borderColor: c.border }]}
                >
                    <ArrowLeft size={24} color={c.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: c.text }]}>Portfolio Health</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                {/* Premium Hero Card */}
                <View style={[styles.heroCard, { backgroundColor: c.card, borderColor: c.border }]}>
                    <View style={styles.heroTop}>
                        <View style={styles.heroHeader}>
                            <Text style={[styles.heroLabel, { color: c.textSecondary }]}>HEALTH SCORE</Text>
                            <View style={[styles.gradeBadge, { backgroundColor: `${gradeColor}22` }]}>
                                <Text style={[styles.gradeText, { color: gradeColor }]}>{grade.toUpperCase()}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.gaugeContainer}>
                        <Svg width={svgW} height={svgH} viewBox={`0 0 ${VW} ${VH}`}>
                            <Defs>
                                <LinearGradient id="hubGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <Stop offset="0%" stopColor={gradeColor} stopOpacity="0.8" />
                                    <Stop offset="100%" stopColor={gradeColor} stopOpacity="1" />
                                </LinearGradient>
                            </Defs>
                            <G>
                                <Path d={segPath(0, 100)} fill={trackColor} opacity={0.5} />

                                {SEGS.map((seg) => {
                                    if (totalScore <= seg.from) return null;
                                    const clipTo = Math.min(totalScore, seg.to);
                                    if (seg.from >= clipTo) return null;
                                    return <Path key={seg.from} d={segPath(seg.from, clipTo)} fill={seg.color} />;
                                })}

                                <Path d={needlePath(totalScore)} fill={needleColor} opacity={0.9} />

                                <Circle cx={CX} cy={CY} r={16} fill={trackColor} />
                                <Circle cx={CX} cy={CY} r={12} fill="url(#hubGradient)" />
                                <Circle cx={CX} cy={CY} r={4} fill={needleColor} />
                            </G>
                        </Svg>

                        <View style={[styles.scoreBox, { bottom: svgH - hubY + 10 }]} pointerEvents="none">
                            <Text style={[styles.scoreNum, { color: c.text }]}>{totalScore}</Text>
                            <Text style={[styles.scoreOut, { color: c.textSecondary }]}>/100</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>HEALTH DIMENSIONS</Text>
                </View>

                <View style={styles.listContainer}>
                    {dimensions.map((dim) => {
                        const pct = (dim.score / dim.maxScore) * 100;
                        const dc =
                            pct >= 80 ? '#34C759' :
                                pct >= 56 ? '#5AC8FA' :
                                    pct >= 32 ? '#FF9500' : '#FF3B30';
                        return (
                            <View key={dim.label} style={[styles.dimCard, { backgroundColor: c.card, borderColor: c.border }]}>
                                <View style={styles.dimContent}>
                                    <View style={styles.dimHeader}>
                                        <Text style={[styles.dimLabel, { color: c.text }]}>{dim.label}</Text>
                                        <View style={styles.dimScoreBox}>
                                            <Text style={[styles.dimScore, { color: dc }]}>{dim.score}</Text>
                                            <Text style={[styles.dimMax, { color: c.textSecondary }]}>/{dim.maxScore}</Text>
                                        </View>
                                    </View>
                                    <View style={[styles.dimTrack, { backgroundColor: c.cardSecondary }]}>
                                        <View style={[styles.dimFill, { width: `${pct}%`, backgroundColor: dc }]} />
                                    </View>
                                    <Text style={[styles.dimDesc, { color: c.textSecondary }]}>{dim.description}</Text>
                                </View>
                            </View>
                        );
                    })}
                </View>

                <TouchableOpacity
                    style={styles.formulaLink}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push('/portfolio-health-formula');
                    }}
                >
                    <Text style={[styles.formulaLinkText, { color: c.textSecondary }]}>How is this calculated?</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600'
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    scrollContent: { padding: 20, paddingBottom: 40 },
    heroCard: {
        borderRadius: 24,
        padding: 24,
        paddingBottom: 32,
        borderWidth: 1,
        marginBottom: 32,
        overflow: 'hidden',
    },
    heroTop: {
        marginBottom: 20,
    },
    heroHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    heroLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    gaugeContainer: {
        position: 'relative',
        alignItems: 'center',
    },
    scoreBox: {
        position: 'absolute',
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 2,
    },
    scoreNum: {
        fontSize: 48,
        fontWeight: '400',
        lineHeight: 52,
        letterSpacing: -1,
    },
    scoreOut: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
        opacity: 0.5,
    },
    gradeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    gradeText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    sectionHeaderRow: {
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    listContainer: {
        gap: 16,
    },
    dimCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
    },
    dimContent: {
        gap: 8,
    },
    dimHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dimLabel: {
        fontSize: 14,
        fontWeight: '500'
    },
    dimScoreBox: { flexDirection: 'row', alignItems: 'flex-end' },
    dimScore: {
        fontSize: 14,
        fontWeight: '600'
    },
    dimMax: {
        fontSize: 11,
        fontWeight: '400',
        marginBottom: 1
    },
    dimTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
    dimFill: { height: '100%', borderRadius: 3 },
    dimDesc: {
        fontSize: 13,
        lineHeight: 18
    },
    formulaLink: {
        alignItems: 'center',
        marginTop: 24,
    },
    formulaLinkText: {
        fontSize: 14,
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
});
