import { usePortfolioStore } from '@/store/usePortfolioStore';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    ArrowUpRight,
    Briefcase,
    Building2,
    Candy,
    Car,
    ChartNoAxesCombined,
    Coins,
    CreditCard,
    Diamond,
    Droplet,
    Factory,
    FlaskConical,
    Hammer,
    Landmark,
    Layers,
    LayoutGrid,
    Medal,
    Monitor,
    Phone,
    ShoppingBasket,
    Target,
    TrendingUp,
    Trophy,
    Wallet,
    Zap
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;

const CHART_COLORS = [
    '#0A84FF', '#5E5CE6', '#BF5AF2', '#FF2D55', '#FF9F0A',
    '#FFD60A', '#30D158', '#64D2FF', '#FF375F', '#32D74B'
];

const GRADIENTS = {
    card: ['#1C1C1E', '#000000'] as const,
    active: ['#007AFF', '#004080'] as const,
};

const SECTOR_ICONS: Record<string, any> = {
    'Bank': Landmark,
    'IT': Monitor,
    'Refineries': Factory,
    'Mutual Fund': Wallet,
    'FMCG': ShoppingBasket,
    'Automobile': Car,
    'Gold': Coins,
    'Communications': Phone,
    'Steel/ Iron Prducts': Hammer,
    'Steel/ Iron Products': Hammer,
    'Oil': Droplet,
    'NBFC': CreditCard,
    'Power': Zap,
    'Jewellery': Diamond,
    'Trading': TrendingUp,
    'Petrochemicals': FlaskConical,
    'Sugar': Candy,
};

const ASSET_TYPE_ICONS: Record<string, any> = {
    'Large Cap': Trophy,
    'Mid Cap': Medal,
    'Small Cap': Target,
    'ETF': Layers,
};

const BROKER_ICONS: Record<string, any> = {
    'Upstox': ArrowUpRight,
    'Groww': ChartNoAxesCombined,
    'IND Money': Landmark,
};

type Dimension = 'Sector' | 'Company Name' | 'Asset Type' | 'Broker';

