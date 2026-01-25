import { create } from 'zustand';
import { API_CONFIG } from '../constants/Api';
import { calculateXIRR } from '../lib/finance';
import { PortfolioSummary, Ticker, Transaction } from '../types';

interface PortfolioState {
    transactions: Transaction[];
    tickers: Ticker[];
    addTransaction: (transaction: Transaction) => void;
    removeTransaction: (id: string) => void;
    updateTransaction: (id: string, transaction: Transaction) => void;
    fetchTickers: () => Promise<void>;
    calculateSummary: () => PortfolioSummary;
    getAllocationData: (dimension: 'Sector' | 'Company Name' | 'Asset Type' | 'Broker') => { name: string; value: number; percentage: number }[];
    getYearlyAnalysis: () => import('../types').YearlyAnalysis[];
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
    transactions: [],
    tickers: [],
    addTransaction: (transaction) =>
        set((state) => ({ transactions: [...state.transactions, transaction] })),
    removeTransaction: (id) =>
        set((state) => ({ transactions: state.transactions.filter(t => t.id !== id) })),
    updateTransaction: (id, transaction) =>
        set((state) => ({
            transactions: state.transactions.map((t) => (t.id === id ? transaction : t)),
        })),
    fetchTickers: async () => {
        if (!API_CONFIG.WEB_APP_URL) return;
        try {
            const response = await fetch(`${API_CONFIG.WEB_APP_URL}?action=get_tickers`);
            const result = await response.json();
            if (result.ok) {
                set({ tickers: result.data });
            }
        } catch (error) {
            console.error('Failed to fetch tickers:', error);
        }
    },
    calculateSummary: () => {
        const { transactions, tickers } = get();
        if (transactions.length === 0) {
            return { totalValue: 0, totalCost: 0, profitAmount: 0, profitPercentage: 0, totalReturn: 0, xirr: 0 };
        }

        const priceMap = new Map(tickers.map(t => [t.Tickers.toUpperCase(), t['Current Value']]));

        let totalCost = 0;
        let totalValue = 0;
        const cashFlows: { amount: number; date: Date }[] = [];

        const sortedTransactions = [...transactions].sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        sortedTransactions.forEach(t => {
            const date = new Date(t.date);
            const currentPrice = priceMap.get(t.symbol.toUpperCase());
            const valuationPrice = currentPrice || t.price; // Fallback to buy price if no live price

            if (t.type === 'BUY') {
                totalCost += t.quantity * t.price;
                totalValue += t.quantity * valuationPrice;
                cashFlows.push({ amount: -t.quantity * t.price, date });
            } else {
                totalCost -= t.quantity * t.price;
                totalValue -= t.quantity * t.price;
                cashFlows.push({ amount: t.quantity * t.price, date });
            }
        });

        cashFlows.push({ amount: totalValue, date: new Date() });

        const profitAmount = totalValue - totalCost;
        const profitPercentage = totalCost > 0 ? (profitAmount / totalCost) * 100 : 0;
        const xirr = calculateXIRR(cashFlows);

        return {
            totalValue,
            totalCost,
            profitAmount,
            profitPercentage,
            totalReturn: profitAmount,
            xirr,
        };
    },
    getAllocationData: (dimension) => {
        const { transactions, tickers } = get();
        if (transactions.length === 0) return [];

        const tickerMap = new Map(tickers.map(t => [t.Tickers.toUpperCase(), t]));
        const holdings = new Map<string, number>();

        transactions.forEach(t => {
            const current = holdings.get(t.symbol) || 0;
            holdings.set(t.symbol, t.type === 'BUY' ? current + t.quantity : current - t.quantity);
        });

        const dimensionValueMap = new Map<string, number>();
        let totalPortfolioValue = 0;

        holdings.forEach((quantity, symbol) => {
            if (quantity <= 0) return;
            const ticker = tickerMap.get(symbol.toUpperCase());

            // Find the last transaction for this symbol to get a fallback price
            const lastTransaction = [...transactions]
                .reverse()
                .find(t => t.symbol.toUpperCase() === symbol.toUpperCase());

            const fallbackPrice = lastTransaction ? lastTransaction.price : 0;
            const price = (ticker && ticker['Current Value']) ? ticker['Current Value'] : fallbackPrice;

            let dimensionValue = 'Unknown';
            if (dimension === 'Broker' && lastTransaction) {
                dimensionValue = lastTransaction.broker || 'No Broker';
            } else if (ticker) {
                dimensionValue = (ticker as any)[dimension] || 'Unknown';
            } else if (dimension === 'Company Name') {
                dimensionValue = ticker ? ticker['Company Name'] : symbol;
            }

            const value = quantity * price;
            totalPortfolioValue += value;
            dimensionValueMap.set(dimensionValue, (dimensionValueMap.get(dimensionValue) || 0) + value);
        });

        if (totalPortfolioValue === 0) return [];

        return Array.from(dimensionValueMap.entries())
            .map(([name, value]) => ({
                name,
                value,
                percentage: (value / totalPortfolioValue) * 100
            }))
            .sort((a, b) => b.value - a.value);
    },
    getYearlyAnalysis: () => {
        const { transactions, tickers } = get();
        if (transactions.length === 0) return [];

        const tickerMap = new Map(tickers.map(t => [t.Tickers.toUpperCase(), t]));

        // Sort transactions by date
        const sortedTransactions = [...transactions].sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        const years = Array.from(new Set(sortedTransactions.map(t => new Date(t.date).getFullYear()))).sort();
        const analysis: import('../types').YearlyAnalysis[] = [];

        const cumulativeHoldings = new Map<string, number>();
        let previousYearInvestment = 0;

        years.forEach(year => {
            const yearTransactions = sortedTransactions.filter(t => new Date(t.date).getFullYear() === year);
            let yearInvestment = 0;

            // Update cumulative holdings and calculate yearly investment
            yearTransactions.forEach(t => {
                const currentQty = cumulativeHoldings.get(t.symbol) || 0;
                const qtyChange = t.type === 'BUY' ? t.quantity : -t.quantity;
                cumulativeHoldings.set(t.symbol, currentQty + qtyChange);

                if (t.type === 'BUY') {
                    yearInvestment += t.quantity * t.price;
                } else {
                    yearInvestment -= t.quantity * t.price;
                }
            });

            // Calculate asset distribution for this year based on cumulative holdings
            const assetValueMap = new Map<string, number>();
            let totalYearEndValue = 0;

            cumulativeHoldings.forEach((quantity, symbol) => {
                if (quantity <= 0) return;
                const ticker = tickerMap.get(symbol.toUpperCase());

                // For past years, we don't have historical prices, so we use the last known/buy price as proxy 
                // for "distribution" estimation, though it's technically "at current/last prices".
                const lastTransaction = [...sortedTransactions]
                    .filter(t => new Date(t.date).getFullYear() <= year && t.symbol.toUpperCase() === symbol.toUpperCase())
                    .reverse()[0];

                const fallbackPrice = lastTransaction ? lastTransaction.price : 0;
                const price = (ticker && ticker['Current Value']) ? ticker['Current Value'] : fallbackPrice;
                const assetType = (ticker && ticker['Asset Type']) || 'Other';

                const value = quantity * price;
                totalYearEndValue += value;
                assetValueMap.set(assetType, (assetValueMap.get(assetType) || 0) + value);
            });

            const assetDistribution = Array.from(assetValueMap.entries())
                .map(([name, value]) => ({
                    name,
                    value,
                    percentage: totalYearEndValue > 0 ? (value / totalYearEndValue) * 100 : 0
                }))
                .sort((a, b) => b.value - a.value);

            const percentageIncrease = previousYearInvestment > 0
                ? ((yearInvestment - previousYearInvestment) / previousYearInvestment) * 100
                : 0;

            analysis.push({
                year,
                investment: yearInvestment,
                percentageIncrease,
                assetDistribution
            });

            previousYearInvestment = yearInvestment;
        });

        return analysis;
    }
}));
