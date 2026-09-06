import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import {
  Sliders,
  PiggyBank,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Info,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { CategoryIcon } from '@/components/CategoryIcon';

export default function BudgetsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const { budgets, getCategorySpending, addBudget, updateBudget, categories: storeCategories } = useMoneyStore();
  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

  const CATEGORY_META: { [key: string]: string } = {
    'Food & Dining': '#FF3B30',
    'Rent & Bills': '#007AFF',
    'Shopping': '#FF9500',
    'Entertainment': '#AF52DE',
    'Travel': '#34C759',
    'Medical': '#FF2D55',
    'Education': '#5AC8FA',
    'Food': '#FF3B30',
    'Junk': '#FF9500',
    'Shopping - Electronics': '#5856D6',
    'Shopping - Clothes': '#FF2D55',
    'Subscriptions - OTT': '#AF52DE',
    'Subscriptions - WiFi': '#5AC8FA',
    'House': '#34C759',
    'Electricity Bill': '#FFCC00',
    'Transport - Fuel': '#FF9500',
    'Transport - Cab': '#FFCC00',
    'Maintainance': '#8E8E93',
    'Maintenance': '#8E8E93',
    'Travel/ Trips': '#007AFF',
    'Family': '#FF2D55',
    'Gifts': '#AF52DE',
    'EMI Payments': '#FF9500',
    'Others': '#8E8E93',
  };

  useEffect(() => {
    const expenseCategories = storeCategories.expense || [];
    if (budgets.length === 0) {
      const budgetCats = expenseCategories.map((name, index) => {
        return {
          id: Math.random().toString(36).substring(2, 9) + index,
          name,
          icon: name,
          color: CATEGORY_META[name] || '#8E8E93',
          limit: 0,
          spent: 0,
        };
      });
      addBudget({
        id: 'global-budget',
        name: 'Monthly Budget',
        period: 'monthly',
        startDate: '',
        endDate: '',
        totalLimit: 0,
        categories: budgetCats,
        isActive: true,
      });
    } else {
      const currentBudget = budgets[0];
      const missingNames = expenseCategories.filter(
        (name) => !currentBudget.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())
      );
      if (missingNames.length > 0) {
        const newCats = [
          ...currentBudget.categories,
          ...missingNames.map((name, index) => {
            return {
              id: Math.random().toString(36).substring(2, 9) + index,
              name,
              icon: name,
              color: CATEGORY_META[name] || '#8E8E93',
              limit: 0,
              spent: 0,
            };
          }),
        ];
        updateBudget(currentBudget.id, {
          categories: newCats,
        });
      }
    }
  }, [budgets, storeCategories.expense]);

  const [activeBudgetId, setActiveBudgetId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const activeBudget = useMemo(() => {
    if (budgets.length === 0) return null;
    if (activeBudgetId) {
      return budgets.find((b) => b.id === activeBudgetId) || budgets[0];
    }
    const current = budgets.find((b) => b.isActive);
    return current || budgets[0];
  }, [budgets, activeBudgetId]);

  const spendingDetails = useMemo(() => {
    if (!activeBudget) return { totalSpent: 0, categories: [] };
    
    const spentMap = getCategorySpending(
      activeBudget.id,
      selectedDate.getFullYear(),
      selectedDate.getMonth()
    );
    let totalSpent = 0;

    const categoriesWithSpending = activeBudget.categories.map((cat) => {
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
  }, [activeBudget, getCategorySpending, selectedDate]);

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

  const handlePrevMonth = () => {
    handleHaptic();
    setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)));
  };

  const handleNextMonth = () => {
    handleHaptic();
    setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)));
  };

  const activeCategories = useMemo(() => {
    return spendingDetails.categories.filter((cat) => cat.limit > 0);
  }, [spendingDetails.categories]);

  const totalAllocatedLimit = useMemo(() => {
    return spendingDetails.categories.reduce((sum, c) => sum + c.limit, 0);
  }, [spendingDetails.categories]);

  const totalOverallPercentage = useMemo(() => {
    if (totalAllocatedLimit === 0) return 0;
    return (spendingDetails.totalSpent / totalAllocatedLimit) * 100;
  }, [totalAllocatedLimit, spendingDetails.totalSpent]);

  const getProgressColor = (pct: number) => {
    if (pct > 100) return '#FF3B30'; // Red for overspent
    if (pct > 80) return '#FF9500';  // Orange for warning
    return '#00C9A7';               // Teal for safe
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currColors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="semiBold" style={[styles.headerTitle, { color: currColors.text }]}>
          Budgets
        </ThemedText>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: currColors.cardSecondary }]}
          onPress={() => {
            handleHaptic();
            router.push('/add-budget');
          }}
        >
          <Sliders size={18} color="#00C9A7" />
        </TouchableOpacity>
      </View>

      {activeBudget ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
          {activeBudget && (
            <View>
              {/* Month Switcher Banner */}
              <View style={[styles.monthSwitcher, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.monthArrow}>
                  <ChevronLeft size={18} color={currColors.text} />
                </TouchableOpacity>
                <ThemedText type="semiBold" style={[styles.monthLabel, { color: currColors.text }]}>
                  {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </ThemedText>
                <TouchableOpacity onPress={handleNextMonth} style={styles.monthArrow}>
                  <ChevronRight size={18} color={currColors.text} />
                </TouchableOpacity>
              </View>

              {/* Overall Budget Summary Card */}
              {totalAllocatedLimit > 0 && (
                <View style={[styles.summaryCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                  <View style={styles.summaryHeader}>
                    <View>
                      <ThemedText style={[styles.summarySubTitle, { color: currColors.textSecondary }]}>
                        TOTAL SPENT / BUDGET
                      </ThemedText>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 2 }}>
                        <ThemedText style={[styles.summaryVal, { color: spendingDetails.totalSpent > totalAllocatedLimit ? '#FF3B30' : currColors.text }]}>
                          {formatAmount(spendingDetails.totalSpent)}
                        </ThemedText>
                        <ThemedText style={[styles.summaryLimit, { color: currColors.textSecondary }]}>
                          {' '}/ {formatAmount(totalAllocatedLimit)}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={[styles.badgePill, { backgroundColor: `${getProgressColor(totalOverallPercentage)}18` }]}>
                      <ThemedText style={{ fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: getProgressColor(totalOverallPercentage) }}>
                        {totalOverallPercentage.toFixed(0)}%
                      </ThemedText>
                    </View>
                  </View>

                  <View style={[styles.progressBackground, { backgroundColor: currColors.cardSecondary, marginTop: 12 }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(100, totalOverallPercentage)}%`,
                          backgroundColor: getProgressColor(totalOverallPercentage),
                        },
                      ]}
                    />
                  </View>

                  <View style={[styles.dashedDivider, { borderColor: currColors.border }]} />

                  <View style={styles.summaryFooter}>
                    <ThemedText style={[styles.footerLabel, { color: currColors.textSecondary }]}>
                      {totalAllocatedLimit >= spendingDetails.totalSpent ? 'Remaining Budget' : 'Overbudget By'}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.footerValue,
                        {
                          color: totalAllocatedLimit >= spendingDetails.totalSpent ? '#00C9A7' : '#FF3B30',
                          fontFamily: 'Outfit_600SemiBold',
                        },
                      ]}
                    >
                      {formatAmount(Math.abs(totalAllocatedLimit - spendingDetails.totalSpent))}
                    </ThemedText>
                  </View>
                </View>
              )}

              {/* Categories list */}
              <View style={styles.sectionHeader}>
                <ThemedText type="medium" style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
                  CATEGORY ALLOCATIONS ({activeCategories.length})
                </ThemedText>
              </View>

              {activeCategories.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                  <Info size={40} color={currColors.textSecondary} style={{ marginBottom: 12 }} />
                  <ThemedText style={{ color: currColors.textSecondary, textAlign: 'center', fontFamily: 'Outfit_400Regular', lineHeight: 22, paddingHorizontal: 16 }}>
                    No budgets allocated. Tap the sliders icon in the header to set limits.
                  </ThemedText>
                </View>
              ) : (
                <View style={[styles.groupWrapperCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                  {activeCategories.map((cat, index) => {
                    const percentage = cat.limit > 0 ? (cat.spent / cat.limit) * 100 : 0;
                    const isOverspent = cat.spent > cat.limit;
                    const catProgressColor = getProgressColor(percentage);
                    const catColor = cat.color || '#8E8E93';
                    const isLast = index === activeCategories.length - 1;
                    
                    return (
                      <View
                        key={cat.id}
                        style={[
                          styles.categoryRow,
                          !isLast && { borderBottomWidth: 1, borderBottomColor: currColors.border }
                        ]}
                      >
                        <View style={styles.catHeader}>
                          <View style={styles.catHeaderLeft}>
                            <View style={[styles.catIconWrapper, { backgroundColor: `${catColor}15` }]}>
                              <CategoryIcon name={cat.icon || cat.name} color={catColor} size={16} />
                            </View>
                            <ThemedText type="semiBold" style={[styles.catNameText, { color: currColors.text }]} numberOfLines={1}>
                              {cat.name}
                            </ThemedText>
                          </View>
                          <View style={styles.catHeaderRight}>
                            <ThemedText style={[styles.catSpentVal, { color: isOverspent ? '#FF3B30' : currColors.text, fontFamily: 'Outfit_600SemiBold' }]}>
                              {formatAmount(cat.spent)}
                            </ThemedText>
                            <ThemedText style={[styles.catLimitVal, { color: currColors.textSecondary }]}>
                              / {formatAmount(cat.limit)}
                            </ThemedText>
                          </View>
                        </View>

                        {/* Progress Bar */}
                        <View style={[styles.progressBackground, { backgroundColor: currColors.cardSecondary }]}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${Math.min(100, percentage)}%`,
                                backgroundColor: catProgressColor,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Info size={44} color={currColors.textSecondary} style={{ marginBottom: 16 }} />
          <ThemedText style={[styles.emptyText, { color: currColors.textSecondary, fontFamily: 'Outfit_400Regular', lineHeight: 22 }]}>
            Initializing budget limits config...
          </ThemedText>
        </View>
      )}
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
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 110,
  },
  monthSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  monthArrow: {
    padding: 4,
  },
  monthLabel: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  summaryCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summarySubTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  summaryVal: {
    fontSize: 24,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
  },
  summaryLimit: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dashedDivider: {
    height: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 1,
    marginVertical: 16,
  },
  summaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  footerValue: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
  },
  sectionHeader: {
    marginHorizontal: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
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
  groupWrapperCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  categoryRow: {
    flexDirection: 'column',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  emptyCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  catHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1.2,
  },
  catIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catNameText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
    flex: 1,
  },
  catHeaderRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    flex: 1,
  },
  catSpentVal: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
  },
  catLimitVal: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginLeft: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    marginTop: 80,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
