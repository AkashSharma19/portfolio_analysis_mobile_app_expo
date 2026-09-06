import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Svg, Circle } from 'react-native-svg';
import {
  CreditCard,
  Landmark,
  PiggyBank,
  ArrowRightLeft,
  ArrowRight,
  Wallet,
  Activity,
  Calendar,
  Info,
  Layers,
  Eye,
  EyeOff,
  PieChart,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  Repeat,
  Tv,
  Music,
  Youtube,
  ShoppingBag,
  Cloud,
  Gamepad2,
  Sparkles,
  TrendingUp,
  Target,
} from 'lucide-react-native';

import { ThemedText } from './ThemedText';
import { CategoryIcon } from './CategoryIcon';
import { useColorScheme } from './useColorScheme';
import Colors from '../constants/Colors';
import { useMoneyStore } from '../store/useMoneyStore';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { useGoalStore } from '../store/useGoalStore';
import { MoneyTransaction } from '../types/money';
import { MoneyActivityCalendar } from './MoneyActivityCalendar';
import { FinancialGoalsCard } from './FinancialGoalsCard';
import { useMoneyInsights } from '../hooks/useMoneyInsights';

const getSubscriptionIcon = (logoName: string | undefined) => {
  switch (logoName) {
    case 'tv':
      return Tv;
    case 'music':
      return Music;
    case 'youtube':
      return Youtube;
    case 'shopping-bag':
      return ShoppingBag;
    case 'sparkles':
      return Sparkles;
    case 'cloud':
      return Cloud;
    case 'gamepad-2':
      return Gamepad2;
    case 'layers':
      return Layers;
    default:
      return Repeat;
  }
};

interface DonutChartProps {
  warnings: number;
  tips: number;
  success: number;
  size: number;
  trackColor: string;
  textColor: string;
  isPrivacyMode: boolean;
}

const MoneyInsightsDonut = ({
  warnings,
  tips,
  success,
  size,
  trackColor,
  textColor,
  isPrivacyMode,
}: DonutChartProps) => {
  const r = size * 0.38;
  const center = size / 2;
  const circum = 2 * Math.PI * r;
  const total = warnings + tips + success;

  if (total === 0) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={center}
            cy={center}
            r={r}
            stroke={trackColor}
            strokeWidth={size * 0.08}
            strokeDasharray="4 4"
            fill="none"
          />
        </Svg>
        <View style={styles.chartCenterBox}>
          <Sparkles size={18} color="#00C9A7" />
          <ThemedText style={[styles.chartCenterSub, { color: textColor, marginTop: 2 }]}>
            AI AUDIT
          </ThemedText>
        </View>
      </View>
    );
  }

  const warnStroke = (warnings / total) * circum;
  const tipsStroke = (tips / total) * circum;
  const successStroke = (success / total) * circum;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={trackColor}
          strokeWidth={size * 0.08}
          fill="none"
        />
        {warnings > 0 && (
          <Circle
            cx={center}
            cy={center}
            r={r}
            stroke="#FF3B30"
            strokeWidth={size * 0.08}
            strokeDasharray={`${warnStroke} ${circum}`}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(-90 ${center} ${center})`}
          />
        )}
        {tips > 0 && (
          <Circle
            cx={center}
            cy={center}
            r={r}
            stroke="#00C9A7"
            strokeWidth={size * 0.08}
            strokeDasharray={`${tipsStroke} ${circum}`}
            strokeDashoffset={-warnStroke}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(-90 ${center} ${center})`}
          />
        )}
        {success > 0 && (
          <Circle
            cx={center}
            cy={center}
            r={r}
            stroke="#34C759"
            strokeWidth={size * 0.08}
            strokeDasharray={`${successStroke} ${circum}`}
            strokeDashoffset={-(warnStroke + tipsStroke)}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(-90 ${center} ${center})`}
          />
        )}
      </Svg>
      <View style={styles.chartCenterBox}>
        <ThemedText style={[styles.chartCenterNum, { color: '#00C9A7' }]}>
          {isPrivacyMode ? '**' : total}
        </ThemedText>
        <ThemedText style={[styles.chartCenterSub, { color: textColor }]}>
          SIGNALS
        </ThemedText>
      </View>
    </View>
  );
};

interface GaugeProps {
  score: number;
  size: number;
  color: string;
  trackColor: string;
  textColor: string;
  isPrivacyMode: boolean;
}

const HealthScoreGauge = ({
  score,
  size,
  color,
  trackColor,
  textColor,
  isPrivacyMode,
}: GaugeProps) => {
  const r = size * 0.38;
  const center = size / 2;
  const circum = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, score));
  const offset = circum - (clamped / 100) * circum;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={trackColor}
          strokeWidth={size * 0.08}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={color}
          strokeWidth={size * 0.08}
          strokeDasharray={`${circum} ${circum}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={styles.chartCenterBox}>
        <ThemedText style={[styles.chartCenterNum, { color }]}>
          {isPrivacyMode ? '**' : score}
        </ThemedText>
        <ThemedText style={[styles.chartCenterSub, { color: textColor }]}>
          HEALTH
        </ThemedText>
      </View>
    </View>
  );
};

