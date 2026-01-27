import { usePortfolioStore } from '@/store/usePortfolioStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function TopMovers() {
    const router = useRouter();
    const getHoldingsData = usePortfolioStore((state) => state.getHoldingsData);
    const transactions = usePortfolioStore((state) => state.transactions);
    const tickers = usePortfolioStore((state) => state.tickers);
    const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);

    const stories = useMemo(() => {
        const holdings = getHoldingsData();

        // 1. Welcome Story (Always first if empty)
        if (!transactions || transactions.length === 0) {
            return [
                { id: 'welcome', type: 'insight', label: 'Welcome', symbol: 'HAY', color: ['#007AFF', '#004080'], route: '/(tabs)/profile' },
                { id: 'add', type: 'action', label: 'Add Trade', symbol: '+', color: ['#30D158', '#15803d'], route: '/add-transaction' }
            ];
        }

        const items: any[] = [];

        // 2. Performance Stories
        const performers = [...holdings]
            .sort((a, b) => Math.abs(b.dayChangePercentage || 0) - Math.abs(a.dayChangePercentage || 0))
            .slice(0, 8);

        performers.forEach(h => {
            const isProfit = (h.dayChangePercentage || 0) >= 0;
            items.push({
                id: h.symbol,
                type: 'stock',
                label: h.companyName || h.symbol,
                symbol: (h.companyName || h.symbol).substring(0, 3).toUpperCase(),
                value: `${isProfit ? '+' : ''}${(h.dayChangePercentage || 0).toFixed(1)}%`,
                color: isProfit ? ['#30D158', '#15803d'] : ['#FF453A', '#991B1B'],
                route: `/stock-details/${h.symbol}`
            });
        });

        // 3. If no holdings (all sold), show history insights
        if (items.length === 0 && transactions.length > 0) {
            items.push({
                id: 'history',
                type: 'insight',
                label: 'Analysis',
                symbol: '📊',
                color: ['#5E5CE6', '#2E2A85'],
                route: '/(tabs)/analytics'
            });
            items.push({
                id: 'add_more',
                type: 'action',
                label: 'Add New',
                symbol: '+',
                color: ['#007AFF', '#004080'],
                route: '/add-transaction'
            });
        }

        return items;
    }, [getHoldingsData, transactions, tickers]);

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>TOP PERFORMERS</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                decelerationRate="fast"
            >
                {stories.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        style={styles.storyWrapper}
                        activeOpacity={0.7}
                        onPress={() => router.push(item.route as any)}
                    >
                        <LinearGradient
                            colors={item.color as any}
                            style={styles.storyRing}
                        >
                            <View style={styles.storyInner}>
                                <Text style={styles.symbolText}>{item.symbol}</Text>
                            </View>
                        </LinearGradient>

                        {item.value && (
                            <View style={[styles.badge, { backgroundColor: item.color[0] }]}>
                                <Text style={styles.badgeText}>{item.value}</Text>
                            </View>
                        )}

                        <Text style={styles.labelText} numberOfLines={1}>{item.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 12,
        paddingBottom: 4,
    },
    sectionTitle: {
        color: '#8E8E93',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    listContent: {
        paddingRight: 24,
        gap: 18,
    },
    storyWrapper: {
        alignItems: 'center',
        width: 72,
    },
    storyRing: {
        width: 68,
        height: 68,
        borderRadius: 34,
        padding: 2.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    storyInner: {
        backgroundColor: '#000',
        width: '100%',
        height: '100%',
        borderRadius: 34,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#000',
    },
    symbolText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    badge: {
        position: 'absolute',
        top: 50,
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderWidth: 2,
        borderColor: '#000',
        zIndex: 10,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: '800',
    },
    labelText: {
        color: '#EBEBF599',
        fontSize: 10,
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 2,
    },
});
