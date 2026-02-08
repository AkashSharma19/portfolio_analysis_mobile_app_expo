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
    theme: 'system' | 'light' | 'dark';
    setTheme: (theme: 'system' | 'light' | 'dark') => void;
    showCurrencySymbol: boolean;
    toggleCurrencySymbol: () => void;
    recentSearches: string[];
    addRecentSearch: (query: string) => void;
    clearRecentSearches: () => void;
    headerLogo: string | null;
    headerLink: string | null;
    watchlist: string[];
    toggleWatchlist: (ticker: string) => void;
    forecastYears: number;
    setForecastYears: (years: number) => void;
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
                        const logo = result.config?.headerLogo || result.headerLogo || null;
                        const link = result.config?.headerLink || result.headerLink || null;
                        set({
                            tickers: result.data,
                            headerLogo: logo,
                            headerLink: link,
                        });
                    }
                } catch (error) {
                    console.error('Failed to fetch tickers:', error);
                }
            },
            calculateSummary: () => {
                const { transactions, tickers } = get();
                if (transactions.length === 0) {
                    return { totalValue: 0, totalCost: 0, profitAmount: 0, profitPercentage: 0, totalReturn: 0, xirr: 0, dayChange: 0, dayChangePercentage: 0, realizedReturn: 0, unrealizedReturn: 0 };
                }

                const priceMap = new Map<string, number>();
                const closeMap = new Map<string, number>();
                tickers.forEach(t => {
                    const sym = t.Tickers.trim().toUpperCase();
                    priceMap.set(sym, t['Current Value']);
                    closeMap.set(sym, t['Yesterday Close'] ?? t['Current Value']);
                });

                const sortedTransactions = [...transactions].sort((a, b) => {
                    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
                    if (dateDiff !== 0) return dateDiff;
                    if (a.type === b.type) return 0;
                    return a.type === 'BUY' ? -1 : 1;
                });

                const holdingsMap = new Map<string, number>();
                const avgBuyPriceMap = new Map<string, number>();

                let totalBought = 0;
                let totalSold = 0;
                let realizedReturn = 0;

                sortedTransactions.forEach(t => {
                    const sym = t.symbol.trim().toUpperCase();
                    const currentQty = holdingsMap.get(sym) || 0;
                    const currentAvgPrice = avgBuyPriceMap.get(sym) || 0;

                    if (t.type === 'BUY') {
                        const newQty = currentQty + t.quantity;
                        const newAvgPrice = ((currentQty * currentAvgPrice) + (t.quantity * t.price)) / newQty;
                        avgBuyPriceMap.set(sym, newAvgPrice);
                        holdingsMap.set(sym, newQty);
                        totalBought += t.quantity * t.price;
                    } else {
                        const gain = (t.price - currentAvgPrice) * t.quantity;
                        realizedReturn += gain;
                        holdingsMap.set(sym, Math.max(0, currentQty - t.quantity));
                        totalSold += t.quantity * t.price;
                        if (currentQty - t.quantity <= 0) {
                            avgBuyPriceMap.set(sym, 0);
                        }
                    }
                });

                let currentMarketValue = 0;
                let currentCostBasis = 0;
                let dayChange = 0;

                holdingsMap.forEach((qty, sym) => {
                    if (qty > 0) {
                        const currentPrice = priceMap.get(sym);
                        const avgPrice = avgBuyPriceMap.get(sym) || 0;
                        const effectivePrice = currentPrice ?? avgPrice;
                        const closePrice = closeMap.get(sym) ?? effectivePrice;

                        currentMarketValue += qty * effectivePrice;
                        currentCostBasis += qty * avgPrice;
                        dayChange += (effectivePrice - closePrice) * qty;
                    }
                });

                const unrealizedReturn = currentMarketValue - currentCostBasis;
                const totalReturn = realizedReturn + unrealizedReturn;
                const netInvested = totalBought - totalSold;
                const profitPercentage = netInvested > 0 ? (totalReturn / netInvested) * 100 : 0;

                const cashFlows: { amount: number; date: Date }[] = [];
                sortedTransactions.forEach(t => {
                    const amount = t.type === 'BUY' ? -(t.quantity * t.price) : (t.quantity * t.price);
                    cashFlows.push({ amount, date: new Date(t.date) });
                });
                if (currentMarketValue > 0) {
                    cashFlows.push({ amount: currentMarketValue, date: new Date() });
                }
                const xirr = calculateXIRR(cashFlows);

                return {
                    totalValue: currentMarketValue,
                    totalCost: netInvested,
                    profitAmount: totalReturn,
                    profitPercentage: profitPercentage,
                    totalReturn: totalReturn,
                    xirr,
                    dayChange,
                    dayChangePercentage: (currentMarketValue - dayChange) > 0 ? (dayChange / (currentMarketValue - dayChange)) * 100 : 0,
                    realizedReturn,
                    unrealizedReturn
                };
            },
            getAllocationData: (dimension) => {
                const { transactions, tickers } = get();
                if (transactions.length === 0) return [];

                const tickerMap = new Map(tickers.map(t => [t.Tickers.trim().toUpperCase(), t]));
                const sortedTransactions = [...transactions].sort((a, b) => {
                    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
                    if (dateDiff !== 0) return dateDiff;
                    if (a.type === b.type) return 0;
                    return a.type === 'BUY' ? -1 : 1;
                });

                const holdingsMap = new Map<string, { quantity: number, totalCost: number }>();
                sortedTransactions.forEach(t => {
                    const sym = t.symbol.trim().toUpperCase();
                    const current = holdingsMap.get(sym) || { quantity: 0, totalCost: 0 };
                    if (t.type === 'BUY') {
                        current.quantity += t.quantity;
                        current.totalCost += t.quantity * t.price;
                    } else {
                        const avgPriceBefore = current.quantity > 0 ? current.totalCost / current.quantity : 0;
                        current.quantity = Math.max(0, current.quantity - t.quantity);
                        current.totalCost = Math.max(0, current.totalCost - t.quantity * avgPriceBefore);
                    }
                    holdingsMap.set(sym, current);
                });

                const groups: Record<string, { value: number, cost: number, quantity: number, symbol?: string }> = {};
                let totalPortfolioValue = 0;

                holdingsMap.forEach((data, symbol) => {
                    if (data.quantity <= 0) return;
                    const ticker = tickerMap.get(symbol);
                    const lastTransaction = sortedTransactions.filter(t => t.symbol.trim().toUpperCase() === symbol).reverse()[0];
                    const avgPrice = data.totalCost / data.quantity;
                    const currentPrice = ticker?.['Current Value'] ?? avgPrice;

                    let dimensionValue = 'Unknown';
                    if (dimension === 'Broker' && lastTransaction) {
                        dimensionValue = lastTransaction.broker || 'No Broker';
                    } else if (ticker && (ticker as any)[dimension]) {
                        dimensionValue = (ticker as any)[dimension];
                    } else if (dimension === 'Company Name') {
                        dimensionValue = ticker ? ticker['Company Name'] : symbol;
                    }

                    const currentValue = data.quantity * currentPrice;
                    if (!groups[dimensionValue]) groups[dimensionValue] = { value: 0, cost: 0, quantity: 0 };
                    groups[dimensionValue].value += currentValue;
                    groups[dimensionValue].cost += data.totalCost;
                    groups[dimensionValue].quantity += data.quantity;
                    if (!groups[dimensionValue].symbol) groups[dimensionValue].symbol = symbol;
                    totalPortfolioValue += currentValue;
                });

                return Object.entries(groups).map(([name, data]) => ({
                    name,
                    symbol: data.symbol,
                    value: data.value,
                    totalCost: data.cost,
                    quantity: data.quantity,
                    logo: data.symbol ? tickerMap.get(data.symbol)?.Logo : undefined,
                    pnl: data.value - data.cost,
                    pnlPercentage: data.cost > 0 ? ((data.value - data.cost) / data.cost) * 100 : 0,
                    percentage: totalPortfolioValue > 0 ? (data.value / totalPortfolioValue) * 100 : 0
                })).sort((a, b) => b.value - a.value);
            },
            getHoldingsData: () => {
                const { transactions, tickers } = get();
                if (transactions.length === 0) return [];

                const tickerMap = new Map(tickers.map(t => [t.Tickers.trim().toUpperCase(), t]));
                const sortedTransactions = [...transactions].sort((a, b) => {
                    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
                    if (dateDiff !== 0) return dateDiff;
                    if (a.type === b.type) return 0;
                    return a.type === 'BUY' ? -1 : 1;
                });

                const holdingsMap = new Map<string, { quantity: number; totalCost: number; symbol: string }>();
                sortedTransactions.forEach(t => {
                    const sym = t.symbol.trim().toUpperCase();
                    const current = holdingsMap.get(sym) || { quantity: 0, totalCost: 0, symbol: t.symbol };
                    if (t.type === 'BUY') {
                        current.quantity += t.quantity;
                        current.totalCost += t.quantity * t.price;
                    } else {
                        const avgPriceBefore = current.quantity > 0 ? current.totalCost / current.quantity : 0;
                        current.quantity = Math.max(0, current.quantity - t.quantity);
                        current.totalCost = Math.max(0, current.totalCost - t.quantity * avgPriceBefore);
                    }
                    holdingsMap.set(sym, current);
                });

                let totalPortfolioValue = 0;
                const preliminaryHoldings: any[] = [];
                holdingsMap.forEach((data, symbol) => {
                    if (data.quantity <= 0) return;
                    const ticker = tickerMap.get(symbol);
                    const avgPrice = data.totalCost / data.quantity;
                    const currentPrice = ticker?.['Current Value'] ?? avgPrice;
                    const yesterdayClose = ticker?.['Yesterday Close'] ?? currentPrice;
                    const currentValue = data.quantity * currentPrice;
                    const investedValue = data.totalCost;
                    const dayChange = (currentPrice - yesterdayClose) * data.quantity;
                    totalPortfolioValue += currentValue;
                    preliminaryHoldings.push({
                        symbol: data.symbol,
                        companyName: ticker?.['Company Name'] || data.symbol,
                        quantity: data.quantity,
                        avgPrice,
                        currentPrice,
                        investedValue,
                        currentValue,
                        pnl: currentValue - investedValue,
                        pnlPercentage: investedValue > 0 ? ((currentValue - investedValue) / investedValue) * 100 : 0,
                        dayChange,
                        dayChangePercentage: yesterdayClose > 0 ? ((currentPrice - yesterdayClose) / yesterdayClose) * 100 : 0,
                        assetType: ticker?.['Asset Type'] || 'Other',
                        sector: ticker?.['Sector'] || 'Other',
                        high52: ticker?.High52,
                        low52: ticker?.Low52,
                        logo: ticker?.Logo,
                        broker: sortedTransactions.filter(t => t.symbol.trim().toUpperCase() === symbol).reverse()[0]?.broker || 'Unknown'
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
                const tickerMap = new Map(tickers.map(t => [t.Tickers.trim().toUpperCase(), t]));
                const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                const years = Array.from(new Set(sortedTransactions.map(t => new Date(t.date).getFullYear()))).sort();
                const analysis: import('../types').YearlyAnalysis[] = [];
                const cumulativeHoldings = new Map<string, number>();
                let previousAverageMonthlyInvestment = 0;

                years.forEach(year => {
                    const yearTransactions = sortedTransactions.filter(t => new Date(t.date).getFullYear() === year);
                    let yearInvestment = 0;
                    const assetValueMap = new Map<string, number>();
                    let yearInvestmentValue = 0;

                    yearTransactions.forEach(t => {
                        const sym = t.symbol.trim().toUpperCase();
                        const currentQty = cumulativeHoldings.get(sym) || 0;
                        const qtyChange = t.type === 'BUY' ? t.quantity : -t.quantity;
                        cumulativeHoldings.set(sym, currentQty + qtyChange);
                        const value = t.quantity * t.price;
                        const netValue = t.type === 'BUY' ? value : -value;
                        yearInvestment += netValue;
                        yearInvestmentValue += netValue;
                        const ticker = tickerMap.get(sym);
                        const assetType = ticker?.['Asset Type'] || 'Other';
                        assetValueMap.set(assetType, (assetValueMap.get(assetType) || 0) + netValue);
                    });

                    const assetDistribution = Array.from(assetValueMap.entries())
                        .filter(([_, value]) => value !== 0)
                        .map(([name, value]) => ({
                            name,
                            value,
                            percentage: yearInvestmentValue !== 0 ? (value / Math.abs(yearInvestmentValue)) * 100 : 0
                        })).sort((a, b) => b.value - a.value);

                    const currentDate = new Date();
                    let divisor = year === currentDate.getFullYear() ? currentDate.getMonth() + 1 : 12;
                    const averageMonthlyInvestment = yearInvestment / divisor;
                    const percentageIncrease = previousAverageMonthlyInvestment > 0 ? ((averageMonthlyInvestment - previousAverageMonthlyInvestment) / previousAverageMonthlyInvestment) * 100 : 0;

                    analysis.push({ year, investment: yearInvestment, averageMonthlyInvestment, percentageIncrease, assetDistribution });
                    previousAverageMonthlyInvestment = averageMonthlyInvestment;
                });
                return analysis.reverse();
            },
            getMonthlyAnalysis: () => {
                const { transactions, tickers } = get();
                if (transactions.length === 0) return [];
                const tickerMap = new Map(tickers.map(t => [t.Tickers.trim().toUpperCase(), t]));
                const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                const monthlyGroups = new Map<string, Transaction[]>();
                sortedTransactions.forEach(t => {
                    const date = new Date(t.date);
                    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    if (!monthlyGroups.has(key)) monthlyGroups.set(key, []);
                    monthlyGroups.get(key)!.push(t);
                });

                const monthKeys = Array.from(monthlyGroups.keys()).sort();
                if (monthKeys.length === 0) return [];
                const analysis: import('../types').MonthlyAnalysis[] = [];
                const cumulativeHoldings = new Map<string, number>();
                let previousMonthInvestment = 0;

                const lastDate = new Date();
                const lastMonth = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}`;
                let currentKey = monthKeys[0];
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
                    const assetValueMap = new Map<string, number>();
                    let monthInvestmentValue = 0;

                    monthTransactions.forEach(t => {
                        const sym = t.symbol.trim().toUpperCase();
                        const currentQty = cumulativeHoldings.get(sym) || 0;
                        const qtyChange = t.type === 'BUY' ? t.quantity : -t.quantity;
                        cumulativeHoldings.set(sym, currentQty + qtyChange);
                        const netValue = t.type === 'BUY' ? t.quantity * t.price : -(t.quantity * t.price);
                        monthInvestment += netValue;
                        monthInvestmentValue += netValue;
                        const assetType = tickerMap.get(sym)?.['Asset Type'] || 'Other';
                        assetValueMap.set(assetType, (assetValueMap.get(assetType) || 0) + netValue);
                    });

                    const assetDistribution = Array.from(assetValueMap.entries())
                        .filter(([_, value]) => value !== 0)
                        .map(([name, value]) => ({
                            name,
                            value,
                            percentage: monthInvestmentValue !== 0 ? (value / Math.abs(monthInvestmentValue)) * 100 : 0
                        })).sort((a, b) => b.value - a.value);

                    const [y, m] = key.split('-');
                    const monthName = new Date(Number(y), Number(m) - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
                    const percentageIncrease = previousMonthInvestment !== 0 ? ((monthInvestment - previousMonthInvestment) / Math.abs(previousMonthInvestment)) * 100 : 0;

                    analysis.push({ month: monthName, monthKey: key, investment: monthInvestment, percentageIncrease, assetDistribution });
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
            theme: 'system',
            setTheme: (theme) => set({ theme }),
            showCurrencySymbol: true,
            toggleCurrencySymbol: () => set((state) => ({ showCurrencySymbol: !state.showCurrencySymbol })),
            recentSearches: [],
            addRecentSearch: (query) => {
                if (!query || query.trim() === '') return;
                const trimmedQuery = query.trim();
                set((state) => {
                    const filtered = state.recentSearches.filter(s => s.toLowerCase() !== trimmedQuery.toLowerCase());
                    const updated = [trimmedQuery, ...filtered].slice(0, 10);
                    return { recentSearches: updated };
                });
            },
            clearRecentSearches: () => set({ recentSearches: [] }),
            headerLogo: null,
            headerLink: null,
            watchlist: [],
            toggleWatchlist: (ticker) => set((state) => {
                const exists = state.watchlist.includes(ticker);
                if (exists) {
                    return { watchlist: state.watchlist.filter(t => t !== ticker) };
                } else {
                    return { watchlist: [...state.watchlist, ticker] };
                }
            }),
            forecastYears: 15,
            setForecastYears: (years) => set({ forecastYears: years }),
        }),
        {
            name: 'portfolio-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
