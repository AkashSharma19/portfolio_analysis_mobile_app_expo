import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { useRouter } from 'expo-router';
import { TrendingUp } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MonthlyAnalysisScreen() {
    const router = useRouter();
    const transactions = usePortfolioStore((state) => state.transactions);
    const tickers = usePortfolioStore((state) => state.tickers);
    const getMonthlyAnalysis = usePortfolioStore((state) => state.getMonthlyAnalysis);
    const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
    const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

    const colorScheme = useColorScheme() ?? 'dark';
    const currColors = Colors[colorScheme];

    const monthlyAnalysis = useMemo(() => getMonthlyAnalysis(), [transactions, getMonthlyAnalysis, tickers]);

    return (
        <SafeAreaView style={[styles.modalSafeArea, { backgroundColor: currColors.card }]}>
            <View style={[styles.modalHeader, { backgroundColor: currColors.card, borderBottomColor: currColors.border }]}>
                <Text style={[styles.modalTitle, { color: currColors.text }]}>Monthly Analysis</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                    <Text style={[styles.closeButtonText, { color: currColors.tint }]}>Done</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={monthlyAnalysis}
                keyExtractor={(item) => item.monthKey}
                contentContainerStyle={[styles.modalList, { backgroundColor: currColors.card }]}
                showsVerticalScrollIndicator={false}
                renderItem={({ item, index }) => (
                    <View style={[
                        styles.monthlyItem,
                        {
                            paddingHorizontal: 16,
                            backgroundColor: currColors.card,
                            borderBottomColor: currColors.border
                        },
                        index === monthlyAnalysis.length - 1 && { borderBottomWidth: 0 }
                    ]}>
                        <View style={styles.headerLeft}>
                            <Text style={[styles.monthText, { color: currColors.text }]}>{item.month}</Text>
                            <Text style={[styles.subText, { color: currColors.textSecondary }]}>Invested: {isPrivacyMode ? '****' : `${showCurrencySymbol ? '₹' : ''}${item.investment.toLocaleString(undefined, { maximumFractionDigits: 0, notation: "compact", compactDisplay: "short" })}`}</Text>
                        </View>
                        {item.percentageIncrease !== 0 && (
                            <View style={[styles.growthBadge, { backgroundColor: item.percentageIncrease >= 0 ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)' }]}>
                                <TrendingUp size={12} color={item.percentageIncrease >= 0 ? '#4CAF50' : '#F44336'} style={{ transform: [{ rotate: item.percentageIncrease >= 0 ? '0deg' : '180deg' }] }} />
                                <Text style={[styles.growthText, { color: item.percentageIncrease >= 0 ? '#4CAF50' : '#F44336' }]}>
                                    {Math.abs(item.percentageIncrease).toFixed(1)}%
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    modalSafeArea: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '400',
    },
    closeButton: {
        padding: 8,
    },
    closeButtonText: {
        fontSize: 17,
        fontWeight: '400',
    },
    monthlyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    monthText: {
        fontSize: 14,
        fontWeight: '400',
        marginBottom: 2,
    },
    headerLeft: {
        justifyContent: 'center',
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
        marginRight: 4,
    },
    growthText: {
        fontSize: 10,
        fontWeight: '400',
        marginLeft: 4,
    },
    modalList: {
        paddingBottom: 40,
    },
});
