import { ActivityCalendar } from '@/components/ActivityCalendar';
import { ForecastCard } from '@/components/ForecastCard';
import ShareableCard from '@/components/ShareableCard';
import TopMovers from '@/components/TopMovers';
import WinLossCard from '@/components/WinLossCard';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { ArrowRight, ChevronDown, Eye, EyeOff, PieChart, Share2, TrendingUp } from 'lucide-react-native';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';

const CHART_COLORS = [
  '#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#FF9500',
  '#FFCC00', '#34C759', '#5AC8FA', '#8E8E93', '#2C2C2E'
];

export default function PortfolioScreen() {
  const router = useRouter();
  const transactions = usePortfolioStore((state) => state.transactions);
  const calculateSummary = usePortfolioStore((state) => state.calculateSummary);
  const fetchTickers = usePortfolioStore((state) => state.fetchTickers);
  const tickers = usePortfolioStore((state) => state.tickers);
  const getYearlyAnalysis = usePortfolioStore((state) => state.getYearlyAnalysis);
  const getMonthlyAnalysis = usePortfolioStore((state) => state.getMonthlyAnalysis);
  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const togglePrivacyMode = usePortfolioStore((state) => state.togglePrivacyMode);
  const getHoldingsData = usePortfolioStore((state) => state.getHoldingsData);
  const userName = usePortfolioStore((state) => state.userName);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);
  const headerLogo = usePortfolioStore((state) => state.headerLogo);
  const headerLink = usePortfolioStore((state) => state.headerLink);

  const theme = useColorScheme() ?? 'dark';
  const currColors = Colors[theme];

  const viewShotRef = useRef<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const summary = useMemo(() => calculateSummary(), [transactions, calculateSummary, tickers]);
  const yearlyAnalysis = useMemo(() => getYearlyAnalysis(), [transactions, getYearlyAnalysis, tickers]);
  const monthlyAnalysis = useMemo(() => getMonthlyAnalysis(), [transactions, getMonthlyAnalysis, tickers]);

  const previewMonthlyAnalysis = useMemo(() => monthlyAnalysis.slice(0, 3), [monthlyAnalysis]);
  const previewYearlyAnalysis = useMemo(() => yearlyAnalysis.slice(0, 3), [yearlyAnalysis]);

  const holdings = useMemo(() => getHoldingsData(), [getHoldingsData, transactions, tickers]);

  useEffect(() => {
    fetchTickers();
    // Auto refresh every 5 minutes
    const interval = setInterval(fetchTickers, 300000);
    return () => clearInterval(interval);
  }, []);

  const [refreshing, setRefreshing] = React.useState(false);
  const [expandedYear, setExpandedYear] = React.useState<number | null>(null);
  const forecastYears = usePortfolioStore((state) => state.forecastYears);

  const toggleYear = (year: number) => {
    setExpandedYear(expandedYear === year ? null : year);
  };

  const onRefresh = React.useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    await fetchTickers();
    setRefreshing(false);
  }, [fetchTickers]);

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isPrivacyMode) {
      Alert.alert('Privacy Mode Active', 'Please disable privacy mode to share your portfolio performance.');
      return;
    }

    try {
      setIsCapturing(true);
      // Give time for the hidden component to render
      setTimeout(async () => {
        if (viewShotRef.current) {
          const uri = await viewShotRef.current.capture();
          await Sharing.shareAsync(uri);
        }
        setIsCapturing(false);
      }, 100);
    } catch (error) {
      console.error('Sharing failed:', error);
      Alert.alert('Error', 'Failed to generate shareable card.');
      setIsCapturing(false);
    }
  };

  const shareData = useMemo(() => {
    const topWinners = [...holdings]
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 5)
      .map(h => ({
        symbol: h.symbol,
        profit: h.pnl
      }));

    const winners = holdings.filter(h => h.pnl >= 0);
    const winRate = holdings.length > 0 ? (winners.length / holdings.length) * 100 : 0;

    return {
      totalValue: summary.totalValue,
      profitAmount: summary.profitAmount,
      profitPercentage: summary.profitPercentage,
      dayChange: summary.dayChange,
      dayChangePercentage: summary.dayChangePercentage,
      xirr: summary.xirr,
      topWinners,
      userName: userName,
      holdingsCount: holdings.length,
      winRate
    };
  }, [summary, holdings, userName]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: currColors.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.container, { backgroundColor: currColors.background }]}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { backgroundColor: currColors.background }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currColors.text} />}
          showsVerticalScrollIndicator={false}
          bounces={true}
          showsHorizontalScrollIndicator={false}
        >
          <View style={styles.header}>
            {headerLogo && (
              <TouchableOpacity
                onPress={async () => {
                  if (headerLink) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    await WebBrowser.openBrowserAsync(headerLink);
                  }
                }}
                activeOpacity={0.7}
                style={[styles.logoContainer, { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 4 }]} // Added background for visibility
              >
                <Image
                  source={{ uri: headerLogo }}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            )}

            <View style={[styles.heroCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
              <View style={styles.heroHeaderRow}>
                <Text style={[styles.heroLabel, { color: currColors.textSecondary }]}>HOLDINGS ({holdings.length})</Text>
                <View style={styles.heroIcons}>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      togglePrivacyMode();
                    }}
                    style={[styles.iconButton, { backgroundColor: currColors.cardSecondary }]}
                  >
                    {isPrivacyMode ? <EyeOff size={16} color={currColors.text} /> : <Eye size={16} color={currColors.text} />}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push('/analytics');
                    }}
                    style={[styles.iconButton, { backgroundColor: currColors.cardSecondary }]}
                  >
                    <PieChart size={16} color={currColors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleShare} style={[styles.iconButton, { backgroundColor: currColors.cardSecondary }]}>
                    <Share2 size={16} color={currColors.text} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={[styles.heroValue, { color: currColors.text }]}>{isPrivacyMode ? '****' : `${showCurrencySymbol ? '₹' : ''}${summary.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}</Text>

              <View style={[styles.dashedDivider, { borderColor: currColors.border }]} />

              <View style={styles.heroRow}>
                <Text style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>1D returns</Text>
                <Text style={[styles.heroRowValue, { color: isPrivacyMode ? currColors.text : (summary.dayChange >= 0 ? '#4CAF50' : '#F44336') }]}>
                  {isPrivacyMode ? '****' : `${summary.dayChange >= 0 ? '+' : '-'}${showCurrencySymbol ? '₹' : ''}${Math.abs(summary.dayChange).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} (${Math.abs(summary.dayChangePercentage).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%)`}
                </Text>
              </View>

              <View style={styles.heroRow}>
                <Text style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>Total returns</Text>
                <Text style={[styles.heroRowValue, { color: isPrivacyMode ? currColors.text : (summary.profitAmount >= 0 ? '#4CAF50' : '#F44336') }]}>
                  {isPrivacyMode ? '****' : `${summary.profitAmount >= 0 ? '+' : '-'}${showCurrencySymbol ? '₹' : ''}${Math.abs(summary.profitAmount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} (${Math.abs(summary.profitPercentage).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%)`}
                </Text>
              </View>

              <View style={styles.heroRow}>
                <Text style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>Realized returns</Text>
                <Text style={[styles.heroRowValue, { color: isPrivacyMode ? currColors.text : (summary.realizedReturn >= 0 ? '#4CAF50' : '#F44336') }]}>
                  {isPrivacyMode ? '****' : `${summary.realizedReturn >= 0 ? '+' : '-'}${showCurrencySymbol ? '₹' : ''}${Math.abs(summary.realizedReturn).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}
                </Text>
              </View>

              <View style={styles.heroRow}>
                <Text style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>Unrealized returns</Text>
                <Text style={[styles.heroRowValue, { color: isPrivacyMode ? currColors.text : (summary.unrealizedReturn >= 0 ? '#4CAF50' : '#F44336') }]}>
                  {isPrivacyMode ? '****' : `${summary.unrealizedReturn >= 0 ? '+' : '-'}${showCurrencySymbol ? '₹' : ''}${Math.abs(summary.unrealizedReturn).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}
                </Text>
              </View>

              <View style={styles.heroRow}>
                <Text style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>Invested</Text>
                <Text style={[styles.heroRowValueWhite, { color: currColors.text }]}>{isPrivacyMode ? '****' : `${showCurrencySymbol ? '₹' : ''}${summary.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}</Text>
              </View>

              <View style={[styles.heroRow, { marginBottom: 0 }]}>
                <Text style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>XIRR</Text>
                <Text style={[styles.heroRowValueWhite, { color: currColors.text }]}>{isPrivacyMode ? '****' : `${summary.xirr.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`}</Text>
              </View>
            </View>
          </View>



          <TopMovers />

          <WinLossCard
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/win-loss-details');
            }}
          />

          <ForecastCard
            years={forecastYears}
            summary={summary}
            yearlyAnalysis={yearlyAnalysis}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/forecast-details');
            }}
          />

          <View style={[styles.section, { marginBottom: 4 }]}>
            <ActivityCalendar transactions={transactions} />
          </View>



          <View style={[styles.section, { marginBottom: 24 }]}>
            {yearlyAnalysis.length > 0 ? (
              <View style={[styles.accordionContainer, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                <View style={[styles.headerWithAction]}>
                  <Text style={[styles.innerSectionTitle, { color: currColors.textSecondary }]}>YEARLY ANALYSIS</Text>
                  {yearlyAnalysis.length > 3 && (
                    <TouchableOpacity onPress={() => router.push('/yearly-analysis')} style={styles.viewMoreButton}>
                      <View style={[styles.iconCircle, { backgroundColor: currColors.cardSecondary }]}>
                        <ArrowRight size={14} color={currColors.tint} />
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
                {previewYearlyAnalysis.map((item, index) => {
                  const isExpanded = expandedYear === item.year;
                  return (
                    <View key={item.year} style={[styles.accordionItem, { borderBottomColor: currColors.border }]}>
                      <TouchableOpacity
                        style={[styles.accordionHeader, { backgroundColor: currColors.card }, isExpanded && { backgroundColor: currColors.cardSecondary }]}
                        onPress={() => toggleYear(item.year)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.headerLeft}>
                          <Text style={[styles.yearText, { color: currColors.text }]}>{item.year}</Text>
                          <Text style={[styles.subText, { color: currColors.textSecondary }]}>Avg. Inv: {isPrivacyMode ? '****' : `${showCurrencySymbol ? '₹' : ''}${item.averageMonthlyInvestment.toLocaleString(undefined, { maximumFractionDigits: 0, notation: "compact", compactDisplay: "short" })}`}</Text>
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
                            <ChevronDown size={20} color={currColors.textSecondary} />
                          </View>
                        </View>
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={[styles.accordionBody, { backgroundColor: currColors.card }]}>
                          <View style={[styles.separator, { backgroundColor: currColors.border }]} />
                          <View style={styles.assetsGrid}>
                            {item.assetDistribution.map((asset, i) => (
                              <View key={i} style={styles.assetItem}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <View style={[styles.dot, { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }]} />
                                  <Text style={[styles.assetName, { color: currColors.textSecondary }]} numberOfLines={1}>{asset.name}</Text>
                                </View>
                                <Text style={[styles.assetValue, { color: currColors.text }]}>{isPrivacyMode ? '****' : `${showCurrencySymbol ? '₹' : ''}${asset.value.toLocaleString(undefined, { maximumFractionDigits: 0, notation: "compact", compactDisplay: "short" })}`}</Text>
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
              <View style={[styles.emptyCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                <Text style={[styles.placeholderText, { color: currColors.textSecondary }]}>Not enough data for yearly analysis</Text>
              </View>
            )}
          </View>

          {/* Monthly Analysis Section */}
          <View style={[styles.section, { marginBottom: 40 }]}>
            {monthlyAnalysis.length > 0 ? (
              <View style={[styles.accordionContainer, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                <View style={[styles.headerWithAction]}>
                  <Text style={[styles.innerSectionTitle, { color: currColors.textSecondary }]}>MONTHLY ANALYSIS</Text>
                  {monthlyAnalysis.length > 3 && (
                    <TouchableOpacity onPress={() => router.push('/monthly-analysis')} style={styles.viewMoreButton}>
                      <View style={[styles.iconCircle, { backgroundColor: currColors.cardSecondary }]}>
                        <ArrowRight size={14} color={currColors.tint} />
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
                {previewMonthlyAnalysis.map((item, index) => (
                  <View key={item.monthKey} style={[styles.monthlyItem, { backgroundColor: currColors.card, borderBottomColor: currColors.border }, index === previewMonthlyAnalysis.length - 1 && { borderBottomWidth: 0 }]}>
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
                ))}
              </View>
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                <Text style={[styles.placeholderText, { color: currColors.textSecondary }]}>Not enough data for monthly analysis</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Hidden ViewShot component for capturing */}
      <View style={styles.hiddenCapture} pointerEvents="none">
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'png', quality: 1.0 }}
        >
          <ShareableCard data={shareData} />
        </ViewShot>
      </View>
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginTop: 0,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    width: '100%',
    height: 60,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  heroLabel: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '700',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroValue: {
    fontSize: 24,
    fontWeight: '400',
    marginBottom: 16,
  },
  dashedDivider: {
    height: 1,
    borderWidth: 1,
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
  },

  section: {
    marginTop: 0,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 16,
  },
  chartPlaceholder: {
    height: 180,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
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
    borderWidth: 1,
    paddingTop: 16,
  },
  innerSectionTitle: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '700',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  accordionItem: {
    borderBottomWidth: 1,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerLeft: {
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  yearText: {
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
    padding: 16,
    paddingTop: 0,
  },
  separator: {
    height: 1,
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
    fontSize: 12,
    fontWeight: '400',
  },
  emptyCard: {
    height: 150,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
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
  modalList: {
    paddingBottom: 40,
  },
  hiddenCapture: {
    position: 'absolute',
    left: -1000, // Off-screen
    top: 0,
    opacity: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sheetSubtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  communityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    gap: 12,
  },
  communityText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
