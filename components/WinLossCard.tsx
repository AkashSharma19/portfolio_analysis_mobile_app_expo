import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Scale } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Circle, Svg } from 'react-native-svg';

// ✨ Redesigned Donut Chart for Compact View
const WinLossDonut = ({ winners, losers, size, colorWin, colorLoss, trackColor, winRate, isPrivacyMode, textColor }: any) => {
    const r = size * 0.4;
    const center = size / 2;
    const circum = 2 * Math.PI * r;

    // Calculate segments
    const total = winners + losers;
    const winShare = total > 0 ? (winners / total) : 0;
    const winStroke = winShare * circum;
    const lossStroke = circum - winStroke;

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
            <Svg width={size} height={size}>
                {/* Winners Segment */}
                <Circle
                    cx={center}
                    cy={center}
                    r={r}
                    stroke={colorWin}
                    strokeWidth={size * 0.08}
                    strokeDasharray={`${winStroke} ${circum}`}
                    strokeLinecap="round"
                    fill="none"
                    transform={`rotate(-90 ${center} ${center})`}
                />
                {/* Losers Segment */}
                <Circle
                    cx={center}
                    cy={center}
                    r={r}
                    stroke={colorLoss}
                    strokeWidth={size * 0.08}
                    strokeDasharray={`${lossStroke} ${circum}`}
                    // Offset by the winners stroke
                    strokeDashoffset={-winStroke}
                    strokeLinecap="round"
                    fill="none"
                    transform={`rotate(-90 ${center} ${center})`}
                />
            </Svg>
            <View style={styles.compactRateBox}>
                <Text style={[styles.compactRateValue, { color: textColor }]}>{isPrivacyMode ? '**' : `${winRate.toFixed(0)}%`}</Text>
                <Text style={[styles.compactRateLabel, { color: '#8E8E93' }]}>WIN RATE</Text>
            </View>
        </View>
    );
};

export default function WinLossCard({ onPress, isCompact = false }: { onPress?: () => void; isCompact?: boolean }) {
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

    const [containerWidth, setContainerWidth] = React.useState(150);

    if (stats.total === 0) return null;

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            disabled={!onPress}
            onLayout={(e) => {
                if (isCompact) {
                    setContainerWidth(e.nativeEvent.layout.width - 32);
                }
            }}
            style={[
                isCompact ? { flex: 1 } : styles.container
            ]}
        >
            <View style={[
                styles.card,
                { backgroundColor: currColors.card, borderColor: currColors.border },
                isCompact && { flex: 1, padding: 16, justifyContent: 'space-between', borderRadius: 24 }
            ]}>
                <View style={[styles.header, isCompact && { marginBottom: 0 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {isCompact && <Scale size={12} color={currColors.textSecondary} />}
                        <Text style={[styles.title, { color: currColors.textSecondary, fontSize: isCompact ? 9 : 10 }]}>WIN / LOSS</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <View style={[styles.iconCircle, { backgroundColor: currColors.cardSecondary, width: 24, height: 24 }]}>
                            <ArrowRight size={12} color={currColors.tint} />
                        </View>
                    </View>
                </View>

                {isCompact ? (
                    <View style={[styles.compactMain, { flex: 1, justifyContent: 'center' }]}>
                        <WinLossDonut
                            winners={stats.winners}
                            losers={stats.losers}
                            size={containerWidth * 0.85}
                            colorWin="#4CAF50"
                            colorLoss="#F44336"
                            trackColor={theme === 'dark' ? '#2C2C2E' : '#E5E5EA'}
                            winRate={stats.winRate}
                            isPrivacyMode={isPrivacyMode}
                            textColor={currColors.text}
                        />
                        <View style={[styles.compactFooter, { marginTop: 12 }]}>
                            <Text style={[styles.compactFooterText, { color: currColors.textSecondary }]}>
                                {stats.winners}W • {stats.losers}L
                            </Text>
                        </View>
                    </View>
                ) : (
                    <>
                        <View style={styles.header}>
                                <View style={styles.headerRight}>
                                    <View style={styles.rateContainer}>
                                        <Text style={[styles.rateValue, { color: currColors.text }]}>{isPrivacyMode ? '****' : `${stats.winRate.toFixed(0)}%`}</Text>
                                        <Text style={[styles.rateLabel, { color: currColors.textSecondary }]}>Win Rate</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={[styles.barContainer, { height: 8 }]}>
                                <View style={[styles.barsection, { flex: stats.winners, backgroundColor: '#4CAF50', borderTopLeftRadius: 4, borderBottomLeftRadius: 4, marginRight: 2 }]} />
                                <View style={[styles.barsection, { flex: stats.losers, backgroundColor: '#F44336', borderTopRightRadius: 4, borderBottomRightRadius: 4 }]} />
                            </View>

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
                        </>
                    )}
            </View>
        </TouchableOpacity>
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
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
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
        backgroundColor: '#f0f0f030',
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
    statAmount: {
        fontSize: 10,
        fontWeight: '500',
        marginTop: 0,
        flexShrink: 1,
    },
    compactMain: {
        alignItems: 'center',
        paddingTop: 8,
    },
    compactRateBox: {
        position: 'absolute',
        alignItems: 'center',
    },
    compactRateValue: {
        fontSize: 22,
        fontWeight: '500',
    },
    compactRateLabel: {
        fontSize: 7,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginTop: -2,
    },
    compactFooter: {
        marginTop: 12,
    },
    compactFooterText: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
});
