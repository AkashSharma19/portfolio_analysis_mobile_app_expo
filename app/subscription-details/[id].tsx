import React, { useMemo, useState } from 'react';
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
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
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
  RotateCcw,
  Ban,
  Wallet,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Subscription, SubscriptionPayment } from '@/types/money';
import { advanceDateByCycle } from '@/lib/finance';
import { formatIndianAmount, parseIndianAmount } from '@/utils/formatters';

type ScheduleTab = 'upcoming' | 'paid' | 'all';

export default function SubscriptionDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const {
    subscriptions,
    accounts,
    subscriptionPayments,
    removeSubscription,
    addSubscriptionPayment,
    addMoneyTransaction,
    updateSubscription,
    removeMoneyTransaction,
    moneyTransactions,
    removeSubscriptionPayment,
  } = useMoneyStore();

  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

  const subscription = useMemo(() => {
    return subscriptions.find((s) => s.id === id);
  }, [id, subscriptions]);

  const payments = useMemo(() => {
    return subscriptionPayments
      .filter((p) => p.subscriptionId === id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [id, subscriptionPayments]);

  const [scheduleTab, setScheduleTab] = useState<ScheduleTab>('upcoming');
  const [showLogPaymentModal, setShowLogPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [showAccountSelector, setShowAccountSelector] = useState(false);

  // Next renewal info
  const nextDueDateInfo = useMemo(() => {
    if (!subscription || !subscription.isActive) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextDue = new Date(subscription.nextPaymentDate);
    nextDue.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return {
      date: nextDue,
      dateFormatted: nextDue.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      fullFormatted: nextDue.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      daysLeft: diffDays,
      isDueSoon: diffDays >= 0 && diffDays <= 3,
    };
  }, [subscription]);

interface ScheduleRow {
  id: string;
  cycleNumber: number;
  isPaid: boolean;
  isUpcoming: boolean;
  dateFormatted: string;
  amount: number;
  paymentRef?: SubscriptionPayment;
}

  // Renewal & payment schedule calculation (Paid + Projected upcoming)
  const schedule = useMemo((): ScheduleRow[] => {
    if (!subscription) return [];

    const pastAsc = [...payments].reverse(); // oldest first
    const pastRows: ScheduleRow[] = pastAsc.map((p, idx) => ({
      id: p.id,
      cycleNumber: idx + 1,
      isPaid: true,
      isUpcoming: false,
      dateFormatted: new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      amount: p.amount,
      paymentRef: p,
    }));

    // Generate upcoming projections if active
    const projectedRows: ScheduleRow[] = [];
    if (subscription.isActive) {
      let currDate = subscription.nextPaymentDate;
      const count =
        subscription.billingCycle === 'weekly'
          ? 8
          : subscription.billingCycle === 'monthly'
          ? 12
          : subscription.billingCycle === 'quarterly'
          ? 4
          : 3;

      for (let i = 0; i < count; i++) {
        projectedRows.push({
          id: `projected-${i}`,
          cycleNumber: pastAsc.length + i + 1,
          isPaid: false,
          isUpcoming: i === 0,
          dateFormatted: new Date(currDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          amount: subscription.amount,
        });
        currDate = advanceDateByCycle(currDate, subscription.billingCycle);
      }
    }

    return [...pastRows.reverse(), ...projectedRows];
  }, [subscription, payments]);

  // Upcoming count
  const upcomingCount = useMemo(() => {
    return schedule.filter((r) => !r.isPaid).length;
  }, [schedule]);

  // Filtered schedule based on active tab
  const filteredSchedule = useMemo(() => {
    if (scheduleTab === 'upcoming') return schedule.filter((r) => !r.isPaid);
    if (scheduleTab === 'paid') return schedule.filter((r) => r.isPaid);
    return schedule;
  }, [schedule, scheduleTab]);

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

  const handleDeleteSubscription = () => {
    handleHaptic();
    if (!subscription) return;
    Alert.alert(
      'Delete Subscription',
      `Are you sure you want to delete "${subscription.name}" and all its payment history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            removeSubscription(subscription.id);
            router.back();
          },
        },
      ]
    );
  };

  const handleDeletePayment = (payment: SubscriptionPayment) => {
    handleHaptic();
    Alert.alert(
      'Delete Payment Log',
      'Are you sure you want to delete this payment log? This will revert its impact on your account balance and subscription billing cycle.',
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
              removeSubscriptionPayment(payment.id);
            }
          },
        },
      ]
    );
  };

  const handleLogPayment = () => {
    handleHaptic();
    if (!subscription) return;

    if (!subscription.isActive) {
      Alert.alert('Subscription Cancelled', 'This subscription has already been cancelled.');
      return;
    }

    setPaymentAmount(formatIndianAmount(subscription.amount.toString()));
    setSelectedAccountId(subscription.linkedAccountId || accounts[0]?.id || '');
    setShowLogPaymentModal(true);
    setShowAccountSelector(false);
  };

  const handleConfirmLogPayment = () => {
    handleHaptic();
    if (!subscription) return;

    const A = parseIndianAmount(paymentAmount);
    if (isNaN(A) || A <= 0) {
      Alert.alert('Required Field', 'Please enter a valid payment amount.');
      return;
    }

    if (!selectedAccountId) {
      Alert.alert('Required Field', 'Please select a source account.');
      return;
    }

    const txId = Math.random().toString(36).substring(2, 9);
    const payment: SubscriptionPayment = {
      id: Math.random().toString(36).substring(2, 9),
      subscriptionId: subscription.id,
      amount: A,
      date: new Date().toISOString(),
      status: 'paid',
      transactionId: txId,
    };
    addSubscriptionPayment(payment);

    addMoneyTransaction({
      id: txId,
      type: 'expense',
      amount: A,
      category: subscription.category,
      accountId: selectedAccountId,
      date: new Date().toISOString(),
      note: `Subscription payment for ${subscription.name}`,
      isRecurring: false,
    });

    setShowLogPaymentModal(false);
  };

  const handleCancelSubscription = () => {
    handleHaptic();
    if (!subscription) return;
    Alert.alert(
      'Cancel Subscription',
      `Mark "${subscription.name}" as cancelled? Future payments will stop.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            updateSubscription(subscription.id, { isActive: false });
          },
        },
      ]
    );
  };

  const handleReactivateSubscription = () => {
    handleHaptic();
    if (!subscription) return;
    Alert.alert(
      'Reactivate Subscription',
      `Mark "${subscription.name}" as active again?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const today = new Date();
            const nextDate = new Date(today);
            if (subscription.billingCycle === 'weekly') nextDate.setDate(today.getDate() + 7);
            else if (subscription.billingCycle === 'monthly') nextDate.setMonth(today.getMonth() + 1);
            else if (subscription.billingCycle === 'quarterly') nextDate.setMonth(today.getMonth() + 3);
            else if (subscription.billingCycle === 'yearly') nextDate.setFullYear(today.getFullYear() + 1);
            updateSubscription(subscription.id, { isActive: true, nextPaymentDate: nextDate.toISOString() });
          },
        },
      ]
    );
  };

  if (!subscription) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currColors.background }]}>
        <View style={styles.centered}>
          <ThemedText style={{ color: currColors.textSecondary }}>Subscription not found.</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const linkedAccount = accounts.find((a) => a.id === subscription.linkedAccountId);
  const themeColor = subscription.color || '#00C9A7';
  const yearlyCost =
    subscription.amount *
    (subscription.billingCycle === 'weekly'
      ? 52
      : subscription.billingCycle === 'monthly'
      ? 12
      : subscription.billingCycle === 'quarterly'
      ? 4
      : 1);

  const cycleSuffix =
    subscription.billingCycle === 'weekly'
      ? '/wk'
      : subscription.billingCycle === 'monthly'
      ? '/mo'
      : subscription.billingCycle === 'quarterly'
      ? '/qtr'
      : '/yr';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currColors.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: currColors.cardSecondary }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color={currColors.text} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: currColors.text }]} numberOfLines={1}>
          {subscription.name}
        </ThemedText>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: currColors.cardSecondary }]}
            onPress={() => {
              handleHaptic();
              router.push({ pathname: '/add-subscription', params: { id: subscription.id } });
            }}
          >
            <Edit2 size={18} color={themeColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}
            onPress={handleDeleteSubscription}
          >
            <Trash2 size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        {/* ─── 1. Unified Hero Card ─── */}
        <View style={[styles.heroCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
          <View style={styles.heroHeaderRow}>
            <ThemedText style={[styles.heroLabel, { color: currColors.textSecondary }]}>
              SUBSCRIPTION COST
            </ThemedText>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <View style={[styles.indicatorPill, { backgroundColor: `${themeColor}15` }]}>
                <ThemedText style={[styles.indicatorText, { color: themeColor }]}>
                  {subscription.category.toUpperCase()}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.indicatorPill,
                  {
                    backgroundColor: subscription.isActive
                      ? 'rgba(52, 199, 89, 0.12)'
                      : 'rgba(255, 59, 48, 0.12)',
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.indicatorText,
                    { color: subscription.isActive ? '#34C759' : '#FF3B30' },
                  ]}
                >
                  {subscription.isActive ? 'ACTIVE' : 'CANCELLED'}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <ThemedText style={[styles.heroValue, { color: currColors.text }]}>
              {formatAmount(subscription.amount)}
            </ThemedText>
            <ThemedText style={[styles.heroValueSuffix, { color: currColors.textSecondary }]}>
              {cycleSuffix}
            </ThemedText>
          </View>

          <View style={[styles.dashedDivider, { borderColor: currColors.border }]} />

          {/* Clean Stat Rows */}
          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>
              Billing cycle
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: themeColor }]}>
              {subscription.billingCycle.charAt(0).toUpperCase() + subscription.billingCycle.slice(1)}
            </ThemedText>
          </View>

          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>
              Next renewal
            </ThemedText>
            <ThemedText
              style={[
                styles.heroRowValue,
                { color: nextDueDateInfo?.isDueSoon ? '#FF9500' : currColors.text },
              ]}
            >
              {nextDueDateInfo
                ? `${nextDueDateInfo.dateFormatted} (${nextDueDateInfo.daysLeft > 0 ? `in ${nextDueDateInfo.daysLeft}d` : 'Today'})`
                : 'Cancelled'}
            </ThemedText>
          </View>

          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>
              Yearly cost
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: currColors.text }]}>
              {formatAmount(yearlyCost)}/yr
            </ThemedText>
          </View>

          <View style={[styles.heroRow, { marginBottom: 0 }]}>
            <ThemedText style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>
              Paid from
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: currColors.text }]} numberOfLines={1}>
              {linkedAccount?.name || 'Not linked'}
            </ThemedText>
          </View>
        </View>

        {/* ─── 2. Quick Action Pills Bar ─── */}
        <View style={styles.actionPillRow}>
          {subscription.isActive ? (
            <>
              <TouchableOpacity
                style={[styles.primaryActionPill, { backgroundColor: themeColor }]}
                activeOpacity={0.8}
                onPress={handleLogPayment}
              >
                <Calendar size={16} color="#FFFFFF" />
                <ThemedText style={styles.primaryActionText}>
                  Log Payment ({formatAmount(subscription.amount)})
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.secondaryActionPill,
                  { backgroundColor: currColors.card, borderColor: 'rgba(255, 59, 48, 0.35)' },
                ]}
                activeOpacity={0.8}
                onPress={handleCancelSubscription}
              >
                <Ban size={16} color="#FF3B30" />
                <ThemedText style={[styles.secondaryActionText, { color: '#FF3B30' }]}>
                  Cancel
                </ThemedText>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.primaryActionPill, { backgroundColor: '#34C759', flex: 1 }]}
              activeOpacity={0.8}
              onPress={handleReactivateSubscription}
            >
              <RotateCcw size={16} color="#FFFFFF" />
              <ThemedText style={styles.primaryActionText}>
                Reactivate Subscription
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {/* ─── 3. Tabbed Renewal & Payment Schedule ─── */}
        <View style={styles.scheduleHeaderRow}>
          <ThemedText style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
            RENEWAL SCHEDULE ({filteredSchedule.length})
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
              <ThemedText
                style={{
                  fontSize: 11,
                  color: scheduleTab === 'upcoming' ? '#00C9A7' : currColors.textSecondary,
                  fontFamily: 'Outfit_500Medium',
                }}
              >
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
              <ThemedText
                style={{
                  fontSize: 11,
                  color: scheduleTab === 'paid' ? '#00C9A7' : currColors.textSecondary,
                  fontFamily: 'Outfit_500Medium',
                }}
              >
                Paid ({payments.length})
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scheduleTogglePill, scheduleTab === 'all' && { backgroundColor: currColors.card }]}
              onPress={() => {
                handleHaptic();
                setScheduleTab('all');
              }}
            >
              <ThemedText
                style={{
                  fontSize: 11,
                  color: scheduleTab === 'all' ? '#00C9A7' : currColors.textSecondary,
                  fontFamily: 'Outfit_500Medium',
                }}
              >
                All
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {filteredSchedule.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <Info size={32} color={currColors.textSecondary} style={{ marginBottom: 6 }} />
            <ThemedText
              style={{
                color: currColors.textSecondary,
                textAlign: 'center',
                fontFamily: 'Outfit_400Regular',
                fontSize: 13,
              }}
            >
              {scheduleTab === 'paid'
                ? 'No payments logged yet.'
                : 'No upcoming renewal cycles available.'}
            </ThemedText>
          </View>
        ) : (
          <View style={[styles.paymentListCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            {filteredSchedule.map((row, index) => {
              const isLast = index === filteredSchedule.length - 1;
              return (
                <View
                  key={row.id || index}
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
                          backgroundColor: row.isPaid
                            ? 'rgba(52, 199, 89, 0.12)'
                            : row.isUpcoming
                            ? 'rgba(0, 201, 167, 0.12)'
                            : currColors.cardSecondary,
                        },
                      ]}
                    >
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
                        {row.cycleNumber}
                      </ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <ThemedText style={[styles.paymentDate, { color: currColors.text }]}>
                          {row.dateFormatted}
                        </ThemedText>
                        {row.isUpcoming && (
                          <View style={[styles.upcomingBadge, { backgroundColor: 'rgba(0, 201, 167, 0.15)' }]}>
                            <ThemedText style={styles.upcomingBadgeText}>NEXT</ThemedText>
                          </View>
                        )}
                      </View>
                      <ThemedText style={[styles.paymentSubtitle, { color: currColors.textSecondary }]}>
                        {row.isPaid ? 'Payment Confirmed' : `Cycle: ${subscription.billingCycle}`}
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
                      {formatAmount(row.amount)}
                    </ThemedText>
                    <ThemedText style={[styles.paymentStatusText, { color: currColors.textSecondary }]}>
                      {row.isPaid ? 'Paid' : 'Upcoming'}
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

      {/* ─── Log Payment Modal ─── */}
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
                    <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>Select Account</ThemedText>
                    <TouchableOpacity onPress={() => setShowAccountSelector(false)}>
                      <X size={22} color={currColors.text} />
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={accounts.filter((a) => !a.isArchived)}
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
                        <ThemedText style={{ color: currColors.text, fontSize: 15, fontFamily: 'Outfit_400Regular' }}>
                          {item.name}
                        </ThemedText>
                        <ThemedText style={{ color: currColors.textSecondary, fontSize: 13, fontFamily: 'Outfit_400Regular' }}>
                          {formatAmount(item.balance)}
                        </ThemedText>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              ) : (
                <>
                  <View style={[styles.modalHeader, { borderBottomColor: currColors.border }]}>
                    <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>
                      Log Subscription Payment
                    </ThemedText>
                    <TouchableOpacity onPress={() => setShowLogPaymentModal(false)}>
                      <X size={22} color={currColors.text} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalInputGroup}>
                    <ThemedText style={[styles.modalLabel, { color: currColors.textSecondary }]}>
                      PAYMENT AMOUNT
                    </ThemedText>
                    <TextInput
                      style={[
                        styles.modalAmountInput,
                        { color: currColors.text, borderBottomColor: currColors.border },
                      ]}
                      placeholder="0"
                      placeholderTextColor={currColors.textSecondary}
                      keyboardType="numeric"
                      value={paymentAmount}
                      onChangeText={(val) => setPaymentAmount(formatIndianAmount(val))}
                    />
                  </View>

                  <View style={styles.modalInputGroup}>
                    <ThemedText style={[styles.modalLabel, { color: currColors.textSecondary }]}>
                      PAY FROM ACCOUNT
                    </ThemedText>
                    <TouchableOpacity
                      style={[
                        styles.modalSelectBox,
                        { backgroundColor: currColors.cardSecondary, borderColor: currColors.border },
                      ]}
                      onPress={() => {
                        handleHaptic();
                        setShowAccountSelector(true);
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Wallet size={16} color="#00C9A7" />
                        <ThemedText style={{ color: selectedAccountId ? currColors.text : currColors.textSecondary, fontSize: 14, fontFamily: 'Outfit_400Regular' }}>
                          {accounts.find((a) => a.id === selectedAccountId)?.name || 'Select Account'}
                        </ThemedText>
                      </View>
                      <ChevronDown size={16} color={currColors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.modalSubmitBtn, { backgroundColor: themeColor }]}
                    activeOpacity={0.8}
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
  heroCard: {
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
  },
  heroValueSuffix: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    marginLeft: 4,
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
  paymentDate: {
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
  paymentSubtitle: {
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
  paymentStatusText: {
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
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
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
});
