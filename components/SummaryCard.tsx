import { Text, View } from '@/components/Themed';
import { TrendingDown, TrendingUp } from 'lucide-react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

interface SummaryCardProps {
    label: string;
    value: string;
    trend?: number;
    prefix?: string;
}

export const SummaryCard = ({ label, value, trend, prefix = '$' }: SummaryCardProps) => {
    const isPositive = trend !== undefined && trend >= 0;
    const isZero = trend === 0;
    const isPercentage = label.includes('%') || label === 'XIRR';
    const displayValue = isPercentage ? `${value}%` : `${prefix}${value}`;

    return (
        <View style={styles.card}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{isPercentage ? '' : '₹'}{value}{isPercentage ? '%' : ''}</Text>
            {trend !== undefined && (
                <View style={styles.trendContainer}>
                    {isPositive ? (
                        <TrendingUp size={14} color="#4CAF50" />
                    ) : (
                        <TrendingDown size={14} color="#F44336" />
                    )}
                    <Text style={[styles.trendText, { color: isPositive ? '#4CAF50' : '#F44336' }]}>
                        {Math.abs(trend).toFixed(1)}%
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        padding: 16,
        width: '48%',
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        color: '#8E8E93',
        marginBottom: 8,
    },
    value: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
    },
    trendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 4,
        backgroundColor: 'transparent',
    },
    trendText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
