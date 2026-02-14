import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ArrowDownRight, ArrowLeft, ArrowUpRight } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WinLossDetailsScreen() {
    const router = useRouter();
    const theme = useColorScheme() ?? 'dark';
    const currColors = Colors[theme];

    const getHoldingsData = usePortfolioStore((state) => state.getHoldingsData);
    const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);
    const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
    const transactions = usePortfolioStore((state) => state.transactions);
    const tickers = usePortfolioStore((state) => state.tickers);

    const [activeTab, setActiveTab] = React.useState<'winners' | 'losers'>('winners');

    const holdings = useMemo(() => getHoldingsData(), [getHoldingsData, transactions, tickers]);

    const { winners, losers, stats } = useMemo(() => {
        const winners = holdings.filter(h => h.pnl >= 0).sort((a, b) => b.pnl - a.pnl);
        const losers = holdings.filter(h => h.pnl < 0).sort((a, b) => a.pnl - b.pnl);
        const total = holdings.length;
        const winRate = total > 0 ? (winners.length / total) * 100 : 0;

        const winnersProfit = winners.reduce((acc, curr) => acc + curr.pnl, 0);
        const losersLoss = losers.reduce((acc, curr) => acc + curr.pnl, 0);

        return {
            winners,
            losers,
            stats: {
                winners: winners.length,
                losers: losers.length,
                winnersProfit,
                losersLoss,
                total,
                winRate
            }
        };
    }, [holdings]);

    const formatValue = (val: number) => {
        return val.toLocaleString('en-IN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        });
    };

    const formatCompactValue = (val: number) => {
        return val.toLocaleString('en-IN', {
            maximumFractionDigits: 0,
            notation: "compact",
            compactDisplay: "short"
        });
    };

    const currentList = activeTab === 'winners' ? winners : losers;
    const currentColor = activeTab === 'winners' ? '#4CAF50' : '#F44336';
    const currentTotal = activeTab === 'winners' ? stats.winnersProfit : Math.abs(stats.losersLoss);
    const currentIcon = activeTab === 'winners' ? ArrowUpRight : ArrowDownRight;
    const CurrentIcon = currentIcon;

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
                <Text style={[styles.headerTitle, { color: currColors.text }]}>Win / Loss Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
                {/* Hero Card */}
                <View style={[styles.heroCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                    <Text style={[styles.heroLabel, { color: currColors.textSecondary }]}>WIN RATE</Text>
                    <Text style={[styles.heroValue, { color: currColors.text }]}>
                        {isPrivacyMode ? '****' : `${stats.winRate.toFixed(1)}%`}
                    </Text>

                    {/* Progress Bar */}
                    <View style={styles.barContainer}>
                        <View style={[styles.barsection, { flex: stats.winners, backgroundColor: '#4CAF50', borderTopLeftRadius: 4, borderBottomLeftRadius: 4, marginRight: 2 }]} />
                        <View style={[styles.barsection, { flex: stats.losers, backgroundColor: '#F44336', borderTopRightRadius: 4, borderBottomRightRadius: 4 }]} />
                    </View>

                    <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryLabel, { color: currColors.textSecondary }]}>Winners</Text>
                            <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                                {isPrivacyMode ? '****' : stats.winners}
                            </Text>
                            <Text style={[styles.summaryAmount, { color: '#4CAF50' }]}>
                                {isPrivacyMode ? '****' : `+${showCurrencySymbol ? '₹' : ''}${formatCompactValue(stats.winnersProfit)}`}
                            </Text>
                        </View>
                        <View style={[styles.verticalDivider, { backgroundColor: currColors.border }]} />
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryLabel, { color: currColors.textSecondary }]}>Losers</Text>
                            <Text style={[styles.summaryValue, { color: '#F44336' }]}>
                                {isPrivacyMode ? '****' : stats.losers}
                            </Text>
                            <Text style={[styles.summaryAmount, { color: '#F44336' }]}>
                                {isPrivacyMode ? '****' : `-${showCurrencySymbol ? '₹' : ''}${formatCompactValue(Math.abs(stats.losersLoss))}`}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Tab Switcher */}
                <View style={[styles.tabContainer, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border }]}>
                    <TouchableOpacity
                        style={[
                            styles.tab,
                            activeTab === 'winners' && { backgroundColor: currColors.card }
                        ]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setActiveTab('winners');
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={[
                            styles.tabText,
                            { color: activeTab === 'winners' ? '#4CAF50' : currColors.textSecondary }
                        ]}>
                            Winners ({stats.winners})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.tab,
                            activeTab === 'losers' && { backgroundColor: currColors.card }
                        ]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setActiveTab('losers');
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={[
                            styles.tabText,
                            { color: activeTab === 'losers' ? '#F44336' : currColors.textSecondary }
                        ]}>
                            Losers ({stats.losers})
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Holdings List */}
                {currentList.length > 0 ? (
                    <View style={[styles.listCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                        {currentList.map((holding, index) => (
                            <View
                                key={holding.symbol}
                                style={[
                                    styles.holdingItem,
                                    { borderBottomColor: currColors.border },
                                    index === currentList.length - 1 && { borderBottomWidth: 0 }
                                ]}
                            >
                                <View style={styles.holdingLeft}>
                                    <View style={[styles.logoContainer, { backgroundColor: currColors.cardSecondary }]}>
                                        {holding.logo ? (
                                            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 8, padding: 4 }}>
                                                <Image
                                                    source={{ uri: holding.logo }}
                                                    style={styles.logoImage}
                                                    resizeMode="contain"
                                                />
                                            </View>
                                        ) : (
                                            <Text style={[styles.logoPlaceholderText, { color: currColors.text }]}>
                                                {holding.symbol.substring(0, 2).toUpperCase()}
                                            </Text>
                                        )}
                                    </View>
                                    <View style={styles.holdingInfo}>
                                        <Text style={[styles.holdingSymbol, { color: currColors.text }]} numberOfLines={1}>
                                            {holding.companyName}
                                        </Text>
                                        <Text style={[styles.holdingValue, { color: currColors.textSecondary }]}>
                                            {isPrivacyMode ? '****' : `${showCurrencySymbol ? '₹' : ''}${formatCompactValue(holding.currentValue)}`}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.holdingRight}>
                                    <Text style={[styles.pnlAmount, { color: currentColor }]}>
                                        {isPrivacyMode ? '****' : `${activeTab === 'winners' ? '+' : '-'}${showCurrencySymbol ? '₹' : ''}${formatValue(Math.abs(holding.pnl))}`}
                                    </Text>
                                    <View style={[styles.percentageBadge, { backgroundColor: activeTab === 'winners' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)' }]}>
                                        <Text style={[styles.percentageText, { color: currentColor }]}>
                                            {isPrivacyMode ? '**' : `${activeTab === 'winners' ? '+' : ''}${holding.pnlPercentage.toFixed(1)}%`}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={[styles.emptyCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                        <Text style={[styles.emptyText, { color: currColors.textSecondary }]}>
                            No {activeTab} found
                        </Text>
                    </View>
                )}
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
        fontWeight: '600',
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
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    heroValue: {
        fontSize: 32,
        fontWeight: '400',
        marginBottom: 20,
        letterSpacing: -0.5,
    },
    barContainer: {
        flexDirection: 'row',
        height: 8,
        width: '100%',
        marginBottom: 20,
        borderRadius: 4,
        overflow: 'hidden',
    },
    barsection: {
        height: '100%',
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
    },
    summaryItem: {
        alignItems: 'center',
        flex: 1,
    },
    summaryLabel: {
        fontSize: 11,
        fontWeight: '500',
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: '400',
    },
    summaryAmount: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 4,
    },
    verticalDivider: {
        width: 1,
        height: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    sectionSubtitle: {
        fontSize: 12,
        fontWeight: '600',
    },
    listCard: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: 32,
    },
    holdingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    holdingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    logoContainer: {
        width: 40,
        height: 40,
        borderRadius: 8,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoImage: {
        width: 32,
        height: 32,
        borderRadius: 8,
    },
    logoPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoPlaceholderText: {
        fontSize: 12,
        fontWeight: '600',
    },
    holdingInfo: {
        flex: 1,
    },
    holdingSymbol: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 2,
    },
    holdingValue: {
        fontSize: 11,
        fontWeight: '400',
    },
    holdingRight: {
        alignItems: 'flex-end',
        gap: 4,
    },
    pnlAmount: {
        fontSize: 13,
        fontWeight: '500',
    },
    percentageBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    percentageText: {
        fontSize: 10,
        fontWeight: '600',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(120, 120, 128, 0.08)',
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
        borderWidth: 1,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
    },
    emptyCard: {
        padding: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '500',
    },
});
