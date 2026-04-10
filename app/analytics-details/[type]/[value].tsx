import { useColorScheme } from '@/components/useColorScheme';
import { getSectorIcon } from '@/constants/Sectors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { BackButton } from '@/components/BackButton';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Briefcase,
  Layers,
  LayoutGrid,
  TrendingUp,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../../constants/Colors';
import { CHART_COLORS, getCategoryIcon } from '../../../constants/Icons';
import { usePortfolioStore } from '../../../store/usePortfolioStore';
import { Holding } from '../../../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function AnalyticsDetailsScreen() {
  const { type, value } = useLocalSearchParams<{
    type: string;
    value: string;
  }>();
  const getHoldingsData = usePortfolioStore((state) => state.getHoldingsData);
  const showCurrencySymbol = usePortfolioStore(
    (state) => state.showCurrencySymbol,
  );
  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const addRecentSearch = usePortfolioStore((state) => state.addRecentSearch);
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme as 'light' | 'dark'];

  const [viewMode, setViewMode] = useState<
    'Contribution' | 'Invested' | 'Returns'
  >('Invested');
  const [sortDirection, setSortDirection] = useState<'DESC' | 'ASC'>('DESC');

  const holdings = useMemo(() => getHoldingsData(), [getHoldingsData]);

  const filteredHoldings = useMemo(() => {
    const decodedValue = decodeURIComponent(value || '');
    const typeKeyMap: Record<string, keyof Holding> = {
      Sector: 'sector',
      'Asset Type': 'assetType',
      Broker: 'broker',
    };

    const key = typeKeyMap[type as keyof typeof typeKeyMap] || 'sector';

    const result = holdings.filter((h) => String(h[key]) === decodedValue);

    return [...result].sort((a, b) => {
      let valA: any;
      let valB: any;

      if (viewMode === 'Contribution') {
        valA = a.contributionPercentage;
        valB = b.contributionPercentage;
      } else if (viewMode === 'Invested') {
        valA = a.currentValue;
        valB = b.currentValue;
      } else {
        // Returns (%)
        valA = a.pnlPercentage;
        valB = b.pnlPercentage;
      }

      if (valA !== valB) {
        if (typeof valA === 'string') {
          return sortDirection === 'DESC'
            ? valB.localeCompare(valA)
            : valA.localeCompare(valB);
        }
        return sortDirection === 'DESC' ? valB - valA : valA - valB;
      }
      return 0;
    });
  }, [holdings, type, value, viewMode, sortDirection]);

  const headerData = useMemo(() => {
    return getCategoryIcon(type as string, decodeURIComponent(value || ''));
  }, [type, value]);

  const HeaderIcon = headerData.icon;
  const headerColor = headerData.color;

  const renderItem = ({ item, index }: { item: Holding; index: number }) => {
    return (
      <TouchableOpacity
        style={[styles.companyItem, { borderBottomColor: currColors.border }]}
        activeOpacity={0.7}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          addRecentSearch(item.companyName);
          router.push(`/stock-details/${item.symbol}`);
        }}
      >
        <View style={styles.itemLeft}>
          <View
            style={[
              styles.holdingIcon,
              {
                backgroundColor:
                  CHART_COLORS[index % CHART_COLORS.length] + '22',
              },
            ]}
          >
            {item.logo ? (
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  padding: 2,
                }}
              >
                <Image
                  source={{ uri: item.logo }}
                  style={{ width: 40, height: 40, borderRadius: 10 }}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <Text
                style={[
                  styles.iconLetter,
                  { color: CHART_COLORS[index % CHART_COLORS.length] },
                ]}
              >
                {item.companyName[0]?.toUpperCase() || '?'}
              </Text>
            )}
          </View>
          <View style={styles.infoCol}>
            <Text
              style={[styles.companyName, { color: currColors.text }]}
              numberOfLines={1}
            >
              {item.companyName}
            </Text>
            <View style={styles.tickerRow}>
              <Text
                style={[styles.tickerText, { color: currColors.textSecondary }]}
              >
                Qty: {item.quantity.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.itemRight}>
          {viewMode === 'Invested' && (
            <>
              <Text style={[styles.currentPrice, { color: currColors.text }]}>
                {isPrivacyMode
                  ? '****'
                  : `${showCurrencySymbol ? '₹' : ''}${item.currentValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              </Text>
              <Text
                style={[styles.tickerText, { color: currColors.textSecondary }]}
              >
                {isPrivacyMode
                  ? '****'
                  : `${showCurrencySymbol ? '₹' : ''}${item.investedValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              </Text>
            </>
          )}
          {viewMode === 'Returns' && (
            <>
              <Text
                style={[
                  styles.currentPrice,
                  { color: item.pnl >= 0 ? '#4CAF50' : '#F44336' },
                ]}
              >
                {isPrivacyMode
                  ? '****'
                  : `${item.pnl >= 0 ? '+' : '-'}${showCurrencySymbol ? '₹' : ''}${Math.abs(item.pnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              </Text>
              <View
                style={[
                  styles.changeBadge,
                  {
                    backgroundColor:
                      item.pnl >= 0
                        ? 'rgba(76, 175, 80, 0.1)'
                        : 'rgba(244, 67, 54, 0.1)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.changeText,
                    { color: item.pnl >= 0 ? '#4CAF50' : '#F44336' },
                    { marginLeft: 0 },
                  ]}
                >
                  {item.pnl >= 0 ? '+' : ''}
                  {item.pnlPercentage.toFixed(2)}%
                </Text>
              </View>
            </>
          )}
          {viewMode === 'Contribution' && (
            <>
              <Text style={[styles.currentPrice, { color: currColors.text }]}>
                {isPrivacyMode
                  ? '****'
                  : `${item.contributionPercentage.toFixed(2)}%`}
              </Text>
              <Text
                style={[styles.tickerText, { color: currColors.textSecondary }]}
              >
                {isPrivacyMode
                  ? '****'
                  : `${showCurrencySymbol ? '₹' : ''}${item.currentValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              </Text>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: currColors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={[styles.container, { backgroundColor: currColors.background }]}
      >
        <LinearGradient
          colors={[headerColor + '20', currColors.background]}
          style={styles.headerSection}
        >
          <SafeAreaView edges={['top']} style={styles.headerContent}>
            <View style={styles.headerTopRow}>
              <BackButton />
            </View>

            <View style={styles.headerCenter}>
              <View
                style={[
                  styles.largeIconContainer,
                  {
                    backgroundColor: currColors.background,
                    shadowColor: headerColor,
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.3,
                    shadowRadius: 20,
                    elevation: 10,
                    borderColor: headerColor + '30',
                  },
                ]}
              >
                <HeaderIcon size={48} color={headerColor} strokeWidth={1.5} />
              </View>
              <Text style={[styles.sectorTitle, { color: currColors.text }]}>
                {decodeURIComponent(value || '')}
              </Text>
              <Text
                style={[
                  styles.typeSubtitle,
                  { color: currColors.textSecondary },
                ]}
              >
                {type}
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View
          style={[
            styles.listSection,
            { backgroundColor: currColors.background },
          ]}
        >
          <View style={styles.filtersWrapper}>
            <View style={styles.holdingsHeader}>
              <TouchableOpacity
                style={[
                  styles.actionIconButton,
                  {
                    backgroundColor: currColors.card,
                    borderColor: currColors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSortDirection((prev) =>
                    prev === 'DESC' ? 'ASC' : 'DESC',
                  );
                }}
              >
                {sortDirection === 'DESC' ? (
                  <ArrowDown size={14} color={currColors.text} />
                ) : (
                  <ArrowUp size={14} color={currColors.text} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.viewModeToggle,
                  {
                    backgroundColor: currColors.card,
                    borderColor: currColors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (viewMode === 'Invested') setViewMode('Returns');
                  else if (viewMode === 'Returns') setViewMode('Contribution');
                  else setViewMode('Invested');
                }}
              >
                <ArrowUpDown size={14} color={currColors.text} />
                <Text style={[styles.viewModeText, { color: currColors.text }]}>
                  {viewMode === 'Invested'
                    ? 'Current (Invested)'
                    : viewMode === 'Returns'
                      ? 'Returns (%)'
                      : 'Contribution (Current)'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={filteredHoldings}
            renderItem={renderItem}
            keyExtractor={(item) => item.symbol}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text
                  style={[
                    styles.emptyText,
                    { color: currColors.textSecondary },
                  ]}
                >
                  No owned companies found
                </Text>
              </View>
            }
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  headerSection: {
    height: SCREEN_HEIGHT / 3.2,
    width: '100%',
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 10,
  },
  headerCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -10,
  },
  largeIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  sectorTitle: {
    fontSize: SCREEN_WIDTH > 400 ? 28 : 24,
    fontWeight: '500',
    letterSpacing: -0.5,
    fontFamily: 'Outfit_500Medium',
  },
  typeSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'Outfit_400Regular',
  },
  listSection: {
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    paddingTop: 10,
  },
  filtersWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  holdingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionIconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  viewModeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  viewModeText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Outfit_500Medium',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  companyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  holdingIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconLetter: {
    fontSize: 18,
    fontWeight: '500',
    fontFamily: 'Outfit_500Medium',
  },
  infoCol: {
    flex: 1,
  },
  companyName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
    fontFamily: 'Outfit_500Medium',
  },
  tickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tickerText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Outfit_500Medium',
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  currentPrice: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 4,
    fontFamily: 'Outfit_400Regular',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '400',
    marginLeft: 4,
    fontFamily: 'Outfit_400Regular',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
  },
});
