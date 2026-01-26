import { usePortfolioStore } from '@/store/usePortfolioStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { default as React, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TopMovers() {
    const router = useRouter();
    const getHoldingsData = usePortfolioStore((state) => state.getHoldingsData);
    const transactions = usePortfolioStore((state) => state.transactions);
    const tickers = usePortfolioStore((state) => state.tickers);
    const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);

    const topMovers = useMemo(() => {
        const holdings = getHoldingsData();
        if (holdings.length === 0) return [];

        // Sort by Daily Change Percentage
        const sorted = [...holdings]
            .sort((a, b) => b.dayChangePercentage - a.dayChangePercentage);

        // Take top 8 performers
        return sorted.slice(0, 8);
    }, [getHoldingsData, transactions, tickers]);

    if (topMovers.length === 0) return null;

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>TOP PERFORMERS</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
            >
                {topMovers.map((item, index) => {
                    const isProfit = item.dayChangePercentage >= 0;
                    return (
                        <TouchableOpacity
                            key={item.symbol}
                            style={styles.storyContainer}
                            onPress={() => router.push(`/stock-details/${item.symbol}`)}
                        >
                            <LinearGradient
                                colors={isProfit ? ['#4CAF50', '#2E7D32'] : ['#F44336', '#B71C1C']}
                                style={styles.ring}
                            >
                                <View style={styles.innerCircle}>
                                    <Text style={styles.symbolText} numberOfLines={1}>{item.companyName.substring(0, 3)}</Text>
                                </View>
                            </LinearGradient>

                            <View style={[styles.badge, { backgroundColor: isProfit ? '#4CAF50' : '#F44336' }]}>
                                <Text style={styles.badgeText}>
                                    {isProfit ? '+' : ''}{item.dayChangePercentage.toFixed(1)}%
                                </Text>
                            </View>

                            <Text style={styles.nameText} numberOfLines={1}>{item.companyName}</Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    sectionTitle: {
        color: '#8E8E93',
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 12,
        marginLeft: 4,
    },
    listContent: {
        paddingRight: 20,
        gap: 16,
    },
    storyContainer: {
        alignItems: 'center',
        width: 64,
    },
    ring: {
        width: 60,
        height: 60,
        borderRadius: 30,
        padding: 2, // Thickness of the ring
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    innerCircle: {
        backgroundColor: '#000',
        width: '100%',
        height: '100%',
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#000', // Gap between ring and content
    },
    symbolText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    badge: {
        position: 'absolute',
        bottom: 24,
        borderRadius: 8,
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderWidth: 1,
        borderColor: '#000',
    },
    badgeText: {
        color: '#FFF',
        fontSize: 8,
        fontWeight: '700',
    },
    nameText: {
        color: '#FFF',
        fontSize: 10,
        marginTop: 4,
        textAlign: 'center',
    },
});
