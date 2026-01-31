import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Transaction } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, Edit2, Trash2 } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { RectButton, Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HistoryScreen() {
  const router = useRouter();
  const { transactions, tickers, removeTransaction, isPrivacyMode } = usePortfolioStore();

  const [searchQuery, setSearchQuery] = useState('');

  const tickerMap = useMemo(() => {
    return new Map(tickers.map(t => [t.Tickers.toUpperCase(), t]));
  }, [tickers]);

  const filteredAndSortedTransactions = useMemo(() => {
    let result = [...transactions];

    if (searchQuery) {
      result = result.filter(t => t.symbol.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // Default sort by date descending
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return result;
  }, [transactions, searchQuery]);


  const renderRightActions = (id: string) => {
    return (
      <View style={styles.rightActions}>
        <RectButton
          style={[styles.actionButton, styles.editButton]}
          onPress={() => router.push({ pathname: '/add-transaction', params: { id } })}
        >
          <Edit2 size={20} color="#FFF" />
          <Text style={styles.actionText}>Edit</Text>
        </RectButton>
        <RectButton
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => removeTransaction(id)}
        >
          <Trash2 size={20} color="#FFF" />
          <Text style={styles.actionText}>Delete</Text>
        </RectButton>
      </View>
    );
  };

  const renderItem = ({ item }: { item: Transaction }) => {
    const isBuy = item.type === 'BUY';
    const totalValue = item.quantity * item.price;
    const ticker = tickerMap.get(item.symbol.toUpperCase());
    const displayName = ticker?.['Company Name'] || item.symbol;

    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item.id)}
        friction={2}
        rightThreshold={40}
      >
        <View style={styles.transactionItem}>
          <View style={[styles.iconContainer, { backgroundColor: isBuy ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 59, 48, 0.15)' }]}>
            {isBuy ? (
              <ArrowUpRight size={20} color="#34C759" />
            ) : (
              <ArrowDownLeft size={20} color="#FF3B30" />
            )}
          </View>

          <View style={styles.infoCol}>
            <Text style={styles.symbol} numberOfLines={2} ellipsizeMode="tail">{displayName}</Text>
            <View style={styles.dateRow}>
              <Text style={styles.date}>{format(new Date(item.date), 'MMM dd')}</Text>
              {item.broker && (
                <>
                  <Text style={styles.dot}>•</Text>
                  <Text style={styles.broker}>{item.broker}</Text>
                </>
              )}
            </View>
          </View>

          <View style={styles.rightCol}>
            <Text style={[styles.amountValue, { color: isBuy ? '#FFF' : '#FFF' }]}>
              {isPrivacyMode ? '****' : `${item.currency === 'USD' ? '$' : '₹'}${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </Text>
            <Text style={styles.quantityDetails}>
              {item.quantity} @ {isPrivacyMode ? '****' : item.price.toLocaleString()}
            </Text>
          </View>
        </View>
      </Swipeable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search companies or tickers"
              placeholderTextColor="#8E8E93"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={18} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>
        </View>


        {filteredAndSortedTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No transactions found.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredAndSortedTransactions}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          />
        )}
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },
  listContent: {
    padding: 0,
    paddingBottom: 40,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
    backgroundColor: '#000',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  rightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  symbol: {
    fontSize: 14,
    color: '#FFF',
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    fontSize: 11,
    color: '#8E8E93',
  },
  broker: {
    fontSize: 11,
    color: '#8E8E93',
  },
  dot: {
    fontSize: 11,
    color: '#444',
    marginHorizontal: 6,
  },
  amountValue: {
    fontSize: 14,
    marginBottom: 4,
  },
  quantityDetails: {
    fontSize: 11,
    color: '#8E8E93',
  },
  rightActions: {
    flexDirection: 'row',
    width: 140,
  },
  actionButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  actionText: {
    color: '#FFF',
    fontSize: 11,
    marginTop: 4,
  },
});
