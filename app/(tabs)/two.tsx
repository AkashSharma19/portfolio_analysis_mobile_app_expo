import { Text, View } from '@/components/Themed';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { format } from 'date-fns';
import React from 'react';
import { FlatList, StyleSheet } from 'react-native';

export default function HistoryScreen() {
  const transactions = usePortfolioStore((state) => state.transactions);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.transactionItem}>
      <View style={styles.leftCol}>
        <Text style={styles.symbol}>{item.symbol}</Text>
        <Text style={styles.date}>{format(new Date(item.date), 'MMM dd, yyyy')}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.broker}>{item.broker || 'No Broker'}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.currency}>{item.currency || 'INR'}</Text>
        </View>
      </View>
      <View style={styles.rightCol}>
        <Text style={[styles.type, item.type === 'BUY' ? styles.buy : styles.sell]}>
          {item.type}
        </Text>
        <Text style={styles.amount}>
          {item.quantity} @ {item.currency === 'USD' ? '$' : '₹'}{item.price.toFixed(2)}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No transactions yet.</Text>
        </View>
      ) : (
        <FlatList
          data={[...transactions].reverse()}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  listContent: {
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    backgroundColor: 'transparent',
  },
  leftCol: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  rightCol: {
    alignItems: 'flex-end',
    backgroundColor: 'transparent',
  },
  symbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  date: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: 'transparent',
  },
  broker: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  dot: {
    fontSize: 12,
    color: '#444',
    marginHorizontal: 6,
  },
  currency: {
    fontSize: 12,
    color: '#8E8E93',
  },
  type: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  buy: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    color: '#4CAF50',
  },
  sell: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    color: '#F44336',
  },
  amount: {
    fontSize: 14,
    color: '#FFF',
    marginTop: 6,
  },
});
