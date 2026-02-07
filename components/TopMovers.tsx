import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Activity, ArrowDownRight, ArrowUpRight, Plus } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TopMovers() {
    const router = useRouter();
    const getHoldingsData = usePortfolioStore((state) => state.getHoldingsData);
    const transactions = usePortfolioStore((state) => state.transactions);
    const tickers = usePortfolioStore((state) => state.tickers);
    const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

    const theme = useColorScheme() ?? 'dark';
    const currColors = Colors[theme];

    const movers = useMemo(() => {
        const holdings = getHoldingsData();

        if (!transactions || transactions.length === 0) {
            return [
                {
                    id: 'welcome',
                    type: 'insight',
                    label: 'Start Investing',
                    symbol: '👋',
                    value: 'N/A',
                    isProfit: true,
                    route: '/add-transaction'
                },
                {
                    id: 'add',
                    type: 'action',
                    label: 'Add Trade',
                    symbol: '+',
                    value: 'New',
                    isProfit: true,
                    route: '/add-transaction'
                }
            ];
        }

        const items: any[] = [];

        // Sort by absolute day change percentage to find top movers (gainers or losers)
        const performers = [...holdings]
            .sort((a, b) => Math.abs(b.dayChangePercentage || 0) - Math.abs(a.dayChangePercentage || 0))
            .slice(0, 8);

        performers.forEach(h => {
            const isProfit = (h.dayChangePercentage || 0) >= 0;
            items.push({
                id: h.symbol,
                type: 'stock',
                label: h.companyName || h.symbol,
                symbol: h.symbol,
                value: `${isProfit ? '+' : ''}${(h.dayChangePercentage || 0).toFixed(2)}%`,
                price: `${showCurrencySymbol ? '₹' : ''}${h.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
                isProfit,
                route: `/stock-details/${h.symbol}`
            });
        });

        if (items.length === 0 && transactions.length > 0) {
            items.push({
                id: 'history',
                type: 'insight',
                label: 'Portfolio Analysis',
                symbol: 'AVG',
                value: 'View',
                price: 'Analytics',
                isProfit: true,
                route: '/(tabs)/analytics'
            });
        }

        return items;
    }, [getHoldingsData, transactions, tickers, showCurrencySymbol]);

    return (
        <View style={styles.container}>
            <Text style={[styles.sectionTitle, { color: currColors.textSecondary }]}>TOP MOVERS</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                decelerationRate="fast"
            >
                {movers.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        style={[styles.card, { backgroundColor: currColors.card, borderColor: currColors.border }]}
                        activeOpacity={0.7}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.push(item.route as any);
                        }}
                    >
                        <View style={styles.cardHeader}>
                            <View style={[styles.iconContainer, { backgroundColor: currColors.cardSecondary }]}>
                                {item.type === 'action' ? (
                                    <Plus size={16} color={currColors.tint} />
                                ) : item.type === 'insight' ? (
                                    <Activity size={16} color={currColors.tint} />
                                ) : (
                                    <Text style={[styles.symbolText, { color: currColors.text }]}>{item.label.substring(0, 2).toUpperCase()}</Text>
                                )}
                            </View>
                            <View style={[styles.badge, { backgroundColor: item.isProfit ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)' }]}>
                                {item.type === 'stock' ? (
                                    item.isProfit ?
                                        <ArrowUpRight size={12} color="#34C759" /> :
                                        <ArrowDownRight size={12} color="#FF3B30" />
                                ) : null}
                                <Text style={[styles.badgeText, { color: item.isProfit ? '#34C759' : '#FF3B30' }]}>
                                    {item.value}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.cardFooter}>
                            <Text style={[styles.symbolName, { color: currColors.text }]} numberOfLines={1}>{item.label}</Text>
                            {item.price && (
                                <Text style={[styles.priceText, { color: currColors.textSecondary }]}>{item.price}</Text>
                            )}
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
        marginHorizontal: -16,
    },
    sectionTitle: {
        color: '#8E8E93',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 12,
        marginLeft: 16,
    },
    listContent: {
        paddingHorizontal: 16,
        gap: 12,
    },
    card: {
        width: 140,
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        justifyContent: 'space-between',
        height: 100,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    symbolText: {
        fontSize: 12,
        fontWeight: '600',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 2,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '500',
    },
    cardFooter: {
        gap: 2,
    },
    symbolName: {
        fontSize: 14,
        fontWeight: '500',
    },
    priceText: {
        fontSize: 12,
    }
});
