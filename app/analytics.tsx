import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    ArrowDown,
    ArrowLeft,
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
import { Dimensions, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
    const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

    const colorScheme = useColorScheme() ?? 'dark';
    const currColors = Colors[colorScheme];

    const gradients = {
        card: colorScheme === 'dark' ? ['#1C1C1E', '#000000'] as const : ['#FFFFFF', '#F2F2F7'] as const,
        active: ['#007AFF', '#004080'] as const,
    };

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
            <SafeAreaView style={[styles.safeArea, { backgroundColor: currColors.background }]}>
                <View style={[styles.container, { backgroundColor: currColors.background }]}>
                    <View style={[styles.header, { backgroundColor: currColors.background }]}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={[styles.backButton, { backgroundColor: currColors.card }]}
                        >
                            <ArrowLeft size={24} color={currColors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: currColors.text }]}>Analytics</Text>
                        <View style={{ width: 40 }} />
                    </View>
                    <View style={styles.emptyState}>
                        <Text style={[styles.emptyText, { color: currColors.text }]}>No data available yet.</Text>
                        <Text style={[styles.emptySubtext, { color: currColors.textSecondary }]}>Add some transactions to see your portfolio analytics.</Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    const dimensions: { id: Dimension; label: string; icon: any }[] = [
        { id: 'Sector', label: 'Sector', icon: LayoutGrid },
        { id: 'Company Name', label: 'Company', icon: Building2 },
        { id: 'Asset Type', label: 'Asset Type', icon: Layers },
        { id: 'Broker', label: 'Broker', icon: Briefcase },
    ];

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: currColors.background }]} edges={['top', 'left', 'right']}>
            <View style={[styles.container, { backgroundColor: currColors.background }]}>
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
                    <Text style={[styles.headerTitle, { color: currColors.text }]}>Analytics</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={[styles.selectorBar, { backgroundColor: currColors.background, borderBottomColor: currColors.border }]}>
                    {dimensions.map((dim) => {
                        const isActive = selectedDimension === dim.id;
                        const Icon = dim.icon;
                        return (
                            <TouchableOpacity
                                key={dim.id}
                                style={[styles.selectorButton, { backgroundColor: currColors.card, borderColor: currColors.border }, isActive && styles.selectorButtonActive]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSelectedDimension(dim.id);
                                }}
                            >
                                <Icon size={20} color={isActive ? '#FFF' : currColors.textSecondary} style={styles.selectorIcon} />
                                <Text style={[styles.selectorText, { color: currColors.textSecondary }, isActive && styles.selectorTextActive]}>
                                    {dim.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { backgroundColor: currColors.background }]}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currColors.text} />
                    }
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                >
                    <LinearGradient
                        colors={gradients.card}
                        style={[styles.chartContainer, { borderColor: currColors.border }]}
                    >
                        <View style={styles.pieWrapper}>
                            {allocation.length > 0 ? (
                                <PieChart
                                    data={chartData}
                                    donut
                                    sectionAutoFocus
                                    radius={SCREEN_WIDTH * 0.22}
                                    innerRadius={SCREEN_WIDTH * 0.15}
                                    innerCircleColor={currColors.card}
                                    centerLabelComponent={() => (
                                        <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                                            <Text style={{ fontSize: 20, color: currColors.text }}>
                                                {allocation.length}
                                            </Text>
                                            <Text style={{ fontSize: 8, color: currColors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>
                                                {selectedDimension.split(' ')[0]}s
                                            </Text>
                                        </View>
                                    )}
                                />
                            ) : (
                                <Text style={[styles.noDataText, { color: currColors.textSecondary }]}>Data unavailable</Text>
                            )}
                        </View>
                    </LinearGradient>

                    <View style={styles.holdingsHeader}>
                        <TouchableOpacity
                            style={[styles.actionIconButton, { backgroundColor: currColors.card, borderColor: currColors.border }]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setSortDirection(prev => prev === 'DESC' ? 'ASC' : 'DESC');
                            }}
                        >
                            {sortDirection === 'DESC' ? (
                                <ArrowDown size={14} color={currColors.text} />
                            ) : (
                                <ArrowUp size={14} color={currColors.text} />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.viewModeToggle, { backgroundColor: currColors.card, borderColor: currColors.border }]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                if (holdingsViewMode === 'Current') setHoldingsViewMode('Returns');
                                else if (holdingsViewMode === 'Returns') setHoldingsViewMode('Contribution');
                                else setHoldingsViewMode('Current');
                            }}
                        >
                            <ArrowUpDown size={14} color={currColors.text} />
                            <Text style={[styles.viewModeText, { color: currColors.text }]}>
                                {holdingsViewMode === 'Current' ? 'Current (Invested)' :
                                    holdingsViewMode === 'Returns' ? 'Returns (%)' :
                                        'Contribution (Current)'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.holdingsList, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                        {filteredAllocation.map((item, index) => {
                            const isLast = index === filteredAllocation.length - 1;
                            const isLink = selectedDimension === 'Company Name';

                            return (
                                <TouchableOpacity
                                    key={item.name}
                                    style={[
                                        styles.holdingItem,
                                        !isLast && [styles.holdingItemBorder, { borderBottomColor: currColors.border }]
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
                                                {selectedDimension === 'Company Name' && item.logo ? (
                                                    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 2 }}>
                                                        <Image
                                                            source={{ uri: item.logo }}
                                                            style={{ width: 40, height: 40, borderRadius: 10 }} // Adjusted size for padding
                                                            resizeMode="contain"
                                                        />
                                                    </View>
                                                ) : selectedDimension === 'Sector' && SECTOR_ICONS[item.name] ? (() => {
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
                                                <Text style={[styles.holdingSymbol, { color: currColors.text }]} numberOfLines={2} ellipsizeMode="tail">{item.name}</Text>
                                                {selectedDimension === 'Company Name' && (
                                                    <Text style={[styles.holdingSub, { color: currColors.textSecondary }]} numberOfLines={1}>
                                                        Qty {item.quantity.toLocaleString()}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>

                                        <View style={styles.holdingValues}>
                                            {holdingsViewMode === 'Current' && (
                                                <>
                                                    <Text style={[styles.primaryValue, { color: currColors.text }]}>
                                                        {isPrivacyMode ? '****' : `${showCurrencySymbol ? '₹' : ''}${item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                                    </Text>
                                                    <Text style={[styles.secondaryValue, { color: currColors.textSecondary }]}>
                                                        {isPrivacyMode ? '****' : `${showCurrencySymbol ? '₹' : ''}${item.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                                    </Text>
                                                </>
                                            )}
                                            {holdingsViewMode === 'Returns' && (
                                                <>
                                                    <Text style={[styles.primaryValue, { color: item.pnl >= 0 ? '#30D158' : '#FF453A' }]}>
                                                        {isPrivacyMode ? '****' : `${item.pnl >= 0 ? '+' : '-'}${showCurrencySymbol ? '₹' : ''}${Math.abs(item.pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                                    </Text>
                                                    <Text style={[styles.secondaryValue, { color: item.pnl >= 0 ? '#30D158' : '#FF453A' }]}>
                                                        {isPrivacyMode ? '****' : `${item.pnl >= 0 ? '+' : ''}${item.pnlPercentage.toFixed(2)}%`}
                                                    </Text>
                                                </>
                                            )}
                                            {holdingsViewMode === 'Contribution' && (
                                                <>
                                                    <Text style={[styles.primaryValue, { color: currColors.text }]}>
                                                        {isPrivacyMode ? '****' : `${item.percentage.toFixed(2)}%`}
                                                    </Text>
                                                    <Text style={[styles.secondaryValue, { color: currColors.textSecondary }]}>
                                                        {isPrivacyMode ? '****' : `${showCurrencySymbol ? '₹' : ''}${item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                                    </Text>
                                                </>
                                            )}
                                        </View>
                                    </View>
                                    {holdingsViewMode === 'Contribution' && (
                                        <View style={[styles.contributionProgressBarContainer, { backgroundColor: currColors.cardSecondary }]}>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#000',
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
        color: '#FFF',
        fontSize: 17,
        fontWeight: '600',
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
        gap: 16,
    },
    chartContainer: {
        borderRadius: 16,
        padding: 16,
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
