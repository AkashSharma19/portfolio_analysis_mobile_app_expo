import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowDownLeft, ArrowLeft, ArrowUpRight } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StockDetailsScreen() {
    const { symbol } = useLocalSearchParams<{ symbol: string }>();
    const router = useRouter();
    const getHoldingsData = usePortfolioStore((state) => state.getHoldingsData);
    const transactions = usePortfolioStore((state) => state.transactions);
    const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);

    const colorScheme = useColorScheme() ?? 'dark';
    const currColors = Colors[colorScheme];

    const holding = useMemo(() => {
        const holdings = getHoldingsData();
        const foundHolding = holdings.find((h) => h.symbol === symbol);
        if (foundHolding) return foundHolding;

        // If not in holdings, look up ticker info
        const ticker = usePortfolioStore.getState().tickers.find(t => t.Tickers === symbol);
        if (ticker) {
            return {
                symbol: ticker.Tickers,
                companyName: ticker['Company Name'],
                quantity: 0,
                avgPrice: 0,
                currentPrice: ticker['Current Value'],
                investedValue: 0,
                currentValue: 0,
                pnl: 0,
                pnlPercentage: 0,
                contributionPercentage: 0,
                assetType: ticker['Asset Type'] || 'Other',
                sector: ticker['Sector'] || 'Other',
                broker: 'N/A',
                dayChange: ticker['Current Value'] - (ticker['Yesterday Close'] || ticker['Current Value']),
                dayChangePercentage: ticker['Yesterday Close'] ? ((ticker['Current Value'] - ticker['Yesterday Close']) / ticker['Yesterday Close']) * 100 : 0,
                high52: ticker.High52,
                low52: ticker.Low52,
            };
        }
        return null;
    }, [getHoldingsData, symbol]);

    const stockTransactions = useMemo(() => {
        return transactions
            .filter((t) => t.symbol === symbol)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, symbol]);

    const tickerData = usePortfolioStore((state) => state.tickers.find(t => t.Tickers === symbol));

    const chartData = useMemo(() => {
        if (!tickerData) return [];

        const dataPoints = [
            { value: tickerData['Today - 7'], label: '7d' },
            { value: tickerData['Today - 6'], label: '6d' },
            { value: tickerData['Today - 5'], label: '5d' },
            { value: tickerData['Today - 4'], label: '4d' },
            { value: tickerData['Today - 3'], label: '3d' },
            { value: tickerData['Today - 2'], label: '2d' },
            { value: tickerData['Yesterday Close'], label: '1d' },
            { value: tickerData['Current Value'], label: 'Now' }
        ];

        // Filter out undefined/null values in case data is partial 
        // (though if user says they added it, it should be there, but we need to handle gaps)
        // Actually, we should probably only define points that exist.
        // Assuming consecutive data:
        const validPoints = dataPoints.filter(p => typeof p.value === 'number' && p.value > 0).map(p => ({
            value: p.value as number,
            label: '', // Empty label to hide X-axis text
            dataLabel: p.label, // Custom prop for tooltip
        }));

        return validPoints;
    }, [tickerData]);

    const isPositiveTrend = useMemo(() => {
        if (chartData.length < 2) return true;
        return chartData[chartData.length - 1].value >= chartData[0].value;
    }, [chartData]);

    if (!holding) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: currColors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
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
                </View>
                <View style={[styles.centerContent, { backgroundColor: currColors.background }]}>
                    <Text style={[styles.errorText, { color: currColors.text }]}>Company details not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: currColors.background }]} edges={['top', 'left', 'right']}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

            {/* Header */}
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
                <View style={styles.headerTitle}>
                    <Text style={[styles.companyName, { color: currColors.text }]} numberOfLines={2}>{holding.companyName}</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                bounces={false}
                overScrollMode="never"
            >
                {/* Hero Chart (7 Day Trend) */}


                {/* Main Price Card */}
                <View style={[styles.priceCard, { overflow: 'hidden', backgroundColor: currColors.card, borderColor: currColors.border }]}>
                    {/* Background Chart */}
                    {chartData.length > 2 && (
                        <View style={{ position: 'absolute', bottom: 0, left: -30, right: -30, top: 0, overflow: 'hidden' }}>
                            <View style={{ opacity: 0.15, transform: [{ translateY: 40 }] }}>
                                <LineChart
                                    data={chartData}
                                    areaChart
                                    curved
                                    color={isPositiveTrend ? '#4CAF50' : '#F44336'}
                                    startFillColor={isPositiveTrend ? 'rgba(76, 175, 80, 0.8)' : 'rgba(244, 67, 54, 0.8)'}
                                    endFillColor={isPositiveTrend ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)'}
                                    thickness={5}
                                    hideDataPoints
                                    hideRules
                                    hideYAxisText
                                    hideAxesAndRules
                                    yAxisOffset={Math.min(...chartData.map(d => d.value)) * 0.95}
                                    height={320}
                                    width={Dimensions.get('window').width + 60}
                                    adjustToWidth={true}
                                />
                            </View>
                        </View>
                    )}
                    <View style={{ padding: 24 }}>
                        <View style={styles.heroHeaderRow}>
                            <Text style={[styles.heroLabel, { color: currColors.textSecondary }]}>{holding.quantity > 0 ? 'CURRENT VALUE' : 'CURRENT PRICE'}</Text>
                        </View>

                        <Text style={[styles.heroValue, { color: currColors.text }]}>
                            {isPrivacyMode ? '****' : `₹${(holding.quantity > 0 ? holding.currentValue : holding.currentPrice).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}
                        </Text>

                        <View style={[styles.dashedDivider, { borderColor: currColors.border }]} />

                        <View style={styles.heroRow}>
                            <Text style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>{holding.quantity > 0 ? '1D returns' : '1D change'}</Text>
                            <Text style={[styles.heroRowValue, { color: isPrivacyMode ? currColors.text : (holding.dayChange >= 0 ? '#4CAF50' : '#F44336') }]}>
                                {isPrivacyMode ? '****' : `${holding.dayChange >= 0 ? '+' : ''}₹${Math.abs(holding.quantity > 0 ? holding.dayChange : (holding.dayChange)).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} (${Math.abs(holding.dayChangePercentage).toFixed(2)}%)`}
                            </Text>
                        </View>

                        {holding.quantity > 0 && (
                            <View style={styles.heroRow}>
                                <Text style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>Total returns</Text>
                                <Text style={[styles.heroRowValue, { color: isPrivacyMode ? currColors.text : (holding.pnl >= 0 ? '#4CAF50' : '#F44336') }]}>
                                    {isPrivacyMode ? '****' : `${holding.pnl >= 0 ? '+' : '-'}₹${Math.abs(holding.pnl).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} (${Math.abs(holding.pnlPercentage).toFixed(2)}%)`}
                                </Text>
                            </View>
                        )}

                        {holding.quantity > 0 ? (
                            <>
                                <View style={styles.heroRow}>
                                    <Text style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>Invested</Text>
                                    <Text style={[styles.heroRowValueWhite, { color: currColors.text }]}>{isPrivacyMode ? '****' : `₹${holding.investedValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}</Text>
                                </View>

                                <View style={styles.heroRow}>
                                    <Text style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>Quantity</Text>
                                    <Text style={[styles.heroRowValueWhite, { color: currColors.text }]}>{holding.quantity}</Text>
                                </View>

                                <View style={styles.heroRow}>
                                    <Text style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>Current Price</Text>
                                    <Text style={[styles.heroRowValueWhite, { color: currColors.text }]}>₹{holding.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</Text>
                                </View>

                                <View style={styles.heroRow}>
                                    <Text style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>Avg. Price</Text>
                                    <Text style={[styles.heroRowValueWhite, { color: currColors.text }]}>{isPrivacyMode ? '****' : `₹${holding.avgPrice.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}</Text>
                                </View>
                            </>
                        ) : (
                            <View style={styles.heroRow}>
                                <Text style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>Current Price</Text>
                                <Text style={[styles.heroRowValueWhite, { color: currColors.text }]}>₹{holding.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</Text>
                            </View>
                        )}

                        <View style={styles.heroRow}>
                            <Text style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>Sector</Text>
                            <Text style={[styles.heroRowValueWhite, { color: currColors.text }]} numberOfLines={1}>{holding.sector}</Text>
                        </View>
                    </View>
                </View>



                {/* 52 Week Range */}
                {typeof holding.high52 === 'number' && typeof holding.low52 === 'number' && holding.high52 > 0 && holding.low52 > 0 && holding.assetType !== 'Mutual Fund' && (
                    <View style={[styles.rangeCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                        <Text style={[styles.sectionTitle, { color: currColors.textSecondary }]}>52 WEEK RANGE</Text>
                        <View style={styles.rangeBarContainer}>
                            <View style={styles.rangeLabels}>
                                <Text style={[styles.rangeValue, { color: currColors.text }]}>₹{holding.low52.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</Text>
                                <Text style={[styles.rangeValue, { color: currColors.text }]}>₹{holding.high52.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</Text>
                            </View>
                            <View style={styles.progressBarWrapper}>
                                <LinearGradient
                                    colors={colorScheme === 'dark' ? ['#333', '#555', '#333'] : ['#E5E5EA', '#D1D1D6', '#E5E5EA']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.progressBarTrack}
                                />
                                <View
                                    style={[
                                        styles.premiumMarker,
                                        { left: `${Math.min(100, Math.max(0, ((holding.currentPrice - holding.low52) / (holding.high52 - holding.low52)) * 100))}%` }
                                    ]}
                                >
                                    <View style={[styles.markerLine, { backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)' }]} />
                                    <View style={[styles.markerDot, { borderColor: currColors.card }]} />
                                </View>
                            </View>
                            <View style={styles.rangeLabels}>
                                <Text style={[styles.rangeSub, { color: currColors.textSecondary }]}>52W Low</Text>
                                <Text style={[styles.rangeSub, { color: currColors.textSecondary }]}>52W High</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Hide transactions if none exist */}
                {stockTransactions.length > 0 && (
                    <>
                        {/* Transactions History */}
                        <Text style={[styles.sectionTitle, { color: currColors.textSecondary }]}>HISTORY</Text>
                        <View style={[styles.historyList, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                            {stockTransactions.map((item: any) => (
                                <View key={item.id} style={[styles.historyItem, { borderBottomColor: currColors.border }]}>
                                    <View style={[styles.iconContainer, { backgroundColor: item.type === 'BUY' ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 59, 48, 0.15)' }]}>
                                        {item.type === 'BUY' ? (
                                            <ArrowUpRight size={20} color="#34C759" />
                                        ) : (
                                            <ArrowDownLeft size={20} color="#FF3B30" />
                                        )}
                                    </View>
                                    <View style={styles.historyInfo}>
                                        <Text style={[styles.historyType, { color: currColors.text }]}>{item.type === 'BUY' ? 'Bought' : 'Sold'}</Text>
                                        <Text style={[styles.historyDate, { color: currColors.textSecondary }]}>{format(new Date(item.date), 'MMM dd, yyyy')}</Text>
                                    </View>
                                    <View style={styles.historyAmount}>
                                        <Text style={[styles.historyValue, { color: currColors.text }]}>
                                            {isPrivacyMode ? '****' : `₹${(item.quantity * item.price).toLocaleString()}`}
                                        </Text>
                                        <Text style={[styles.historyDetails, { color: currColors.textSecondary }]}>{item.quantity} @ {isPrivacyMode ? '****' : item.price.toLocaleString()}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </>
                )}

            </ScrollView>
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
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
        backgroundColor: '#1C1C1E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    symbol: {
        color: '#8E8E93',
        fontSize: 12,
    },
    companyName: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: '#FFF',
        fontSize: 16,
    },
    priceCard: {
        backgroundColor: '#1C1C1E',
        borderRadius: 24,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    priceHeader: {
        marginBottom: 16,
    },
    currentPriceLabel: {
        color: '#8E8E93',
        fontSize: 12,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    currentPrice: {
        color: '#FFF',
        fontSize: 32,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#2C2C2E',
        marginBottom: 16,
    },
    pnlRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pnlLabel: {
        color: '#8E8E93',
        fontSize: 12,
        marginBottom: 6,
    },
    pnlValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    pnlValue: {
        fontSize: 18,
        fontWeight: '500',
    },
    sectionTitle: {
        color: '#8E8E93',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 16,
        marginLeft: 4,
    },
    historyList: {
        backgroundColor: '#1C1C1E',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2C2C2E',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    historyInfo: {
        flex: 1,
    },
    historyType: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 2,
    },
    historyDate: {
        color: '#8E8E93',
        fontSize: 12,
    },
    historyAmount: {
        alignItems: 'flex-end',
    },
    historyValue: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 2,
    },
    historyDetails: {
        color: '#8E8E93',
        fontSize: 11,
    },
    heroHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    heroLabel: {
        color: '#8E8E93',
        fontSize: 11,
        fontWeight: '400',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    heroValue: {
        fontSize: 24,
        fontWeight: '400',
        color: '#FFF',
        marginBottom: 16,
    },
    dashedDivider: {
        height: 1,
        borderWidth: 1,
        borderColor: '#333',
        borderStyle: 'dashed',
        borderRadius: 1,
        marginBottom: 16,
    },
    heroRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    heroRowLabel: {
        color: '#8E8E93',
        fontSize: 14,
    },
    heroRowValue: {
        fontSize: 14,
        fontWeight: '400',
    },
    heroRowValueWhite: {
        fontSize: 14,
        fontWeight: '400',
        color: '#FFF',
    },
    rangeCard: {
        backgroundColor: '#1C1C1E',
        borderRadius: 24,
        padding: 24,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    rangeBarContainer: {
        marginTop: 8,
    },
    rangeLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    rangeValue: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '600',
    },
    rangeSub: {
        color: '#8E8E93',
        fontSize: 9,
        fontWeight: '500',
        marginTop: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    progressBarWrapper: {
        height: 24,
        justifyContent: 'center',
        marginVertical: 4,
    },
    progressBarTrack: {
        height: 6,
        borderRadius: 3,
        width: '100%',
    },
    premiumMarker: {
        position: 'absolute',
        alignItems: 'center',
        width: 20,
        height: 24,
        marginLeft: -10,
        zIndex: 10,
    },
    markerLine: {
        width: 2,
        height: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 1,
    },
    markerDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#007AFF',
        borderWidth: 2,
        borderColor: '#FFF',
        position: 'absolute',
        top: 7,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 5,
    },

    heroChartContainer: {
        marginBottom: 16,
        marginHorizontal: -16, // Negative margin to hit edges
        overflow: 'hidden',
    },
});
