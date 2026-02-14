import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Ticker, Transaction } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, Edit2, Trash2 } from 'lucide-react-native';
import React, { memo, useMemo, useState } from 'react';
import { Image, ScrollView, SectionList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { RectButton, Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

// STANDALONE COMPONENTS FOR PERFORMANCE
const TransactionIcon = memo(({ ticker, isBuy, symbol, currColors }: { ticker?: Ticker, isBuy: boolean, symbol: string, currColors: any }) => {
  const symbolLetter = ticker?.['Company Name']?.[0]?.toUpperCase() || symbol[0]?.toUpperCase() || '?';

  return (
    <View style={[styles.assetIcon, { backgroundColor: currColors.card }]}>
      {ticker?.Logo ? (
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 2 }}>
          <Image
            source={{ uri: ticker.Logo }}
            style={{ width: 40, height: 40, borderRadius: 10 }}
            resizeMode="contain"
          />
        </View>
      ) : (
        <Text style={[styles.iconLetter, { color: currColors.text }]}>
          {symbolLetter}
        </Text>
      )}
      <View style={[styles.badgeContainer, { backgroundColor: isBuy ? '#34C759' : '#FF3B30' }]}>
        {isBuy ? (
          <ArrowDownLeft size={8} color="#FFF" strokeWidth={3} />
        ) : (
          <ArrowUpRight size={8} color="#FFF" strokeWidth={3} />
        )}
      </View>
    </View>
  );
});

