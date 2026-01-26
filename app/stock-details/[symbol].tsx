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
        return holdings.find((h) => h.symbol === symbol);
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
                    <Text style={styles.errorText}>Holding not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    const isProfit = holding.pnl >= 0;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.headerTitle}>
                    <Text style={styles.companyName} numberOfLines={1}>{holding.companyName}</Text>
                    <Text style={styles.symbol}>{holding.symbol}</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Main Price Card */}
                {/* Main Price Card */}
                <View style={styles.priceCard}>
                    <View style={styles.heroHeaderRow}>
                        <Text style={styles.heroLabel}>CURRENT VALUE</Text>
                    </View>

                    <Text style={styles.heroValue}>
                        {isPrivacyMode ? '****' : `₹${holding.currentValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}
                    </Text>

                    <View style={styles.dashedDivider} />

                    <View style={styles.heroRow}>
                        <Text style={styles.heroRowLabel}>1D returns</Text>
                        <Text style={[styles.heroRowValue, { color: isPrivacyMode ? '#FFF' : (holding.dayChange >= 0 ? '#4CAF50' : '#F44336') }]}>
                            {isPrivacyMode ? '****' : `${holding.dayChange >= 0 ? '+' : ''}₹${Math.abs(holding.dayChange).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} (${Math.abs(holding.dayChangePercentage).toFixed(2)}%)`}
                        </Text>
                    </View>

                    <View style={styles.heroRow}>
                        <Text style={styles.heroRowLabel}>Total returns</Text>
                        <Text style={[styles.heroRowValue, { color: isPrivacyMode ? '#FFF' : (holding.pnl >= 0 ? '#4CAF50' : '#F44336') }]}>
                            {isPrivacyMode ? '****' : `${holding.pnl >= 0 ? '+' : '-'}₹${Math.abs(holding.pnl).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} (${Math.abs(holding.pnlPercentage).toFixed(2)}%)`}
                        </Text>
                    </View>

                    <View style={styles.heroRow}>
                        <Text style={styles.heroRowLabel}>Invested</Text>
                        <Text style={styles.heroRowValueWhite}>{isPrivacyMode ? '****' : `₹${holding.investedValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}</Text>
                    </View>

                    <View style={styles.heroRow}>
                        <Text style={styles.heroRowLabel}>Quantity</Text>
                        <Text style={styles.heroRowValueWhite}>{holding.quantity}</Text>
                    </View>

                    <View style={styles.heroRow}>
                        <Text style={styles.heroRowLabel}>Avg. Price</Text>
                        <Text style={styles.heroRowValueWhite}>{isPrivacyMode ? '****' : `₹${holding.avgPrice.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}</Text>
                    </View>

                    <View style={[styles.heroRow, { marginBottom: 0 }]}>
                        <Text style={styles.heroRowLabel}>Sector</Text>
                        <Text style={styles.heroRowValueWhite} numberOfLines={1}>{holding.sector}</Text>
                    </View>
                </View>


                {/* Transactions History */}
                <Text style={styles.sectionTitle}>HISTORY</Text>
                <View style={styles.historyList}>
                    {stockTransactions.map((item) => (
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
        alignItems: 'center',
    },
    symbol: {
        color: '#8E8E93',
        fontSize: 12,
    },
    companyName: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
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
});
