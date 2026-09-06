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
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Calendar,
  DollarSign,
  Repeat,
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
import { Subscription, SubscriptionPayment } from '@/types/money';
import { advanceDateByCycle } from '@/lib/finance';

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

  const [showLogPaymentModal, setShowLogPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [showAccountSelector, setShowAccountSelector] = useState(false);

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

    setPaymentAmount(subscription.amount.toString());
    setSelectedAccountId(subscription.linkedAccountId || accounts[0]?.id || '');
    setShowLogPaymentModal(true);
  };

  const handleConfirmLogPayment = () => {
    handleHaptic();
    if (!subscription) return;

    const A = parseFloat(paymentAmount);
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
  const nextDate = new Date(subscription.nextPaymentDate);
  const yearlyCost = subscription.amount * (subscription.billingCycle === 'weekly' ? 52 : subscription.billingCycle === 'monthly' ? 12 : subscription.billingCycle === 'quarterly' ? 4 : 1);

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
            <Edit2 size={18} color={subscription.color || '#00C9A7'} />
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
        {/* Subscription Info Card */}
        <View style={[styles.infoCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
          <View style={[styles.indicatorPill, { backgroundColor: `${subscription.color || '#00C9A7'}15` }]}>
            <ThemedText style={[styles.indicatorText, { color: subscription.color || '#00C9A7' }]}>
              {subscription.category.toUpperCase()}
            </ThemedText>
          </View>
          <ThemedText style={[styles.balanceLabel, { color: currColors.textSecondary }]}>NEXT PAYMENT</ThemedText>
          <ThemedText style={[styles.balanceText, { color: currColors.text }]}>
            {nextDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </ThemedText>

          <View style={[styles.detailsGrid, { borderTopColor: currColors.border }]}>
            <View style={styles.detailsCol}>
              <ThemedText style={[styles.detailLabel, { color: currColors.textSecondary }]}>Billing Cycle</ThemedText>
              <ThemedText style={[styles.detailVal, { color: currColors.text }]}>
                {subscription.billingCycle.charAt(0).toUpperCase() + subscription.billingCycle.slice(1)}
              </ThemedText>
            </View>
            <View style={styles.detailsCol}>
              <ThemedText style={[styles.detailLabel, { color: currColors.textSecondary }]}>Amount</ThemedText>
              <ThemedText style={[styles.detailVal, { color: subscription.color || '#00C9A7' }]}>
                {formatAmount(subscription.amount)}
              </ThemedText>
            </View>
            <View style={styles.detailsCol}>
              <ThemedText style={[styles.detailLabel, { color: currColors.textSecondary }]}>Yearly Cost</ThemedText>
              <ThemedText style={[styles.detailVal, { color: currColors.text }]}>
                {formatAmount(yearlyCost)}
              </ThemedText>
            </View>
          </View>

          {linkedAccount ? (
            <View style={[styles.linkedAccountRow, { backgroundColor: currColors.cardSecondary }]}>
              <Info size={14} color={currColors.textSecondary} />
              <ThemedText style={{ fontSize: 11, color: currColors.textSecondary, marginLeft: 8 }}>
                Paid from: <ThemedText style={{ fontFamily: 'Outfit_600SemiBold', color: currColors.text }}>{linkedAccount.name}</ThemedText>
              </ThemedText>
            </View>
          ) : null}
        </View>

        {/* Log Payment CTA Button */}
        {subscription.isActive ? (
          <TouchableOpacity
            style={[styles.payEmiBtn, { backgroundColor: subscription.color || '#00C9A7' }]}
            activeOpacity={0.8}
            onPress={handleLogPayment}
          >
            <Calendar size={20} color="#FFFFFF" />
            <ThemedText style={styles.payEmiBtnText}>
              Log Payment ({formatAmount(subscription.amount)})
            </ThemedText>
          </TouchableOpacity>
        ) : null}

        {/* Cancel / Reactivate */}
        {subscription.isActive ? (
          <TouchableOpacity
            style={[styles.cancelBtn, { backgroundColor: currColors.card, borderColor: currColors.border }]}
            onPress={handleCancelSubscription}
          >
            <ThemedText style={{ color: '#FF3B30', fontFamily: 'Outfit_600SemiBold' }}>Cancel Subscription</ThemedText>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.cancelBtn, { backgroundColor: '#34C75915', borderColor: '#34C759' }]}
            onPress={handleReactivateSubscription}
          >
            <ThemedText style={{ color: '#34C759', fontFamily: 'Outfit_600SemiBold' }}>Reactivate Subscription</ThemedText>
          </TouchableOpacity>
        )}

        {/* Payment History */}
        <View style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
            PAYMENT HISTORY ({payments.length})
          </ThemedText>
        </View>

        {payments.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <ThemedText style={{ color: currColors.textSecondary, textAlign: 'center' }}>
              No payments logged yet. Log your first payment using the button above.
            </ThemedText>
          </View>
        ) : (
          <View style={[styles.timelineContainer, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            {payments.map((p, idx) => (
              <View key={p.id} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineDot, { backgroundColor: subscription.color || '#00C9A7' }]} />
                  {idx !== payments.length - 1 && (
                    <View style={[styles.timelineLine, { backgroundColor: currColors.border }]} />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeaderRow}>
                    <ThemedText style={[styles.timelineTitle, { color: currColors.text }]}>
                      Paid: {formatAmount(p.amount)}
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
                    Status: {p.status === 'paid' ? 'Paid' : p.status === 'upcoming' ? 'Upcoming' : 'Missed'}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Log Payment Modal */}
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
                    <ThemedText style={[styles.modalLabel, { color: currColors.textSecondary }]}>PAYMENT AMOUNT</ThemedText>
                    <TextInput
                      style={[styles.modalAmountInput, { color: currColors.text, borderBottomColor: currColors.border }]}
                      placeholder="0"
                      placeholderTextColor={currColors.textSecondary}
                      keyboardType="numeric"
                      value={paymentAmount}
                      onChangeText={setPaymentAmount}
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
                      <ThemedText style={{ color: selectedAccountId ? currColors.text : currColors.textSecondary, fontSize: 16 }}>
                        {accounts.find(a => a.id === selectedAccountId)?.name || 'Select Account'}
                      </ThemedText>
                      <ChevronDown size={18} color={currColors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.modalSubmitBtn, { backgroundColor: subscription.color || '#00C9A7' }]}
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
  infoCard: {
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
  cancelBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
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
