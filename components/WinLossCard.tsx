import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function WinLossCard() {
    const getHoldingsData = usePortfolioStore((state) => state.getHoldingsData);
    const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);
    const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
    const transactions = usePortfolioStore((state) => state.transactions);
    const tickers = usePortfolioStore((state) => state.tickers);

    const holdings = useMemo(() => getHoldingsData(), [getHoldingsData, transactions, tickers]);

    const theme = useColorScheme() ?? 'dark';
    const currColors = Colors[theme];

    const stats = useMemo(() => {
        const winners = holdings.filter(h => h.pnl >= 0);
        const losers = holdings.filter(h => h.pnl < 0);
        const total = holdings.length;
        const winRate = total > 0 ? (winners.length / total) * 100 : 0;

        const winnersProfit = winners.reduce((acc, curr) => acc + curr.pnl, 0);
        const losersLoss = losers.reduce((acc, curr) => acc + curr.pnl, 0);

        return {
            winners: winners.length,
            losers: losers.length,
            winnersProfit,
            losersLoss,
            total,
            winRate
        };
    }, [holdings]);

    if (stats.total === 0) return null;

    return (
        <View style={styles.container}>
            <View style={[styles.card, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                <View style={styles.header}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.title, { color: currColors.textSecondary }]}>WIN / LOSS RATIO</Text>
                    </View>
                    <View style={styles.rateContainer}>
                        <Text style={[styles.rateValue, { color: currColors.text }]}>{isPrivacyMode ? '****' : `${stats.winRate.toFixed(0)}%`}</Text>
                        <Text style={[styles.rateLabel, { color: currColors.textSecondary }]}>Win Rate</Text>
                    </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.barContainer}>
                    <View style={[styles.barsection, { flex: stats.winners, backgroundColor: '#4CAF50', borderTopLeftRadius: 4, borderBottomLeftRadius: 4, marginRight: 2 }]} />
                    <View style={[styles.barsection, { flex: stats.losers, backgroundColor: '#F44336', borderTopRightRadius: 4, borderBottomRightRadius: 4 }]} />
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={[styles.statLabel, { color: currColors.textSecondary }]}>Winners</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={[styles.statBadge, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                                <ArrowUpRight size={14} color="#4CAF50" />
                                <Text style={[styles.statValue, { color: '#4CAF50' }]}>{isPrivacyMode ? '****' : stats.winners}</Text>
                            </View>
                            <Text style={[styles.statAmount, { color: '#4CAF50', marginTop: 0 }]} numberOfLines={1} adjustsFontSizeToFit>
                                {isPrivacyMode ? '****' : `+${showCurrencySymbol ? '₹' : ''}${stats.winnersProfit.toLocaleString('en-IN', { maximumFractionDigits: 0, notation: "compact", compactDisplay: "short" })}`}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.statItem}>
                        <Text style={[styles.statLabel, { color: currColors.textSecondary }]}>Losers</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={[styles.statBadge, { backgroundColor: 'rgba(244, 67, 54, 0.1)' }]}>
                                <ArrowDownRight size={14} color="#F44336" />
                                <Text style={[styles.statValue, { color: '#F44336' }]}>{isPrivacyMode ? '****' : stats.losers}</Text>
                            </View>
                            <Text style={[styles.statAmount, { color: '#F44336', marginTop: 0 }]} numberOfLines={1} adjustsFontSizeToFit>
                                {isPrivacyMode ? '****' : `-${showCurrencySymbol ? '₹' : ''}${Math.abs(stats.losersLoss).toLocaleString('en-IN', { maximumFractionDigits: 0, notation: "compact", compactDisplay: "short" })}`}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    card: {
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    rateContainer: {
        alignItems: 'flex-end',
    },
    rateValue: {
        fontSize: 20,
        fontWeight: '400',
        lineHeight: 24,
    },
    rateLabel: {
        fontSize: 11,
        fontWeight: '500',
    },
    barContainer: {
        flexDirection: 'row',
        height: 8,
        width: '100%',
        marginBottom: 16,
        borderRadius: 4,
        overflow: 'hidden',
        backgroundColor: '#f0f0f030', // subtle backing if needed
    },
    barsection: {
        height: '100%',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    statItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(120, 120, 128, 0.08)',
        padding: 10,
        borderRadius: 12,
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    statValue: {
        fontSize: 12,
        fontWeight: '600',
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '500',
    },
    statValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
        justifyContent: 'flex-end',
    },
    statAmount: {
        fontSize: 10,
        fontWeight: '500',
        marginTop: 0,
        flexShrink: 1,
    },
});
