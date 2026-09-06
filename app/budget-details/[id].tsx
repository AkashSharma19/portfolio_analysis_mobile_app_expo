import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react-native';
import { PieChart } from 'react-native-gifted-charts';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { CategoryIcon } from '@/components/CategoryIcon';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function BudgetDetailsScreen() {
  const router = useRouter();
  const { id, year, month } = useLocalSearchParams<{ id: string; year?: string; month?: string }>();
  
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const {
    budgets,
    moneyTransactions,
    accounts,
    removeBudget,
    getCategorySpending,
    removeMoneyTransaction,
  } = useMoneyStore();

  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

  const selectedYear = useMemo(() => year ? parseInt(year) : new Date().getFullYear(), [year]);
  const selectedMonth = useMemo(() => month ? parseInt(month) : new Date().getMonth(), [month]);

  const budget = useMemo(() => {
    return budgets.find((b) => b.id === id);
  }, [id, budgets]);

  // Compute category spending
  const spendingDetails = useMemo(() => {
    if (!budget) return { totalSpent: 0, categories: [] };
    const spentMap = getCategorySpending(budget.id, selectedYear, selectedMonth);
    let totalSpent = 0;

    const categoriesWithSpending = budget.categories.map((cat) => {
      const spent = spentMap[cat.name] || 0;
      totalSpent += spent;
      return {
        ...cat,
        spent,
      };
    });

    return {
      totalSpent,
      categories: categoriesWithSpending,
    };
  }, [budget, getCategorySpending, selectedYear, selectedMonth]);

  // Get transactions falling inside the budget period
  const budgetTransactions = useMemo(() => {
    if (!budget) return [];
    const start = new Date(selectedYear, selectedMonth, 1, 0, 0, 0, 0).getTime();
    const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999).getTime();

    return moneyTransactions.filter((tx) => {
      if (tx.type !== 'expense') return false;
      const txTime = new Date(tx.date).getTime();
      return txTime >= start && txTime <= end;
    });
  }, [budget, moneyTransactions, selectedYear, selectedMonth]);

  const formatAmount = (val: number) => {
    if (isPrivacyMode) return '****';
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

  const handleDeleteBudget = () => {
    handleHaptic();
    if (!budget) return;
    
    Alert.alert(
      'Delete Budget',
      `Are you sure you want to delete "${budget.name}"? This will not delete your transactions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            removeBudget(budget.id);
            router.back();
          },
        },
      ]
    );
  };

  const handleDeleteTransaction = (txId: string) => {
    handleHaptic();
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            removeMoneyTransaction(txId);
          },
        },
      ]
    );
  };

  // Pie chart data
  const chartData = useMemo(() => {
    if (spendingDetails.categories.length === 0) return [];
    
    return spendingDetails.categories.map((c) => {
      // Avoid division by zero
      const val = c.spent || 0;
      return {
        value: val,
        color: c.color,
        text: isPrivacyMode ? '****' : `${c.name}: ${formatAmount(val)}`,
      };
    });
  }, [spendingDetails, isPrivacyMode]);

  // If budget has no spending, show empty indicator in chart
  const cleanChartData = useMemo(() => {
    if (spendingDetails.totalSpent === 0) {
      return [{ value: 100, color: currColors.cardSecondary, text: 'No Spending' }];
    }
    return chartData.filter((d) => d.value > 0);
  }, [chartData, spendingDetails, currColors]);

  if (!budget) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currColors.background }]}>
        <View style={styles.centered}>
          <ThemedText style={{ color: currColors.textSecondary }}>Budget not found.</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const overallPercentage = budget.totalLimit > 0 ? (spendingDetails.totalSpent / budget.totalLimit) * 100 : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currColors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: currColors.cardSecondary }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color={currColors.text} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: currColors.text }]} numberOfLines={1}>
          {budget.name} Details
        </ThemedText>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: currColors.cardSecondary }]}
            onPress={() => {
              handleHaptic();
              router.push({ pathname: '/add-budget', params: { id: budget.id } });
            }}
          >
            <Edit2 size={18} color="#00C9A7" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}
            onPress={handleDeleteBudget}
          >
            <Trash2 size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        {/* Pie / Donut Chart Card */}
        <View style={[styles.chartCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
          <View style={styles.pieWrapper}>
            <PieChart
              data={cleanChartData}
              donut
              radius={SCREEN_WIDTH * 0.22}
              innerRadius={SCREEN_WIDTH * 0.16}
              innerCircleColor={currColors.card}
              centerLabelComponent={() => (
                <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                  <ThemedText style={{ fontSize: 13, color: currColors.textSecondary, fontFamily: 'Outfit_500Medium' }}>
                    Spent
                  </ThemedText>
                  <ThemedText style={{ fontSize: 18, color: currColors.text, fontFamily: 'Outfit_600SemiBold', marginTop: 2 }}>
                    {formatAmount(spendingDetails.totalSpent)}
                  </ThemedText>
                </View>
              )}
            />
          </View>

          <View style={styles.overallLimitsRow}>
            <View style={styles.limitCol}>
              <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>TOTAL BUDGET</ThemedText>
              <ThemedText style={[styles.value, { color: currColors.text }]}>{formatAmount(budget.totalLimit)}</ThemedText>
            </View>
            <View style={styles.limitColEnd}>
              <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>REMAINING</ThemedText>
              <ThemedText style={[styles.value, { color: overallPercentage > 100 ? '#FF3B30' : '#00C9A7' }]}>
                {formatAmount(budget.totalLimit - spendingDetails.totalSpent)}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Categories List */}
        <View style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
            BUDGET BY CATEGORIES ({spendingDetails.categories.length})
          </ThemedText>
        </View>

        <View style={[styles.categoriesContainer, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
          {(() => {
            const filteredCats = spendingDetails.categories.filter((c) => c.limit > 0);
            return filteredCats.map((cat, index) => {
              const percentage = cat.limit > 0 ? (cat.spent / cat.limit) * 100 : 0;
              const isOverspent = cat.spent > cat.limit;

              return (
                <View
                  key={cat.id}
                  style={[
                    styles.catItem,
                    { borderBottomColor: currColors.border, borderBottomWidth: index === filteredCats.length - 1 ? 0 : 1 }
                  ]}
                >
                  <View style={styles.catRow}>
                    <View style={styles.catLeft}>
                      <CategoryIcon name={cat.icon} color={cat.color} size={16} style={{ marginRight: 8 }} />
                      <ThemedText style={[styles.catName, { color: currColors.text }]} numberOfLines={1}>
                        {cat.name}
                      </ThemedText>
                    </View>
                    <View style={styles.catRight}>
                      <ThemedText style={[styles.catSpent, { color: isOverspent ? '#FF3B30' : currColors.text }]}>
                        {formatAmount(cat.spent)}
                      </ThemedText>
                      <ThemedText style={[styles.catLimit, { color: currColors.textSecondary }]}>
                        / {formatAmount(cat.limit)}
                      </ThemedText>
                    </View>
                  </View>

                  {/* Progress bar */}
                  <View style={[styles.progressBackground, { backgroundColor: currColors.cardSecondary, marginTop: 10 }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(100, percentage)}%`,
                          backgroundColor: isOverspent ? '#FF3B30' : percentage > 85 ? '#FF9500' : '#00C9A7',
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.catFooter}>
                    <ThemedText style={{ fontSize: 11, color: isOverspent ? '#FF3B30' : currColors.textSecondary }}>
                      {isOverspent 
                        ? `Overspent by ${formatAmount(cat.spent - cat.limit)}` 
                        : `${formatAmount(cat.limit - cat.spent)} remaining`}
                    </ThemedText>
                    {isOverspent && <AlertTriangle size={12} color="#FF3B30" />}
                  </View>
                </View>
              );
            });
          })()}
        </View>

        {/* Transactions logged in this budget */}
        <View style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
            TRANSACTIONS IN THIS BUDGET PERIOD ({budgetTransactions.length})
          </ThemedText>
        </View>

        {budgetTransactions.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <ThemedText style={{ color: currColors.textSecondary, textAlign: 'center' }}>
              No expense transactions logged in this budget timeframe.
            </ThemedText>
          </View>
        ) : (
          <View style={[styles.txsList, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            {budgetTransactions.map((tx, index) => {
              const account = accounts.find((a) => a.id === tx.accountId);
              return (
                <View
                  key={tx.id}
                  style={[
                    styles.txItem,
                    { borderBottomColor: currColors.border, borderBottomWidth: index === budgetTransactions.length - 1 ? 0 : 1 }
                  ]}
                >
                  <View style={styles.txLeft}>
                    <View style={[styles.txIconBox, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                      <ArrowUpRight size={18} color="#FF3B30" />
                    </View>
                    <View style={styles.txInfo}>
                      <ThemedText style={[styles.txCategory, { color: currColors.text }]} numberOfLines={1}>
                        {tx.category}
                      </ThemedText>
                      <ThemedText style={[styles.txDate, { color: currColors.textSecondary }]}>
                        {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {account ? ` • ${account.name}` : ''}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.txRight}>
                    <ThemedText style={styles.txAmount}>
                      -{formatAmount(tx.amount)}
                    </ThemedText>
                    <TouchableOpacity
                      style={styles.deleteTxBtn}
                      onPress={() => handleDeleteTransaction(tx.id)}
                    >
                      <Trash2 size={14} color={currColors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  chartCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginTop: 8,
    alignItems: 'center',
  },
  pieWrapper: {
    height: SCREEN_WIDTH * 0.48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overallLimitsRow: {
    flexDirection: 'row',
    width: '100%',
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(128,128,128,0.2)',
    paddingTop: 16,
    marginTop: 10,
  },
  limitCol: {
    flex: 1,
  },
  limitColEnd: {
    flex: 1,
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
  },
  sectionHeader: {
    marginHorizontal: 16,
    marginTop: 28,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  categoriesContainer: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  catItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1.2,
    marginRight: 10,
  },
  catName: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    flex: 1,
  },
  catRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    flex: 1,
  },
  catSpent: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  catLimit: {
    fontSize: 11,
  },
  progressBackground: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  catFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  emptyCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
  },
  txsList: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
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
    fontFamily: 'Outfit_600SemiBold',
  },
  txDate: {
    fontSize: 11,
    marginTop: 2,
  },
  txRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  txAmount: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    color: '#FF3B30',
  },
  deleteTxBtn: {
    padding: 4,
  },
});