export default function AnalyticsScreen() {
    const router = useRouter();
    const fetchTickers = usePortfolioStore((state) => state.fetchTickers);
    const getAllocationData = usePortfolioStore((state) => state.getAllocationData);
    const transactions = usePortfolioStore((state) => state.transactions);
    const tickers = usePortfolioStore((state) => state.tickers);
    const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);

    const [refreshing, setRefreshing] = useState(false);
    const [selectedDimension, setSelectedDimension] = useState<Dimension>('Sector');
    const [holdingsViewMode, setHoldingsViewMode] = useState<'Current' | 'Returns' | 'Contribution'>('Current');
    const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');

    useEffect(() => {
        fetchTickers();
    }, []);

    const onRefresh = React.useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setRefreshing(true);
        await fetchTickers();
        setRefreshing(false);
    }, [fetchTickers]);

    const allocation = useMemo(() =>
        getAllocationData(selectedDimension),
        [getAllocationData, selectedDimension, transactions, tickers]
    );

    const filteredAllocation = useMemo(() => {
        let data = [...allocation];

        data.sort((a, b) => {
            let valA = 0;
            let valB = 0;

            if (holdingsViewMode === 'Returns') {
                valA = a.pnl || 0;
                valB = b.pnl || 0;
            } else if (holdingsViewMode === 'Contribution') {
                valA = a.percentage || 0;
                valB = b.percentage || 0;
            } else {
                // Default: 'Current'
                valA = a.value || 0;
                valB = b.value || 0;
            }

            if (valA !== valB) {
                return sortDirection === 'DESC' ? valB - valA : valA - valB;
            }

            // Stable secondary sort by name if values are identical
            return a.name.localeCompare(b.name);
        });

        return data;
    }, [allocation, sortDirection, holdingsViewMode]);

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

    const dimensions: { id: Dimension; label: string; icon: any }[] = [
        { id: 'Sector', label: 'Sector', icon: LayoutGrid },
        { id: 'Company Name', label: 'Company', icon: Building2 },
        { id: 'Asset Type', label: 'Asset Type', icon: Layers },
        { id: 'Broker', label: 'Broker', icon: Briefcase },
    ];

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <View style={styles.container}>
                <View style={styles.selectorBar}>
                    {dimensions.map((dim) => {
                        const isActive = selectedDimension === dim.id;
                        const Icon = dim.icon;
                        return (
                            <TouchableOpacity
                                key={dim.id}
                                style={[styles.selectorButton, isActive && styles.selectorButtonActive]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSelectedDimension(dim.id);
                                }}
                            >
                                <Icon size={20} color={isActive ? '#FFF' : '#8E8E93'} style={styles.selectorIcon} />
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
                        <View style={styles.pieWrapper}>
                            {allocation.length > 0 ? (
                                <PieChart
                                    data={chartData}
                                    donut
                                    sectionAutoFocus
                                    radius={SCREEN_WIDTH * 0.22}
                                    innerRadius={SCREEN_WIDTH * 0.15}
                                    innerCircleColor={'#1C1C1E'}
                                    centerLabelComponent={() => (
                                        <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                                            <Text style={{ fontSize: 20, color: 'white' }}>
                                                {allocation.length}
                                            </Text>
                                            <Text style={{ fontSize: 8, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 1 }}>
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

                    {/* Unified Actions Bar (Sort & View Mode) */}
                    <View style={styles.holdingsHeader}>
                        <TouchableOpacity
                            style={styles.actionIconButton}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setSortDirection(prev => prev === 'DESC' ? 'ASC' : 'DESC');
                            }}
                        >
                            {sortDirection === 'DESC' ? (
                                <ArrowDown size={14} color="#FFF" />
                            ) : (
                                <ArrowUp size={14} color="#FFF" />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.viewModeToggle}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                            const isLink = selectedDimension === 'Company Name';

                            return (
                                <TouchableOpacity
                                    key={item.name}
                                    style={[
                                        styles.holdingItem,
                                        !isLast && styles.holdingItemBorder
                                    ]}
                                    disabled={!isLink}
                                    onPress={() => {
                                        if (isLink && item.symbol) {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            // @ts-ignore
                                            router.push(`/stock-details/${item.symbol}`);
                                        }
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.holdingRow}>
                                        <View style={styles.holdingMain}>
                                            <View style={[styles.holdingIcon, { backgroundColor: CHART_COLORS[index % CHART_COLORS.length] + '22' }]}>
                                                {selectedDimension === 'Sector' && SECTOR_ICONS[item.name] ? (() => {
                                                    const Icon = SECTOR_ICONS[item.name];
                                                    return <Icon size={20} color={CHART_COLORS[index % CHART_COLORS.length]} />;
                                                })() : selectedDimension === 'Asset Type' && ASSET_TYPE_ICONS[item.name] ? (() => {
                                                    const Icon = ASSET_TYPE_ICONS[item.name];
                                                    return <Icon size={20} color={CHART_COLORS[index % CHART_COLORS.length]} />;
                                                })() : selectedDimension === 'Broker' && BROKER_ICONS[item.name] ? (() => {
                                                    const Icon = BROKER_ICONS[item.name];
                                                    return <Icon size={20} color={CHART_COLORS[index % CHART_COLORS.length]} />;
                                                })() : (
                                                    <Text style={[styles.iconLetter, { color: CHART_COLORS[index % CHART_COLORS.length] }]}>
                                                        {item.name[0]?.toUpperCase() || '?'}
                                                    </Text>
                                                )}
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
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>

            </View >
        </SafeAreaView >
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
        justifyContent: 'space-between',
        gap: 10,
    },
    selectorButton: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: 12,
        backgroundColor: '#1C1C1E',
        borderWidth: 1,
        borderColor: '#2C2C2E',
        gap: 4,
    },
    selectorButtonActive: {
        backgroundColor: '#007AFF',
        borderColor: '#0A84FF',
    },
    selectorIcon: {
        marginBottom: 2,
    },
    selectorText: {
        color: '#8E8E93',
        fontSize: 10,
        fontWeight: '500',
        textAlign: 'center',
    },
    selectorTextActive: {
        color: '#FFF',
        fontWeight: '600',
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
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    chartContainer: {
        borderRadius: 24,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    pieWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        height: SCREEN_WIDTH * 0.45,
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
    },
    actionIconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#2C2C2E',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#3C3C3E',
    },
    viewModeToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#2C2C2E',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        height: 36,
        borderWidth: 1,
        borderColor: '#3C3C3E',
    },
    viewModeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '400',
    },
    holdingsList: {
        backgroundColor: '#1C1C1E',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    holdingItem: {
        padding: 18,
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
        marginRight: 10,
    },
    holdingIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#2C2C2E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconLetter: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '500',
    },
    holdingInfo: {
        justifyContent: 'center',
        flex: 1,
        minWidth: 0,
    },
    holdingSymbol: {
        color: '#FFF',
        fontSize: 15,
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
        fontSize: 15,
        fontWeight: '400',
    },
    secondaryValue: {
        color: '#8E8E93',
        fontSize: 12,
        marginTop: 2,
    },
    contributionProgressBarContainer: {
        height: 3,
        backgroundColor: '#2C2C2E',
        borderRadius: 1.5,
        marginTop: 14,
        marginHorizontal: 0,
        overflow: 'hidden',
    },
    contributionProgressBarFill: {
        height: '100%',
        borderRadius: 1.5,
    },
});
