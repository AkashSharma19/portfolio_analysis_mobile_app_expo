import React, { useMemo, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Info,
  Layers,
  Calendar,
  SlidersHorizontal,
  X,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';

export default function AllTransactionsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const {
    accounts,
    moneyTransactions,
    removeMoneyTransaction,
  } = useMoneyStore();

  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

  // Filter state
  const [activeFilter, setActiveFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Date range presets state
  type DateRangeKey = 'this_month' | 'this_week' | 'last_30_days' | 'last_90_days' | 'this_year' | 'all';
  const [dateRange, setDateRange] = useState<DateRangeKey>('this_month');

  // Modal sheet visibility
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Check if any filter is active away from defaults
  const isFilterActive = useMemo(() => {
    return activeFilter !== 'all' || dateRange !== 'this_month' || selectedCategory !== null;
  }, [activeFilter, dateRange, selectedCategory]);

  // Compute active filters list for display summary chips
  const activeFilters = useMemo(() => {
    const list: Array<{ key: string; label: string; onClear: () => void }> = [];
    
    if (dateRange !== 'all') {
      const labels: Record<DateRangeKey, string> = {
        this_month: 'This Month',
        this_week: 'This Week',
        last_30_days: 'Last 30 Days',
        last_90_days: 'Last 90 Days',
        this_year: 'This Year',
        all: 'All Time',
      };
      list.push({
        key: 'dateRange',
        label: labels[dateRange],
        onClear: () => setDateRange('all'),
      });
    }
    
    if (activeFilter !== 'all') {
      const labels = {
        expense: 'Expenses',
        income: 'Income',
        transfer: 'Transfers',
        all: 'All',
      };
      list.push({
        key: 'activeFilter',
        label: labels[activeFilter],
        onClear: () => {
          setActiveFilter('all');
          setSelectedCategory(null);
        },
      });
    }
    
    if (selectedCategory) {
      list.push({
        key: 'category',
        label: selectedCategory,
        onClear: () => setSelectedCategory(null),
      });
    }
    
    return list;
  }, [activeFilter, dateRange, selectedCategory]);

  // Helper check for date range inclusion
  const isWithinDateRange = useCallback((dateStr: string, range: DateRangeKey) => {
    const txTime = new Date(dateStr).getTime();
    const now = new Date();
    
    switch (range) {
      case 'this_month': {
        const start = new Date();
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
        return txTime >= start.getTime() && txTime <= end.getTime();
      }
      case 'this_week': {
        const start = new Date();
        const day = start.getDay();
        const diff = start.getDate() - day; // Sunday is 0
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        end.setHours(23, 59, 59, 999);
        
        return txTime >= start.getTime() && txTime <= end.getTime();
      }
      case 'last_30_days': {
        const start = new Date();
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        return txTime >= start.getTime();
      }
      case 'last_90_days': {
        const start = new Date();
        start.setDate(start.getDate() - 90);
        start.setHours(0, 0, 0, 0);
        return txTime >= start.getTime();
      }
      case 'this_year': {
        const start = new Date();
        start.setMonth(0);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(start.getFullYear(), 11, 31, 23, 59, 59, 999);
        return txTime >= start.getTime() && txTime <= end.getTime();
      }
      case 'all':
      default:
        return true;
    }
  }, []);

  // List of unique categories for the active type filter and date range (before category filter is applied)
  const availableCategories = useMemo(() => {
    let list = moneyTransactions;
    if (activeFilter !== 'all') {
      list = list.filter((tx) => tx.type === activeFilter);
    }
    // Filter by date range
    list = list.filter((tx) => isWithinDateRange(tx.date, dateRange));

    const cats = list
      .map((tx) => (tx.type === 'transfer' ? 'Transfer' : tx.category))
      .filter(Boolean);
    return Array.from(new Set(cats)).sort();
  }, [moneyTransactions, activeFilter, dateRange, isWithinDateRange]);

  // Clean selected category if it's no longer present in availableCategories
  React.useEffect(() => {
    if (selectedCategory && !availableCategories.includes(selectedCategory)) {
      setSelectedCategory(null);
    }
  }, [availableCategories, selectedCategory]);

  // Filter & sort transactions chronologically (latest first)
  const filteredTxs = useMemo(() => {
    let list = moneyTransactions;
    
    // 1. Filter by active type
    if (activeFilter !== 'all') {
      list = list.filter((tx) => tx.type === activeFilter);
    }

    // 2. Filter by date range
    list = list.filter((tx) => isWithinDateRange(tx.date, dateRange));

    // 3. Filter by selected category
    if (selectedCategory) {
      list = list.filter((tx) => {
        if (tx.type === 'transfer') {
          return selectedCategory === 'Transfer';
        }
        return tx.category === selectedCategory;
      });
    }

    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [moneyTransactions, activeFilter, dateRange, selectedCategory, isWithinDateRange]);

  // Sum of income and expense for the filtered transactions
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTxs.forEach((tx) => {
      if (tx.type === 'income') {
        income += tx.amount;
      } else if (tx.type === 'expense') {
        expense += tx.amount;
      }
    });
    return { income, expense, net: income - expense };
  }, [filteredTxs]);

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

  const handleDeleteTransaction = (txId: string) => {
    handleHaptic();
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction and revert its balance impact?',
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

  const activeFilterBg = '#00C9A7';

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
        <ThemedText style={[styles.headerTitle, { color: currColors.text }]}>
          All Transactions
        </ThemedText>
        <TouchableOpacity
          style={[styles.filterTriggerBtn, { backgroundColor: currColors.cardSecondary }]}
          onPress={() => {
            handleHaptic();
            setFilterModalVisible(true);
          }}
        >
          <SlidersHorizontal size={18} color={currColors.text} />
          {isFilterActive && <View style={styles.activeFilterDot} />}
        </TouchableOpacity>
      </View>

      {/* Active Filters Summary strip */}
      {activeFilters.length > 0 && (
        <View style={styles.activeFiltersSummary}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.activeFiltersScroll}
          >
            <ThemedText style={[styles.activeFiltersLabel, { color: currColors.textSecondary }]}>
              Filters:
            </ThemedText>
            {activeFilters.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.summaryChip,
                  {
                    backgroundColor: currColors.cardSecondary,
                    borderColor: currColors.border,
                  },
                ]}
                onPress={() => {
                  handleHaptic();
                  filter.onClear();
                }}
              >
                <ThemedText style={[styles.summaryChipText, { color: currColors.text }]}>
                  {filter.label}
                </ThemedText>
                <X size={10} color={currColors.textSecondary} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => {
                handleHaptic();
                setActiveFilter('all');
                setDateRange('this_month'); // Revert to default
                setSelectedCategory(null);
              }}
              style={styles.clearAllBtn}
            >
              <ThemedText style={styles.clearAllText}>Clear All</ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Filters Bottom Sheet Modal */}
      <Modal
        visible={filterModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setFilterModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                {/* Drag Indicator / Bar */}
                <View style={[styles.dragHandle, { backgroundColor: currColors.border }]} />
                
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>Filters</ThemedText>
                  <TouchableOpacity
                    style={[styles.modalCloseBtn, { backgroundColor: currColors.cardSecondary }]}
                    onPress={() => setFilterModalVisible(false)}
                  >
                    <X size={16} color={currColors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                  {/* Section 1: Transaction Type */}
                  <View style={styles.modalSection}>
                    <ThemedText style={[styles.sectionTitle, { color: currColors.textSecondary }]}>Transaction Type</ThemedText>
                    <View style={styles.typeGrid}>
                      {([
                        { key: 'all', label: 'All', icon: Layers },
                        { key: 'expense', label: 'Expenses', icon: ArrowUpRight },
                        { key: 'income', label: 'Income', icon: ArrowDownLeft },
                        { key: 'transfer', label: 'Transfers', icon: ArrowRightLeft },
                      ] as const).map((filter) => {
                        const IconComponent = filter.icon;
                        const isSelected = activeFilter === filter.key;
                        const iconColor = isSelected ? '#FFFFFF' : currColors.textSecondary;
                        return (
                          <TouchableOpacity
                            key={filter.key}
                            style={[
                              styles.modalGridButton,
                              {
                                backgroundColor: isSelected ? activeFilterBg : currColors.cardSecondary,
                                borderColor: isSelected ? activeFilterBg : currColors.border,
                              },
                            ]}
                            onPress={() => {
                              handleHaptic();
                              setActiveFilter(filter.key);
                              setSelectedCategory(null);
                            }}
                          >
                            <IconComponent size={14} color={iconColor} style={{ marginRight: 6 }} />
                            <ThemedText
                              style={[
                                styles.modalGridButtonText,
                                {
                                  color: isSelected ? '#FFFFFF' : currColors.textSecondary,
                                  fontFamily: isSelected ? 'Outfit_600SemiBold' : 'Outfit_400Regular',
                                },
                              ]}
                            >
                              {filter.label}
                            </ThemedText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Section 2: Date Range Preset */}
                  <View style={styles.modalSection}>
                    <ThemedText style={[styles.sectionTitle, { color: currColors.textSecondary }]}>Date Range</ThemedText>
                    <View style={styles.presetsGrid}>
                      {([
                        { key: 'this_month', label: 'This Month' },
                        { key: 'this_week', label: 'This Week' },
                        { key: 'last_30_days', label: 'Last 30 Days' },
                        { key: 'last_90_days', label: 'Last 90 Days' },
                        { key: 'this_year', label: 'This Year' },
                        { key: 'all', label: 'All Time' },
                      ] as const).map((preset) => {
                        const isSelected = dateRange === preset.key;
                        return (
                          <TouchableOpacity
                            key={preset.key}
                            style={[
                              styles.modalGridButton,
                              {
                                width: '48%', // 2 columns
                                backgroundColor: isSelected ? activeFilterBg : currColors.cardSecondary,
                                borderColor: isSelected ? activeFilterBg : currColors.border,
                              },
                            ]}
                            onPress={() => {
                              handleHaptic();
                              setDateRange(preset.key);
                            }}
                          >
                            <Calendar size={14} color={isSelected ? '#FFFFFF' : currColors.textSecondary} style={{ marginRight: 6 }} />
                            <ThemedText
                              style={[
                                styles.modalGridButtonText,
                                {
                                  color: isSelected ? '#FFFFFF' : currColors.textSecondary,
                                  fontFamily: isSelected ? 'Outfit_600SemiBold' : 'Outfit_400Regular',
                                },
                              ]}
                            >
                              {preset.label}
                            </ThemedText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Section 3: Categories */}
                  <View style={styles.modalSection}>
                    <ThemedText style={[styles.sectionTitle, { color: currColors.textSecondary }]}>Category</ThemedText>
                    {availableCategories.length === 0 ? (
                      <ThemedText style={{ color: currColors.textSecondary, fontSize: 13, fontFamily: 'Outfit_400Regular', marginTop: 4 }}>
                        No categories available for selected filters.
                      </ThemedText>
                    ) : (
                      <View style={styles.categoriesWrap}>
                        <TouchableOpacity
                          style={[
                            styles.categoryTag,
                            {
                              backgroundColor: !selectedCategory ? activeFilterBg : currColors.cardSecondary,
                              borderColor: !selectedCategory ? activeFilterBg : currColors.border,
                            },
                          ]}
                          onPress={() => {
                            handleHaptic();
                            setSelectedCategory(null);
                          }}
                        >
                          <ThemedText
                            style={[
                              styles.categoryTagText,
                              {
                                color: !selectedCategory ? '#FFFFFF' : currColors.textSecondary,
                                fontFamily: !selectedCategory ? 'Outfit_600SemiBold' : 'Outfit_400Regular',
                              },
                            ]}
                          >
                            All Categories ({availableCategories.length})
                          </ThemedText>
                        </TouchableOpacity>

                        {availableCategories.map((cat) => {
                          const isSelected = selectedCategory === cat;
                          return (
                            <TouchableOpacity
                              key={cat}
                              style={[
                                styles.categoryTag,
                                {
                                  backgroundColor: isSelected ? activeFilterBg : currColors.cardSecondary,
                                  borderColor: isSelected ? activeFilterBg : currColors.border,
                                },
                              ]}
                              onPress={() => {
                                handleHaptic();
                                setSelectedCategory(isSelected ? null : cat);
                              }}
                            >
                              <ThemedText
                                style={[
                                  styles.categoryTagText,
                                  {
                                    color: isSelected ? '#FFFFFF' : currColors.textSecondary,
                                    fontFamily: isSelected ? 'Outfit_600SemiBold' : 'Outfit_400Regular',
                                  },
                                ]}
                              >
                                {cat}
                              </ThemedText>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </ScrollView>

                {/* Modal Footer Actions */}
                <View style={[styles.modalFooter, { borderTopColor: currColors.border }]}>
                  <TouchableOpacity
                    style={[styles.modalClearBtn, { borderColor: currColors.border }]}
                    onPress={() => {
                      handleHaptic();
                      setActiveFilter('all');
                      setDateRange('this_month');
                      setSelectedCategory(null);
                    }}
                  >
                    <ThemedText style={[styles.modalClearBtnText, { color: currColors.textSecondary }]}>Reset</ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalApplyBtn, { backgroundColor: activeFilterBg }]}
                    onPress={() => {
                      handleHaptic();
                      setFilterModalVisible(false);
                    }}
                  >
                    <ThemedText style={styles.modalApplyBtnText}>
                      Show {filteredTxs.length} {filteredTxs.length === 1 ? 'Transaction' : 'Transactions'}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        {/* Dynamic Cash Flow Card */}
        <View style={[styles.heroCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>

          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>
              Total Income
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: '#34C759' }]}>
              +{formatAmount(stats.income)}
            </ThemedText>
          </View>

          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>
              Total Expenses
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: '#FF3B30' }]}>
              -{formatAmount(stats.expense)}
            </ThemedText>
          </View>

          <View
            style={[
              styles.dashedDivider,
              { borderColor: currColors.border, marginVertical: 16, marginBottom: 16 },
            ]}
          />

          <View style={[styles.heroRow, { marginBottom: 0 }]}>
            <ThemedText style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>
              Net Cash Flow
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: stats.net >= 0 ? '#34C759' : '#FF3B30' }]}>
              {stats.net >= 0 ? '+' : ''}{formatAmount(stats.net)}
            </ThemedText>
          </View>
        </View>

        {filteredTxs.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <Info size={36} color={currColors.textSecondary} style={{ marginBottom: 12 }} />
            <ThemedText style={{ color: currColors.textSecondary, textAlign: 'center', fontFamily: 'Outfit_400Regular', lineHeight: 22 }}>
              No transactions match the selected filter.
            </ThemedText>
          </View>
        ) : (
          <View style={[styles.txsList, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            {filteredTxs.map((tx, index) => {
              const account = accounts.find((a) => a.id === tx.accountId);
              const toAccount = tx.toAccountId ? accounts.find((a) => a.id === tx.toAccountId) : null;
              
              const isIncome = tx.type === 'income';
              const isExpense = tx.type === 'expense';
              const isTransfer = tx.type === 'transfer';
              
              // Determine display details
              let typeLabel = '';
              let subtitle = '';
              let txColor = currColors.text;
              let displayAmount = tx.amount;

              if (isTransfer) {
                typeLabel = `Transfer`;
                subtitle = `${account?.name || 'Unknown'} → ${toAccount?.name || 'Unknown'}`;
                txColor = currColors.text;
                displayAmount = tx.amount;
              } else {
                typeLabel = tx.category;
                subtitle = account?.name || '';
                txColor = isIncome ? '#34C759' : '#FF3B30';
                displayAmount = tx.amount;
              }

              return (
                <TouchableOpacity
                  key={tx.id}
                  style={[
                    styles.txItem,
                    { borderBottomColor: currColors.border, borderBottomWidth: index === filteredTxs.length - 1 ? 0 : 1 }
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
                        styles.txIcon,
                        {
                          backgroundColor:
                            isTransfer
                              ? 'rgba(142, 142, 147, 0.1)'
                              : isIncome
                              ? 'rgba(52, 199, 89, 0.1)'
                              : 'rgba(255, 59, 48, 0.1)',
                        },
                      ]}
                    >
                      {isTransfer ? (
                        <ArrowRightLeft size={18} color="#8E8E93" />
                      ) : isIncome ? (
                        <ArrowDownLeft size={18} color="#34C759" />
                      ) : (
                        <ArrowUpRight size={18} color="#FF3B30" />
                      )}
                    </View>
                    <View style={styles.txInfo}>
                      <ThemedText style={[styles.txLabelText, { color: currColors.text }]} numberOfLines={1}>
                        {typeLabel}
                      </ThemedText>
                      <ThemedText style={[styles.txSubText, { color: currColors.textSecondary }]} numberOfLines={1}>
                        {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {subtitle ? ` • ${subtitle}` : ''}
                        {tx.note ? ` • ${tx.note}` : ''}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.txRight}>
                    <ThemedText style={[styles.txAmountText, { color: txColor }]}>
                      {isIncome ? '+' : isExpense ? '-' : ''}{formatAmount(displayAmount)}
                    </ThemedText>
                    <TouchableOpacity
                      style={styles.deleteTxBtn}
                      onPress={() => handleDeleteTransaction(tx.id)}
                    >
                      <Trash2 size={13} color={currColors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
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
  },
  filterTriggerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  activeFilterDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  activeFiltersSummary: {
    marginBottom: 12,
  },
  activeFiltersScroll: {
    paddingLeft: 16,
    paddingRight: 16,
    gap: 8,
    alignItems: 'center',
  },
  activeFiltersLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
    marginRight: 2,
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  summaryChipText: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
  },
  clearAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  clearAllText: {
    color: '#00C9A7',
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 12,
    paddingHorizontal: 18,
    maxHeight: '80%',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    paddingBottom: 24,
  },
  modalSection: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Outfit_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalGridButton: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  modalGridButtonText: {
    fontSize: 13,
  },
  categoriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryTag: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryTagText: {
    fontSize: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 14,
    gap: 12,
  },
  modalClearBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClearBtnText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  modalApplyBtn: {
    flex: 2,
    paddingVertical: 11,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  heroCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 16,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
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
  scrollContent: {
    paddingBottom: 40,
  },
  emptyCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  txsList: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 4,
  },
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
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txInfo: {
    flex: 1,
  },
  txLabelText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 2,
  },
  txSubText: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
  },
  txRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txAmountText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    marginRight: 8,
  },
  deleteTxBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
  },
});
