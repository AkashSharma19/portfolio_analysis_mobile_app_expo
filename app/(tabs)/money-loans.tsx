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
import {
  Plus,
  Landmark,
  Calendar,
  Home,
  Car,
  User,
  GraduationCap,
  ChevronRight,
  Info,
  Repeat,
  Tv,
  Music,
  Youtube,
  ShoppingBag,
  Cloud,
  Gamepad2,
  Sparkles,
  Layers,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Loan, Subscription } from '@/types/money';

const getSubscriptionIcon = (logoName: string | undefined) => {
  switch (logoName) {
    case 'tv':
      return Tv;
    case 'music':
      return Music;
    case 'youtube':
      return Youtube;
    case 'shopping-bag':
      return ShoppingBag;
    case 'sparkles':
      return Sparkles;
    case 'cloud':
      return Cloud;
    case 'gamepad-2':
      return Gamepad2;
    case 'layers':
      return Layers;
    default:
      return Repeat;
  }
};

const TYPE_CONFIG = {
  home: { label: 'Home Loan', emoji: '🏠', icon: Home, color: '#007AFF' },
  car: { label: 'Car Loan', emoji: '🚗', icon: Car, color: '#34C759' },
  personal: { label: 'Personal Loan', emoji: '💰', icon: User, color: '#FF9500' },
  education: { label: 'Education Loan', emoji: '🎓', icon: GraduationCap, color: '#AF52DE' },
  other: { label: 'Other Loan', emoji: '🏦', icon: Landmark, color: '#8E8E93' },
};

const getRemainingEMIsCount = (loan: Loan) => {
  if (loan.outstandingAmount <= 0 || loan.emiAmount <= 0) return 0;
  
  const r = (loan.interestRate / 12) / 100;
  const emi = loan.emiAmount;
  
  if (r > 0 && emi <= loan.outstandingAmount * r) {
    return Math.round(loan.outstandingAmount / emi);
  }

  let balance = loan.outstandingAmount;
  let monthsRemaining = 0;
  
  while (balance > 0 && monthsRemaining < 480) {
    const interest = balance * r;
    const principal = emi - interest;
    if (principal <= 0) break;
    
    balance -= Math.min(balance, principal);
    monthsRemaining++;
  }
  
  return monthsRemaining;
};

type ObligationTab = 'loans' | 'subscriptions';

