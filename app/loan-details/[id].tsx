import React, { useMemo, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Calendar,
  DollarSign,
  TrendingDown,
  ChevronDown,
  Info,
  X,
  Check,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { EMIPayment } from '@/types/money';
import { formatIndianAmount, parseIndianAmount } from '@/utils/formatters';

const TYPE_CONFIG = {
  home: { label: 'Home Loan', color: '#007AFF' },
  car: { label: 'Car Loan', color: '#34C759' },
  personal: { label: 'Personal Loan', color: '#FF9500' },
  education: { label: 'Education Loan', color: '#AF52DE' },
  other: { label: 'Other Loan', color: '#8E8E93' },
};

export default function LoanDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const {
    loans,
    accounts,
    emiPayments,
    removeLoan,
    addEMIPayment,
    addMoneyTransaction,
    categories,
    removeMoneyTransaction,
    moneyTransactions,
    removeEMIPayment,
  } = useMoneyStore();

  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

  const loan = useMemo(() => {
    return loans.find((l) => l.id === id);
  }, [id, loans]);

  const loanPayments = useMemo(() => {
    return emiPayments
      .filter((p) => p.loanId === id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [id, emiPayments]);

  const [prepayAmount, setPrepayAmount] = useState('');
  const [showPrepayCalc, setShowPrepayCalc] = useState(false);

  // Log Payment Modal states
  const [showLogPaymentModal, setShowLogPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('EMI Payments');
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);

  // Auto-heal loan record if payments exist but outstanding wasn't updated
  useEffect(() => {
    if (loan && loanPayments.length > 0) {
      const totalPrincipalPaid = loanPayments.reduce((sum, p) => sum + (p.principalPortion || p.amount), 0);
      const expectedOutstanding = Math.max(0, loan.principalAmount - totalPrincipalPaid);
      if (loan.outstandingAmount > expectedOutstanding + 0.01) {
        useMoneyStore.setState((state) => ({
          loans: state.loans.map((l) =>
            l.id === loan.id ? { ...l, outstandingAmount: expectedOutstanding } : l
          ),
        }));
      }
    }
  }, [loan, loanPayments]);

  const totalPrincipalPaid = useMemo(() => {
    return loanPayments.reduce((sum, p) => sum + (p.principalPortion || p.amount), 0);
  }, [loanPayments]);

  const effectiveOutstanding = useMemo(() => {
    if (!loan) return 0;
    if (loanPayments.length > 0) {
      return Math.max(0, Math.min(loan.outstandingAmount, loan.principalAmount - totalPrincipalPaid));
    }
    return loan.outstandingAmount;
  }, [loan, loanPayments, totalPrincipalPaid]);

  // Amortization Schedule Calculation (Generates the next 12 installments + past payments)
  const amortizationSchedule = useMemo(() => {
    if (!loan) return [];

    const schedule = [];
    
    // 1. Process past paid payments (oldest first)
    const pastPaymentsAsc = [...loanPayments].reverse();
    let bal = effectiveOutstanding;
    
    // Calculate start balances and end balances backwards for past payments
    const pastScheduleRows = [];
    for (let i = pastPaymentsAsc.length - 1; i >= 0; i--) {
      const p = pastPaymentsAsc[i];
      const startBalance = bal + p.principalPortion;
      const endBalance = bal;
      bal = startBalance; // update bal backwards

      const labelDate = new Date(p.date);
      const monthLabel = labelDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

      pastScheduleRows.unshift({
        id: p.id,
        isPaid: true,
        isUpcoming: false,
        monthLabel,
        startBalance,
        emi: p.amount,
        principalPortion: p.principalPortion,
        interestPortion: p.interestPortion,
        endBalance,
      });
    }
    
    // Push past payments in chronological order (oldest first)
    schedule.push(...pastScheduleRows);

    // 2. Generate future projections starting from the next unpaid month
    let balance = effectiveOutstanding;
    const rate = (loan.interestRate / 12) / 100;
    const emi = loan.emiAmount;
    
    let nextUnpaidDate: Date;
    if (pastPaymentsAsc.length > 0) {
      const latestPaymentDate = new Date(pastPaymentsAsc[pastPaymentsAsc.length - 1].date);
      nextUnpaidDate = new Date(latestPaymentDate.getFullYear(), latestPaymentDate.getMonth() + 1, 1);
    } else {
      const startDate = new Date(loan.startDate);
      nextUnpaidDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    }

    for (let i = 0; i < 12 && balance > 0; i++) {
      const interestPortion = balance * rate;
      const principalPortion = Math.min(balance, emi - interestPortion);
      const startBalance = balance;
      balance = Math.max(0, balance - principalPortion);

      const labelDate = new Date(nextUnpaidDate.getFullYear(), nextUnpaidDate.getMonth() + i, 1);
      const monthLabel = labelDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

      schedule.push({
        id: `projected-${i}`,
        isPaid: false,
        isUpcoming: i === 0,
        monthLabel,
        startBalance,
        emi: interestPortion + principalPortion,
        principalPortion,
        interestPortion,
        endBalance: balance,
      });
    }

    return schedule;
  }, [loan, loanPayments, effectiveOutstanding]);

  // Prepayment projection calculations
  const prepaymentSavings = useMemo(() => {
    const prepay = parseIndianAmount(prepayAmount);
    if (!loan || isNaN(prepay) || prepay <= 0 || prepay > loan.outstandingAmount) {
      return null;
    }

    // Current projection without prepayment
    let currentBalance = loan.outstandingAmount;
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
    let balanceOpt1 = loan.outstandingAmount - prepay;
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
    const balanceOpt2 = loan.outstandingAmount - prepay;
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
      // Option 1: Reduce Tenure
      interestSaved: Math.max(0, currentTotalInterest - newTotalInterestOpt1),
      monthsSaved: Math.max(0, currentMonthsRemaining - newMonthsRemaining),
      
      // Option 2: Reduce EMI
      newEmiOpt2,
      emiReducedOpt2,
      interestSavedOpt2,
    };
  }, [loan, prepayAmount]);

  const config = loan ? (TYPE_CONFIG[loan.type] || TYPE_CONFIG.other) : TYPE_CONFIG.other;

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

  const handleDeleteLoan = () => {
    handleHaptic();
    if (!loan) return;
    
    Alert.alert(
      'Delete Loan',
      `Are you sure you want to delete "${loan.name}" and all its payments history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            removeLoan(loan.id);
            router.back();
          },
        },
      ]
    );
  };

  const handleDeletePayment = (payment: EMIPayment) => {
    handleHaptic();
    Alert.alert(
      'Delete Payment Log',
      'Are you sure you want to delete this payment log? This will revert its impact on your account balance and loan status.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            // 1. Find if there is a matching transaction
            let txId = payment.transactionId;
            if (!txId) {
              // Fallback match: same amount and within 5 seconds of the payment date
              const pTime = new Date(payment.date).getTime();
              const matchedTx = moneyTransactions.find((t) => {
                const tTime = new Date(t.date).getTime();
                return Math.abs(pTime - tTime) < 5000 && t.amount === payment.amount;
              });
              if (matchedTx) {
                txId = matchedTx.id;
              }
            }

            if (txId) {
              removeMoneyTransaction(txId);
            } else {
              removeEMIPayment(payment.id);
            }
          },
        },
      ]
    );
  };

  const handleLogPayment = () => {
    handleHaptic();
    if (!loan) return;

    if (loan.outstandingAmount <= 0) {
      Alert.alert('Loan Completed', 'This loan is already paid off!');
      return;
    }

    setPaymentAmount(formatIndianAmount(loan.emiAmount.toString()));
    setSelectedAccountId(loan.linkedAccountId || accounts[0]?.id || '');
    setSelectedCategory('EMI Payments');
    setShowLogPaymentModal(true);
    setShowAccountSelector(false);
    setShowCategorySelector(false);
  };

  const handleConfirmLogPayment = () => {
    handleHaptic();
    if (!loan) return;

    const A = parseIndianAmount(paymentAmount);
    if (isNaN(A) || A <= 0) {
      Alert.alert('Required Field', 'Please enter a valid payment amount.');
      return;
    }

    if (!selectedAccountId) {
      Alert.alert('Required Field', 'Please select a source account.');
      return;
    }

    const rate = (loan.interestRate / 12) / 100;
    const interestPortion = Math.min(loan.outstandingAmount * rate, A);
    const principalPortion = Math.min(loan.outstandingAmount, A - interestPortion);
    const finalAmount = interestPortion + principalPortion;

    const txId = Math.random().toString(36).substring(2, 9);
    // 1. Add payment record
    const payment: EMIPayment = {
      id: Math.random().toString(36).substring(2, 9),
      loanId: loan.id,
      amount: finalAmount,
      principalPortion,
      interestPortion,
      date: new Date().toISOString(),
      status: 'paid',
      transactionId: txId,
    };
    addEMIPayment(payment);

    // 2. Add as transaction in Money Manager (expense type)
    addMoneyTransaction({
      id: txId,
      type: 'expense',
      amount: finalAmount,
      category: selectedCategory,
      accountId: selectedAccountId,
      date: new Date().toISOString(),
      note: `EMI payment for ${loan.name}` + (finalAmount > loan.emiAmount ? ' (includes prepayment)' : ''),
      isRecurring: false,
    });

    setShowLogPaymentModal(false);
  };

  const handlePrepay = () => {
    handleHaptic();
    const amount = parseIndianAmount(prepayAmount);
    if (isNaN(amount) || amount <= 0 || !loan) {
      Alert.alert('Error', 'Please enter a valid prepayment amount.');
      return;
    }
    if (amount > loan.outstandingAmount) {
      Alert.alert('Error', 'Prepayment amount cannot exceed outstanding balance.');
      return;
    }

    Alert.alert(
      'Make Prepayment',
      `Log a prepayment of ${formatAmount(amount)}? This will reduce the outstanding balance directly.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            
            const txId = Math.random().toString(36).substring(2, 9);
            // 1. Reduce outstanding balance by adding payment
            const payment: EMIPayment = {
              id: Math.random().toString(36).substring(2, 9),
              loanId: loan.id,
              amount: amount,
              principalPortion: amount,
              interestPortion: 0,
              date: new Date().toISOString(),
              status: 'paid',
              transactionId: txId,
            };
            addEMIPayment(payment);

            // 2. Add expense transaction
            if (loan.linkedAccountId) {
              addMoneyTransaction({
                id: txId,
                type: 'expense',
                amount,
                category: 'EMI Payments',
                accountId: loan.linkedAccountId,
                date: new Date().toISOString(),
                note: `Prepayment for ${loan.name}`,
                isRecurring: false,
              });
            }

            setPrepayAmount('');
            setShowPrepayCalc(false);
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

  // Calculate overall paid progress
  const totalPaid = Math.max(0, loan.principalAmount - effectiveOutstanding);
  const paidPercentage = loan.principalAmount > 0 ? (totalPaid / loan.principalAmount) * 100 : 0;
  const linkedAccount = accounts.find((a) => a.id === loan.linkedAccountId);

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
          {loan.name}
        </ThemedText>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: currColors.cardSecondary }]}
            onPress={() => {
              handleHaptic();
              router.push({ pathname: '/add-loan', params: { id: loan.id } });
            }}
          >
            <Edit2 size={18} color={config.color} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}
            onPress={handleDeleteLoan}
          >
            <Trash2 size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        {/* Outstanding Card */}
        <View style={[styles.outstandingCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
          <View style={[styles.indicatorPill, { backgroundColor: `${config.color}15` }]}>
            <ThemedText style={[styles.indicatorText, { color: config.color }]}>
              {loan.lenderName.toUpperCase()}
            </ThemedText>
          </View>
          <ThemedText style={[styles.balanceLabel, { color: currColors.textSecondary }]}>OUTSTANDING DEBT</ThemedText>
          <ThemedText style={[styles.balanceText, { color: currColors.text }]}>
            {formatAmount(effectiveOutstanding)}
          </ThemedText>

          {/* Progress bar */}
          <View style={styles.progressSection}>
            <View style={[styles.progressBarBG, { backgroundColor: currColors.cardSecondary }]}>
              <View style={[styles.progressBarFill, { width: `${Math.min(100, paidPercentage)}%`, backgroundColor: config.color }]} />
            </View>
            <View style={styles.progressLabels}>
              <ThemedText style={{ fontSize: 11, color: currColors.textSecondary }}>
                {paidPercentage.toFixed(1)}% paid
              </ThemedText>
              <ThemedText style={{ fontSize: 11, color: currColors.textSecondary }}>
                Total Principal: {formatAmount(loan.principalAmount)}
              </ThemedText>
            </View>
          </View>

          {/* Details list */}
          <View style={[styles.detailsGrid, { borderTopColor: currColors.border }]}>
            <View style={styles.detailsCol}>
              <ThemedText style={[styles.detailLabel, { color: currColors.textSecondary }]}>Interest Rate</ThemedText>
              <ThemedText style={[styles.detailVal, { color: currColors.text }]}>{loan.interestRate}% p.a.</ThemedText>
            </View>
            <View style={styles.detailsCol}>
              <ThemedText style={[styles.detailLabel, { color: currColors.textSecondary }]}>EMI Amount</ThemedText>
              <ThemedText style={[styles.detailVal, { color: config.color }]}>{formatAmount(loan.emiAmount)}/mo</ThemedText>
            </View>
            <View style={styles.detailsCol}>
              <ThemedText style={[styles.detailLabel, { color: currColors.textSecondary }]}>Tenure</ThemedText>
              <ThemedText style={[styles.detailVal, { color: currColors.text }]}>{loan.tenureMonths} Months</ThemedText>
            </View>
          </View>

          {linkedAccount ? (
            <View style={[styles.linkedAccountRow, { backgroundColor: currColors.cardSecondary }]}>
              <Info size={14} color={currColors.textSecondary} />
              <ThemedText style={{ fontSize: 11, color: currColors.textSecondary, marginLeft: 8 }}>
                EMIs debited from: <ThemedText style={{ fontFamily: 'Outfit_600SemiBold', color: currColors.text }}>{linkedAccount.name}</ThemedText>
              </ThemedText>
            </View>
          ) : null}
        </View>

        {/* Log EMI Payment CTA Button */}
        {loan.outstandingAmount > 0 ? (
          <TouchableOpacity
            style={[styles.payEmiBtn, { backgroundColor: config.color }]}
            activeOpacity={0.8}
            onPress={handleLogPayment}
          >
            <Calendar size={20} color="#FFFFFF" />
            <ThemedText style={styles.payEmiBtnText}>
              Log EMI Payment ({formatAmount(loan.emiAmount)})
            </ThemedText>
          </TouchableOpacity>
        ) : null}

        {/* Prepayment Calculator Section */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity
            style={[styles.sectionHeaderClickable, { backgroundColor: currColors.card, borderColor: currColors.border }]}
            activeOpacity={0.8}
            onPress={() => {
              handleHaptic();
              setShowPrepayCalc(!showPrepayCalc);
            }}
          >
            <View style={styles.clickableHeaderLeft}>
              <TrendingDown size={20} color="#00C9A7" />
              <ThemedText style={[styles.clickableHeaderTitle, { color: currColors.text }]}>
                Prepayment Savings Calculator
              </ThemedText>
            </View>
            <ChevronDown
              size={18}
              color={currColors.textSecondary}
              style={{ transform: [{ rotate: showPrepayCalc ? '180deg' : '0deg' }] }}
            />
          </TouchableOpacity>

          {showPrepayCalc && (
            <View style={[styles.calculatorBody, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
              <ThemedText style={[styles.calcLabel, { color: currColors.textSecondary }]}>
                ENTER PREPAYMENT AMOUNT
              </ThemedText>
              <View style={styles.calcInputRow}>
                <TextInput
                  style={[styles.calcInput, { color: currColors.text, borderColor: currColors.border }]}
                  placeholder="e.g. 50,000"
                  placeholderTextColor={currColors.textSecondary}
                  keyboardType="numeric"
                  value={prepayAmount}
                  onChangeText={(val) => setPrepayAmount(formatIndianAmount(val))}
                />
                <TouchableOpacity
                  style={[styles.calcBtn, { backgroundColor: '#00C9A7' }]}
                  onPress={handlePrepay}
                >
                  <ThemedText style={styles.calcBtnText}>Apply</ThemedText>
                </TouchableOpacity>
              </View>

              {prepaymentSavings && (
                <View style={{ marginTop: 16 }}>
                  {/* Option 1: Reduce Tenure */}
                  <View style={[styles.savingsCard, { backgroundColor: currColors.cardSecondary, marginBottom: 12 }]}>
                    <View style={{ width: '100%', marginBottom: 8 }}>
                      <ThemedText style={{ fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#00C9A7' }}>
                        OPTION 1: REDUCE TENURE (KEEP EMI SAME)
                      </ThemedText>
                    </View>
                    <View style={styles.savingsCol}>
                      <ThemedText style={{ fontSize: 10, color: currColors.textSecondary, fontFamily: 'Outfit_500Medium' }}>
                        INTEREST SAVED
                      </ThemedText>
                      <ThemedText style={{ fontSize: 16, fontFamily: 'Outfit_600SemiBold', color: '#34C759', marginTop: 4 }}>
                        {formatAmount(prepaymentSavings.interestSaved)}
                      </ThemedText>
                    </View>
                    <View style={styles.savingsCol}>
                      <ThemedText style={{ fontSize: 10, color: currColors.textSecondary, fontFamily: 'Outfit_500Medium' }}>
                        TENURE REDUCED BY
                      </ThemedText>
                      <ThemedText style={{ fontSize: 16, fontFamily: 'Outfit_600SemiBold', color: '#007AFF', marginTop: 4 }}>
                        {prepaymentSavings.monthsSaved} months
                      </ThemedText>
                    </View>
                  </View>

                  {/* Option 2: Reduce EMI */}
                  <View style={[styles.savingsCard, { backgroundColor: currColors.cardSecondary }]}>
                    <View style={{ width: '100%', marginBottom: 8 }}>
                      <ThemedText style={{ fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#FF9500' }}>
                        OPTION 2: REDUCE EMI (KEEP TENURE SAME)
                      </ThemedText>
                    </View>
                    <View style={styles.savingsCol}>
                      <ThemedText style={{ fontSize: 10, color: currColors.textSecondary, fontFamily: 'Outfit_500Medium' }}>
                        INTEREST SAVED
                      </ThemedText>
                      <ThemedText style={{ fontSize: 16, fontFamily: 'Outfit_600SemiBold', color: '#34C759', marginTop: 4 }}>
                        {formatAmount(prepaymentSavings.interestSavedOpt2)}
                      </ThemedText>
                    </View>
                    <View style={styles.savingsCol}>
                      <ThemedText style={{ fontSize: 10, color: currColors.textSecondary, fontFamily: 'Outfit_500Medium' }}>
                        NEW MONTHLY EMI
                      </ThemedText>
                      <ThemedText style={{ fontSize: 16, fontFamily: 'Outfit_600SemiBold', color: '#FF9500', marginTop: 4 }}>
                        {formatAmount(prepaymentSavings.newEmiOpt2)}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 9, color: currColors.textSecondary, marginTop: 2 }}>
                        Saves {formatAmount(prepaymentSavings.emiReducedOpt2)}/mo
                      </ThemedText>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Amortization Schedule Preview */}
        <View style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
            LOAN AMORTIZATION SCHEDULE
          </ThemedText>
        </View>

        <View style={[styles.amortCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
          <View style={[styles.amortRowHeader, { borderBottomColor: currColors.border }]}>
            <ThemedText style={styles.amortColHeader}>Month</ThemedText>
            <ThemedText style={styles.amortColHeader}>Principal</ThemedText>
            <ThemedText style={styles.amortColHeader}>Interest</ThemedText>
            <ThemedText style={styles.amortColHeaderRight}>Remaining</ThemedText>
          </View>
          
          {amortizationSchedule.map((row) => (
            <View
              key={row.id || row.monthLabel}
              style={[
                styles.amortRow,
                row.isUpcoming && {
                  backgroundColor: 'rgba(255, 179, 0, 0.1)',
                  borderColor: 'rgba(255, 179, 0, 0.35)',
                  borderWidth: 1,
                  borderRadius: 10,
                  marginVertical: 3,
                  paddingHorizontal: 8,
                },
              ]}
            >
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                {row.isPaid ? (
                  <Check size={12} color="#34C759" strokeWidth={3.5} />
                ) : row.isUpcoming ? (
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFB300' }} />
                ) : null}
                <ThemedText
                  style={{
                    fontSize: 12,
                    fontFamily: row.isUpcoming ? 'Outfit_600SemiBold' : 'Outfit_500Medium',
                    color: row.isPaid
                      ? '#34C759'
                      : row.isUpcoming
                        ? '#FFB300'
                        : currColors.textSecondary,
                  }}
                >
                  {row.monthLabel}
                </ThemedText>
              </View>
              <ThemedText
                style={[
                  styles.amortColText,
                  {
                    color: row.isPaid
                      ? currColors.textSecondary
                      : currColors.text,
                    fontFamily: row.isUpcoming ? 'Outfit_600SemiBold' : 'Outfit_500Medium',
                  },
                ]}
              >
                {formatAmount(row.principalPortion)}
              </ThemedText>
              <ThemedText
                style={[
                  styles.amortColText,
                  {
                    color: row.isPaid
                      ? '#FF3B30' + '99'
                      : row.isUpcoming
                        ? '#FF9500'
                        : '#FF3B30',
                    fontFamily: row.isUpcoming ? 'Outfit_600SemiBold' : 'Outfit_500Medium',
                  },
                ]}
              >
                {formatAmount(row.interestPortion)}
              </ThemedText>
              <ThemedText
                style={[
                  styles.amortColTextRight,
                  {
                    color: row.isPaid
                      ? currColors.textSecondary
                      : currColors.text,
                    fontFamily: 'Outfit_600SemiBold',
                  },
                ]}
              >
                {formatAmount(row.endBalance)}
              </ThemedText>
            </View>
          ))}
        </View>

        {/* Payment History timeline */}
        <View style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
            EMI PAYMENTS RECORD ({loanPayments.length})
          </ThemedText>
        </View>

        {loanPayments.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <ThemedText style={{ color: currColors.textSecondary, textAlign: 'center' }}>
              No payments logged yet. Log your first monthly payment using the button above.
            </ThemedText>
          </View>
        ) : (
          <View style={[styles.timelineContainer, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            {loanPayments.map((p, idx) => (
              <View key={p.id} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineDot, { backgroundColor: config.color }]} />
                  {idx !== loanPayments.length - 1 && (
                    <View style={[styles.timelineLine, { backgroundColor: currColors.border }]} />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeaderRow}>
                    <ThemedText style={[styles.timelineTitle, { color: currColors.text }]}>
                      EMI Paid: {formatAmount(p.amount)}
                    </ThemedText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ThemedText style={[styles.timelineDate, { color: currColors.textSecondary }]}>
                        {new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </ThemedText>
                      <TouchableOpacity onPress={() => handleDeletePayment(p)} style={{ padding: 4 }}>
                        <Trash2 size={14} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <ThemedText style={[styles.timelineSub, { color: currColors.textSecondary }]}>
                    Principal: {formatAmount(p.principalPortion)} • Interest: {formatAmount(p.interestPortion)}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Log EMI Payment Modal */}
      <Modal visible={showLogPaymentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%', justifyContent: 'flex-end' }}
          >
            <View style={[styles.modalContent, { backgroundColor: currColors.card }]}>
              {showAccountSelector ? (
                // RENDER ACCOUNT SELECTOR LIST DIRECTLY IN MODAL SHEET (Prevents iOS nested modal collision)
                <View style={{ width: '100%', minHeight: 300, maxHeight: 450 }}>
                  <View style={[styles.modalHeader, { borderBottomColor: currColors.border, marginBottom: 12 }]}>
                    <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>
                      Select Account
                    </ThemedText>
                    <TouchableOpacity onPress={() => setShowAccountSelector(false)}>
                      <X size={22} color={currColors.text} />
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={accounts.filter(a => !a.isArchived)}
                    keyExtractor={(item) => item.id}
                    bounces={false}
                    style={{ maxHeight: 350 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[styles.modalItem, { borderBottomColor: currColors.border }]}
                        onPress={() => {
                          handleHaptic();
                          setSelectedAccountId(item.id);
                          setShowAccountSelector(false);
                        }}
                      >
                        <ThemedText style={{ color: currColors.text, fontSize: 16 }}>{item.name}</ThemedText>
                        <ThemedText style={{ color: currColors.textSecondary, fontSize: 12 }}>
                          {formatAmount(item.balance)}
                        </ThemedText>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              ) : showCategorySelector ? (
                // RENDER CATEGORY SELECTOR LIST DIRECTLY IN MODAL SHEET
                <View style={{ width: '100%', minHeight: 300, maxHeight: 450 }}>
                  <View style={[styles.modalHeader, { borderBottomColor: currColors.border, marginBottom: 12 }]}>
                    <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>
                      Select Category
                    </ThemedText>
                    <TouchableOpacity onPress={() => setShowCategorySelector(false)}>
                      <X size={22} color={currColors.text} />
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={categories.expense}
                    keyExtractor={(item) => item}
                    bounces={false}
                    style={{ maxHeight: 350 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[styles.modalItem, { borderBottomColor: currColors.border }]}
                        onPress={() => {
                          handleHaptic();
                          setSelectedCategory(item);
                          setShowCategorySelector(false);
                        }}
                      >
                        <ThemedText style={{ color: currColors.text, fontSize: 16 }}>{item}</ThemedText>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              ) : (
                // RENDER LOG LOAN PAYMENT INPUTS
                <>
                  {/* Header */}
                  <View style={[styles.modalHeader, { borderBottomColor: currColors.border }]}>
                    <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>
                      Log Loan Payment
                    </ThemedText>
                    <TouchableOpacity onPress={() => setShowLogPaymentModal(false)}>
                      <X size={22} color={currColors.text} />
                    </TouchableOpacity>
                  </View>

                  {/* Amount input */}
                  <View style={styles.modalInputGroup}>
                    <ThemedText style={[styles.modalLabel, { color: currColors.textSecondary }]}>PAYMENT AMOUNT</ThemedText>
                    <TextInput
                      style={[styles.modalAmountInput, { color: currColors.text, borderBottomColor: currColors.border }]}
                      placeholder="e.g. 25,000"
                      placeholderTextColor={currColors.textSecondary}
                      keyboardType="numeric"
                      value={paymentAmount}
                      onChangeText={(val) => setPaymentAmount(formatIndianAmount(val))}
                    />
                  </View>

                  {/* Account Selector */}
                  <View style={styles.modalInputGroup}>
                    <ThemedText style={[styles.modalLabel, { color: currColors.textSecondary }]}>PAY FROM ACCOUNT</ThemedText>
                    <TouchableOpacity
                      style={[styles.modalSelectBox, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border }]}
                      onPress={() => {
                        handleHaptic();
                        setShowAccountSelector(true);
                      }}
                    >
                      <ThemedText style={{ color: selectedAccountId ? currColors.text : currColors.textSecondary, fontSize: 16 }}>
                        {accounts.find(a => a.id === selectedAccountId)?.name || 'Select Account'}
                      </ThemedText>
                      <ChevronDown size={18} color={currColors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {/* Category Selector */}
                  <View style={styles.modalInputGroup}>
                    <ThemedText style={[styles.modalLabel, { color: currColors.textSecondary }]}>EXPENSE CATEGORY</ThemedText>
                    <TouchableOpacity
                      style={[styles.modalSelectBox, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border }]}
                      onPress={() => {
                        handleHaptic();
                        setShowCategorySelector(true);
                      }}
                    >
                      <ThemedText style={{ color: selectedCategory ? currColors.text : currColors.textSecondary, fontSize: 16 }}>
                        {selectedCategory || 'Select Category'}
                      </ThemedText>
                      <ChevronDown size={18} color={currColors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {/* Dynamic split details info card */}
                  {(() => {
                    const parsedAmt = parseFloat(paymentAmount) || 0;
                    const r_rate = (loan.interestRate / 12) / 100;
                    const standardInterest = loan.outstandingAmount * r_rate;
                    
                    const dispInterest = Math.min(standardInterest, parsedAmt);
                    const dispPrincipal = Math.min(loan.outstandingAmount, parsedAmt - dispInterest);
                    const extraPrepayment = Math.max(0, parsedAmt - loan.emiAmount);

                    return (
                      <View style={[styles.splitInfoCard, { backgroundColor: currColors.cardSecondary }]}>
                        <View style={styles.splitRow}>
                          <ThemedText style={{ fontSize: 12, color: currColors.textSecondary }}>Interest Portion:</ThemedText>
                          <ThemedText style={{ fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#FF3B30' }}>
                            {formatAmount(dispInterest)}
                          </ThemedText>
                        </View>
                        <View style={styles.splitRow}>
                          <ThemedText style={{ fontSize: 12, color: currColors.textSecondary }}>Principal Portion:</ThemedText>
                          <ThemedText style={{ fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#34C759' }}>
                            {formatAmount(dispPrincipal)}
                          </ThemedText>
                        </View>
                        {extraPrepayment > 0 ? (
                          <View style={[styles.splitRow, { borderTopWidth: 1, borderTopColor: currColors.border, paddingTop: 8, marginTop: 4, borderStyle: 'dashed' }]}>
                            <ThemedText style={{ fontSize: 12, color: '#00C9A7', fontFamily: 'Outfit_600SemiBold' }}>Extra Principal Adjustment:</ThemedText>
                            <ThemedText style={{ fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#00C9A7' }}>
                              {formatAmount(extraPrepayment)}
                            </ThemedText>
                          </View>
                        ) : null}
                      </View>
                    );
                  })()}

                  {/* Submit CTA */}
                  <TouchableOpacity
                    style={[styles.modalSubmitBtn, { backgroundColor: config.color }]}
                    onPress={handleConfirmLogPayment}
                  >
                    <ThemedText style={styles.modalSubmitBtnText}>Confirm Payment</ThemedText>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  outstandingCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginTop: 8,
  },
  indicatorPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
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
  progressSection: {
    marginTop: 18,
    marginBottom: 8,
  },
  progressBarBG: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailsGrid: {
    borderTopWidth: 1,
    marginTop: 18,
    paddingTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderStyle: 'dashed',
  },
  detailsCol: {
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 10,
    marginBottom: 4,
  },
  detailVal: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
  },
  linkedAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 10,
    marginTop: 18,
  },
  payEmiBtn: {
    marginHorizontal: 16,
    marginTop: 14,
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  payEmiBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  sectionContainer: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionHeaderClickable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  clickableHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clickableHeaderTitle: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  calculatorBody: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    padding: 16,
    marginTop: -8,
    paddingTop: 24,
    zIndex: -1,
  },
  calcLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  calcInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  calcInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
  },
  calcBtn: {
    width: 80,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calcBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Outfit_600SemiBold',
  },
  savingsCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  savingsCol: {
    flex: 1,
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
  },
  emptyCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
  },
  amortCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  amortRowHeader: {
    flexDirection: 'row',
    paddingBottom: 10,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  amortColHeader: {
    flex: 1,
    fontSize: 10,
    fontFamily: 'Outfit_500Medium',
    color: '#8E8E93',
  },
  amortColHeaderRight: {
    flex: 1.2,
    fontSize: 10,
    fontFamily: 'Outfit_500Medium',
    color: '#8E8E93',
    textAlign: 'right',
  },
  amortRow: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  amortColText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
  },
  amortColTextRight: {
    flex: 1.2,
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    textAlign: 'right',
  },
  timelineContainer: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    paddingBottom: 16,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
    width: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 6,
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineTitle: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  timelineDate: {
    fontSize: 11,
  },
  timelineSub: {
    fontSize: 11,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  nestedModalContent: {
    height: '50%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
  },
  modalInputGroup: {
    marginTop: 20,
  },
  modalLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_500Medium',
    letterSpacing: 1,
    marginBottom: 8,
  },
  modalAmountInput: {
    fontSize: 30,
    fontFamily: 'Outfit_600SemiBold',
    borderBottomWidth: 1,
    paddingVertical: 8,
    textAlign: 'center',
  },
  modalSelectBox: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  splitInfoCard: {
    borderRadius: 14,
    padding: 14,
    marginTop: 20,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  modalSubmitBtn: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
});
