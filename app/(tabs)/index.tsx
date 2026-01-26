import { ActivityCalendar } from '@/components/ActivityCalendar';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { ArrowRight, ChevronDown, Eye, EyeOff, TrendingUp } from 'lucide-react-native';
import React, { useEffect, useMemo } from 'react';
import { FlatList, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const getMonthlyAnalysis = usePortfolioStore((state) => state.getMonthlyAnalysis);
  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const togglePrivacyMode = usePortfolioStore((state) => state.togglePrivacyMode);

  const summary = useMemo(() => calculateSummary(), [transactions, calculateSummary, tickers]);
  const yearlyAnalysis = useMemo(() => getYearlyAnalysis(), [transactions, getYearlyAnalysis, tickers]);
  const monthlyAnalysis = useMemo(() => getMonthlyAnalysis(), [transactions, getMonthlyAnalysis, tickers]);

  const previewMonthlyAnalysis = useMemo(() => monthlyAnalysis.slice(0, 6), [monthlyAnalysis]);

  useEffect(() => {
    fetchTickers();
    // Auto refresh every 5 minutes
    const interval = setInterval(fetchTickers, 300000);
    return () => clearInterval(interval);
  }, []);

  const [refreshing, setRefreshing] = React.useState(false);
  const [expandedYear, setExpandedYear] = React.useState<number | null>(null);
  const [showMonthlyModal, setShowMonthlyModal] = React.useState(false);

  const toggleYear = (year: number) => {
    setExpandedYear(expandedYear === year ? null : year);
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchTickers();
    setRefreshing(false);
  }, [fetchTickers]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.heroCard}>
              <View style={styles.heroHeaderRow}>
                <Text style={styles.heroLabel}>HOLDINGS ({tickers.length})</Text>
                <TouchableOpacity onPress={togglePrivacyMode} style={styles.iconButton}>
                  {isPrivacyMode ? <EyeOff size={16} color="#FFF" /> : <Eye size={16} color="#FFF" />}
                </TouchableOpacity>
              </View>

              <Text style={styles.heroValue}>{isPrivacyMode ? '****' : `₹${summary.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}</Text>

              <View style={styles.dashedDivider} />

              <View style={styles.heroRow}>
                <Text style={styles.heroRowLabel}>Total returns</Text>
                <Text style={[styles.heroRowValue, { color: isPrivacyMode ? '#FFF' : (summary.profitAmount >= 0 ? '#4CAF50' : '#F44336') }]}>
                  {isPrivacyMode ? '****' : `${summary.profitAmount >= 0 ? '+' : '-'}₹${Math.abs(summary.profitAmount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} (${Math.abs(summary.profitPercentage).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%)`}
                </Text>
              </View>

              <View style={styles.heroRow}>
                <Text style={styles.heroRowLabel}>Invested</Text>
                <Text style={styles.heroRowValueWhite}>{isPrivacyMode ? '****' : `₹${summary.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}</Text>
              </View>

              <View style={[styles.heroRow, { marginBottom: 0 }]}>
                <Text style={styles.heroRowLabel}>XIRR</Text>
                <Text style={styles.heroRowValueWhite}>{isPrivacyMode ? '****' : `${summary.xirr.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`}</Text>
              </View>
            </View>
          </View>



          <View style={styles.section}>
            <ActivityCalendar transactions={transactions} />
          </View>



          <View style={[styles.section, { marginBottom: 20 }]}>
            {yearlyAnalysis.length > 0 ? (
              <View style={styles.accordionContainer}>
                <Text style={styles.innerSectionTitle}>YEARLY ANALYSIS</Text>
                {yearlyAnalysis.map((item, index) => {
                  const isExpanded = expandedYear === item.year;
                  return (
                    <View key={item.year} style={styles.accordionItem}>
                      <TouchableOpacity
                        style={[styles.accordionHeader, isExpanded && styles.accordionHeaderActive]}
                        onPress={() => toggleYear(item.year)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.headerLeft}>
                          <Text style={styles.yearText}>{item.year}</Text>
                          <Text style={styles.subText}>Avg. Inv: {isPrivacyMode ? '****' : `₹${item.averageMonthlyInvestment.toLocaleString(undefined, { maximumFractionDigits: 0, notation: "compact", compactDisplay: "short" })}`}</Text>
                        </View>

                        <View style={styles.headerRight}>
                          {item.percentageIncrease !== 0 && (
                            <View style={[styles.growthBadge, { backgroundColor: item.percentageIncrease >= 0 ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)' }]}>
                              <TrendingUp size={12} color={item.percentageIncrease >= 0 ? '#4CAF50' : '#F44336'} style={{ transform: [{ rotate: item.percentageIncrease >= 0 ? '0deg' : '180deg' }] }} />
                              <Text style={[styles.growthText, { color: item.percentageIncrease >= 0 ? '#4CAF50' : '#F44336' }]}>
                                {Math.abs(item.percentageIncrease).toFixed(1)}%
                              </Text>
                            </View>
                          )}
                          <View style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }], marginLeft: 8 }}>
                            <ChevronDown size={20} color="#666" />
                          </View>
                        </View>
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={styles.accordionBody}>
                          <View style={styles.separator} />
                          <View style={styles.assetsGrid}>
                            {item.assetDistribution.map((asset, i) => (
                              <View key={i} style={styles.assetItem}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <View style={[styles.dot, { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }]} />
                                  <Text style={styles.assetName} numberOfLines={1}>{asset.name}</Text>
                                </View>
                                <Text style={styles.assetValue}>{isPrivacyMode ? '****' : `₹${asset.value.toLocaleString(undefined, { maximumFractionDigits: 0, notation: "compact", compactDisplay: "short" })}`}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.placeholderText}>Not enough data for yearly analysis</Text>
              </View>
            )}
          </View>

          {/* Monthly Analysis Section */}
          <View style={[styles.section, { marginBottom: 40 }]}>
            {monthlyAnalysis.length > 0 ? (
              <View style={styles.accordionContainer}>
                <View style={[styles.headerWithAction]}>
                  <Text style={styles.innerSectionTitle}>MONTHLY ANALYSIS</Text>
                  {monthlyAnalysis.length > 6 && (
                    <TouchableOpacity onPress={() => setShowMonthlyModal(true)} style={styles.viewMoreButton}>
                      <View style={styles.iconCircle}>
                        <ArrowRight size={14} color="#007AFF" />
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
                {previewMonthlyAnalysis.map((item, index) => (
                  <View key={item.monthKey} style={[styles.monthlyItem, index === previewMonthlyAnalysis.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={styles.headerLeft}>
                      <Text style={styles.monthText}>{item.month}</Text>
                      <Text style={styles.subText}>Invested: {isPrivacyMode ? '****' : `₹${item.investment.toLocaleString(undefined, { maximumFractionDigits: 0, notation: "compact", compactDisplay: "short" })}`}</Text>
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
                ))}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.placeholderText}>Not enough data for monthly analysis</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* FULL LIST MODAL */}
        <Modal
          visible={showMonthlyModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowMonthlyModal(false)}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Monthly Analysis</Text>
              <TouchableOpacity onPress={() => setShowMonthlyModal(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={monthlyAnalysis}
              keyExtractor={(item) => item.monthKey}
              contentContainerStyle={styles.modalList}
              renderItem={({ item, index }) => (
                <View style={[styles.monthlyItem, { paddingHorizontal: 20 }, index === monthlyAnalysis.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={styles.headerLeft}>
                    <Text style={styles.monthText}>{item.month}</Text>
                    <Text style={styles.subText}>Invested: {isPrivacyMode ? '****' : `₹${item.investment.toLocaleString(undefined, { maximumFractionDigits: 0, notation: "compact", compactDisplay: "short" })}`}</Text>
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
        </Modal>
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
    backgroundColor: '#000',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#000',
  },
  header: {
    marginTop: 10,
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  heroCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  heroLabel: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroValue: {
    fontSize: 24,
    fontWeight: '400',
    color: '#FFF',
    marginBottom: 16,
  },
  dashedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
    borderRadius: 1,
    marginBottom: 16,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroRowLabel: {
    color: '#8E8E93',
    fontSize: 14,
  },
  heroRowValue: {
    fontSize: 14,
    fontWeight: '400',
  },
  heroRowValueWhite: {
    fontSize: 14,
    fontWeight: '400',
    color: '#FFF',
  },

  section: {
    marginTop: 0,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '400',
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

  // Accordion Styles
  accordionContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    paddingTop: 16,
  },
  innerSectionTitle: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '400',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 16,
  },
  headerWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
    marginBottom: 12,
  },
  viewMoreButton: {
    padding: 2,
    marginBottom: 8,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accordionItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1C1C1E',
  },
  accordionHeaderActive: {
    backgroundColor: '#222',
  },
  headerLeft: {
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  yearText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 2,
  },
  subText: {
    color: '#8E8E93',
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
  chevron: {
    // Chevron icon could be replaced with Lucide's ChevronDown
    // For now we do a simple rotation animation wrapper in JSX
  },
  accordionBody: {
    backgroundColor: '#151515',
    padding: 16,
    paddingTop: 0,
  },
  separator: {
    height: 1,
    backgroundColor: '#2C2C2E',
    marginBottom: 12,
  },
  assetsGrid: {
    gap: 12,
  },
  assetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  assetName: {
    color: '#CCC',
    fontSize: 12,
  },
  assetValue: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '400',
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
  monthlyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  monthText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 2,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '400',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '400',
  },
  modalList: {
    paddingBottom: 40,
  },
});
