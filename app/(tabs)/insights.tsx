import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { InsightCategory } from '@/hooks/useInsights';
import { useAiStore, AiInsight as Insight } from '@/store/useAiStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  CheckCircle,
  CircleArrowDown,
  Compass,
  Eye,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Zap,
  Sparkles,
  ChevronRight,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { SafeAreaView } from 'react-native-safe-area-context';

const IconMap: Record<string, any> = {
  TriangleAlert,
  TrendingUp,
  TrendingDown,
  CircleArrowDown,
  Zap,
  Compass,
  CheckCircle,
  Eye,
};

const CATEGORY_CONFIG: Record<
  InsightCategory,
  { color: string; emptyIcon: any; emptyTitle: string; emptyMessage: string; subtitle: string }
> = {
  Buy: {
    color: '#34C759',
    emptyIcon: CheckCircle,
    emptyTitle: 'No Buy Signals',
    emptyMessage:
      'No significant buy or accumulation opportunities detected for your holdings right now.',
    subtitle: 'STOCKS TO BUY MORE & ACCUMULATE',
  },
  Sell: {
    color: '#FF3B30',
    emptyIcon: CheckCircle,
    emptyTitle: 'No Sell Signals',
    emptyMessage:
      "No positions flagged for trimming, stop-loss, or exit. You're holding strong.",
    subtitle: 'POSITIONS TO TRIM OR EXIT',
  },
  Hold: {
    color: '#FF9500',
    emptyIcon: CheckCircle,
    emptyTitle: 'No Hold Signals',
    emptyMessage:
      'No positions currently categorized as core compounders to hold without adjustments.',
    subtitle: 'CORE COMPOUNDERS TO HOLD',
  },
  'Not Sure': {
    color: '#007AFF',
    emptyIcon: Eye,
    emptyTitle: 'Nothing Uncertain',
    emptyMessage:
      'No ambiguous signals detected. All positions currently have clear directional conviction.',
    subtitle: 'POSITIONS TO WATCH & OBSERVE',
  },
};

import { useAppModeStore } from '@/store/useAppModeStore';
import MoneyInsightsScreen from '../money-insights';

