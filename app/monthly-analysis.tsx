import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BackButton } from '@/components/BackButton';
import { ChevronDown, TrendingUp } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { BarChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function MonthlyAnalysisScreen() {
  const router = useRouter();
  const transactions = usePortfolioStore((state) => state.transactions);
  const tickers = usePortfolioStore((state) => state.tickers);
  const fetchTickers = usePortfolioStore((state) => state.fetchTickers);
  const getMonthlyAnalysis = usePortfolioStore(
    (state) => state.getMonthlyAnalysis,
  );
  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const showCurrencySymbol = usePortfolioStore(
    (state) => state.showCurrencySymbol,
  );

  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const monthlyAnalysis = useMemo(
    () => getMonthlyAnalysis(),
    [transactions, getMonthlyAnalysis, tickers],
  );
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const chartScrollRef = useRef<ScrollView>(null);

  const toggleMonth = (key: string) => {
    Haptics.selectionAsync();
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const gradientColors: readonly [string, string] =
    colorScheme === 'dark' ? ['#1C1C1E', '#0D0E12'] : ['#FFFFFF', '#F2F2F7'];

  const gradients = {
    card: gradientColors,
  };

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

  const barData = useMemo(() => {
    const sorted = [...monthlyAnalysis].reverse(); // Chronological order
    const limited = sorted.slice(-6); // Only show last 6 months
    return limited.map((item, index) => {
      const prevItem = index > 0 ? limited[index - 1] : null;
      const hasIncreased = !prevItem || item.investment >= prevItem.investment;
      const barColor = hasIncreased ? '#4CAF50' : '#F44336';

      return {
        value: item.investment,
        label: item.month.slice(0, 3).toUpperCase(),
        frontColor: barColor,
        gradientColor: barColor,
        topLabelComponent: () => (
          <ThemedText
            style={{
              color: currColors.textSecondary,
              fontSize: 8,
              marginBottom: 4,
            }}
          >
            {isPrivacyMode ? '****' : (item.investment / 1000).toFixed(0) + 'k'}
          </ThemedText>
        ),
      };
    });
  }, [monthlyAnalysis, isPrivacyMode, currColors.textSecondary]);

  useEffect(() => {
    // Auto-scroll only if we have more than 6 months (though currently limited to 6)
    if (barData.length > 6) {
      setTimeout(() => {
        chartScrollRef.current?.scrollToEnd({ animated: true });
      }, 500);
    }
  }, [barData]);

  const maximumValue = useMemo(() => {
    if (monthlyAnalysis.length === 0) return 0;
    const max = Math.max(...monthlyAnalysis.map((item) => item.investment));
    return max > 0 ? max * 1.3 : 10000; // 30% headroom for tooltips
  }, [monthlyAnalysis]);

  const formatYAxisLabel = (label: string) => {
    const value = parseFloat(label);
    if (isNaN(value)) return label;
    if (value >= 10000000)
      return (value / 10000000).toFixed(1).replace(/\.0$/, '') + 'Cr';
    if (value >= 100000)
      return (value / 100000).toFixed(1).replace(/\.0$/, '') + 'L';
    if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
    return value.toString();
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('en-IN', {
      maximumFractionDigits: 0,
      notation: 'compact',
      compactDisplay: 'short',
    });
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: currColors.background }]}
      edges={['top', 'left', 'right']}
    >
      <View
        style={[styles.container, { backgroundColor: currColors.background }]}
      >
        <View
          style={[styles.header, { backgroundColor: currColors.background }]}
        >
          <BackButton />
          <ThemedText style={[styles.headerTitle, { color: currColors.text }]}>
            Monthly Trend
          </ThemedText>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.chartSection}>
            <LinearGradient
              colors={gradients.card}
              style={[
                styles.chartContainer,
                { borderColor: currColors.border },
              ]}
            >
              <View style={styles.chartTitleRow}>
                <ThemedText
                  style={[
                    styles.chartTitle,
                    { color: currColors.textSecondary },
                  ]}
                >
                  MO. INVESTMENT TREND
                </ThemedText>
                <TrendingUp size={14} color={currColors.tint} />
              </View>
              <View style={styles.chartWrapper}>
                {barData.length > 0 ? (
                  <BarChart
                    data={barData}
                    scrollRef={chartScrollRef}
                    barWidth={32}
                    noOfSections={3}
                    barBorderRadius={6}
                    spacing={20}
                    disableScroll
                    hideRules
                    xAxisThickness={0}
                    yAxisThickness={0}
                    yAxisTextStyle={{
                      color: currColors.textSecondary,
                      fontSize: 10,
                      fontFamily: 'Outfit_400Regular',
                    }}
                    xAxisLabelTextStyle={{
                      color: currColors.textSecondary,
                      fontSize: 10,
                      fontFamily: 'Outfit_400Regular',
                    }}
                    formatYLabel={formatYAxisLabel}
                    maxValue={maximumValue}
                    isAnimated
                    animationDuration={500}
                    initialSpacing={15}
                    width={SCREEN_WIDTH - 110}
                    renderTooltip={(item: any) => (
                      <View
                        style={[
                          styles.tooltip,
                          {
                            backgroundColor: currColors.card,
                            marginBottom: -10,
                          },
                        ]}
                      >
                        <ThemedText
                          style={{
                            color: '#FFF',
                            fontSize: 12,
                            fontWeight: '600',
                          }}
                        >
                          {showCurrencySymbol ? '₹' : ''}
                          {formatCurrency(item.value)}
                        </ThemedText>
                      </View>
                    )}
                  />
                ) : (
                  <ThemedText style={{ color: currColors.textSecondary }}>
                    No data available
                  </ThemedText>
                )}
              </View>
            </LinearGradient>
          </View>

          <View
            style={[
              styles.accordionContainer,
              {
                backgroundColor: currColors.card,
                borderColor: currColors.border,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.innerSectionTitle,
                { color: currColors.textSecondary },
              ]}
            >
              MONTHLY BREAKDOWN
            </ThemedText>

            {monthlyAnalysis.map((item, index) => {
              const isExpanded = expandedMonths.has(item.monthKey);
              return (
                <View
                  key={item.monthKey}
                  style={[
                    styles.monthlyItemContainer,
                    { borderBottomColor: currColors.border },
                    index === monthlyAnalysis.length - 1 && {
                      borderBottomWidth: 0,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.monthlyHeader,
                      { backgroundColor: currColors.card },
                      isExpanded && {
                        backgroundColor: currColors.cardSecondary,
                      },
                    ]}
                    onPress={() => toggleMonth(item.monthKey)}
                    activeOpacity={0.7}
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
        </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  chartSection: {
    marginBottom: 16,
  },
  chartContainer: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  chartTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  chartWrapper: {
    minHeight: 200,
  },
  horizontalChartScroll: {
    flexGrow: 0,
  },
  horizontalChartContent: {
    paddingRight: 20,
  },
  tooltip: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  accordionContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    paddingTop: 16,
  },
  innerSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 16,
  },
  monthlyItemContainer: {
    borderBottomWidth: 1,
  },
  monthlyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  monthText: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 2,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  growthText: {
    fontSize: 10,
    fontWeight: '400',
    marginLeft: 4,
  },
  accordionBody: {
    paddingBottom: 16,
  },
  separator: {
    height: 1,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  assetsGrid: {
    paddingHorizontal: 16,
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
    fontSize: 12,
  },
  assetValue: {
    fontSize: 12,
    fontWeight: '400',
  },
});
