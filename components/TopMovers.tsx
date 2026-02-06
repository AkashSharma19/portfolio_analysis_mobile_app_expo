import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import * as Haptics from 'expo-haptics';
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

    const theme = useColorScheme() ?? 'dark';
    const currColors = Colors[theme];

    const stories = useMemo(() => {
        const holdings = getHoldingsData();

        // 1. Welcome Story (Always first if empty)
        if (!transactions || transactions.length === 0) {
            return [
                { id: 'welcome', type: 'insight', label: 'Welcome', symbol: 'HAY', color: ['#00C6FF', '#0072FF'], shadowColor: '#0072FF', route: '/(tabs)/profile' },
                { id: 'add', type: 'action', label: 'Add Trade', symbol: '+', color: ['#34C759', '#30D158'], shadowColor: '#34C759', route: '/add-transaction' }
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
                color: isProfit ? ['#34C759', '#30D158'] : ['#FF3B30', '#FF453A'],
                shadowColor: isProfit ? '#34C759' : '#FF3B30',
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
                color: ['#5856D6', '#AF52DE'],
                shadowColor: '#5856D6',
                route: '/(tabs)/analytics'
            });
            items.push({
                id: 'add_more',
                type: 'action',
                label: 'Add New',
                symbol: '+',
                color: ['#007AFF', '#004080'],
                shadowColor: '#007AFF',
                route: '/add-transaction'
            });
        }

        return items;
    }, [getHoldingsData, transactions, tickers]);

    return (
        <View style={styles.container}>
            <Text style={[styles.sectionTitle, { color: currColors.textSecondary }]}>TOP MOVERS</Text>
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
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.push(item.route as any);
                        }}
                    >
                        <View style={[styles.glowContainer, { shadowColor: item.shadowColor, shadowOpacity: theme === 'light' ? 0.3 : 0.6 }]}>
                            <LinearGradient
                                colors={item.color as any}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.storyRing}
                            >
                                <View style={[styles.storyInner, { backgroundColor: currColors.card, borderColor: currColors.card }]}>
                                    <Text style={[styles.symbolText, { color: currColors.text }]}>{item.symbol}</Text>
                                </View>
                            </LinearGradient>
                            {item.value && (
                                <View style={[styles.badge, { backgroundColor: item.color[0], borderColor: currColors.card }]}>
                                    <Text style={styles.badgeText}>{item.value}</Text>
                                </View>
                            )}
                        </View>

                        <Text style={[styles.labelText, { color: currColors.textSecondary }]} numberOfLines={1}>{item.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 16,
        paddingBottom: 4,
        marginHorizontal: -16,
    },
    sectionTitle: {
        color: '#8E8E93',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 12,
        marginLeft: 16, // Match list content padding
    },
    listContent: {
        paddingHorizontal: 16,
        paddingVertical: 12, // Add space for shadow/glow
        gap: 8,
    },
    storyWrapper: {
        alignItems: 'center',
        width: 72,
    },
    glowContainer: {
        width: 60,
        height: 60,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        marginBottom: 8,
        elevation: 5,
    },
    storyRing: {
        width: 60,
        height: 60,
        borderRadius: 30,
        padding: 2.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    storyInner: {
        width: '100%',
        height: '100%',
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    symbolText: {
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    badge: {
        position: 'absolute',
        bottom: -4,
        alignSelf: 'center',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderWidth: 2,
        zIndex: 10,
        minWidth: 40,
        alignItems: 'center',
    },
    badgeText: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: '800',
    },
    labelText: {
        fontSize: 10,
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 2,
        width: 72,
    },
});
