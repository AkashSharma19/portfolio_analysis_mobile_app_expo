import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { calculateProjection } from '@/lib/finance';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { ArrowRight } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ForecastCardProps {
    onPress?: () => void;
    years: number;
    summary: any;
    yearlyAnalysis: any;
}

export const ForecastCard = ({ onPress, years = 20, summary, yearlyAnalysis }: ForecastCardProps) => {
    const theme = useColorScheme() ?? 'dark';
    const currColors = Colors[theme];

    const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);
    const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);

    // Derived values from user data
    const annualReturn = useMemo(() => {
        // Fallback to 12% if XIRR is 0 or negative (conservative)
        return summary.xirr > 0 ? summary.xirr / 100 : 0.12;
    }, [summary.xirr]);

    const monthlySIP = useMemo(() => {
        if (yearlyAnalysis.length === 0) return 0;
        // Get the average monthly investment from the most recent year
        return yearlyAnalysis[0].averageMonthlyInvestment || 0;
    }, [yearlyAnalysis]);

    const projection = useMemo(() => {
        return calculateProjection(summary.totalValue, annualReturn, monthlySIP, years);
    }, [summary.totalValue, annualReturn, monthlySIP, years]);

    const formatValue = (val: number) => {
        return val.toLocaleString('en-IN', {
            maximumFractionDigits: 0,
            notation: "compact",
            compactDisplay: "short"
        });
    };

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={onPress}
            style={[styles.card, { backgroundColor: currColors.card, borderColor: currColors.border }]}
        >
            <View>
                <Text style={[styles.title, { color: currColors.textSecondary }]}>FORECAST ({years}Y)</Text>
                <View style={styles.content}>
                    <View>
                        <Text style={[styles.mainValue, { color: currColors.text }]}>
                            {isPrivacyMode ? '****' : `${showCurrencySymbol ? '₹' : ''}${formatValue(projection.totalFutureValue)}`}
                        </Text>
                        <Text style={[styles.subValue, { color: currColors.textSecondary }]}>
                            Worth {showCurrencySymbol ? '₹' : ''}{formatValue(projection.presentValue)} today
                        </Text>
                    </View>
                    <View style={styles.rightContent}>
                        <View style={[styles.badge, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
                            <Text style={[styles.badgeText, { color: currColors.tint }]}>{projection.multiplier.toFixed(1)}x</Text>
                        </View>
                        <View style={[styles.iconCircle, { backgroundColor: currColors.cardSecondary }]}>
                            <ArrowRight size={14} color={currColors.tint} />
                        </View>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        marginBottom: 24,
    },
    content: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12, // Space between title and content
    },
    title: {
        fontSize: 10,
        fontWeight: '700', // Standardized Section Weight
        letterSpacing: 1, // Tracking wide
        textTransform: 'uppercase', // Uppercase
    },
    rightContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '500',
    },
    mainValue: {
        fontSize: 20,
        fontWeight: '500',
        marginBottom: 2,
    },
    subValue: {
        fontSize: 12,
    },
    iconCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
