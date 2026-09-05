import { useMemo } from 'react';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { useAiStore, AiInsight } from '@/store/useAiStore';

export type InsightCategory = 'Buy' | 'Sell' | 'Hold' | 'Not Sure';

export interface Insight {
  id: string;
  category: InsightCategory;
  title: string; // Company name
  subtitle?: string; // Invested value or context
  reason: string; // Actionable explanation WHY this insight was triggered
  badge: string; // Short label for insight type (e.g. "High Concentration")
  icon: string;
  symbol?: string;
  logo?: string;
  value: string; // Specific metric (e.g. "31.4% of portfolio")
  color: string;
  pnlPercentage?: number;
  severity?: number; // Higher = more urgent, used for sorting within a tab
}

export const useInsights = () => {
  const aiStockInsights = useAiStore((state) => state.aiStockInsights);
  const getHoldingsData = usePortfolioStore((state) => state.getHoldingsData);
  const transactions = usePortfolioStore((state) => state.transactions);
  const tickers = usePortfolioStore((state) => state.tickers);
  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const showCurrencySymbol = usePortfolioStore(
    (state) => state.showCurrencySymbol,
  );

  const holdings = useMemo(
    () => getHoldingsData(),
    [getHoldingsData, transactions, tickers],
  );

  const formatCurrency = (value: number) => {
    return `${showCurrencySymbol ? '₹' : ''}${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const insights = useMemo(() => {
    // If AI has generated active stock insights, use them as primary source of truth
    if (aiStockInsights && aiStockInsights.length > 0) {
      return aiStockInsights as Insight[];
    }

    const list: Insight[] = [];
    const addedSymbolsPerCategory = new Map<InsightCategory, Set<string>>();

    const canAdd = (category: InsightCategory, symbol?: string) => {
      if (!symbol) return true;
      if (!addedSymbolsPerCategory.has(category)) {
        addedSymbolsPerCategory.set(category, new Set());
      }
      return !addedSymbolsPerCategory.get(category)!.has(symbol);
    };

    const markAdded = (category: InsightCategory, symbol?: string) => {
      if (!symbol) return;
      if (!addedSymbolsPerCategory.has(category)) {
        addedSymbolsPerCategory.set(category, new Set());
      }
      addedSymbolsPerCategory.get(category)!.add(symbol);
    };

    if (holdings.length === 0) return list;

    // ─── SELL ─────────────────────────────────────────────────────────────────

    // Sell: High Concentration (>25% of portfolio)
    holdings.forEach((h) => {
      if ((h.contributionPercentage ?? 0) > 25) {
        list.push({
          id: `concentration-${h.symbol}`,
          category: 'Sell',
          title: h.companyName || h.symbol,
          subtitle: `Invested: ${formatCurrency(h.investedValue)}`,
          reason: `This stock makes up ${(h.contributionPercentage ?? 0).toFixed(1)}% of your portfolio. Consider trimming to reduce concentration risk.`,
          badge: 'High Concentration',
          symbol: h.symbol,
          logo: h.logo,
          icon: 'TriangleAlert',
          value: `${(h.contributionPercentage ?? 0).toFixed(1)}% holding`,
          color: '#FF3B30',
          pnlPercentage: h.pnlPercentage,
          severity: h.contributionPercentage ?? 0,
        });
        markAdded('Sell', h.symbol);
      }
    });

    // Hold: Profit Taking (PnL > 30%)
    holdings.forEach((h) => {
      if (h.pnlPercentage > 30 && canAdd('Hold', h.symbol)) {
        list.push({
          id: `profit-${h.symbol}`,
          category: 'Hold',
          title: h.companyName || h.symbol,
          subtitle: `Current Value: ${formatCurrency(h.currentValue)}`,
          reason: `Up ${h.pnlPercentage.toFixed(1)}% from your average buy price. Excellent core compounder to hold for long-term compounding.`,
          badge: 'Core Compounder',
          symbol: h.symbol,
          logo: h.logo,
          icon: 'TrendingUp',
          value: `+${h.pnlPercentage.toFixed(1)}% gain`,
          color: '#FF9500',
          pnlPercentage: h.pnlPercentage,
          severity: h.pnlPercentage,
        });
        markAdded('Hold', h.symbol);
      }
    });

    // Sell: Tax-Loss Harvesting (PnL < -15%)
    holdings.forEach((h) => {
      if (h.pnlPercentage < -15 && (h.contributionPercentage ?? 0) < 15) {
        if (canAdd('Sell', h.symbol)) {
          list.push({
            id: `tax-loss-${h.symbol}`,
            category: 'Sell',
            title: h.companyName || h.symbol,
            subtitle: `Invested: ${formatCurrency(h.investedValue)}`,
            reason: `Down ${Math.abs(h.pnlPercentage).toFixed(1)}% overall. Consider harvesting tax losses or exiting if investment thesis has broken.`,
            badge: 'Tax-Loss Harvest',
            symbol: h.symbol,
            logo: h.logo,
            icon: 'CircleArrowDown',
            value: `${h.pnlPercentage.toFixed(1)}% loss`,
            color: '#FF3B30',
            pnlPercentage: h.pnlPercentage,
            severity: Math.abs(h.pnlPercentage),
          });
          markAdded('Sell', h.symbol);
        }
      }
    });

    // ─── BUY ──────────────────────────────────────────────────────────────────

    // Buy: DCA Opportunity (PnL < -10%)
    holdings.forEach((h) => {
      if (h.pnlPercentage < -10 && canAdd('Buy', h.symbol)) {
        const distFromAvg = Math.abs(h.pnlPercentage);
        list.push({
          id: `dca-${h.symbol}`,
          category: 'Buy',
          title: h.companyName || h.symbol,
          subtitle: `Avg Buy: ${formatCurrency(h.avgPrice)}`,
          reason: `Trading ${distFromAvg.toFixed(1)}% below your average cost basis. Potential opportunity to average down on quality.`,
          badge: 'Accumulate on Dip',
          symbol: h.symbol,
          logo: h.logo,
          icon: 'TrendingUp',
          value: `${h.pnlPercentage.toFixed(1)}% below avg`,
          color: '#34C759',
          pnlPercentage: h.pnlPercentage,
          severity: distFromAvg,
        });
        markAdded('Buy', h.symbol);
      }
    });

    // Buy: Near 52W Low (within 3% of low)
    holdings.forEach((h) => {
      if (
        h.low52 &&
        h.currentPrice <= h.low52 * 1.03 &&
        canAdd('Buy', h.symbol)
      ) {
        const pctAboveLow = ((h.currentPrice - h.low52) / h.low52) * 100;
        list.push({
          id: `low52-${h.symbol}`,
          category: 'Buy',
          title: h.companyName || h.symbol,
          subtitle: `52W Low: ${formatCurrency(h.low52)}`,
          reason: `Trading only ${pctAboveLow.toFixed(1)}% above its 52-week low. Attractive long-term risk/reward accumulation level.`,
          badge: 'Near 52W Low',
          symbol: h.symbol,
          logo: h.logo,
          icon: 'Zap',
          value: `${pctAboveLow.toFixed(1)}% above low`,
          color: '#34C759',
          pnlPercentage: h.pnlPercentage,
          severity: 3 - pctAboveLow,
        });
        markAdded('Buy', h.symbol);
      }
    });

    // ─── NOT SURE / OBSERVE ───────────────────────────────────────────────────

    // Not Sure: Near 52W High (within 2% of high)
    holdings.forEach((h) => {
      if (h.high52 && h.currentPrice >= h.high52 * 0.98) {
        const pctBelowHigh = ((h.high52 - h.currentPrice) / h.high52) * 100;
        list.push({
          id: `high52-${h.symbol}`,
          category: 'Not Sure',
          title: h.companyName || h.symbol,
          subtitle: `52W High: ${formatCurrency(h.high52)}`,
          reason: `Trading ${pctBelowHigh.toFixed(1)}% below its 52-week high. Observe price action for breakout confirmation before adding.`,
          badge: 'Watch Breakout',
          symbol: h.symbol,
          logo: h.logo,
          icon: 'Eye',
          value: `${pctBelowHigh.toFixed(1)}% below high`,
          color: '#007AFF',
          pnlPercentage: h.pnlPercentage,
          severity: 2 - pctBelowHigh,
        });
      }
    });

    // Not Sure: Winning/Losing Streaks (3 consecutive days)
    holdings.forEach((h) => {
      const ticker = tickers.find(
        (t) => t.Tickers.trim().toUpperCase() === h.symbol.trim().toUpperCase(),
      );
      if (!ticker) return;

      const prices = [
        h.currentPrice,
        ticker['Yesterday Close'],
        ticker['Today - 2'],
        ticker['Today - 3'],
      ].filter((p): p is number => p !== undefined && p !== null);

      if (prices.length >= 4) {
        const isWinningStreak =
          prices[0] > prices[1] &&
          prices[1] > prices[2] &&
          prices[2] > prices[3];
        const isLosingStreak =
          prices[0] < prices[1] &&
          prices[1] < prices[2] &&
          prices[2] < prices[3];

        if (isWinningStreak) {
          const streakGain =
            prices[0] > 0 ? ((prices[0] - prices[3]) / prices[3]) * 100 : 0;
          list.push({
            id: `winning-streak-${h.symbol}`,
            category: 'Not Sure',
            title: h.companyName || h.symbol,
            subtitle: '3-Day Winning Streak',
            reason: `Up ${streakGain.toFixed(1)}% over the last 3 trading sessions. Observe whether upward momentum sustains.`,
            badge: 'Momentum Watch',
            symbol: h.symbol,
            logo: h.logo,
            icon: 'Compass',
            value: `+${streakGain.toFixed(1)}% (3d)`,
            color: '#007AFF',
            pnlPercentage: h.pnlPercentage,
            severity: streakGain,
          });
        } else if (isLosingStreak) {
          const streakLoss =
            prices[0] > 0 ? ((prices[0] - prices[3]) / prices[3]) * 100 : 0;
          list.push({
            id: `losing-streak-${h.symbol}`,
            category: 'Not Sure',
            title: h.companyName || h.symbol,
            subtitle: '3-Day Losing Streak',
            reason: `Down ${streakLoss.toFixed(1)}% over 3 days. Observe if support holds before considering averaging down.`,
            badge: 'Support Watch',
            symbol: h.symbol,
            logo: h.logo,
            icon: 'Eye',
            value: `${streakLoss.toFixed(1)}% (3d)`,
            color: '#007AFF',
            pnlPercentage: h.pnlPercentage,
            severity: Math.abs(streakLoss),
          });
        }
      }
    });

    // Not Sure: Sector Concentration (>30% of portfolio in one sector)
    const sectorTotals: Record<string, number> = {};
    holdings.forEach((h) => {
      const sector = h.sector || 'Other';
      sectorTotals[sector] =
        (sectorTotals[sector] || 0) + (h.contributionPercentage ?? 0);
    });

    Object.entries(sectorTotals).forEach(([sector, percentage]) => {
      if (percentage > 30) {
        list.push({
          id: `sector-concentration-${sector}`,
          category: 'Not Sure',
          title: `${sector} Sector`,
          subtitle: 'Sector Concentration',
          reason: `${percentage.toFixed(1)}% of your portfolio is concentrated in ${sector}. Observe market rotation and consider balancing across sectors.`,
          badge: 'Sector Watch',
          icon: 'Compass',
          value: `${percentage.toFixed(1)}% weight`,
          color: '#007AFF',
          severity: percentage,
        });
      }
    });

    // Sort each insight by severity descending so the most urgent appear first
    list.sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0));

    return list;
  }, [aiStockInsights, holdings, isPrivacyMode, showCurrencySymbol, tickers]);

  const countByCategory = useMemo(
    () => ({
      Buy: insights.filter((i) => i.category === 'Buy').length,
      Sell: insights.filter((i) => i.category === 'Sell').length,
      Hold: insights.filter((i) => i.category === 'Hold').length,
      'Not Sure': insights.filter((i) => i.category === 'Not Sure').length,
    }),
    [insights],
  );

  return {
    insights,
    count: insights.length,
    countByCategory,
  };
};
