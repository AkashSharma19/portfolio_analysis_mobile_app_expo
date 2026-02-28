import { useColorScheme } from '@/components/useColorScheme';
import { getSectorIcon } from '@/constants/Sectors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    TrendingUp
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Dimensions, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../constants/Colors';
import { usePortfolioStore } from '../../store/usePortfolioStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CHART_COLORS = [
    '#4ADE80', // Green
    '#60A5FA', // Blue
    '#F87171', // Red
    '#FACC15', // Yellow
    '#A78BFA', // Purple
    '#FB923C', // Orange
    '#2DD4BF', // Teal
];

export default function SectorDetailsScreen() {
    const { sector } = useLocalSearchParams<{ sector: string }>();
    const tickers = usePortfolioStore((state) => state.tickers);
    const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);
    const addRecentSearch = usePortfolioStore((state) => state.addRecentSearch);
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'dark';
    const currColors = Colors[colorScheme as 'light' | 'dark'];

    const [viewMode, setViewMode] = useState<'Price' | 'DailyChange' | 'Name'>('DailyChange');
    const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');

    // Removed local getSectorIcon

    const sectorData = getSectorIcon(sector || '');
    const SectorIcon = sectorData.icon;
    const sectorColor = sectorData.color;

    const filteredCompanies = useMemo(() => {
        let result = tickers.filter(t => t['Sector'] === sector);

        return [...result].sort((a, b) => {
            let valA: any;
            let valB: any;

            if (viewMode === 'Name') {
                valA = a['Company Name'] || '';
                valB = b['Company Name'] || '';
            } else if (viewMode === 'Price') {
                valA = a['Current Value'] || 0;
                valB = b['Current Value'] || 0;
            } else {
                // Default: DailyChange (Returns)
                const aCurrent = a['Current Value'] || 0;
                const aYesterday = a['Yesterday Close'] || aCurrent;
                valA = aYesterday !== 0 ? ((aCurrent - aYesterday) / aYesterday) * 100 : 0;

                const bCurrent = b['Current Value'] || 0;
                const bYesterday = b['Yesterday Close'] || bCurrent;
                valB = bYesterday !== 0 ? ((bCurrent - bYesterday) / bYesterday) * 100 : 0;
            }

            if (valA !== valB) {
                if (typeof valA === 'string') {
                    return sortDirection === 'DESC' ? valB.localeCompare(valA) : valA.localeCompare(valB);
                }
                return sortDirection === 'DESC' ? valB - valA : valA - valB;
            }
            return 0;
        });
    }, [tickers, sector, viewMode, sortDirection]);

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
                    <View style={[styles.holdingIcon, { backgroundColor: CHART_COLORS[index % CHART_COLORS.length] + '22' }]}>
                        {item.Logo ? (
                            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 2 }}>
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
                        </View>
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

    return (
        <View style={[styles.safeArea, { backgroundColor: currColors.background }]}>
            <Stack.Screen options={{
                headerShown: false,
            }} />

            <View style={[styles.container, { backgroundColor: currColors.background }]}>
                {/* Header Section (1/3rd of screen for more prominence) */}
                <LinearGradient
                    colors={[sectorColor + '20', currColors.background]}
                    style={styles.headerSection}
                >
                    <SafeAreaView edges={['top']} style={styles.headerContent}>
                        <View style={styles.headerTopRow}>
                            <TouchableOpacity
                                onPress={() => router.back()}
                                style={[styles.backButton, { backgroundColor: currColors.card + '80' }]}
                            >
                                <Ionicons name="chevron-back" size={24} color={currColors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.headerCenter}>
                            <View style={[styles.largeIconContainer, {
                                backgroundColor: currColors.background,
                                shadowColor: sectorColor,
                                shadowOffset: { width: 0, height: 10 },
                                shadowOpacity: 0.3,
                                shadowRadius: 20,
                                elevation: 10,
                                borderColor: sectorColor + '30'
                            }]}>
                                <SectorIcon size={48} color={sectorColor} strokeWidth={1.5} />
                            </View>
                            <Text style={[styles.sectorTitle, { color: currColors.text }]}>{sector}</Text>
                        </View>
                    </SafeAreaView>
                </LinearGradient>

                {/* List Section */}
                <View style={[styles.listSection, { backgroundColor: currColors.background }]}>
                    <View style={styles.filtersWrapper}>
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
                                    if (viewMode === 'Price') setViewMode('DailyChange');
                                    else if (viewMode === 'DailyChange') setViewMode('Name');
                                    else setViewMode('Price');
                                }}
                            >
                                <ArrowUpDown size={14} color={currColors.text} />
                                <Text style={[styles.viewModeText, { color: currColors.text }]}>
                                    {viewMode === 'Price' ? 'Current price' :
                                        viewMode === 'DailyChange' ? 'Daily change' : 'Name'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <FlatList
                        data={filteredCompanies}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.Tickers}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                    />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    headerSection: {
        height: SCREEN_HEIGHT / 3.2,
        width: '100%',
    },
    headerContent: {
        flex: 1,
        paddingHorizontal: 20,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -10,
    },
    largeIconContainer: {
        width: 90,
        height: 90,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        marginBottom: 16,
    },
    sectorTitle: {
        fontSize: SCREEN_WIDTH > 400 ? 28 : 24,
        fontWeight: '500',
        letterSpacing: -0.5,
        marginBottom: 8,
    },

    listSection: {
        flex: 1,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: -30,
        paddingTop: 10,
    },
    filtersWrapper: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    holdingsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    actionIconButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    viewModeToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 36,
        borderRadius: 10,
        borderWidth: 1,
        gap: 6,
    },
    viewModeText: {
        fontSize: 13,
        fontWeight: '500',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    companyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    itemLeft: {
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconLetter: {
        fontSize: 18,
        fontWeight: '500',
    },
    infoCol: {
        flex: 1,
    },
    companyName: {
        fontSize: 15,
        fontWeight: '500',
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
});
