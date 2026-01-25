import { ActivityCalendar } from '@/components/ActivityCalendar';
import { SummaryCard } from '@/components/SummaryCard';
import { Text, View } from '@/components/Themed';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import React, { useEffect, useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';

export default function PortfolioScreen() {
  const transactions = usePortfolioStore((state) => state.transactions);
  const calculateSummary = usePortfolioStore((state) => state.calculateSummary);
  const fetchTickers = usePortfolioStore((state) => state.fetchTickers);
  const tickers = usePortfolioStore((state) => state.tickers);

  const summary = useMemo(() => calculateSummary(), [transactions, calculateSummary, tickers]);

  useEffect(() => {
    fetchTickers();
    // Auto refresh every 5 minutes
    const interval = setInterval(fetchTickers, 300000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={false} onRefresh={fetchTickers} tintColor="#FFF" />}
      >
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'transparent' }}>
            <Text style={styles.greeting}>Net worth</Text>
            {tickers.length > 0 && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
          </View>
          <Text style={styles.totalValue}>₹{summary.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          <View style={styles.overallReturnContainer}>
            <Text style={[styles.overallReturnText, { color: summary.profitAmount >= 0 ? '#4CAF50' : '#F44336' }]}>
              {summary.profitAmount >= 0 ? '+' : ''}₹{Math.abs(summary.profitAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              ({summary.profitAmount >= 0 ? '+' : ''}{summary.profitPercentage.toFixed(2)}%)
            </Text>
            <Text style={styles.returnLabel}> all time</Text>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <SummaryCard
            label="Total Balance"
            value={summary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            prefix="₹"
          />
          <SummaryCard
            label="Total Return"
            value={summary.totalReturn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            trend={summary.profitPercentage}
            prefix="₹"
          />
          <SummaryCard
            label="Profit/Loss %"
            value={summary.profitPercentage.toFixed(2)}
            prefix=""
            trend={summary.profitPercentage}
          />
          <SummaryCard
            label="XIRR"
            value={summary.xirr.toFixed(2)}
            prefix=""
            trend={summary.xirr}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <ActivityCalendar transactions={transactions} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance</Text>
          <View style={styles.chartPlaceholder}>
            <Text style={styles.placeholderText}>Historical performance chart</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    backgroundColor: '#000',
  },
  header: {
    marginTop: 10,
    marginBottom: 30,
    backgroundColor: 'transparent',
  },
  greeting: {
    fontSize: 14,
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  totalValue: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 8,
  },
  overallReturnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  overallReturnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  returnLabel: {
    fontSize: 16,
    color: '#8E8E93',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  section: {
    marginTop: 10,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#FFF',
  },
  chartPlaceholder: {
    height: 180,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: '#444',
    fontSize: 14,
  },
});
