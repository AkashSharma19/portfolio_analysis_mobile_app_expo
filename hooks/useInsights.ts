import { usePortfolioStore } from '@/store/usePortfolioStore';
import { useMemo } from 'react';

export type InsightType = 'warning' | 'success' | 'info' | 'opportunity';

export interface Insight {
    id: string;
    type: InsightType;
    title: string;
    description: string;
    icon: string;
    actionLabel?: string;
    symbol?: string;
    logo?: string;
}

export const useInsights = () => {
    const getHoldingsData = usePortfolioStore((state) => state.getHoldingsData);
    const transactions = usePortfolioStore((state) => state.transactions);
    const tickers = usePortfolioStore((state) => state.tickers);
    const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);

    const holdings = useMemo(() => getHoldingsData(), [getHoldingsData, transactions, tickers]);

    const insights = useMemo(() => {
        const list: Insight[] = [];

        if (holdings.length === 0) return list;

        // 1. Concentration Alert
        holdings.forEach((h) => {
            if (h.contributionPercentage > 25) {
                list.push({
                    id: `concentration-${h.symbol}`,
                    type: 'warning',
                    title: 'High Concentration',
                    description: `${h.symbol} makes up ${h.contributionPercentage.toFixed(1)}% of your portfolio. Consider diversifying to reduce risk.`,
                    icon: 'TriangleAlert',
                    symbol: h.symbol,
                    logo: h.logo,
                });
            }
        });

        // 2. Profit Taking Opportunity
        holdings.forEach((h) => {
            if (h.pnlPercentage > 30) {
                list.push({
                    id: `profit-${h.symbol}`,
                    type: 'success',
                    title: 'Profit Taking Opportunity',
                    description: `${h.symbol} is up ${h.pnlPercentage.toFixed(1)}%. It might be a good time to secure some gains.`,
                    icon: 'TrendingUp',
                    symbol: h.symbol,
                    logo: h.logo,
                });
            }
        });

        // 3. DCA Opportunity
        holdings.forEach((h) => {
            if (h.pnlPercentage < -10) {
                list.push({
                    id: `dca-${h.symbol}`,
                    type: 'opportunity',
                    title: 'DCA Opportunity',
                    description: `${h.symbol} is down ${Math.abs(h.pnlPercentage).toFixed(1)}% from your average. Consider lowering your cost basis.`,
                    icon: 'CircleArrowDown',
                    symbol: h.symbol,
                    logo: h.logo,
                });
            }
        });

        // 4. 52-Week High
        holdings.forEach((h) => {
            if (h.high52 && h.currentPrice >= h.high52 * 0.98) {
                list.push({
                    id: `high52-${h.symbol}`,
                    type: 'info',
                    title: 'Near 52-Week High',
                    description: `${h.symbol} is trading near its yearly high. Monitor for potential resistance or momentum.`,
                    icon: 'Zap',
                    symbol: h.symbol,
                    logo: h.logo,
                });
            }
        });

        // 5. 52-Week Low
        holdings.forEach((h) => {
            if (h.low52 && h.currentPrice <= h.low52 * 1.02) {
                list.push({
                    id: `low52-${h.symbol}`,
                    type: 'opportunity',
                    title: 'Near 52-Week Low',
                    description: `${h.symbol} is near its yearly low. This could be an attractive entry point if the fundamentals are strong.`,
                    icon: 'Compass',
                    symbol: h.symbol,
                    logo: h.logo,
                });
            }
        });

        // 6. Diversification
        const sectors = new Set(holdings.map((h) => h.sector).filter(Boolean));
        if (holdings.length >= 5 && sectors.size < 3) {
            list.push({
                id: 'diversification-sector',
                type: 'info',
                title: 'Low Sector Diversity',
                description: `Your portfolio is spread across only ${sectors.size} sectors. Adding assets from different industries can reduce risk.`,
                icon: 'PieChart',
            });
        }

        return list;
    }, [holdings, isPrivacyMode]);

    return {
        insights,
        count: insights.length,
    };
};
