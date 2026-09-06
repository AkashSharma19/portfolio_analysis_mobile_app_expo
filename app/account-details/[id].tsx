import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  Activity,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { BankLogo } from '@/components/BankLogo';

export default function AccountDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const {
    accounts,
    moneyTransactions,
    loans,
    removeAccount,
    removeMoneyTransaction,
  } = useMoneyStore();

  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

  const transactions = usePortfolioStore((state) => state.transactions);
  const tickers = usePortfolioStore((state) => state.tickers);
  const getAllocationData = usePortfolioStore((state) => state.getAllocationData);

  const brokerAllocations = useMemo(() => {
    return getAllocationData('Broker');
  }, [getAllocationData, transactions, tickers]);

  const account = useMemo(() => {
    return accounts.find((acc) => acc.id === id);
  }, [id, accounts]);

  // Filter transactions associated with this account
  const accountTxs = useMemo(() => {
    return moneyTransactions.filter(
      (tx) => tx.accountId === id || (tx.type === 'transfer' && tx.toAccountId === id)
    );
  }, [id, moneyTransactions]);

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

  const blockedAmount = useMemo(() => {
    if (!account || account.type !== 'credit_card') return 0;
    return loans
      .filter((l) => l.isActive && l.linkedAccountId === account.id)
      .reduce((sum, l) => sum + l.outstandingAmount, 0);
  }, [account, loans]);

  const utilization = useMemo(() => {
    if (!account || account.type !== 'credit_card' || !account.creditLimit || account.creditLimit <= 0) return 0;
    const totalUtilized = Math.abs(account.balance) + blockedAmount;
    return (totalUtilized / account.creditLimit) * 100;
  }, [account, blockedAmount]);

  const brokerAlloc = useMemo(() => {
    if (!account || account.type !== 'investment' || !account.linkedBroker) return null;
    return brokerAllocations.find(
      (b) => b.name.toLowerCase().trim() === account.linkedBroker!.toLowerCase().trim()
    );
  }, [account, brokerAllocations]);

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDeleteAccount = () => {
    handleHaptic();
    if (!account) return;
    
    Alert.alert(
      'Delete Account',
      `Are you sure you want to delete "${account.name}"? This will not delete associated transactions but they will lose their link.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            removeAccount(account.id);
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

  if (!account) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currColors.background }]}>
        <View style={styles.centered}>
          <ThemedText style={{ color: currColors.textSecondary }}>Account not found.</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const isCreditCard = account.type === 'credit_card';

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
          {account.name}
        </ThemedText>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: currColors.cardSecondary }]}
            onPress={() => {
              handleHaptic();
              router.push({ pathname: '/add-account', params: { id: account.id } });
            }}
          >
            <Edit2 size={18} color={account.color} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}
            onPress={handleDeleteAccount}
          >
            <Trash2 size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        {/* Balance Hero Card */}
        <View style={[styles.balanceCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View style={[styles.indicatorPill, { backgroundColor: `${account.color}15`, marginBottom: 0 }]}>
              <View style={[styles.indicatorDot, { backgroundColor: account.color }]} />
              <ThemedText style={[styles.indicatorText, { color: account.color }]}>
                {account.type.replace('_', ' ').toUpperCase()}
              </ThemedText>
            </View>
            {account.logo ? (
              <BankLogo logo={account.logo} size={28} />
            ) : null}
          </View>
          <ThemedText style={[styles.balanceLabel, { color: currColors.textSecondary }]}>
            {account.type === 'investment' && account.linkedBroker 
              ? `CURRENT VALUE (LINKED: ${account.linkedBroker.toUpperCase()})` 
              : isCreditCard 
              ? 'CURRENT OUTSTANDING' 
              : 'AVAILABLE BALANCE'}
          </ThemedText>
          <ThemedText style={[styles.balanceText, { color: currColors.text }]}>
            {formatAmount(
              account.type === 'investment' && account.linkedBroker
                ? (brokerAllocations.find(b => b.name.toLowerCase().trim() === account.linkedBroker!.toLowerCase().trim())?.value ?? 0)
                : account.balance
            )}
          </ThemedText>

          {account.type === 'investment' && account.linkedBroker && (
            <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <ThemedText style={{ fontSize: 13, color: currColors.textSecondary }}>
                Invested Capital: <ThemedText style={{ color: currColors.text, fontFamily: 'Outfit_600SemiBold' }}>{formatAmount(account.balance)}</ThemedText>
              </ThemedText>
              {brokerAlloc && (
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <ThemedText style={{ fontSize: 13, color: currColors.textSecondary }}>
                    Returns:
                  </ThemedText>
                  <View style={{
                    backgroundColor: brokerAlloc.pnl >= 0 ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}>
                    <ThemedText style={{
                      fontSize: 13,
                      fontFamily: 'Outfit_600SemiBold',
                      color: brokerAlloc.pnl >= 0 ? '#34C759' : '#FF3B30'
                    }}>
                      {brokerAlloc.pnl >= 0 ? '+' : ''}{formatAmount(brokerAlloc.pnl)} ({brokerAlloc.pnl >= 0 ? '+' : ''}{brokerAlloc.pnlPercentage.toFixed(2)}%)
                    </ThemedText>
                  </View>
                </View>
              )}
            </View>
          )}

          {isCreditCard && account.creditLimit ? (
            <View style={styles.limitRow}>
              <View style={styles.limitCol}>
                <ThemedText style={[styles.limitLabel, { color: currColors.textSecondary }]}>Credit Limit</ThemedText>
                <ThemedText style={[styles.limitVal, { color: currColors.text }]}>{formatAmount(account.creditLimit)}</ThemedText>
              </View>
              {blockedAmount > 0 ? (
                <View style={styles.limitCol}>
                  <ThemedText style={[styles.limitLabel, { color: currColors.textSecondary }]}>Blocked (EMI)</ThemedText>
                  <ThemedText style={[styles.limitVal, { color: '#FF9500' }]}>{formatAmount(blockedAmount)}</ThemedText>
                </View>
              ) : null}
              <View style={styles.limitCol}>
                <ThemedText style={[styles.limitLabel, { color: currColors.textSecondary }]}>Available Credit</ThemedText>
                <ThemedText style={[styles.limitVal, { color: '#00C9A7' }]}>
                  {formatAmount(account.creditLimit - (Math.abs(account.balance) + blockedAmount))}
                </ThemedText>
              </View>
            </View>
          ) : null}

          {isCreditCard && utilization > 30 && (
            <View style={[
              styles.warningBanner,
              {
                backgroundColor: utilization > 70 ? 'rgba(255, 59, 48, 0.08)' : 'rgba(255, 149, 0, 0.08)',
                borderColor: utilization > 70 ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 149, 0, 0.15)',
              }
            ]}>
              <ThemedText style={{
                fontSize: 12,
                color: utilization > 70 ? '#FF3B30' : '#FF9500',
                fontFamily: 'Outfit_500Medium',
                lineHeight: 16
              }}>
                ⚠️ {utilization > 70 ? 'High' : 'Moderate'} credit utilization ({utilization.toFixed(0)}%) can impact your credit score. Consider paying off your balance before statement generation.
              </ThemedText>
            </View>
          )}

          {(account.institution || account.accountNumber || account.includeInAssets === false) ? (
            <View style={[styles.detailsRow, { borderTopColor: currColors.border, flexWrap: 'wrap', gap: 12 }]}>
              {account.institution ? (
                <ThemedText style={{ color: currColors.textSecondary, fontSize: 13 }}>
                  Bank: <ThemedText style={{ color: currColors.text }}>{account.institution}</ThemedText>
                </ThemedText>
              ) : null}
              {account.accountNumber ? (
                <ThemedText style={{ color: currColors.textSecondary, fontSize: 13 }}>
                  Number: <ThemedText style={{ color: currColors.text }}>{account.accountNumber}</ThemedText>
                </ThemedText>
              ) : null}
              <ThemedText style={{ color: currColors.textSecondary, fontSize: 13 }}>
                Asset Inclusion: <ThemedText style={{ color: account.includeInAssets !== false ? '#00C9A7' : '#FF3B30' }}>
                  {account.includeInAssets !== false ? 'Included' : 'Excluded'}
                </ThemedText>
              </ThemedText>
            </View>
          ) : null}
        </View>

        {/* Transaction History Section */}
        <View style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
            TRANSACTION HISTORY ({accountTxs.length})
          </ThemedText>
        </View>

        {accountTxs.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <ThemedText style={{ color: currColors.textSecondary, textAlign: 'center' }}>
              No transactions logged for this account.
            </ThemedText>
          </View>
        ) : (
          <View style={[styles.txsList, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            {accountTxs.map((tx, index) => {
              const isSource = tx.accountId === id;
              const isIncome = tx.type === 'income';
              const isExpense = tx.type === 'expense';
              const isTransfer = tx.type === 'transfer';
              
              // Determine display amount and color
              let displayAmount = tx.amount;
              let txColor = currColors.text;
              let typeLabel = '';
              
              if (isTransfer) {
                const otherAcc = isSource 
                  ? accounts.find(a => a.id === tx.toAccountId)
                  : accounts.find(a => a.id === tx.accountId);
                
                typeLabel = isSource 
                  ? `Transfer to ${otherAcc?.name || 'Unknown'}`
                  : `Transfer from ${otherAcc?.name || 'Unknown'}`;
                
                // Transferred out is negative, in is positive
                displayAmount = isSource ? -tx.amount : tx.amount;
                txColor = isSource ? '#FF9500' : '#007AFF';
              } else {
                typeLabel = tx.category;
                txColor = isIncome ? '#34C759' : '#FF3B30';
                displayAmount = isIncome ? tx.amount : -tx.amount;
              }

              return (
                <TouchableOpacity
                  key={tx.id}
                  style={[
                    styles.txItem,
                    { borderBottomColor: currColors.border, borderBottomWidth: index === accountTxs.length - 1 ? 0 : 1 }
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
                              ? 'rgba(0, 122, 255, 0.1)'
                              : isIncome
                              ? 'rgba(52, 199, 89, 0.1)'
                              : 'rgba(255, 59, 48, 0.1)',
                        },
                      ]}
                    >
                      {isTransfer ? (
                        <Activity size={18} color={isSource ? '#FF9500' : '#007AFF'} />
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
                      <ThemedText style={[styles.txSubText, { color: currColors.textSecondary }]}>
                        {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {tx.note ? ` • ${tx.note}` : ''}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.txRight}>
                    <ThemedText style={[styles.txAmountText, { color: txColor }]}>
                      {displayAmount > 0 ? '+' : ''}{formatAmount(displayAmount)}
                    </ThemedText>
                    <TouchableOpacity
                      style={styles.deleteTxBtn}
                      onPress={() => handleDeleteTransaction(tx.id)}
                    >
                      <Trash2 size={14} color={currColors.textSecondary} />
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
  balanceCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    marginTop: 8,
  },
  indicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  indicatorText: {
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 0.5,
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  balanceText: {
    fontSize: 24,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 16,
  },
  limitCol: {
    flex: 1,
  },
  limitLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  limitVal: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
  },
  detailsRow: {
    borderTopWidth: 1,
    marginTop: 20,
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderStyle: 'dashed',
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
  emptyCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
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
  txIcon: {
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
  txLabelText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
  },
  txSubText: {
    fontSize: 11,
    marginTop: 2,
  },
  txRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  txAmountText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
  },
  deleteTxBtn: {
    padding: 4,
  },
  warningBanner: {
    marginTop: 20,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
});
