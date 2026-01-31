import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TrendingUp } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CHART_COLORS = [
    '#0A84FF', '#5E5CE6', '#BF5AF2', '#FF2D55', '#FF9F0A',
    '#FFD60A', '#30D158', '#64D2FF', '#FF375F', '#32D74B'
];

export default function ExploreScreen() {
    const fetchTickers = usePortfolioStore((state) => state.fetchTickers);
    const tickers = usePortfolioStore((state) => state.tickers);
    const router = useRouter();

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
        let result = [...tickers];
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
                style={styles.companyItem}
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
                        <Text style={styles.companyName} numberOfLines={2}>{companyName}</Text>
                    </View>
                </View>
                <View style={styles.itemRight}>
                    <Text style={styles.currentPrice}>₹{currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
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

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search companies or tickers"
                                placeholderTextColor="#8E8E93"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                                    <Ionicons name="close-circle" size={18} color="#8E8E93" />
                                </TouchableOpacity>
                            )}
                        </View>
                        <TouchableOpacity
                            style={styles.filterToggle}
                            onPress={() => setShowFilters(!showFilters)}
                        >
                            <Ionicons name="filter" size={20} color={showFilters ? '#007AFF' : '#FFF'} />
                        </TouchableOpacity>
                    </View>

                    {showFilters && (
                        <View style={styles.filtersContainer}>
                            {uniqueAssetTypes.length > 0 && (
                                <View style={styles.filterRow}>
                                    <Text style={styles.filterLabel}>Asset Type</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
                                        <TouchableOpacity
                                            style={[styles.filterChip, filterAssetType === null && styles.filterChipActive]}
                                            onPress={() => setFilterAssetType(null)}
                                        >
                                            <Text style={[styles.filterChipText, filterAssetType === null && styles.filterChipTextActive]}>
                                                All
                                            </Text>
                                        </TouchableOpacity>
                                        {uniqueAssetTypes.map((at) => (
                                            <TouchableOpacity
                                                key={at}
                                                style={[styles.filterChip, filterAssetType === at && styles.filterChipActive]}
                                                onPress={() => setFilterAssetType(at)}
                                            >
                                                <Text style={[styles.filterChipText, filterAssetType === at && styles.filterChipTextActive]}>
                                                    {at}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            {uniqueSectors.length > 0 && (
                                <View style={styles.filterRow}>
                                    <Text style={styles.filterLabel}>Sector</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
                                        <TouchableOpacity
                                            style={[styles.filterChip, filterSector === null && styles.filterChipActive]}
                                            onPress={() => setFilterSector(null)}
                                        >
                                            <Text style={[styles.filterChipText, filterSector === null && styles.filterChipTextActive]}>
                                                All
                                            </Text>
                                        </TouchableOpacity>
                                        {uniqueSectors.map((s) => (
                                            <TouchableOpacity
                                                key={s}
                                                style={[styles.filterChip, filterSector === s && styles.filterChipActive]}
                                                onPress={() => setFilterSector(s)}
                                            >
                                                <Text style={[styles.filterChipText, filterSector === s && styles.filterChipTextActive]}>
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
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color="#007AFF" />
                    </View>
                ) : (
                    <FlatList
                        data={filteredTickers}
                        keyExtractor={(item) => item.Tickers}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>
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
        backgroundColor: '#000',
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
        backgroundColor: '#000',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        gap: 12,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: '#FFF',
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
        backgroundColor: '#1C1C1E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    filtersContainer: {
        marginTop: 15,
        paddingBottom: 5,
    },
    filterRow: {
        paddingHorizontal: 20,
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
        backgroundColor: '#1C1C1E',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#2C2C2E',
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
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    companyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#1C1C1E',
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
        backgroundColor: '#2C2C2E',
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
        color: '#FFF',
    },
    itemRight: {
        alignItems: 'flex-end',
    },
    currentPrice: {
        fontSize: 14,
        fontWeight: '400',
        color: '#FFF',
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
});
