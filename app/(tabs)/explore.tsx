import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TrendingUp } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;

const CHART_COLORS = [
    '#0A84FF', '#5E5CE6', '#BF5AF2', '#FF2D55', '#FF9F0A',
    '#FFD60A', '#30D158', '#64D2FF', '#FF375F', '#32D74B'
];

export default function ExploreScreen() {
    const fetchTickers = usePortfolioStore((state) => state.fetchTickers);
    const tickers = usePortfolioStore((state) => state.tickers);
    const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);
    const router = useRouter();

    const colorScheme = useColorScheme() ?? 'dark';
    const currColors = Colors[colorScheme];

    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [filterAssetType, setFilterAssetType] = useState<string | null>(null);
    const [filterSector, setFilterSector] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        const init = async () => {
            if (tickers.length === 0) {
                setLoading(true);
                await fetchTickers();
                setLoading(false);
            }
        };
        init();
    }, []);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await fetchTickers();
        setRefreshing(false);
    }, [fetchTickers]);

    const filteredTickers = useMemo(() => {
        let result = tickers.filter(t => t.Tickers !== 'INDEXNSE:NIFTY_50' && t.Tickers !== 'INDEXBOM:SENSEX' && t.Tickers !== '.IXIC'); // Filter out Indices
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (item) =>
                    item['Company Name'].toLowerCase().includes(query) ||
                    item.Tickers.toLowerCase().includes(query)
            );
        }

        if (filterAssetType) {
            result = result.filter(item => item['Asset Type'] === filterAssetType);
        }

        if (filterSector) {
            result = result.filter(item => item['Sector'] === filterSector);
        }

        // Sort by 1D change percentage (descending)
        return [...result].sort((a, b) => {
            const aCurrent = a['Current Value'] || 0;
            const aYesterday = a['Yesterday Close'] || aCurrent;
            const aChange = aYesterday !== 0 ? ((aCurrent - aYesterday) / aYesterday) * 100 : 0;

            const bCurrent = b['Current Value'] || 0;
            const bYesterday = b['Yesterday Close'] || bCurrent;
            const bChange = bYesterday !== 0 ? ((bCurrent - bYesterday) / bYesterday) * 100 : 0;

            return bChange - aChange;
        });
    }, [tickers, searchQuery, filterAssetType, filterSector]);

    const indicesData = useMemo(() => {
        return {
            nifty50: tickers.find(t => t.Tickers === 'INDEXNSE:NIFTY_50'),
            sensex: tickers.find(t => t.Tickers === 'INDEXBOM:SENSEX'),
            nasdaq: tickers.find(t => t.Tickers === '.IXIC')
        };
    }, [tickers]);

    const uniqueAssetTypes = useMemo(() => {
        const assetTypes = new Set<string>(tickers.map(t => t['Asset Type']).filter((t): t is string => !!t));
        return Array.from(assetTypes).sort();
    }, [tickers]);

    const uniqueSectors = useMemo(() => {
        const sectors = new Set<string>(tickers.map(t => t['Sector']).filter((t): t is string => !!t));
        return Array.from(sectors).sort();
    }, [tickers]);

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        const currentValue = item['Current Value'] || 0;
        const yesterdayClose = item['Yesterday Close'] || currentValue;
        const change = currentValue - yesterdayClose;
        const changePercentage = yesterdayClose !== 0 ? (change / yesterdayClose) * 100 : 0;
        const isPositive = change >= 0;
        const companyName = item['Company Name'] || '?';

        return (
            <TouchableOpacity
                style={[styles.companyItem, { borderBottomColor: currColors.border }]}
                activeOpacity={0.7}
                onPress={() => router.push(`/stock-details/${item.Tickers}`)}
            >
                <View style={styles.itemLeft}>
                    <View style={[styles.holdingIcon, { backgroundColor: CHART_COLORS[index % CHART_COLORS.length] + '22' }]}>
                        <Text style={[styles.iconLetter, { color: CHART_COLORS[index % CHART_COLORS.length] }]}>
                            {companyName[0]?.toUpperCase() || '?'}
                        </Text>
                    </View>
                    <View style={styles.infoCol}>
                        <Text style={[styles.companyName, { color: currColors.text }]} numberOfLines={2}>{companyName}</Text>
                    </View>
                </View>
                <View style={styles.itemRight}>
                    <Text style={[styles.currentPrice, { color: currColors.text }]}>{showCurrencySymbol ? '₹' : ''}{currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    <View style={[styles.changeBadge, { backgroundColor: isPositive ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)' }]}>
                        <TrendingUp size={12} color={isPositive ? '#4CAF50' : '#F44336'} style={{ transform: [{ rotate: isPositive ? '0deg' : '180deg' }] }} />
                        <Text style={[styles.changeText, { color: isPositive ? '#4CAF50' : '#F44336' }]}>
                            {Math.abs(changePercentage).toFixed(2)}%
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderTickerRibbon = () => {
        const { nifty50, sensex, nasdaq } = indicesData;
        if ((!nifty50 && !sensex && !nasdaq) || searchQuery || filterAssetType || filterSector) return null;

        const indices = [
            { label: 'NIFTY 50', data: nifty50 },
            { label: 'SENSEX', data: sensex },
            { label: 'NASDAQ', data: nasdaq },
        ].filter(i => i.data);

        // Repeat the list to create a seamless loop
        const duplicatedIndices = [...indices, ...indices, ...indices, ...indices];

        const translateX = useSharedValue(0);
        const itemWidth = 240; // Adjusted for pill width + margin
        const totalWidth = indices.length * itemWidth;

        useEffect(() => {
            translateX.value = withRepeat(
                withTiming(-totalWidth, {
                    duration: 10000, // Adjust speed here
                    easing: Easing.linear,
                }),
                -1, // Infinite repeat
                false // Do not reverse
            );
        }, [totalWidth]);

        const animatedStyle = useAnimatedStyle(() => {
            return {
                transform: [{ translateX: translateX.value }],
            };
        });

        const renderTickerItem = (item: any, index: number) => {
            const data = item.data;
            const currentValue = data['Current Value'] || 0;
            const yesterdayClose = data['Yesterday Close'] || currentValue;
            const change = currentValue - yesterdayClose;
            const changePercentage = yesterdayClose !== 0 ? (change / yesterdayClose) * 100 : 0;
            const isPositive = change >= 0;

            return (
                <View key={index} style={[styles.tickerItem, { backgroundColor: currColors.card }]}>
                    <Text style={[styles.tickerLabel, { color: currColors.text }]}>{item.label}</Text>
                    <Text style={[styles.tickerPrice, { color: currColors.text }]}>
                        {currentValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </Text>
                    <View style={styles.tickerChangeContainer}>
                        <TrendingUp size={12} color={isPositive ? '#4CAF50' : '#F44336'} style={{ marginRight: 2, transform: [{ rotate: isPositive ? '0deg' : '180deg' }] }} />
                        <Text style={[styles.tickerChange, { color: isPositive ? '#4CAF50' : '#F44336' }]}>
                            {Math.abs(changePercentage).toFixed(2)}%
                        </Text>
                    </View>
                </View>
            );
        };

        return (
            <View style={styles.ribbonContainer}>
                <Animated.View style={[styles.ribbonContent, animatedStyle]}>
                    {duplicatedIndices.map((item, index) => renderTickerItem(item, index))}
                </Animated.View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: currColors.background }]} edges={['top', 'left', 'right']}>
            <View style={[styles.container, { backgroundColor: currColors.background }]}>
                <View style={[styles.header, { backgroundColor: currColors.background }]}>
                    <View style={styles.headerTop}>
                        <View style={[styles.searchContainer, { backgroundColor: currColors.card }]}>
                            <Ionicons name="search" size={20} color={currColors.textSecondary} style={styles.searchIcon} />
                            <TextInput
                                style={[styles.searchInput, { color: currColors.text }]}
                                placeholder="Search companies or tickers"
                                placeholderTextColor={currColors.textSecondary}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                                    <Ionicons name="close-circle" size={18} color={currColors.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>
                        <TouchableOpacity
                            style={[styles.filterToggle, { backgroundColor: currColors.card }]}
                            onPress={() => setShowFilters(!showFilters)}
                        >
                            <Ionicons name="filter" size={20} color={showFilters ? currColors.tint : currColors.text} />
                        </TouchableOpacity>
                    </View>

                    {showFilters && (
                        <View style={styles.filtersContainer}>
                            {uniqueAssetTypes.length > 0 && (
                                <View style={styles.filterRow}>
                                    <Text style={[styles.filterLabel, { color: currColors.textSecondary }]}>Asset Type</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
                                        <TouchableOpacity
                                            style={[styles.filterChip, { backgroundColor: currColors.card, borderColor: currColors.border }, filterAssetType === null && styles.filterChipActive]}
                                            onPress={() => setFilterAssetType(null)}
                                        >
                                            <Text style={[styles.filterChipText, { color: currColors.textSecondary }, filterAssetType === null && styles.filterChipTextActive]}>
                                                All
                                            </Text>
                                        </TouchableOpacity>
                                        {uniqueAssetTypes.map((at) => (
                                            <TouchableOpacity
                                                key={at}
                                                style={[styles.filterChip, { backgroundColor: currColors.card, borderColor: currColors.border }, filterAssetType === at && styles.filterChipActive]}
                                                onPress={() => setFilterAssetType(at)}
                                            >
                                                <Text style={[styles.filterChipText, { color: currColors.textSecondary }, filterAssetType === at && styles.filterChipTextActive]}>
                                                    {at}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            {uniqueSectors.length > 0 && (
                                <View style={styles.filterRow}>
                                    <Text style={[styles.filterLabel, { color: currColors.textSecondary }]}>Sector</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
                                        <TouchableOpacity
                                            style={[styles.filterChip, { backgroundColor: currColors.card, borderColor: currColors.border }, filterSector === null && styles.filterChipActive]}
                                            onPress={() => setFilterSector(null)}
                                        >
                                            <Text style={[styles.filterChipText, { color: currColors.textSecondary }, filterSector === null && styles.filterChipTextActive]}>
                                                All
                                            </Text>
                                        </TouchableOpacity>
                                        {uniqueSectors.map((s) => (
                                            <TouchableOpacity
                                                key={s}
                                                style={[styles.filterChip, { backgroundColor: currColors.card, borderColor: currColors.border }, filterSector === s && styles.filterChipActive]}
                                                onPress={() => setFilterSector(s)}
                                            >
                                                <Text style={[styles.filterChipText, { color: currColors.textSecondary }, filterSector === s && styles.filterChipTextActive]}>
                                                    {s}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {loading && tickers.length === 0 ? (
                    <View style={[styles.centered, { backgroundColor: currColors.background }]}>
                        <ActivityIndicator size="large" color={currColors.tint} />
                    </View>
                ) : (
                    <FlatList
                        data={filteredTickers}
                        keyExtractor={(item) => item.Tickers}
                        renderItem={renderItem}
                        ListHeaderComponent={renderTickerRibbon}
                        contentContainerStyle={[styles.listContent, { backgroundColor: currColors.background }]}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currColors.text} />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={[styles.emptyText, { color: currColors.textSecondary }]}>
                                    {searchQuery ? 'No companies found' : 'Loading companies...'}
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingTop: 20,
        paddingBottom: 15,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        gap: 12,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        height: '100%',
    },
    clearButton: {
        padding: 4,
    },
    filterToggle: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filtersContainer: {
        marginTop: 15,
        paddingBottom: 5,
    },
    filterRow: {
        paddingHorizontal: 16,
        marginBottom: 15,
    },
    filterLabel: {
        color: '#8E8E93',
        fontSize: 11,
        marginBottom: 8,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
    },
    filterChipActive: {
        backgroundColor: '#007AFF',
        borderColor: '#0A84FF',
    },
    filterChipText: {
        color: '#8E8E93',
        fontSize: 13,
        fontWeight: '400',
    },
    filterChipTextActive: {
        color: '#FFF',
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    companyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    itemLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginRight: 10,
    },
    holdingIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconLetter: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '500',
    },
    infoCol: {
        flex: 1,
    },
    companyName: {
        fontSize: 14,
        fontWeight: '400',
    },
    itemRight: {
        alignItems: 'flex-end',
    },
    currentPrice: {
        fontSize: 14,
        fontWeight: '400',
        marginBottom: 4,
    },
    changeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    changeText: {
        fontSize: 12,
        fontWeight: '400',
        marginLeft: 4,
    },
    emptyContainer: {
        marginTop: 100,
        alignItems: 'center',
    },
    emptyText: {
        color: '#8E8E93',
        fontSize: 16,
    },
    // Ticker Ribbon Styles
    ribbonContainer: {
        height: 50,
        backgroundColor: 'transparent',
        marginBottom: 16,
        marginHorizontal: -16, // Bleed to edges
        overflow: 'hidden',
        justifyContent: 'center',
    },
    ribbonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    tickerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
        width: 228, // Matches itemWidth (240) - margin (12)
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    tickerLabel: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
    },
    tickerPrice: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '500',
    },
    tickerChangeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tickerChange: {
        fontSize: 11,
        fontWeight: '600',
    },
});
