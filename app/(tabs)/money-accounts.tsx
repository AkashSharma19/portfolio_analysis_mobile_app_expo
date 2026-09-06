import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Plus,
  Wallet,
  Landmark,
  Activity,
  CreditCard,
  ChevronRight,
  PiggyBank,
  Info,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Eye,
  EyeOff,
  PieChart,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Account, AccountType } from '@/types/money';
import { BankLogo } from '@/components/BankLogo';

const TYPE_CONFIG: Record<AccountType, { label: string; color: string; icon: any }> = {
  savings: { label: 'Savings Accounts', color: '#007AFF', icon: Landmark },
  credit_card: { label: 'Credit Cards', color: '#FF9500', icon: CreditCard },
  wallet: { label: 'Cash & Wallets', color: '#00C9A7', icon: Wallet },
  investment: { label: 'Investment Accounts', color: '#AF52DE', icon: Activity },
  emergency_fund: { label: 'Emergency Fund', color: '#FF2D55', icon: PiggyBank },
  receivable: { label: 'Accounts Receivable', color: '#34C759', icon: ArrowDownLeft },
  payable: { label: 'Accounts Payable', color: '#FF3B30', icon: ArrowUpRight },
};

const DEFAULT_ORDER: AccountType[] = [
  'savings',
  'credit_card',
  'wallet',
  'investment',
  'emergency_fund',
  'receivable',
  'payable',
];

