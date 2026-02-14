import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronDown, TrendingUp } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MonthlyAnalysisScreen() {
    const router = useRouter();
    const transactions = usePortfolioStore((state) => state.transactions);
    const tickers = usePortfolioStore((state) => state.tickers);
    const fetchTickers = usePortfolioStore((state) => state.fetchTickers);
    const getMonthlyAnalysis = usePortfolioStore((state) => state.getMonthlyAnalysis);
    const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
    const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

    const colorScheme = useColorScheme() ?? 'dark';
    const currColors = Colors[colorScheme];

    const monthlyAnalysis = useMemo(() => getMonthlyAnalysis(), [transactions, getMonthlyAnalysis, tickers]);
    const [expandedMonths, setExpandedMonths] = React.useState<Set<string>>(new Set());

    const toggleMonth = (key: string) => {
        setExpandedMonths(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const CHART_COLORS = [
        '#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#FF9500',
        '#FFCC00', '#34C759', '#5AC8FA', '#8E8E93', '#2C2C2E'
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
                    <Text style={[styles.headerTitle, { color: currColors.text }]}>Monthly Analysis</Text>
                    <View style={{ width: 40 }} />
                </View>
                <FlatList
                    data={monthlyAnalysis}
                    keyExtractor={(item) => item.monthKey}
                    contentContainerStyle={[styles.modalList, { backgroundColor: 'transparent' }]}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    renderItem={({ item, index }) => {
                        const isExpanded = expandedMonths.has(item.monthKey);
                        return (
                            <View style={[
                                styles.monthlyItemContainer,
                                { borderBottomColor: currColors.border },
                                index === monthlyAnalysis.length - 1 && { borderBottomWidth: 0 }
                            ]}>
                                <TouchableOpacity
                                    style={[
                                        styles.monthlyHeader,
                                        { backgroundColor: currColors.card },
                                        isExpanded && { backgroundColor: currColors.cardSecondary }
                                    ]}
                                    onPress={() => toggleMonth(item.monthKey)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.headerLeft}>
                                        <Text style={[styles.monthText, { color: currColors.text }]}>{item.month}</Text>
                                        <Text style={[styles.subText, { color: currColors.textSecondary }]}>Invested: {isPrivacyMode ? '****' : `${showCurrencySymbol ? '₹' : ''}${item.investment.toLocaleString(undefined, { maximumFractionDigits: 0, notation: "compact", compactDisplay: "short" })}`}</Text>
                                    </View>
                                    <View style={styles.headerRight}>
                                        {item.percentageIncrease !== 0 && (
                                            <View style={[styles.growthBadge, { backgroundColor: item.percentageIncrease >= 0 ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)' }]}>
                                                <TrendingUp size={12} color={item.percentageIncrease >= 0 ? '#4CAF50' : '#F44336'} style={{ transform: [{ rotate: item.percentageIncrease >= 0 ? '0deg' : '180deg' }] }} />
                                                <Text style={[styles.growthText, { color: item.percentageIncrease >= 0 ? '#4CAF50' : '#F44336' }]}>
                                                    {Math.abs(item.percentageIncrease).toFixed(1)}%
                                                </Text>
                                            </View>
                                        )}
                                        <View style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }], marginLeft: 8 }}>
                                            <ChevronDown size={20} color={currColors.textSecondary} />
                                        </View>
                                    </View>
                                </TouchableOpacity>

                                {isExpanded && (
                                    <View style={[styles.accordionBody, { backgroundColor: currColors.card }]}>
                                        <View style={[styles.separator, { backgroundColor: currColors.border }]} />
                                        <View style={styles.assetsGrid}>
                                            {item.assetDistribution.map((asset, i) => (
                                                <View key={i} style={styles.assetItem}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                        <View style={[styles.dot, { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }]} />
                                                        <Text style={[styles.assetName, { color: currColors.textSecondary }]} numberOfLines={1}>{asset.name}</Text>
                                                    </View>
                                                    <Text style={[styles.assetValue, { color: currColors.text }]}>{isPrivacyMode ? '****' : `${showCurrencySymbol ? '₹' : ''}${asset.value.toLocaleString(undefined, { maximumFractionDigits: 0, notation: "compact", compactDisplay: "short" })}`}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </View>
                        );
                    }}
                />
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '500',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    monthlyItemContainer: {
        borderBottomWidth: 1,
    },
    monthlyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    monthText: {
        fontSize: 14,
        fontWeight: '400',
        marginBottom: 2,
    },
    headerLeft: {
        flex: 1,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    subText: {
        fontSize: 11,
    },
    growthBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    growthText: {
        fontSize: 10,
        fontWeight: '400',
        marginLeft: 4,
    },
    accordionBody: {
        paddingBottom: 16,
    },
    separator: {
        height: 1,
        marginHorizontal: 16,
        marginBottom: 16,
    },
    assetsGrid: {
        paddingHorizontal: 16,
        gap: 12,
    },
    assetItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 8,
    },
    assetName: {
        fontSize: 12,
    },
    assetValue: {
        fontSize: 12,
        fontWeight: '400',
    },
    modalList: {
        paddingBottom: 40,
    },
});
