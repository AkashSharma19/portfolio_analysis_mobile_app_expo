import { usePortfolioStore } from '@/store/usePortfolioStore';
import { format } from 'date-fns';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowDownLeft, ArrowLeft, ArrowUpRight } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StockDetailsScreen() {
    const { symbol } = useLocalSearchParams<{ symbol: string }>();
    const router = useRouter();
    const getHoldingsData = usePortfolioStore((state) => state.getHoldingsData);
    const transactions = usePortfolioStore((state) => state.transactions);
    const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);

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

    if (!holding) {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>
                <View style={styles.centerContent}>
                    <Text style={styles.errorText}>Company details not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.headerTitle}>
                    <Text style={styles.companyName} numberOfLines={2}>{holding.companyName}</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Main Price Card */}
                <View style={styles.priceCard}>
                    <View style={styles.heroHeaderRow}>
                        <Text style={styles.heroLabel}>{holding.quantity > 0 ? 'CURRENT VALUE' : 'CURRENT PRICE'}</Text>
                    </View>

                    <Text style={styles.heroValue}>
                        {isPrivacyMode ? '****' : `₹${(holding.quantity > 0 ? holding.currentValue : holding.currentPrice).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}
                    </Text>

                    <View style={styles.dashedDivider} />

                    <View style={styles.heroRow}>
                        <Text style={styles.heroRowLabel}>{holding.quantity > 0 ? '1D returns' : '1D change'}</Text>
                        <Text style={[styles.heroRowValue, { color: isPrivacyMode ? '#FFF' : (holding.dayChange >= 0 ? '#4CAF50' : '#F44336') }]}>
                            {isPrivacyMode ? '****' : `${holding.dayChange >= 0 ? '+' : ''}₹${Math.abs(holding.quantity > 0 ? holding.dayChange : (holding.dayChange)).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} (${Math.abs(holding.dayChangePercentage).toFixed(2)}%)`}
                        </Text>
                    </View>

                    {holding.quantity > 0 && (
                        <View style={styles.heroRow}>
                            <Text style={styles.heroRowLabel}>Total returns</Text>
                            <Text style={[styles.heroRowValue, { color: isPrivacyMode ? '#FFF' : (holding.pnl >= 0 ? '#4CAF50' : '#F44336') }]}>
                                {isPrivacyMode ? '****' : `${holding.pnl >= 0 ? '+' : '-'}₹${Math.abs(holding.pnl).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} (${Math.abs(holding.pnlPercentage).toFixed(2)}%)`}
                            </Text>
                        </View>
                    )}

                    {holding.quantity > 0 ? (
                        <>
                            <View style={styles.heroRow}>
                                <Text style={styles.heroRowLabel}>Invested</Text>
                                <Text style={styles.heroRowValueWhite}>{isPrivacyMode ? '****' : `₹${holding.investedValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}</Text>
                            </View>

                            <View style={styles.heroRow}>
                                <Text style={styles.heroRowLabel}>Quantity</Text>
                                <Text style={styles.heroRowValueWhite}>{holding.quantity}</Text>
                            </View>

                            <View style={styles.heroRow}>
                                <Text style={styles.heroRowLabel}>Current Price</Text>
                                <Text style={styles.heroRowValueWhite}>₹{holding.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</Text>
                            </View>

                            <View style={styles.heroRow}>
                                <Text style={styles.heroRowLabel}>Avg. Price</Text>
                                <Text style={styles.heroRowValueWhite}>{isPrivacyMode ? '****' : `₹${holding.avgPrice.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}</Text>
                            </View>
                        </>
                    ) : (
                        <View style={styles.heroRow}>
                            <Text style={styles.heroRowLabel}>Current Price</Text>
                            <Text style={styles.heroRowValueWhite}>₹{holding.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</Text>
                        </View>
                    )}

                    <View style={styles.heroRow}>
                        <Text style={styles.heroRowLabel}>Sector</Text>
                        <Text style={styles.heroRowValueWhite} numberOfLines={1}>{holding.sector}</Text>
                    </View>
                </View>

                {/* 52 Week Range */}
                {typeof holding.high52 === 'number' && typeof holding.low52 === 'number' && holding.high52 > 0 && holding.low52 > 0 && holding.assetType !== 'Mutual Fund' && (
                    <View style={styles.rangeCard}>
                        <Text style={styles.sectionTitle}>52 WEEK RANGE</Text>
                        <View style={styles.rangeBarContainer}>
                            <View style={styles.rangeLabels}>
                                <Text style={styles.rangeValue}>₹{holding.low52.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
                                <Text style={styles.rangeValue}>₹{holding.high52.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
                            </View>
                            <View style={styles.progressBarBg}>
                                <View
                                    style={[
                                        styles.currentMarker,
                                        { left: `${Math.min(100, Math.max(0, ((holding.currentPrice - holding.low52) / (holding.high52 - holding.low52)) * 100))}%` }
                                    ]}
                                />
                            </View>
                            <View style={styles.rangeLabels}>
                                <Text style={styles.rangeSub}>Low</Text>
                                <Text style={styles.rangeSub}>High</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Hide transactions if none exist */}
                {stockTransactions.length > 0 && (
                    <>
                        {/* Transactions History */}
                        <Text style={styles.sectionTitle}>HISTORY</Text>
                        <View style={styles.historyList}>
                            {stockTransactions.map((item: any) => (
                                <View key={item.id} style={styles.historyItem}>
                                    <View style={[styles.iconContainer, { backgroundColor: item.type === 'BUY' ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 59, 48, 0.15)' }]}>
                                        {item.type === 'BUY' ? (
                                            <ArrowUpRight size={20} color="#34C759" />
                                        ) : (
                                            <ArrowDownLeft size={20} color="#FF3B30" />
                                        )}
                                    </View>
                                    <View style={styles.historyInfo}>
                                        <Text style={styles.historyType}>{item.type === 'BUY' ? 'Bought' : 'Sold'}</Text>
                                        <Text style={styles.historyDate}>{format(new Date(item.date), 'MMM dd, yyyy')}</Text>
                                    </View>
                                    <View style={styles.historyAmount}>
                                        <Text style={styles.historyValue}>
                                            {isPrivacyMode ? '****' : `₹${(item.quantity * item.price).toLocaleString()}`}
                                        </Text>
                                        <Text style={styles.historyDetails}>{item.quantity} @ {isPrivacyMode ? '****' : item.price.toLocaleString()}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </>
                )}

            </ScrollView>
        </SafeAreaView>
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
        padding: 8,
        marginLeft: -8,
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
        padding: 20,
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
        padding: 24,
        marginBottom: 24,
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
        marginBottom: 24,
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
        fontSize: 12,
        fontWeight: '500',
    },
    rangeSub: {
        color: '#8E8E93',
        fontSize: 10,
        marginTop: 4,
        textTransform: 'uppercase',
    },
    progressBarBg: {
        height: 4,
        backgroundColor: '#2C2C2E',
        borderRadius: 2,
        position: 'relative',
        marginVertical: 8,
    },
    currentMarker: {
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#007AFF',
        top: -3,
        marginLeft: -5,
        borderWidth: 2,
        borderColor: '#FFF',
    },
});
