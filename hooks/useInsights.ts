import { usePortfolioStore } from '@/store/usePortfolioStore';
import { useMemo } from 'react';

export type InsightCategory = 'Buy' | 'Sell/Hold' | 'Observe';

export interface Insight {
    id: string;
    category: InsightCategory;
    title: string;       // Company name
    subtitle: string;    // Invested value or context
    reason: string;      // Actionable explanation WHY this insight was triggered
    badge: string;       // Short label for insight type (e.g. "High Concentration")
    icon: string;
    symbol?: string;
    logo?: string;
    value: string;       // Specific metric (e.g. "31.4% of portfolio")
    color: string;
    pnlPercentage?: number;
    severity: number;    // Higher = more urgent, used for sorting within a tab
}

export const useInsights = () => {
    const getHoldingsData = usePortfolioStore((state) => state.getHoldingsData);
    const transactions = usePortfolioStore((state) => state.transactions);
    const tickers = usePortfolioStore((state) => state.tickers);
    const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
    const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

    const holdings = useMemo(() => getHoldingsData(), [getHoldingsData, transactions, tickers]);

    const formatCurrency = (value: number) => {
        return `${showCurrencySymbol ? '₹' : ''}${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    };

    const insights = useMemo(() => {
        const list: Insight[] = [];
        // Track symbols added per category to avoid duplicates within that category
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

        // ─── SELL/HOLD ────────────────────────────────────────────────────────────

        // Sell/Hold: High Concentration (>25% of portfolio)
        holdings.forEach((h) => {
            if (h.contributionPercentage > 25) {
                list.push({
                    id: `concentration-${h.symbol}`,
                    category: 'Sell/Hold',
                    title: h.companyName || h.symbol,
                    subtitle: `Invested: ${formatCurrency(h.investedValue)}`,
                    reason: `This stock makes up ${h.contributionPercentage.toFixed(1)}% of your portfolio. Consider trimming to reduce concentration risk.`,
                    badge: 'High Concentration',
                    symbol: h.symbol,
                    logo: h.logo,
                    icon: 'TriangleAlert',
                    value: `${h.contributionPercentage.toFixed(1)}% holding`,
                    color: '#FF3B30',
                    pnlPercentage: h.pnlPercentage,
                    severity: h.contributionPercentage,
                });
                markAdded('Sell/Hold', h.symbol);
            }
        });

        // Sell/Hold: Profit Taking (PnL > 30%)
        holdings.forEach((h) => {
            if (h.pnlPercentage > 30 && canAdd('Sell/Hold', h.symbol)) {
                list.push({
                    id: `profit-${h.symbol}`,
                    category: 'Sell/Hold',
                    title: h.companyName || h.symbol,
                    subtitle: `Current Value: ${formatCurrency(h.currentValue)}`,
                    reason: `Up ${h.pnlPercentage.toFixed(1)}% from your average buy price. Consider booking partial profits.`,
                    badge: 'Profit Taking',
                    symbol: h.symbol,
                    logo: h.logo,
                    icon: 'TrendingUp',
                    value: `+${h.pnlPercentage.toFixed(1)}% gain`,
                    color: '#34C759',
                    pnlPercentage: h.pnlPercentage,
                    severity: h.pnlPercentage,
                });
                markAdded('Sell/Hold', h.symbol);
            }
        });

        // Sell/Hold: Tax-Loss Harvesting (PnL < -15%)
        // Only add if NOT already a Buy/DCA candidate (i.e., we skip this if the stock
        // will also appear in Buy — avoid the same stock firing conflicting signals)
        holdings.forEach((h) => {
            if (h.pnlPercentage < -15 && h.contributionPercentage < 15) {
                // Only suggest Tax-Loss if we don't also strongly want to DCA
                if (canAdd('Sell/Hold', h.symbol)) {
                    list.push({
                        id: `tax-loss-${h.symbol}`,
                        category: 'Sell/Hold',
                        title: h.companyName || h.symbol,
                        subtitle: `Invested: ${formatCurrency(h.investedValue)}`,
                        reason: `Down ${Math.abs(h.pnlPercentage).toFixed(1)}% overall. Selling may let you harvest a tax loss to offset gains elsewhere.`,
                        badge: 'Tax-Loss Harvest',
                        symbol: h.symbol,
                        logo: h.logo,
                        icon: 'CircleArrowDown',
                        value: `${h.pnlPercentage.toFixed(1)}% loss`,
                        color: '#FF3B30',
                        pnlPercentage: h.pnlPercentage,
                        severity: Math.abs(h.pnlPercentage),
                    });
                    markAdded('Sell/Hold', h.symbol);
                }
            }
        });

        // ─── BUY ──────────────────────────────────────────────────────────────────

        // Buy: DCA Opportunity (PnL < -10%) — exclusive priority: skip if tax-loss already added
        holdings.forEach((h) => {
            if (h.pnlPercentage < -10 && canAdd('Buy', h.symbol)) {
                const distFromAvg = Math.abs(h.pnlPercentage);
                list.push({
                    id: `dca-${h.symbol}`,
                    category: 'Buy',
                    title: h.companyName || h.symbol,
                    subtitle: `Avg Buy: ${formatCurrency(h.avgPrice)}`,
                    reason: `Trading ${distFromAvg.toFixed(1)}% below your average cost. Averaging down can reduce your cost basis.`,
                    badge: 'DCA Opportunity',
                    symbol: h.symbol,
                    logo: h.logo,
                    icon: 'CircleArrowDown',
                    value: `${h.pnlPercentage.toFixed(1)}% below avg`,
                    color: '#FF9500',
                    pnlPercentage: h.pnlPercentage,
                    severity: distFromAvg,
                });
                markAdded('Buy', h.symbol);
            }
        });

        // Buy: Near 52W Low (within 2% of low)
        holdings.forEach((h) => {
            if (h.low52 && h.currentPrice <= h.low52 * 1.02 && canAdd('Buy', h.symbol)) {
                const pctAboveLow = ((h.currentPrice - h.low52) / h.low52) * 100;
                list.push({
                    id: `low52-${h.symbol}`,
                    category: 'Buy',
                    title: h.companyName || h.symbol,
                    subtitle: `52W Low: ${formatCurrency(h.low52)}`,
                    reason: `Only ${pctAboveLow.toFixed(1)}% above its 52-week low — a potential long-term entry point.`,
                    badge: 'Near 52W Low',
                    symbol: h.symbol,
                    logo: h.logo,
                    icon: 'Compass',
                    value: `${pctAboveLow.toFixed(1)}% above low`,
                    color: '#34C759',
                    pnlPercentage: h.pnlPercentage,
                    severity: 2 - pctAboveLow, // closer to 52W low = higher severity
                });
                markAdded('Buy', h.symbol);
            }
        });

        // ─── OBSERVE ─────────────────────────────────────────────────────────────

        // Observe: Near 52W High (within 2% of high)
        holdings.forEach((h) => {
            if (h.high52 && h.currentPrice >= h.high52 * 0.98) {
                const pctBelowHigh = ((h.high52 - h.currentPrice) / h.high52) * 100;
                list.push({
                    id: `high52-${h.symbol}`,
                    category: 'Observe',
                    title: h.companyName || h.symbol,
                    subtitle: `52W High: ${formatCurrency(h.high52)}`,
                    reason: `Just ${pctBelowHigh.toFixed(1)}% below its 52-week high. Watch for a breakout or potential pullback.`,
                    badge: 'Near 52W High',
                    symbol: h.symbol,
                    logo: h.logo,
                    icon: 'Zap',
                    value: `${pctBelowHigh.toFixed(1)}% below high`,
                    color: '#FF9500',
                    pnlPercentage: h.pnlPercentage,
                    severity: 2 - pctBelowHigh, // closer to 52W high = higher severity
                });
            }
        });

        // Observe: Winning/Losing Streaks (3 consecutive days)
        holdings.forEach((h) => {
            const ticker = tickers.find((t) => t.Tickers.trim().toUpperCase() === h.symbol.trim().toUpperCase());
            if (!ticker) return;

            const prices = [
                h.currentPrice,
                ticker['Yesterday Close'],
                ticker['Today - 2'],
                ticker['Today - 3'],
            ].filter((p): p is number => p !== undefined && p !== null);

            if (prices.length >= 4) {
                const isWinningStreak = prices[0] > prices[1] && prices[1] > prices[2] && prices[2] > prices[3];
                const isLosingStreak = prices[0] < prices[1] && prices[1] < prices[2] && prices[2] < prices[3];

                if (isWinningStreak) {
                    const streakGain = prices[0] > 0 ? ((prices[0] - prices[3]) / prices[3]) * 100 : 0;
                    list.push({
                        id: `winning-streak-${h.symbol}`,
                        category: 'Observe',
                        title: h.companyName || h.symbol,
                        subtitle: '3-Day Winning Streak',
                        reason: `Has risen for 3 consecutive days (+${streakGain.toFixed(1)}% over 3 days). Monitor for momentum continuation or a reversal.`,
                        badge: 'Winning Streak',
                        symbol: h.symbol,
                        logo: h.logo,
                        icon: 'TrendingUp',
                        value: `+${streakGain.toFixed(1)}% (3d)`,
                        color: '#34C759',
                        pnlPercentage: h.pnlPercentage,
                        severity: streakGain,
                    });
                } else if (isLosingStreak) {
                    const streakLoss = prices[0] > 0 ? ((prices[0] - prices[3]) / prices[3]) * 100 : 0;
                    list.push({
                        id: `losing-streak-${h.symbol}`,
                        category: 'Observe',
                        title: h.companyName || h.symbol,
                        subtitle: '3-Day Losing Streak',
                        reason: `Has fallen for 3 consecutive days (${streakLoss.toFixed(1)}% over 3 days). Watch for further weakness or a bounce opportunity.`,
                        badge: 'Losing Streak',
                        symbol: h.symbol,
                        logo: h.logo,
                        icon: 'CircleArrowDown',
                        value: `${streakLoss.toFixed(1)}% (3d)`,
                        color: '#FF3B30',
                        pnlPercentage: h.pnlPercentage,
                        severity: Math.abs(streakLoss),
                    });
                }
            }
        });

        // Observe: Sector Concentration (>30% of portfolio in one sector)
        const sectorTotals: Record<string, number> = {};
        holdings.forEach((h) => {
            const sector = h.sector || 'Other';
            sectorTotals[sector] = (sectorTotals[sector] || 0) + h.contributionPercentage;
        });

        Object.entries(sectorTotals).forEach(([sector, percentage]) => {
            if (percentage > 30) {
                list.push({
                    id: `sector-concentration-${sector}`,
                    category: 'Observe',
                    title: `${sector} Sector`,
                    subtitle: 'Sector Concentration',
                    reason: `${percentage.toFixed(1)}% of your portfolio is in ${sector}. Consider diversifying to reduce sector-specific risk.`,
                    badge: 'Sector Risk',
                    icon: 'TriangleAlert',
                    value: `${percentage.toFixed(1)}% of portfolio`,
                    color: '#FF9500',
                    severity: percentage,
                });
            }
        });

        // Sort each insight by severity descending so the most urgent appear first
        list.sort((a, b) => b.severity - a.severity);

        return list;
    }, [holdings, isPrivacyMode, showCurrencySymbol, tickers]);

    const countByCategory = useMemo(() => ({
        'Buy': insights.filter(i => i.category === 'Buy').length,
        'Sell/Hold': insights.filter(i => i.category === 'Sell/Hold').length,
        'Observe': insights.filter(i => i.category === 'Observe').length,
    }), [insights]);

    return {
        insights,
        count: insights.length,
        countByCategory,
    };
};
