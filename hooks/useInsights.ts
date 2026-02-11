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
    name?: string;
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

        holdings.forEach((h) => {
            if (h.contributionPercentage > 25) {
                list.push({
                    id: `concentration-${h.symbol}`,
                    type: 'warning',
                    title: 'High Concentration',
                    description: `This stock is **${h.contributionPercentage.toFixed(1)}%** of your portfolio. Consider selling a bit to avoid having "too many eggs in one basket."`,
                    icon: 'TriangleAlert',
                    symbol: h.symbol,
                    logo: h.logo,
                    name: h.companyName,
                });
            }
        });

        holdings.forEach((h) => {
            if (h.pnlPercentage > 30) {
                list.push({
                    id: `profit-${h.symbol}`,
                    type: 'success',
                    title: 'Profit Taking Opportunity',
                    description: `You're up **${h.pnlPercentage.toFixed(1)}%**! It might be a smart move to sell some now and keep the cash you've made.`,
                    icon: 'TrendingUp',
                    symbol: h.symbol,
                    logo: h.logo,
                    name: h.companyName,
                });
            }
        });

        holdings.forEach((h) => {
            if (h.pnlPercentage < -10) {
                list.push({
                    id: `dca-${h.symbol}`,
                    type: 'opportunity',
                    title: 'DCA Opportunity',
                    description: `The price is **${Math.abs(h.pnlPercentage).toFixed(1)}%** lower than your average buy price. This is a chance to buy more for less.`,
                    icon: 'CircleArrowDown',
                    symbol: h.symbol,
                    logo: h.logo,
                    name: h.companyName,
                });
            }
        });

        holdings.forEach((h) => {
            if (h.high52 && h.currentPrice >= h.high52 * 0.98) {
                list.push({
                    id: `high52-${h.symbol}`,
                    type: 'info',
                    title: 'Near 52-Week High',
                    description: `Price is at a yearly high (**98%+**). Great performance! Just watch out in case it starts to drop back down.`,
                    icon: 'Zap',
                    symbol: h.symbol,
                    logo: h.logo,
                    name: h.companyName,
                });
            }
        });

        holdings.forEach((h) => {
            if (h.low52 && h.currentPrice <= h.low52 * 1.02) {
                list.push({
                    id: `low52-${h.symbol}`,
                    type: 'opportunity',
                    title: 'Near 52-Week Low',
                    description: `Price is at a yearly low (**within 2%**). Could be a good time to buy more if you think the company will bounce back.`,
                    icon: 'Compass',
                    symbol: h.symbol,
                    logo: h.logo,
                    name: h.companyName,
                });
            }
        });

        const sectors = new Set(holdings.map((h) => h.sector).filter(Boolean));
        if (holdings.length >= 5 && sectors.size < 3) {
            list.push({
                id: 'diversification-sector',
                type: 'info',
                title: 'Low Sector Diversity',
                description: `You're only invested in **${sectors.size}** types of industries. Spreading your money across more areas helps keep your savings safer.`,
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
