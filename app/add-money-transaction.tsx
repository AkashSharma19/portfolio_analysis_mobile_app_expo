import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronRight, Search, X, Check, ArrowLeftRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { MoneyTransaction, Account, AccountType } from '@/types/money';
import { BankLogo } from '@/components/BankLogo';
import { CategoryIcon } from '@/components/CategoryIcon';
import { formatCurrencyINR, formatIndianAmount, parseIndianAmount } from '@/utils/formatters';

const ACCOUNT_TYPE_ICONS: Record<AccountType, { color: string }> = {
  wallet: { color: '#00C9A7' },
  savings: { color: '#007AFF' },
  investment: { color: '#AF52DE' },
  credit_card: { color: '#FF9500' },
  emergency_fund: { color: '#FF2D55' },
  receivable: { color: '#34C759' },
  payable: { color: '#FF3B30' },
};

function AccountLogoOrIcon({ account, size = 26 }: { account: Account; size?: number }) {
  if (account.logo) {
    return <BankLogo logo={account.logo} size={size} style={{ marginRight: 8 }} />;
  }
  const config = ACCOUNT_TYPE_ICONS[account.type] || ACCOUNT_TYPE_ICONS.wallet;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `${config.color}20`,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
      }}
    >
      <ThemedText style={{ fontSize: size * 0.45, color: config.color, fontWeight: '700' }}>
        {account.name.charAt(0).toUpperCase()}
      </ThemedText>
    </View>
  );
}

const getPredictedAccount = (
  type: 'income' | 'expense' | 'transfer',
  category: string,
  moneyTransactions: MoneyTransaction[],
  activeAccounts: Account[]
): string => {
  const typeTxs = moneyTransactions.filter((tx) => tx.type === type);
  if (typeTxs.length === 0) return '';

  const catTxs = typeTxs.filter((tx) => tx.category === category);

  const getMostFrequentAccount = (txs: MoneyTransaction[]) => {
    const counts: Record<string, number> = {};
    txs.forEach((tx) => {
      counts[tx.accountId] = (counts[tx.accountId] || 0) + 1;
    });
    let maxCount = 0;
    let bestAccountId = '';
    Object.entries(counts).forEach(([id, count]) => {
      if (count > maxCount) {
        maxCount = count;
        bestAccountId = id;
      }
    });
    const exists = activeAccounts.some((a) => a.id === bestAccountId);
    return exists ? bestAccountId : '';
  };

  if (catTxs.length > 0) {
    const bestCatAccount = getMostFrequentAccount(catTxs);
    if (bestCatAccount) return bestCatAccount;
  }

  const bestTypeAccount = getMostFrequentAccount(typeTxs);
  if (bestTypeAccount) return bestTypeAccount;

  const lastTx = moneyTransactions[0];
  if (lastTx) {
    const exists = activeAccounts.some((a) => a.id === lastTx.accountId);
    if (exists) return lastTx.accountId;
  }

  return activeAccounts.length > 0 ? activeAccounts[0].id : '';
};

