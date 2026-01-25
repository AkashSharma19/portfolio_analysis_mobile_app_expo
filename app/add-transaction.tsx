import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Ticker, TransactionType } from '@/types';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Calendar, Check, ChevronDown, PlusCircle, Save } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddTransactionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addTransaction, updateTransaction, transactions, tickers, fetchTickers } = usePortfolioStore();

  const editingTransaction = useMemo(() =>
    id ? transactions.find(t => t.id === id) : null,
    [id, transactions]);

  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [type, setType] = useState<TransactionType>('BUY');
  const [date, setDate] = useState(new Date());
  const [currency, setCurrency] = useState('INR');
  const [broker, setBroker] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showBrokerSuggestions, setShowBrokerSuggestions] = useState(false);
  const [showSymbolModal, setShowSymbolModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredBrokers = useMemo(() => {
    if (!broker) return [];
    return existingBrokers.filter((b) =>
      b.toLowerCase().includes(broker.toLowerCase()) && b.toLowerCase() !== broker.toLowerCase()
    );
  }, [broker, existingBrokers]);

  const handleSave = () => {
    if (!symbol || !quantity || !price) return;

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
    setPrice(item['Current Value'].toString());
    setShowSymbolModal(false);
    setSearchQuery('');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{editingTransaction ? 'Edit Transaction' : 'Add Transaction'}</Text>

          <View style={styles.typeSelector}>
            <Pressable
              style={[styles.typeButton, type === 'BUY' && styles.typeButtonActive]}
              onPress={() => setType('BUY')}
            >
              <Text style={[styles.typeButtonText, type === 'BUY' && styles.typeButtonTextActive]}>BUY</Text>
            </Pressable>
            <Pressable
              style={[styles.typeButton, type === 'SELL' && styles.typeButtonActive]}
              onPress={() => setType('SELL')}
            >
              <Text style={[styles.typeButtonText, type === 'SELL' && styles.typeButtonTextActive]}>SELL</Text>
            </Pressable>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Symbol</Text>
            <Pressable
              style={styles.dropdownTrigger}
              onPress={() => setShowSymbolModal(true)}
            >
              <View style={{ backgroundColor: 'transparent', flex: 1 }}>
                <Text style={[styles.dropdownValue, !symbol && styles.placeholder]}>
                  {symbol || 'Select Symbol from Ticker Sheet'}
                </Text>
                {selectedTicker?.['Company Name'] && (
                  <Text style={styles.dropdownSubtitle}>{selectedTicker['Company Name']}</Text>
                )}
              </View>
              <ChevronDown size={20} color="#666" />
            </Pressable>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Quantity</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#666"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Price</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#666"
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Currency</Text>
              <TextInput
                style={styles.input}
                placeholder="INR"
                placeholderTextColor="#666"
                value={currency}
                onChangeText={setCurrency}
                autoCapitalize="characters"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Date</Text>
              <Pressable style={styles.dateSelector} onPress={() => setShowDatePicker(true)}>
                <Calendar size={18} color="#999" style={{ marginRight: 8 }} />
                <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
              </Pressable>
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Broker</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Zerodha, Robinhood"
              placeholderTextColor="#666"
              value={broker}
              onChangeText={(text) => {
                setBroker(text);
                setShowBrokerSuggestions(true);
              }}
              onFocus={() => setShowBrokerSuggestions(true)}
            />
            {showBrokerSuggestions && filteredBrokers.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {filteredBrokers.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.suggestionItem}
                    onPress={() => {
                      setBroker(item);
                      setShowBrokerSuggestions(false);
                    }}
                  >
                    <Text style={styles.suggestionText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <Pressable style={styles.saveButton} onPress={handleSave}>
            {editingTransaction ? <Save color="#fff" size={20} /> : <PlusCircle color="#fff" size={20} />}
            <Text style={styles.saveButtonText}>{editingTransaction ? 'Update Transaction' : 'Add to Portfolio'}</Text>
          </Pressable>
        </ScrollView>

        {/* Symbol Selection Modal */}
        <Modal
          visible={showSymbolModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowSymbolModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Ticker</Text>
              <TouchableOpacity onPress={() => setShowSymbolModal(false)}>
                <Text style={styles.closeButton}>Close</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalSearch}
              placeholder="Search symbol or company..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />

            <FlatList
              data={filteredTickers}
              keyExtractor={(item) => item.Tickers}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.tickerItem}
                  onPress={() => selectTicker(item)}
                >
                  <View style={{ backgroundColor: 'transparent', flex: 1 }}>
                    <Text style={styles.tickerSymbol}>{item.Tickers}</Text>
                    <Text style={styles.companyName}>{item['Company Name']}</Text>
                  </View>
                  <View style={{ backgroundColor: 'transparent', alignItems: 'flex-end', flexDirection: 'row' }}>
                    <Text style={styles.tickerPrice}>₹{item['Current Value']}</Text>
                    {symbol === item.Tickers && <Check size={18} color="#007AFF" style={{ marginLeft: 8 }} />}
                  </View>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.tickerList}
            />
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
  },
  typeButtonText: {
    fontWeight: '600',
    color: '#999',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  inputGroup: {
    marginBottom: 20,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  label: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1c1c1e',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  dropdownTrigger: {
    backgroundColor: '#1c1c1e',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    minHeight: 56,
  },
  dropdownValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dropdownSubtitle: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 2,
  },
  placeholder: {
    color: '#666',
    fontWeight: '400',
  },
  dateSelector: {
    backgroundColor: '#1c1c1e',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  dateText: {
    color: '#fff',
    fontSize: 16,
  },
  suggestionsContainer: {
    backgroundColor: '#1c1c1e',
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#333',
    maxHeight: 150,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2e',
  },
  suggestionText: {
    color: '#fff',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#1c1c1e',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: 'transparent',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    color: '#007AFF',
    fontSize: 16,
  },
  modalSearch: {
    backgroundColor: '#2c2c2e',
    color: '#fff',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    fontSize: 16,
  },
  tickerList: {
    paddingHorizontal: 16,
  },
  tickerItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  tickerSymbol: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  companyName: {
    color: '#8E8E93',
    fontSize: 14,
    marginTop: 2,
  },
  tickerPrice: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 10,
    gap: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