function PortfolioInsightsScreen() {
  const router = useRouter();
  const theme = useColorScheme() ?? 'dark';
  const currColors = Colors[theme];
  const { geminiApiKey, selectedModel, aiStockInsights, setAiStockInsights } = useAiStore();
  const getHoldingsData = usePortfolioStore((state) => state.getHoldingsData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<InsightCategory>('Buy');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate counts dynamically from AI stock insights
  const countByCategory = useMemo(() => {
    return {
      Buy: aiStockInsights.filter((i) => i.category === 'Buy').length,
      Sell: aiStockInsights.filter((i) => i.category === 'Sell').length,
      Hold: aiStockInsights.filter((i) => i.category === 'Hold').length,
      'Not Sure': aiStockInsights.filter((i) => i.category === 'Not Sure').length,
    };
  }, [aiStockInsights]);

  // Filter based on search query
  const filteredInsights = useMemo(() => {
    let result = aiStockInsights.filter((i) => i.category === activeTab);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(query) ||
          (i.symbol && i.symbol.toLowerCase().includes(query)) ||
          i.badge.toLowerCase().includes(query),
      );
    }
    return result;
  }, [aiStockInsights, activeTab, searchQuery]);

  const handleGenerateInsights = async () => {
    if (!geminiApiKey.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'API Key Required',
        'Please enter your Gemini Developer API Key under the Profile -> AI Chat settings panel first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Settings', onPress: () => router.push('/ai-chat') }
        ]
      );
      return;
    }

    const holdings = getHoldingsData();
    if (holdings.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'No Investment Positions',
        'Please log some buy/sell stock transactions first to let the AI analyze your portfolio.'
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsGenerating(true);

    try {
      const portfolioSummary = usePortfolioStore.getState().calculateSummary();
      const totalPortfolioVal = holdings.reduce(
        (sum: number, h: any) => sum + (h.currentValue || (h.quantity * h.avgPrice)),
        0
      );
      const totalInvestedVal = holdings.reduce(
        (sum: number, h: any) => sum + (h.investedValue || (h.quantity * h.avgPrice)),
        0
      );
      const totalPnl = totalPortfolioVal - totalInvestedVal;
      const totalPnlPct = totalInvestedVal > 0 ? (totalPnl / totalInvestedVal) * 100 : 0;

      // Serialize individual holdings with complete institutional metrics
      const serializedHoldings = holdings
        .map((h: any) => {
          const allocPct = h.contributionPercentage !== undefined 
            ? h.contributionPercentage 
            : (totalPortfolioVal > 0 ? ((h.currentValue || (h.quantity * h.avgPrice)) / totalPortfolioVal) * 100 : 0);
          const pnlPct = h.pnlPercentage !== undefined ? h.pnlPercentage : 0;
          const currentP = h.currentPrice || h.avgPrice;
          const highLow = (h.high52 && h.low52) ? `, 52W High: ₹${h.high52}, 52W Low: ₹${h.low52}` : '';
          const peStr = h.PE ? `, P/E: ${h.PE}` : '';
          const divStr = h.DividendYield ? `, Div Yield: ${h.DividendYield}%` : '';
          const sectorStr = h.sector ? `, Sector: ${h.sector}` : '';
          const dayStr = h.dayChangePercentage !== undefined ? `, Day Return: ${h.dayChangePercentage >= 0 ? '+' : ''}${h.dayChangePercentage.toFixed(2)}%` : '';

          return `- Ticker: ${h.symbol} (${h.companyName})
  Shares: ${h.quantity} | Avg Buy Price: ₹${h.avgPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })} | Current Market Price: ₹${currentP.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
  Total Invested: ₹${Math.round(h.investedValue || (h.quantity * h.avgPrice)).toLocaleString('en-IN')} | Current Value: ₹${Math.round(h.currentValue || (h.quantity * h.avgPrice)).toLocaleString('en-IN')}
  Unrealized PnL: ${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}% (₹${Math.round(h.pnl || (h.currentValue - h.investedValue) || 0).toLocaleString('en-IN')}) | Portfolio Weight: ${allocPct.toFixed(1)}%${sectorStr}${dayStr}${highLow}${peStr}${divStr}`;
        })
        .join('\n\n');

      const serializedPortfolio = `PORTFOLIO MACRO SNAPSHOT:
- Total Portfolio Value: ₹${Math.round(totalPortfolioVal).toLocaleString('en-IN')}
- Total Capital Invested: ₹${Math.round(totalInvestedVal).toLocaleString('en-IN')}
- Overall Portfolio Unrealized PnL: ${totalPnlPct >= 0 ? '+' : ''}${totalPnlPct.toFixed(2)}% (₹${Math.round(totalPnl).toLocaleString('en-IN')})
- Number of Active Holdings: ${holdings.length} stocks
- Portfolio XIRR: ${portfolioSummary.xirr ? `${portfolioSummary.xirr.toFixed(1)}%` : 'N/A'}`;

      const prompt = `You are Gainbase AI, an institutional-grade portfolio strategist and quantitative equity analyst.

${serializedPortfolio}

CURRENT PORTFOLIO POSITIONS (${holdings.length} Active Stocks):
${serializedHoldings}

CRITICAL MANDATORY REQUIREMENT - 100% FULL PORTFOLIO COVERAGE:
- The user has EXACTLY ${holdings.length} stocks in their portfolio.
- You MUST evaluate and return an insight for EVERY SINGLE ONE of the ${holdings.length} stocks listed above (${holdings.map((h: any) => h.symbol).join(', ')}).
- DO NOT SKIP, OMIT, MERGE, OR TRUNCATE ANY STOCK. Every stock ticker in the holdings list MUST have exactly one dedicated insight object in the returned JSON array.
- The returned JSON array MUST contain at least ${holdings.length} objects.

YOUR MISSION:
Rigorously categorize every single stock into the single best fitting category:

1. "Buy" -> WHICH STOCKS TO BUY MORE / ACCUMULATE / AVERAGE DOWN:
   - Stocks where technical pullbacks, valuation discounts, reasonable P/E, or low portfolio allocation (< 5-8%) make scaling up or averaging down attractive.
   - For fundamentally strong stocks experiencing a dip, explain why averaging down lowers cost basis.
   - Provide concrete buy triggers (e.g. "Accumulate on dips near ₹X", "Scale weight up from 3% to 8%").

2. "Sell" -> WHAT TO SELL / TRIM / TAKE PROFIT / STOP-LOSS:
   - Identify over-concentrated positions (> 18-25% portfolio weight) where trimming reduces drawdown risk.
   - Flag severe loss positions where fundamentals have deteriorated and stop-loss / tax-loss harvesting is prudent.
   - Flag overvalued holdings trading far above historical valuation ranges where taking partial profits locks in gains.

3. "Hold" -> WHAT TO HOLD & COMPOUND:
   - Core compounders and multi-bagger runners with healthy portfolio allocation (8-15%) that should remain untouched.
   - Quality dividend payers or market leaders with strong earnings momentum.
   - Explain why riding the secular trend without touching the position is optimal.

4. "Not Sure" -> WHAT TO OBSERVE & WATCH (Ambiguous / Crossroad Signals):
   - Positions where risk/reward is balanced or waiting for a catalyst (e.g. upcoming quarterly earnings, technical resistance/support test, cyclical turnarounds, sector rotation).
   - Explicitly tell the user WHAT SPECIFIC METRIC OR EVENT TO OBSERVE before deciding to Buy or Sell.

INSTRUCTIONS:
- Return a JSON array with an insight object for every holding in the portfolio.
- "id": unique string (e.g. "buy-tcs-1", "sell-reliance-1", "hold-infy-1", "watch-hdfc-1")
- "category": MUST be exactly one of: "Buy", "Sell", "Hold", "Not Sure"
- "symbol": exact stock ticker (e.g. "TCS", "RELIANCE") matching the portfolio holdings
- "title": full company name
- "badge": short 2-3 word highlight tag (e.g. "Accumulate on Dip", "Trim Concentration", "Core Compounder", "Watch Q2 Results", "Stop-Loss Alert", "Scale Position", "Ride the Trend")
- "value": quantitative metric highlight (e.g. "+38.4% Return", "24.5% Portfolio Weight", "-18.2% Drawdown", "P/E 21.4 (Cheap)", "Near 52W Low")
- "reason": 2-3 sentences of deep, objective, institutional-grade rationale explaining the exact decision for this specific stock.
- "color": Buy is "#34C759", Sell is "#FF3B30", Hold is "#FF9500", Not Sure is "#007AFF"
- "icon": Buy is "TrendingUp" or "Zap", Sell is "TrendingDown" or "TriangleAlert", Hold is "TrendingUp" or "CheckCircle", Not Sure is "Eye" or "Compass"`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              maxOutputTokens: 8192,
              responseSchema: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    id: { type: 'STRING' },
                    category: { type: 'STRING', enum: ['Buy', 'Sell', 'Hold', 'Not Sure'] },
                    title: { type: 'STRING' },
                    badge: { type: 'STRING' },
                    value: { type: 'STRING' },
                    reason: { type: 'STRING' },
                    color: { type: 'STRING' },
                    icon: { type: 'STRING' },
                    symbol: { type: 'STRING' },
                  },
                  required: ['id', 'category', 'title', 'badge', 'value', 'reason', 'color', 'icon'],
                },
              },
            },
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const parsedInsights = JSON.parse(data.candidates[0].content.parts[0].text);
        
        const insightsMap = new Map<string, any>();
        parsedInsights.forEach((insight: any) => {
          if (insight.symbol) {
            insightsMap.set(insight.symbol.toUpperCase().trim(), insight);
          }
        });

        // Ensure 100% of holdings are covered: for any holding omitted, synthesize an intelligent fallback
        const completeInsights: any[] = [];
        
        holdings.forEach((h: any) => {
          const sym = (h.symbol || '').toUpperCase().trim();
          const existing = insightsMap.get(sym);
          if (existing) {
            completeInsights.push({
              ...existing,
              logo: h.logo || existing.logo || null,
            });
            insightsMap.delete(sym);
          } else {
            const pnl = h.pnlPercentage ?? 0;
            const alloc = h.contributionPercentage ?? 0;
            let cat: InsightCategory = 'Hold';
            let badge = 'Core Compounder';
            let color = '#FF9500';
            let icon = 'TrendingUp';
            let reason = `Holding ${h.companyName} as a long-term compounder. Core business thesis is stable.`;
            let value = `${pnl >= 0 ? '+' : ''}${pnl.toFixed(1)}% PnL`;

            if (alloc > 20) {
              cat = 'Sell';
              badge = 'High Concentration';
              color = '#FF3B30';
              icon = 'TriangleAlert';
              reason = `Makes up ${alloc.toFixed(1)}% of your total portfolio. Consider trimming to mitigate concentration volatility.`;
              value = `${alloc.toFixed(1)}% Weight`;
            } else if (pnl < -15) {
              cat = 'Sell';
              badge = 'Stop-Loss Alert';
              color = '#FF3B30';
              icon = 'TrendingDown';
              reason = `Down ${Math.abs(pnl).toFixed(1)}% from cost basis. Review fundamentals to determine if tax-loss harvesting is suitable.`;
            } else if (pnl < -5 || (h.low52 && h.currentPrice <= h.low52 * 1.05)) {
              cat = 'Buy';
              badge = 'Accumulate on Dip';
              color = '#34C759';
              icon = 'TrendingUp';
              reason = `Trading at an attractive valuation pullback (${pnl.toFixed(1)}%). Favorable risk/reward to average down.`;
            } else if (alloc < 4) {
              cat = 'Buy';
              badge = 'Scale Position';
              color = '#34C759';
              icon = 'Zap';
              reason = `Currently under-allocated at only ${alloc.toFixed(1)}% of your portfolio. Room to scale up weight.`;
              value = `${alloc.toFixed(1)}% Weight`;
            } else if (h.high52 && h.currentPrice >= h.high52 * 0.97) {
              cat = 'Not Sure';
              badge = 'Watch Breakout';
              color = '#007AFF';
              icon = 'Eye';
              reason = `Trading near 52-week highs. Observe technical price action for confirmation before adding more.`;
              value = `Near 52W High`;
            }

            completeInsights.push({
              id: `ai-${sym.toLowerCase()}-${Date.now()}`,
              category: cat,
              symbol: h.symbol,
              title: h.companyName || h.symbol,
              badge,
              value,
              reason,
              color,
              icon,
              logo: h.logo || null,
            });
          }
        });

        // Also append any remaining macroeconomic / multi-stock insights
        insightsMap.forEach((remainingInsight) => {
          completeInsights.push(remainingInsight);
        });

        setAiStockInsights(completeInsights);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const errorMsg = data.error?.message || 'Failed to generate insights. Check settings.';
        Alert.alert('AI Error', errorMsg);
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Connection Error', 'Request failed. Check internet settings.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderInsightItem = (insight: Insight) => {
    const IconComponent = IconMap[insight.icon] || Zap;
    const isClickable = !!insight.symbol;
    const isDark = theme === 'dark';
    const cardBgColor = isDark ? `${insight.color}0D` : `${insight.color}06`;
    const cardBorderColor = isDark ? `${insight.color}25` : `${insight.color}1A`;

    return (
      <TouchableOpacity
        key={insight.id}
        activeOpacity={isClickable ? 0.75 : 1}
        disabled={!isClickable}
        style={[
          styles.insightCard,
          {
            backgroundColor: cardBgColor,
            borderColor: cardBorderColor,
          },
        ]}
        onPress={() => {
          if (insight.symbol) {
            handleHaptic();
            router.push(`/stock-details/${insight.symbol}`);
          }
        }}
      >
        {/* Card Header: Logo/Icon + Title/Ticker + Badge/Value */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeaderLeft}>
            {insight.logo ? (
              <View style={[styles.logoWrap, { backgroundColor: '#FFFFFF' }]}>
                <Image
                  source={{ uri: insight.logo }}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={[styles.iconWrap, { backgroundColor: `${insight.color}15` }]}>
                <IconComponent size={20} color={insight.color} />
              </View>
            )}
            <View style={styles.titleColumn}>
              <ThemedText style={[styles.companyName, { color: currColors.text }]} numberOfLines={1}>
                {insight.title}
              </ThemedText>
              {insight.symbol ? (
                <ThemedText style={[styles.symbolTicker, { color: currColors.textSecondary }]}>
                  {insight.symbol}
                </ThemedText>
              ) : null}
            </View>
          </View>

          {/* Badges Column */}
          <View style={styles.badgeColumn}>
            <View style={[styles.badgePill, { backgroundColor: `${insight.color}15` }]}>
              <ThemedText style={[styles.badgeText, { color: insight.color }]}>
                {insight.badge}
              </ThemedText>
            </View>
            {insight.value ? (
              <View style={[styles.valuePill, { backgroundColor: currColors.cardSecondary }]}>
                <ThemedText style={[styles.valueText, { color: currColors.text }]}>
                  {insight.value}
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>

        {/* Reason / Analysis Body */}
        <ThemedText style={[styles.reasonText, { color: currColors.text }]}>
          {insight.reason}
        </ThemedText>

        {/* Action Link Footer if clickable */}
        {isClickable ? (
          <View style={[styles.cardFooterRow, { borderTopColor: currColors.border }]}>
            <ThemedText style={[styles.cardFooterText, { color: insight.color }]}>
              View Holding & Transactions
            </ThemedText>
            <ChevronRight size={14} color={insight.color} />
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    const config = CATEGORY_CONFIG[activeTab];
    const EmptyIcon = config.emptyIcon;
    return (
      <View style={styles.emptyState}>
        <View
          style={[
            styles.emptyIconCircle,
            { backgroundColor: `${config.color}18` },
          ]}
        >
          <EmptyIcon size={32} color={config.color} />
        </View>
        <ThemedText style={[styles.emptyTitle, { color: currColors.text }]}>
          {config.emptyTitle}
        </ThemedText>
        <ThemedText
          style={[styles.emptyMessage, { color: currColors.textSecondary }]}
        >
          {config.emptyMessage}
        </ThemedText>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: currColors.background }]}
      edges={['top']}
    >
      {aiStockInsights.length === 0 ? (
        <View style={styles.aiHeroContainer}>
          <View style={[styles.aiHeroCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <View style={[styles.sparkleIconOuter, { backgroundColor: 'rgba(10, 132, 255, 0.1)' }]}>
              <Sparkles size={36} color="#0A84FF" />
            </View>
            <ThemedText style={styles.aiHeroTitle}>AI Portfolio Insights</ThemedText>
            <ThemedText style={[styles.aiHeroSubtitle, { color: currColors.textSecondary }]}>
              Let Gainbase AI analyze your current stock allocations, buys/sells, and sector distributions. It highlights major opportunities, stop-losses, and watch signals based on your actual holdings.
            </ThemedText>

            <TouchableOpacity
              style={[styles.aiHeroBtn, { backgroundColor: '#007AFF' }]}
              onPress={handleGenerateInsights}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color="#FFF" />
                  <ThemedText style={styles.aiHeroBtnText}>Analyzing Portfolio...</ThemedText>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={16} color="#FFF" />
                  <ThemedText style={styles.aiHeroBtnText}>Generate with AI</ThemedText>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          {/* Search Header */}
          <View style={styles.header}>
            <View style={styles.searchContainerOuter}>
              <View
                style={[
                  styles.searchContainer,
                  { backgroundColor: currColors.card },
                ]}
              >
                <Ionicons
                  name="search"
                  size={20}
                  color={currColors.textSecondary}
                  style={styles.searchIcon}
                />
                <TextInput
                  style={[styles.searchInput, { color: currColors.text }]}
                  placeholder="Search insights"
                  placeholderTextColor={currColors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    style={styles.clearButton}
                  >
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={currColors.textSecondary}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Category Tabs with Count Badges */}
          <View style={styles.tabContainer}>
            {(['Buy', 'Sell', 'Hold', 'Not Sure'] as InsightCategory[]).map((tab) => {
              const isActive = activeTab === tab;
              const tabColor = CATEGORY_CONFIG[tab].color;
              const tabCount = countByCategory[tab];
              return (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tab,
                    {
                      backgroundColor: isActive ? tabColor : 'transparent',
                      borderColor: isActive
                        ? tabColor
                        : theme === 'dark'
                          ? '#3A3A3C'
                          : currColors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveTab(tab);
                  }}
                >
                  <ThemedText
                    style={[
                      styles.tabText,
                      { color: isActive ? '#FFF' : currColors.textSecondary },
                    ]}
                  >
                    {tab}
                  </ThemedText>
                  {tabCount > 0 && (
                    <View
                      style={[
                        styles.tabBadge,
                        {
                          backgroundColor: isActive
                            ? 'rgba(255,255,255,0.3)'
                            : `${tabColor}30`,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.tabBadgeText,
                          { color: isActive ? '#FFF' : tabColor },
                        ]}
                      >
                        {tabCount}
                      </ThemedText>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 4 }}>
              <ThemedText style={styles.sectionLabel}>
                {CATEGORY_CONFIG[activeTab]?.subtitle || `${activeTab.toUpperCase()} SIGNALS`}
              </ThemedText>
              
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                onPress={handleGenerateInsights}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color="#0A84FF" />
                ) : (
                  <>
                    <Sparkles size={11} color="#0A84FF" />
                    <ThemedText style={{ fontSize: 10, fontFamily: 'Outfit_600SemiBold', color: '#0A84FF' }}>REFRESH</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {filteredInsights.length > 0 ? (
              <View style={styles.listContainer}>
                {filteredInsights.map((insight) =>
                  renderInsightItem(insight),
                )}
              </View>
            ) : (
              renderEmptyState()
            )}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

export default function InsightsScreen() {
  const { activeMode } = useAppModeStore();

  if (activeMode === 'money') {
    return <MoneyInsightsScreen />;
  }

  return <PortfolioInsightsScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 10,
  },
  searchContainerOuter: {
    paddingHorizontal: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
    fontFamily: 'Outfit_400Regular',
  },
  clearButton: {
    padding: 4,
  },
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
  },
  // Scroll
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionLabel: {
    color: '#8E8E93',
    fontSize: 10,
    fontFamily: 'Outfit_500Medium',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  listContainer: {
    marginTop: 4,
  },
  // Insight card
  insightCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  logoWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    padding: 2,
  },
  logoImage: {
    width: 34,
    height: 34,
    borderRadius: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  titleColumn: {
    flex: 1,
  },
  companyName: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  symbolTicker: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
    marginTop: 1,
  },
  badgeColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 0.3,
  },
  valuePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  valueText: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
  },
  reasonText: {
    fontSize: 13.5,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 20,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
    paddingTop: 10,
  },
  cardFooterText: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
  },
  // Empty state
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 13.5,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  aiHeroContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  aiHeroCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  aiHeroTitle: {
    fontSize: 20,
    fontFamily: 'Outfit_600SemiBold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  aiHeroSubtitle: {
    fontSize: 13.5,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  aiHeroBtn: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiHeroBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  sparkleIconOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
