import { ActivityCalendar } from '@/components/ActivityCalendar';
import { SummaryCard } from '@/components/SummaryCard';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { TrendingUp } from 'lucide-react-native';
import React, { useEffect, useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CHART_COLORS = [
  '#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#FF9500',
  '#FFCC00', '#34C759', '#5AC8FA', '#8E8E93', '#2C2C2E'
];

export default function PortfolioScreen() {
  const transactions = usePortfolioStore((state) => state.transactions);
  const calculateSummary = usePortfolioStore((state) => state.calculateSummary);
  const fetchTickers = usePortfolioStore((state) => state.fetchTickers);
  const tickers = usePortfolioStore((state) => state.tickers);
  const getYearlyAnalysis = usePortfolioStore((state) => state.getYearlyAnalysis);

  const summary = useMemo(() => calculateSummary(), [transactions, calculateSummary, tickers]);
  const yearlyAnalysis = useMemo(() => getYearlyAnalysis(), [transactions, getYearlyAnalysis, tickers]);

  useEffect(() => {
    fetchTickers();
    // Auto refresh every 5 minutes
    const interval = setInterval(fetchTickers, 300000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
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

          <View style={[styles.section, { marginBottom: 20 }]}>
            <Text style={styles.sectionTitle}>Yearly Analysis</Text>
            {yearlyAnalysis.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearlyScroll}>
                {yearlyAnalysis.map((item, index) => (
                  <View key={item.year} style={styles.yearlyCard}>
                    <Text style={styles.yearlyYear}>{item.year}</Text>
                    <View style={styles.yearlyRow}>
                      <View style={{ backgroundColor: 'transparent' }}>
                        <Text style={styles.yearlyLabel}>Investment</Text>
                        <Text style={styles.yearlyValue}>₹{item.investment.toLocaleString('en-IN')}</Text>
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

                    <View style={styles.divider} />

                    <Text style={styles.yearlyLabel}>Distribution</Text>
                    <View style={styles.distributionContainer}>
                      {item.assetDistribution.slice(0, 3).map((asset, i) => (
                        <View key={i} style={styles.distributionItem}>
                          <View style={styles.distributionHeader}>
                            <Text style={styles.assetName} numberOfLines={1}>{asset.name}</Text>
                            <Text style={styles.assetPercentage}>{asset.percentage.toFixed(0)}%</Text>
                          </View>
                          <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${asset.percentage}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }]} />
                          </View>
                        </View>
                      ))}
                      {item.assetDistribution.length > 3 && (
                        <Text style={styles.moreAssetsText}>+ {item.assetDistribution.length - 3} more assets</Text>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.placeholderText}>Not enough data for yearly analysis</Text>
              </View>
            )}
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
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
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
  yearlyScroll: {
    paddingBottom: 10,
  },
  yearlyCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    width: 260,
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  yearlyYear: {
    fontSize: 24,
    fontWeight: '800',
    color: '#007AFF',
    marginBottom: 12,
  },
  yearlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
    marginBottom: 12,
  },
  yearlyLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  yearlyValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  growthText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 12,
  },
  distributionContainer: {
    backgroundColor: 'transparent',
  },
  distributionItem: {
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  distributionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  assetName: {
    fontSize: 13,
    color: '#FFF',
    flex: 1,
    marginRight: 8,
  },
  assetPercentage: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#2C2C2E',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  moreAssetsText: {
    fontSize: 12,
    color: '#444',
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyCard: {
    height: 150,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
});
