import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { TrendingDown, TrendingUp } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';

interface SummaryCardProps {
  label: string;
  value: string;
  trend?: number;
  prefix?: string;
}

export const SummaryCard = ({
  label,
  value,
  trend,
  prefix = '$',
}: SummaryCardProps) => {
  const isPositive = trend !== undefined && trend >= 0;
  const isPercentage = label.includes('%') || label === 'XIRR';

  const theme = useColorScheme() ?? 'dark';
  const currColors = Colors[theme];
  const showCurrencySymbol = usePortfolioStore(
    (state) => state.showCurrencySymbol,
  );

  return (
    <View style={[styles.card, { backgroundColor: currColors.card }]}>
      <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>
        {label}
      </ThemedText>
      <ThemedText style={[styles.value, { color: currColors.text }]}>
        {isPercentage ? '' : showCurrencySymbol ? '₹' : ''}
        {value}
        {isPercentage ? '%' : ''}
      </ThemedText>
      {trend !== undefined && (
        <View style={styles.trendContainer}>
          {isPositive ? (
            <TrendingUp size={14} color="#4CAF50" />
          ) : (
            <TrendingDown size={14} color="#F44336" />
          )}
          <ThemedText
            style={[
              styles.trendText,
              { color: isPositive ? '#4CAF50' : '#F44336' },
            ]}
          >
            {Math.abs(trend).toFixed(1)}%
          </ThemedText>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    marginBottom: 8,
  },
  value: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
