import { BackButton } from '@/components/BackButton';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { searchMasterStocks } from '@/constants/NSE_COMPANIES';
import { getCompanyLogoUrl, searchYahooTickers, fetchYahooQuote } from '@/services/yahooFinanceService';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Ticker } from '@/types';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  FileSpreadsheet,
  Globe,
  RefreshCw,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
  X,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TickerMappingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const {
    transactions,
    tickers,
    getTickerSource,
    remapCompanySymbol,
    showCurrencySymbol,
    fetchTickers,
  } = usePortfolioStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyForRemap, setSelectedCompanyForRemap] = useState<{
    symbol: string;
    companyName: string;
    source: 'yahoo' | 'sheet';
    txCount: number;
    holdingQty: number;
    currentPrice: number;
    logo?: string;
  } | null>(null);

  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [suggestedMatch, setSuggestedMatch] = useState<Ticker | null>(null);
  const [loadingSuggested, setLoadingSuggested] = useState(false);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineResults, setOnlineResults] = useState<Ticker[]>([]);
  const [isRemapping, setIsRemapping] = useState(false);

  const [modalMode, setModalMode] = useState<'yahoo' | 'sheet'>('yahoo');
  const [suggestedSheetMatch, setSuggestedSheetMatch] = useState<Ticker | null>(null);
  const [customSheetSymbol, setCustomSheetSymbol] = useState('');
  const [customSheetName, setCustomSheetName] = useState('');
  const [customSheetPrice, setCustomSheetPrice] = useState('');
  const [customSheetSector, setCustomSheetSector] = useState('General');
  const [customSheetAssetType, setCustomSheetAssetType] = useState('Equity');

  // Open modal with instant auto-search & suggested live match
  const openRemapModal = async (company: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCompanyForRemap(company);

    // If already Yahoo, default tab to Google Sheet or Yahoo depending on what's natural; default to opposite source for 1-tap switch
    const initialMode: 'yahoo' | 'sheet' = company.source === 'yahoo' ? 'sheet' : 'yahoo';
    setModalMode(initialMode);

    const cleanSym = (company.symbol || '')
      .replace(/^(NSE|BOM|BSE|NASDAQ|NYSE|INDEX|INDEXNSE|INDEXBOM|INDEXSP|MUTF_IN|MUTF):/i, '')
      .replace(/\.(NS|BO)$/i, '')
      .trim();
    const query = cleanSym || company.companyName || company.symbol;
    setModalSearchQuery(query);

    const cleanSymUpper = cleanSym.toUpperCase();
    const queryLower = (query || '').toLowerCase();
    const companyNameLower = (company.companyName || '').toLowerCase();

    // 1. Find the real matching Google Sheet ticker from the user's Google Sheet database (tickers store)
    const existingSheetTicker = tickers.find((t) => {
      const symUpper = (t.Tickers || '').trim().toUpperCase();
      const rawSym = symUpper.replace(/^(NSE|BOM|BSE|NASDAQ|NYSE|INDEX|INDEXNSE|INDEXBOM|INDEXSP|MUTF_IN|MUTF):/i, '');
      return (
        symUpper === company.symbol.toUpperCase() ||
        symUpper === cleanSymUpper ||
        rawSym === cleanSymUpper ||
        symUpper === `NASDAQ:${cleanSymUpper}` ||
        symUpper === `NYSE:${cleanSymUpper}` ||
        symUpper === `NSE:${cleanSymUpper}` ||
        symUpper === `BOM:${cleanSymUpper}`
      );
    }) || tickers.find((t) => {
      const nameLower = (t['Company Name'] || '').toLowerCase();
      return (
        (companyNameLower && nameLower === companyNameLower) ||
        (queryLower && nameLower.includes(queryLower)) ||
        (queryLower && t.Tickers.toLowerCase().includes(queryLower))
      );
    });

    const master = searchMasterStocks(cleanSym || query, 5);
    const topCandidate = master[0];

    const targetSheetTicker = existingSheetTicker?.Tickers || (cleanSym ? `NASDAQ:${cleanSym}` : `NSE:${cleanSym}`);
    const targetSheetName = existingSheetTicker?.['Company Name'] || topCandidate?.name || company.companyName || cleanSym;
    const targetSheetPrice = existingSheetTicker?.['Current Value'] || company.currentPrice || 0;
    const targetSheetSector = existingSheetTicker?.Sector || topCandidate?.sector || company.sector || 'General';
    const targetSheetAssetType = existingSheetTicker?.['Asset Type'] || company.assetType || 'Equity';

    setCustomSheetSymbol(targetSheetTicker);
    setCustomSheetName(targetSheetName);
    setCustomSheetPrice(targetSheetPrice > 0 ? String(targetSheetPrice) : '');
    setCustomSheetSector(targetSheetSector);
    setCustomSheetAssetType(targetSheetAssetType);

    setSuggestedSheetMatch({
      Tickers: targetSheetTicker,
      'Company Name': targetSheetName,
      'Current Value': targetSheetPrice,
      'Asset Type': targetSheetAssetType,
      Sector: targetSheetSector,
      Logo: existingSheetTicker?.Logo || getCompanyLogoUrl(cleanSym, targetSheetName),
      source: 'sheet',
    });

    setSuggestedMatch(null);
    setLoadingSuggested(true);

    // Look for top match from master list for Yahoo
    const targetSym = topCandidate ? topCandidate.symbol : (cleanSym.endsWith('.NS') ? cleanSym : `${cleanSym}.NS`);

    try {
      const liveYahoo = await fetchYahooQuote(targetSym);
      if (liveYahoo) {
        setSuggestedMatch(liveYahoo);
      } else if (topCandidate) {
        setSuggestedMatch({
          Tickers: topCandidate.symbol,
          'Company Name': topCandidate.name,
          'Current Value': 0,
          'Asset Type': 'Equity',
          Sector: topCandidate.sector || 'General',
          Logo: getCompanyLogoUrl(topCandidate.symbol, topCandidate.name),
          'Yesterday Close': 0,
        });
      }
    } catch (err) {
      console.warn('Failed to fetch suggested match:', err);
    } finally {
      setLoadingSuggested(false);
    }
  };

  // Group transactions into distinct companies
  const companyList = useMemo(() => {
    const map = new Map<
      string,
      {
        symbol: string;
        companyName: string;
        source: 'yahoo' | 'sheet';
        txCount: number;
        buyQty: number;
        sellQty: number;
        currentPrice: number;
        logo?: string;
        assetType?: string;
        sector?: string;
      }
    >();

    transactions.forEach((tx) => {
      const sym = (tx.symbol || '').trim().toUpperCase();
      if (!sym) return;

      const existing = map.get(sym);
      const tickerInfo = tickers.find((t) => t.Tickers.trim().toUpperCase() === sym);
      const source = getTickerSource(sym);
      const companyName = tickerInfo?.['Company Name'] || sym;
      const currentPrice = tickerInfo?.['Current Value'] || 0;
      const logo = tickerInfo?.Logo || getCompanyLogoUrl(sym, companyName);
      const assetType = tickerInfo?.['Asset Type'] || 'Equity';
      const sector = tickerInfo?.Sector || 'General';

      if (existing) {
        existing.txCount += 1;
        if (tx.type === 'BUY') existing.buyQty += tx.quantity;
        else existing.sellQty += tx.quantity;
      } else {
        map.set(sym, {
          symbol: sym,
          companyName,
          source,
          txCount: 1,
          buyQty: tx.type === 'BUY' ? tx.quantity : 0,
          sellQty: tx.type === 'SELL' ? tx.quantity : 0,
          currentPrice,
          logo,
          assetType,
          sector,
        });
      }
    });

    return Array.from(map.values()).map((c) => ({
      ...c,
      holdingQty: Math.max(0, c.buyQty - c.sellQty),
    }));
  }, [transactions, tickers, getTickerSource]);

  // Summary counts
  const yahooCount = useMemo(
    () => companyList.filter((c) => c.source === 'yahoo').length,
    [companyList]
  );
  const sheetCount = useMemo(
    () => companyList.filter((c) => c.source === 'sheet').length,
    [companyList]
  );

  // Filtered list for search
  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companyList;
    const q = searchQuery.trim().toLowerCase();
    return companyList.filter(
      (c) =>
        c.symbol.toLowerCase().includes(q) ||
        c.companyName.toLowerCase().includes(q)
    );
  }, [companyList, searchQuery]);

  // Debounced search for the replacement ticker modal
  useEffect(() => {
    if (!modalSearchQuery || modalSearchQuery.trim().length < 2) {
      setOnlineResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setIsSearchingOnline(true);
        const res = await searchYahooTickers(modalSearchQuery);
        setOnlineResults(res);
      } catch (e) {
      } finally {
        setIsSearchingOnline(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [modalSearchQuery]);

  // Modal filtered replacement candidates for Yahoo
  const modalCandidates = useMemo(() => {
    // 1. Only include authentic Yahoo format tickers from local tickers (exclude sheet tickers with colons or sheet source)
    const yahooLocalTickers = tickers.filter((t) => {
      const symUpper = (t.Tickers || '').trim().toUpperCase();
      if (!symUpper) return false;
      const isSheet =
        t.source === 'sheet' ||
        symUpper.includes(':') ||
        symUpper.startsWith('MUTF_IN') ||
        symUpper.startsWith('INDEX');
      return !isSheet;
    });

    if (!modalSearchQuery || !modalSearchQuery.trim()) {
      return yahooLocalTickers.slice(0, 20);
    }
    const query = modalSearchQuery.trim().toLowerCase();

    // Matches from local Yahoo tickers
    const localMatches = yahooLocalTickers.filter(
      (t) =>
        (t.Tickers && t.Tickers.toLowerCase().includes(query)) ||
        (t['Company Name'] && t['Company Name'].toLowerCase().includes(query))
    );
    const localSymbols = new Set(localMatches.map((t) => t.Tickers.trim().toUpperCase()));

    // 2. Matches from master stock dictionary (2,600+ NSE, ETFs, and US companies)
    const masterMatches = searchMasterStocks(query, 35);
    const additionalMatches: Ticker[] = masterMatches
      .filter((m) => !localSymbols.has(m.symbol.trim().toUpperCase()))
      .map((m) => ({
        Tickers: m.symbol,
        'Company Name': m.name,
        'Current Value': 0,
        'Asset Type':
          m.name.toLowerCase().includes('etf') || m.name.toLowerCase().includes('bees')
            ? 'ETF'
            : m.name.toLowerCase().includes('fund')
            ? 'Mutual Fund'
            : 'Equity',
        Sector: m.sector || 'General',
        Logo: getCompanyLogoUrl(m.symbol, m.name),
        'Yesterday Close': 0,
        source: 'yahoo',
      }));

    const knownSet = new Set([
      ...localMatches.map((t) => t.Tickers.trim().toUpperCase()),
      ...additionalMatches.map((t) => t.Tickers.trim().toUpperCase()),
    ]);

    // 3. Online Yahoo search results (strictly filter out any colon/sheet formatted results)
    const onlineAdditional = onlineResults.filter(
      (o) => !knownSet.has(o.Tickers.trim().toUpperCase()) && !o.Tickers.includes(':')
    );

    return [...localMatches, ...additionalMatches, ...onlineAdditional];
  }, [modalSearchQuery, tickers, onlineResults]);

  // Modal filtered candidates for Google Sheet (from user's Google Sheet tickers & database)
  const modalSheetCandidates = useMemo(() => {
    const query = (modalSearchQuery || '').trim().toLowerCase();

    // 1. Collect all authentic Google Sheet tickers from the store & transactions
    const localSheetTickers: Ticker[] = [];
    const seen = new Set<string>();

    tickers.forEach((t) => {
      const symUpper = (t.Tickers || '').trim().toUpperCase();
      if (!symUpper) return;

      const isSheet =
        t.source === 'sheet' ||
        symUpper.includes(':') ||
        symUpper.startsWith('NSE') ||
        symUpper.startsWith('BOM') ||
        symUpper.startsWith('NASDAQ') ||
        symUpper.startsWith('NYSE') ||
        symUpper.startsWith('MUTF') ||
        symUpper.startsWith('INDEX') ||
        symUpper.startsWith('.') ||
        (!symUpper.endsWith('.NS') && !symUpper.endsWith('.BO'));

      if (isSheet && !seen.has(symUpper)) {
        seen.add(symUpper);
        localSheetTickers.push({
          ...t,
          source: 'sheet',
        });
      }
    });

    // Also include distinct sheet symbols from transactions
    transactions.forEach((tx) => {
      const symUpper = (tx.symbol || '').trim().toUpperCase();
      if (!symUpper || seen.has(symUpper)) return;
      if (
        getTickerSource(symUpper) === 'sheet' ||
        symUpper.includes(':') ||
        symUpper.startsWith('NSE') ||
        symUpper.startsWith('BOM') ||
        symUpper.startsWith('NASDAQ') ||
        symUpper.startsWith('NYSE') ||
        symUpper.startsWith('MUTF') ||
        symUpper.startsWith('INDEX') ||
        symUpper.startsWith('.')
      ) {
        seen.add(symUpper);
        localSheetTickers.push({
          Tickers: symUpper,
          'Company Name': symUpper,
          'Current Value': tx.price || 0,
          'Asset Type': 'Equity',
          Sector: 'General',
          Logo: getCompanyLogoUrl(symUpper, symUpper),
          source: 'sheet',
        });
      }
    });

    // Filter sheet tickers directly by search query
    const matchedSheetTickers = localSheetTickers.filter((item) => {
      const symUpper = item.Tickers.trim().toUpperCase();
      const name = (item['Company Name'] || '').toLowerCase();
      const rawSym = symUpper.replace(/^(NSE|BOM|BSE|NASDAQ|NYSE|INDEX|INDEXNSE|INDEXBOM|INDEXSP|MUTF_IN|MUTF):/i, '').toLowerCase();

      if (!query) return true;
      return symUpper.toLowerCase().includes(query) || name.includes(query) || rawSym.includes(query);
    });

    return matchedSheetTickers;
  }, [tickers, transactions, modalSearchQuery, getTickerSource]);

  const handleSelectYahooReplacement = (newTicker: Ticker) => {
    if (!selectedCompanyForRemap) return;

    const oldSym = selectedCompanyForRemap.symbol;
    const newSym = newTicker.Tickers.trim().toUpperCase();
    const newName = newTicker['Company Name'] || newSym;

    Alert.alert(
      'Remap to Yahoo Finance?',
      `Are you sure you want to remap "${selectedCompanyForRemap.companyName}" (${oldSym}) to "${newName}" (${newSym})?\n\nAll ${selectedCompanyForRemap.txCount} associated transaction(s) will be updated with real-time Yahoo Finance market quotes.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Remap',
          style: 'default',
          onPress: async () => {
            try {
              setIsRemapping(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              const success = await remapCompanySymbol(oldSym, newSym, 'yahoo', {
                companyName: newName,
                sector: newTicker.Sector,
                assetType: newTicker['Asset Type'],
              });
              setIsRemapping(false);
              if (success) {
                setSelectedCompanyForRemap(null);
                setModalSearchQuery('');
                Alert.alert(
                  'Remapped Successfully',
                  `"${oldSym}" is now linked to live Yahoo Finance ticker "${newSym}".`
                );
              } else {
                Alert.alert('Error', 'Failed to remap company ticker. Please try again.');
              }
            } catch (err) {
              setIsRemapping(false);
              Alert.alert('Error', 'An unexpected error occurred while remapping.');
            }
          },
        },
      ]
    );
  };

  const handleSelectSheetReplacement = (newTicker: Ticker) => {
    if (!selectedCompanyForRemap) return;

    const oldSym = selectedCompanyForRemap.symbol;
    const newSym = newTicker.Tickers.trim().toUpperCase();
    const newName = newTicker['Company Name'] || newSym;
    const price = newTicker['Current Value'] || selectedCompanyForRemap.currentPrice;

    Alert.alert(
      'Remap to Google Sheet?',
      `Are you sure you want to remap "${selectedCompanyForRemap.companyName}" (${oldSym}) to Google Sheet ticker "${newSym}" (${newName})?\n\nAll ${selectedCompanyForRemap.txCount} associated transaction(s) will be updated to use this Google Sheet source.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Remap',
          style: 'default',
          onPress: async () => {
            try {
              setIsRemapping(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              const success = await remapCompanySymbol(oldSym, newSym, 'sheet', {
                companyName: newName,
                currentPrice: price,
                sector: newTicker.Sector,
                assetType: newTicker['Asset Type'],
              });
              setIsRemapping(false);
              if (success) {
                setSelectedCompanyForRemap(null);
                Alert.alert(
                  'Remapped Successfully',
                  `"${oldSym}" has been remapped to Google Sheet ticker "${newSym}".`
                );
              } else {
                Alert.alert('Error', 'Failed to remap to Google Sheet. Please try again.');
              }
            } catch (err) {
              setIsRemapping(false);
              Alert.alert('Error', 'An unexpected error occurred while remapping.');
            }
          },
        },
      ]
    );
  };

  const handleCustomSheetRemap = () => {
    if (!selectedCompanyForRemap) return;

    const oldSym = selectedCompanyForRemap.symbol;
    const newSym = customSheetSymbol.trim().toUpperCase();
    const newName = customSheetName.trim() || newSym;
    const priceNum = parseFloat(customSheetPrice) || 0;

    if (!newSym) {
      Alert.alert('Missing Ticker', 'Please enter a valid Google Sheet / Custom ticker symbol.');
      return;
    }

    Alert.alert(
      'Remap to Google Sheet / Custom?',
      `Are you sure you want to remap "${selectedCompanyForRemap.companyName}" (${oldSym}) to Google Sheet ticker "${newSym}" (${newName})?\n\nAll ${selectedCompanyForRemap.txCount} associated transaction(s) will be updated to use this custom symbol and data source.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Remap',
          style: 'default',
          onPress: async () => {
            try {
              setIsRemapping(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              const success = await remapCompanySymbol(oldSym, newSym, 'sheet', {
                companyName: newName,
                currentPrice: priceNum > 0 ? priceNum : selectedCompanyForRemap.currentPrice,
                sector: customSheetSector,
                assetType: customSheetAssetType,
              });
              setIsRemapping(false);
              if (success) {
                setSelectedCompanyForRemap(null);
                Alert.alert(
                  'Remapped Successfully',
                  `"${oldSym}" has been remapped to Google Sheet source "${newSym}".`
                );
              } else {
                Alert.alert('Error', 'Failed to remap to Google Sheet ticker. Please try again.');
              }
            } catch (err) {
              setIsRemapping(false);
              Alert.alert('Error', 'An unexpected error occurred while remapping.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: currColors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={colorScheme === 'light' ? 'dark' : 'light'} />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: currColors.background }]} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: currColors.border }]}>
          <BackButton />
          <View style={styles.headerTitleContainer}>
            <ThemedText style={[styles.headerTitle, { color: currColors.text }]}>
              Company & Ticker Mapping
            </ThemedText>
            <ThemedText style={[styles.headerSubtitle, { color: currColors.textSecondary }]}>
              Bidirectional: Yahoo Finance ⇄ Google Sheet
            </ThemedText>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Information Card */}
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: currColors.card,
                borderColor: currColors.border,
              },
            ]}
          >
            <View style={styles.heroTop}>
              <View style={styles.statBox}>
                <ThemedText style={[styles.statNumber, { color: currColors.text }]}>
                  {companyList.length}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: currColors.textSecondary }]}>
                  Total Companies
                </ThemedText>
              </View>
              <View style={[styles.statDivider, { backgroundColor: currColors.border }]} />
              <View style={styles.statBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={[styles.badgeDot, { backgroundColor: '#34C759' }]} />
                  <ThemedText style={[styles.statNumber, { color: '#34C759' }]}>
                    {yahooCount}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.statLabel, { color: currColors.textSecondary }]}>
                  Yahoo Live
                </ThemedText>
              </View>
              <View style={[styles.statDivider, { backgroundColor: currColors.border }]} />
              <View style={styles.statBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={[styles.badgeDot, { backgroundColor: '#FF9500' }]} />
                  <ThemedText style={[styles.statNumber, { color: '#FF9500' }]}>
                    {sheetCount}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.statLabel, { color: currColors.textSecondary }]}>
                  Google Sheet
                </ThemedText>
              </View>
            </View>

            <View style={[styles.cardDivider, { backgroundColor: currColors.border }]} />

            <ThemedText style={[styles.heroDescription, { color: currColors.textSecondary }]}>
              Two-way company remapping: Switch freely between live Yahoo Finance real-time quotes and Google Sheet / custom tickers. All linked transactions update together automatically.
            </ThemedText>
          </View>

          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <Search size={18} color={currColors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: currColors.text }]}
              placeholder="Search companies in your portfolio..."
              placeholderTextColor={currColors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color={currColors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Section Heading */}
          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
              YOUR PORTFOLIO COMPANIES ({filteredCompanies.length})
            </ThemedText>
          </View>

          {/* Company Cards List */}
          {filteredCompanies.length === 0 ? (
            <View style={styles.emptyState}>
              <ThemedText style={{ color: currColors.textSecondary, textAlign: 'center' }}>
                {searchQuery ? `No companies match "${searchQuery}"` : 'No portfolio transactions found.'}
              </ThemedText>
            </View>
          ) : (
            filteredCompanies.map((company) => {
              const isYahoo = company.source === 'yahoo';
              return (
                <TouchableOpacity
                  key={company.symbol}
                  activeOpacity={0.7}
                  style={[
                    styles.companyCard,
                    {
                      backgroundColor: currColors.card,
                      borderColor: currColors.border,
                    },
                  ]}
                  onPress={() => openRemapModal(company)}
                >
                  <View style={styles.companyLeft}>
                    {company.logo ? (
                      <View style={styles.logoBox}>
                        <Image
                          source={{ uri: company.logo }}
                          style={styles.logoImage}
                          resizeMode="contain"
                        />
                      </View>
                    ) : (
                      <View style={[styles.logoPlaceholder, { backgroundColor: currColors.cardSecondary }]}>
                        <ThemedText style={[styles.logoLetter, { color: currColors.text }]}>
                          {company.symbol[0]}
                        </ThemedText>
                      </View>
                    )}
                    <View style={styles.companyInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <ThemedText style={[styles.symbolText, { color: currColors.text }]}>
                          {company.symbol}
                        </ThemedText>
                        <View
                          style={[
                            styles.sourceBadge,
                            {
                              backgroundColor: isYahoo
                                ? 'rgba(52, 199, 89, 0.12)'
                                : 'rgba(255, 149, 0, 0.12)',
                            },
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.sourceBadgeText,
                              { color: isYahoo ? '#34C759' : '#FF9500' },
                            ]}
                          >
                            {isYahoo ? 'Yahoo Live' : 'Google Sheet'}
                          </ThemedText>
                        </View>
                      </View>
                      <ThemedText
                        style={[styles.nameText, { color: currColors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {company.companyName}
                      </ThemedText>
                      <ThemedText style={[styles.metaText, { color: currColors.textSecondary }]}>
                        {company.txCount} transaction{company.txCount === 1 ? '' : 's'}
                        {company.holdingQty > 0 ? ` • Qty: ${company.holdingQty}` : ''}
                        {company.currentPrice > 0 ? ` • Price: ${showCurrencySymbol ? '₹' : ''}${company.currentPrice.toLocaleString('en-IN')}` : ''}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.companyRight}>
                    <View style={[styles.remapButton, { backgroundColor: currColors.cardSecondary }]}>
                      <ThemedText style={[styles.remapButtonText, { color: currColors.tint }]}>
                        Change
                      </ThemedText>
                      <ChevronRight size={14} color={currColors.tint} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Bidirectional Remap Picker Modal */}
      <Modal
        visible={!!selectedCompanyForRemap}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedCompanyForRemap(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={[styles.modalContainer, { backgroundColor: currColors.background }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: currColors.border }]}>
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>
                  Remap Company
                </ThemedText>
                <ThemedText style={[styles.modalSubtitle, { color: currColors.textSecondary }]} numberOfLines={1}>
                  {selectedCompanyForRemap?.symbol} ({selectedCompanyForRemap?.txCount} linked transaction{selectedCompanyForRemap?.txCount === 1 ? '' : 's'})
                </ThemedText>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedCompanyForRemap(null)}
                style={styles.modalCloseButton}
              >
                <X size={24} color={currColors.text} />
              </TouchableOpacity>
            </View>

            {/* Target Source Segmented Tab Switcher */}
            <View style={[styles.modalTabContainer, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border }]}>
              <TouchableOpacity
                style={[
                  styles.modalTab,
                  modalMode === 'yahoo' && [styles.modalTabActive, { backgroundColor: currColors.card }],
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setModalMode('yahoo');
                }}
              >
                <Zap size={14} color={modalMode === 'yahoo' ? '#34C759' : currColors.textSecondary} />
                <ThemedText
                  style={[
                    styles.modalTabText,
                    { color: modalMode === 'yahoo' ? currColors.text : currColors.textSecondary },
                    modalMode === 'yahoo' && { fontWeight: '700' },
                  ]}
                >
                  Yahoo Finance (Live)
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalTab,
                  modalMode === 'sheet' && [styles.modalTabActive, { backgroundColor: currColors.card }],
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setModalMode('sheet');
                }}
              >
                <FileSpreadsheet size={14} color={modalMode === 'sheet' ? '#FF9500' : currColors.textSecondary} />
                <ThemedText
                  style={[
                    styles.modalTabText,
                    { color: modalMode === 'sheet' ? currColors.text : currColors.textSecondary },
                    modalMode === 'sheet' && { fontWeight: '700' },
                  ]}
                >
                  Google Sheet (Custom)
                </ThemedText>
              </TouchableOpacity>
            </View>

            {modalMode === 'yahoo' ? (
              /* TAB 1: YAHOO FINANCE LIVE MODE */
              <View style={{ flex: 1 }}>
                {/* Side-by-Side Price & Match Comparison Card */}
                {selectedCompanyForRemap && (
                  <View style={[styles.compareCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                    <View style={styles.compareRow}>
                      {/* Left: Current Source & Symbol */}
                      <View style={styles.compareCol}>
                        <View
                          style={[
                            styles.sourceBadge,
                            {
                              backgroundColor: selectedCompanyForRemap.source === 'yahoo'
                                ? 'rgba(52, 199, 89, 0.12)'
                                : 'rgba(255, 149, 0, 0.12)',
                              alignSelf: 'flex-start',
                              marginBottom: 6,
                            },
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.sourceBadgeText,
                              { color: selectedCompanyForRemap.source === 'yahoo' ? '#34C759' : '#FF9500' },
                            ]}
                          >
                            Current: {selectedCompanyForRemap.source === 'yahoo' ? 'Yahoo Live' : 'Google Sheet'}
                          </ThemedText>
                        </View>
                        <ThemedText style={[styles.compareSymbol, { color: currColors.text }]} numberOfLines={1}>
                          {selectedCompanyForRemap.symbol}
                        </ThemedText>
                        <ThemedText style={[styles.comparePrice, { color: currColors.textSecondary }]}>
                          {selectedCompanyForRemap.currentPrice > 0
                            ? `${showCurrencySymbol ? '₹' : ''}${selectedCompanyForRemap.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            : 'N/A'}
                        </ThemedText>
                      </View>

                      <View style={[styles.compareDivider, { backgroundColor: currColors.border }]}>
                        <ArrowRight size={14} color={currColors.textSecondary} />
                      </View>

                      {/* Right: Target Yahoo Live Quote */}
                      <View style={styles.compareCol}>
                        <View style={[styles.sourceBadge, { backgroundColor: 'rgba(52, 199, 89, 0.12)', alignSelf: 'flex-start', marginBottom: 6 }]}>
                          <ThemedText style={[styles.sourceBadgeText, { color: '#34C759' }]}>
                            Target: Yahoo Live
                          </ThemedText>
                        </View>
                        {loadingSuggested ? (
                          <ActivityIndicator size="small" color={currColors.tint} style={{ marginVertical: 6 }} />
                        ) : suggestedMatch ? (
                          <>
                            <ThemedText style={[styles.compareSymbol, { color: currColors.text }]} numberOfLines={1}>
                              {suggestedMatch.Tickers}
                            </ThemedText>
                            <ThemedText style={[styles.comparePrice, { color: '#34C759', fontWeight: '700' }]}>
                              {suggestedMatch['Current Value'] > 0
                                ? `${showCurrencySymbol ? '₹' : ''}${suggestedMatch['Current Value'].toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                                : 'Live Quote'}
                            </ThemedText>
                          </>
                        ) : (
                          <ThemedText style={{ color: currColors.textSecondary, fontSize: 13 }}>
                            Searching...
                          </ThemedText>
                        )}
                      </View>
                    </View>

                    {/* 1-Tap Quick Remap Button for the Recommended Match */}
                    {suggestedMatch && (
                      <TouchableOpacity
                        style={[styles.quickRemapBtn, { backgroundColor: currColors.tint }]}
                        onPress={() => handleSelectYahooReplacement(suggestedMatch)}
                        activeOpacity={0.8}
                      >
                        <Zap size={16} color={colorScheme === 'dark' ? '#000' : '#FFF'} />
                        <ThemedText style={[styles.quickRemapBtnText, { color: colorScheme === 'dark' ? '#000' : '#FFF' }]}>
                          1-Tap Remap to {suggestedMatch.Tickers} {suggestedMatch['Current Value'] > 0 ? `(${showCurrencySymbol ? '₹' : ''}${suggestedMatch['Current Value'].toLocaleString('en-IN')})` : ''}
                        </ThemedText>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Section Divider / Search Header */}
                <View style={{ paddingHorizontal: 16, marginTop: 4, marginBottom: 4 }}>
                  <ThemedText style={{ fontSize: 11.5, fontWeight: '600', color: currColors.textSecondary, letterSpacing: 0.5 }}>
                    OR SEARCH ALL YAHOO ASSETS (STOCKS, ETFS, MUTUAL FUNDS)
                  </ThemedText>
                </View>

                {/* Modal Search Bar */}
                <View style={[styles.modalSearchContainer, { backgroundColor: currColors.card }]}>
                  <Search size={18} color={currColors.textSecondary} />
                  <TextInput
                    style={[styles.modalSearchInput, { color: currColors.text }]}
                    placeholder="Search Yahoo ticker or company..."
                    placeholderTextColor={currColors.textSecondary}
                    value={modalSearchQuery}
                    onChangeText={setModalSearchQuery}
                  />
                  {isSearchingOnline && (
                    <ActivityIndicator size="small" color={currColors.tint} style={{ marginRight: 6 }} />
                  )}
                  {modalSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setModalSearchQuery('')}>
                      <X size={16} color={currColors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Candidate Assets List */}
                <FlatList
                  data={modalCandidates}
                  keyExtractor={(item) => item.Tickers}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => {
                    const isCurrent = selectedCompanyForRemap?.symbol.toUpperCase() === item.Tickers.toUpperCase();
                    return (
                      <TouchableOpacity
                        style={[styles.candidateItem, { borderBottomColor: currColors.border }]}
                        onPress={() => handleSelectYahooReplacement(item)}
                      >
                        <View style={styles.candidateLeft}>
                          {item.Logo ? (
                            <View style={styles.modalLogoBox}>
                              <Image source={{ uri: item.Logo }} style={styles.modalLogoImage} resizeMode="contain" />
                            </View>
                          ) : (
                            <View style={[styles.modalLogoPlaceholder, { backgroundColor: currColors.cardSecondary }]}>
                              <ThemedText style={[styles.logoLetter, { color: currColors.text }]}>
                                {item.Tickers[0]}
                              </ThemedText>
                            </View>
                          )}
                          <View style={styles.candidateInfo}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <ThemedText style={[styles.candidateSymbol, { color: currColors.text }]}>
                                {item.Tickers}
                              </ThemedText>
                              {item['Asset Type'] && (
                                <View style={[styles.assetTypeTag, { backgroundColor: currColors.cardSecondary }]}>
                                  <ThemedText style={[styles.assetTypeTagText, { color: currColors.tint }]}>
                                    {item['Asset Type']}
                                  </ThemedText>
                                </View>
                              )}
                              <View style={[styles.sourceBadge, { backgroundColor: 'rgba(52, 199, 89, 0.12)' }]}>
                                <ThemedText style={[styles.sourceBadgeText, { color: '#34C759' }]}>
                                  Yahoo Live
                                </ThemedText>
                              </View>
                            </View>
                            <ThemedText style={[styles.candidateName, { color: currColors.textSecondary }]} numberOfLines={1}>
                              {item['Company Name']}
                            </ThemedText>
                          </View>
                        </View>

                        <View style={{ alignItems: 'flex-end' }}>
                          {item['Current Value'] > 0 ? (
                            <ThemedText style={[styles.candidatePrice, { color: currColors.text }]}>
                              {showCurrencySymbol ? '₹' : ''}
                              {item['Current Value'].toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </ThemedText>
                          ) : (
                            <View style={[styles.liveQuoteTag, { backgroundColor: currColors.cardSecondary }]}>
                              <ThemedText style={{ color: currColors.tint, fontSize: 11, fontWeight: '600' }}>
                                Select
                              </ThemedText>
                            </View>
                          )}
                          {isCurrent && <Check size={16} color={currColors.tint} style={{ marginTop: 4 }} />}
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={() => (
                    <View style={{ padding: 32, alignItems: 'center' }}>
                      <ThemedText style={{ color: currColors.textSecondary, textAlign: 'center', fontSize: 13.5 }}>
                        {isSearchingOnline ? 'Searching Yahoo Finance...' : `No matching tickers for "${modalSearchQuery}".`}
                      </ThemedText>
                    </View>
                  )}
                />
              </View>
            ) : (
              /* TAB 2: GOOGLE SHEET (CUSTOM / LEGACY) MODE - FULL PARITY WITH YAHOO UI/UX */
              <View style={{ flex: 1 }}>
                {/* Side-by-Side Price & Match Comparison Card for Google Sheet */}
                {selectedCompanyForRemap && (
                  <View style={[styles.compareCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                    <View style={styles.compareRow}>
                      {/* Left: Current Source & Symbol */}
                      <View style={styles.compareCol}>
                        <View
                          style={[
                            styles.sourceBadge,
                            {
                              backgroundColor: selectedCompanyForRemap.source === 'yahoo'
                                ? 'rgba(52, 199, 89, 0.12)'
                                : 'rgba(255, 149, 0, 0.12)',
                              alignSelf: 'flex-start',
                              marginBottom: 6,
                            },
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.sourceBadgeText,
                              { color: selectedCompanyForRemap.source === 'yahoo' ? '#34C759' : '#FF9500' },
                            ]}
                          >
                            Current: {selectedCompanyForRemap.source === 'yahoo' ? 'Yahoo Live' : 'Google Sheet'}
                          </ThemedText>
                        </View>
                        <ThemedText style={[styles.compareSymbol, { color: currColors.text }]} numberOfLines={1}>
                          {selectedCompanyForRemap.symbol}
                        </ThemedText>
                        <ThemedText style={[styles.comparePrice, { color: currColors.textSecondary }]}>
                          {selectedCompanyForRemap.currentPrice > 0
                            ? `${showCurrencySymbol ? '₹' : ''}${selectedCompanyForRemap.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            : 'N/A'}
                        </ThemedText>
                      </View>

                      <View style={[styles.compareDivider, { backgroundColor: currColors.border }]}>
                        <ArrowRight size={14} color={currColors.textSecondary} />
                      </View>

                      {/* Right: Target Google Sheet Match */}
                      <View style={styles.compareCol}>
                        <View style={[styles.sourceBadge, { backgroundColor: 'rgba(255, 149, 0, 0.12)', alignSelf: 'flex-start', marginBottom: 6 }]}>
                          <ThemedText style={[styles.sourceBadgeText, { color: '#FF9500' }]}>
                            Target: Google Sheet
                          </ThemedText>
                        </View>
                        {suggestedSheetMatch ? (
                          <>
                            <ThemedText style={[styles.compareSymbol, { color: currColors.text }]} numberOfLines={1}>
                              {suggestedSheetMatch.Tickers}
                            </ThemedText>
                            <ThemedText style={[styles.comparePrice, { color: '#FF9500', fontWeight: '700' }]}>
                              {suggestedSheetMatch['Current Value'] > 0
                                ? `${showCurrencySymbol ? '₹' : ''}${suggestedSheetMatch['Current Value'].toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                                : 'Sheet Ticker'}
                            </ThemedText>
                          </>
                        ) : (
                          <ThemedText style={{ color: currColors.textSecondary, fontSize: 13 }}>
                            Loading...
                          </ThemedText>
                        )}
                      </View>
                    </View>

                    {/* 1-Tap Quick Remap Button to Target Sheet Ticker */}
                    {suggestedSheetMatch && (
                      <TouchableOpacity
                        style={[styles.quickRemapBtn, { backgroundColor: '#FF9500' }]}
                        onPress={() => handleSelectSheetReplacement(suggestedSheetMatch)}
                        activeOpacity={0.8}
                      >
                        <FileSpreadsheet size={16} color="#000" />
                        <ThemedText style={[styles.quickRemapBtnText, { color: '#000' }]}>
                          1-Tap Remap to {suggestedSheetMatch.Tickers} {suggestedSheetMatch['Current Value'] > 0 ? `(${showCurrencySymbol ? '₹' : ''}${suggestedSheetMatch['Current Value'].toLocaleString('en-IN')})` : ''}
                        </ThemedText>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Standard Google Sheet Search & Candidate List */}
                <View style={{ flex: 1 }}>
                  {/* Modal Search Bar for Sheet */}
                  <View style={[styles.modalSearchContainer, { backgroundColor: currColors.card }]}>
                    <Search size={18} color={currColors.textSecondary} />
                    <TextInput
                      style={[styles.modalSearchInput, { color: currColors.text }]}
                      placeholder="Search Google Sheet ticker or company..."
                      placeholderTextColor={currColors.textSecondary}
                      value={modalSearchQuery}
                      onChangeText={setModalSearchQuery}
                    />
                    {modalSearchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setModalSearchQuery('')}>
                        <X size={16} color={currColors.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Section Header for Sheet Tickers */}
                  <View style={{ paddingHorizontal: 16, marginTop: 2, marginBottom: 4 }}>
                    <ThemedText style={{ fontSize: 11.5, fontWeight: '600', color: currColors.textSecondary, letterSpacing: 0.5 }}>
                      TICKERS FROM GOOGLE SHEET ({modalSheetCandidates.length})
                    </ThemedText>
                  </View>

                  {/* Candidate Sheet Assets FlatList */}
                  <FlatList
                    data={modalSheetCandidates}
                    keyExtractor={(item) => item.Tickers}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => {
                      const isCurrent = selectedCompanyForRemap?.symbol.toUpperCase() === item.Tickers.toUpperCase();
                      return (
                        <TouchableOpacity
                          style={[styles.candidateItem, { borderBottomColor: currColors.border }]}
                          onPress={() => handleSelectSheetReplacement(item)}
                        >
                          <View style={styles.candidateLeft}>
                            {item.Logo ? (
                              <View style={styles.modalLogoBox}>
                                <Image source={{ uri: item.Logo }} style={styles.modalLogoImage} resizeMode="contain" />
                              </View>
                            ) : (
                              <View style={[styles.modalLogoPlaceholder, { backgroundColor: currColors.cardSecondary }]}>
                                <ThemedText style={[styles.logoLetter, { color: currColors.text }]}>
                                  {item.Tickers.replace(/^(NSE|BOM):/i, '')[0] || item.Tickers[0]}
                                </ThemedText>
                              </View>
                            )}
                            <View style={styles.candidateInfo}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <ThemedText style={[styles.candidateSymbol, { color: currColors.text }]}>
                                  {item.Tickers}
                                </ThemedText>
                                {item['Asset Type'] && (
                                  <View style={[styles.assetTypeTag, { backgroundColor: currColors.cardSecondary }]}>
                                    <ThemedText style={[styles.assetTypeTagText, { color: '#FF9500' }]}>
                                      {item['Asset Type']}
                                    </ThemedText>
                                  </View>
                                )}
                                <View style={[styles.sourceBadge, { backgroundColor: 'rgba(255, 149, 0, 0.12)' }]}>
                                  <ThemedText style={[styles.sourceBadgeText, { color: '#FF9500' }]}>
                                    Google Sheet
                                  </ThemedText>
                                </View>
                              </View>
                              <ThemedText style={[styles.candidateName, { color: currColors.textSecondary }]} numberOfLines={1}>
                                {item['Company Name']}
                              </ThemedText>
                            </View>
                          </View>

                          <View style={{ alignItems: 'flex-end' }}>
                            {item['Current Value'] > 0 ? (
                              <ThemedText style={[styles.candidatePrice, { color: currColors.text }]}>
                                {showCurrencySymbol ? '₹' : ''}
                                {item['Current Value'].toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </ThemedText>
                            ) : (
                              <View style={[styles.liveQuoteTag, { backgroundColor: 'rgba(255, 149, 0, 0.12)' }]}>
                                <ThemedText style={{ color: '#FF9500', fontSize: 11, fontWeight: '600' }}>
                                  Select
                                </ThemedText>
                              </View>
                            )}
                            {isCurrent && <Check size={16} color="#FF9500" style={{ marginTop: 4 }} />}
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                    ListEmptyComponent={() => (
                      <View style={{ padding: 32, alignItems: 'center' }}>
                        <ThemedText style={{ color: currColors.textSecondary, textAlign: 'center', fontSize: 13.5 }}>
                          No Google Sheet tickers found matching "{modalSearchQuery}".
                        </ThemedText>
                      </View>
                    )}
                  />
                </View>
              </View>
            )}

            {isRemapping && (
              <View style={[styles.loadingOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <ActivityIndicator size="large" color="#FFF" />
                <ThemedText style={{ color: '#FFF', marginTop: 12, fontWeight: '600' }}>
                  Updating company and remapping transactions...
                </ThemedText>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 16,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 36,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 14,
  },
  heroDescription: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  sectionHeader: {
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  companyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  companyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  logoBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 2,
    marginRight: 12,
  },
  logoImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  logoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoLetter: {
    fontSize: 16,
    fontWeight: '700',
  },
  companyInfo: {
    flex: 1,
  },
  symbolText: {
    fontSize: 15,
    fontWeight: '600',
  },
  sourceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  nameText: {
    fontSize: 13,
    marginTop: 2,
  },
  metaText: {
    fontSize: 11.5,
    marginTop: 3,
  },
  companyRight: {
    alignItems: 'flex-end',
  },
  remapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 2,
  },
  remapButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  candidateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  candidateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  modalLogoBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 2,
    marginRight: 12,
  },
  modalLogoImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  modalLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  candidateInfo: {
    flex: 1,
  },
  candidateSymbol: {
    fontSize: 15,
    fontWeight: '600',
  },
  candidateName: {
    fontSize: 13,
    marginTop: 2,
  },
  candidatePrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  assetTypeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  assetTypeTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  liveQuoteTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  compareCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compareCol: {
    flex: 1,
  },
  compareDivider: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  compareSymbol: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  comparePrice: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  quickRemapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 14,
    gap: 8,
  },
  quickRemapBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 3,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  modalTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  modalTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sheetFormContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  sheetBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  sheetBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  formGroup: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: 20,
  },
  formRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  formInput: {
    fontSize: 16,
    paddingVertical: 4,
  },
  formDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  confirmSheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmSheetBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  sheetFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
