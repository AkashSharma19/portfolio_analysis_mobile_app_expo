import { ActivityCalendar } from '@/components/ActivityCalendar';
import { ForecastCard } from '@/components/ForecastCard';
import { PortfolioHealthCard } from '@/components/PortfolioHealthCard';
import ShareableCard from '@/components/ShareableCard';
import { usePortfolioHealth } from '@/hooks/usePortfolioHealth';
import TopMovers from '@/components/TopMovers';
import WinLossCard from '@/components/WinLossCard';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import {
  ArrowRight,
  ChevronDown,
  Eye,
  EyeOff,
  PieChart,
  Share2,
  TrendingUp,
} from 'lucide-react-native';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';

import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';

const CHART_COLORS = [
  '#007AFF',
  '#5856D6',
  '#AF52DE',
  '#FF2D55',
  '#FF9500',
  '#FFCC00',
  '#34C759',
  '#5AC8FA',
  '#8E8E93',
  '#2C2C2E',
];

export default function PortfolioScreen() {
  const router = useRouter();
  const transactions = usePortfolioStore((state) => state.transactions);
  const calculateSummary = usePortfolioStore((state) => state.calculateSummary);
  const fetchTickers = usePortfolioStore((state) => state.fetchTickers);
  const tickers = usePortfolioStore((state) => state.tickers);
  const getYearlyAnalysis = usePortfolioStore(
    (state) => state.getYearlyAnalysis,
  );
  const getMonthlyAnalysis = usePortfolioStore(
    (state) => state.getMonthlyAnalysis,
  );
  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const togglePrivacyMode = usePortfolioStore(
    (state) => state.togglePrivacyMode,
  );
  const getHoldingsData = usePortfolioStore((state) => state.getHoldingsData);
  const userName = usePortfolioStore((state) => state.userName);
  const showCurrencySymbol = usePortfolioStore(
    (state) => state.showCurrencySymbol,
  );
  const headerLogo = usePortfolioStore((state) => state.headerLogo);
  const headerLink = usePortfolioStore((state) => state.headerLink);
  const defaultIndex = usePortfolioStore((state) => state.defaultIndex);
  const setDefaultIndex = usePortfolioStore((state) => state.setDefaultIndex);
  const lastSyncedAt = usePortfolioStore((state) => state.lastSyncedAt);

  const theme = useColorScheme() ?? 'dark';
  const currColors = Colors[theme];

  // Tracks the formatted "X min ago" string, refreshed every minute
  const [syncLabel, setSyncLabel] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

  const computeSyncLabel = (ts: number | null) => {
    if (!ts) return null;
    const diffMs = Date.now() - ts;
    const diffMin = Math.floor(diffMs / 60000);
    setIsStale(diffMin >= 30);
    if (diffMin < 1) return 'Just updated';
    if (diffMin === 1) return 'Updated 1 min ago';
    if (diffMin < 60) return `Updated ${diffMin} min ago`;
    const diffHr = Math.floor(diffMin / 60);
    return `Updated ${diffHr}h ago`;
  };

  useEffect(() => {
    setSyncLabel(computeSyncLabel(lastSyncedAt));
    const ticker = setInterval(
      () => setSyncLabel(computeSyncLabel(lastSyncedAt)),
      60000,
    );
    return () => clearInterval(ticker);
  }, [lastSyncedAt]);

  const viewShotRef = useRef<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const summary = useMemo(
    () => calculateSummary(),
    [transactions, calculateSummary, tickers],
  );
  const yearlyAnalysis = useMemo(
    () => getYearlyAnalysis(),
    [transactions, getYearlyAnalysis, tickers],
  );
  const monthlyAnalysis = useMemo(
    () => getMonthlyAnalysis(),
    [transactions, getMonthlyAnalysis, tickers],
  );

  const indices = useMemo(
    () => tickers.filter((t) => t['Asset Type'] === 'Index'),
    [tickers],
  );
  const selectedIndexData = useMemo(
    () => tickers.find((t) => t.Tickers === defaultIndex),
    [tickers, defaultIndex],
  );

  const index1YReturn = useMemo(() => {
    if (!selectedIndexData || !selectedIndexData['Today - 365']) return 0;
    const currentVal = selectedIndexData['Current Value'] as number;
    const prevVal = selectedIndexData['Today - 365'] as number;
    return ((currentVal - prevVal) / prevVal) * 100;
  }, [selectedIndexData]);

  const previewMonthlyAnalysis = useMemo(
    () => monthlyAnalysis.slice(0, 3),
    [monthlyAnalysis],
  );
  const previewYearlyAnalysis = useMemo(
    () => yearlyAnalysis.slice(0, 3),
    [yearlyAnalysis],
  );

  const holdings = useMemo(
    () => getHoldingsData(),
    [getHoldingsData, transactions, tickers],
  );

  useEffect(() => {
    fetchTickers();
    // Auto refresh every 5 minutes
    const interval = setInterval(fetchTickers, 300000);
    return () => clearInterval(interval);
  }, []);

  const [refreshing, setRefreshing] = React.useState(false);
  const [expandedYear, setExpandedYear] = React.useState<number | null>(null);
  const forecastYears = usePortfolioStore((state) => state.forecastYears);

  const health = usePortfolioHealth();

  const toggleYear = (year: number) => {
    Haptics.selectionAsync();
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
      Alert.alert(
        'Privacy Mode Active',
        'Please disable privacy mode to share your portfolio performance.',
      );
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
      .map((h) => ({
        symbol: h.symbol,
        profit: h.pnl,
      }));

    const winners = holdings.filter((h) => h.pnl >= 0);
    const winRate =
      holdings.length > 0 ? (winners.length / holdings.length) * 100 : 0;

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
      winRate,
      healthScore: health.totalScore,
    };
  }, [summary, holdings, userName, health.totalScore]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: currColors.background }]}
      edges={['top', 'left', 'right']}
    >
      <View
        style={[styles.container, { backgroundColor: currColors.background }]}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { backgroundColor: currColors.background },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={currColors.text}
            />
          }
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
                style={[
                  styles.logoContainer,
                  { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 4 },
                ]} // Added background for visibility
              >
                <Image
                  source={{ uri: headerLogo }}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            )}

            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: currColors.card,
                  borderColor: currColors.border,
                },
              ]}
            >
              <View style={styles.heroHeaderRow}>
                <ThemedText
                  type="bold"
                  style={[
                    styles.heroLabel,
                    { color: currColors.textSecondary },
                  ]}
                >
                  HOLDINGS ({holdings.length})
                </ThemedText>
                <View style={styles.heroIcons}>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      togglePrivacyMode();
                    }}
                    style={[
                      styles.iconButton,
                      { backgroundColor: currColors.cardSecondary },
                    ]}
                  >
                    {isPrivacyMode ? (
                      <EyeOff size={16} color={currColors.text} />
                    ) : (
                      <Eye size={16} color={currColors.text} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push('/analytics');
                    }}
                    style={[
                      styles.iconButton,
                      { backgroundColor: currColors.cardSecondary },
                    ]}
                  >
                    <PieChart size={16} color={currColors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleShare}
                    style={[
                      styles.iconButton,
                      { backgroundColor: currColors.cardSecondary },
                    ]}
                  >
                    <Share2 size={16} color={currColors.text} />
                  </TouchableOpacity>
                </View>
              </View>

              <ThemedText style={[styles.heroValue, { color: currColors.text }]}>
                {isPrivacyMode
                  ? '****'
                  : `${showCurrencySymbol ? '₹' : ''}${summary.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}
              </ThemedText>

              {/* Last Synced Indicator */}
              {syncLabel && (
                <TouchableOpacity
                  onPress={onRefresh}
                  activeOpacity={0.7}
                  style={styles.syncRow}
                >
                  <View
                    style={[
                      styles.syncDot,
                      { backgroundColor: isStale ? '#FF9500' : '#34C759' },
                    ]}
                  />
                  <ThemedText
                    type="medium"
                    style={[
                      styles.syncLabel,
                      { color: isStale ? '#FF9500' : currColors.textSecondary },
                    ]}
                  >
                    {syncLabel}
                  </ThemedText>
                </TouchableOpacity>
              )}

              <View
                style={[
                  styles.dashedDivider,
                  { borderColor: currColors.border },
                ]}
              />

              <View style={styles.heroRow}>
                <ThemedText
                  style={[
                    styles.heroRowLabel,
                    { color: currColors.textSecondary },
                  ]}
                >
                  1D returns
                </ThemedText>
                <ThemedText
                  style={[
                    styles.heroRowValue,
                    {
                      color: isPrivacyMode
                        ? currColors.text
                        : summary.dayChange >= 0
                          ? '#4CAF50'
                          : '#F44336',
                    },
                  ]}
                >
                  {isPrivacyMode
                    ? '****'
                    : `${summary.dayChange >= 0 ? '+' : '-'}${showCurrencySymbol ? '₹' : ''}${Math.abs(summary.dayChange).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} (${Math.abs(summary.dayChangePercentage).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%)`}
                </ThemedText>
              </View>

              <View style={styles.heroRow}>
                <ThemedText
                  style={[
                    styles.heroRowLabel,
                    { color: currColors.textSecondary },
                  ]}
                >
                  Total returns
                </ThemedText>
                <ThemedText
                  style={[
                    styles.heroRowValue,
                    {
                      color: isPrivacyMode
                        ? currColors.text
                        : summary.profitAmount >= 0
                          ? '#4CAF50'
                          : '#F44336',
                    },
                  ]}
                >
                  {isPrivacyMode
                    ? '****'
                    : `${summary.profitAmount >= 0 ? '+' : '-'}${showCurrencySymbol ? '₹' : ''}${Math.abs(summary.profitAmount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} (${Math.abs(summary.profitPercentage).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%)`}
                </ThemedText>
              </View>

              <View style={styles.heroRow}>
                <ThemedText
                  style={[
                    styles.heroRowLabel,
                    { color: currColors.textSecondary },
                  ]}
                >
                  Realized returns
                </ThemedText>
                <ThemedText
                  style={[
                    styles.heroRowValue,
                    {
                      color: isPrivacyMode
                        ? currColors.text
                        : summary.realizedReturn >= 0
                          ? '#4CAF50'
                          : '#F44336',
                    },
                  ]}
                >
                  {isPrivacyMode
                    ? '****'
                    : `${summary.realizedReturn >= 0 ? '+' : '-'}${showCurrencySymbol ? '₹' : ''}${Math.abs(summary.realizedReturn).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}
                </ThemedText>
              </View>

              <View style={styles.heroRow}>
                <ThemedText
                  style={[
                    styles.heroRowLabel,
                    { color: currColors.textSecondary },
                  ]}
                >
                  Unrealized returns
                </ThemedText>
                <ThemedText
                  style={[
                    styles.heroRowValue,
                    {
                      color: isPrivacyMode
                        ? currColors.text
                        : summary.unrealizedReturn >= 0
                          ? '#4CAF50'
                          : '#F44336',
                    },
                  ]}
                >
                  {isPrivacyMode
                    ? '****'
                    : `${summary.unrealizedReturn >= 0 ? '+' : '-'}${showCurrencySymbol ? '₹' : ''}${Math.abs(summary.unrealizedReturn).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}
                </ThemedText>
              </View>

              <View style={styles.heroRow}>
                <ThemedText
                  style={[
                    styles.heroRowLabel,
                    { color: currColors.textSecondary },
                  ]}
                >
                  Invested
                </ThemedText>
                <ThemedText
                  style={[styles.heroRowValueWhite, { color: currColors.text }]}
                >
                  {isPrivacyMode
                    ? '****'
                    : `${showCurrencySymbol ? '₹' : ''}${summary.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}
                </ThemedText>
              </View>

              <View style={styles.heroRow}>
                <ThemedText
                  style={[
                    styles.heroRowLabel,
                    { color: currColors.textSecondary },
                  ]}
                >
                  XIRR
                </ThemedText>
                <ThemedText
                  style={[
                    styles.heroRowValueWhite,
                    {
                      color: isPrivacyMode
                        ? currColors.text
                        : summary.xirr < 0
                          ? '#F44336'
                          : currColors.text,
                    },
                  ]}
                >
                  {isPrivacyMode
                    ? '****'
                    : `${summary.xirr.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`}
                </ThemedText>
              </View>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/index-comparison');
                }}
                style={[styles.heroRow, { marginBottom: 0 }]}
              >
                <View>
                  <ThemedText
                    style={[
                      styles.comparisonText,
                      { color: currColors.textSecondary },
                    ]}
                  >
                    vs {selectedIndexData?.['Company Name'] || 'Index'}
                  </ThemedText>
                  <View
                    style={{
                      position: 'absolute',
                      bottom: -1,
                      left: 0,
                      right: 0,
                      height: 2,
                      borderBottomWidth: 2,
                      borderStyle: 'dotted',
                      borderColor: currColors.textSecondary,
                    }}
                  />
                </View>
                <ThemedText
                  style={[
                    styles.comparisonValue,
                    { color: currColors.textSecondary },
                  ]}
                >
                  {isPrivacyMode ? (
                    '****'
                  ) : (
                    <ThemedText>
                      PF XIRR{' '}
                      <ThemedText
                        style={{
                          color:
                            summary.xirr < 0
                              ? '#F44336'
                              : currColors.textSecondary,
                        }}
                      >
                        {summary.xirr.toFixed(2)}%
                      </ThemedText>{' '}
                      / Idx {index1YReturn.toFixed(2)}%
                    </ThemedText>
                  )}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          <TopMovers />

          <View style={[styles.dashboardRow, { marginBottom: 16 }]}>
            <View style={{ flex: 1 }}>
              <PortfolioHealthCard isCompact />
            </View>
            <View style={{ flex: 1 }}>
              <WinLossCard
                isCompact
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/win-loss-details');
                }}
              />
            </View>
          </View>

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
              <View
                style={[
                  styles.accordionContainer,
                  {
                    backgroundColor: currColors.card,
                    borderColor: currColors.border,
                  },
                ]}
              >
                <View style={[styles.headerWithAction]}>
                  <ThemedText
                    style={[
                      styles.innerSectionTitle,
                      { color: currColors.textSecondary },
                    ]}
                  >
                    YEARLY TREND
                  </ThemedText>
                  {yearlyAnalysis.length > 3 && (
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push('/yearly-analysis');
                      }}
                      style={styles.viewMoreButton}
                    >
                      <View
                        style={[
                          styles.iconCircle,
                          { backgroundColor: currColors.cardSecondary },
                        ]}
                      >
                        <ArrowRight size={14} color={currColors.tint} />
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
                {previewYearlyAnalysis.map((item, index) => {
                  const isExpanded = expandedYear === item.year;
                  return (
                    <View
                      key={item.year}
                      style={[
                        styles.accordionItem,
                        { borderBottomColor: currColors.border },
                      ]}
                    >
                      <TouchableOpacity
                        style={[
                          styles.accordionHeader,
                          { backgroundColor: currColors.card },
                          isExpanded && {
                            backgroundColor: currColors.cardSecondary,
                          },
                        ]}
                        onPress={() => toggleYear(item.year)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.headerLeft}>
                          <ThemedText
                            style={[
                              styles.yearText,
                              { color: currColors.text },
                            ]}
                          >
                            {item.year}
                          </ThemedText>
                          <ThemedText
                            style={[
                              styles.subText,
                              { color: currColors.textSecondary },
                            ]}
                          >
                            Avg. Inv:{' '}
                            {isPrivacyMode
                              ? '****'
                              : `${showCurrencySymbol ? '₹' : ''}${item.averageMonthlyInvestment.toLocaleString(undefined, { maximumFractionDigits: 0, notation: 'compact', compactDisplay: 'short' })}`}
                          </ThemedText>
                        </View>

                        <View style={styles.headerRight}>
                          {item.percentageIncrease !== 0 && (
                            <View
                              style={[
                                styles.growthBadge,
                                {
                                  backgroundColor:
                                    item.percentageIncrease >= 0
                                      ? 'rgba(76, 175, 80, 0.1)'
                                      : 'rgba(244, 67, 54, 0.1)',
                                },
                              ]}
                            >
                              <TrendingUp
                                size={12}
                                color={
                                  item.percentageIncrease >= 0
                                    ? '#4CAF50'
                                    : '#F44336'
                                }
                                style={{
                                  transform: [
                                    {
                                      rotate:
                                        item.percentageIncrease >= 0
                                          ? '0deg'
                                          : '180deg',
                                    },
                                  ],
                                }}
                              />
                              <ThemedText
                                style={[
                                  styles.growthText,
                                  {
                                    color:
                                      item.percentageIncrease >= 0
                                        ? '#4CAF50'
                                        : '#F44336',
                                  },
                                ]}
                              >
                                {Math.abs(item.percentageIncrease).toFixed(2)}%
                              </ThemedText>
                            </View>
                          )}
                          <View
                            style={{
                              transform: [
                                { rotate: isExpanded ? '180deg' : '0deg' },
                              ],
                              marginLeft: 8,
                            }}
                          >
                            <ChevronDown
                              size={20}
                              color={currColors.textSecondary}
                            />
                          </View>
                        </View>
                      </TouchableOpacity>

                      {isExpanded && (
                        <View
                          style={[
                            styles.accordionBody,
                            { backgroundColor: currColors.card },
                          ]}
                        >
                          <View
                            style={[
                              styles.separator,
                              { backgroundColor: currColors.border },
                            ]}
                          />
                          <View style={styles.assetsGrid}>
                            {item.assetDistribution.map((asset, i) => (
                              <View key={i} style={styles.assetItem}>
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                  }}
                                >
                                  <View
                                    style={[
                                      styles.dot,
                                      {
                                        backgroundColor:
                                          CHART_COLORS[i % CHART_COLORS.length],
                                      },
                                    ]}
                                  />
                                  <ThemedText
                                    style={[
                                      styles.assetName,
                                      { color: currColors.textSecondary },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {asset.name}
                                  </ThemedText>
                                </View>
                                <ThemedText
                                  style={[
                                    styles.assetValue,
                                    { color: currColors.text },
                                  ]}
                                >
                                  {isPrivacyMode
                                    ? '****'
                                    : `${showCurrencySymbol ? '₹' : ''}${asset.value.toLocaleString(undefined, { maximumFractionDigits: 0, notation: 'compact', compactDisplay: 'short' })}`}
                                </ThemedText>
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
              <View
                style={[
                  styles.emptyCard,
                  {
                    backgroundColor: currColors.card,
                    borderColor: currColors.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.placeholderText,
                    { color: currColors.textSecondary },
                  ]}
                >
                  Not enough data for yearly trend
                </ThemedText>
              </View>
            )}
          </View>

          {/* Monthly Analysis Section */}
          <View style={[styles.section, { marginBottom: 40 }]}>
            {monthlyAnalysis.length > 0 ? (
              <View
                style={[
                  styles.accordionContainer,
                  {
                    backgroundColor: currColors.card,
                    borderColor: currColors.border,
                  },
                ]}
              >
                <View style={[styles.headerWithAction]}>
                  <ThemedText
                    style={[
                      styles.innerSectionTitle,
                      { color: currColors.textSecondary },
                    ]}
                  >
                    MONTHLY TREND
                  </ThemedText>
                  {monthlyAnalysis.length > 3 && (
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push('/monthly-analysis');
                      }}
                      style={styles.viewMoreButton}
                    >
                      <View
                        style={[
                          styles.iconCircle,
                          { backgroundColor: currColors.cardSecondary },
                        ]}
                      >
                        <ArrowRight size={14} color={currColors.tint} />
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
                {previewMonthlyAnalysis.map((item, index) => (
                  <View
                    key={item.monthKey}
                    style={[
                      styles.monthlyItem,
                      {
                        backgroundColor: currColors.card,
                        borderBottomColor: currColors.border,
                      },
                      index === previewMonthlyAnalysis.length - 1 && {
                        borderBottomWidth: 0,
                      },
                    ]}
                  >
                    <View style={styles.headerLeft}>
                      <ThemedText
                        style={[styles.monthText, { color: currColors.text }]}
                      >
                        {item.month}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.subText,
                          { color: currColors.textSecondary },
                        ]}
                      >
                        Invested:{' '}
                        {isPrivacyMode
                          ? '****'
                          : `${showCurrencySymbol ? '₹' : ''}${item.investment.toLocaleString(undefined, { maximumFractionDigits: 0, notation: 'compact', compactDisplay: 'short' })}`}
                      </ThemedText>
                    </View>
                    {item.percentageIncrease !== 0 && (
                      <View
                        style={[
                          styles.growthBadge,
                          {
                            backgroundColor:
                              item.percentageIncrease >= 0
                                ? 'rgba(76, 175, 80, 0.1)'
                                : 'rgba(244, 67, 54, 0.1)',
                          },
                        ]}
                      >
                        <TrendingUp
                          size={12}
                          color={
                            item.percentageIncrease >= 0 ? '#4CAF50' : '#F44336'
                          }
                          style={{
                            transform: [
                              {
                                rotate:
                                  item.percentageIncrease >= 0
                                    ? '0deg'
                                    : '180deg',
                              },
                            ],
                          }}
                        />
                        <ThemedText
                          style={[
                            styles.growthText,
                            {
                              color:
                                item.percentageIncrease >= 0
                                  ? '#4CAF50'
                                  : '#F44336',
                            },
                          ]}
                        >
                          {Math.abs(item.percentageIncrease).toFixed(2)}%
                        </ThemedText>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <View
                style={[
                  styles.emptyCard,
                  {
                    backgroundColor: currColors.card,
                    borderColor: currColors.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.placeholderText,
                    { color: currColors.textSecondary },
                  ]}
                >
                  Not enough data for monthly trend
                </ThemedText>
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Hidden ViewShot component for capturing */}
      <View style={styles.hiddenCapture} pointerEvents="none">
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'png', quality: 1.0, result: 'tmpfile' }}
        >
          <ShareableCard data={shareData} />
        </ViewShot>
      </View>
    </SafeAreaView>
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
  comparisonText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  comparisonValue: {
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
  dashboardRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
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
    fontFamily: 'Outfit_400Regular',
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
    fontFamily: 'Outfit_400Regular',
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
    fontFamily: 'Outfit_400Regular',
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
    fontFamily: 'Outfit_400Regular',
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
    fontFamily: 'Outfit_400Regular',
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
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
  },
  filterChipText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
  },
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  comparisonCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginTop: 10,
  },
  benchmarkChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    marginRight: 10,
    borderWidth: 1,
  },
  benchmarkChipText: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
  chartTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  chartTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  deltaContainer: {
    marginBottom: 20,
    padding: 2,
  },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 10,
  },
  deltaText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  deltaSummary: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  syncLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
});
