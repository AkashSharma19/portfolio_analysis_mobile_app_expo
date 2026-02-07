import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
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

  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');

  const tickerMap = useMemo(() => {
    return new Map(tickers.map(t => [t.Tickers.toUpperCase(), t]));
  }, [tickers]);

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions]);

  const filteredAndSortedTransactions = useMemo(() => {
    let result = sortedTransactions;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => t.symbol.toLowerCase().includes(query));
    }

    if (filterType !== 'ALL') {
      result = result.filter(t => t.type === filterType);
    }

    return result;
  }, [sortedTransactions, searchQuery, filterType]);


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
        <View style={[styles.transactionItem, { backgroundColor: currColors.background, borderBottomColor: currColors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: isBuy ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 59, 48, 0.15)' }]}>
            {isBuy ? (
              <ArrowUpRight size={20} color="#34C759" />
            ) : (
              <ArrowDownLeft size={20} color="#FF3B30" />
            )}
          </View>

          <View style={styles.infoCol}>
            <Text style={[styles.symbol, { color: currColors.text }]} numberOfLines={2} ellipsizeMode="tail">{displayName}</Text>
            <View style={styles.dateRow}>
              <Text style={[styles.date, { color: currColors.textSecondary }]}>{format(new Date(item.date), 'MMM dd')}</Text>
              {item.broker && (
                <>
                  <Text style={[styles.dot, { color: currColors.border }]}>•</Text>
                  <Text style={[styles.broker, { color: currColors.textSecondary }]}>{item.broker}</Text>
                </>
              )}
            </View>
          </View>

          <View style={styles.rightCol}>
            <Text style={[styles.amountValue, { color: currColors.text }]}>
              {isPrivacyMode ? '****' : `${item.currency === 'USD' ? '$' : '₹'}${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </Text>
            <Text style={[styles.quantityDetails, { color: currColors.textSecondary }]}>
              {item.quantity} @ {isPrivacyMode ? '****' : item.price.toLocaleString()}
            </Text>
          </View>
        </View>
      </Swipeable>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: currColors.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.container, { backgroundColor: currColors.background }]}>
        <View style={[styles.header, { backgroundColor: currColors.background }]}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={[styles.searchContainer, { backgroundColor: currColors.card }]}>
              <Ionicons name="search" size={20} color={currColors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: currColors.text }]}
                placeholder="Search companies or tickers"
                placeholderTextColor={currColors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={18} color={currColors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.filterToggle, { backgroundColor: currColors.card }]}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Ionicons name="filter" size={20} color={showFilters ? currColors.tint : currColors.text} />
            </TouchableOpacity>
          </View>

          {showFilters && (
            <View style={styles.filtersContainer}>
              <View style={styles.filterRow}>
                <Text style={[styles.filterLabel, { color: currColors.textSecondary }]}>Transaction Type</Text>
                <View style={{ flexDirection: 'row' }}>
                  {(['ALL', 'BUY', 'SELL'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.filterChip,
                        { backgroundColor: currColors.card, borderColor: currColors.border },
                        filterType === type && styles.filterChipActive
                      ]}
                      onPress={() => setFilterType(type)}
                    >
                      <Text style={[
                        styles.filterChipText,
                        { color: currColors.textSecondary },
                        filterType === type && styles.filterChipTextActive
                      ]}>
                        {type === 'ALL' ? 'All' : type === 'BUY' ? 'Buy' : 'Sell'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

        </View>


        {filteredAndSortedTransactions.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: currColors.background }]}>
            <Text style={[styles.emptyText, { color: currColors.textSecondary }]}>No transactions found.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredAndSortedTransactions}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 15,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
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
  filterToggle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    marginTop: 15,
    paddingBottom: 5,
  },
  filterRow: {
    marginBottom: 8,
  },
  filterLabel: {
    color: '#8E8E93',
    fontSize: 11,
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#0A84FF',
  },
  filterChipText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '400',
  },
  filterChipTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
});
