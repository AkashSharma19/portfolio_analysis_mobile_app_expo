import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Wallet,
  ArrowUpDown,
  Calendar,
  Layers,
  Check,
  CreditCard,
  Building2,
  Banknote,
  Percent,
} from 'lucide-react-native';
import { PieChart, BarChart } from 'react-native-gifted-charts';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { CategoryIcon } from '@/components/CategoryIcon';
import { BackButton } from '@/components/BackButton';

const SCREEN_WIDTH = Dimensions.get('window').width;

const DEFAULT_CATEGORY_METADATA: Record<string, { icon: string; color: string }> = {
  'Food & Dining': { icon: 'Utensils', color: '#FF3B30' },
  'Rent & Bills': { icon: 'Receipt', color: '#007AFF' },
  'Shopping': { icon: 'ShoppingBag', color: '#FF9500' },
  'Entertainment': { icon: 'Clapperboard', color: '#AF52DE' },
  'Travel': { icon: 'Plane', color: '#34C759' },
  'Medical': { icon: 'Pill', color: '#FF2D55' },
  'Education': { icon: 'GraduationCap', color: '#5AC8FA' },
  'Food': { icon: 'UtensilsCrossed', color: '#FF6B6B' },
  'Junk': { icon: 'Cookie', color: '#FF922B' },
  'Shopping - Electronics': { icon: 'Laptop', color: '#5856D6' },
  'Shopping - Clothes': { icon: 'Shirt', color: '#FD79A8' },
  'Subscriptions - OTT': { icon: 'Tv', color: '#CC5DE8' },
  'Subscriptions - WiFi': { icon: 'Wifi', color: '#4DABF7' },
  'House': { icon: 'Home', color: '#20C997' },
  'Electricity Bill': { icon: 'Zap', color: '#FFCC00' },
  'Transport - Fuel': { icon: 'Fuel', color: '#FF8E53' },
  'Transport - Cab': { icon: 'Car', color: '#FCC419' },
  'Maintainance': { icon: 'Wrench', color: '#8E8E93' },
  'Maintenance': { icon: 'Wrench', color: '#8E8E93' },
  'Travel/ Trips': { icon: 'Compass', color: '#748FFC' },
  'Family': { icon: 'Users', color: '#B33771' },
  'Gifts': { icon: 'Gift', color: '#E84393' },
  'EMI Payments': { icon: 'CalendarRange', color: '#A06A42' },
  'Salary': { icon: 'Banknote', color: '#34C759' },
  'Investments': { icon: 'TrendingUp', color: '#00C9A7' },
  'Business': { icon: 'Briefcase', color: '#007AFF' },
  'Refund': { icon: 'RotateCcw', color: '#5856D6' },
  'Others': { icon: 'Tag', color: '#8E8E93' },
  'Other': { icon: 'Tag', color: '#8E8E93' },
};

const CATEGORY_COLORS = [
  '#FF3B30', '#007AFF', '#FF9500', '#34C759', '#AF52DE', '#FF2D55',
  '#5AC8FA', '#FFCC00', '#5856D6', '#00C9A7', '#FF6B6B', '#4DABF7',
  '#FF922B', '#51CF66', '#CC5DE8', '#FF8787', '#20C997', '#FCC419',
  '#748FFC', '#FF8E53', '#A06A42', '#8E8E93', '#FD79A8', '#6C5CE7',
];

const getCategoryColor = (name: string, customMeta?: Record<string, { icon: string; color: string }>) => {
  if (customMeta?.[name]?.color) return customMeta[name].color;
  if (DEFAULT_CATEGORY_METADATA[name]?.color) return DEFAULT_CATEGORY_METADATA[name].color;
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length];
};

type TimeFrame = 'month' | 'quarter' | 'year' | 'all';
type AnalyticsTab = 'category' | 'trends';
type CategoryFilterType = 'expense' | 'income';
type SortOption = 'amount' | 'name' | 'count';
type TrendMode = 'dual' | 'surplus';

