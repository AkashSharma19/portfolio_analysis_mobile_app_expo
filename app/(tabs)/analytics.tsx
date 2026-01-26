import { usePortfolioStore } from '@/store/usePortfolioStore';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowUpDown } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;

const CHART_COLORS = [
    '#0A84FF', '#5E5CE6', '#BF5AF2', '#FF2D55', '#FF9F0A',
    '#FFD60A', '#30D158', '#64D2FF', '#8E8E93', '#1C1C1E'
];

const GRADIENTS = {
    card: ['#1C1C1E', '#000000'] as const,
    active: ['#007AFF', '#004080'] as const,
};

type Dimension = 'Sector' | 'Company Name' | 'Asset Type' | 'Broker';

export default function AnalyticsScreen() {
    /**
     * Analytics Screen Refinements
     * - Clean Layout: Removed the redundant "Portfolio Spread" heading.
     * - Minimalist List: Removed the colored dots from the distribution list.
     * - Text Wrapping: Item names now wrap to 2 lines if they are long.
     */
    const fetchTickers = usePortfolioStore((state) => state.fetchTickers);
    const getAllocationData = usePortfolioStore((state) => state.getAllocationData);
    const getHoldingsData = usePortfolioStore((state) => state.getHoldingsData);
    const transactions = usePortfolioStore((state) => state.transactions);
    const tickers = usePortfolioStore((state) => state.tickers);
    const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);

    const [refreshing, setRefreshing] = useState(false);
    const [selectedDimension, setSelectedDimension] = useState<Dimension>('Sector');
    const [holdingsViewMode, setHoldingsViewMode] = useState<'Current' | 'Returns' | 'Contribution'>('Current');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchTickers();
    }, []);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await fetchTickers();
        setRefreshing(false);
    }, [fetchTickers]);

    const allocation = useMemo(() =>
        getAllocationData(selectedDimension),
        [getAllocationData, selectedDimension, transactions, tickers]
    );

    const filteredAllocation = useMemo(() => {
        let data = allocation;
        if (searchQuery) {
            data = data.filter(item =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        return data;
    }, [allocation, searchQuery]);

    const chartData = useMemo(() => {
        return allocation.map((item, index) => ({
            value: item.percentage,
            color: CHART_COLORS[index % CHART_COLORS.length],
            text: isPrivacyMode ? '****' : `${item.percentage.toFixed(1)}%`,
            label: item.name,
        }));
    }, [allocation, isPrivacyMode]);

    if (transactions.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No data available yet.</Text>
                    <Text style={styles.emptySubtext}>Add some transactions to see your portfolio analytics.</Text>
                </View>
            </View>
        );
    }

    const dimensions: { id: Dimension; label: string }[] = [
        { id: 'Sector', label: 'Sector' },
        { id: 'Company Name', label: 'Company' },
        { id: 'Asset Type', label: 'Asset Type' },
        { id: 'Broker', label: 'Broker' },
    ];

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <View style={styles.container}>
                <View style={styles.selectorBar}>
                    {dimensions.map((dim) => {
                        const isActive = selectedDimension === dim.id;
                        return (
                            <TouchableOpacity
                                key={dim.id}
                                style={[styles.selectorButton, isActive && styles.selectorButtonActive]}
                                onPress={() => setSelectedDimension(dim.id)}
                            >
                                <Text style={[styles.selectorText, isActive && styles.selectorTextActive]}>
                                    {dim.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />
                    }
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                >
                    <LinearGradient
                        colors={GRADIENTS.card}
                        style={styles.chartContainer}
                    >
                        <Text style={styles.cardTitle}>{selectedDimension} Distribution</Text>
                        <View style={styles.pieWrapper}>
                            {allocation.length > 0 ? (
                                <PieChart
                                    data={chartData}
                                    donut
                                    sectionAutoFocus
                                    radius={SCREEN_WIDTH * 0.3}
                                    innerRadius={SCREEN_WIDTH * 0.22}
                                    innerCircleColor={'#1C1C1E'}
                                    centerLabelComponent={() => (
                                        <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                                            <Text style={{ fontSize: 28, color: 'white' }}>
                                                {allocation.length}
                                            </Text>
                                            <Text style={{ fontSize: 10, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 1 }}>
                                                {selectedDimension.split(' ')[0]}s
                                            </Text>
                                        </View>
                                    )}
                                />
                            ) : (
                                <Text style={styles.noDataText}>Data unavailable</Text>
                            )}
                        </View>
                    </LinearGradient>

                    {/* Unified Actions Bar (Toggle) */}
                    <View style={[styles.holdingsHeader, { justifyContent: 'flex-end' }]}>
                        <TouchableOpacity
                            style={styles.viewModeToggle}
                            onPress={() => {
                                if (holdingsViewMode === 'Current') setHoldingsViewMode('Returns');
                                else if (holdingsViewMode === 'Returns') setHoldingsViewMode('Contribution');
                                else setHoldingsViewMode('Current');
                            }}
                        >
                            <ArrowUpDown size={14} color="#FFF" />
                            <Text style={styles.viewModeText}>
                                {holdingsViewMode === 'Current' ? 'Current (Invested)' :
                                    holdingsViewMode === 'Returns' ? 'Returns (%)' :
                                        'Contribution (Current)'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Unified Distribution/Holdings List */}
                    <View style={styles.holdingsList}>
                        {filteredAllocation.map((item, index) => {
                            const isLast = index === filteredAllocation.length - 1;
                            return (
                                <View
                                    key={item.name}
                                    style={[
                                        styles.holdingItem,
                                        !isLast && styles.holdingItemBorder
                                    ]}
                                >
                                    <View style={styles.holdingRow}>
                                        <View style={styles.holdingMain}>
                                            <View style={[styles.holdingIcon, { backgroundColor: CHART_COLORS[index % CHART_COLORS.length] + '22' }]}>
                                                <Text style={[styles.iconLetter, { color: CHART_COLORS[index % CHART_COLORS.length] }]}>
                                                    {item.name[0]?.toUpperCase() || '?'}
                                                </Text>
                                            </View>
                                            <View style={styles.holdingInfo}>
                                                <Text style={styles.holdingSymbol} numberOfLines={2} ellipsizeMode="tail">{item.name}</Text>
                                                {selectedDimension === 'Company Name' && (
                                                    <Text style={styles.holdingSub} numberOfLines={1}>
                                                        Qty {item.quantity.toLocaleString()}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>

                                        <View style={styles.holdingValues}>
                                            {holdingsViewMode === 'Current' && (
                                                <>
                                                    <Text style={styles.primaryValue}>
                                                        {isPrivacyMode ? '****' : `₹${item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                                    </Text>
                                                    <Text style={styles.secondaryValue}>
                                                        {isPrivacyMode ? '****' : `₹${item.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                                    </Text>
                                                </>
                                            )}
                                            {holdingsViewMode === 'Returns' && (
                                                <>
                                                    <Text style={[styles.primaryValue, { color: item.pnl >= 0 ? '#30D158' : '#FF453A' }]}>
                                                        {isPrivacyMode ? '****' : `${item.pnl >= 0 ? '+' : '-'}₹${Math.abs(item.pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                                    </Text>
                                                    <Text style={[styles.secondaryValue, { color: item.pnl >= 0 ? '#30D158' : '#FF453A' }]}>
                                                        {isPrivacyMode ? '****' : `${item.pnl >= 0 ? '+' : ''}${item.pnlPercentage.toFixed(2)}%`}
                                                    </Text>
                                                </>
                                            )}
                                            {holdingsViewMode === 'Contribution' && (
                                                <>
                                                    <Text style={styles.primaryValue}>
                                                        {isPrivacyMode ? '****' : `${item.percentage.toFixed(2)}%`}
                                                    </Text>
                                                    <Text style={styles.secondaryValue}>
                                                        {isPrivacyMode ? '****' : `₹${item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                                    </Text>
                                                </>
                                            )}
                                        </View>
                                    </View>
                                    {holdingsViewMode === 'Contribution' && (
                                        <View style={styles.contributionProgressBarContainer}>
                                            <View style={[
                                                styles.contributionProgressBarFill,
                                                {
                                                    width: `${item.percentage}%`,
                                                    backgroundColor: CHART_COLORS[index % CHART_COLORS.length]
                                                }
                                            ]} />
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>

            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#000',
    },
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    selectorBar: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#000',
        borderBottomWidth: 1,
        borderBottomColor: '#1C1C1E',
        flexDirection: 'row',
        gap: 8,
    },
    selectorButton: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#1C1C1E',
        borderWidth: 1,
        borderColor: '#2C2C2E',
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectorButtonActive: {
        backgroundColor: '#007AFF',
        borderColor: '#0A84FF',
    },
    selectorText: {
        color: '#8E8E93',
        fontSize: 11,
        fontWeight: '400',
    },
    selectorTextActive: {
        color: '#FFF',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
        gap: 20,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '400',
        color: '#FFF',
        marginBottom: 20,
        letterSpacing: 0.5,
    },
    chartContainer: {
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    pieWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        height: SCREEN_WIDTH * 0.65,
    },
    noDataText: {
        color: '#8E8E93',
        fontSize: 11,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '400',
        marginBottom: 8,
    },
    emptySubtext: {
        color: '#8E8E93',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
    },
    // Unified List Styles
    holdingsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    holdingsLeft: {
        flexDirection: 'row',
        gap: 12,
    },
    iconButtonSmall: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#1C1C1E',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    viewModeToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#2C2C2E',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    viewModeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '400',
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#2C2C2E',
        gap: 8,
    },
    searchBarInput: {
        flex: 1,
        color: '#FFF',
        fontSize: 14,
        height: 24,
        padding: 0,
    },
    holdingsList: {
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    holdingItem: {
        padding: 16,
        alignSelf: 'stretch',
    },
    holdingItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#2C2C2E',
    },
    holdingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    holdingMain: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        marginRight: 20, // More space for the right-side values
    },
    holdingIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#2C2C2E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconLetter: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '400',
    },
    holdingInfo: {
        justifyContent: 'center',
        flex: 1,
        minWidth: 0,
    },
    holdingSymbol: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '400',
        flexShrink: 1,
    },
    holdingSub: {
        color: '#8E8E93',
        fontSize: 12,
        marginTop: 2,
        flexShrink: 1,
    },
    holdingValues: {
        alignItems: 'flex-end',
        flexShrink: 0,
    },
    primaryValue: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '400',
    },
    secondaryValue: {
        color: '#8E8E93',
        fontSize: 12,
        marginTop: 2,
    },
    contributionProgressBarContainer: {
        height: 4,
        backgroundColor: '#2C2C2E',
        borderRadius: 2,
        marginTop: 12,
        marginHorizontal: 4,
        overflow: 'hidden',
    },
    contributionProgressBarFill: {
        height: '100%',
        backgroundColor: '#8E8E93', // Simple grey for the progress bar
        borderRadius: 2,
    },
});
