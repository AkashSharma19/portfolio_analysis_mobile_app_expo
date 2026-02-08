import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { calculateProjection } from '@/lib/finance';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ArrowLeft, Info } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForecastDetailsScreen() {
    const router = useRouter();
    const theme = useColorScheme() ?? 'dark';
    const currColors = Colors[theme];

    const calculateSummary = usePortfolioStore((state) => state.calculateSummary);
    const getYearlyAnalysis = usePortfolioStore((state) => state.getYearlyAnalysis);
    const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);
    const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
    const transactions = usePortfolioStore((state) => state.transactions);
    const tickers = usePortfolioStore((state) => state.tickers);
    const years = usePortfolioStore((state) => state.forecastYears);
    const setYears = usePortfolioStore((state) => state.setForecastYears);

    const summary = useMemo(() => calculateSummary(), [transactions, calculateSummary, tickers]);
    const yearlyAnalysis = useMemo(() => getYearlyAnalysis(), [transactions, getYearlyAnalysis, tickers]);

    const currentYear = new Date().getFullYear();
    const [targetYearInput, setTargetYearInput] = useState((currentYear + years).toString());

    const annualReturn = useMemo(() => {
        return summary.xirr > 0 ? summary.xirr / 100 : 0.12;
    }, [summary.xirr]);

    const monthlySIP = useMemo(() => {
        if (yearlyAnalysis.length === 0) return 0;
        return yearlyAnalysis[0].averageMonthlyInvestment || 0;
    }, [yearlyAnalysis]);

    const projection = useMemo(() => {
        return calculateProjection(summary.totalValue, annualReturn, monthlySIP, years);
    }, [summary.totalValue, annualReturn, monthlySIP, years]);

    const formatValue = (val: number) => {
        return val.toLocaleString('en-IN', {
            maximumFractionDigits: 0,
        });
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: currColors.background }]} edges={['top', 'left', 'right']}>
            <View style={[styles.header, { backgroundColor: currColors.background }]}>
                <TouchableOpacity
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.back();
                    }}
                    style={[styles.backButton, { backgroundColor: currColors.card }]}
                >
                    <ArrowLeft size={24} color={currColors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: currColors.text }]}>Portfolio Forecast</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
                <View style={[styles.heroCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                    <Text style={[styles.heroLabel, { color: currColors.textSecondary }]}>PROJECTED VALUE BY {new Date().getFullYear() + years}</Text>
                    <Text style={[styles.heroValue, { color: currColors.text }]}>
                        {isPrivacyMode ? '****' : `${showCurrencySymbol ? '₹' : ''}${formatValue(projection.totalFutureValue)}`}
                    </Text>

                    <View style={styles.multiplierBadge}>
                        <Text style={[styles.badgeText, { color: currColors.tint }]}>{projection.multiplier.toFixed(1)}x Growth</Text>
                    </View>
                    <Text style={[styles.inflationNote, { color: currColors.textSecondary }]}>
                        ≈ {showCurrencySymbol ? '₹' : ''}{formatValue(projection.presentValue)} in today's purchasing power
                    </Text>
                </View>

                <Text style={[styles.sectionTitle, { color: currColors.textSecondary }]}>FORECAST HORIZON</Text>

                <View style={[styles.inputCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={[styles.yearInput, { color: currColors.text }]}
                            keyboardType="number-pad"
                            placeholderTextColor={currColors.textSecondary}
                            value={targetYearInput}
                            onChangeText={(text) => {
                                setTargetYearInput(text);
                                const val = parseInt(text);
                                if (!isNaN(val) && val > currentYear && val <= currentYear + 100) {
                                    Haptics.selectionAsync();
                                    setYears(val - currentYear);
                                }
                            }}
                            maxLength={4}
                        />
                        <Text style={[styles.yearLabel, { color: currColors.text }]}>Target Year</Text>
                    </View>
                    <View style={[styles.verticalDivider, { backgroundColor: currColors.border }]} />
                    <View style={styles.durationWrapper}>
                        <Text style={[styles.durationValue, { color: currColors.tint }]}>{years}</Text>
                        <Text style={[styles.durationLabel, { color: currColors.textSecondary }]}>Years from now</Text>
                    </View>
                </View>

                <Text style={[styles.sectionTitle, { color: currColors.textSecondary }]}>PROJECTION BREAKDOWN</Text>
                <View style={[styles.dataCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                    <View style={styles.dataRow}>
                        <Text style={[styles.dataLabel, { color: currColors.textSecondary }]}>Current Value</Text>
                        <Text style={[styles.dataValue, { color: currColors.text }]}>
                            {isPrivacyMode ? '****' : `${showCurrencySymbol ? '₹' : ''}${formatValue(summary.totalValue)}`}
                        </Text>
                    </View>
                    <View style={styles.dataRow}>
                        <Text style={[styles.dataLabel, { color: currColors.textSecondary }]}>Monthly Investment</Text>
                        <Text style={[styles.dataValue, { color: currColors.text }]}>
                            {isPrivacyMode ? '****' : `${showCurrencySymbol ? '₹' : ''}${formatValue(monthlySIP)}`}
                        </Text>
                    </View>
                    <View style={[styles.horizontalDivider, { backgroundColor: currColors.border }]} />
                    <View style={styles.dataRow}>
                        <Text style={[styles.dataLabel, { color: currColors.textSecondary }]}>Expected Annual Return</Text>
                        <Text style={[styles.dataValue, { color: '#4CAF50' }]}>{(annualReturn * 100).toFixed(1)}%</Text>
                    </View>
                    <View style={styles.dataRow}>
                        <Text style={[styles.dataLabel, { color: currColors.textSecondary }]}>Total Invested Capital</Text>
                        <Text style={[styles.dataValue, { color: currColors.text }]}>
                            {isPrivacyMode ? '****' : `${showCurrencySymbol ? '₹' : ''}${formatValue(projection.totalInvested)}`}
                        </Text>
                    </View>
                    <View style={styles.dataRow}>
                        <Text style={[styles.dataLabel, { color: currColors.textSecondary }]}>Est. Capital Gains</Text>
                        <Text style={[styles.dataValue, { color: '#4CAF50' }]}>
                            {isPrivacyMode ? '****' : `+${showCurrencySymbol ? '₹' : ''}${formatValue(projection.estimatedGains)}`}
                        </Text>
                    </View>
                </View>

                <View style={styles.infoBox}>
                    <Info size={16} color={currColors.textSecondary} />
                    <Text style={[styles.infoText, { color: currColors.textSecondary }]}>
                        Projections are based on your current portfolio XIRR and average monthly investment. Past performance does not guarantee future results.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600', // Reverting to standard header weight
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    heroCard: {
        borderRadius: 24,
        padding: 32,
        borderWidth: 1,
        marginBottom: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroLabel: {
        fontSize: 10, // Match Dashboard heroLabel
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    heroValue: {
        fontSize: 28, // Distinct but not huge
        fontWeight: '400',
        marginBottom: 16,
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    multiplierBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 100,
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        marginBottom: 12,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '500',
    },
    inflationNote: {
        fontSize: 13,
        textAlign: 'center',
        opacity: 0.8,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '500',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
        textTransform: 'uppercase',
    },
    inputCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 32,
        paddingVertical: 20,
        paddingHorizontal: 24,
    },
    inputWrapper: {
        flex: 1,
        justifyContent: 'center',
    },
    yearInput: {
        fontSize: 20,
        fontWeight: '400',
        padding: 0,
        margin: 0,
        lineHeight: 26,
    },
    yearLabel: {
        fontSize: 12,
        fontWeight: '400',
        opacity: 0.7,
        marginTop: 4,
    },
    durationWrapper: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        minWidth: 80,
    },
    durationValue: {
        fontSize: 16,
        fontWeight: '400',
        lineHeight: 22,
    },
    durationLabel: {
        fontSize: 11,
        fontWeight: '400',
        marginTop: 2,
    },
    dataCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 24,
        gap: 20,
        marginBottom: 32,
    },
    dataRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dataLabel: {
        fontSize: 13,
        fontWeight: '400',
    },
    dataValue: {
        fontSize: 13,
        fontWeight: '400',
        letterSpacing: 0,
    },
    horizontalDivider: {
        height: 1,
        width: '100%',
        marginVertical: 4,
        opacity: 0.5,
    },
    verticalDivider: {
        width: 1,
        height: 40,
        marginHorizontal: 24,
    },
    infoBox: {
        flexDirection: 'row',
        gap: 12,
        padding: 16,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        marginTop: -8,
    },
    infoText: {
        flex: 1,
        fontSize: 11,
        lineHeight: 16,
    }
});
