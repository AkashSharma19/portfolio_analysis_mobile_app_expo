import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TrendingUp } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
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
        let result = tickers;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = tickers.filter(
                (item) =>
                    item['Company Name'].toLowerCase().includes(query) ||
                    item.Tickers.toLowerCase().includes(query)
            );
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
    }, [tickers, searchQuery]);

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
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 15,
    },
    searchContainer: {
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