const TransactionItem = memo(({
  item,
  ticker,
  onEdit,
  onDelete,
  isPrivacyMode,
  showCurrencySymbol,
  currColors
}: {
  item: Transaction,
  ticker?: Ticker,
  onEdit: (id: string) => void,
  onDelete: (id: string) => void,
  isPrivacyMode: boolean,
  showCurrencySymbol: boolean,
  currColors: any
}) => {
  const isBuy = item.type === 'BUY';
  const totalValue = item.quantity * item.price;
  const displayName = ticker?.['Company Name'] || item.symbol;

  const renderRightActions = () => (
    <View style={styles.rightActions}>
      <RectButton
        style={[styles.actionButton, styles.editButton]}
        onPress={() => onEdit(item.id)}
      >
        <Edit2 size={20} color="#FFF" />
        <Text style={styles.actionText}>Edit</Text>
      </RectButton>
      <RectButton
        style={[styles.actionButton, styles.deleteButton]}
        onPress={() => onDelete(item.id)}
      >
        <Trash2 size={20} color="#FFF" />
        <Text style={styles.actionText}>Delete</Text>
      </RectButton>
    </View>
  );

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      friction={1}
      rightThreshold={30}
      overshootRight={false}
    >
      <View style={[styles.transactionItem, { borderBottomColor: currColors.border, backgroundColor: currColors.background }]}>
        <TransactionIcon ticker={ticker} isBuy={isBuy} symbol={item.symbol} currColors={currColors} />

        <View style={styles.infoCol}>
          <Text style={[styles.symbolText, { color: currColors.text }]} numberOfLines={1} ellipsizeMode="tail">
            {displayName}
          </Text>
          <Text style={[styles.dateText, { color: currColors.textSecondary }]}>{format(parseISO(item.date), 'MMM dd')}</Text>
        </View>

        <View style={styles.rightCol}>
          <Text style={[styles.amountText, { color: currColors.text }]}>
            {isPrivacyMode ? '****' : `${item.currency === 'USD' ? '$' : (showCurrencySymbol ? '₹' : '')}${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </Text>
          <Text style={[styles.quantityText, { color: currColors.textSecondary }]}>
            {item.quantity} {item.symbol.length > 4 ? 'units' : 'shares'}
          </Text>
        </View>
      </View>
    </Swipeable>
  );
});

export default function HistoryScreen() {
  const router = useRouter();
  const { transactions, tickers, removeTransaction, isPrivacyMode, showCurrencySymbol, getAllocationData } = usePortfolioStore();

  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const tickerMap = useMemo(() => {
    return new Map(tickers.map(t => [t.Tickers.toUpperCase(), t]));
  }, [tickers]);

  const categories = useMemo(() => {
    // Allocation Data is already sorted by value in the store
    const allocation = getAllocationData('Asset Type');
    return ['All', ...allocation.map(a => a.name)];
  }, [getAllocationData, transactions, tickers]);

  const filteredTransactions = useMemo(() => {
    let result = [...transactions].sort((a, b) => b.date.localeCompare(a.date));

    // Category Filter
    if (activeCategory !== 'All') {
      result = result.filter(t => {
        const ticker = tickerMap.get(t.symbol.toUpperCase());
        return ticker?.['Asset Type'] === activeCategory;
      });
    }

    // Search Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => {
        const ticker = tickerMap.get(t.symbol.toUpperCase());
        const companyName = ticker?.['Company Name'] || t.symbol;
        return (
          companyName.toLowerCase().includes(query) ||
          t.symbol.toLowerCase().includes(query)
        );
      });
    }

    return result;
  }, [transactions, activeCategory, searchQuery, tickerMap]);

  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};

    filteredTransactions.forEach(t => {
      const date = parseISO(t.date);
      const monthYear = format(date, 'MMMM yyyy');
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(t);
    });

    return Object.keys(groups).map(monthYear => ({
      title: monthYear,
      data: groups[monthYear],
    }));
  }, [filteredTransactions]);

  const handleEdit = (id: string) => {
    router.push({ pathname: '/add-transaction', params: { id } });
  };

  const handleRemove = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    removeTransaction(id);
  };

  const renderItem = ({ item }: { item: Transaction }) => {
    return (
      <TransactionItem
        item={item}
        ticker={tickerMap.get(item.symbol.toUpperCase())}
        onEdit={handleEdit}
        onDelete={handleRemove}
        isPrivacyMode={isPrivacyMode}
        showCurrencySymbol={showCurrencySymbol}
        currColors={currColors}
      />
    );
  };

  const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => (
    <View style={[styles.sectionHeader, { backgroundColor: currColors.background }]}>
      <Text style={[styles.sectionTitle, { color: currColors.text }]}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: currColors.background }]} edges={['top', 'left', 'right']}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchContainerOuter}>
          <View style={[styles.searchContainer, { backgroundColor: currColors.card }]}>
            <Ionicons name="search" size={20} color={currColors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: currColors.text }]}
              placeholder="Search companies or symbols"
              placeholderTextColor={currColors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={18} color={currColors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll} bounces={false}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveCategory(category);
              }}
              style={styles.tabItem}
            >
              <Text style={[
                styles.tabText,
                { color: activeCategory === category ? currColors.text : currColors.textSecondary },
                activeCategory === category && styles.activeTabText
              ]}>
                {category}
              </Text>
              {activeCategory === category && <View style={[styles.activeIndicator, { backgroundColor: currColors.text }]} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.container}>
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: currColors.textSecondary }]}>No transactions found.</Text>
          </View>
        ) : (
          <SectionList
            sections={groupedTransactions}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={styles.listContent}
            stickySectionHeadersEnabled={false}
            showsVerticalScrollIndicator={false}
            bounces={false}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={true}
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
    paddingTop: 16,
    paddingBottom: 15,
  },
  searchContainerOuter: {
    paddingHorizontal: 16,
  },
  searchContainer: {
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
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '400',
  },
  tabsContainer: {
    marginBottom: 10,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    gap: 24,
    paddingBottom: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '400',
  },
  activeTabText: {
    fontWeight: '400',
  },
  activeIndicator: {
    height: 2,
    width: '100%',
    position: 'absolute',
    bottom: -8,
    borderRadius: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '400',
  },
  listContent: {
    paddingBottom: 40,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  assetIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    position: 'relative',
  },
  iconLetter: {
    fontSize: 18,
    fontWeight: '400',
  },
  badgeContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  infoCol: {
    flex: 1,
  },
  symbolText: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 12,
  },
  rightCol: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  amountText: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 2,
  },
  quantityText: {
    fontSize: 12,
  },
  rightActions: {
    flexDirection: 'row',
    width: 140,
    height: '100%',
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
