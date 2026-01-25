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
    }
}));