export default function MoneyAnalyticsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const { moneyTransactions, categoryMetadata } = useMoneyStore();
  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

  const [timeFrame, setTimeFrame] = useState<TimeFrame>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('category');
  const [categoryType, setCategoryType] = useState<CategoryFilterType>('expense');
  const [sortBy, setSortBy] = useState<SortOption>('amount');
  const [focusedCategory, setFocusedCategory] = useState<string | null>(null);
  const [trendMode, setTrendMode] = useState<TrendMode>('dual');
  const [showTimeframeModal, setShowTimeframeModal] = useState(false);

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formatAmount = (val: number, includeSign = false) => {
    if (isPrivacyMode) return '••••••';
    const formatted = Math.abs(val).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    const symbol = showCurrencySymbol ? '₹' : '';
    if (includeSign) {
      const sign = val > 0 ? '+' : val < 0 ? '-' : '';
      return `${sign}${symbol}${formatted}`;
    }
    const prefix = val < 0 ? '-' : '';
    return `${prefix}${symbol}${formatted}`;
  };

  // ─── Timeframe Controls & Label ───
  const timeframeLabel = useMemo(() => {
    if (timeFrame === 'all') return 'All Time';
    if (timeFrame === 'year') return `${selectedDate.getFullYear()}`;
    if (timeFrame === 'quarter') {
      const q = Math.floor(selectedDate.getMonth() / 3) + 1;
      return `Q${q} ${selectedDate.getFullYear()}`;
    }
    return selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  }, [timeFrame, selectedDate]);

  const handlePrevPeriod = () => {
    handleHaptic();
    setFocusedCategory(null);
    const newDate = new Date(selectedDate);
    if (timeFrame === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (timeFrame === 'quarter') {
      newDate.setMonth(newDate.getMonth() - 3);
    } else if (timeFrame === 'year') {
      newDate.setFullYear(newDate.getFullYear() - 1);
    }
    setSelectedDate(newDate);
  };

  const handleNextPeriod = () => {
    handleHaptic();
    setFocusedCategory(null);
    const newDate = new Date(selectedDate);
    if (timeFrame === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (timeFrame === 'quarter') {
      newDate.setMonth(newDate.getMonth() + 3);
    } else if (timeFrame === 'year') {
      newDate.setFullYear(newDate.getFullYear() + 1);
    }
    setSelectedDate(newDate);
  };

  // ─── Filtered Transactions for Selected Timeframe ───
  const periodTransactions = useMemo(() => {
    const currYear = selectedDate.getFullYear();
    const currMonth = selectedDate.getMonth();
    const currQuarter = Math.floor(currMonth / 3);

    return moneyTransactions.filter((tx) => {
      const txDate = new Date(tx.date);
      const txYear = txDate.getFullYear();
      const txMonth = txDate.getMonth();
      const txQuarter = Math.floor(txMonth / 3);

      if (timeFrame === 'all') return true;
      if (timeFrame === 'year') return txYear === currYear;
      if (timeFrame === 'quarter') return txYear === currYear && txQuarter === currQuarter;
      return txYear === currYear && txMonth === currMonth;
    });
  }, [moneyTransactions, timeFrame, selectedDate]);

  // ─── Hero Overview Metrics ───
  const overviewMetrics = useMemo(() => {
    let income = 0;
    let expense = 0;

    periodTransactions.forEach((tx) => {
      if (tx.type === 'income') income += tx.amount;
      else if (tx.type === 'expense') expense += tx.amount;
    });

    const netSurplus = income - expense;
    const savingsRate = income > 0 ? (netSurplus / income) * 100 : expense > 0 ? -100 : 0;

    // Approximate days in timeframe for daily run-rate
    let days = 30;
    if (timeFrame === 'month') {
      days = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
    } else if (timeFrame === 'quarter') {
      days = 90;
    } else if (timeFrame === 'year') {
      days = 365;
    } else if (timeFrame === 'all') {
      days = Math.max(1, Math.ceil((Date.now() - new Date(moneyTransactions[moneyTransactions.length - 1]?.date || Date.now()).getTime()) / (1000 * 60 * 60 * 24)));
    }
    const avgDailySpend = days > 0 ? expense / days : 0;

    return {
      income,
      expense,
      netSurplus,
      savingsRate,
      avgDailySpend,
      txCount: periodTransactions.length,
    };
  }, [periodTransactions, timeFrame, selectedDate, moneyTransactions]);

  // ─── Category Breakdown Aggregations ───
  const categoryData = useMemo(() => {
    const totals: Record<string, { amount: number; count: number; color: string; icon: string }> = {};
    let totalAmount = 0;

    periodTransactions.forEach((tx) => {
      if (tx.type !== categoryType) return;
      totalAmount += tx.amount;

      if (!totals[tx.category]) {
        const color = getCategoryColor(tx.category, categoryMetadata);
        const icon = categoryMetadata?.[tx.category]?.icon || DEFAULT_CATEGORY_METADATA[tx.category]?.icon || 'Tag';
        totals[tx.category] = { amount: 0, count: 0, color, icon };
      }
      totals[tx.category].amount += tx.amount;
      totals[tx.category].count += 1;
    });

    const list = Object.keys(totals).map((name) => ({
      name,
      amount: totals[name].amount,
      count: totals[name].count,
      color: totals[name].color,
      icon: totals[name].icon,
      percentage: totalAmount > 0 ? (totals[name].amount / totalAmount) * 100 : 0,
    }));

    if (sortBy === 'amount') {
      list.sort((a, b) => b.amount - a.amount);
    } else if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'count') {
      list.sort((a, b) => b.count - a.count);
    }

    return { list, totalAmount };
  }, [periodTransactions, categoryType, categoryMetadata, sortBy]);

  // ─── Gifted Charts Pie Data ───
  const pieChartData = useMemo(() => {
    if (categoryData.list.length === 0) {
      return [{ value: 1, color: currColors.cardSecondary, text: 'No Data' }];
    }

    return categoryData.list.map((item) => {
      const isFocused = focusedCategory === item.name;
      return {
        value: item.amount,
        color: item.color,
        text: item.name,
        focused: isFocused,
        strokeWidth: isFocused ? 3 : 0,
        strokeColor: '#FFFFFF',
      };
    });
  }, [categoryData.list, focusedCategory, currColors]);

  // Active focused item metadata for Pie center
  const activeFocusedItem = useMemo(() => {
    if (!focusedCategory) return null;
    return categoryData.list.find((c) => c.name === focusedCategory) || null;
  }, [focusedCategory, categoryData.list]);

  // ─── 12-Month Trend Aggregation ───
  const monthlyTrends = useMemo(() => {
    const list: {
      monthKey: string;
      monthLabel: string;
      fullLabel: string;
      income: number;
      expense: number;
      surplus: number;
      savingsRate: number;
    }[] = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const monthKey = `${year}-${month}`;
      const monthLabel = d.toLocaleString('default', { month: 'short' });
      const fullLabel = d.toLocaleString('default', { month: 'long', year: 'numeric' });

      list.push({
        monthKey,
        monthLabel,
        fullLabel,
        income: 0,
        expense: 0,
        surplus: 0,
        savingsRate: 0,
      });
    }

    moneyTransactions.forEach((tx) => {
      const txDate = new Date(tx.date);
      const txKey = `${txDate.getFullYear()}-${txDate.getMonth()}`;
      const item = list.find((x) => x.monthKey === txKey);
      if (item) {
        if (tx.type === 'income') item.income += tx.amount;
        else if (tx.type === 'expense') item.expense += tx.amount;
      }
    });

    list.forEach((item) => {
      item.surplus = item.income - item.expense;
      item.savingsRate = item.income > 0 ? (item.surplus / item.income) * 100 : item.expense > 0 ? -100 : 0;
    });

    // Find first non-empty month
    let firstActiveIndex = 0;
    for (let i = 0; i < list.length; i++) {
      if (list[i].income > 0 || list[i].expense > 0) {
        firstActiveIndex = i;
        break;
      }
    }

    const activeList = list.slice(firstActiveIndex);
    return activeList.length > 0 ? activeList : list.slice(6);
  }, [moneyTransactions]);

  // Gifted Charts Dual Bar Data (Grouped Income vs Expense)
  const dualBarChartData = useMemo(() => {
    const chartData: any[] = [];
    monthlyTrends.forEach((m) => {
      chartData.push({
        value: m.income,
        label: m.monthLabel,
        spacing: 4,
        labelWidth: 32,
        labelTextStyle: { color: currColors.textSecondary, fontSize: 9, fontFamily: 'Outfit_400Regular' },
        frontColor: '#34C759',
      });
      chartData.push({
        value: m.expense,
        frontColor: '#FF3B30',
      });
    });
    return chartData;
  }, [monthlyTrends, currColors]);

  // Gifted Charts Surplus Bar Data
  const surplusBarChartData = useMemo(() => {
    return monthlyTrends.map((m) => ({
      value: Math.max(0, m.surplus),
      label: m.monthLabel,
      frontColor: m.surplus >= 0 ? '#34C759' : '#FF3B30',
      labelTextStyle: { color: currColors.textSecondary, fontSize: 9, fontFamily: 'Outfit_400Regular' },
    }));
  }, [monthlyTrends, currColors]);



  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currColors.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ─── Top Header ─── */}
      <View style={styles.header}>
        <BackButton />
        <ThemedText style={[styles.headerTitle, { color: currColors.text }]}>
          Money Analytics
        </ThemedText>
        <TouchableOpacity
          style={[styles.timeframePill, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border }]}
          onPress={() => {
            handleHaptic();
            setShowTimeframeModal(true);
          }}
          activeOpacity={0.7}
        >
          <Calendar size={13} color="#00C9A7" />
          <ThemedText style={[styles.timeframePillText, { color: currColors.text }]}>
            {timeFrame.toUpperCase()}
          </ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        
        {/* ─── Period Navigator Banner (When Not All-Time) ─── */}
        {timeFrame !== 'all' && (
          <View style={[styles.periodNavigator, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <TouchableOpacity onPress={handlePrevPeriod} style={styles.navArrowBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <ChevronLeft size={20} color={currColors.text} />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <ThemedText style={[styles.periodNavLabel, { color: currColors.text }]}>
                {timeframeLabel}
              </ThemedText>
              <ThemedText style={[styles.periodNavSubtitle, { color: currColors.textSecondary }]}>
                {overviewMetrics.txCount} {overviewMetrics.txCount === 1 ? 'transaction' : 'transactions'}
              </ThemedText>
            </View>
            <TouchableOpacity onPress={handleNextPeriod} style={styles.navArrowBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <ChevronRight size={20} color={currColors.text} />
            </TouchableOpacity>
          </View>
        )}

        {/* ─── 1. Unified Hero Cash Flow Card ─── */}
        <View style={[styles.heroCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
          <View style={styles.heroHeaderRow}>
            <ThemedText style={[styles.heroLabel, { color: currColors.textSecondary }]}>
              NET CASH FLOW
            </ThemedText>
            <View
              style={[
                styles.badgePill,
                {
                  backgroundColor:
                    overviewMetrics.netSurplus >= 0
                      ? 'rgba(52, 199, 89, 0.12)'
                      : 'rgba(255, 59, 48, 0.12)',
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.badgeText,
                  { color: overviewMetrics.netSurplus >= 0 ? '#34C759' : '#FF3B30' },
                ]}
              >
                {overviewMetrics.netSurplus >= 0
                  ? `${overviewMetrics.savingsRate.toFixed(1)}% SAVED`
                  : 'DEFICIT'}
              </ThemedText>
            </View>
          </View>

          <ThemedText
            style={[
              styles.heroValue,
              { color: overviewMetrics.netSurplus >= 0 ? '#34C759' : '#FF3B30' },
            ]}
          >
            {formatAmount(overviewMetrics.netSurplus, true)}
          </ThemedText>

          <View style={[styles.dashedDivider, { borderColor: currColors.border }]} />

          {/* Clean Stat Rows */}
          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>
              Total Inflow (Income)
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: '#34C759' }]}>
              {formatAmount(overviewMetrics.income, true)}
            </ThemedText>
          </View>

          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>
              Total Outflow (Expenses)
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: '#FF3B30' }]}>
              {formatAmount(overviewMetrics.expense, true)}
            </ThemedText>
          </View>

          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>
              Daily Burn Rate
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: currColors.text }]}>
              {formatAmount(overviewMetrics.avgDailySpend)}/day
            </ThemedText>
          </View>

          <View style={[styles.heroRow, { marginBottom: 0 }]}>
            <ThemedText style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>
              Savings Rate
            </ThemedText>
            <ThemedText
              style={[
                styles.heroRowValue,
                { color: overviewMetrics.savingsRate >= 20 ? '#34C759' : overviewMetrics.savingsRate > 0 ? '#FF9500' : '#FF3B30' },
              ]}
            >
              {overviewMetrics.savingsRate.toFixed(1)}%
            </ThemedText>
          </View>
        </View>

        {/* ─── 2. Segmented Navigation Tabs ─── */}
        <View style={[styles.segmentedTabBar, { backgroundColor: currColors.cardSecondary }]}>
          <TouchableOpacity
            style={[styles.segmentedTabBtn, activeTab === 'category' && { backgroundColor: '#00C9A7' }]}
            onPress={() => {
              handleHaptic();
              setActiveTab('category');
            }}
          >
            <ThemedText
              style={[
                styles.segmentedTabText,
                { color: activeTab === 'category' ? '#FFFFFF' : currColors.textSecondary },
              ]}
            >
              Categories
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentedTabBtn, activeTab === 'trends' && { backgroundColor: '#00C9A7' }]}
            onPress={() => {
              handleHaptic();
              setActiveTab('trends');
            }}
          >
            <ThemedText
              style={[
                styles.segmentedTabText,
                { color: activeTab === 'trends' ? '#FFFFFF' : currColors.textSecondary },
              ]}
            >
              Cashflow Trends
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* ─── TAB 1: CATEGORIES BREAKDOWN ─── */}
        {activeTab === 'category' && (
          <View>
            {/* Sub-toggle: Expense vs Income & Sort */}
            <View style={styles.subFilterRow}>
              <View style={[styles.miniToggleBar, { backgroundColor: currColors.cardSecondary }]}>
                <TouchableOpacity
                  style={[styles.miniTogglePill, categoryType === 'expense' && { backgroundColor: '#FF3B30' }]}
                  onPress={() => {
                    handleHaptic();
                    setCategoryType('expense');
                    setFocusedCategory(null);
                  }}
                >
                  <ThemedText
                    style={{
                      fontSize: 11,
                      fontFamily: 'Outfit_500Medium',
                      color: categoryType === 'expense' ? '#FFFFFF' : currColors.textSecondary,
                    }}
                  >
                    Expenses
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.miniTogglePill, categoryType === 'income' && { backgroundColor: '#34C759' }]}
                  onPress={() => {
                    handleHaptic();
                    setCategoryType('income');
                    setFocusedCategory(null);
                  }}
                >
                  <ThemedText
                    style={{
                      fontSize: 11,
                      fontFamily: 'Outfit_500Medium',
                      color: categoryType === 'income' ? '#FFFFFF' : currColors.textSecondary,
                    }}
                  >
                    Income
                  </ThemedText>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.sortButton, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border }]}
                onPress={() => {
                  handleHaptic();
                  setSortBy(sortBy === 'amount' ? 'count' : sortBy === 'count' ? 'name' : 'amount');
                }}
              >
                <ArrowUpDown size={12} color={currColors.textSecondary} />
                <ThemedText style={[styles.sortButtonText, { color: currColors.textSecondary }]}>
                  {sortBy === 'amount' ? 'By Amount' : sortBy === 'count' ? 'By Frequency' : 'A-Z'}
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Donut Chart Card */}
            <View style={[styles.chartCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
              <View style={styles.pieWrapper}>
                <PieChart
                  data={pieChartData}
                  donut
                  sectionAutoFocus
                  radius={SCREEN_WIDTH * 0.23}
                  innerRadius={SCREEN_WIDTH * 0.16}
                  innerCircleColor={currColors.card}
                  centerLabelComponent={() => (
                    <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}>
                      <ThemedText
                        style={{
                          fontSize: 11,
                          color: currColors.textSecondary,
                          fontFamily: 'Outfit_500Medium',
                          textAlign: 'center',
                        }}
                        numberOfLines={1}
                      >
                        {activeFocusedItem ? activeFocusedItem.name : categoryType === 'expense' ? 'Total Spent' : 'Total Inflow'}
                      </ThemedText>
                      <ThemedText
                        style={{
                          fontSize: 16,
                          color: activeFocusedItem ? activeFocusedItem.color : currColors.text,
                          fontFamily: 'Outfit_600SemiBold',
                          marginTop: 2,
                          textAlign: 'center',
                        }}
                        numberOfLines={1}
                      >
                        {formatAmount(activeFocusedItem ? activeFocusedItem.amount : categoryData.totalAmount)}
                      </ThemedText>
                      {activeFocusedItem && (
                        <ThemedText
                          style={{
                            fontSize: 11,
                            color: currColors.textSecondary,
                            fontFamily: 'Outfit_400Regular',
                            marginTop: 1,
                          }}
                        >
                          {activeFocusedItem.percentage.toFixed(1)}%
                        </ThemedText>
                      )}
                    </View>
                  )}
                />
              </View>
            </View>

            {/* Category Ranking Grouped Card */}
            <View style={styles.sectionHeaderMargin}>
              <ThemedText style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
                {categoryType.toUpperCase()} BREAKDOWN ({categoryData.list.length})
              </ThemedText>
            </View>

            <View style={[styles.groupedListCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
              {categoryData.list.length === 0 ? (
                <View style={styles.emptyState}>
                  <ThemedText style={{ color: currColors.textSecondary, fontSize: 13, fontFamily: 'Outfit_400Regular' }}>
                    No {categoryType} transactions recorded for this period.
                  </ThemedText>
                </View>
              ) : (
                categoryData.list.map((item, index) => {
                  const isLast = index === categoryData.list.length - 1;
                  const isFocused = focusedCategory === item.name;
                  return (
                    <TouchableOpacity
                      key={item.name}
                      style={[
                        styles.categoryRowItem,
                        !isLast && { borderBottomWidth: 1, borderBottomColor: currColors.border },
                        isFocused && { backgroundColor: `${item.color}12` },
                      ]}
                      activeOpacity={0.7}
                      onPress={() => {
                        handleHaptic();
                        setFocusedCategory(isFocused ? null : item.name);
                      }}
                    >
                      <View style={styles.categoryRowLeft}>
                        <View style={[styles.categoryIconSquare, { backgroundColor: `${item.color}18` }]}>
                          <CategoryIcon name={item.icon} color={item.color} size={18} />
                        </View>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <ThemedText style={[styles.categoryName, { color: currColors.text }]} numberOfLines={1}>
                            {item.name}
                          </ThemedText>
                          <View style={styles.rowProgressBarBG}>
                            <View
                              style={[
                                styles.rowProgressBarFill,
                                { width: `${Math.min(100, item.percentage)}%`, backgroundColor: item.color },
                              ]}
                            />
                          </View>
                        </View>
                      </View>

                      <View style={styles.categoryRowRight}>
                        <ThemedText style={[styles.categoryAmount, { color: currColors.text }]}>
                          {formatAmount(item.amount)}
                        </ThemedText>
                        <ThemedText style={[styles.categoryPercent, { color: currColors.textSecondary }]}>
                          {item.percentage.toFixed(1)}% • {item.count} tx
                        </ThemedText>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </View>
        )}

        {/* ─── TAB 2: CASHFLOW & TRENDS ─── */}
        {activeTab === 'trends' && (
          <View>
            {/* Trend Mode Switcher */}
            <View style={styles.subFilterRow}>
              <View style={[styles.miniToggleBar, { backgroundColor: currColors.cardSecondary }]}>
                <TouchableOpacity
                  style={[styles.miniTogglePill, trendMode === 'dual' && { backgroundColor: '#00C9A7' }]}
                  onPress={() => {
                    handleHaptic();
                    setTrendMode('dual');
                  }}
                >
                  <ThemedText
                    style={{
                      fontSize: 11,
                      fontFamily: 'Outfit_500Medium',
                      color: trendMode === 'dual' ? '#FFFFFF' : currColors.textSecondary,
                    }}
                  >
                    Income vs Expense
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.miniTogglePill, trendMode === 'surplus' && { backgroundColor: '#00C9A7' }]}
                  onPress={() => {
                    handleHaptic();
                    setTrendMode('surplus');
                  }}
                >
                  <ThemedText
                    style={{
                      fontSize: 11,
                      fontFamily: 'Outfit_500Medium',
                      color: trendMode === 'surplus' ? '#FFFFFF' : currColors.textSecondary,
                    }}
                  >
                    Net Surplus
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {/* Legend Indicator */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {trendMode === 'dual' ? (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#34C759' }} />
                      <ThemedText style={{ fontSize: 10, color: currColors.textSecondary }}>Inflow</ThemedText>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B30' }} />
                      <ThemedText style={{ fontSize: 10, color: currColors.textSecondary }}>Outflow</ThemedText>
                    </View>
                  </>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#34C759' }} />
                    <ThemedText style={{ fontSize: 10, color: currColors.textSecondary }}>Savings</ThemedText>
                  </View>
                )}
              </View>
            </View>

            {/* Trend Bar Chart Card */}
            <View style={[styles.trendChartCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
              <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                {trendMode === 'dual' ? (
                  <BarChart
                    data={dualBarChartData}
                    barWidth={11}
                    spacing={14}
                    noOfSections={4}
                    initialSpacing={8}
                    hideRules
                    yAxisThickness={0}
                    xAxisThickness={0}
                    yAxisTextStyle={{ color: currColors.textSecondary, fontSize: 9, fontFamily: 'Outfit_400Regular' }}
                    formatYLabel={(val) => formatAmount(Number(val))}
                  />
                ) : (
                  <BarChart
                    data={surplusBarChartData}
                    barWidth={18}
                    spacing={14}
                    noOfSections={4}
                    initialSpacing={10}
                    hideRules
                    yAxisThickness={0}
                    xAxisThickness={0}
                    yAxisTextStyle={{ color: currColors.textSecondary, fontSize: 9, fontFamily: 'Outfit_400Regular' }}
                    formatYLabel={(val) => formatAmount(Number(val))}
                  />
                )}
              </View>
            </View>

            {/* Month-by-Month History */}
            <View style={styles.sectionHeaderMargin}>
              <ThemedText style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
                MONTH-BY-MONTH CASH FLOW
              </ThemedText>
            </View>

            <View style={[styles.groupedListCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
              {[...monthlyTrends].reverse().map((item, index) => {
                const isLast = index === monthlyTrends.length - 1;
                const isPositive = item.surplus >= 0;
                return (
                  <View
                    key={item.monthKey}
                    style={[
                      styles.trendRowItem,
                      !isLast && { borderBottomWidth: 1, borderBottomColor: currColors.border },
                    ]}
                  >
                    <View>
                      <ThemedText style={[styles.trendMonthLabel, { color: currColors.text }]}>
                        {item.fullLabel}
                      </ThemedText>
                      <ThemedText style={[styles.trendMonthSub, { color: currColors.textSecondary }]}>
                        In: {formatAmount(item.income)} • Out: {formatAmount(item.expense)}
                      </ThemedText>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <ThemedText
                        style={[
                          styles.trendSurplusText,
                          { color: isPositive ? '#34C759' : '#FF3B30' },
                        ]}
                      >
                        {formatAmount(item.surplus, true)}
                      </ThemedText>
                      <View
                        style={[
                          styles.miniRateBadge,
                          { backgroundColor: isPositive ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)' },
                        ]}
                      >
                        <ThemedText
                          style={{
                            fontSize: 10,
                            fontFamily: 'Outfit_600SemiBold',
                            color: isPositive ? '#34C759' : '#FF3B30',
                          }}
                        >
                          {item.savingsRate.toFixed(0)}% saved
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}



      </ScrollView>

      {/* ─── Timeframe Picker Modal ─── */}
      <Modal visible={showTimeframeModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTimeframeModal(false)}
        >
          <View style={[styles.timeframeModalCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <ThemedText style={[styles.timeframeModalTitle, { color: currColors.textSecondary }]}>
              SELECT TIMEFRAME
            </ThemedText>

            {[
              { id: 'month', label: 'Monthly' },
              { id: 'quarter', label: 'Quarterly' },
              { id: 'year', label: 'Yearly' },
              { id: 'all', label: 'All Time' },
            ].map((tf) => {
              const isSelected = timeFrame === tf.id;
              return (
                <TouchableOpacity
                  key={tf.id}
                  style={[
                    styles.timeframeOptionRow,
                    isSelected && { backgroundColor: `${currColors.cardSecondary}` },
                  ]}
                  onPress={() => {
                    handleHaptic();
                    setTimeFrame(tf.id as TimeFrame);
                    setFocusedCategory(null);
                    setShowTimeframeModal(false);
                  }}
                >
                  <ThemedText
                    style={{
                      fontSize: 15,
                      fontFamily: isSelected ? 'Outfit_600SemiBold' : 'Outfit_400Regular',
                      color: isSelected ? '#00C9A7' : currColors.text,
                    }}
                  >
                    {tf.label}
                  </ThemedText>
                  {isSelected && <Check size={18} color="#00C9A7" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    fontFamily: 'Outfit_600SemiBold',
  },
  timeframePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  timeframePillText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  periodNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  navArrowBtn: {
    padding: 6,
  },
  periodNavLabel: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  periodNavSubtitle: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginTop: 1,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  heroLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.5,
  },
  heroValue: {
    fontSize: 24,
    fontFamily: 'Outfit_400Regular',
    marginBottom: 12,
  },
  dashedDivider: {
    borderStyle: 'dashed',
    borderWidth: 1,
    marginBottom: 12,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroRowLabel: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
  heroRowValue: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
  },
  segmentedTabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  segmentedTabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedTabText: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
  },
  subFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  miniToggleBar: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
  },
  miniTogglePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  sortButtonText: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
  },
  chartCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  pieWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendChartCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 14,
    overflow: 'hidden',
  },
  sectionHeaderMargin: {
    marginHorizontal: 4,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  groupedListCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  categoryRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  categoryRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  categoryIconSquare: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
  },
  rowProgressBarBG: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 1.5,
    marginTop: 6,
    width: '90%',
    overflow: 'hidden',
  },
  rowProgressBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  categoryRowRight: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
  },
  categoryPercent: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  trendRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  trendMonthLabel: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
  },
  trendMonthSub: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  trendSurplusText: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
  },
  miniRateBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  timeframeModalCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  timeframeModalTitle: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
    marginBottom: 12,
  },
  timeframeOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
});
