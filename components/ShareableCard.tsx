import { Activity, Award } from 'lucide-react-native';
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

const { width } = Dimensions.get('window');

interface ShareableCardProps {
    data: {
        totalValue: number;
        profitAmount: number;
        profitPercentage: number;
        dayChange: number;
        dayChangePercentage: number;
        xirr: number;
        topWinners: {
            symbol: string;
            profit: number;
        }[];
        userName?: string;
        holdingsCount?: number;
        winRate?: number;
    };
}

const DNA_LABELS = {
    risk: 'Risk Appetite',
    diversification: 'Diversification',
    activity: 'Activity',
    winRate: 'Win Rate',
};

const getPersonaName = (stats: { risk: number; diversification: number; activity: number; winRate: number }) => {
    if (stats.winRate > 80 && stats.risk > 70) return 'The Alpha Hunter';
    if (stats.winRate > 70 && stats.diversification > 80) return 'The Strategic Guardian';
    if (stats.risk > 80 && stats.activity > 80) return 'The Adrenaline Trader';
    if (stats.diversification > 80 && stats.risk < 40) return 'The Balanced Architect';
    if (stats.winRate > 60 && stats.risk < 50) return 'The Calculated Sniper';
    return 'The Aspiring Tycoon';
};

export default function ShareableCard({ data }: ShareableCardProps) {
    const isProfit = data.profitAmount >= 0;
    const isDayProfit = data.dayChange >= 0;

    // --- Investor DNA Calculation ---
    // 1. Risk: Based on Small/Mid Cap allocation (approx. by tracking "Cap" in asset type if available, 
    //    or volatility of top winners? For now, let's use a proxy: Day Change %)
    //    High day change % = High Volatility = High Risk Appetite. 
    //    Let's clamp it: 0-5% = 0-100 score.
    const riskScore = Math.min(Math.abs(data.dayChangePercentage) * 20, 100);

    // 2. Diversification: Number of holdings. <5 = low, >20 = high.
    const diversificationScore = Math.min((data.holdingsCount || 5) * 5, 100);

    // 3. Activity: We don't have transaction history here. 
    //    Let's use "Day Change" frequency? No.
    //    Let's use a static "Medium" for now or base it on XIRR (High XIRR often implies active timing or luck).
    const activityScore = Math.min(Math.abs(data.xirr), 100);

    // 4. Win Rate: Use passed winRate
    const winRateScore = data.winRate || (data.profitPercentage > 0 ? Math.min(data.profitPercentage * 2, 100) : 30);

    const dnaStats = {
        risk: riskScore,
        diversification: diversificationScore,
        activity: activityScore,
        winRate: winRateScore,
    };

    const persona = getPersonaName(dnaStats);


    const formatCompactCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            notation: 'compact',
            maximumFractionDigits: 1,
        }).format(Math.abs(val));
    };

    return (
        <View style={styles.captureContainer}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.brandName}>GAINBASE</Text>
                        <Text style={styles.userName}>{data.userName || 'PORTFOLIO PERFORMANCE'}</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Activity size={20} color="#007AFF" />
                    </View>
                </View>

                {/* Main Value Card (Hero Design) */}
                <View style={styles.heroCard}>
                    <Text style={styles.heroLabel}>TOTAL PORTFOLIO VALUE</Text>
                    <Text style={styles.heroValue}>
                        {new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                            maximumFractionDigits: 0,
                        }).format(data.totalValue)}
                    </Text>

                    <View style={styles.dashedDivider} />

                    <View style={styles.heroMetricRow}>
                        <View style={styles.metricItem}>
                            <Text style={styles.miniLabel}>TOTAL RETURN</Text>
                            <Text style={[styles.miniValue, { color: isProfit ? '#30D158' : '#FF453A' }]}>
                                {isProfit ? '+' : ''}{data.profitPercentage.toFixed(2)}%
                            </Text>
                        </View>
                        <View style={styles.verticalDivider} />
                        <View style={styles.metricItem}>
                            <Text style={styles.miniLabel}>XIRR</Text>
                            <Text style={styles.miniValueWhite}>{data.xirr.toFixed(2)}%</Text>
                        </View>
                        <View style={styles.verticalDivider} />
                        <View style={styles.metricItem}>
                            <Text style={styles.miniLabel}>1D CHANGE</Text>
                            <Text style={[styles.miniValue, { color: isDayProfit ? '#30D158' : '#FF453A' }]}>
                                {isDayProfit ? '+' : ''}{data.dayChangePercentage.toFixed(2)}%
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Investor DNA Section */}
                <View style={styles.dnaContainer}>
                    <View style={styles.dnaHeader}>
                        <Award size={14} color="#FFD60A" />
                        <Text style={styles.dnaTitle}>INVESTOR DNA</Text>
                    </View>
                    <Text style={styles.personaText}>{persona}</Text>

                    <View style={styles.dnaGrid}>
                        {/* Risk */}
                        <View style={styles.dnaItem}>
                            <Text style={styles.dnaLabel}>Risk</Text>
                            <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, { width: `${dnaStats.risk}%`, backgroundColor: '#FF453A' }]} />
                            </View>
                        </View>
                        {/* Win Rate */}
                        <View style={styles.dnaItem}>
                            <Text style={styles.dnaLabel}>Win Rate</Text>
                            <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, { width: `${dnaStats.winRate}%`, backgroundColor: '#30D158' }]} />
                            </View>
                        </View>
                        {/* Diversification */}
                        <View style={styles.dnaItem}>
                            <Text style={styles.dnaLabel}>Diversity</Text>
                            <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, { width: `${dnaStats.diversification}%`, backgroundColor: '#0A84FF' }]} />
                            </View>
                        </View>
                        {/* Activity */}
                        <View style={styles.dnaItem}>
                            <Text style={styles.dnaLabel}>Activity</Text>
                            <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, { width: `${dnaStats.activity}%`, backgroundColor: '#BF5AF2' }]} />
                            </View>
                        </View>
                    </View>
                </View>


                {/* Top Winners Section */}
                <View style={styles.winnersContainer}>
                    <View style={styles.winnersHeader}>
                        <Award size={14} color="#8E8E93" />
                        <Text style={styles.winnersTitle}>TOP WINNERS</Text>
                    </View>

                    <View style={styles.winnersList}>
                        {data.topWinners.slice(0, 3).map((winner, index) => (
                            <View key={winner.symbol} style={styles.winnerRow}>
                                <View style={styles.winnerInfo}>
                                    <View style={[styles.rankBadge, { backgroundColor: index === 0 ? '#007AFF' : '#2C2C2E' }]}>
                                        <Text style={styles.rankText}>{index + 1}</Text>
                                    </View>
                                    <Text style={styles.winnerSymbol}>{winner.symbol}</Text>
                                </View>
                                <Text style={styles.winnerProfit}>
                                    +{formatCompactCurrency(winner.profit)}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <View style={styles.footerLine} />
                    <Text style={styles.footerText}>MADE WITH GAINBASE</Text>
                    <View style={styles.footerLine} />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    captureContainer: {
        width: width,
        backgroundColor: '#000',
        padding: 20,
    },
    container: {
        backgroundColor: '#1C1C1E',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#2C2C2E',
        padding: 24,
        gap: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    headerRight: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#2C2C2E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    brandName: {
        color: '#8E8E93',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
    },
    userName: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
        marginTop: 2,
    },
    heroCard: {
        backgroundColor: '#2C2C2E',
        borderRadius: 20,
        padding: 20,
    },
    heroLabel: {
        color: '#8E8E93',
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 1,
    },
    heroValue: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: '800',
        marginVertical: 12,
    },
    dashedDivider: {
        height: 1,
        borderWidth: 1,
        borderColor: '#3C3C3E',
        borderStyle: 'dashed',
        marginVertical: 16,
    },
    heroMetricRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    metricItem: {
        alignItems: 'center',
        flex: 1,
    },
    verticalDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#3C3C3E',
    },
    miniLabel: {
        color: '#8E8E93',
        fontSize: 8,
        fontWeight: '700',
        marginBottom: 4,
        textAlign: 'center',
    },
    miniValue: {
        fontSize: 13,
        fontWeight: '800',
        textAlign: 'center',
    },
    miniValueWhite: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFF',
        textAlign: 'center',
    },

    // DNA Section
    dnaContainer: {
        backgroundColor: '#252528',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#333',
    },
    dnaHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    dnaTitle: {
        color: '#FFD60A',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    personaText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 16,
    },
    dnaGrid: {
        gap: 12,
    },
    dnaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    dnaLabel: {
        color: '#AAA',
        fontSize: 11,
        width: 60,
        fontWeight: '500',
    },
    progressBarBg: {
        flex: 1,
        height: 6,
        backgroundColor: '#3C3C3E',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },

    winnersContainer: {
        marginTop: 4,
    },
    winnersHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    winnersTitle: {
        color: '#8E8E93',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    winnersList: {
        gap: 10,
    },
    winnerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    winnerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    rankBadge: {
        width: 20,
        height: 20,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rankText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '800',
    },
    winnerSymbol: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    winnerProfit: {
        color: '#30D158',
        fontSize: 14,
        fontWeight: '700',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 8,
    },
    footerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#2C2C2E',
    },
    footerText: {
        color: '#48484A',
        fontSize: 8,
        fontWeight: '800',
        letterSpacing: 1,
    },
});