export default function AddMoneyTransactionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const storeCategories = useMoneyStore((state) => state.categories) || {
    income: [],
    expense: [],
  };

  const { accounts, moneyTransactions, addMoneyTransaction, updateMoneyTransaction } = useMoneyStore();

  const editingTx = useMemo(() => {
    return id ? moneyTransactions.find((tx) => String(tx.id) === String(id)) : null;
  }, [id, moneyTransactions]);

  // Form State
  const [type, setType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState('');
  const [isAccountManuallySelected, setIsAccountManuallySelected] = useState(false);

  // Modals & Search State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showToAccountModal, setShowToAccountModal] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [accountSearchQuery, setAccountSearchQuery] = useState('');

  // Load defaults or editing values
  useEffect(() => {
    if (editingTx) {
      setType(editingTx.type);
      setAmount(formatIndianAmount(editingTx.amount.toString()));
      setNote(editingTx.note || '');
      setDate(new Date(editingTx.date));
      setAccountId(editingTx.accountId);

      if (editingTx.type === 'transfer') {
        setToAccountId(editingTx.toAccountId || '');
      } else {
        setCategory(editingTx.category);
      }
    } else {
      const activeAccounts = accounts.filter((a) => !a.isArchived);
      if (activeAccounts.length > 0) {
        const predicted = getPredictedAccount(type, category, moneyTransactions, activeAccounts);
        setAccountId(predicted || activeAccounts[0].id);
        if (activeAccounts.length > 1) {
          setToAccountId(activeAccounts[1].id);
        }
      }

      const categoriesList = type === 'income' ? storeCategories.income : storeCategories.expense;
      if (categoriesList && categoriesList.length > 0) {
        setCategory(categoriesList[0]);
      } else {
        setCategory('');
      }
    }
  }, [editingTx, storeCategories, accounts]);

  // Auto-switch default category when type changes
  useEffect(() => {
    if (!editingTx) {
      const categoriesList = type === 'income' ? storeCategories.income : storeCategories.expense;
      if (categoriesList && categoriesList.length > 0) {
        setCategory(categoriesList[0]);
      } else {
        setCategory('');
      }
    }
  }, [type, storeCategories, editingTx]);

  // Auto-predict account based on category usage patterns
  useEffect(() => {
    if (editingTx || isAccountManuallySelected) return;
    const activeAccounts = accounts.filter((a) => !a.isArchived);
    if (activeAccounts.length > 0) {
      const predicted = getPredictedAccount(type, category, moneyTransactions, activeAccounts);
      if (predicted) {
        setAccountId(predicted);
      }
    }
  }, [type, category, moneyTransactions, accounts, editingTx, isAccountManuallySelected]);

  const handleSave = () => {
    const parsedAmount = parseIndianAmount(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Required Field', 'Please enter a valid amount.');
      return;
    }

    if (!accountId) {
      Alert.alert('Required Field', 'Please select an account.');
      return;
    }

    if (type === 'transfer' && !toAccountId) {
      Alert.alert('Required Field', 'Please select a destination account.');
      return;
    }

    if (type === 'transfer' && accountId === toAccountId) {
      Alert.alert('Invalid Operation', 'Source and destination accounts must be different.');
      return;
    }

    if (type !== 'transfer' && !category) {
      Alert.alert('Required Field', 'Please select a category.');
      return;
    }

    let finalCategory = category;
    if (type === 'transfer') {
      finalCategory = 'Transfer';
    }

    const txData: MoneyTransaction = {
      id: editingTx ? editingTx.id : Math.random().toString(36).substring(2, 9),
      type,
      amount: parsedAmount,
      category: finalCategory,
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      date: date.toISOString(),
      note: note.trim() || undefined,
      isRecurring: false,
    };

    if (editingTx) {
      updateMoneyTransaction(editingTx.id, txData);
    } else {
      addMoneyTransaction(txData);
    }

    router.back();
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const activeAccounts = useMemo(() => {
    return accounts.filter((a) => !a.isArchived);
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    if (!accountSearchQuery) return activeAccounts;
    return activeAccounts.filter((a) =>
      a.name.toLowerCase().includes(accountSearchQuery.toLowerCase().trim())
    );
  }, [activeAccounts, accountSearchQuery]);

  const sourceAccount = accounts.find((a) => a.id === accountId);
  const destAccount = accounts.find((a) => a.id === toAccountId);

  const rawCategoriesList = type === 'income' ? storeCategories.income : storeCategories.expense;
  const filteredCategories = useMemo(() => {
    if (!categorySearchQuery) return rawCategoriesList;
    return rawCategoriesList.filter((c) =>
      c.toLowerCase().includes(categorySearchQuery.toLowerCase().trim())
    );
  }, [rawCategoriesList, categorySearchQuery]);

  return (
    <View style={[styles.mainContainer, { backgroundColor: currColors.background }]}>
      <StatusBar style={colorScheme === 'light' ? 'dark' : 'light'} />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: currColors.background }]} edges={['top']}>
        {/* iOS Clean Header */}
        <View style={[styles.header, { backgroundColor: currColors.background, borderBottomColor: currColors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
            <ThemedText style={[styles.headerButtonText, { color: currColors.tint }]}>
              Cancel
            </ThemedText>
          </TouchableOpacity>
          <ThemedText style={[styles.headerTitle, { color: currColors.text }]}>
            {editingTx ? 'Edit Transaction' : 'Add Transaction'}
          </ThemedText>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <ThemedText style={[styles.headerButtonText, styles.saveButtonText, { color: currColors.tint }]}>
              Save
            </ThemedText>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 3-SEGMENT TYPE SELECTOR (Matches Investment App) */}
            <View style={styles.typeSelectorContainer}>
              <View style={[styles.typeSelector, { backgroundColor: currColors.card }]}>
                <Pressable
                  style={[styles.typeOption, type === 'expense' && styles.typeOptionActiveExpense]}
                  onPress={() => setType('expense')}
                >
                  <ThemedText
                    style={[
                      styles.typeText,
                      type === 'expense' && styles.typeTextActive,
                      { color: type === 'expense' ? '#FFF' : currColors.text },
                    ]}
                  >
                    Expense
                  </ThemedText>
                </Pressable>

                <Pressable
                  style={[styles.typeOption, type === 'income' && styles.typeOptionActiveIncome]}
                  onPress={() => setType('income')}
                >
                  <ThemedText
                    style={[
                      styles.typeText,
                      type === 'income' && styles.typeTextActive,
                      { color: type === 'income' ? '#FFF' : currColors.text },
                    ]}
                  >
                    Income
                  </ThemedText>
                </Pressable>

                <Pressable
                  style={[styles.typeOption, type === 'transfer' && styles.typeOptionActiveTransfer]}
                  onPress={() => setType('transfer')}
                >
                  <ThemedText
                    style={[
                      styles.typeText,
                      type === 'transfer' && styles.typeTextActive,
                      { color: type === 'transfer' ? '#FFF' : currColors.text },
                    ]}
                  >
                    Transfer
                  </ThemedText>
                </Pressable>
              </View>
            </View>

            {/* TRANSACTION DETAILS GROUP */}
            <ThemedText style={[styles.groupLabel, { color: currColors.textSecondary }]}>
              TRANSACTION DETAILS
            </ThemedText>
            <View style={[styles.formGroup, { backgroundColor: currColors.card }]}>
              {/* AMOUNT ROW */}
              <View style={[styles.formRow, styles.formRowFirst, { borderBottomColor: currColors.border }]}>
                <ThemedText style={[styles.label, { color: currColors.text }]}>Amount</ThemedText>
                <View style={styles.amountInputRow}>
                  <ThemedText style={[styles.currencyPrefix, { color: currColors.text }]}>₹</ThemedText>
                  <TextInput
                    style={[styles.input, { color: currColors.text }]}
                    placeholder="0"
                    placeholderTextColor={currColors.textSecondary}
                    value={amount}
                    onChangeText={(val) => setAmount(formatIndianAmount(val))}
                    keyboardType="decimal-pad"
                    textAlign="right"
                  />
                </View>
              </View>

              {/* CATEGORY ROW (Expense / Income) */}
              {type !== 'transfer' ? (
                <TouchableOpacity
                  style={[styles.formRow, { borderBottomColor: currColors.border }]}
                  onPress={() => setShowCategoryModal(true)}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[styles.label, { color: currColors.text }]}>Category</ThemedText>
                  <View style={styles.valueContainer}>
                    {category ? (
                      <View style={styles.categoryBadge}>
                        <CategoryIcon name={category} color={currColors.tint} size={15} style={{ marginRight: 6 }} />
                        <ThemedText style={[styles.valueText, { color: currColors.text }]}>{category}</ThemedText>
                      </View>
                    ) : (
                      <ThemedText style={[styles.valueText, styles.placeholderText, { color: currColors.textSecondary }]}>
                        Select Category
                      </ThemedText>
                    )}
                    <ChevronRight size={16} color={currColors.border} style={{ marginLeft: 6 }} />
                  </View>
                </TouchableOpacity>
              ) : null}

              {/* ACCOUNT ROW: Merged From/To for Transfer, Single row for Expense/Income */}
              {type === 'transfer' ? (
                <View style={[styles.formRow, styles.formRowLast, styles.transferMergedRow]}>
                  {/* FROM ACCOUNT */}
                  <TouchableOpacity
                    style={styles.transferSide}
                    onPress={() => setShowAccountModal(true)}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={[styles.transferSideLabel, { color: currColors.textSecondary }]}>
                      FROM ACCOUNT
                    </ThemedText>
                    <View style={styles.transferAccountPill}>
                      {sourceAccount ? (
                        <>
                          <AccountLogoOrIcon account={sourceAccount} size={18} />
                          <ThemedText style={[styles.transferAccountText, { color: currColors.text }]} numberOfLines={1}>
                            {sourceAccount.name}
                          </ThemedText>
                        </>
                      ) : (
                        <ThemedText style={[styles.transferAccountText, { color: currColors.textSecondary }]}>
                          Select
                        </ThemedText>
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* SWAP BUTTON */}
                  <TouchableOpacity
                    style={[
                      styles.transferSwapButton,
                      { backgroundColor: currColors.cardSecondary, borderColor: currColors.border },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      const temp = accountId;
                      setAccountId(toAccountId);
                      setToAccountId(temp);
                    }}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <ArrowLeftRight size={13} color="#00C9A7" />
                  </TouchableOpacity>

                  {/* TO ACCOUNT */}
                  <TouchableOpacity
                    style={[styles.transferSide, { alignItems: 'flex-end' }]}
                    onPress={() => setShowToAccountModal(true)}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={[styles.transferSideLabel, { color: currColors.textSecondary }]}>
                      TO ACCOUNT
                    </ThemedText>
                    <View style={[styles.transferAccountPill, { justifyContent: 'flex-end' }]}>
                      {destAccount ? (
                        <>
                          <ThemedText style={[styles.transferAccountText, { color: currColors.text }]} numberOfLines={1}>
                            {destAccount.name}
                          </ThemedText>
                          <AccountLogoOrIcon account={destAccount} size={18} />
                        </>
                      ) : (
                        <ThemedText style={[styles.transferAccountText, { color: currColors.textSecondary }]}>
                          Select
                        </ThemedText>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.formRow, styles.formRowLast]}
                  onPress={() => setShowAccountModal(true)}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[styles.label, { color: currColors.text }]}>Account</ThemedText>
                  <View style={styles.valueContainer}>
                    {sourceAccount ? (
                      <View style={styles.categoryBadge}>
                        <AccountLogoOrIcon account={sourceAccount} size={20} />
                        <ThemedText style={[styles.valueText, { color: currColors.text }]}>
                          {sourceAccount.name}
                        </ThemedText>
                      </View>
                    ) : (
                      <ThemedText style={[styles.valueText, styles.placeholderText, { color: currColors.textSecondary }]}>
                        Select Account
                      </ThemedText>
                    )}
                    <ChevronRight size={16} color={currColors.border} style={{ marginLeft: 6 }} />
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {/* DATE & NOTES GROUP */}
            <ThemedText style={[styles.groupLabel, { color: currColors.textSecondary }]}>
              DATE & NOTES
            </ThemedText>
            <View style={[styles.formGroup, { backgroundColor: currColors.card }]}>
              {/* DATE ROW */}
              <View style={[styles.formRow, styles.formRowFirst, { borderBottomColor: currColors.border }]}>
                <ThemedText style={[styles.label, { color: currColors.text }]}>Date</ThemedText>
                <View style={{ flex: 1 }}>
                  {Platform.OS === 'ios' ? (
                    <View style={{ alignItems: 'flex-end' }}>
                      <DateTimePicker
                        value={date}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                        themeVariant={colorScheme}
                      />
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(true)}
                      style={{ alignItems: 'flex-end' }}
                    >
                      <ThemedText style={[styles.valueText, { color: currColors.text }]}>
                        {date.toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {showDatePicker && Platform.OS !== 'ios' && (
                <DateTimePicker value={date} mode="date" display="default" onChange={onDateChange} />
              )}

              {/* NOTE ROW */}
              <View style={[styles.formRow, styles.formRowLast]}>
                <ThemedText style={[styles.label, { color: currColors.text }]}>Note</ThemedText>
                <TextInput
                  style={[styles.input, { color: currColors.text }]}
                  placeholder="Optional note"
                  placeholderTextColor={currColors.textSecondary}
                  value={note}
                  onChangeText={setNote}
                  textAlign="right"
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* CATEGORY SELECTION MODAL (Matches Investment Symbol Modal) */}
      <Modal visible={showCategoryModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: currColors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: currColors.border }]}>
            <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>Select Category</ThemedText>
            <TouchableOpacity onPress={() => setShowCategoryModal(false)} style={styles.modalCloseButton}>
              <X size={20} color={currColors.text} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchBarContainer, { backgroundColor: currColors.cardSecondary }]}>
            <Search size={16} color={currColors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: currColors.text }]}
              placeholder="Search categories..."
              placeholderTextColor={currColors.textSecondary}
              value={categorySearchQuery}
              onChangeText={setCategorySearchQuery}
              clearButtonMode="while-editing"
            />
          </View>

          <FlatList
            data={filteredCategories}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = category === item;
              return (
                <TouchableOpacity
                  style={[styles.listItem, { borderBottomColor: currColors.border }]}
                  onPress={() => {
                    setCategory(item);
                    setShowCategoryModal(false);
                    setCategorySearchQuery('');
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View
                      style={[
                        styles.modalIconWrap,
                        { backgroundColor: `${currColors.tint}15` },
                      ]}
                    >
                      <CategoryIcon name={item} color={currColors.tint} size={18} />
                    </View>
                    <ThemedText style={[styles.itemTitle, { color: currColors.text }]}>{item}</ThemedText>
                  </View>
                  {isSelected && <Check size={18} color="#00C9A7" strokeWidth={2.5} />}
                </TouchableOpacity>
              );
            }}
          />

          <TouchableOpacity
            style={[styles.manageBtn, { backgroundColor: currColors.cardSecondary }]}
            onPress={() => {
              setShowCategoryModal(false);
              router.push('/manage-categories');
            }}
          >
            <ThemedText style={{ color: '#00C9A7', fontSize: 15, fontFamily: 'Outfit_600SemiBold' }}>
              + Manage Categories
            </ThemedText>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ACCOUNT SELECTION MODAL */}
      <Modal visible={showAccountModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: currColors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: currColors.border }]}>
            <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>Select Account</ThemedText>
            <TouchableOpacity onPress={() => setShowAccountModal(false)} style={styles.modalCloseButton}>
              <X size={20} color={currColors.text} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchBarContainer, { backgroundColor: currColors.cardSecondary }]}>
            <Search size={16} color={currColors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: currColors.text }]}
              placeholder="Search accounts..."
              placeholderTextColor={currColors.textSecondary}
              value={accountSearchQuery}
              onChangeText={setAccountSearchQuery}
              clearButtonMode="while-editing"
            />
          </View>

          <FlatList
            data={filteredAccounts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = accountId === item.id;
              return (
                <TouchableOpacity
                  style={[styles.listItem, { borderBottomColor: currColors.border }]}
                  onPress={() => {
                    setAccountId(item.id);
                    setIsAccountManuallySelected(true);
                    setShowAccountModal(false);
                    setAccountSearchQuery('');
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <AccountLogoOrIcon account={item} size={32} />
                    <View style={{ flex: 1, marginLeft: 4 }}>
                      <ThemedText style={[styles.itemTitle, { color: currColors.text }]}>{item.name}</ThemedText>
                      <ThemedText style={[styles.itemSubtitle, { color: currColors.textSecondary }]}>
                        Balance: {formatCurrencyINR(item.balance, true, 0)}
                      </ThemedText>
                    </View>
                  </View>
                  {isSelected && <Check size={18} color="#00C9A7" strokeWidth={2.5} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      {/* TO ACCOUNT SELECTION MODAL (Transfer only) */}
      <Modal visible={showToAccountModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: currColors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: currColors.border }]}>
            <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>Destination Account</ThemedText>
            <TouchableOpacity onPress={() => setShowToAccountModal(false)} style={styles.modalCloseButton}>
              <X size={20} color={currColors.text} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={activeAccounts.filter((a) => a.id !== accountId)}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = toAccountId === item.id;
              return (
                <TouchableOpacity
                  style={[styles.listItem, { borderBottomColor: currColors.border }]}
                  onPress={() => {
                    setToAccountId(item.id);
                    setShowToAccountModal(false);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <AccountLogoOrIcon account={item} size={32} />
                    <View style={{ flex: 1, marginLeft: 4 }}>
                      <ThemedText style={[styles.itemTitle, { color: currColors.text }]}>{item.name}</ThemedText>
                      <ThemedText style={[styles.itemSubtitle, { color: currColors.textSecondary }]}>
                        Balance: {formatCurrencyINR(item.balance, true, 0)}
                      </ThemedText>
                    </View>
                  </View>
                  {isSelected && <Check size={18} color="#00C9A7" strokeWidth={2.5} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
  },
  headerButtonText: {
    fontSize: 17,
    fontFamily: 'Outfit_400Regular',
  },
  cancelButton: {
    padding: 4,
  },
  saveButton: {
    padding: 4,
  },
  saveButtonText: {
    fontFamily: 'Outfit_600SemiBold',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  typeSelectorContainer: {
    padding: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  typeOptionActiveExpense: {
    backgroundColor: '#FF3B30',
  },
  typeOptionActiveIncome: {
    backgroundColor: '#34C759',
  },
  typeOptionActiveTransfer: {
    backgroundColor: '#00C9A7',
  },
  typeText: {
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
  },
  typeTextActive: {
    fontFamily: 'Outfit_600SemiBold',
  },
  groupLabel: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 0.5,
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 8,
  },
  formGroup: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    minHeight: 48,
  },
  formRowFirst: {},
  formRowLast: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
  },
  placeholderText: {
    opacity: 0.6,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  currencyPrefix: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    fontFamily: 'Outfit_400Regular',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
  },
  modalCloseButton: {
    padding: 4,
  },
  searchBarContainer: {
    margin: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
  },
  listContent: {
    paddingBottom: 30,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  modalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontFamily: 'Outfit_500Medium',
  },
  itemSubtitle: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  manageBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'ios' ? 24 : 16,
    borderRadius: 12,
  },
  transferMergedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  transferSide: {
    flex: 1,
    justifyContent: 'center',
  },
  transferSideLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  transferAccountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transferAccountText: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
    flexShrink: 1,
  },
  transferSwapButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
});
