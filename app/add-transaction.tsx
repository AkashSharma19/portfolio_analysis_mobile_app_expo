import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Ticker, TransactionType } from '@/types';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check, ChevronRight, Search, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddTransactionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addTransaction, updateTransaction, transactions, tickers, fetchTickers } = usePortfolioStore();

  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const editingTransaction = useMemo(() =>
    id ? transactions.find(t => t.id === id) : null,
    [id, transactions]);

  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [type, setType] = useState<TransactionType>('BUY');
  const [date, setDate] = useState(new Date());
  const [broker, setBroker] = useState('');
  // Currency fixed to INR for now as per previous context, can be expanded
  const [currency, setCurrency] = useState('INR');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSymbolModal, setShowSymbolModal] = useState(false);
  const [showBrokerModal, setShowBrokerModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Initial load
  useEffect(() => {
    fetchTickers();
    if (editingTransaction) {
      setSymbol(editingTransaction.symbol);
      setQuantity(editingTransaction.quantity.toString());
      setPrice(editingTransaction.price.toString());
      setType(editingTransaction.type);
      setDate(new Date(editingTransaction.date));
      setCurrency(editingTransaction.currency || 'INR');
      setBroker(editingTransaction.broker || '');
    }
  }, [editingTransaction]);

  const selectedTicker = useMemo(() =>
    tickers.find(t => t.Tickers === symbol),
    [symbol, tickers]);

  const filteredTickers = useMemo(() => {
    if (!searchQuery) return tickers;
    return tickers.filter((t) =>
      t.Tickers.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t['Company Name'].toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, tickers]);

  const existingBrokers = useMemo(() => {
    const brokers = new Set(transactions.map((t) => t.broker).filter(Boolean));
    return Array.from(brokers);
  }, [transactions]);

  const handleSave = () => {
    if (!symbol || !quantity || price === '') return;

    const transactionData = {
      id: editingTransaction ? editingTransaction.id : Math.random().toString(36).substring(7),
      symbol: symbol.toUpperCase(),
      quantity: parseFloat(quantity),
      price: parseFloat(price),
      date: date.toISOString(),
      type: type,
      currency: currency.toUpperCase(),
      broker: broker.trim(),
    };

    if (editingTransaction) {
      updateTransaction(editingTransaction.id, transactionData);
    } else {
      addTransaction(transactionData);
    }

    router.back();
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const selectTicker = (item: Ticker) => {
    setSymbol(item.Tickers);
    // Auto-fill price if adding new, otherwise keep existing
    if (!editingTransaction) {
      setPrice(item['Current Value'].toString());
    }
    setShowSymbolModal(false);
    setSearchQuery('');
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: currColors.background }]}>
      <StatusBar style={colorScheme === 'light' ? 'dark' : 'light'} />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: currColors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: currColors.background, borderBottomColor: currColors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
            <Text style={[styles.headerButtonText, { color: currColors.tint }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: currColors.text }]}>{editingTransaction ? 'Edit Transaction' : 'Add Transaction'}</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={[styles.headerButtonText, styles.saveButtonText, { color: currColors.tint }]}>Save</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>

            {/* TYPE SELECTOR */}
            <View style={styles.typeSelectorContainer}>
              <View style={[styles.typeSelector, { backgroundColor: currColors.card }]}>
                <Pressable
                  style={[styles.typeOption, type === 'BUY' && styles.typeOptionActive]}
                  onPress={() => setType('BUY')}
                >
                  <Text style={[styles.typeText, type === 'BUY' && styles.typeTextActive, { color: type === 'BUY' ? '#000' : currColors.text }]}>Buy</Text>
                </Pressable>
                <Pressable
                  style={[styles.typeOption, type === 'SELL' && styles.typeOptionActiveSell]}
                  onPress={() => setType('SELL')}
                >
                  <Text style={[styles.typeText, type === 'SELL' && styles.typeTextActive, { color: type === 'SELL' ? '#000' : currColors.text }]}>Sell</Text>
                </Pressable>
              </View>
            </View>

            {/* ASSET DETAILS GROUP */}
            <Text style={[styles.groupLabel, { color: currColors.textSecondary }]}>ASSET DETAILS</Text>
            <View style={[styles.formGroup, { backgroundColor: currColors.card }]}>
              <TouchableOpacity
                style={[styles.formRow, styles.formRowFirst, { borderBottomColor: currColors.border }]}
                onPress={() => setShowSymbolModal(true)}
              >
                <Text style={[styles.label, { color: currColors.text }]}>Symbol</Text>
                <View style={styles.valueContainer}>
                  <Text style={[styles.valueText, !symbol && styles.placeholderText, { color: symbol ? currColors.text : currColors.textSecondary }]}>
                    {symbol || 'Select'}
                  </Text>
                  <ChevronRight size={16} color={currColors.border} style={{ marginLeft: 4 }} />
                </View>
              </TouchableOpacity>

              {selectedTicker && (
                <View style={[styles.companyInfoRow, { borderBottomColor: currColors.border }]}>
                  <Text style={[styles.companyName, { color: currColors.textSecondary }]}>{selectedTicker['Company Name']}</Text>
                </View>
              )}

              <View style={[styles.formRow, { borderBottomColor: currColors.border }]}>
                <Text style={[styles.label, { color: currColors.text }]}>Quantity</Text>
                <TextInput
                  style={[styles.input, { color: currColors.text }]}
                  placeholder="0"
                  placeholderTextColor={currColors.textSecondary}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="decimal-pad"
                  textAlign="right"
                />
              </View>

              <View style={[styles.formRow, styles.formRowLast]}>
                <Text style={[styles.label, { color: currColors.text }]}>Price</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
                  <TextInput
                    style={[styles.input, { color: currColors.text }]}
                    placeholder="₹ 0.00"
                    placeholderTextColor={currColors.textSecondary}
                    value={price ? `₹ ${price}` : ''}
                    onChangeText={(text) => setPrice(text.replace(/[^0-9.]/g, ''))}
                    keyboardType="decimal-pad"
                    textAlign="right"
                  />
                </View>
              </View>
            </View>

            {/* TRANSACTION DETAILS GROUP */}
            <Text style={[styles.groupLabel, { color: currColors.textSecondary }]}>TRANSACTION DETAILS</Text>
            <View style={[styles.formGroup, { backgroundColor: currColors.card }]}>
              <View style={[styles.formRow, styles.formRowFirst, { borderBottomColor: currColors.border }]}>
                <Text style={[styles.label, { color: currColors.text }]}>Date</Text>
                <View style={{ flex: 1 }}>
                  {Platform.OS === 'ios' ? (
                    <View style={{ alignItems: 'flex-end' }}>
                      <DateTimePicker
                        value={date}
                        mode="date"
                        display="compact"
                        onChange={onDateChange}
                        maximumDate={new Date()}
                        themeVariant={colorScheme === 'light' ? 'light' : 'dark'}
                        style={{ width: 120 }}
                      />
                    </View>
                  ) : (
                    <Pressable onPress={() => setShowDatePicker(true)} style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.valueText, { color: currColors.text }]}>{date.toLocaleDateString()}</Text>
                    </Pressable>
                  )}
                </View>
              </View>
              {Platform.OS !== 'ios' && showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                  maximumDate={new Date()}
                />
              )}

              <TouchableOpacity
                style={[styles.formRow, styles.formRowLast]}
                onPress={() => {
                  setSearchQuery('');
                  setShowBrokerModal(true);
                }}
              >
                <Text style={[styles.label, { color: currColors.text }]}>Broker</Text>
                <View style={styles.valueContainer}>
                  <Text style={[styles.valueText, !broker && styles.placeholderText, { color: broker ? currColors.text : currColors.textSecondary }]}>
                    {broker || 'Optional'}
                  </Text>
                  <ChevronRight size={16} color={currColors.border} style={{ marginLeft: 4 }} />
                </View>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* SYMBOL SELECTION MODAL */}
      <Modal
        visible={showSymbolModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSymbolModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: currColors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: currColors.background, borderBottomColor: currColors.border }]}>
            <Text style={[styles.modalTitle, { color: currColors.text }]}>Select Asset</Text>
            <TouchableOpacity onPress={() => setShowSymbolModal(false)} style={styles.modalCloseButton}>
              <X size={24} color={currColors.text} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchBarContainer, { backgroundColor: currColors.card }]}>
            <Search size={18} color={currColors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: currColors.text }]}
              placeholder="Search ticker or company"
              placeholderTextColor={currColors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color={currColors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filteredTickers}
            accessibilityLabel='tickers-list'
            keyExtractor={(item) => item.Tickers}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.tickerItem, { borderBottomColor: currColors.border }]}
                onPress={() => selectTicker(item)}
              >
                <View>
                  <Text style={[styles.tickerSymbol, { color: currColors.text }]}>{item.Tickers}</Text>
                  <Text style={[styles.companyNameList, { color: currColors.textSecondary }]}>{item['Company Name']}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.tickerPrice, { color: currColors.text }]}>₹{item['Current Value']}</Text>
                  {symbol === item.Tickers && <Check size={16} color={currColors.tint} style={{ marginTop: 4 }} />}
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.tickerList}
          />
        </View>
      </Modal>

      {/* BROKER SELECTION MODAL */}
      <Modal
        visible={showBrokerModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBrokerModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: currColors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: currColors.background, borderBottomColor: currColors.border }]}>
            <Text style={[styles.modalTitle, { color: currColors.text }]}>Select Broker</Text>
            <TouchableOpacity onPress={() => setShowBrokerModal(false)} style={styles.modalCloseButton}>
              <X size={24} color={currColors.text} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchBarContainer, { backgroundColor: currColors.card }]}>
            <Search size={18} color={currColors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: currColors.text }]}
              placeholder="Search or add new broker"
              placeholderTextColor={currColors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color={currColors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView contentContainerStyle={styles.tickerList} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
            {/* Option to add new if search query exists */}
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={[styles.tickerItem, { borderBottomColor: currColors.border }]}
                onPress={() => {
                  setBroker(searchQuery);
                  setShowBrokerModal(false);
                }}
              >
                <Text style={[styles.tickerSymbol, { color: currColors.tint }]}>Use "{searchQuery}"</Text>
              </TouchableOpacity>
            )}

            {/* Existing Brokers List */}
            {existingBrokers
              .filter(b => b.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[styles.tickerItem, { borderBottomColor: currColors.border }]}
                  onPress={() => {
                    setBroker(b);
                    setShowBrokerModal(false);
                  }}
                >
                  <Text style={[styles.tickerSymbol, { color: currColors.text }]}>{b}</Text>
                  {broker === b && <Check size={16} color={currColors.tint} />}
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  saveButton: {
    paddingVertical: 8,
    paddingLeft: 16,
  },
  headerButtonText: {
    color: '#007AFF',
    fontSize: 17,
  },
  saveButtonText: {
    fontWeight: '600',
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 40,
  },
  typeSelectorContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    padding: 2,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  typeOptionActive: {
    backgroundColor: '#30D158', // iOS Green
  },
  typeOptionActiveSell: {
    backgroundColor: '#FF453A', // iOS Red
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  typeTextActive: {
    color: '#000', // Black text on colored background
  },
  groupLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  formGroup: {
    backgroundColor: '#1C1C1E',
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
    borderBottomColor: '#2C2C2E',
    minHeight: 48,
  },
  formRowFirst: {
    // Top border radius handled by group
  },
  formRowLast: {
    borderBottomWidth: 0,
  },
  companyInfoRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2C2C2E',
  },
  label: {
    fontSize: 16,
    color: '#FFF',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 16,
    color: '#FFF',
  },
  placeholderText: {
    color: '#8E8E93',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFF',
    padding: 0,
  },
  currencyPrefix: {
    fontSize: 16,
    color: '#FFF',
    marginRight: 2,
  },
  companyName: {
    fontSize: 13,
    color: '#8E8E93',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  searchBarContainer: {
    margin: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: '#FFF',
    fontSize: 16,
  },
  tickerList: {
    paddingBottom: 40,
  },
  tickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2C2C2E',
  },
  tickerSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  companyNameList: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  tickerPrice: {
    fontSize: 14,
    color: '#FFF',
  },
});