export default function AccountsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const accounts = useMoneyStore((state) => state.accounts) || [];
  const loans = useMoneyStore((state) => state.loans) || [];
  const accountTypesOrder = useMoneyStore((state) => state.accountTypesOrder);

  const setAccountTypesOrder = (order: AccountType[]) => {
    const fn = useMoneyStore.getState().setAccountTypesOrder;
    if (typeof fn === 'function') {
      fn(order);
    } else {
      useMoneyStore.setState({ accountTypesOrder: order });
    }
  };

  const reorderAccounts = (newAccs: Account[]) => {
    const fn = useMoneyStore.getState().reorderAccounts;
    if (typeof fn === 'function') {
      fn(newAccs);
    } else {
      useMoneyStore.setState({ accounts: newAccs });
    }
  };

  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const togglePrivacyMode = usePortfolioStore((state) => state.togglePrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);
  
  const transactions = usePortfolioStore((state) => state.transactions);
  const tickers = usePortfolioStore((state) => state.tickers);
  const getAllocationData = usePortfolioStore((state) => state.getAllocationData);

  const [showReorderModal, setShowReorderModal] = useState(false);

  const brokerAllocations = useMemo(() => {
    return getAllocationData('Broker');
  }, [getAllocationData, transactions, tickers]);

  // Compute effective account types order
  const effectiveTypesOrder = useMemo(() => {
    const base = accountTypesOrder && accountTypesOrder.length > 0
      ? accountTypesOrder
      : DEFAULT_ORDER;
    const allKeys = Object.keys(TYPE_CONFIG) as AccountType[];
    const missing = allKeys.filter((k) => !base.includes(k));
    return [...base, ...missing];
  }, [accountTypesOrder]);

  // Group accounts by type (preserving order within array)
  const groupedAccounts = useMemo(() => {
    const groups: { [key in AccountType]: Account[] } = {
      wallet: [],
      savings: [],
      investment: [],
      credit_card: [],
      emergency_fund: [],
      receivable: [],
      payable: [],
    };
    
    accounts.forEach((acc) => {
      if (!acc.isArchived) {
        if (groups[acc.type]) {
          groups[acc.type].push(acc);
        } else {
          groups.savings.push(acc);
        }
      }
    });
    
    return groups;
  }, [accounts]);

  // Aggregate assets and liabilities
  const summary = useMemo(() => {
    let totalAssets = 0;
    let totalLiabilities = 0; // Credit Card debts are liabilities (when negative balance)
    
    accounts.forEach((acc) => {
      if (!acc.isArchived && acc.includeInAssets !== false) {
        const balance = acc.type === 'investment' && acc.linkedBroker
          ? (brokerAllocations.find(b => b.name.toLowerCase().trim() === acc.linkedBroker!.toLowerCase().trim())?.value ?? 0)
          : acc.balance;

        if (acc.type === 'credit_card' || acc.type === 'payable') {
          if (balance < 0) {
            totalLiabilities += Math.abs(balance);
          } else {
            totalAssets += balance;
          }
        } else {
          if (balance >= 0) {
            totalAssets += balance;
          } else {
            totalLiabilities += Math.abs(balance);
          }
        }
      }
    });

    return {
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
    };
  }, [accounts, brokerAllocations]);

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

  // Move Account Type Up/Down
  const moveType = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= effectiveTypesOrder.length) return;

    const newOrder = [...effectiveTypesOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIdx];
    newOrder[targetIdx] = temp;
    setAccountTypesOrder(newOrder);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Move Account Up/Down within its Account Type category
  const moveAccountWithinType = (account: Account, type: AccountType, direction: 'up' | 'down') => {
    const typeList = groupedAccounts[type] || [];
    const currentIdx = typeList.findIndex((a) => a.id === account.id);
    if (currentIdx === -1) return;
    if (direction === 'up' && currentIdx <= 0) return;
    if (direction === 'down' && currentIdx >= typeList.length - 1) return;

    const swapWith = typeList[direction === 'up' ? currentIdx - 1 : currentIdx + 1];
    const newAccounts = [...accounts];
    const posA = newAccounts.findIndex((a) => a.id === account.id);
    const posB = newAccounts.findIndex((a) => a.id === swapWith.id);

    if (posA !== -1 && posB !== -1) {
      const temp = newAccounts[posA];
      newAccounts[posA] = newAccounts[posB];
      newAccounts[posB] = temp;
      reorderAccounts(newAccounts);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const renderAccountItem = (item: Account, isLast: boolean) => {
    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.savings;
    const IconComponent = config.icon;
    const isCreditCard = item.type === 'credit_card';

    // Find outstanding principal blocked on this credit card from linked loans
    const blockedAmount = isCreditCard
      ? loans.filter(l => l.isActive && l.linkedAccountId === item.id).reduce((sum, l) => sum + l.outstandingAmount, 0)
      : 0;

    // Utilization rate for credit cards (includes spent balance + blocked EMI amount)
    const totalUtilized = Math.abs(item.balance) + blockedAmount;
    const utilization = isCreditCard && item.creditLimit && item.creditLimit > 0
      ? (totalUtilized / item.creditLimit) * 100
      : 0;

    const isInvestment = item.type === 'investment' && item.linkedBroker;
    const brokerAlloc = isInvestment
      ? brokerAllocations.find(b => b.name.toLowerCase().trim() === item.linkedBroker!.toLowerCase().trim())
      : null;
    const currentVal = isInvestment && brokerAlloc
      ? brokerAlloc.value
      : item.balance;

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.accountListItem,
          !isLast && { borderBottomWidth: 1, borderBottomColor: currColors.border },
          item.includeInAssets === false && { opacity: 0.55 }
        ]}
        activeOpacity={0.75}
        onPress={() => {
          handleHaptic();
          router.push(`/account-details/${item.id}`);
        }}
      >
        <View style={styles.cardMainRow}>
          <View style={styles.cardLeft}>
            {item.logo ? (
              <BankLogo logo={item.logo} size={30} style={{ marginRight: 12 }} />
            ) : (
              <View style={[styles.iconWrapper, { backgroundColor: `${item.color}15` }]}>
                <IconComponent size={18} color={item.color} />
              </View>
            )}
            <View style={styles.accountInfo}>
              <ThemedText type="semiBold" style={[styles.accountName, { color: currColors.text }]} numberOfLines={1}>
                {item.name}
              </ThemedText>
              {(item.institution || item.accountNumber || item.includeInAssets === false) ? (
                <ThemedText style={[styles.accountSub, { color: currColors.textSecondary }]} numberOfLines={1}>
                  {item.institution || ''}
                  {item.accountNumber ? `${item.institution ? ' • ' : ''}•••• ${item.accountNumber}` : ''}
                  {item.includeInAssets === false ? `${(item.institution || item.accountNumber) ? ' • ' : ''}Excluded` : ''}
                </ThemedText>
              ) : null}
            </View>
          </View>

          <View style={styles.cardRight}>
            <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
              <ThemedText
                style={[
                  styles.accountBalance,
                  {
                    fontFamily: 'Outfit_600SemiBold',
                    color: currentVal < 0 ? '#FF3B30' : currColors.text
                  }
                ]}
              >
                {formatAmount(currentVal)}
              </ThemedText>
              {isInvestment && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 }}>
                  <ThemedText style={{ fontSize: 10, color: currColors.textSecondary, fontFamily: 'Outfit_400Regular' }}>
                    Invested: {formatAmount(item.balance)}
                  </ThemedText>
                  {brokerAlloc && (
                    <ThemedText
                      style={{
                        fontSize: 10,
                        color: brokerAlloc.pnl >= 0 ? '#34C759' : '#FF3B30',
                        fontFamily: 'Outfit_600SemiBold'
                      }}
                    >
                      ({brokerAlloc.pnl >= 0 ? '+' : ''}{brokerAlloc.pnlPercentage.toFixed(1)}%)
                    </ThemedText>
                  )}
                </View>
              )}
            </View>
            <ChevronRight size={14} color={currColors.textSecondary} />
          </View>
        </View>

        {isCreditCard && item.creditLimit && item.creditLimit > 0 ? (
          <View style={styles.utilizationContainer}>
            <View style={[styles.progressBarBG, { backgroundColor: currColors.cardSecondary }]}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: `${Math.min(100, utilization)}%`,
                    backgroundColor: utilization > 70 ? '#FF3B30' : utilization > 30 ? '#FF9500' : '#34C759'
                  }
                ]} 
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
              <ThemedText style={{ fontSize: 10, color: currColors.textSecondary, fontFamily: 'Outfit_500Medium' }}>
                {utilization.toFixed(0)}% Utilized
              </ThemedText>
              <ThemedText style={{ fontSize: 10, color: currColors.textSecondary, fontFamily: 'Outfit_400Regular' }}>
                Limit: {formatAmount(item.creditLimit)}
              </ThemedText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
              <ThemedText style={{ fontSize: 10, color: currColors.textSecondary, fontFamily: 'Outfit_400Regular' }}>
                Available: {formatAmount(item.creditLimit - totalUtilized)}
              </ThemedText>
              {blockedAmount > 0 && (
                <ThemedText style={{ fontSize: 10, color: '#FF9500', fontFamily: 'Outfit_500Medium' }}>
                  Blocked: {formatAmount(blockedAmount)}
                </ThemedText>
              )}
            </View>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currColors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="semiBold" style={[styles.headerTitle, { color: currColors.text }]}>
          Accounts
        </ThemedText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            style={[styles.actionHeaderBtn, { backgroundColor: currColors.cardSecondary }]}
            onPress={() => {
              handleHaptic();
              setShowReorderModal(true);
            }}
          >
            <ArrowUpDown size={18} color={currColors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: currColors.cardSecondary }]}
            onPress={() => {
              handleHaptic();
              router.push('/add-account');
            }}
          >
            <Plus size={20} color="#00C9A7" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        {/* Aggregate Overview Card (flat, matching net worth hero) */}
        <View
          style={[
            styles.premiumOverviewCard,
            {
              backgroundColor: currColors.card,
              borderColor: currColors.border,
            },
          ]}
        >
          <View style={styles.heroHeaderRow}>
            <ThemedText style={[styles.netWorthLabel, { color: currColors.textSecondary }]}>
              TOTAL NET WORTH
            </ThemedText>
            <View style={styles.heroIcons}>
              <TouchableOpacity
                onPress={() => {
                  handleHaptic();
                  togglePrivacyMode();
                }}
                style={[styles.iconButton, { backgroundColor: currColors.cardSecondary }]}
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
                style={[styles.iconButton, { backgroundColor: currColors.cardSecondary }]}
              >
                <PieChart size={16} color={currColors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <ThemedText style={[styles.netWorthVal, { color: currColors.text }]}>
            {formatAmount(summary.totalAssets - summary.totalLiabilities)}
          </ThemedText>

          <View style={[styles.dashedDivider, { borderColor: currColors.border }]} />

          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>
              Total Assets
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: '#34C759' }]}>
              {formatAmount(summary.totalAssets)}
            </ThemedText>
          </View>

          <View style={[styles.heroRow, { marginBottom: 0 }]}>
            <ThemedText style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>
              Liabilities
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: '#FF3B30' }]}>
              {formatAmount(summary.totalLiabilities)}
            </ThemedText>
          </View>
        </View>

        {/* Render accounts grouped by customized type order */}
        {effectiveTypesOrder.map((type) => {
          const list = groupedAccounts[type];
          if (!list || list.length === 0) return null;
          const config = TYPE_CONFIG[type] || TYPE_CONFIG.savings;
          const totalBalance = list.reduce((sum, acc) => {
            if (acc.includeInAssets === false) return sum;
            const balance = acc.type === 'investment' && acc.linkedBroker
              ? (brokerAllocations.find(b => b.name.toLowerCase().trim() === acc.linkedBroker!.toLowerCase().trim())?.value ?? 0)
              : acc.balance;
            return sum + balance;
          }, 0);
          
          return (
            <View key={type} style={styles.groupContainer}>
              <View style={styles.groupHeaderRow}>
                <ThemedText type="medium" style={[styles.groupTitle, { color: currColors.textSecondary }]}>
                  {config.label.toUpperCase()} ({list.length})
                </ThemedText>
                <ThemedText 
                  style={[
                    styles.groupTotalText, 
                    { 
                      color: totalBalance < 0 ? '#FF3B30' : currColors.text,
                    }
                  ]}
                >
                  {formatAmount(totalBalance)}
                </ThemedText>
              </View>
              <View style={[styles.groupWrapperCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                {list.map((item, index) => renderAccountItem(item, index === list.length - 1))}
              </View>
            </View>
          );
        })}

        {accounts.filter(a => !a.isArchived).length === 0 ? (
          <View style={styles.emptyContainer}>
            <Info size={44} color={currColors.textSecondary} style={{ marginBottom: 16 }} />
            <ThemedText style={[styles.emptyText, { color: currColors.textSecondary, fontFamily: 'Outfit_400Regular', lineHeight: 22 }]}>
              No accounts added yet. Tap the '+' button at the top to add your wallet, bank accounts, or credit cards.
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>

      {/* Unified Single Reorder Modal */}
      <Modal visible={showReorderModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setShowReorderModal(false)}
          />
          <View style={[styles.reorderModalContent, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <View style={styles.modalDragHandle} />

            {/* Modal Header */}
            <View style={[styles.reorderModalHeader, { borderBottomColor: currColors.border }]}>
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.reorderModalTitle, { color: currColors.text }]}>
                  Reorder Accounts & Categories
                </ThemedText>
                <ThemedText style={{ fontSize: 12, color: currColors.textSecondary, marginTop: 2, fontFamily: 'Outfit_400Regular' }}>
                  Move category sections or accounts within them
                </ThemedText>
              </View>
              <TouchableOpacity
                style={[styles.doneBtn, { backgroundColor: '#00C9A7' }]}
                onPress={() => {
                  handleHaptic();
                  setShowReorderModal(false);
                }}
              >
                <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Unified Scrollable Section & Account Hierarchy */}
            <ScrollView showsVerticalScrollIndicator={false} bounces={false} style={{ maxHeight: 520 }}>
              {effectiveTypesOrder.map((typeKey, typeIdx) => {
                const config = TYPE_CONFIG[typeKey] || TYPE_CONFIG.savings;
                const IconComp = config.icon;
                const typeAccounts = groupedAccounts[typeKey] || [];
                const isFirstType = typeIdx === 0;
                const isLastType = typeIdx === effectiveTypesOrder.length - 1;

                return (
                  <View
                    key={typeKey}
                    style={[
                      styles.unifiedSectionCard,
                      { backgroundColor: currColors.cardSecondary, borderColor: currColors.border }
                    ]}
                  >
                    {/* Section Header Row with Type Reorder Controls */}
                    <View style={styles.unifiedSectionHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={[styles.reorderIconWrap, { backgroundColor: `${config.color}18` }]}>
                          <IconComp size={16} color={config.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <ThemedText style={[styles.unifiedSectionTitle, { color: currColors.text }]}>
                            {config.label}
                          </ThemedText>
                          <ThemedText style={{ fontSize: 11, color: currColors.textSecondary, marginTop: 1 }}>
                            {typeAccounts.length} {typeAccounts.length === 1 ? 'account' : 'accounts'}
                          </ThemedText>
                        </View>
                      </View>

                      {/* Section Type Up / Down Buttons */}
                      <View style={styles.arrowBtnGroup}>
                        <TouchableOpacity
                          style={[
                            styles.arrowBtn,
                            { backgroundColor: currColors.card },
                            isFirstType && { opacity: 0.25 }
                          ]}
                          disabled={isFirstType}
                          onPress={() => moveType(typeIdx, 'up')}
                        >
                          <ArrowUp size={15} color={currColors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.arrowBtn,
                            { backgroundColor: currColors.card },
                            isLastType && { opacity: 0.25 }
                          ]}
                          disabled={isLastType}
                          onPress={() => moveType(typeIdx, 'down')}
                        >
                          <ArrowDown size={15} color={currColors.text} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Nested Accounts inside this section */}
                    {typeAccounts.length > 0 ? (
                      <View style={[styles.nestedAccountsBox, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                        {typeAccounts.map((acc, accIdx) => {
                          const isFirstAcc = accIdx === 0;
                          const isLastAcc = accIdx === typeAccounts.length - 1;
                          const isLastItemInBox = accIdx === typeAccounts.length - 1;

                          return (
                            <View
                              key={acc.id}
                              style={[
                                styles.nestedAccountRow,
                                !isLastItemInBox && { borderBottomWidth: 1, borderBottomColor: currColors.border }
                              ]}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                {acc.logo ? (
                                  <BankLogo logo={acc.logo} size={22} style={{ marginRight: 10 }} />
                                ) : (
                                  <View style={[styles.nestedAccountDot, { backgroundColor: acc.color || config.color }]} />
                                )}
                                <View style={{ flex: 1, marginRight: 8 }}>
                                  <ThemedText style={[styles.nestedAccountName, { color: currColors.text }]} numberOfLines={1}>
                                    {acc.name}
                                  </ThemedText>
                                  <ThemedText style={{ fontSize: 10, color: currColors.textSecondary, marginTop: 1 }} numberOfLines={1}>
                                    {acc.institution ? `${acc.institution} • ` : ''}{formatAmount(acc.balance)}
                                  </ThemedText>
                                </View>
                              </View>

                              {/* Account Up / Down Buttons within this section */}
                              <View style={styles.arrowBtnGroup}>
                                <TouchableOpacity
                                  style={[
                                    styles.smallArrowBtn,
                                    { backgroundColor: currColors.cardSecondary },
                                    isFirstAcc && { opacity: 0.25 }
                                  ]}
                                  disabled={isFirstAcc}
                                  onPress={() => moveAccountWithinType(acc, typeKey, 'up')}
                                >
                                  <ArrowUp size={13} color={currColors.text} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[
                                    styles.smallArrowBtn,
                                    { backgroundColor: currColors.cardSecondary },
                                    isLastAcc && { opacity: 0.25 }
                                  ]}
                                  disabled={isLastAcc}
                                  onPress={() => moveAccountWithinType(acc, typeKey, 'down')}
                                >
                                  <ArrowDown size={13} color={currColors.text} />
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <View style={styles.emptyTypeHint}>
                        <ThemedText style={{ fontSize: 11, color: currColors.textSecondary, fontStyle: 'italic' }}>
                          No accounts in this category
                        </ThemedText>
                      </View>
                    )}
                  </View>
                );
              })}

              <TouchableOpacity
                style={[styles.resetOrderBtn, { borderColor: currColors.border }]}
                onPress={() => {
                  handleHaptic();
                  setAccountTypesOrder(DEFAULT_ORDER);
                }}
              >
                <RotateCcw size={14} color={currColors.textSecondary} />
                <ThemedText style={{ fontSize: 12, color: currColors.textSecondary, marginLeft: 6 }}>
                  Reset Categories to Default Order
                </ThemedText>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
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
  actionHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumOverviewCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginTop: 4,
    marginBottom: 20,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  heroIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  netWorthLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  netWorthVal: {
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
    paddingBottom: 110,
  },
  groupContainer: {
    marginBottom: 20,
  },
  groupTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  groupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  groupTotalText: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
  },
  groupWrapperCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accountListItem: {
    flexDirection: 'column',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1.2,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
  },
  warningBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountSub: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  accountBalance: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
  },
  utilizationContainer: {
    width: '100%',
    marginTop: 10,
  },
  progressBarBG: {
    height: 5,
    borderRadius: 2.5,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2.5,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  reorderModalContent: {
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 16,
    paddingBottom: 34,
  },
  modalDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(142, 142, 147, 0.3)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  reorderModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  reorderModalTitle: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
  doneBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  unifiedSectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  unifiedSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unifiedSectionTitle: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  nestedAccountsBox: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  nestedAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  nestedAccountDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  nestedAccountName: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
  },
  emptyTypeHint: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  reorderIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  arrowBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  arrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallArrowBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    marginTop: 6,
    marginBottom: 10,
  },
});