export default function LoansScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];
  const [activeTab, setActiveTab] = useState<ObligationTab>('loans');

  const { loans, getMonthlyEMIBurden, subscriptions, getMonthlySubscriptionBurden } = useMoneyStore();
  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

  const monthlyEMI = getMonthlyEMIBurden();
  const monthlySubBurden = getMonthlySubscriptionBurden();

  const activeLoans = useMemo(() => loans.filter((l) => l.isActive), [loans]);
  const completedLoans = useMemo(() => loans.filter((l) => !l.isActive), [loans]);
  const activeSubscriptions = useMemo(() => subscriptions.filter((s) => s.isActive), [subscriptions]);
  const completedSubscriptions = useMemo(() => subscriptions.filter((s) => !s.isActive), [subscriptions]);

  const totalOutstanding = useMemo(() => {
    return activeLoans.reduce((acc, l) => acc + l.outstandingAmount, 0);
  }, [activeLoans]);

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

  const handleAdd = () => {
    handleHaptic();
    if (activeTab === 'loans') {
      router.push('/add-loan');
    } else {
      router.push('/add-subscription');
    }
  };

  const renderLoanCard = (item: Loan, index: number, array: Loan[]) => {
    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.other;
    const IconComponent = config.icon;
    const isLast = index === array.length - 1;
    const paidAmount = Math.max(0, item.principalAmount - item.outstandingAmount);
    const paidPercentage = item.principalAmount > 0 ? (paidAmount / item.principalAmount) * 100 : 0;
    const remainingEMIs = getRemainingEMIsCount(item);

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.loanRow,
          !isLast && { borderBottomWidth: 1, borderBottomColor: currColors.border }
        ]}
        activeOpacity={0.75}
        onPress={() => {
          handleHaptic();
          router.push(`/loan-details/${item.id}`);
        }}
      >
        <View style={styles.cardMainRow}>
          <View style={styles.cardLeft}>
            <View style={[styles.iconWrapper, { backgroundColor: `${config.color}15` }]}>
              <IconComponent size={18} color={config.color} />
            </View>
            <View style={styles.accountInfo}>
              <ThemedText type="semiBold" style={[styles.accountName, { color: currColors.text }]} numberOfLines={1}>
                {item.name}
              </ThemedText>
              <ThemedText style={[styles.accountSub, { color: currColors.textSecondary }]} numberOfLines={1}>
                {item.lenderName} • {item.interestRate}% Interest
              </ThemedText>
            </View>
          </View>
          <View style={styles.cardRight}>
            <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
              <ThemedText style={[styles.accountBalance, { fontFamily: 'Outfit_600SemiBold', color: currColors.text }]}>
                {formatAmount(item.outstandingAmount)}
              </ThemedText>
              <ThemedText style={{ fontSize: 11, color: currColors.textSecondary, fontFamily: 'Outfit_400Regular', marginTop: 2 }}>
                EMI: {formatAmount(item.emiAmount)} • {remainingEMIs} left
              </ThemedText>
            </View>
            <ChevronRight size={16} color={currColors.textSecondary} />
          </View>
        </View>
        {item.principalAmount > 0 && (
          <View style={{ marginTop: 8 }}>
            <View style={[styles.progressBarBG, { backgroundColor: currColors.cardSecondary }]}>
              <View style={[styles.progressBarFill, { width: `${Math.min(100, paidPercentage)}%`, backgroundColor: config.color }]} />
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderSubscriptionCard = (item: Subscription, index: number, array: Subscription[]) => {
    const isLast = index === array.length - 1;
    const nextDate = new Date(item.nextPaymentDate);
    const formattedDate = nextDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.loanRow,
          !isLast && { borderBottomWidth: 1, borderBottomColor: currColors.border }
        ]}
        activeOpacity={0.75}
        onPress={() => {
          handleHaptic();
          router.push(`/subscription-details/${item.id}`);
        }}
      >
        <View style={styles.cardMainRow}>
          <View style={styles.cardLeft}>
            {(() => {
              const IconComponent = getSubscriptionIcon(item.logo);
              return (
                <View style={[styles.iconWrapper, { backgroundColor: `${item.color}15` }]}>
                  <IconComponent size={18} color={item.color || '#00C9A7'} />
                </View>
              );
            })()}
            <View style={styles.accountInfo}>
              <ThemedText type="semiBold" style={[styles.accountName, { color: currColors.text }]} numberOfLines={1}>
                {item.name}
              </ThemedText>
              <ThemedText style={[styles.accountSub, { color: currColors.textSecondary }]} numberOfLines={1}>
                {item.category} • {item.billingCycle.charAt(0).toUpperCase() + item.billingCycle.slice(1)}
              </ThemedText>
            </View>
          </View>
          <View style={styles.cardRight}>
            <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
              <ThemedText style={[styles.accountBalance, { fontFamily: 'Outfit_600SemiBold', color: currColors.text }]}>
                {formatAmount(item.amount)}
              </ThemedText>
              <ThemedText style={{ fontSize: 11, color: currColors.textSecondary, fontFamily: 'Outfit_400Regular', marginTop: 2 }}>
                Next: {formattedDate}
              </ThemedText>
            </View>
            <ChevronRight size={16} color={currColors.textSecondary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const isLoansView = activeTab === 'loans';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currColors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="semiBold" style={[styles.headerTitle, { color: currColors.text }]}>
          Loans & EMIs
        </ThemedText>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: currColors.cardSecondary }]} onPress={handleAdd}>
          <Plus size={20} color="#00C9A7" />
        </TouchableOpacity>
      </View>

      {/* Tab Toggle */}
      <View style={[styles.toggleBar, { backgroundColor: currColors.cardSecondary }]}>
        <TouchableOpacity
          style={[styles.toggleOption, isLoansView && { backgroundColor: currColors.card }]}
          onPress={() => {
            handleHaptic();
            setActiveTab('loans');
          }}
        >
          <ThemedText style={[styles.toggleText, { color: isLoansView ? '#00C9A7' : currColors.textSecondary }]}>
            Loans
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleOption, !isLoansView && { backgroundColor: currColors.card }]}
          onPress={() => {
            handleHaptic();
            setActiveTab('subscriptions');
          }}
        >
          <ThemedText style={[styles.toggleText, { color: !isLoansView ? '#00C9A7' : currColors.textSecondary }]}>
            Subscriptions
          </ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        {isLoansView ? (
          <>
            {/* Total EMI Burden Card */}
            <View style={[styles.burdenCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
              <View style={styles.burdenRow}>
                <View style={[styles.iconRoundBox, { backgroundColor: '#FF950015', width: 40, height: 40 }]}>
                  <Calendar size={20} color="#FF9500" />
                </View>
                <View style={styles.burdenInfo}>
                  <ThemedText style={[styles.burdenTitle, { color: currColors.textSecondary }]}>
                    TOTAL MONTHLY EMI BURDEN
                  </ThemedText>
                  <ThemedText style={[styles.burdenValue, { color: currColors.text }]}>
                    {formatAmount(monthlyEMI)}
                  </ThemedText>
                </View>
              </View>
              <View style={[styles.dashedDivider, { borderColor: currColors.border }]} />
              <View style={styles.burdenFooter}>
                <ThemedText style={[styles.footerLabel, { color: currColors.textSecondary }]}>
                  Total Outstanding Debt
                </ThemedText>
                <ThemedText style={[styles.footerValue, { color: '#FF3B30', fontFamily: 'Outfit_600SemiBold' }]}>
                  {formatAmount(totalOutstanding)}
                </ThemedText>
              </View>
            </View>

            {/* Active Loans */}
            <View style={styles.sectionHeader}>
              <ThemedText type="medium" style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
                ACTIVE LOANS ({activeLoans.length})
              </ThemedText>
            </View>
            {activeLoans.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                <Info size={44} color={currColors.textSecondary} style={{ marginBottom: 12 }} />
                <ThemedText style={{ color: currColors.textSecondary, textAlign: 'center', fontFamily: 'Outfit_400Regular', lineHeight: 22, paddingHorizontal: 16 }}>
                  No active loans tracked. Tap the '+' button above to log a Home loan, Car loan, or other EMIs.
                </ThemedText>
              </View>
            ) : (
              <View style={[styles.groupWrapperCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                {activeLoans.map((item, index) => renderLoanCard(item, index, activeLoans))}
              </View>
            )}

            {/* Completed Loans */}
            {completedLoans.length > 0 ? (
              <View style={{ marginTop: 24 }}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="medium" style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
                    PAID OFF / COMPLETED LOANS ({completedLoans.length})
                  </ThemedText>
                </View>
                <View style={[styles.groupWrapperCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                  {completedLoans.map((item, index) => renderLoanCard(item, index, completedLoans))}
                </View>
              </View>
            ) : null}
          </>
        ) : (
          <>
            {/* Total Monthly Subscription Burden */}
            <View style={[styles.burdenCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
              <View style={styles.burdenRow}>
                <View style={[styles.iconRoundBox, { backgroundColor: '#00C9A715', width: 40, height: 40 }]}>
                  <Repeat size={20} color="#00C9A7" />
                </View>
                <View style={styles.burdenInfo}>
                  <ThemedText style={[styles.burdenTitle, { color: currColors.textSecondary }]}>
                    MONTHLY SUBSCRIPTION OUTFLOW
                  </ThemedText>
                  <ThemedText style={[styles.burdenValue, { color: currColors.text }]}>
                    {formatAmount(monthlySubBurden)}
                  </ThemedText>
                </View>
              </View>
              <View style={[styles.dashedDivider, { borderColor: currColors.border }]} />
              <View style={styles.burdenFooter}>
                <ThemedText style={[styles.footerLabel, { color: currColors.textSecondary }]}>
                  Active Subscriptions
                </ThemedText>
                <ThemedText style={[styles.footerValue, { color: '#00C9A7', fontFamily: 'Outfit_600SemiBold' }]}>
                  {activeSubscriptions.length}
                </ThemedText>
              </View>
            </View>

            {/* Active Subscriptions */}
            <View style={styles.sectionHeader}>
              <ThemedText type="medium" style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
                ACTIVE SUBSCRIPTIONS ({activeSubscriptions.length})
              </ThemedText>
            </View>
            {activeSubscriptions.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                <Info size={44} color={currColors.textSecondary} style={{ marginBottom: 12 }} />
                <ThemedText style={{ color: currColors.textSecondary, textAlign: 'center', fontFamily: 'Outfit_400Regular', lineHeight: 22, paddingHorizontal: 16 }}>
                  No subscriptions tracked yet. Tap the '+' button above to add Netflix, Spotify, or other recurring subscriptions.
                </ThemedText>
              </View>
            ) : (
              <View style={[styles.groupWrapperCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                {activeSubscriptions.map((item, index) => renderSubscriptionCard(item, index, activeSubscriptions))}
              </View>
            )}

            {/* Completed / Cancelled Subscriptions */}
            {completedSubscriptions.length > 0 ? (
              <View style={{ marginTop: 24 }}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="medium" style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
                    CANCELLED / PAST SUBSCRIPTIONS ({completedSubscriptions.length})
                  </ThemedText>
                </View>
                <View style={[styles.groupWrapperCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                  {completedSubscriptions.map((item, index) => renderSubscriptionCard(item, index, completedSubscriptions))}
                </View>
              </View>
            ) : null}
          </>
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
  toggleBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  toggleText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  scrollContent: {
    paddingBottom: 110,
  },
  burdenCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginTop: 4,
    marginBottom: 20,
  },
  burdenRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  burdenInfo: {
    marginLeft: 14,
  },
  burdenTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  burdenValue: {
    fontSize: 24,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
  },
  dashedDivider: {
    height: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 1,
    marginVertical: 16,
  },
  burdenFooter: {
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
  emptyCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  groupWrapperCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  loanRow: {
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
    marginBottom: 2,
  },
  accountSub: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
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
  iconRoundBox: {
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarBG: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});
