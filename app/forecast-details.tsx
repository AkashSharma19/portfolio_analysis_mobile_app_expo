import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { calculateProjectionSeries, formatIndianNumber } from '@/lib/finance';

import { usePortfolioStore } from '@/store/usePortfolioStore';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { BackButton } from '@/components/BackButton';
import { Target, TrendingUp, Calculator } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  TextInput,
  Switch,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LineChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ForecastDetailsScreen() {
  const router = useRouter();
  const theme = useColorScheme() ?? 'dark';
  const c = Colors[theme];

  const calculateSummary = usePortfolioStore((state) => state.calculateSummary);
  const getYearlyAnalysis = usePortfolioStore((state) => state.getYearlyAnalysis);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);
  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const transactions = usePortfolioStore((state) => state.transactions);
  const tickers = usePortfolioStore((state) => state.tickers);
  
  // Forecast States from Store
  const years = usePortfolioStore((state) => state.forecastYears);
  const setYears = usePortfolioStore((state) => state.setForecastYears);
  const targetGoal = usePortfolioStore((state) => state.targetCorpus);
  const setTargetGoal = usePortfolioStore((state) => state.setTargetCorpus);
  const sipStepUp = usePortfolioStore((state) => state.sipStepUp);
  const setSipStepUp = usePortfolioStore((state) => state.setSipStepUp);
  const manualMonthlySIP = usePortfolioStore((state) => state.manualMonthlySIP);
  const setManualMonthlySIP = usePortfolioStore((state) => state.setManualMonthlySIP);
  const isInflationAdjusted = usePortfolioStore((state) => state.isInflationAdjusted);
  const setIsInflationAdjusted = usePortfolioStore((state) => state.setIsInflationAdjusted);

  const [tempGoal, setTempGoal] = useState(targetGoal.toString());

  const formatShorthand = (numStr: string) => {
    const num = parseInt(numStr.replace(/[^0-9]/g, ''));
    if (isNaN(num) || num < 10000) return '';
    
    if (num >= 10000000) {
      const cr = num / 10000000;
      return `(${cr % 1 === 0 ? cr : cr.toFixed(2)}Cr)`;
    }
    if (num >= 100000) {
      const l = num / 100000;
      return `(${l % 1 === 0 ? l : l.toFixed(2)}L)`;
    }
    if (num >= 10000) {
      const k = num / 1000;
      return `(${k % 1 === 0 ? k : k.toFixed(1)}K)`;
    }
    return '';
  };

  const summary = useMemo(() => calculateSummary(), [transactions, tickers]);
  const yearlyAnalysis = useMemo(() => getYearlyAnalysis(), [transactions, tickers]);

  const xirr = useMemo(() => (summary.xirr || 0) / 100, [summary.xirr]);
  
  const calculatedMonthlySIP = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentYearData = yearlyAnalysis.find(a => a.year === currentYear);
    return currentYearData ? currentYearData.averageMonthlyInvestment : 0;
  }, [yearlyAnalysis]);

  const monthlySIP = manualMonthlySIP !== null ? manualMonthlySIP : calculatedMonthlySIP;

  const handleManualSIPChange = (val: string) => {
    const num = parseInt(val.replace(/[^0-9]/g, ''));
    if (!isNaN(num)) {
      setManualMonthlySIP(num);
    } else {
      setManualMonthlySIP(null);
    }
  };

  const handleGoalChange = (val: string) => {
    const num = parseInt(val.replace(/[^0-9]/g, ''));
    if (!isNaN(num)) setTargetGoal(num);
  };

  // Base Case data generation (Always Nominal for the main chart)
  const chartData = useMemo(() => {
    const data = calculateProjectionSeries(
      summary.totalValue,
      xirr,
      monthlySIP,
      years,
      sipStepUp,
      0.06,
      false // Always nominal
    );
    
    return data.map(p => ({
      value: p.value,
      label: '',
      year: p.year,
      data: p,
    }));
  }, [summary.totalValue, xirr, monthlySIP, years, sipStepUp]);

  // Calculate Goal Milestone
  const goalYear = useMemo(() => {
    const baseData = calculateProjectionSeries(summary.totalValue, xirr, monthlySIP, 100, sipStepUp, 0.06, false);
    const reachYear = baseData.find(p => p.value >= targetGoal);
    return reachYear ? reachYear.year : null;
  }, [summary.totalValue, xirr, monthlySIP, targetGoal, sipStepUp]);


  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: c.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: c.background }]}>
        <BackButton />
        <ThemedText style={[styles.headerTitle, { color: c.text }]}>Portfolio Forecast</ThemedText>
        <View style={{ width: 40 }} /> 
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false} 
        bounces={false}
        overScrollMode="never"
      >
        
        {/* TOP STATUS - GOAL PROGRESS */}
        <View style={[styles.goalHeader, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.goalTop}>
            <View>
              <ThemedText style={[styles.tinyLabel, { color: c.textSecondary }]}>TARGET MILESTONE</ThemedText>
              <View style={[styles.inlineInputGroup, { borderBottomWidth: 1, borderBottomColor: c.border }]}>
                <ThemedText style={[styles.goalTitle, { color: c.textSecondary, marginRight: 2 }]}>₹</ThemedText>
                <TextInput
                  style={[styles.goalTitle, { color: c.text, padding: 0 }]}
                  keyboardType="numeric"
                  value={tempGoal}
                  onChangeText={setTempGoal}
                  onEndEditing={(e) => {
                    handleGoalChange(e.nativeEvent.text);
                    setTempGoal(e.nativeEvent.text);
                  }}
                />
                <ThemedText style={[styles.shorthandText, { color: c.tint }]}>
                  {formatShorthand(tempGoal)}
                </ThemedText>
              </View>
            </View>
            <View style={[styles.etaBadge, { backgroundColor: goalYear ? '#4CAF5022' : c.cardSecondary }]}>
              <Target size={14} color={goalYear ? '#4CAF50' : c.textSecondary} />
              <ThemedText style={[styles.etaText, { color: goalYear ? '#4CAF50' : c.textSecondary }]}>
                {goalYear ? `ETA: ${new Date().getFullYear() + goalYear}` : 'Out of Reach'}
              </ThemedText>
            </View>
          </View>
          
          <View style={[styles.progressTrack, { backgroundColor: c.cardSecondary }]}>
            <View style={[styles.progressFill, { 
              width: `${Math.min(100, (summary.totalValue / targetGoal) * 100)}%`,
              backgroundColor: c.tint 
            }]} />
          </View>
          <ThemedText style={[styles.progressText, { color: c.textSecondary }]}>
            {((summary.totalValue / targetGoal) * 100).toFixed(1)}% ({isPrivacyMode ? '****' : formatIndianNumber(summary.totalValue)}) of your goal reached today
          </ThemedText>
        </View>

        {/* HERO PROJECTION UNIT */}
        <View style={styles.heroUnit}>
          <View style={styles.heroRow}>
            <View>
              <ThemedText style={[styles.tinyLabel, { color: c.textSecondary }]}>
                PROJECTED VAL (+{years}Y)
              </ThemedText>
              <ThemedText style={[styles.heroValue, { color: c.text }]}>
                {isPrivacyMode ? '****' : formatIndianNumber(chartData[years]?.value || 0)}
              </ThemedText>
              <View style={styles.inflationTag}>
                <TrendingUp size={12} color="#5AC8FA" />
                <ThemedText style={styles.inflationTagText}>
                  ~ {isPrivacyMode ? '****' : formatIndianNumber((chartData[years]?.value || 0) / Math.pow(1.06, years))} in today's value
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.chartContainer}>
            <LineChart
              data={chartData}
              width={SCREEN_WIDTH - 40}
              height={220}
              spacing={(SCREEN_WIDTH - 60) / years}
              initialSpacing={10}
              color={c.tint}
              thickness={3}
              startFillColor={c.tint + '33'}
              endFillColor="transparent"
              startOpacity={0.4}
              endOpacity={0.1}
              areaChart
              hideRules
              hideYAxisText
              hideAxesAndRules
              curved
              isAnimated
              animationDuration={800}
              disableScroll={true}
            />
          </View>
        </View>

        {/* SIP STEP UP TABS */}
        <View style={styles.horizonSection}>
          <ThemedText style={[styles.tinyLabel, { color: c.textSecondary, marginBottom: 12 }]}>ANNUAL SIP STEP-UP</ThemedText>
          <View style={[styles.tabsContainer, { backgroundColor: c.card, borderColor: c.border }]}>
            {[0, 5, 10, 15, 20].map((val) => (
              <TouchableOpacity
                key={val}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSipStepUp(val);
                }}
                style={[styles.tabButton, sipStepUp === val && { backgroundColor: c.tint }]}
              >
                <ThemedText style={[styles.tabText, { color: sipStepUp === val ? '#000' : c.textSecondary }]}>{val}%</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* TIME HORIZON TABS */}
        <View style={styles.horizonSection}>
          <ThemedText style={[styles.tinyLabel, { color: c.textSecondary, marginBottom: 12 }]}>FORECAST HORIZON</ThemedText>
          <View style={[styles.tabsContainer, { backgroundColor: c.card, borderColor: c.border }]}>
            {[5, 10, 15, 25, 40].map((y) => (
              <TouchableOpacity
                key={y}
                onPress={() => {
                  Haptics.selectionAsync();
                  setYears(y);
                }}
                style={[styles.tabButton, years === y && { backgroundColor: c.tint }]}
              >
                <ThemedText style={[styles.tabText, { color: years === y ? '#000' : c.textSecondary }]}>{y}Y</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* PROJECTION BREAKDOWN */}
        <ThemedText style={[styles.tinyLabel, { color: c.textSecondary, marginBottom: 12, marginLeft: 4 }]}>PROJECTION BREAKDOWN</ThemedText>
        <View style={[styles.dataCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.dataRow}>
            <ThemedText style={[styles.dataLabel, { color: c.textSecondary }]}>Current Value</ThemedText>
            <ThemedText style={[styles.dataValue, { color: c.text }]}>
              {isPrivacyMode ? '****' : formatIndianNumber(summary.totalValue)}
            </ThemedText>
          </View>
          <View style={styles.dataRow}>
            <ThemedText style={[styles.dataLabel, { color: c.textSecondary }]}>Monthly Investment</ThemedText>
            <ThemedText style={[styles.dataValue, { color: c.text }]}>
              {isPrivacyMode ? '****' : formatIndianNumber(monthlySIP)}
            </ThemedText>
          </View>
          <View style={styles.dataRow}>
            <ThemedText style={[styles.dataLabel, { color: c.textSecondary }]}>Current Portfolio XIRR</ThemedText>
            <ThemedText style={[styles.dataValue, { color: c.text }]}>
              {(xirr * 100).toFixed(2)}%
            </ThemedText>
          </View>
          <View style={styles.dividerMini} />
          <View style={styles.dataRow}>
            <ThemedText style={[styles.dataLabel, { color: c.textSecondary }]}>Total Invested Capital</ThemedText>
            <ThemedText style={[styles.dataValue, { color: c.text }]}>
              {isPrivacyMode ? '****' : formatIndianNumber(chartData[years]?.data?.totalInvested || 0)}
            </ThemedText>
          </View>
          <View style={styles.dataRow}>
            <ThemedText style={[styles.dataLabel, { color: c.textSecondary }]}>Est. Capital Gains</ThemedText>
            <ThemedText style={[styles.dataValue, { color: '#4CAF50' }]}>
              {isPrivacyMode ? '****' : `+${formatIndianNumber(chartData[years]?.data?.estimatedGains || 0)}`}
            </ThemedText>
          </View>
        </View>

        {/* DISCLAIMER */}
        <View style={styles.disclaimerBox}>
          <Calculator size={14} color={c.textSecondary} />
          <ThemedText style={[styles.disclaimerText, { color: c.textSecondary }]}>
            Calculations are based on monthly compounding. Goal ETA assumes returns align with your Base scenario. 
            Past performance is not a guarantee of future returns.
          </ThemedText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  scrollContent: { padding: 20, paddingBottom: 60 },
  goalHeader: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 24,
  },
  goalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  tinyLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  goalTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  inlineInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  shorthandText: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 6,
    opacity: 0.8,
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  etaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
  },
  heroUnit: {
    marginBottom: 32,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  heroValue: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  activePointIndicator: {
    alignItems: 'flex-end',
  },
  activeYear: {
    fontSize: 18,
    fontWeight: '700',
  },
  inflationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  inflationTagText: {
    fontSize: 12,
    color: '#5AC8FA',
    fontWeight: '600',
  },
  chartContainer: {
    alignItems: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    width: '100%',
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '700',
  },
  controlsCard: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 32,
  },
  controlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  controlTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    opacity: 0.6,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputValueDisplay: {
    fontSize: 14,
    fontWeight: '700',
  },
  textInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabMini: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabMiniText: {
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(120,120,128,0.1)',
    marginVertical: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabelGroup: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    flex: 1,
  },
  toggleDesc: {
    fontSize: 12,
    opacity: 0.6,
  },
  horizonSection: {
    marginBottom: 32,
  },
  tabsContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  disclaimerBox: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
    fontStyle: 'italic',
  },
  dataCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    gap: 16,
    marginBottom: 20,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dataLabel: {
    fontSize: 13,
    fontWeight: '400',
  },
  dataValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  dividerMini: {
    height: 1,
    backgroundColor: 'rgba(120,120,128,0.08)',
    marginVertical: 4,
  },
});
