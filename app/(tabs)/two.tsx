import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Transaction } from '@/types';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, Edit2, Filter, Search, Trash2 } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { RectButton, Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HistoryScreen() {
  const router = useRouter();
  const { transactions, tickers, removeTransaction, isPrivacyMode } = usePortfolioStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'company' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterBroker, setFilterBroker] = useState<string | null>(null);
  const [filterAssetType, setFilterAssetType] = useState<string | null>(null);
  const [filterSector, setFilterSector] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const tickerMap = useMemo(() => {
    return new Map(tickers.map(t => [t.Tickers.toUpperCase(), t]));
  }, [tickers]);

  const filteredAndSortedTransactions = useMemo(() => {
    let result = [...transactions];

    if (searchQuery) {
      result = result.filter(t => t.symbol.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (filterType) {
      result = result.filter(t => t.type === filterType);
    }

    if (filterBroker) {
      result = result.filter(t => t.broker === filterBroker);
    }

    if (filterAssetType) {
      result = result.filter(t => {
        const ticker = tickerMap.get(t.symbol.toUpperCase());
        return ticker && ticker['Asset Type'] === filterAssetType;
      });
    }

    if (filterSector) {
      result = result.filter(t => {
        const ticker = tickerMap.get(t.symbol.toUpperCase());
        return ticker && ticker['Sector'] === filterSector;
      });
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === 'company') {
        const companyA = tickerMap.get(a.symbol.toUpperCase())?.['Company Name'] || a.symbol;
        const companyB = tickerMap.get(b.symbol.toUpperCase())?.['Company Name'] || b.symbol;
        comparison = companyA.localeCompare(companyB);
      } else if (sortBy === 'amount') {
        comparison = (a.quantity * a.price) - (b.quantity * b.price);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [transactions, searchQuery, sortBy, sortOrder, filterType, filterBroker, filterAssetType, filterSector, tickerMap]);

  const uniqueBrokers = useMemo(() => {
    const brokers = new Set(transactions.map(t => t.broker).filter(Boolean));
    return Array.from(brokers);
  }, [transactions]);

  const uniqueAssetTypes = useMemo(() => {
    const assetTypes = new Set<string>(tickers.map(t => t['Asset Type']).filter((t): t is string => !!t));
    return Array.from(assetTypes);
  }, [tickers]);

  const uniqueSectors = useMemo(() => {
    const sectors = new Set<string>(tickers.map(t => t['Sector']).filter((t): t is string => !!t));
    return Array.from(sectors);
  }, [tickers]);

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
            <Search size={18} color="#8E8E93" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search symbol..."
              placeholderTextColor="#8E8E93"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={styles.filterToggle}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} color={showFilters ? '#007AFF' : '#FFF'} />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.filtersContainer}>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Sort by:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
                {(['date', 'company', 'amount'] as const).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.filterChip, sortBy === s && styles.filterChipActive]}
                    onPress={() => {
                      if (sortBy === s) {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy(s);
                        setSortOrder('desc');
                      }
                    }}
                  >
                    <Text style={[styles.filterChipText, sortBy === s && styles.filterChipTextActive]}>
                      {s.charAt(0).toUpperCase() + s.slice(1)} {sortBy === s && (sortOrder === 'asc' ? '↑' : '↓')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Type:</Text>
              <View style={styles.chipRow}>
                {[null, 'BUY', 'SELL'].map((t) => (
                  <TouchableOpacity
                    key={t || 'all'}
                    style={[styles.filterChip, filterType === t && styles.filterChipActive]}
                    onPress={() => setFilterType(t)}
                  >
                    <Text style={[styles.filterChipText, filterType === t && styles.filterChipTextActive]}>
                      {t || 'All'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {uniqueAssetTypes.length > 0 && (
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Asset Type:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
                  <TouchableOpacity
                    style={[styles.filterChip, filterAssetType === null && styles.filterChipActive]}
                    onPress={() => setFilterAssetType(null)}
                  >
                    <Text style={[styles.filterChipText, filterAssetType === null && styles.filterChipTextActive]}>
                      All
                    </Text>
                  </TouchableOpacity>
                  {uniqueAssetTypes.map((at) => (
                    <TouchableOpacity
                      key={at}
                      style={[styles.filterChip, filterAssetType === at && styles.filterChipActive]}
                      onPress={() => setFilterAssetType(at)}
                    >
                      <Text style={[styles.filterChipText, filterAssetType === at && styles.filterChipTextActive]}>
                        {at}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {uniqueSectors.length > 0 && (
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Sector:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
                  <TouchableOpacity
                    style={[styles.filterChip, filterSector === null && styles.filterChipActive]}
                    onPress={() => setFilterSector(null)}
                  >
                    <Text style={[styles.filterChipText, filterSector === null && styles.filterChipTextActive]}>
                      All
                    </Text>
                  </TouchableOpacity>
                  {uniqueSectors.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.filterChip, filterSector === s && styles.filterChipActive]}
                      onPress={() => setFilterSector(s)}
                    >
                      <Text style={[styles.filterChipText, filterSector === s && styles.filterChipTextActive]}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {uniqueBrokers.length > 0 && (
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Broker:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
                  <TouchableOpacity
                    style={[styles.filterChip, filterBroker === null && styles.filterChipActive]}
                    onPress={() => setFilterBroker(null)}
                  >
                    <Text style={[styles.filterChipText, filterBroker === null && styles.filterChipTextActive]}>
                      All
                    </Text>
                  </TouchableOpacity>
                  {uniqueBrokers.map((b) => (
                    <TouchableOpacity
                      key={b}
                      style={[styles.filterChip, filterBroker === b && styles.filterChipActive]}
                      onPress={() => setFilterBroker(b)}
                    >
                      <Text style={[styles.filterChipText, filterBroker === b && styles.filterChipTextActive]}>
                        {b}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 36,
    color: '#FFF',
    fontSize: 14,
  },
  filterToggle: {
    padding: 8,
  },
  filtersContainer: {
    backgroundColor: '#1C1C1E',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  filterRow: {
    paddingHorizontal: 16,
    marginTop: 12,
    backgroundColor: 'transparent',
  },
  filterLabel: {
    color: '#8E8E93',
    fontSize: 11,
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: 'transparent',
  },
  filterChip: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    color: '#FFF',
    fontSize: 12,
  },
  filterChipTextActive: {
    fontWeight: '600',
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
