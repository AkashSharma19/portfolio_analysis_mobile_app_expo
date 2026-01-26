import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
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
    getAllocationData: (dimension: 'Sector' | 'Company Name' | 'Asset Type' | 'Broker') => import('../types').AllocationItem[];
    getHoldingsData: () => import('../types').Holding[];
    getYearlyAnalysis: () => import('../types').YearlyAnalysis[];
    getMonthlyAnalysis: () => import('../types').MonthlyAnalysis[];
    importTransactions: (transactions: Transaction[]) => void;
    isPrivacyMode: boolean;
    togglePrivacyMode: () => void;
    // Profile fields
    userName: string;
    userEmail: string;
    userMobile: string;
    userImage: string | null;
    updateProfile: (profile: { name?: string; email?: string; mobile?: string; image?: string | null }) => void;
}

export const usePortfolioStore = create<PortfolioState>()(
    persist(
        (set, get) => ({
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
                    return { totalValue: 0, totalCost: 0, profitAmount: 0, profitPercentage: 0, totalReturn: 0, xirr: 0, dayChange: 0, dayChangePercentage: 0 };
                }

                const priceMap = new Map(tickers.map(t => [t.Tickers.toUpperCase(), t['Current Value']]));
                const closeMap = new Map(tickers.map(t => [t.Tickers.toUpperCase(), t['Yesterday Close']]));
                const holdingsMap = new Map<string, number>();

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

                    const sym = t.symbol.toUpperCase();
                    const currentQty = holdingsMap.get(sym) || 0;
                    holdingsMap.set(sym, t.type === 'BUY' ? currentQty + t.quantity : currentQty - t.quantity);
                });

                let dayChange = 0;
                holdingsMap.forEach((qty, symbol) => {
                    if (qty > 0) {
                        const currentPrice = priceMap.get(symbol) || 0;
                        const closePrice = closeMap.get(symbol) || currentPrice;
                        dayChange += (currentPrice - closePrice) * qty;
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
                    dayChange,
                    dayChangePercentage: (totalValue - dayChange) > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0,
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

                const holdingsMap = new Map<string, { quantity: number, totalCost: number }>();
                transactions.forEach(t => {
                    const sym = t.symbol.toUpperCase();
                    const current = holdingsMap.get(sym) || { quantity: 0, totalCost: 0 };
                    if (t.type === 'BUY') {
                        current.quantity += t.quantity;
                        current.totalCost += t.quantity * t.price;
                    } else {
                        const avgPriceBefore = current.quantity > 0 ? current.totalCost / current.quantity : 0;
                        current.quantity -= t.quantity;
                        current.totalCost -= t.quantity * avgPriceBefore;
                    }
                    holdingsMap.set(sym, current);
                });

                const groups: Record<string, { value: number, cost: number, quantity: number }> = {};
                let totalPortfolioValue = 0;

                holdingsMap.forEach((data, symbol) => {
                    if (data.quantity <= 0) return;
                    const ticker = tickerMap.get(symbol);
                    const lastTransaction = [...transactions].reverse().find(t => t.symbol.toUpperCase() === symbol);
                    const fallbackPrice = lastTransaction?.price || 0;
                    const currentPrice = ticker?.['Current Value'] || fallbackPrice;

                    let dimensionValue = 'Unknown';
                    if (dimension === 'Broker' && lastTransaction) {
                        dimensionValue = lastTransaction.broker || 'No Broker';
                    } else if (ticker && (ticker as any)[dimension]) {
                        dimensionValue = (ticker as any)[dimension];
                    } else if (dimension === 'Company Name') {
                        dimensionValue = ticker ? ticker['Company Name'] : symbol;
                    }

                    const currentValue = data.quantity * currentPrice;
                    const investedValue = data.totalCost;

                    if (!groups[dimensionValue]) groups[dimensionValue] = { value: 0, cost: 0, quantity: 0 };
                    groups[dimensionValue].value += currentValue;
                    groups[dimensionValue].cost += investedValue;
                    groups[dimensionValue].quantity += data.quantity;
                    totalPortfolioValue += currentValue;
                });

            },
            getHoldingsData: () => {
                const { transactions, tickers } = get();
                if (transactions.length === 0) return [];

                const tickerMap = new Map(tickers.map(t => [t.Tickers.toUpperCase(), t]));
                const holdingsMap = new Map<string, {
                    quantity: number;
                    totalCost: number;
                    symbol: string;
                }>();

                transactions.forEach(t => {
                    const sym = t.symbol.toUpperCase();
                    const current = holdingsMap.get(sym) || { quantity: 0, totalCost: 0, symbol: t.symbol };

                    if (t.type === 'BUY') {
                        current.quantity += t.quantity;
                        current.totalCost += t.quantity * t.price;
                    } else {
                        const avgPriceBefore = current.quantity > 0 ? current.totalCost / current.quantity : 0;
                        current.quantity -= t.quantity;
                        current.totalCost -= t.quantity * avgPriceBefore;
                    }
                    holdingsMap.set(sym, current);
                });

                let totalPortfolioValue = 0;
                const preliminaryHoldings: any[] = [];

                holdingsMap.forEach((data, symbol) => {
                    if (data.quantity <= 0) return;

                    const ticker = tickerMap.get(symbol);
                    const currentPrice = ticker?.['Current Value'] || 0;
                    const yesterdayClose = ticker?.['Yesterday Close'] || currentPrice;
                    const avgPrice = data.totalCost / data.quantity;
                    const currentValue = data.quantity * (currentPrice || avgPrice);
                    const investedValue = data.totalCost;

                    const dayChange = (currentPrice - yesterdayClose) * data.quantity;
                    const dayChangePercentage = yesterdayClose > 0 ? ((currentPrice - yesterdayClose) / yesterdayClose) * 100 : 0;

                    totalPortfolioValue += currentValue;

                    preliminaryHoldings.push({
                        symbol: data.symbol,
                        companyName: ticker?.['Company Name'] || data.symbol,
                        quantity: data.quantity,
                        avgPrice,
                        currentPrice: currentPrice || avgPrice,
                        investedValue,
                        currentValue,
                        pnl: currentValue - investedValue,
                        pnlPercentage: investedValue > 0 ? ((currentValue - investedValue) / investedValue) * 100 : 0,
                        dayChange,
                        dayChangePercentage,
                        assetType: ticker?.['Asset Type'] || 'Other',
                        sector: ticker?.['Sector'] || 'Other',
                        broker: transactions.filter(t => t.symbol.toUpperCase() === symbol).reverse()[0]?.broker || 'Unknown'
                    });
                });

                return preliminaryHoldings.map(h => ({
                    ...h,
                    contributionPercentage: totalPortfolioValue > 0 ? (h.currentValue / totalPortfolioValue) * 100 : 0
                })).sort((a, b) => b.currentValue - a.currentValue);
            },
            getYearlyAnalysis: () => {
                const { transactions, tickers } = get();
                if (transactions.length === 0) return [];

                const tickerMap = new Map(tickers.map(t => [t.Tickers.toUpperCase(), t]));

                const sortedTransactions = [...transactions].sort((a, b) =>
                    new Date(a.date).getTime() - new Date(b.date).getTime()
                );

                const years = Array.from(new Set(sortedTransactions.map(t => new Date(t.date).getFullYear()))).sort();
                const analysis: import('../types').YearlyAnalysis[] = [];

                const cumulativeHoldings = new Map<string, number>();
                let previousYearInvestment = 0;
                let previousAverageMonthlyInvestment = 0;

                years.forEach(year => {
                    const yearTransactions = sortedTransactions.filter(t => new Date(t.date).getFullYear() === year);
                    let yearInvestment = 0;

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

                    const assetValueMap = new Map<string, number>();
                    let totalYearEndValue = 0;

                    cumulativeHoldings.forEach((quantity, symbol) => {
                        if (quantity <= 0) return;
                        const ticker = tickerMap.get(symbol.toUpperCase());

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

                    const currentDate = new Date();
                    const currentYear = currentDate.getFullYear();

                    let divisor = 12;
                    if (year === currentYear) {
                        divisor = currentDate.getMonth() + 1;
                    }

                    const averageMonthlyInvestment = yearInvestment / divisor;

                    const percentageIncrease = previousAverageMonthlyInvestment > 0
                        ? ((averageMonthlyInvestment - previousAverageMonthlyInvestment) / previousAverageMonthlyInvestment) * 100
                        : 0;

                    analysis.push({
                        year,
                        investment: yearInvestment,
                        averageMonthlyInvestment,
                        percentageIncrease,
                        assetDistribution
                    });

                    previousYearInvestment = yearInvestment;
                    previousAverageMonthlyInvestment = averageMonthlyInvestment;
                });

                return analysis.reverse();
            },
            getMonthlyAnalysis: () => {
                const { transactions, tickers } = get();
                if (transactions.length === 0) return [];

                const tickerMap = new Map(tickers.map(t => [t.Tickers.toUpperCase(), t]));
                const sortedTransactions = [...transactions].sort((a, b) =>
                    new Date(a.date).getTime() - new Date(b.date).getTime()
                );

                const monthlyGroups = new Map<string, Transaction[]>();
                sortedTransactions.forEach(t => {
                    const date = new Date(t.date);
                    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    if (!monthlyGroups.has(key)) monthlyGroups.set(key, []);
                    monthlyGroups.get(key)!.push(t);
                });

                const monthKeys = Array.from(monthlyGroups.keys()).sort();
                const analysis: import('../types').MonthlyAnalysis[] = [];

                const cumulativeHoldings = new Map<string, number>();
                let previousMonthInvestment = 0;

                if (monthKeys.length === 0) return [];

                const firstMonth = monthKeys[0];
                const lastDate = new Date();
                const lastMonth = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}`;

                let currentKey = firstMonth;
                const allMonthKeys: string[] = [];
                while (currentKey <= lastMonth) {
                    allMonthKeys.push(currentKey);
                    const [y, m] = currentKey.split('-').map(Number);
                    const nextDate = new Date(y, m, 1);
                    currentKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
                }

                allMonthKeys.forEach(key => {
                    const monthTransactions = monthlyGroups.get(key) || [];
                    let monthInvestment = 0;

                    monthTransactions.forEach(t => {
                        const currentQty = cumulativeHoldings.get(t.symbol) || 0;
                        const qtyChange = t.type === 'BUY' ? t.quantity : -t.quantity;
                        cumulativeHoldings.set(t.symbol, currentQty + qtyChange);

                        if (t.type === 'BUY') {
                            monthInvestment += t.quantity * t.price;
                        } else {
                            monthInvestment -= t.quantity * t.price;
                        }
                    });

                    const assetValueMap = new Map<string, number>();
                    let totalMonthEndValue = 0;

                    cumulativeHoldings.forEach((quantity, symbol) => {
                        if (quantity <= 0) return;
                        const ticker = tickerMap.get(symbol.toUpperCase());

                        const lastTransaction = [...sortedTransactions]
                            .filter(t => {
                                const d = new Date(t.date);
                                const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                                return k <= key && t.symbol.toUpperCase() === symbol.toUpperCase();
                            })
                            .reverse()[0];

                        const price = (ticker && ticker['Current Value']) ? ticker['Current Value'] : (lastTransaction ? lastTransaction.price : 0);
                        const assetType = (ticker && ticker['Asset Type']) || 'Other';
                        const value = quantity * price;
                        totalMonthEndValue += value;
                        assetValueMap.set(assetType, (assetValueMap.get(assetType) || 0) + value);
                    });

                    const assetDistribution = Array.from(assetValueMap.entries())
                        .map(([name, value]) => ({
                            name,
                            value,
                            percentage: totalMonthEndValue > 0 ? (value / totalMonthEndValue) * 100 : 0
                        }))
                        .sort((a, b) => b.value - a.value);

                    const [y, m] = key.split('-');
                    const date = new Date(Number(y), Number(m) - 1);
                    const monthName = date.toLocaleString('default', { month: 'short', year: 'numeric' });

                    const percentageIncrease = previousMonthInvestment !== 0
                        ? ((monthInvestment - previousMonthInvestment) / Math.abs(previousMonthInvestment)) * 100
                        : 0;

                    analysis.push({
                        month: monthName,
                        monthKey: key,
                        investment: monthInvestment,
                        percentageIncrease,
                        assetDistribution
                    });

                    previousMonthInvestment = monthInvestment;
                });

                return analysis.reverse();
            },
            importTransactions: (newTransactions) =>
                set((state) => ({ transactions: [...state.transactions, ...newTransactions] })),
            isPrivacyMode: false,
            togglePrivacyMode: () => set((state) => ({ isPrivacyMode: !state.isPrivacyMode })),
            userName: '',
            userEmail: '',
            userMobile: '',
            userImage: null,
            updateProfile: (profile) => set((state) => ({
                userName: profile.name !== undefined ? profile.name : state.userName,
                userEmail: profile.email !== undefined ? profile.email : state.userEmail,
                userMobile: profile.mobile !== undefined ? profile.mobile : state.userMobile,
                userImage: profile.image !== undefined ? profile.image : state.userImage
            })),
        }),
        {
            name: 'portfolio-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
