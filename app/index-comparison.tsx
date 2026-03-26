import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function IndexComparisonScreen() {
    const router = useRouter();
    const theme = useColorScheme() ?? 'dark';
    const currColors = Colors[theme];

    const tickers = usePortfolioStore((state) => state.tickers);
    const calculateSummary = usePortfolioStore((state) => state.calculateSummary);
    const defaultIndex = usePortfolioStore((state) => state.defaultIndex);
    const setDefaultIndex = usePortfolioStore((state) => state.setDefaultIndex);

    const summary = useMemo(() => calculateSummary(), [calculateSummary, tickers]);
    const portfolioXIRR = summary.xirr || 0;

    const indices = useMemo(() => tickers.filter(t => t['Asset Type'] === 'Index'), [tickers]);
    const selectedIndexData = useMemo(() => indices.find((t: any) => t.Tickers === defaultIndex), [indices, defaultIndex]);

    const index1YReturn = useMemo(() => {
        if (!selectedIndexData || !selectedIndexData['Today - 365']) return 0;
        return ((selectedIndexData['Current Value'] - selectedIndexData['Today - 365']) / selectedIndexData['Today - 365']) * 100;
    }, [selectedIndexData]);


    const chartData = useMemo(() => {
        const data = [
            {
                value: portfolioXIRR,
                label: 'Portfolio\n(XIRR)',
                frontColor: '#007AFF',
                gradientColor: '#00B4FF',
                showGradient: true,
                topLabelComponent: () => (
                    <View style={{ width: 40, alignItems: 'center' }}>
                        <Text style={{ color: portfolioXIRR < 0 ? '#F44336' : currColors.text, fontSize: 8, marginBottom: 4 }}>
                            {portfolioXIRR.toFixed(2)}%
                        </Text>
                    </View>
                ),
            }
        ];

        indices.forEach((idx: any) => {
            const return1Y = idx['Today - 365'] ? ((idx['Current Value'] - idx['Today - 365']) / idx['Today - 365']) * 100 : 0;
            const fullName = idx['Company Name'] || idx.Tickers;

            // Logic to split name into two lines if it contains a space and is reasonably long
            let displayLabel = fullName;
            if (fullName.length > 10 && fullName.includes(' ')) {
                const parts = fullName.split(' ');
                if (parts.length >= 2) {
                    displayLabel = parts.slice(0, Math.ceil(parts.length / 2)).join(' ') + '\n' + parts.slice(Math.ceil(parts.length / 2)).join(' ');
                }
            }

            data.push({
                value: return1Y,
                label: displayLabel,
                frontColor: idx.Tickers === defaultIndex ? currColors.tint : '#2C2C2E',
                gradientColor: idx.Tickers === defaultIndex ? '#FF9500' : '#48484A',
                showGradient: true,
                topLabelComponent: () => (
                    <View style={{ width: 40, alignItems: 'center' }}>
                        <Text style={{ color: currColors.textSecondary, fontSize: 8, marginBottom: 4 }}>
                            {return1Y.toFixed(2)}%
                        </Text>
                    </View>
                ),
            });
        });

        return data.sort((a, b) => b.value - a.value);
    }, [indices, portfolioXIRR, defaultIndex, currColors]);
    const chartConfigs = useMemo(() => {
        const numBars = chartData.length;
        if (numBars <= 3) return { barWidth: 40, spacing: 50 };
        if (numBars <= 5) return { barWidth: 32, spacing: 30 };
        if (numBars <= 8) return { barWidth: 22, spacing: 20 };
        return { barWidth: 16, spacing: 14 };
    }, [chartData.length]);

    const maxValue = useMemo(() => {
        const highestVal = Math.max(...chartData.map(d => d.value));
        return highestVal > 0 ? highestVal * 1.3 : 10; // Provide 30% extra space for labels
    }, [chartData]);


    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: currColors.background }]} edges={['top', 'left', 'right']}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.back();
                        }}
                        style={[styles.backButton, { backgroundColor: currColors.card }]}
                    >
                        <ArrowLeft size={24} color={currColors.text} />
                    </TouchableOpacity>
                    <View>
                        <Text style={[styles.headerTitle, { color: currColors.text }]}>Market Benchmark</Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
                    <LinearGradient
                        colors={currColors.text === '#FFFFFF' ? ['#1C1C1E', '#161618'] : ['#FFFFFF', '#F2F2F7']}
                        style={[styles.comparisonCard, { borderColor: currColors.border }]}
                    >

                        <View style={styles.chartTitleRow}>
                            <Text style={[styles.chartTitle, { color: currColors.textSecondary }]}>PERFORMANCE (1Y)</Text>
                        </View>

                        <View style={{ height: 260, marginTop: 10, alignItems: 'center', justifyContent: 'center' }}>
                            <BarChart
                                data={chartData}
                                barWidth={chartConfigs.barWidth}
                                spacing={chartConfigs.spacing}
                                maxValue={maxValue}
                                noOfSections={5}
                                dashGap={0}
                                yAxisThickness={0}
                                xAxisThickness={0}
                                hideRules
                                hideYAxisText
                                yAxisTextStyle={{ color: currColors.textSecondary, fontSize: 9 }}
                                xAxisLabelTextStyle={{ color: currColors.textSecondary, fontSize: 8, height: 40, textAlign: 'center' }}
                                isAnimated
                                animationDuration={600}
                                roundedTop
                                xAxisLabelsVerticalShift={5}
                                barBorderRadius={4}
                                width={Dimensions.get('window').width - 56}
                            />
                        </View>

                        <View style={{ marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: currColors.border }}>
                            <Text style={{ fontSize: 10, color: currColors.textSecondary, lineHeight: 14 }}>
                                Portfolio performance is measured by lifetime XIRR, while benchmarks show 1-year absolute returns.
                            </Text>
                        </View>
                    </LinearGradient>

                    <View style={{ marginTop: 24 }}>
                        <Text style={[styles.innerSectionTitle, { color: currColors.textSecondary, marginLeft: 0 }]}>BENCHMARKS</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={{ marginTop: 12 }}
                            contentContainerStyle={{ paddingRight: 40 }}
                        >
                            {indices.map((idx: any) => (
                                <TouchableOpacity
                                    key={idx.Tickers}
                                    style={[
                                        styles.benchmarkChip,
                                        { backgroundColor: currColors.cardSecondary, borderColor: currColors.border },
                                        defaultIndex === idx.Tickers && { backgroundColor: currColors.tint, borderColor: currColors.tint }
                                    ]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setDefaultIndex(idx.Tickers);
                                    }}
                                >
                                    <Text style={[
                                        styles.benchmarkChipText,
                                        { color: currColors.textSecondary },
                                        defaultIndex === idx.Tickers && {
                                            color: theme === 'dark' ? '#000000' : '#FFFFFF',
                                            fontWeight: '600'
                                        }
                                    ]}>
                                        {idx['Company Name'] || idx.Tickers}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        textAlign: 'center',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    comparisonCard: {
        borderRadius: 24,
        padding: 12,
        paddingVertical: 24,
        borderWidth: 1,
    },
    chartTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    chartTitle: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    innerSectionTitle: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 12,
    },
    benchmarkChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        marginRight: 10,
        borderWidth: 1,
    },
    benchmarkChipText: {
        fontSize: 13,
    },
});