export function MoneyDashboard() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const currColors = Colors[colorScheme];

  const [insightsCardWidth, setInsightsCardWidth] = useState(130);
  const [healthCardWidth, setHealthCardWidth] = useState(130);

  // Stores
  const {
    accounts,
    moneyTransactions,
    loans,
    subscriptions,
    emiPayments,
    budgets,
    getNetWorth,
    getMonthlyEMIBurden,
    getMonthlySubscriptionBurden,
  } = useMoneyStore();

  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const togglePrivacyMode = usePortfolioStore((state) => state.togglePrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);
  const goals = useGoalStore((state) => state.goals);
  const { count: insightsCount, countByType } = useMoneyInsights();

  // Subscribe to portfolio transactions and tickers so net worth updates live
  const portfolioTransactions = usePortfolioStore((state) => state.transactions);
  const portfolioTickers = usePortfolioStore((state) => state.tickers);

  // Filter state for transactions list
  const [activeFilter, setActiveFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');

  // Computations
  const netWorth = getNetWorth();
  const monthlyEMIs = getMonthlyEMIBurden();
  const monthlySubscriptions = getMonthlySubscriptionBurden();

  // Upcoming Payments calculation (within next 14 days, and past 30 days overdue)
  const upcomingPayments = useMemo(() => {
    const today = new Date();
    const fourteenDaysLater = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    fourteenDaysLater.setHours(23, 59, 59, 999);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const list: Array<{
      id: string;
      targetId: string;
      name: string;
      amount: number;
      date: Date;
      type: 'emi' | 'subscription';
      color: string;
      logo?: string;
    }> = [];

    // 1. Process active loans for EMIs
    loans.forEach((loan) => {
      if (loan.isActive && loan.emiAmount > 0) {
        const start = new Date(loan.startDate);
        const day = start.getDate();

        // Check if an EMI payment has already been logged in the current calendar month
        const hasPaidThisMonth = emiPayments.some(
          (p) =>
            p.loanId === loan.id &&
            new Date(p.date).getMonth() === today.getMonth() &&
            new Date(p.date).getFullYear() === today.getFullYear()
        );

        let nextDue = new Date(today.getFullYear(), today.getMonth(), day);
        if (nextDue.getMonth() !== today.getMonth()) {
          nextDue = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }

        // If paid this month, the next installment is next month
        if (hasPaidThisMonth) {
          nextDue = new Date(today.getFullYear(), today.getMonth() + 1, day);
          if (nextDue.getMonth() !== (today.getMonth() + 1) % 12) {
            nextDue = new Date(today.getFullYear(), today.getMonth() + 2, 0);
          }
        }

        // Ensure next due date is not before the loan starts
        if (nextDue < start) {
          nextDue = new Date(start);
        }

        const endLimit = new Date(loan.endDate);
        if (nextDue <= endLimit && nextDue >= thirtyDaysAgo && nextDue <= fourteenDaysLater) {
          list.push({
            id: `emi-${loan.id}`,
            targetId: loan.id,
            name: `${loan.name} EMI`,
            amount: loan.emiAmount,
            date: nextDue,
            type: 'emi',
            color: loan.type === 'home' ? '#FF9500' : loan.type === 'car' ? '#007AFF' : '#AF52DE',
          });
        }
      }
    });

    // 2. Process active subscriptions
    subscriptions.forEach((sub) => {
      if (sub.isActive && sub.amount > 0 && sub.nextPaymentDate) {
        const nextDue = new Date(sub.nextPaymentDate);
        if (nextDue >= thirtyDaysAgo && nextDue <= fourteenDaysLater) {
          list.push({
            id: `sub-${sub.id}`,
            targetId: sub.id,
            name: sub.name,
            amount: sub.amount,
            date: nextDue,
            type: 'subscription',
            color: sub.color || '#00C9A7',
            logo: sub.logo,
          });
        }
      }
    });

    // Sort chronologically
    return list.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [loans, subscriptions, emiPayments]);

  // Monthly income/expense computations
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

    let income = 0;
    let expense = 0;

    moneyTransactions.forEach((tx) => {
      const txTime = new Date(tx.date).getTime();
      if (txTime >= startOfMonth && txTime <= endOfMonth) {
        if (tx.type === 'income') income += tx.amount;
        else if (tx.type === 'expense') expense += tx.amount;
      }
    });

    const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;

    return { income, expense, savingsRate };
  }, [moneyTransactions]);

  // "Safe-to-Spend" Daily Run-Rate Calculation (from active Wallet & Savings accounts with include in assets ON)
  const safeToSpend = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDate();
    const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = Math.max(1, totalDaysInMonth - currentDay + 1);

    // Sum balances of active Wallet and Savings accounts with includeInAssets !== false
    const liquidPool = (accounts || [])
      .filter(
        (acc) =>
          !acc.isArchived &&
          acc.includeInAssets !== false &&
          (acc.type === 'wallet' || acc.type === 'savings')
      )
      .reduce((sum, acc) => sum + Math.max(0, acc.balance), 0);

    const dailyAmount = liquidPool > 0 ? liquidPool / daysRemaining : 0;

    return {
      amount: dailyAmount,
      liquidPool,
      daysRemaining,
    };
  }, [accounts]);

  // Calculate Financial Health Score & Grade for the dashboard button
  const healthSummary = useMemo(() => {
    // 1. Calculate Average Monthly Income & Expense (Based on last 90 Days / 3 Months)
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).getTime();

    let totalIncome90d = 0;
    let totalExpense90d = 0;
    let daysDiff = 90;

    const txTimes = moneyTransactions.map((t) => new Date(t.date).getTime());
    if (txTimes.length > 0) {
      const oldestTx = Math.min(...txTimes);
      const computedDays = Math.max(1, (now.getTime() - oldestTx) / (24 * 60 * 60 * 1000));
      daysDiff = Math.min(90, Math.round(computedDays));
    }

    moneyTransactions.forEach((tx) => {
      const txTime = new Date(tx.date).getTime();
      if (txTime >= now.getTime() - daysDiff * 24 * 60 * 60 * 1000) {
        if (tx.type === 'income') totalIncome90d += tx.amount;
        else if (tx.type === 'expense') totalExpense90d += tx.amount;
      }
    });

    const incomeAvgMonthly = daysDiff > 0 ? (totalIncome90d / daysDiff) * 30 : 0;
    const expenseAvgMonthly = daysDiff > 0 ? (totalExpense90d / daysDiff) * 30 : 0;

    // A. Savings Rate (All-time cumulative savings rate)
    let allTimeIncome = 0;
    let allTimeExpense = 0;
    moneyTransactions.forEach((tx) => {
      if (tx.type === 'income') allTimeIncome += tx.amount;
      else if (tx.type === 'expense') allTimeExpense += tx.amount;
    });
    const allTimeSavings = allTimeIncome - allTimeExpense;
    const savingsRate = allTimeIncome > 0 ? (allTimeSavings / allTimeIncome) * 100 : 0;

    let liquidCash = 0;
    let ccDebt = 0;
    let ccLimit = 0;
    let receivables = 0;
    let payables = 0;
    let investmentsVal = 0;

    let brokerAllocations: any[] = [];
    try {
      brokerAllocations = usePortfolioStore.getState().getAllocationData('Broker');
    } catch (e) {
      console.error('Failed to get broker allocations in dashboard health score:', e);
    }

    accounts.forEach((acc) => {
      if (!acc.isArchived) {
        if (acc.type === 'wallet' || acc.type === 'savings' || acc.type === 'emergency_fund') {
          liquidCash += Math.max(0, acc.balance);
        } else if (acc.type === 'credit_card') {
          ccDebt += Math.abs(acc.balance);
          ccLimit += acc.creditLimit || 0;
        } else if (acc.type === 'receivable') {
          receivables += Math.max(0, acc.balance);
        } else if (acc.type === 'payable') {
          payables += Math.abs(acc.balance);
        } else if (acc.type === 'investment') {
          if (acc.linkedBroker) {
            const allocation = brokerAllocations.find(
              (b) => b.name.toLowerCase().trim() === acc.linkedBroker!.toLowerCase().trim()
            );
            investmentsVal += allocation ? allocation.value : 0;
          } else {
            investmentsVal += Math.max(0, acc.balance);
          }
        }
      }
    });

    const emiBurden = getMonthlyEMIBurden();
    const dtiRatio = incomeAvgMonthly > 0 ? (emiBurden / incomeAvgMonthly) * 100 : 0;

    let blockedEmiAmount = 0;
    loans.forEach((loan) => {
      if (loan.isActive && loan.linkedAccountId) {
        const acc = accounts.find((a) => a.id === loan.linkedAccountId);
        if (acc && acc.type === 'credit_card') {
          blockedEmiAmount += loan.outstandingAmount;
        }
      }
    });

    const totalCCSpent = ccDebt + blockedEmiAmount;
    const creditUtilization = ccLimit > 0 ? (totalCCSpent / ccLimit) * 100 : 0;

    const totalAssets = liquidCash + receivables + investmentsVal;
    const shortTermLiabilities = ccDebt + payables;
    const quickRatio = shortTermLiabilities > 0 ? (liquidCash + receivables - payables) / shortTermLiabilities : (liquidCash + receivables - payables) > 0 ? 9.9 : 0;

    // --- Scoring Algorithm (Max 100) ---
    // 1. Savings Rate Score (Max 20 points)
    let savingsScore = 0;
    if (savingsRate >= 20) savingsScore = 20;
    else if (savingsRate > 0) savingsScore = (savingsRate / 20) * 20;

    const monthlyExpense = expenseAvgMonthly || 10000;
    const emergencyCoverMonths = Math.max(0, liquidCash / monthlyExpense);

    // 2. Emergency Fund Score (Max 20 points)
    let emergencyScore = 0;
    if (emergencyCoverMonths >= 3) emergencyScore = 20;
    else emergencyScore = (emergencyCoverMonths / 3) * 20;

    // 3. DTI Score (Max 20 points)
    let dtiScore = 0;
    if (dtiRatio <= 15) dtiScore = 20;
    else if (dtiRatio >= 45) dtiScore = 0;
    else dtiScore = 20 * (1 - (dtiRatio - 15) / 30);

    // 4. Credit Utilization Score (Max 15 points)
    let utilizationScore = 15; // Default full marks if no credit limits
    if (ccLimit > 0) {
      if (creditUtilization <= 30) utilizationScore = 15;
      else if (creditUtilization >= 80) utilizationScore = 0;
      else utilizationScore = 15 * (1 - (creditUtilization - 30) / 50);
    }

    // 5. Asset Allocation Score (Max 15 points)
    let allocationScore = 15;
    if (totalAssets > 0) {
      const ratio = investmentsVal / totalAssets;
      if (ratio >= 0.30 && ratio <= 0.70) allocationScore = 15;
      else if ((ratio >= 0.10 && ratio < 0.30) || (ratio > 0.70 && ratio <= 0.85)) allocationScore = 10;
      else allocationScore = 5;
    }

    // 6. Quick Ratio Score (Max 10 points)
    let quickRatioScore = 10;
    if (shortTermLiabilities > 0) {
      if (quickRatio >= 1.5) quickRatioScore = 10;
      else if (quickRatio >= 1.0) quickRatioScore = 7;
      else quickRatioScore = 2;
    }

    const totalScore = Math.round(savingsScore + emergencyScore + dtiScore + utilizationScore + allocationScore + quickRatioScore);

    let grade = 'D';
    let gradeColor = '#FF3B30';
    if (totalScore >= 90) {
      grade = 'A+';
      gradeColor = '#34C759';
    } else if (totalScore >= 80) {
      grade = 'A';
      gradeColor = '#34C759';
    } else if (totalScore >= 70) {
      grade = 'B';
      gradeColor = '#00C9A7';
    } else if (totalScore >= 55) {
      grade = 'C';
      gradeColor = '#FF9500';
    }

    return { totalScore, grade, gradeColor };
  }, [moneyTransactions, accounts, loans, getMonthlyEMIBurden]);

  // Filter and limit recent transactions to show only the last transaction date's data, capped at 3
  const filteredRecentTxs = useMemo(() => {
    let list = moneyTransactions;
    if (activeFilter !== 'all') {
      list = list.filter((tx) => tx.type === activeFilter);
    }

    if (list.length === 0) return [];

    const lastTxDateStr = new Date(list[0].date).toDateString();
    const sameDayTxs = list.filter((tx) => new Date(tx.date).toDateString() === lastTxDateStr);

    return sameDayTxs.slice(0, 3);
  }, [moneyTransactions, activeFilter]);

  // Chronologically group the filtered recent transactions
  const groupedTxs = useMemo(() => {
    const groups: { title: string; data: MoneyTransaction[] }[] = [];
    const today = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    filteredRecentTxs.forEach((tx) => {
      const dateObj = new Date(tx.date);
      const txDateStr = dateObj.toDateString();
      let title = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      if (txDateStr === today) {
        title = 'Today';
      } else if (txDateStr === yesterdayStr) {
        title = 'Yesterday';
      }

      const existing = groups.find((g) => g.title === title);
      if (existing) {
        existing.data.push(tx);
      } else {
        groups.push({ title, data: [tx] });
      }
    });
    return groups;
  }, [filteredRecentTxs]);

  const formatAmount = (val: number) => {
    if (isPrivacyMode) return '••••••';
    const formatted = Math.abs(val).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    const prefix = val < 0 ? '-' : '';
    const symbol = showCurrencySymbol ? '₹' : '';
    return `${prefix}${symbol}${formatted}`;
  };

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const activeFilterBg = '#00C9A7';

  return (
    <View style={[styles.container, { backgroundColor: currColors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ─── Hero Card (flat, matching investments) ─── */}
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
              style={[
                styles.heroLabel,
                { color: currColors.textSecondary },
              ]}
            >
              TOTAL NET WORTH
            </ThemedText>
            <View style={styles.heroIcons}>
              <TouchableOpacity
                onPress={() => {
                  handleHaptic();
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
                  handleHaptic();
                  router.push('/money-analytics');
                }}
                style={[
                  styles.iconButton,
                  { backgroundColor: currColors.cardSecondary },
                ]}
              >
                <PieChart size={16} color={currColors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <ThemedText style={[styles.heroValue, { color: currColors.text }]}>
            {formatAmount(netWorth)}
          </ThemedText>

          <View
            style={[
              styles.dashedDivider,
              { borderColor: currColors.border },
            ]}
          />

          {/* Stat rows — matching investments heroRow pattern */}
          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>
              This month income
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: '#34C759' }]}>
              {isPrivacyMode ? '••••••' : `+${formatAmount(monthlyStats.income)}`}
            </ThemedText>
          </View>

          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>
              This month expenses
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: '#FF3B30' }]}>
              {isPrivacyMode ? '••••••' : `-${formatAmount(monthlyStats.expense)} (${(monthlyStats.income > 0 ? (monthlyStats.expense / monthlyStats.income) * 100 : 0).toFixed(0)}%)`}
            </ThemedText>
          </View>

          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>
              Monthly EMIs
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: currColors.text }]}>
              {isPrivacyMode ? '••••••' : `${formatAmount(monthlyEMIs)} (${(monthlyStats.income > 0 ? (monthlyEMIs / monthlyStats.income) * 100 : 0).toFixed(0)}%)`}
            </ThemedText>
          </View>

          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>
              Monthly Subscriptions
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: currColors.text }]}>
              {isPrivacyMode ? '••••••' : `${formatAmount(monthlySubscriptions)} (${(monthlyStats.income > 0 ? (monthlySubscriptions / monthlyStats.income) * 100 : 0).toFixed(0)}%)`}
            </ThemedText>
          </View>

          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>
              Savings rate
            </ThemedText>
            <ThemedText
              style={[
                styles.heroRowValue,
                {
                  color: isPrivacyMode
                    ? currColors.text
                    : monthlyStats.savingsRate >= 20
                    ? '#34C759'
                    : monthlyStats.savingsRate > 0
                    ? '#FF9500'
                    : '#FF3B30',
                },
              ]}
            >
              {isPrivacyMode ? '••••••' : `${formatAmount(monthlyStats.income - monthlyStats.expense)} (${monthlyStats.savingsRate.toFixed(0)}%)`}
            </ThemedText>
          </View>

          <View style={[styles.heroRow, { marginBottom: 0 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ThemedText style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>
                Safe-to-Spend
              </ThemedText>
              <View style={[styles.daysLeftPill, { backgroundColor: currColors.cardSecondary }]}>
                <ThemedText style={{ fontSize: 10, fontFamily: 'Outfit_500Medium', color: currColors.textSecondary }}>
                  {safeToSpend.daysRemaining}d left
                </ThemedText>
              </View>
            </View>
            <ThemedText
              style={[
                styles.heroRowValue,
                {
                  color: isPrivacyMode
                    ? currColors.text
                    : safeToSpend.amount > 0
                    ? '#00C9A7'
                    : '#FF3B30',
                },
              ]}
            >
              {isPrivacyMode ? '••••••' : `${formatAmount(safeToSpend.amount)}/day`}
            </ThemedText>
          </View>
        </View>

        {/* ─── Smart Insights & Health Score (Analytics-based Row) ─── */}
        <View style={styles.compactRow}>
          {/* Smart Insights Analytics Donut Card */}
          <TouchableOpacity
            style={[
              styles.compactDashboardCard,
              {
                backgroundColor: currColors.card,
                borderColor: currColors.border,
              },
            ]}
            activeOpacity={0.75}
            onLayout={(e) => setInsightsCardWidth(e.nativeEvent.layout.width - 32)}
            onPress={() => {
              handleHaptic();
              router.push('/money-insights');
            }}
          >
            <View style={styles.compactCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Sparkles size={12} color={currColors.textSecondary} />
                <ThemedText style={[styles.compactCardSectionLabel, { color: currColors.textSecondary }]}>
                  AI INSIGHTS
                </ThemedText>
              </View>
              <View style={[styles.iconCircleSmall, { backgroundColor: currColors.cardSecondary }]}>
                <ArrowRight size={12} color={currColors.tint} />
              </View>
            </View>

            <View style={styles.compactMain}>
              <MoneyInsightsDonut
                warnings={countByType.warning}
                tips={countByType.tip}
                success={countByType.success}
                size={Math.max(70, Math.min(95, insightsCardWidth * 0.82))}
                trackColor={isDark ? '#2C2C2E' : '#E5E5EA'}
                textColor={currColors.textSecondary}
                isPrivacyMode={isPrivacyMode}
              />
            </View>

            <View
              style={[
                styles.compactFooterBadge,
                {
                  backgroundColor: 'rgba(0, 201, 167, 0.12)',
                  borderColor: 'rgba(0, 201, 167, 0.25)',
                },
              ]}
            >
              <ThemedText style={[styles.compactFooterBadgeText, { color: '#00C9A7' }]} numberOfLines={1}>
                {insightsCount > 0
                  ? `${countByType.warning > 0 ? `${countByType.warning}W • ` : ''}${countByType.tip + countByType.success} TIPS`
                  : 'RUN AI AUDIT'}
              </ThemedText>
            </View>
          </TouchableOpacity>

          {/* Health Score Gauge Card */}
          <TouchableOpacity
            style={[
              styles.compactDashboardCard,
              {
                backgroundColor: currColors.card,
                borderColor: currColors.border,
              },
            ]}
            activeOpacity={0.75}
            onLayout={(e) => setHealthCardWidth(e.nativeEvent.layout.width - 32)}
            onPress={() => {
              handleHaptic();
              router.push('/money-health');
            }}
          >
            <View style={styles.compactCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Activity size={12} color={currColors.textSecondary} />
                <ThemedText style={[styles.compactCardSectionLabel, { color: currColors.textSecondary }]}>
                  HEALTH SCORE
                </ThemedText>
              </View>
              <View style={[styles.iconCircleSmall, { backgroundColor: currColors.cardSecondary }]}>
                <ArrowRight size={12} color={currColors.tint} />
              </View>
            </View>

            <View style={styles.compactMain}>
              <HealthScoreGauge
                score={healthSummary.totalScore}
                size={Math.max(70, Math.min(95, healthCardWidth * 0.82))}
                color={healthSummary.gradeColor}
                trackColor={isDark ? '#2C2C2E' : '#E5E5EA'}
                textColor={currColors.textSecondary}
                isPrivacyMode={isPrivacyMode}
              />
            </View>

            <View
              style={[
                styles.compactFooterBadge,
                {
                  backgroundColor: `${healthSummary.gradeColor}18`,
                  borderColor: `${healthSummary.gradeColor}30`,
                },
              ]}
            >
              <ThemedText style={[styles.compactFooterBadgeText, { color: healthSummary.gradeColor }]} numberOfLines={1}>
                GRADE {healthSummary.grade} • {healthSummary.totalScore >= 80 ? 'EXCELLENT' : healthSummary.totalScore >= 70 ? 'GOOD' : healthSummary.totalScore >= 55 ? 'FAIR' : 'NEEDS WORK'}
              </ThemedText>
            </View>
          </TouchableOpacity>
        </View>

        {/* ─── Financial Goals & Milestones Analytics Card ─── */}
        <FinancialGoalsCard />

        {/* ─── Upcoming Payments (EMI + Subscriptions) ─── */}
        <View
          style={[
            styles.accordionContainer,
            {
              backgroundColor: currColors.card,
              borderColor: currColors.border,
            },
          ]}
        >
          <View style={styles.headerWithAction}>
            <ThemedText
              style={[
                styles.innerSectionTitle,
                { color: currColors.textSecondary },
              ]}
            >
              UPCOMING PAYMENTS (14 DAYS)
            </ThemedText>
            <TouchableOpacity
              onPress={() => {
                handleHaptic();
                router.push('/(tabs)/money-loans');
              }}
              style={styles.viewMoreButton}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: currColors.cardSecondary },
                ]}
              >
                <ChevronRight size={14} color={currColors.tint} />
              </View>
            </TouchableOpacity>
          </View>

          {upcomingPayments.length === 0 ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ThemedText style={{ color: currColors.textSecondary, fontSize: 13, fontFamily: 'Outfit_400Regular' }}>
                No payments due in the next 14 days.
              </ThemedText>
            </View>
          ) : (
            upcomingPayments.map((payment, index, arr) => {
              const isLast = index === arr.length - 1;
              const d1 = new Date(payment.date);
              d1.setHours(0, 0, 0, 0);
              const d2 = new Date();
              d2.setHours(0, 0, 0, 0);
              const diffDays = Math.round((d1.getTime() - d2.getTime()) / (24 * 60 * 60 * 1000));
              
              let dueLabel = `Due in ${diffDays} days`;
              let dueColor = currColors.textSecondary;

              if (diffDays === 0) {
                dueLabel = 'Due today';
                dueColor = '#FF9500';
              } else if (diffDays === 1) {
                dueLabel = 'Due tomorrow';
                dueColor = '#FF9500';
              } else if (diffDays < 0) {
                dueLabel = `Overdue by ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'day' : 'days'}`;
                dueColor = '#FF3B30';
              }

              const IconComponent = payment.type === 'emi' ? Landmark : getSubscriptionIcon(payment.logo);

              return (
                <TouchableOpacity
                  key={payment.id}
                  style={[
                    styles.accountRow,
                    { borderBottomColor: currColors.border },
                    isLast && { borderBottomWidth: 0 },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    handleHaptic();
                    if (payment.type === 'emi') {
                      router.push(`/loan-details/${payment.targetId}`);
                    } else {
                      router.push(`/subscription-details/${payment.targetId}`);
                    }
                  }}
                >
                  <View style={[styles.accountRowLeft, { flex: 1, marginRight: 16 }]}>
                    <View style={[styles.accountIconBox, { backgroundColor: `${payment.color}15` }]}>
                      <IconComponent size={16} color={payment.color} />
                    </View>
                    <View style={{ flex: 1, gap: 2, marginLeft: 12 }}>
                      <ThemedText style={{ color: currColors.text, fontSize: 14, fontFamily: 'Outfit_500Medium' }} numberOfLines={1}>
                        {payment.name}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 11, color: dueColor, fontFamily: 'Outfit_400Regular' }} numberOfLines={1}>
                        {dueLabel} • {payment.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText style={[styles.accountRowValue, { color: currColors.text, fontFamily: 'Outfit_600SemiBold', flexShrink: 0 }]}>
                    {formatAmount(payment.amount)}
                  </ThemedText>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* ─── Recent Transactions Card ─── */}
        <View
          style={[
            styles.accordionContainer,
            {
              backgroundColor: currColors.card,
              borderColor: currColors.border,
            },
          ]}
        >
          <View style={styles.headerWithAction}>
            <ThemedText
              style={[
                styles.innerSectionTitle,
                { color: currColors.textSecondary },
              ]}
            >
              RECENT TRANSACTIONS
            </ThemedText>
            <TouchableOpacity
              onPress={() => {
                handleHaptic();
                router.push('/all-money-transactions');
              }}
              style={styles.viewMoreButton}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: currColors.cardSecondary },
                ]}
              >
                <ChevronRight size={14} color={currColors.tint} />
              </View>
            </TouchableOpacity>
          </View>

          {filteredRecentTxs.length === 0 ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ThemedText style={{ color: currColors.textSecondary, textAlign: 'center', fontFamily: 'Outfit_400Regular', fontSize: 13, lineHeight: 18, paddingHorizontal: 12 }}>
                No transactions logged yet.
              </ThemedText>
            </View>
          ) : (
            filteredRecentTxs.map((tx, index) => {
              const account = accounts.find((a) => a.id === tx.accountId);
              const toAccount = tx.toAccountId ? accounts.find((a) => a.id === tx.toAccountId) : null;
              const isLast = index === filteredRecentTxs.length - 1;

              const getRelativeDateLabel = (dateStr: string) => {
                const d = new Date(dateStr);
                d.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                yesterday.setHours(0, 0, 0, 0);

                if (d.getTime() === today.getTime()) {
                  return 'Today';
                } else if (d.getTime() === yesterday.getTime()) {
                  return 'Yesterday';
                } else {
                  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                }
              };

              return (
                <TouchableOpacity
                  key={tx.id}
                  style={[
                    styles.txItem,
                    {
                      borderBottomColor: currColors.border,
                      borderBottomWidth: isLast ? 0 : 1,
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    handleHaptic();
                    router.push({ pathname: '/add-money-transaction', params: { id: tx.id } });
                  }}
                >
                  <View style={styles.txLeft}>
                    <View
                      style={[
                        styles.txIconBox,
                        {
                          backgroundColor:
                            tx.type === 'income'
                              ? 'rgba(52, 199, 89, 0.1)'
                              : tx.type === 'expense'
                              ? 'rgba(255, 59, 48, 0.1)'
                              : 'rgba(142, 142, 147, 0.1)',
                        },
                      ]}
                    >
                      {tx.type === 'transfer' ? (
                        <ArrowRightLeft size={18} color="#8E8E93" />
                      ) : (
                        <CategoryIcon
                          name={tx.category}
                          size={18}
                          color={tx.type === 'income' ? '#34C759' : '#FF3B30'}
                        />
                      )}
                    </View>
                    <View style={styles.txInfo}>
                      <ThemedText style={[styles.txCategory, { color: currColors.text }]} numberOfLines={1}>
                        {tx.type === 'transfer' ? `Transfer: ${account?.name} → ${toAccount?.name}` : tx.category}
                      </ThemedText>
                      <ThemedText style={[styles.txDate, { color: currColors.textSecondary }]} numberOfLines={1}>
                        {getRelativeDateLabel(tx.date)} • {account?.name || 'Unknown Account'}
                        {tx.note ? ` • ${tx.note}` : ''}
                      </ThemedText>
                    </View>
                  </View>

                  <ThemedText
                    style={[
                      styles.txAmount,
                      {
                        color:
                          tx.type === 'income'
                            ? '#34C759'
                            : tx.type === 'expense'
                            ? '#FF3B30'
                            : currColors.text,
                      },
                    ]}
                  >
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                    {formatAmount(tx.amount)}
                  </ThemedText>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* ─── Activity Calendar ─── */}
        <MoneyActivityCalendar transactions={moneyTransactions} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
  },

  // ─── Hero Card ───
  heroCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroLabel: {
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
    fontFamily: 'Outfit_400Regular',
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
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  heroRowValue: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
  },
  daysLeftPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },

  // ─── Compact Side-by-Side Row ───
  compactRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    alignItems: 'stretch',
  },
  compactDashboardCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  compactCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  compactCardSectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  iconCircleSmall: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactMain: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  chartCenterBox: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartCenterNum: {
    fontSize: 17,
    fontFamily: 'Outfit_500Medium',
    lineHeight: 20,
  },
  chartCenterSub: {
    fontSize: 8,
    fontFamily: 'Outfit_500Medium',
    letterSpacing: 1,
  },
  compactFooterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactFooterBadgeText: {
    fontSize: 10,
    fontFamily: 'Outfit_500Medium',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // ─── Health / Goals Banner ───
  healthBannerCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  toolIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthBadgeText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },

  // ─── Accordion-Style Containers (Upcoming & Recent) ───
  accordionContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 16,
  },
  headerWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  innerSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  viewMoreButton: {
    padding: 2,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  accountRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountRowLabel: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    marginLeft: 12,
  },
  accountRowValue: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
  },

  // ─── Transaction Items ───
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  txIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txInfo: {
    marginLeft: 12,
    flex: 1,
  },
  txCategory: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
  },
  txDate: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
  },
});
