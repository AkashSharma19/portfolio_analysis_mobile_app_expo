import { usePortfolioStore } from '@/store/usePortfolioStore';
import { useMemo } from 'react';

export type InsightCategory = 'Buy' | 'Sell/Hold' | 'Observe';

export interface Insight {
    id: string;
    category: InsightCategory;
    title: string; // Used for company name
    subtitle: string; // Used for "Total Invested"
    icon: string;
    symbol?: string;
    logo?: string;
    value: string; // The primary metric to display (e.g. +30%)
    color: string; // Insight color
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

        if (holdings.length === 0) return list;

        // Sell/Hold: High Concentration
        holdings.forEach((h) => {
            if (h.contributionPercentage > 25) {
                list.push({
                    id: `concentration-${h.symbol}`,
                    category: 'Sell/Hold',
                    title: h.companyName || h.symbol,
                    subtitle: `Invested: ${formatCurrency(h.investedValue)}`,
                    symbol: h.symbol,
                    logo: h.logo,
                    icon: 'TriangleAlert',
                    value: `${h.contributionPercentage.toFixed(1)}% Portfolio`,
                    color: '#FF3B30',
                });
            }
        });

        // Sell/Hold: Profit Taking
        holdings.forEach((h) => {
            if (h.pnlPercentage > 30) {
                list.push({
                    id: `profit-${h.symbol}`,
                    category: 'Sell/Hold',
                    title: h.companyName || h.symbol,
                    subtitle: `Invested: ${formatCurrency(h.investedValue)}`,
                    symbol: h.symbol,
                    logo: h.logo,
                    icon: 'TrendingUp',
                    value: `+${h.pnlPercentage.toFixed(1)}%`,
                    color: '#34C759',
                });
            }
        });

        // Buy: DCA Opportunity
        holdings.forEach((h) => {
            if (h.pnlPercentage < -10) {
                list.push({
                    id: `dca-${h.symbol}`,
                    category: 'Buy',
                    title: h.companyName || h.symbol,
                    subtitle: `Invested: ${formatCurrency(h.investedValue)}`,
                    symbol: h.symbol,
                    logo: h.logo,
                    icon: 'CircleArrowDown',
                    value: `${h.pnlPercentage.toFixed(1)}%`,
                    color: '#FF3B30', // Red for low price/discount
                });
            }
        });

        // Observe: Near 52W High
        holdings.forEach((h) => {
            if (h.high52 && h.currentPrice >= h.high52 * 0.98) {
                list.push({
                    id: `high52-${h.symbol}`,
                    category: 'Observe',
                    title: h.companyName || h.symbol,
                    subtitle: `Invested: ${formatCurrency(h.investedValue)}`,
                    symbol: h.symbol,
                    logo: h.logo,
                    icon: 'Zap',
                    value: 'Near High',
                    color: '#FF9500',
                });
            }
        });

        // Buy: Near 52W Low
        holdings.forEach((h) => {
            if (h.low52 && h.currentPrice <= h.low52 * 1.02) {
                list.push({
                    id: `low52-${h.symbol}`,
                    category: 'Buy',
                    title: h.companyName || h.symbol,
                    subtitle: `Invested: ${formatCurrency(h.investedValue)}`,
                    symbol: h.symbol,
                    logo: h.logo,
                    icon: 'Compass',
                    value: 'Near Low',
                    color: '#34C759',
                });
            }
        });

        return list;
    }, [holdings, isPrivacyMode, showCurrencySymbol]);

    return {
        insights,
        count: insights.length,
    };
};
