import { usePortfolioStore } from '@/store/usePortfolioStore';
import { LinearGradient } from 'expo-linear-gradient';
import { Briefcase, Building2, PieChart as ChartIcon, Layers } from 'lucide-react-native';
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
    const fetchTickers = usePortfolioStore((state) => state.fetchTickers);
    const getAllocationData = usePortfolioStore((state) => state.getAllocationData);
    const transactions = usePortfolioStore((state) => state.transactions);
    const tickers = usePortfolioStore((state) => state.tickers);

    const [refreshing, setRefreshing] = useState(false);
    const [selectedDimension, setSelectedDimension] = useState<Dimension>('Sector');

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

    const chartData = useMemo(() => {
        return allocation.map((item, index) => ({
            value: item.percentage,
            color: CHART_COLORS[index % CHART_COLORS.length],
            text: `${item.percentage.toFixed(1)}%`,
            label: item.name,
        }));
    }, [allocation]);

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

    const dimensions: { id: Dimension; label: string; icon: React.ReactNode }[] = [
        { id: 'Sector', label: 'Sector', icon: <Layers size={14} color="currentColor" /> },
        { id: 'Company Name', label: 'Company', icon: <Building2 size={14} color="currentColor" /> },
        { id: 'Asset Type', label: 'Asset Type', icon: <Briefcase size={14} color="currentColor" /> },
        { id: 'Broker', label: 'Broker', icon: <ChartIcon size={14} color="currentColor" /> },
    ];

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <View style={styles.container}>
                <View style={styles.selectorBar}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorScroll}>
                        {dimensions.map((dim) => {
                            const isActive = selectedDimension === dim.id;
                            return (
                                <TouchableOpacity
                                    key={dim.id}
                                    style={[styles.selectorButton, isActive && styles.selectorButtonActive]}
                                    onPress={() => setSelectedDimension(dim.id)}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={{ color: isActive ? '#FFF' : '#8E8E93' }}>{dim.icon}</Text>
                                        <Text style={[styles.selectorText, isActive && styles.selectorTextActive]}>
                                            {dim.label}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />
                    }
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
                                            <Text style={{ fontSize: 28, color: 'white', fontWeight: 'bold' }}>
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

                    <View style={styles.listContainer}>
                        <Text style={styles.listTitle}>Portfolio Spread</Text>
                        {allocation.map((item, index) => (
                            <TouchableOpacity key={item.name} style={styles.listItemShadow}>
                                <LinearGradient
                                    colors={['#1C1C1E', '#161618']}
                                    style={styles.listItem}
                                >
                                    <View style={styles.itemHeader}>
                                        <View style={styles.listLeft}>
                                            <View
                                                style={[
                                                    styles.colorDot,
                                                    { backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }
                                                ]}
                                            />
                                            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                                        </View>
                                        <Text style={styles.itemValue}>
                                            ₹{item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </Text>
                                    </View>

                                    <View style={styles.progressContainer}>
                                        <View style={styles.progressBarBg}>
                                            <View
                                                style={[
                                                    styles.progressBarFill,
                                                    {
                                                        width: `${item.percentage}%`,
                                                        backgroundColor: CHART_COLORS[index % CHART_COLORS.length]
                                                    }
                                                ]}
                                            />
                                        </View>
                                        <Text style={styles.itemPercentage}>{item.percentage.toFixed(1)}%</Text>
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        ))}
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
        backgroundColor: '#000',
        borderBottomWidth: 1,
        borderBottomColor: '#1C1C1E',
    },
    selectorScroll: {
        paddingHorizontal: 16,
        gap: 8,
    },
    selectorButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#1C1C1E',
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    selectorButtonActive: {
        backgroundColor: '#007AFF',
        borderColor: '#0A84FF',
    },
    selectorText: {
        color: '#8E8E93',
        fontSize: 13,
        fontWeight: '600',
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
        fontSize: 16,
        fontWeight: '700',
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
        fontSize: 14,
    },
    listContainer: {
        gap: 12,
    },
    listTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFF',
        marginBottom: 8,
        marginLeft: 4,
    },
    listItemShadow: {
        borderRadius: 16,
        backgroundColor: '#1C1C1E',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    listItem: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    listLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    colorDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 10,
    },
    itemName: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
    },
    itemValue: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    progressBarBg: {
        flex: 1,
        height: 6,
        backgroundColor: '#2C2C2E',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    itemPercentage: {
        color: '#8E8E93',
        fontSize: 13,
        fontWeight: '600',
        width: 45,
        textAlign: 'right',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptySubtext: {
        color: '#8E8E93',
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
});
