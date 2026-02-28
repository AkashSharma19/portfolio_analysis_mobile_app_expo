import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    Antenna,
    BarChart3,
    Bolt,
    Briefcase,
    Building2,
    Candy,
    CarFront,
    CircleDollarSign,
    Cpu,
    Droplet,
    Factory,
    FlaskConical,
    Fuel,
    Gem,
    HandCoins,
    LayoutGrid,
    Package,
    TrendingUp
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
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
    const recentSearches = usePortfolioStore((state) => state.recentSearches);
    const addRecentSearch = usePortfolioStore((state) => state.addRecentSearch);
    const clearRecentSearches = usePortfolioStore((state) => state.clearRecentSearches);
    const watchlist = usePortfolioStore((state) => state.watchlist);
    const toggleWatchlist = usePortfolioStore((state) => state.toggleWatchlist);
    const router = useRouter();

    const colorScheme = useColorScheme() ?? 'dark';
    const currColors = Colors[colorScheme];

    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [filterAssetType, setFilterAssetType] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [isSectorsExpanded, setIsSectorsExpanded] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    const { sector: paramSector } = useLocalSearchParams<{ sector?: string }>();

    useEffect(() => {
        if (paramSector) {
            router.push(`/sector-details/${encodeURIComponent(paramSector)}`);
        }
    }, [paramSector]);

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
        let result = tickers.filter(t => t && t.Tickers && t['Asset Type'] !== 'Index');
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (item) =>
                    (item['Company Name'] && item['Company Name'].toLowerCase().includes(query)) ||
                    (item.Tickers && item.Tickers.toLowerCase().includes(query))
            );
        } else if (!isSearchFocused) {
            // If no search query and search not focused, only show watchlist
            result = result.filter(item => watchlist.includes(item.Tickers));
        } else {
            // If no search query but search is focused, don't show watchlist
            result = [];
        }

        if (filterAssetType) {
            result = result.filter(item => item['Asset Type'] === filterAssetType);
        }

        return [...result].sort((a, b) => {
            const aCurrent = a['Current Value'] || 0;
            const aYesterday = a['Yesterday Close'] || aCurrent;
            const aChange = aYesterday !== 0 ? ((aCurrent - aYesterday) / aYesterday) * 100 : 0;

            const bCurrent = b['Current Value'] || 0;
            const bYesterday = b['Yesterday Close'] || bCurrent;
            const bChange = bYesterday !== 0 ? ((bCurrent - bYesterday) / bYesterday) * 100 : 0;

            return bChange - aChange;
        });
    }, [tickers, searchQuery, filterAssetType, watchlist, isSearchFocused]);

    const indicesData = useMemo(() => {
        return tickers.filter(t => t['Asset Type'] === 'Index');
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
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    addRecentSearch(companyName);
                    router.push(`/stock-details/${item.Tickers}`);
                }}
            >
                <View style={styles.itemLeft}>
                    <View style={[styles.holdingIcon, !item.Logo && { backgroundColor: CHART_COLORS[index % CHART_COLORS.length] + '22' }]}>
                        {item.Logo ? (
                            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 3 }}>
                                <Image
                                    source={{ uri: item.Logo }}
                                    style={{ width: 40, height: 40, borderRadius: 10 }}
                                    resizeMode="contain"
                                />
                            </View>
                        ) : (
                            <Text style={[styles.iconLetter, { color: CHART_COLORS[index % CHART_COLORS.length] }]}>
                                {companyName[0]?.toUpperCase() || '?'}
                            </Text>
                        )}
                    </View>
                    <View style={styles.infoCol}>
                        <Text style={[styles.companyName, { color: currColors.text }]} numberOfLines={1}>{companyName}</Text>
                        <View style={styles.tickerRow}>
                            <Text style={[styles.tickerText, { color: currColors.textSecondary }]}>{item.Tickers?.split(':').pop() || item.Tickers}</Text>
                            {item['Asset Type'] && (
                                <>
                                    <View style={[styles.tagDot, { backgroundColor: currColors.border }]} />
                                    <Text style={[styles.assetTag, { color: currColors.textSecondary }]}>{item['Asset Type']}</Text>
                                </>
                            )}
                        </View>
                    </View>
                </View>
                <View style={styles.itemRight}>
                    <View style={styles.priceRow}>
                        <View style={{ alignItems: 'flex-end', marginRight: 12 }}>
                            <Text style={[styles.currentPrice, { color: currColors.text }]}>{showCurrencySymbol ? '₹' : ''}{currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                            <View style={[styles.changeBadge, { backgroundColor: isPositive ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)' }]}>
                                <TrendingUp size={12} color={isPositive ? '#4CAF50' : '#F44336'} style={{ transform: [{ rotate: isPositive ? '0deg' : '180deg' }] }} />
                                <Text style={[styles.changeText, { color: isPositive ? '#4CAF50' : '#F44336' }]}>
                                    {Math.abs(changePercentage).toFixed(2)}%
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                toggleWatchlist(item.Tickers);
                            }}
                            style={styles.starButton}
                        >
                            <Ionicons
                                name={watchlist.includes(item.Tickers) ? "star" : "star-outline"}
                                size={22}
                                color={watchlist.includes(item.Tickers) ? "#FFD700" : currColors.textSecondary}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity >
        );
    };

    const topMovers = useMemo(() => {
        const sorted = [...tickers]
            .filter(t => t && t.Tickers && t['Company Name'] && t['Asset Type'] !== 'Index')
            .map(t => {
                const current = t['Current Value'] || 0;
                const yesterday = t['Yesterday Close'] || current;
                const change = yesterday !== 0 ? ((current - yesterday) / yesterday) * 100 : 0;
                return { ...t, changePercentage: change };
            })
            .sort((a, b) => Math.abs(b.changePercentage) - Math.abs(a.changePercentage));

        return sorted.slice(0, 10);
    }, [tickers]);

    const renderTopMovers = () => {
        if (searchQuery || filterAssetType) return null;

        return (
            <View style={styles.topMoversContainer}>
                <View style={[styles.sectionHeader, { marginTop: 8, paddingHorizontal: 16 }]}>
                    <Text style={[styles.sectionTitle, { color: currColors.textSecondary }]}>TOP MOVERS</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topMoversScroll}>
                    {topMovers.map((item, index) => {
                        const isPositive = item.changePercentage >= 0;
                        return (
                            <TouchableOpacity
                                key={item.Tickers}
                                style={[styles.moverCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    router.push(`/stock-details/${item.Tickers}`);
                                }}
                            >
                                <View style={styles.moverHeader}>
                                    <View style={[styles.moverIcon, { backgroundColor: currColors.cardSecondary }]}>
                                        {item.Logo ? (
                                            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 3 }}>
                                                <Image
                                                    source={{ uri: item.Logo }}
                                                    style={{ width: 32, height: 32, borderRadius: 8 }}
                                                    resizeMode="contain"
                                                />
                                            </View>
                                        ) : (
                                            <Text style={[styles.moverIconText, { color: currColors.text }]}>
                                                {item['Company Name']?.[0] || '?'}
                                            </Text>
                                        )}
                                    </View>
                                    <View style={[styles.miniBadge, { backgroundColor: isPositive ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)' }]}>
                                        <Text style={[styles.miniBadgeText, { color: isPositive ? '#4CAF50' : '#F44336' }]}>
                                            {isPositive ? '+' : ''}{item.changePercentage.toFixed(2)}%
                                        </Text>
                                    </View>
                                </View>
                                <Text style={[styles.moverSymbol, { color: currColors.text }]} numberOfLines={1}>{item['Company Name']}</Text>
                                <Text style={[styles.moverPrice, { color: currColors.textSecondary }]}>
                                    {showCurrencySymbol ? '₹' : ''}{item['Current Value']?.toLocaleString('en-IN')}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        );
    };

    const getSectorIcon = (name: string) => {
        const sectorIcons: Record<string, any> = {
            'Bank': Building2,
            'IT': Cpu,
            'Refineries': Fuel,
            'Mutual Fund': Briefcase,
            'FMCG': Package,
            'Automobile': CarFront,
            'Gold': CircleDollarSign,
            'Communications': Antenna,
            'Steel/ Iron Prducts': Factory,
            'Steel/ Iron Products': Factory,
            'Oil': Droplet,
            'NBFC': HandCoins,
            'Power': Bolt,
            'Jewellery': Gem,
            'Trading': BarChart3,
            'Petrochemicals': FlaskConical,
            'Sugar': Candy,
        };

        const Icon = sectorIcons[name] || LayoutGrid;
        const sectorColors: Record<string, string> = {
            'Bank': '#0A84FF',
            'IT': '#5E5CE6',
            'Refineries': '#8E8E93',
            'Mutual Fund': '#AF52DE',
            'FMCG': '#FF375F',
            'Automobile': '#FF2D55',
            'Gold': '#FFD60A',
            'Communications': '#64D2FF',
            'Steel/ Iron Products': '#8E8E93',
            'Oil': '#007AFF',
            'NBFC': '#5AC8FA',
            'Power': '#FF9F0A',
            'Jewellery': '#BF5AF2',
            'Trading': '#30D158',
            'Petrochemicals': '#BF5AF2',
            'Sugar': '#FFCC00',
        };

        return { icon: Icon, color: sectorColors[name] || '#32D74B' };
    };

    const renderSectorGrid = () => {
        if (searchQuery || filterAssetType) return null;

        const displaySectors = isSectorsExpanded ? uniqueSectors : uniqueSectors.slice(0, 4);
        if (displaySectors.length === 0) return null;

        return (
            <View style={styles.sectorGridContainer}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: currColors.textSecondary }]}>BROWSE SECTORS</Text>
                </View>
                <View style={[styles.sectorGrid, isSectorsExpanded && styles.sectorGridExpanded]}>
                    {displaySectors.map((sName) => {
                        const { icon: SectorIcon, color } = getSectorIcon(sName);
                        return (
                            <TouchableOpacity
                                key={sName}
                                style={[
                                    styles.sectorCard,
                                    { backgroundColor: color + '15', borderColor: color + '30' }
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    router.push(`/sector-details/${encodeURIComponent(sName)}`);
                                }}
                            >
                                <SectorIcon size={20} color={color} style={{ marginBottom: 6 }} />
                                <Text style={[styles.sectorName, { color: currColors.text }]} numberOfLines={2}>{sName}</Text>
                            </TouchableOpacity>
                        );
                    })}
                    <TouchableOpacity
                        style={[
                            styles.sectorCard,
                            styles.moreCard,
                            { backgroundColor: currColors.card, borderColor: currColors.border }
                        ]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setIsSectorsExpanded(!isSectorsExpanded);
                        }}
                    >
                        <Ionicons name={isSectorsExpanded ? "chevron-up" : "chevron-down"} size={20} color={currColors.tint} style={{ marginBottom: 6 }} />
                        <Text style={[styles.sectorName, { color: currColors.tint }]}>{isSectorsExpanded ? 'Less' : 'More'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderSearchFocusView = () => {
        if (!isSearchFocused || searchQuery.length > 0) return null;

        return (
            <View style={styles.focusView}>
                {recentSearches.length > 0 && (
                    <View style={styles.focusSection}>
                        <View style={styles.focusHeader}>
                            <Text style={[styles.sectionTitle, { color: currColors.textSecondary }]}>RECENT SEARCHES</Text>
                            <TouchableOpacity onPress={clearRecentSearches}>
                                <Text style={[styles.clearAllText, { color: currColors.tint }]}>Clear All</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.historyChips}>
                            {recentSearches.slice(0, 4).map((term, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[styles.historyChip, { backgroundColor: currColors.card, borderColor: currColors.border }]}
                                    onPress={() => setSearchQuery(term)}
                                >
                                    <Ionicons name="time-outline" size={14} color={currColors.textSecondary} />
                                    <Text style={[styles.historyChipText, { color: currColors.text }]}>{term}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
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
                                onFocus={() => setIsSearchFocused(true)}
                                onBlur={() => {
                                    setTimeout(() => setIsSearchFocused(false), 200);
                                }}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                                    <Ionicons name="close-circle" size={18} color={currColors.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>
                        <TouchableOpacity
                            style={[styles.filterToggle, { backgroundColor: currColors.card }]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setShowFilters(!showFilters);
                            }}
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
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setFilterAssetType(null);
                                            }}
                                        >
                                            <Text style={[styles.filterChipText, { color: currColors.textSecondary }, filterAssetType === null && styles.filterChipTextActive]}>
                                                All
                                            </Text>
                                        </TouchableOpacity>
                                        {uniqueAssetTypes.map((at) => (
                                            <TouchableOpacity
                                                key={at}
                                                style={[styles.filterChip, { backgroundColor: currColors.card, borderColor: currColors.border }, filterAssetType === at && styles.filterChipActive]}
                                                onPress={() => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    setFilterAssetType(at);
                                                }}
                                            >
                                                <Text style={[styles.filterChipText, { color: currColors.textSecondary }, filterAssetType === at && styles.filterChipTextActive]}>
                                                    {at}
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
                        ListHeaderComponent={
                            <>
                                <MarketRibbon
                                    indicesData={indicesData}
                                    isVisible={!searchQuery && !filterAssetType && !isSearchFocused}
                                    currColors={currColors}
                                />
                                {renderSearchFocusView()}
                                {!isSearchFocused && renderTopMovers()}
                                {!isSearchFocused && renderSectorGrid()}
                                {searchQuery || filterAssetType ? (
                                    <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                                        <Text style={[styles.sectionTitle, { color: currColors.textSecondary }]}>SEARCH RESULTS</Text>
                                    </View>
                                ) : !isSearchFocused ? (
                                    <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                                        <Text style={[styles.sectionTitle, { color: currColors.textSecondary }]}>WATCHLIST</Text>
                                    </View>
                                ) : null}
                            </>
                        }
                        contentContainerStyle={[styles.listContent, { backgroundColor: currColors.background }]}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currColors.text} />
                        }
                        ListEmptyComponent={
                            (isSearchFocused && !searchQuery) ? null : (
                                <View style={styles.emptyContainer}>
                                    <Ionicons name={searchQuery ? "search-outline" : "star-outline"} size={48} color={currColors.textSecondary} style={{ marginBottom: 16 }} />
                                    <Text style={[styles.emptyText, { color: currColors.textSecondary, textAlign: 'center' }]}>
                                        {searchQuery ? 'No companies found' : 'Your watchlist is empty.\nSearch for companies to add them.'}
                                    </Text>
                                </View>
                            )
                        }
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const MarketRibbon = ({ indicesData, isVisible, currColors }: { indicesData: any[], isVisible: boolean, currColors: any }) => {
    if (!isVisible || indicesData.length === 0) return null;

    return (
        <View style={styles.ribbonContainer}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.ribbonContent, { paddingHorizontal: 16 }]}
            >
                {indicesData.map((item, index) => {
                    const currentValue = item['Current Value'] ?? 0;
                    const yesterdayClose = item['Yesterday Close'] ?? currentValue;
                    const change = currentValue - yesterdayClose;
                    const changePercentage = yesterdayClose !== 0 ? (change / yesterdayClose) * 100 : 0;
                    const isPositive = change >= 0;

                    return (
                        <View key={`${item.Tickers}-${index}`} style={[styles.tickerItem, { backgroundColor: currColors.card }]}>
                            <Text style={[styles.tickerLabel, { color: currColors.text, marginRight: 8 }]} numberOfLines={1} ellipsizeMode="tail">
                                {item['Company Name'] || item.Tickers}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
};

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
        paddingTop: 16,
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
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    tickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tickerText: {
        fontSize: 12,
        fontWeight: '500',
    },
    tagDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        marginHorizontal: 8,
    },
    assetTag: {
        fontSize: 11,
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
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    starButton: {
        padding: 4,
    },
    emptyContainer: {
        marginTop: 100,
        alignItems: 'center',
    },
    emptyText: {
        color: '#8E8E93',
        fontSize: 16,
    },
    sectionHeader: {
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    topMoversContainer: {
        marginBottom: 24,
        marginHorizontal: -16,
    },
    topMoversScroll: {
        paddingHorizontal: 16,
        gap: 12,
    },
    moverCard: {
        width: 140,
        padding: 12,
        borderRadius: 20,
        borderWidth: 1,
    },
    moverHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    moverIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    moverIconText: {
        fontSize: 14,
        fontWeight: '600',
    },
    miniBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    miniBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    moverSymbol: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    moverPrice: {
        fontSize: 12,
        fontWeight: '400',
    },
    sectorGridContainer: {
        marginBottom: 24,
    },
    sectorGrid: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        gap: 8,
    },
    sectorGridExpanded: {
        flexWrap: 'wrap',
        rowGap: 12,
    },
    sectorCard: {
        width: (SCREEN_WIDTH - 32 - 32) / 5, // 5 columns
        height: 75,
        padding: 4,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    moreCard: {
        borderStyle: 'dashed',
    },
    sectorName: {
        fontSize: 9,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 11,
    },
    ribbonContainer: {
        height: 50,
        backgroundColor: 'transparent',
        marginBottom: 24,
        marginHorizontal: -16,
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
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    tickerLabel: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '500',
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
        fontWeight: '500',
    },
    focusView: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    focusSection: {
        marginBottom: 24,
    },
    focusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    clearAllText: {
        fontSize: 12,
        fontWeight: '600',
    },
    historyChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    historyChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        gap: 6,
    },
    historyChipText: {
        fontSize: 13,
        fontWeight: '500',
    },
});
