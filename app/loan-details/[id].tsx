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
  ChevronDown,
  Info,
  X,
  Check,
  Zap,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { EMIPayment } from '@/types/money';
import { formatIndianAmount, parseIndianAmount } from '@/utils/formatters';

const TYPE_CONFIG = {
  home: { label: 'Home Loan', color: '#007AFF', emoji: '🏠' },
  car: { label: 'Car Loan', color: '#34C759', emoji: '🚗' },
  personal: { label: 'Personal Loan', color: '#FF9500', emoji: '💰' },
  education: { label: 'Education Loan', color: '#AF52DE', emoji: '🎓' },
  other: { label: 'Other Loan', color: '#8E8E93', emoji: '🏦' },
};

type ScheduleTab = 'upcoming' | 'paid' | 'all';

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

  const [scheduleTab, setScheduleTab] = useState<ScheduleTab>('upcoming');

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

  const totalInterestPaid = useMemo(() => {
    return loanPayments.reduce((sum, p) => sum + (p.interestPortion || 0), 0);
  }, [loanPayments]);

  const effectiveOutstanding = useMemo(() => {
    if (!loan) return 0;
    if (loanPayments.length > 0) {
      return Math.max(0, Math.min(loan.outstandingAmount, loan.principalAmount - totalPrincipalPaid));
    }
    return loan.outstandingAmount;
  }, [loan, loanPayments, totalPrincipalPaid]);

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

  // Next Due Date & Days Left calculation
  const nextDueDateInfo = useMemo(() => {
    if (!loan || effectiveOutstanding <= 0) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(loan.startDate);
    const day = start.getDate();

    const hasPaidThisMonth = loanPayments.some(
      (p) =>
        new Date(p.date).getMonth() === today.getMonth() &&
        new Date(p.date).getFullYear() === today.getFullYear()
    );

    let nextDue = new Date(today.getFullYear(), today.getMonth(), day);
    if (nextDue.getMonth() !== today.getMonth()) {
      nextDue = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }

    if (hasPaidThisMonth) {
      nextDue = new Date(today.getFullYear(), today.getMonth() + 1, day);
      if (nextDue.getMonth() !== (today.getMonth() + 1) % 12) {
        nextDue = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      }
    }

    if (nextDue < start) {
      nextDue = new Date(start);
    }

    const diffDays = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return {
      date: nextDue,
      dateFormatted: nextDue.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      daysLeft: diffDays,
      isDueSoon: diffDays >= 0 && diffDays <= 5,
    };
  }, [loan, loanPayments, effectiveOutstanding]);

  // Amortization Schedule Calculation
  const amortizationSchedule = useMemo(() => {
    if (!loan) return [];

    const schedule = [];
    
    // 1. Process past paid payments (oldest first)
    const pastPaymentsAsc = [...loanPayments].reverse();
    
    // Compute running balance
    const balances: number[] = [];
    let b = effectiveOutstanding;
    for (let i = pastPaymentsAsc.length - 1; i >= 0; i--) {
      const p = pastPaymentsAsc[i];
      const startBal = b + (p.principalPortion || p.amount);
      balances[i] = startBal;
      b = startBal;
    }

    let regularEmiCount = 0;
    const pastScheduleRows = [];
    for (let i = 0; i < pastPaymentsAsc.length; i++) {
      const p = pastPaymentsAsc[i];
      const startBalance = balances[i];
      const endBalance = startBalance - (p.principalPortion || p.amount);

      const labelDate = new Date(p.date);
      const monthLabel = labelDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

      // Identify prepayment: 0 interest portion or explicit prepayment
      const isPrepayment = (loan.interestRate > 0 && p.interestPortion === 0) ||
                           (p.interestPortion === 0 && Math.abs(p.amount - loan.emiAmount) > 1);

      let emiNumber: number | null = null;
      if (!isPrepayment) {
        regularEmiCount++;
        emiNumber = regularEmiCount;
      }

      pastScheduleRows.unshift({
        id: p.id,
        emiNumber,
        isPrepayment,
        isPaid: true,
        isUpcoming: false,
        monthLabel,
        startBalance,
        emi: p.amount,
        principalPortion: p.principalPortion || p.amount,
        interestPortion: p.interestPortion || 0,
        endBalance,
        paymentRef: p,
      });
    }
    
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

    let i = 0;
    while (balance > 0.01 && i < 480) {
      const interestPortion = balance * rate;
      const principalPortion = Math.min(balance, emi - interestPortion);
      const startBalance = balance;
      balance = Math.max(0, balance - principalPortion);

      const labelDate = new Date(nextUnpaidDate.getFullYear(), nextUnpaidDate.getMonth() + i, 1);
      const monthLabel = labelDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

      schedule.push({
        id: `projected-${i}`,
        emiNumber: regularEmiCount + i + 1,
        isPrepayment: false,
        isPaid: false,
        isUpcoming: i === 0,
        monthLabel,
        startBalance,
        emi: interestPortion + principalPortion,
        principalPortion,
        interestPortion,
        endBalance: balance,
      });
      i++;
    }

    return schedule;
  }, [loan, loanPayments, effectiveOutstanding]);

  // Upcoming count
  const upcomingCount = useMemo(() => {
    return amortizationSchedule.filter((r) => !r.isPaid).length;
  }, [amortizationSchedule]);

  // Filtered schedule based on active tab
  const filteredSchedule = useMemo(() => {
    if (scheduleTab === 'upcoming') {
      return amortizationSchedule.filter((r) => !r.isPaid);
    }
    if (scheduleTab === 'paid') {
      return amortizationSchedule.filter((r) => r.isPaid);
    }
    return amortizationSchedule;
  }, [amortizationSchedule, scheduleTab]);

  const config = loan ? (TYPE_CONFIG[loan.type] || TYPE_CONFIG.other) : TYPE_CONFIG.other;

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
            let txId = payment.transactionId;
            if (!txId) {
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

    if (effectiveOutstanding <= 0) {
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
    const interestPortion = Math.min(effectiveOutstanding * rate, A);
    const principalPortion = Math.min(effectiveOutstanding, A - interestPortion);
    const finalAmount = interestPortion + principalPortion;

    const txId = Math.random().toString(36).substring(2, 9);
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

    addMoneyTransaction({
      id: txId,
      type: 'expense',
      amount: finalAmount,
      category: selectedCategory,
      accountId: selectedAccountId,
      date: new Date().toISOString(),
      note: `EMI payment for ${loan.name}` + (finalAmount > loan.emiAmount ? ' (includes extra prepayment)' : ''),
      isRecurring: false,
    });

    setShowLogPaymentModal(false);
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
  const paidPercentage = loan.principalAmount > 0 ? (totalPrincipalPaid / loan.principalAmount) * 100 : 0;
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
        {/* ─── 1. Unified Hero Card (Outstanding, Progress Bar & Metrics in 1 Card) ─── */}
        <View style={[styles.outstandingCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
          {/* Header & Lender */}
          <View style={styles.heroHeaderRow}>
            <ThemedText style={[styles.heroLabel, { color: currColors.textSecondary }]}>
              OUTSTANDING BALANCE
            </ThemedText>
            <View style={[styles.indicatorPill, { backgroundColor: `${config.color}15` }]}>
              <ThemedText style={[styles.indicatorText, { color: config.color }]}>
                {loan.lenderName.toUpperCase()}
              </ThemedText>
            </View>
          </View>

          {/* Outstanding Balance */}
          <ThemedText style={[styles.heroValue, { color: currColors.text }]}>
            {formatAmount(effectiveOutstanding)}
          </ThemedText>

          {/* Progress Bar */}
          <View style={[styles.progressBarBG, { backgroundColor: currColors.cardSecondary }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(100, Math.max(2, paidPercentage))}%`,
                  backgroundColor: config.color,
                },
              ]}
            />
          </View>

          {/* Progress Micro Labels */}
          <View style={styles.progressMetaRow}>
            <ThemedText style={[styles.progressMetaText, { color: currColors.textSecondary }]}>
              {paidPercentage.toFixed(0)}% paid ({formatAmount(totalPrincipalPaid)})
            </ThemedText>
            <ThemedText style={[styles.progressMetaText, { color: currColors.textSecondary }]}>
              {monthsRemaining} of {loan.tenureMonths} mos left
            </ThemedText>
          </View>

          {/* Dashed Divider */}
          <View style={[styles.dashedDivider, { borderColor: currColors.border }]} />

          {/* Metrics Rows */}
          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>
              Monthly EMI
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: config.color }]}>
              {formatAmount(loan.emiAmount)}/mo
            </ThemedText>
          </View>

          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>
              Interest rate
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: currColors.text }]}>
              {loan.interestRate}% p.a.
            </ThemedText>
          </View>

          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>
              Original loan
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: currColors.text }]}>
              {formatAmount(loan.principalAmount)}
            </ThemedText>
          </View>

          <View style={[styles.heroRow, { marginBottom: 0 }]}>
            <ThemedText style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>
              Next due
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: nextDueDateInfo?.isDueSoon ? '#FF9500' : currColors.text }]}>
              {nextDueDateInfo ? `${nextDueDateInfo.dateFormatted} (${nextDueDateInfo.daysLeft > 0 ? `in ${nextDueDateInfo.daysLeft}d` : 'Today'})` : 'Paid off'}
            </ThemedText>
          </View>
        </View>

        {/* ─── 2. Quick Action Pills Bar ─── */}
        {effectiveOutstanding > 0 && (
          <View style={styles.actionPillRow}>
            <TouchableOpacity
              style={[styles.primaryActionPill, { backgroundColor: config.color }]}
              activeOpacity={0.8}
              onPress={handleLogPayment}
            >
              <Calendar size={16} color="#FFFFFF" />
              <ThemedText style={styles.primaryActionText}>
                Log EMI ({formatAmount(loan.emiAmount)})
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryActionPill, { backgroundColor: currColors.card, borderColor: '#00C9A740' }]}
              activeOpacity={0.8}
              onPress={() => {
                handleHaptic();
                router.push(`/prepay-loan/${loan.id}`);
              }}
            >
              <Zap size={16} color="#00C9A7" />
              <ThemedText style={[styles.secondaryActionText, { color: '#00C9A7' }]}>
                Prepay
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── 3. Tabbed Amortization Schedule & History ─── */}
        <View style={styles.scheduleHeaderRow}>
          <ThemedText style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
            PAYMENT SCHEDULE ({filteredSchedule.length})
          </ThemedText>
          {/* Segmented Filter Pills */}
          <View style={[styles.scheduleToggleBar, { backgroundColor: currColors.cardSecondary }]}>
            <TouchableOpacity
              style={[styles.scheduleTogglePill, scheduleTab === 'upcoming' && { backgroundColor: currColors.card }]}
              onPress={() => {
                handleHaptic();
                setScheduleTab('upcoming');
              }}
            >
              <ThemedText style={{ fontSize: 11, color: scheduleTab === 'upcoming' ? '#00C9A7' : currColors.textSecondary, fontFamily: 'Outfit_500Medium' }}>
                Upcoming ({upcomingCount})
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scheduleTogglePill, scheduleTab === 'paid' && { backgroundColor: currColors.card }]}
              onPress={() => {
                handleHaptic();
                setScheduleTab('paid');
              }}
            >
              <ThemedText style={{ fontSize: 11, color: scheduleTab === 'paid' ? '#00C9A7' : currColors.textSecondary, fontFamily: 'Outfit_500Medium' }}>
                Paid ({loanPayments.length})
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scheduleTogglePill, scheduleTab === 'all' && { backgroundColor: currColors.card }]}
              onPress={() => {
                handleHaptic();
                setScheduleTab('all');
              }}
            >
              <ThemedText style={{ fontSize: 11, color: scheduleTab === 'all' ? '#00C9A7' : currColors.textSecondary, fontFamily: 'Outfit_500Medium' }}>
                All
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {filteredSchedule.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <Info size={32} color={currColors.textSecondary} style={{ marginBottom: 6 }} />
            <ThemedText style={{ color: currColors.textSecondary, textAlign: 'center', fontFamily: 'Outfit_400Regular', fontSize: 13 }}>
              {scheduleTab === 'paid' ? 'No EMI payments logged yet.' : 'No schedule rows available.'}
            </ThemedText>
          </View>
        ) : (
          <View style={[styles.paymentListCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            {filteredSchedule.map((row, index) => {
              const isLast = index === filteredSchedule.length - 1;
              return (
                <View
                  key={row.id || row.monthLabel}
                  style={[
                    styles.paymentRow,
                    !isLast && { borderBottomWidth: 1, borderBottomColor: currColors.border },
                    row.isUpcoming && { backgroundColor: 'rgba(0, 201, 167, 0.04)' },
                  ]}
                >
                  <View style={styles.paymentLeft}>
                    <View
                      style={[
                        styles.statusIconWrapper,
                        {
                          backgroundColor: row.isPrepayment
                            ? 'rgba(255, 149, 0, 0.12)'
                            : row.isPaid
                            ? 'rgba(52, 199, 89, 0.12)'
                            : row.isUpcoming
                            ? 'rgba(0, 201, 167, 0.12)'
                            : currColors.cardSecondary,
                        },
                      ]}
                    >
                      {row.isPrepayment ? (
                        <Zap size={14} color="#FF9500" />
                      ) : (
                        <ThemedText
                          style={{
                            fontSize: 12,
                            fontFamily: 'Outfit_600SemiBold',
                            color: row.isPaid
                              ? '#34C759'
                              : row.isUpcoming
                              ? '#00C9A7'
                              : currColors.textSecondary,
                          }}
                        >
                          {row.emiNumber}
                        </ThemedText>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <ThemedText style={[styles.paymentMonth, { color: currColors.text }]}>
                          {row.monthLabel}
                        </ThemedText>
                        {row.isPrepayment ? (
                          <View style={[styles.upcomingBadge, { backgroundColor: 'rgba(255, 149, 0, 0.15)' }]}>
                            <ThemedText style={[styles.upcomingBadgeText, { color: '#FF9500' }]}>PREPAY</ThemedText>
                          </View>
                        ) : row.isUpcoming ? (
                          <View style={[styles.upcomingBadge, { backgroundColor: 'rgba(0, 201, 167, 0.15)' }]}>
                            <ThemedText style={styles.upcomingBadgeText}>NEXT</ThemedText>
                          </View>
                        ) : null}
                      </View>
                      <ThemedText style={[styles.paymentBreakdown, { color: currColors.textSecondary }]}>
                        {row.isPrepayment
                          ? `Principal Prepayment: ${formatAmount(row.principalPortion)}`
                          : `Principal: ${formatAmount(row.principalPortion)} • Interest: ${formatAmount(row.interestPortion)}`}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.paymentRight}>
                    <ThemedText
                      style={[
                        styles.paymentAmount,
                        { color: row.isPaid ? '#34C759' : currColors.text },
                      ]}
                    >
                      {formatAmount(row.emi)}
                    </ThemedText>
                    <ThemedText style={[styles.paymentBalance, { color: currColors.textSecondary }]}>
                      Bal: {formatAmount(row.endBalance)}
                    </ThemedText>
                  </View>

                  {row.isPaid && row.paymentRef && (
                    <TouchableOpacity
                      onPress={() => handleDeletePayment(row.paymentRef!)}
                      style={styles.deletePaymentBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Trash2 size={14} color="#FF3B30" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ─── Log EMI Payment Modal ─── */}
      <Modal visible={showLogPaymentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%', justifyContent: 'flex-end' }}
          >
            <View style={[styles.modalContent, { backgroundColor: currColors.card }]}>
              {showAccountSelector ? (
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
                        <ThemedText style={{ color: currColors.text, fontSize: 15, fontFamily: 'Outfit_400Regular' }}>{item.name}</ThemedText>
                        <ThemedText style={{ color: currColors.textSecondary, fontSize: 13, fontFamily: 'Outfit_400Regular' }}>
                          {formatAmount(item.balance)}
                        </ThemedText>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              ) : showCategorySelector ? (
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
                        <ThemedText style={{ color: currColors.text, fontSize: 15, fontFamily: 'Outfit_400Regular' }}>{item}</ThemedText>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              ) : (
                <>
                  <View style={[styles.modalHeader, { borderBottomColor: currColors.border }]}>
                    <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>
                      Log Loan Payment
                    </ThemedText>
                    <TouchableOpacity onPress={() => setShowLogPaymentModal(false)}>
                      <X size={22} color={currColors.text} />
                    </TouchableOpacity>
                  </View>

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

                  <View style={styles.modalInputGroup}>
                    <ThemedText style={[styles.modalLabel, { color: currColors.textSecondary }]}>PAY FROM ACCOUNT</ThemedText>
                    <TouchableOpacity
                      style={[styles.modalSelectBox, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border }]}
                      onPress={() => {
                        handleHaptic();
                        setShowAccountSelector(true);
                      }}
                    >
                      <ThemedText style={{ color: selectedAccountId ? currColors.text : currColors.textSecondary, fontSize: 15, fontFamily: 'Outfit_400Regular' }}>
                        {accounts.find(a => a.id === selectedAccountId)?.name || 'Select Account'}
                      </ThemedText>
                      <ChevronDown size={18} color={currColors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalInputGroup}>
                    <ThemedText style={[styles.modalLabel, { color: currColors.textSecondary }]}>EXPENSE CATEGORY</ThemedText>
                    <TouchableOpacity
                      style={[styles.modalSelectBox, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border }]}
                      onPress={() => {
                        handleHaptic();
                        setShowCategorySelector(true);
                      }}
                    >
                      <ThemedText style={{ color: selectedCategory ? currColors.text : currColors.textSecondary, fontSize: 15, fontFamily: 'Outfit_400Regular' }}>
                        {selectedCategory || 'Select Category'}
                      </ThemedText>
                      <ChevronDown size={18} color={currColors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {/* Dynamic split details info card */}
                  {(() => {
                    const parsedAmt = parseIndianAmount(paymentAmount) || 0;
                    const r_rate = (loan.interestRate / 12) / 100;
                    const standardInterest = effectiveOutstanding * r_rate;
                    
                    const dispInterest = Math.min(standardInterest, parsedAmt);
                    const dispPrincipal = Math.min(effectiveOutstanding, parsedAmt - dispInterest);
                    const extraPrepayment = Math.max(0, parsedAmt - loan.emiAmount);

                    return (
                      <View style={[styles.splitInfoCard, { backgroundColor: currColors.cardSecondary }]}>
                        <View style={styles.splitRow}>
                          <ThemedText style={{ fontSize: 12, color: currColors.textSecondary, fontFamily: 'Outfit_400Regular' }}>Interest Portion:</ThemedText>
                          <ThemedText style={{ fontSize: 13, fontFamily: 'Outfit_500Medium', color: '#FF3B30' }}>
                            {formatAmount(dispInterest)}
                          </ThemedText>
                        </View>
                        <View style={styles.splitRow}>
                          <ThemedText style={{ fontSize: 12, color: currColors.textSecondary, fontFamily: 'Outfit_400Regular' }}>Principal Portion:</ThemedText>
                          <ThemedText style={{ fontSize: 13, fontFamily: 'Outfit_500Medium', color: '#34C759' }}>
                            {formatAmount(dispPrincipal)}
                          </ThemedText>
                        </View>
                        {extraPrepayment > 0 ? (
                          <View style={[styles.splitRow, { borderTopWidth: 1, borderTopColor: currColors.border, paddingTop: 8, marginTop: 4, borderStyle: 'dashed' }]}>
                            <ThemedText style={{ fontSize: 12, color: '#00C9A7', fontFamily: 'Outfit_500Medium' }}>Extra Principal Adjustment:</ThemedText>
                            <ThemedText style={{ fontSize: 13, fontFamily: 'Outfit_500Medium', color: '#00C9A7' }}>
                              +{formatAmount(extraPrepayment)}
                            </ThemedText>
                          </View>
                        ) : null}
                      </View>
                    );
                  })()}

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
    marginHorizontal: 12,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  outstandingCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginTop: 4,
    marginBottom: 14,
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
  indicatorPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  indicatorText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroValue: {
    fontSize: 24,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
    marginBottom: 12,
  },
  progressBarBG: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressMetaText: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
  },
  dashedDivider: {
    height: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 1,
    marginVertical: 14,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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

  // Action Pills Row
  actionPillRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  primaryActionPill: {
    flex: 1.5,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  secondaryActionPill: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryActionText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },

  // Schedule & Tabs
  scheduleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  scheduleToggleBar: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
  },
  scheduleTogglePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  paymentListCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  paymentLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentMonth: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
  },
  upcomingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  upcomingBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#00C9A7',
  },
  paymentBreakdown: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  paymentRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  paymentAmount: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
  },
  paymentBalance: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  deletePaymentBtn: {
    padding: 6,
    marginLeft: 6,
  },
  emptyCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    borderStyle: 'dashed',
    marginBottom: 20,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
  modalInputGroup: {
    marginBottom: 14,
  },
  modalLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  modalAmountInput: {
    fontSize: 22,
    fontFamily: 'Outfit_400Regular',
    borderBottomWidth: 1,
    paddingVertical: 6,
  },
  modalSelectBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  splitInfoCard: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalSubmitBtn: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
});
