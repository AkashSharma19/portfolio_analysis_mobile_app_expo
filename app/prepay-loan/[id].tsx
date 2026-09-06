import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Zap,
  Clock,
  PiggyBank,
  Check,
  ChevronDown,
  Sparkles,
  TrendingDown,
  X,
  Wallet,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { EMIPayment } from '@/types/money';
import { formatIndianAmount, parseIndianAmount } from '@/utils/formatters';

export default function PrepayLoanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const loans = useMoneyStore((state) => state.loans) || [];
  const accounts = useMoneyStore((state) => state.accounts) || [];
  const emiPayments = useMoneyStore((state) => state.emiPayments) || [];
  const addEMIPayment = useMoneyStore((state) => state.addEMIPayment);
  const addMoneyTransaction = useMoneyStore((state) => state.addMoneyTransaction);

  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

  const loan = loans.find((l) => l.id === id);

  const loanPayments = useMemo(() => {
    return emiPayments
      .filter((p) => p.loanId === id && p.status === 'paid')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [emiPayments, id]);

  const totalPrincipalPaid = useMemo(() => {
    return loanPayments.reduce((sum, p) => sum + (p.principalPortion || p.amount), 0);
  }, [loanPayments]);

  const effectiveOutstanding = useMemo(() => {
    if (!loan) return 0;
    return Math.max(0, loan.principalAmount - totalPrincipalPaid);
  }, [loan, totalPrincipalPaid]);

  const [prepayAmount, setPrepayAmount] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState<'tenure' | 'emi'>('tenure');
  const [selectedAccountId, setSelectedAccountId] = useState(loan?.linkedAccountId || accounts[0]?.id || '');
  const [showAccountSelector, setShowAccountSelector] = useState(false);

  // Compute remaining months
  const monthsRemaining = useMemo(() => {
    if (!loan || effectiveOutstanding <= 0 || loan.emiAmount <= 0) return 0;
    const r = (loan.interestRate / 12) / 100;
    const emi = loan.emiAmount;
    if (r > 0 && emi <= effectiveOutstanding * r) {
      return Math.round(effectiveOutstanding / emi);
    }
    let balance = effectiveOutstanding;
    let count = 0;
    while (balance > 0 && count < 480) {
      const interest = balance * r;
      const principal = emi - interest;
      if (principal <= 0) break;
      balance -= Math.min(balance, principal);
      count++;
    }
    return count;
  }, [loan, effectiveOutstanding]);

  // Prepayment projection calculations
  const prepaymentSavings = useMemo(() => {
    const prepay = parseIndianAmount(prepayAmount);
    if (!loan || isNaN(prepay) || prepay <= 0 || prepay > effectiveOutstanding) {
      return null;
    }

    let currentBalance = effectiveOutstanding;
    const r = (loan.interestRate / 12) / 100;
    const emi = loan.emiAmount;
    
    let currentMonthsRemaining = 0;
    let currentTotalInterest = 0;
    while (currentBalance > 0 && currentMonthsRemaining < 480) {
      const interest = currentBalance * r;
      const principal = Math.min(currentBalance, emi - interest);
      currentTotalInterest += interest;
      currentBalance -= principal;
      currentMonthsRemaining++;
    }

    // Option 1: Keep EMI Same, Reduce Tenure
    let balanceOpt1 = effectiveOutstanding - prepay;
    let newMonthsRemaining = 0;
    let newTotalInterestOpt1 = 0;
    while (balanceOpt1 > 0 && newMonthsRemaining < 480) {
      const interest = balanceOpt1 * r;
      const principal = Math.min(balanceOpt1, emi - interest);
      newTotalInterestOpt1 += interest;
      balanceOpt1 -= principal;
      newMonthsRemaining++;
    }

    // Option 2: Keep Tenure Same, Reduce EMI
    const balanceOpt2 = effectiveOutstanding - prepay;
    const N_rem = currentMonthsRemaining;
    let newEmiOpt2 = 0;
    let interestSavedOpt2 = 0;
    let emiReducedOpt2 = 0;

    if (N_rem > 0 && balanceOpt2 > 0) {
      if (r > 0) {
        newEmiOpt2 = (balanceOpt2 * r * Math.pow(1 + r, N_rem)) / (Math.pow(1 + r, N_rem) - 1);
      } else {
        newEmiOpt2 = balanceOpt2 / N_rem;
      }
      emiReducedOpt2 = Math.max(0, emi - newEmiOpt2);
      const newTotalInterestOpt2 = (newEmiOpt2 * N_rem) - balanceOpt2;
      interestSavedOpt2 = Math.max(0, currentTotalInterest - newTotalInterestOpt2);
    }

    return {
      prepayAmount: prepay,
      interestSaved: Math.max(0, currentTotalInterest - newTotalInterestOpt1),
      monthsSaved: Math.max(0, currentMonthsRemaining - newMonthsRemaining),
      newMonthsRemaining,
      newEmiOpt2,
      emiReducedOpt2,
      interestSavedOpt2,
      isFullPayoff: prepay >= effectiveOutstanding,
    };
  }, [loan, prepayAmount, effectiveOutstanding]);

  const formatAmount = (val: number) => {
    if (isPrivacyMode) return '••••••';
    const formatted = Math.abs(val).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    const prefix = val < 0 ? '-' : '';
    const symbol = showCurrencySymbol ? '₹' : '';
    return `${prefix}${symbol}${formatted}`;
  };

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleConfirmPrepay = () => {
    handleHaptic();
    if (!loan) return;

    const prepay = parseIndianAmount(prepayAmount);
    if (isNaN(prepay) || prepay <= 0) {
      Alert.alert('Required Field', 'Please enter a valid prepayment amount.');
      return;
    }

    if (prepay > effectiveOutstanding) {
      Alert.alert('Invalid Amount', 'Prepayment amount cannot exceed the outstanding balance.');
      return;
    }

    if (!selectedAccountId) {
      Alert.alert('Required Field', 'Please select a source account to pay from.');
      return;
    }

    const sourceAcc = accounts.find((a) => a.id === selectedAccountId);

    Alert.alert(
      'Confirm Prepayment',
      `Log a principal prepayment of ${formatAmount(prepay)} from ${sourceAcc?.name || 'Account'} for ${loan.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Pay',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const txId = Math.random().toString(36).substring(2, 9);
            
            const payment: EMIPayment = {
              id: Math.random().toString(36).substring(2, 9),
              loanId: loan.id,
              amount: prepay,
              principalPortion: prepay,
              interestPortion: 0,
              date: new Date().toISOString(),
              status: 'paid',
              transactionId: txId,
            };
            addEMIPayment(payment);

            if (sourceAcc) {
              addMoneyTransaction({
                id: txId,
                type: 'expense',
                amount: prepay,
                category: 'EMI Payments',
                accountId: sourceAcc.id,
                date: new Date().toISOString(),
                note: `Prepayment for ${loan.name}`,
                isRecurring: false,
              });
            }

            router.back();
          },
        },
      ]
    );
  };

  if (!loan) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currColors.background }]}>
        <View style={styles.centered}>
          <ThemedText style={{ color: currColors.textSecondary }}>Loan not found.</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currColors.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: currColors.cardSecondary }]}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color={currColors.text} />
          </TouchableOpacity>
          <ThemedText style={[styles.headerTitle, { color: currColors.text }]} numberOfLines={1}>
            Prepay Loan
          </ThemedText>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Current Loan Snapshot Card */}
          <View style={[styles.snapshotCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <View style={styles.snapshotHeader}>
              <ThemedText style={[styles.snapshotLabel, { color: currColors.textSecondary }]}>
                CURRENT OUTSTANDING
              </ThemedText>
              <View style={[styles.badgePill, { backgroundColor: 'rgba(0, 201, 167, 0.12)' }]}>
                <ThemedText style={[styles.badgeText, { color: '#00C9A7' }]}>
                  {loan.lenderName.toUpperCase()}
                </ThemedText>
              </View>
            </View>

            <ThemedText style={[styles.snapshotAmount, { color: currColors.text }]}>
              {formatAmount(effectiveOutstanding)}
            </ThemedText>

            <View style={[styles.dashedDivider, { borderColor: currColors.border }]} />

            <View style={styles.metricsRow}>
              <View style={styles.metricCol}>
                <ThemedText style={[styles.microLabel, { color: currColors.textSecondary }]}>Current EMI</ThemedText>
                <ThemedText style={[styles.metricVal, { color: currColors.text }]}>{formatAmount(loan.emiAmount)}/mo</ThemedText>
              </View>
              <View style={styles.metricCol}>
                <ThemedText style={[styles.microLabel, { color: currColors.textSecondary }]}>Interest Rate</ThemedText>
                <ThemedText style={[styles.metricVal, { color: currColors.text }]}>{loan.interestRate}% p.a.</ThemedText>
              </View>
              <View style={styles.metricCol}>
                <ThemedText style={[styles.microLabel, { color: currColors.textSecondary }]}>Tenure Left</ThemedText>
                <ThemedText style={[styles.metricVal, { color: currColors.text }]}>{monthsRemaining} months</ThemedText>
              </View>
            </View>
          </View>

          {/* Amount Input Box */}
          <View style={[styles.inputCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <ThemedText style={[styles.sectionLabel, { color: currColors.textSecondary }]}>
              PREPAYMENT AMOUNT
            </ThemedText>

            <View style={[styles.inputRow, { borderColor: currColors.border, backgroundColor: currColors.cardSecondary }]}>
              <ThemedText style={[styles.currencyPrefix, { color: currColors.textSecondary }]}>₹</ThemedText>
              <TextInput
                style={[styles.mainInput, { color: currColors.text }]}
                placeholder="0"
                placeholderTextColor={currColors.textSecondary}
                keyboardType="numeric"
                value={prepayAmount}
                onChangeText={(val) => setPrepayAmount(formatIndianAmount(val))}
                autoFocus
              />
              {prepayAmount ? (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={() => setPrepayAmount('')}
                >
                  <X size={16} color={currColors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Quick Chips */}
            <View style={styles.quickChipsRow}>
              {[10000, 25000, 50000, 100000].map((amt) => {
                if (amt > effectiveOutstanding) return null;
                const isSelected = parseIndianAmount(prepayAmount) === amt;
                return (
                  <TouchableOpacity
                    key={amt}
                    style={[
                      styles.chipPill,
                      { backgroundColor: currColors.cardSecondary, borderColor: currColors.border },
                      isSelected && { borderColor: '#00C9A7', backgroundColor: 'rgba(0, 201, 167, 0.12)' }
                    ]}
                    onPress={() => {
                      handleHaptic();
                      setPrepayAmount(formatIndianAmount(amt.toString()));
                    }}
                  >
                    <ThemedText style={{ fontSize: 12, color: isSelected ? '#00C9A7' : currColors.text, fontFamily: 'Outfit_500Medium' }}>
                      +{formatAmount(amt)}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={[
                  styles.chipPill,
                  { backgroundColor: currColors.cardSecondary, borderColor: currColors.border },
                  parseIndianAmount(prepayAmount) === effectiveOutstanding && { borderColor: '#00C9A7', backgroundColor: 'rgba(0, 201, 167, 0.12)' }
                ]}
                onPress={() => {
                  handleHaptic();
                  setPrepayAmount(formatIndianAmount(effectiveOutstanding.toString()));
                }}
              >
                <ThemedText style={{ fontSize: 12, color: parseIndianAmount(prepayAmount) === effectiveOutstanding ? '#00C9A7' : '#00C9A7', fontFamily: 'Outfit_600SemiBold' }}>
                  Full Payoff
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Source Account Selector */}
          <View style={[styles.accountCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <ThemedText style={[styles.sectionLabel, { color: currColors.textSecondary }]}>
              PAY FROM ACCOUNT
            </ThemedText>

            <TouchableOpacity
              style={[styles.accountSelectBox, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border }]}
              onPress={() => {
                handleHaptic();
                setShowAccountSelector(!showAccountSelector);
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Wallet size={18} color="#00C9A7" />
                <ThemedText style={{ fontSize: 14, color: currColors.text, fontFamily: 'Outfit_500Medium' }}>
                  {selectedAccount ? selectedAccount.name : 'Select Account'}
                </ThemedText>
              </View>
              <ChevronDown size={16} color={currColors.textSecondary} />
            </TouchableOpacity>

            {showAccountSelector && (
              <View style={[styles.accountDropdown, { borderColor: currColors.border, backgroundColor: currColors.cardSecondary }]}>
                {accounts.map((acc) => (
                  <TouchableOpacity
                    key={acc.id}
                    style={[
                      styles.accountOption,
                      acc.id === selectedAccountId && { backgroundColor: 'rgba(0, 201, 167, 0.1)' }
                    ]}
                    onPress={() => {
                      handleHaptic();
                      setSelectedAccountId(acc.id);
                      setShowAccountSelector(false);
                    }}
                  >
                    <ThemedText style={{ fontSize: 13, color: acc.id === selectedAccountId ? '#00C9A7' : currColors.text, fontFamily: 'Outfit_500Medium' }}>
                      {acc.name}
                    </ThemedText>
                    {acc.id === selectedAccountId && <Check size={16} color="#00C9A7" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Prepayment Impact & Strategies */}
          {prepaymentSavings && (
            <View style={{ marginTop: 4 }}>
              <ThemedText style={[styles.sectionTitle, { color: currColors.textSecondary, marginHorizontal: 16, marginBottom: 8 }]}>
                CHOOSE PREPAYMENT BENEFIT
              </ThemedText>

              {/* Strategy A: Reduce Tenure */}
              <TouchableOpacity
                style={[
                  styles.strategyCard,
                  { backgroundColor: currColors.card, borderColor: selectedStrategy === 'tenure' ? '#00C9A7' : currColors.border }
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  handleHaptic();
                  setSelectedStrategy('tenure');
                }}
              >
                <View style={styles.strategyHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Clock size={16} color="#00C9A7" />
                    <ThemedText style={{ fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#00C9A7', letterSpacing: 0.5 }}>
                      STRATEGY A: FINISH FASTER (KEEP EMI SAME)
                    </ThemedText>
                  </View>
                  {selectedStrategy === 'tenure' && (
                    <View style={[styles.selectedRadio, { backgroundColor: '#00C9A7' }]}>
                      <Check size={12} color="#FFFFFF" />
                    </View>
                  )}
                </View>

                <View style={styles.strategyGrid}>
                  <View style={styles.strategyCol}>
                    <ThemedText style={[styles.strategyColLabel, { color: currColors.textSecondary }]}>Interest Saved</ThemedText>
                    <ThemedText style={[styles.strategyColVal, { color: '#34C759' }]}>
                      {formatAmount(prepaymentSavings.interestSaved)}
                    </ThemedText>
                  </View>
                  <View style={styles.strategyCol}>
                    <ThemedText style={[styles.strategyColLabel, { color: currColors.textSecondary }]}>Tenure Reduced</ThemedText>
                    <ThemedText style={[styles.strategyColVal, { color: '#007AFF' }]}>
                      {prepaymentSavings.monthsSaved} months earlier
                    </ThemedText>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Strategy B: Reduce Monthly EMI */}
              <TouchableOpacity
                style={[
                  styles.strategyCard,
                  { backgroundColor: currColors.card, borderColor: selectedStrategy === 'emi' ? '#FF9500' : currColors.border, marginTop: 10 }
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  handleHaptic();
                  setSelectedStrategy('emi');
                }}
              >
                <View style={styles.strategyHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <PiggyBank size={16} color="#FF9500" />
                    <ThemedText style={{ fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#FF9500', letterSpacing: 0.5 }}>
                      STRATEGY B: LOWER MONTHLY EMI (KEEP TENURE)
                    </ThemedText>
                  </View>
                  {selectedStrategy === 'emi' && (
                    <View style={[styles.selectedRadio, { backgroundColor: '#FF9500' }]}>
                      <Check size={12} color="#FFFFFF" />
                    </View>
                  )}
                </View>

                <View style={styles.strategyGrid}>
                  <View style={styles.strategyCol}>
                    <ThemedText style={[styles.strategyColLabel, { color: currColors.textSecondary }]}>New Monthly EMI</ThemedText>
                    <ThemedText style={[styles.strategyColVal, { color: '#FF9500' }]}>
                      {formatAmount(prepaymentSavings.newEmiOpt2)}/mo
                    </ThemedText>
                    <ThemedText style={{ fontSize: 10, color: currColors.textSecondary, marginTop: 2 }}>
                      Saves {formatAmount(prepaymentSavings.emiReducedOpt2)}/mo
                    </ThemedText>
                  </View>
                  <View style={styles.strategyCol}>
                    <ThemedText style={[styles.strategyColLabel, { color: currColors.textSecondary }]}>Interest Saved</ThemedText>
                    <ThemedText style={[styles.strategyColVal, { color: '#34C759' }]}>
                      {formatAmount(prepaymentSavings.interestSavedOpt2)}
                    </ThemedText>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Confirm Button */}
          {prepaymentSavings && (
            <TouchableOpacity
              style={[styles.payNowBtn, { backgroundColor: '#00C9A7' }]}
              activeOpacity={0.8}
              onPress={handleConfirmPrepay}
            >
              <Zap size={18} color="#FFFFFF" />
              <ThemedText style={styles.payNowBtnText}>
                Confirm & Pay {formatAmount(prepaymentSavings.prepayAmount)}
              </ThemedText>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  snapshotCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  snapshotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  snapshotLabel: {
    fontSize: 10,
    fontWeight: '700',
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
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  snapshotAmount: {
    fontSize: 24,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
    marginBottom: 12,
  },
  dashedDivider: {
    height: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 1,
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricCol: {
    flex: 1,
  },
  microLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
  inputCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 12,
  },
  currencyPrefix: {
    fontSize: 20,
    fontFamily: 'Outfit_500Medium',
    marginRight: 6,
  },
  mainInput: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Outfit_400Regular',
  },
  clearBtn: {
    padding: 4,
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chipPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  accountCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  accountSelectBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  accountDropdown: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 8,
    overflow: 'hidden',
  },
  accountOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  strategyCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
  },
  strategyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  strategyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  strategyCol: {
    flex: 1,
  },
  strategyColLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  strategyColVal: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
  payNowBtn: {
    marginHorizontal: 16,
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
  },
  payNowBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
});
