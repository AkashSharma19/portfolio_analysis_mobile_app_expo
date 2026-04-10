import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { calculateProjection, calculateProjectionSeries } from '@/lib/finance';

import { usePortfolioStore } from '@/store/usePortfolioStore';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { BackButton } from '@/components/BackButton';
import { Info } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForecastDetailsScreen() {
  const router = useRouter();
  const theme = useColorScheme() ?? 'dark';
  const currColors = Colors[theme];

  const calculateSummary = usePortfolioStore((state) => state.calculateSummary);
  const getYearlyAnalysis = usePortfolioStore(
    (state) => state.getYearlyAnalysis,
  );
  const showCurrencySymbol = usePortfolioStore(
    (state) => state.showCurrencySymbol,
  );
  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const transactions = usePortfolioStore((state) => state.transactions);
  const tickers = usePortfolioStore((state) => state.tickers);
  const years = usePortfolioStore((state) => state.forecastYears);
  const setYears = usePortfolioStore((state) => state.setForecastYears);

  const summary = useMemo(
    () => calculateSummary(),
    [transactions, calculateSummary, tickers],
  );
  const yearlyAnalysis = useMemo(
    () => getYearlyAnalysis(),
    [transactions, getYearlyAnalysis, tickers],
  );

  const currentYear = new Date().getFullYear();
  const [activePoint, setActivePoint] = useState<any>(null);

  const annualReturn = useMemo(() => {
    return (summary.xirr || 0) / 100;
  }, [summary.xirr]);

  const monthlySIP = useMemo(() => {
    if (yearlyAnalysis.length === 0) return 0;
    return yearlyAnalysis[0].averageMonthlyInvestment || 0;
  }, [yearlyAnalysis]);

  const projection = useMemo(() => {
    return calculateProjection(
      summary.totalValue,
      annualReturn,
      monthlySIP,
      years,
    );
  }, [summary.totalValue, annualReturn, monthlySIP, years]);

  const displayPoint = activePoint || {
    value: projection.totalFutureValue,
    year: years,
    multiplier: projection.multiplier,
    presentValue: projection.presentValue,
    totalInvested: projection.totalInvested,
    estimatedGains: projection.estimatedGains,
  };

  const formatValue = (val: number) => {
    return val.toLocaleString('en-IN', {
      maximumFractionDigits: 0,
    });
  };

  const yearTabs = [1, 5, 10, 25];

  const handleCustomPress = () => {
    Alert.prompt(
      'Custom Horizon',
      'How many years do you want to forecast?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Set',
          onPress: (text: string | undefined) => {
            const val = parseInt(text || '');
            if (!isNaN(val) && val > 0 && val <= 100) {
              Haptics.selectionAsync();
              setYears(val);
              setActivePoint(null);
            }
          },
        },
      ],
      'plain-text',
      years.toString(),
      'number-pad',
    );
  };

  const isPredefined = yearTabs.includes(years);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: currColors.background }]}
      edges={['top', 'left', 'right']}
    >
      <View style={[styles.header, { backgroundColor: currColors.background }]}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: currColors.text }]}>
          Portfolio Forecast
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* DYNAMIC GRAPH UNIT */}
        <View style={{ marginBottom: 32 }}>
          {/* Header overlayed/integrated with graph */}
          <View style={[styles.graphStatsContainer, { marginBottom: 0 }]}>
            <View style={styles.headerTopRow}>
              <Text
                style={[styles.heroLabel, { color: currColors.textSecondary }]}
              >
                {activePoint
                  ? `PROJECTED BY ${currentYear + activePoint.year}`
                  : `PROJECTED BY ${currentYear + years}`}
              </Text>
              <View
                style={[
                  styles.multiplierBadge,
                  {
                    backgroundColor:
                      theme === 'dark'
                        ? 'rgba(255,255,255,0.1)'
                        : 'rgba(0, 122, 255, 0.1)',
                    borderColor:
                      theme === 'dark'
                        ? 'rgba(255,255,255,0.2)'
                        : 'rgba(0, 122, 255, 0.2)',
                    borderWidth: 1,
                  },
                ]}
              >
                <Text style={[styles.badgeText, { color: currColors.tint }]}>
                  {displayPoint.multiplier.toFixed(1)}x Growth
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.heroValue,
                {
                  color: currColors.text,
                  fontSize: 28,
                  marginBottom: 0,
                  letterSpacing: -1,
                },
              ]}
            >
              {isPrivacyMode
                ? '****'
                : `${showCurrencySymbol ? '₹' : ''}${formatValue(displayPoint.value)}`}
            </Text>

            <Text
              style={[
                styles.inflationNote,
                {
                  color: currColors.textSecondary,
                  textAlign: 'left',
                  opacity: 0.5,
                  fontSize: 12,
                },
              ]}
            >
              ≈ {showCurrencySymbol ? '₹' : ''}
              {formatValue(displayPoint.presentValue)} today
            </Text>
          </View>

          <View
            style={{ alignItems: 'center', marginTop: -25 }}
            onTouchEnd={() => {
              setTimeout(() => {
                Haptics.selectionAsync();
                setActivePoint(null);
              }, 50);
            }}
            onTouchCancel={() => {
              setActivePoint(null);
            }}
          >
            <LineChart
              key={years} // Force re-mount on horizon change
              data={calculateProjectionSeries(
                summary.totalValue,
                annualReturn,
                monthlySIP,
                years,
              ).map((p) => {
                const totalInvested =
                  summary.totalValue + monthlySIP * p.year * 12;
                return {
                  value: p.value,
                  label: '',
                  hideDataPoint: true,
                  year: p.year,
                  presentValue: p.value / Math.pow(1.06, p.year),
                  multiplier: p.value / totalInvested,
                  totalInvested: totalInvested,
                  estimatedGains: p.value - totalInvested,
                };
              })}
              width={Dimensions.get('window').width - 40}
              height={220}
              spacing={
                years > 0 ? (Dimensions.get('window').width - 80) / years : 0
              }
              initialSpacing={10}
              color={currColors.tint}
              thickness={2}
              startFillColor="rgba(0, 122, 255, 0.2)"
              endFillColor="rgba(0, 122, 255, 0.01)"
              startOpacity={0.9}
              endOpacity={0.2}
              areaChart
              hideRules
              hideYAxisText
              hideAxesAndRules
              curved
              isAnimated
              animationDuration={1200}
              pointerConfig={{
                pointerStripHeight: 160,
                pointerStripColor: currColors.textSecondary,
                pointerStripWidth: 2,
                pointerColor: currColors.textSecondary,
                radius: 6,
                activatePointersOnLongPress: false,
                autoAdjustPointerLabelPosition: false,
                pointerLabelComponent: (items: any) => {
                  if (!items || items.length === 0 || !items[0]) return null;
                  const item = items[0];
                  setTimeout(() => {
                    if (!activePoint || activePoint.year !== item.year) {
                      setActivePoint({
                        value: item.value,
                        year: item.year,
                        multiplier: item.multiplier,
                        presentValue: item.presentValue,
                        totalInvested: item.totalInvested,
                        estimatedGains: item.estimatedGains,
                      });
                    }
                  }, 0);
                  return null;
                },
              }}
            />
          </View>

          {/* YEAR TABS */}
          <View
            style={[
              styles.tabsContainer,
              {
                backgroundColor: currColors.card + '50',
                borderColor: currColors.border,
              },
            ]}
          >
            {yearTabs.map((y) => (
              <TouchableOpacity
                key={y}
                onPress={() => {
                  Haptics.selectionAsync();
                  setYears(y);
                  setActivePoint(null);
                }}
                style={[
                  styles.tabButton,
                  years === y && { backgroundColor: currColors.tint },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        years === y
                          ? theme === 'dark'
                            ? '#000'
                            : '#FFF'
                          : currColors.textSecondary,
                    },
                  ]}
                >
                  {y}Y
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={handleCustomPress}
              style={[
                styles.tabButton,
                !isPredefined && { backgroundColor: currColors.tint },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: !isPredefined
                      ? theme === 'dark'
                        ? '#000'
                        : '#FFF'
                      : currColors.textSecondary,
                  },
                ]}
              >
                {isPredefined ? 'Custom' : `${years}Y`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text
          style={[styles.sectionTitle, { color: currColors.textSecondary }]}
        >
          PROJECTION BREAKDOWN
        </Text>
        <View
          style={[
            styles.dataCard,
            {
              backgroundColor: currColors.card,
              borderColor: currColors.border,
            },
          ]}
        >
          <View style={styles.dataRow}>
            <Text
              style={[styles.dataLabel, { color: currColors.textSecondary }]}
            >
              Current Value
            </Text>
            <Text style={[styles.dataValue, { color: currColors.text }]}>
              {isPrivacyMode
                ? '****'
                : `${showCurrencySymbol ? '₹' : ''}${formatValue(summary.totalValue)}`}
            </Text>
          </View>
          <View style={styles.dataRow}>
            <Text
              style={[styles.dataLabel, { color: currColors.textSecondary }]}
            >
              Monthly Investment
            </Text>
            <Text style={[styles.dataValue, { color: currColors.text }]}>
              {isPrivacyMode
                ? '****'
                : `${showCurrencySymbol ? '₹' : ''}${formatValue(monthlySIP)}`}
            </Text>
          </View>
          <View
            style={[
              styles.horizontalDivider,
              { backgroundColor: currColors.border },
            ]}
          />
          <View style={styles.dataRow}>
            <Text
              style={[styles.dataLabel, { color: currColors.textSecondary }]}
            >
              Current XIRR
            </Text>
            <Text
              style={[
                styles.dataValue,
                { color: annualReturn < 0 ? '#F44336' : '#4CAF50' },
              ]}
            >
              {(annualReturn * 100).toFixed(2)}%
            </Text>
          </View>
          <View style={styles.dataRow}>
            <Text
              style={[styles.dataLabel, { color: currColors.textSecondary }]}
            >
              Total Invested Capital
            </Text>
            <Text style={[styles.dataValue, { color: currColors.text }]}>
              {isPrivacyMode
                ? '****'
                : `${showCurrencySymbol ? '₹' : ''}${formatValue(displayPoint.totalInvested)}`}
            </Text>
          </View>
          <View style={styles.dataRow}>
            <Text
              style={[styles.dataLabel, { color: currColors.textSecondary }]}
            >
              Est. Capital Gains
            </Text>
            <Text style={[styles.dataValue, { color: '#4CAF50' }]}>
              {isPrivacyMode
                ? '****'
                : `+${showCurrencySymbol ? '₹' : ''}${formatValue(displayPoint.estimatedGains)}`}
            </Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Info size={16} color={currColors.textSecondary} />
          <Text style={[styles.infoText, { color: currColors.textSecondary }]}>
            Projections are based on your current portfolio XIRR and average
            monthly investment. Past performance does not guarantee future
            results.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Outfit_600SemiBold',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  graphStatsContainer: {
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: 'Outfit_700Bold',
  },
  heroValue: {
    fontSize: 32,
    fontWeight: '400',
    marginBottom: 6,
    letterSpacing: -0.5,
    fontFamily: 'Outfit_400Regular',
  },
  multiplierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  inflationNote: {
    fontSize: 13,
    opacity: 0.8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    fontFamily: 'Outfit_500Medium',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginTop: -15,
    padding: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Outfit_600SemiBold',
  },
  dataCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    gap: 20,
    marginBottom: 32,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dataLabel: {
    fontSize: 13,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
  },
  dataValue: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0,
    fontFamily: 'Outfit_400Regular',
  },
  horizontalDivider: {
    height: 1,
    width: '100%',
    marginVertical: 4,
    opacity: 0.5,
  },
  verticalDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 24,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    marginTop: -8,
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
});
