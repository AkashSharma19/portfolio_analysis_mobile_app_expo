import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { calculateXIRR } from '../lib/finance';
import { PortfolioSummary, Ticker, Transaction } from '../types';
import { supabase } from '../lib/supabase';
import { fetchYahooQuote, fetchYahooQuotesBatch, getCompanyLogoUrl } from '../services/yahooFinanceService';

interface PortfolioState {
  transactions: Transaction[];
  tickers: Ticker[];
  addTransaction: (transaction: Transaction) => void;
  removeTransaction: (id: string) => void;
  updateTransaction: (id: string, transaction: Transaction) => void;
  fetchTickers: () => Promise<void>;
  fetchSingleTicker: (symbol: string) => Promise<Ticker | null>;
  remapCompanySymbol: (
    oldSymbol: string,
    newSymbol: string,
    targetSource?: 'yahoo' | 'sheet',
    customData?: { companyName?: string; currentPrice?: number; sector?: string; assetType?: string }
  ) => Promise<boolean>;
  getTickerSource: (symbol: string) => 'yahoo' | 'sheet';
  calculateSummary: () => PortfolioSummary;
  getAllocationData: (
    dimension: 'Sector' | 'Company Name' | 'Asset Type' | 'Broker',
  ) => import('../types').AllocationItem[];
  getHoldingsData: (brokerFilter?: string) => import('../types').Holding[];
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
  updateProfile: (profile: {
    name?: string;
    email?: string;
    mobile?: string;
    image?: string | null;
  }) => void;
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
  targetCorpus: number;
  setTargetCorpus: (corpus: number) => void;
  sipStepUp: number;
  setSipStepUp: (stepUp: number) => void;
  manualMonthlySIP: number | null;
  setManualMonthlySIP: (sip: number | null) => void;
  isInflationAdjusted: boolean;
  setIsInflationAdjusted: (isAdjusted: boolean) => void;
  activeScenarios: string[];
  toggleScenario: (scenario: string) => void;
  defaultIndex: string;
  setDefaultIndex: (ticker: string) => void;
  lastSyncedAt: number | null;
  deletedTransactionIds: string[];
  deletedWatchlistIds: string[];
  deviceId: string | null;
  getDeviceId: () => string;
  clearAllData: () => void;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      transactions: [],
      tickers: [],
      deletedTransactionIds: [],
      deletedWatchlistIds: [],
      deviceId: null,
      getDeviceId: () => {
        let id = get().deviceId;
        if (!id) {
          id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          set({ deviceId: id });
        }
        return id;
      },
      addTransaction: (transaction) => {
        const cleanTx: Transaction = {
          ...transaction,
          id: transaction.id ? String(transaction.id) : Math.random().toString(36).substring(7),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          transactions: [...state.transactions, cleanTx],
        }));
      },
      removeTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((t) => String(t.id) !== String(id)),
          deletedTransactionIds: [...(state.deletedTransactionIds || []), String(id)],
        })),
      updateTransaction: (id, transaction) =>
        set((state) => ({
          transactions: state.transactions.map((t) =>
            String(t.id) === String(id)
              ? { ...transaction, id: String(id), updatedAt: new Date().toISOString() }
              : t,
          ),
        })),
      fetchTickers: async () => {
        try {
          // 1. Fetch cached Tickers from Supabase
          const { data: tickersData } = await supabase
            .from('tickers')
            .select('*');

          // 2. Fetch Global Configs from Supabase
          const { data: configsData } = await supabase
            .from('global_configs')
            .select('*');

          let logo: string | null = null;
          let link: string | null = null;

          if (configsData) {
            const logoConfig = configsData.find((c: any) => c.key === 'header_logo');
            const linkConfig = configsData.find((c: any) => c.key === 'header_link');
            logo = logoConfig?.value?.url || null;
            link = linkConfig?.value?.url || null;
          }

          let currentTickers: Ticker[] = get().tickers || [];
          const localTickerMap = new Map<string, Ticker>();
          currentTickers.forEach((t) => localTickerMap.set(t.Tickers.trim().toUpperCase(), t));

          if (tickersData && tickersData.length > 0) {
            const mappedTickers: Ticker[] = tickersData.map((t: any) => {
              const historicalData = t.historical_data || {};
              const symUpper = (t.ticker || '').trim().toUpperCase();
              const existingLocal = localTickerMap.get(symUpper);
              const isSheet =
                existingLocal?.source === 'sheet' ||
                symUpper.includes(':') ||
                symUpper.startsWith('NSE') ||
                symUpper.startsWith('BOM');

              return {
                Tickers: t.ticker,
                'Current Value': Number(t.current_value),
                'Company Name': t.company_name,
                'Asset Type': t.asset_type,
                Sector: t.sector,
                'Yesterday Close': t.yesterday_close !== null ? Number(t.yesterday_close) : undefined,
                High52: t.high_52 !== null ? Number(t.high_52) : undefined,
                Low52: t.low_52 !== null ? Number(t.low_52) : undefined,
                Logo: (t.logo && !t.logo.includes('icon.horse')) ? t.logo : getCompanyLogoUrl(t.ticker, t.company_name),
                'Market Cap': t.market_cap,
                PE: t.pe !== null ? Number(t.pe) : null,
                DividendYield: t.dividend_yield !== null ? Number(t.dividend_yield) : null,
                DebtToEquity: t.debt_to_equity !== null ? Number(t.debt_to_equity) : null,
                source: isSheet ? 'sheet' : (existingLocal?.source || 'yahoo'),
                ...historicalData,
              };
            });
            currentTickers = mappedTickers;
          }

          // 3. Identify all distinct active Yahoo symbols to refresh in real-time
          const { transactions, watchlist } = get();
          const txSymbols = transactions
            .map((t) => t.symbol.trim().toUpperCase())
            .filter((sym) => get().getTickerSource(sym) === 'yahoo');
          const watchSymbols = (watchlist || [])
            .map((w: any) => (typeof w === 'string' ? w : (w?.symbol || '')).trim().toUpperCase())
            .filter((sym) => get().getTickerSource(sym) === 'yahoo');
          const cachedSymbols = currentTickers
            .filter((t) => t.source === 'yahoo')
            .map((t) => t.Tickers.trim().toUpperCase());

          const symbolsToRefresh = Array.from(
            new Set([...txSymbols, ...watchSymbols, ...cachedSymbols].filter(Boolean))
          );

          if (symbolsToRefresh.length > 0) {
            // Fetch live quotes from Yahoo Finance
            const liveQuotes = await fetchYahooQuotesBatch(symbolsToRefresh, 8);

            if (liveQuotes.length > 0) {
              const tickerMap = new Map<string, Ticker>();
              currentTickers.forEach((t) => tickerMap.set(t.Tickers.trim().toUpperCase(), t));

              // Merge fresh market quotes (only for yahoo assets)
              liveQuotes.forEach((lq) => {
                const sym = lq.Tickers.trim().toUpperCase();
                const existing = tickerMap.get(sym);
                if (existing?.source === 'sheet') return;
                tickerMap.set(sym, {
                  ...(existing || {}),
                  ...lq,
                  source: 'yahoo',
                  Logo: (lq.Logo && !lq.Logo.includes('icon.horse')) ? lq.Logo : getCompanyLogoUrl(sym, lq['Company Name']),
                  Sector: (lq.Sector && lq.Sector !== 'General') ? lq.Sector : (existing?.Sector || 'General'),
                  PE: lq.PE !== undefined ? lq.PE : existing?.PE,
                  'Market Cap': lq['Market Cap'] !== undefined ? lq['Market Cap'] : existing?.['Market Cap'],
                });
              });

              currentTickers = Array.from(tickerMap.values());

              // Async background sync to Supabase tickers table
              const upsertRows = liveQuotes.map((q) => ({
                ticker: q.Tickers,
                current_value: q['Current Value'],
                company_name: q['Company Name'],
                asset_type: q['Asset Type'] || 'Equity',
                sector: q.Sector || 'General',
                yesterday_close: q['Yesterday Close'],
                high_52: q.High52,
                low_52: q.Low52,
                logo: q.Logo || getCompanyLogoUrl(q.Tickers, q['Company Name']),
                pe: q.PE,
                market_cap: q['Market Cap'],
                updated_at: new Date().toISOString(),
              }));

              (async () => {
                try {
                  const { error } = await supabase
                    .from('tickers')
                    .upsert(upsertRows, { onConflict: 'ticker' });
                  if (error) console.warn('Background tickers upsert error:', error.message);
                } catch (err) {
                  console.warn('Background tickers upsert failed:', err);
                }
              })();
            }
          }

          set({
            tickers: currentTickers,
            headerLogo: logo,
            headerLink: link,
            lastSyncedAt: Date.now(),
          });
        } catch (error) {
          console.error('Failed to fetch tickers:', error);
        }
      },
      fetchSingleTicker: async (symbol: string) => {
        const cleanSym = symbol.trim().toUpperCase();
        if (!cleanSym) return null;

        const existing = get().tickers.find(
          (t) => t.Tickers.trim().toUpperCase() === cleanSym
        );

        // If explicitly a sheet ticker, do not query Yahoo Finance
        if (existing?.source === 'sheet' || cleanSym.includes(':') || cleanSym.startsWith('NSE:') || cleanSym.startsWith('BOM:')) {
          return existing || null;
        }

        try {
          const liveTicker = await fetchYahooQuote(cleanSym);
          if (liveTicker) {
            const merged: Ticker = {
              ...(existing || {}),
              ...liveTicker,
              source: 'yahoo',
              Logo: (liveTicker.Logo && !liveTicker.Logo.includes('icon.horse')) ? liveTicker.Logo : getCompanyLogoUrl(cleanSym, liveTicker['Company Name']),
              Sector: (liveTicker.Sector && liveTicker.Sector !== 'General') ? liveTicker.Sector : (existing?.Sector || 'General'),
              PE: liveTicker.PE !== undefined ? liveTicker.PE : existing?.PE,
              'Market Cap': liveTicker['Market Cap'] !== undefined ? liveTicker['Market Cap'] : existing?.['Market Cap'],
            };

            set((state) => {
              const filtered = state.tickers.filter(
                (t) => t.Tickers.trim().toUpperCase() !== cleanSym
              );
              return { tickers: [...filtered, merged] };
            });

            // Async background upsert to Supabase
            (async () => {
              try {
                await supabase
                  .from('tickers')
                  .upsert({
                    ticker: merged.Tickers,
                    current_value: merged['Current Value'],
                    company_name: merged['Company Name'],
                    asset_type: merged['Asset Type'] || 'Equity',
                    sector: merged.Sector || 'General',
                    yesterday_close: merged['Yesterday Close'],
                    high_52: merged.High52,
                    low_52: merged.Low52,
                    logo: merged.Logo,
                    pe: merged.PE,
                    market_cap: merged['Market Cap'],
                    updated_at: new Date().toISOString(),
                  }, { onConflict: 'ticker' });
              } catch (err) {
                console.warn('Single ticker upsert error:', err);
              }
            })();

            return merged;
          }
        } catch (e) {
          console.warn(`Failed to fetch single quote for ${cleanSym}:`, e);
        }

        return existing || null;
      },
      getTickerSource: (symbol: string): 'yahoo' | 'sheet' => {
        const cleanSym = (symbol || '').trim().toUpperCase();
        if (!cleanSym) return 'sheet';
        const ticker = get().tickers.find(
          (t) => t.Tickers.trim().toUpperCase() === cleanSym
        );
        if (ticker?.source) return ticker.source;
        // Symbols containing colons or starting with exchange/fund prefixes are sheet
        if (
          cleanSym.includes(':') ||
          cleanSym.startsWith('NSE') ||
          cleanSym.startsWith('BOM') ||
          cleanSym.startsWith('NASDAQ') ||
          cleanSym.startsWith('NYSE') ||
          cleanSym.startsWith('MUTF') ||
          cleanSym.startsWith('INDEX') ||
          cleanSym.startsWith('.')
        ) {
          return 'sheet';
        }
        return 'yahoo';
      },
      remapCompanySymbol: async (
        oldSymbol: string,
        newSymbol: string,
        targetSource: 'yahoo' | 'sheet' = 'yahoo',
        customData?: { companyName?: string; currentPrice?: number; sector?: string; assetType?: string }
      ): Promise<boolean> => {
        const cleanOld = (oldSymbol || '').trim().toUpperCase();
        const cleanNew = (newSymbol || '').trim().toUpperCase();
        if (!cleanOld || !cleanNew) return false;

        try {
          let mergedNewTicker: Ticker;

          if (targetSource === 'yahoo') {
            // 1. Fetch live quote for the new Yahoo symbol
            const newTicker = await fetchYahooQuote(cleanNew);

            mergedNewTicker = newTicker || {
              Tickers: cleanNew,
              'Company Name': customData?.companyName || cleanNew,
              'Current Value': customData?.currentPrice || 0,
              'Asset Type': customData?.assetType || 'Equity',
              Sector: customData?.sector || 'General',
              Logo: getCompanyLogoUrl(cleanNew, customData?.companyName || cleanNew),
              source: 'yahoo',
            };
            mergedNewTicker.source = 'yahoo';
          } else {
            // 2. Target source is Google Sheet / custom
            const existingOldTicker = get().tickers.find(
              (t) => t.Tickers.trim().toUpperCase() === cleanOld
            );
            mergedNewTicker = {
              Tickers: cleanNew,
              'Company Name': customData?.companyName || existingOldTicker?.['Company Name'] || cleanNew,
              'Current Value': customData?.currentPrice !== undefined ? customData.currentPrice : (existingOldTicker?.['Current Value'] || 0),
              'Asset Type': customData?.assetType || existingOldTicker?.['Asset Type'] || 'Equity',
              Sector: customData?.sector || existingOldTicker?.Sector || 'General',
              Logo: existingOldTicker?.Logo || getCompanyLogoUrl(cleanNew, customData?.companyName || cleanNew),
              source: 'sheet',
            };
          }

          // 2. Update all transactions with oldSymbol -> newSymbol
          const updatedTransactions = get().transactions.map((t) => {
            if (t.symbol.trim().toUpperCase() === cleanOld) {
              return {
                ...t,
                symbol: cleanNew,
                updatedAt: new Date().toISOString(),
              };
            }
            return t;
          });

          // 3. Update watchlist
          const updatedWatchlist = get().watchlist.map((w) =>
            w.trim().toUpperCase() === cleanOld ? cleanNew : w
          );

          // 4. Update tickers array: replace/merge ticker metadata
          const otherTickers = get().tickers.filter(
            (t) => t.Tickers.trim().toUpperCase() !== cleanOld && t.Tickers.trim().toUpperCase() !== cleanNew
          );

          set({
            transactions: updatedTransactions,
            watchlist: updatedWatchlist,
            tickers: [...otherTickers, mergedNewTicker],
            lastSyncedAt: Date.now(),
          });

          // 5. Background sync to Supabase
          (async () => {
            try {
              const changedTx = updatedTransactions.filter((t) => t.symbol.trim().toUpperCase() === cleanNew);
              if (changedTx.length > 0) {
                const { data: authData } = await supabase.auth.getUser();
                const userId = authData?.user?.id;
                if (userId) {
                  const txRows = changedTx.map((t) => ({
                    id: t.id,
                    user_id: userId,
                    symbol: t.symbol,
                    quantity: t.quantity,
                    price: t.price,
                    date: t.date,
                    type: t.type,
                    currency: t.currency || 'INR',
                    broker: t.broker || '',
                    is_deleted: false,
                    updated_at: new Date().toISOString(),
                  }));
                  await supabase.from('portfolio_transactions').upsert(txRows, { onConflict: 'id' });
                }
              }

              await supabase.from('tickers').upsert([{
                ticker: mergedNewTicker.Tickers,
                current_value: mergedNewTicker['Current Value'] || 0,
                company_name: mergedNewTicker['Company Name'],
                asset_type: mergedNewTicker['Asset Type'] || 'Equity',
                sector: mergedNewTicker.Sector || 'General',
                yesterday_close: mergedNewTicker['Yesterday Close'] ?? null,
                high_52: mergedNewTicker.High52 ?? null,
                low_52: mergedNewTicker.Low52 ?? null,
                logo: mergedNewTicker.Logo || null,
                pe: mergedNewTicker.PE ?? null,
                market_cap: mergedNewTicker['Market Cap'] ?? null,
                updated_at: new Date().toISOString(),
              }], { onConflict: 'ticker' });
            } catch (err) {
              console.warn('[remapCompanySymbol] Supabase background sync failed:', err);
            }
          })();

          return true;
        } catch (err) {
          console.error('Error in remapCompanySymbol:', err);
          return false;
        }
      },
      calculateSummary: () => {
        const { transactions, tickers } = get();
        if (transactions.length === 0) {
          return {
            totalValue: 0,
            totalCost: 0,
            profitAmount: 0,
            profitPercentage: 0,
            totalReturn: 0,
            xirr: 0,
            dayChange: 0,
            dayChangePercentage: 0,
            realizedReturn: 0,
            unrealizedReturn: 0,
            oneYearReturn: 0,
          };
        }

        const priceMap = new Map<string, number>();
        const closeMap = new Map<string, number>();
        const oneYearAgoPriceMap = new Map<string, number>();

        tickers.forEach((t) => {
          const sym = t.Tickers.trim().toUpperCase();
          priceMap.set(sym, t['Current Value']);
          closeMap.set(sym, t['Yesterday Close'] ?? t['Current Value']);
          oneYearAgoPriceMap.set(
            sym,
            (t['Today - 365'] as number) ?? (t['Current Value'] as number),
          );
        });

        const sortedTransactions = [...transactions].sort((a, b) => {
          const dateDiff =
            new Date(a.date).getTime() - new Date(b.date).getTime();
          if (dateDiff !== 0) return dateDiff;
          if (a.type === b.type) return 0;
          return a.type === 'BUY' ? -1 : 1;
        });

        const holdingsMap = new Map<string, number>();
        const avgBuyPriceMap = new Map<string, number>();

        let totalBought = 0;
        let totalSold = 0;
        let realizedReturn = 0;

        sortedTransactions.forEach((t) => {
          const sym = t.symbol.trim().toUpperCase();
          const currentQty = holdingsMap.get(sym) || 0;
          const currentAvgPrice = avgBuyPriceMap.get(sym) || 0;

          if (t.type === 'BUY') {
            const newQty = currentQty + t.quantity;
            const newAvgPrice =
              (currentQty * currentAvgPrice + t.quantity * t.price) / newQty;
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

        // Calculate Accurate 1-Year Performance
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const holdings1Y = new Map<string, number>();
        sortedTransactions
          .filter((t) => new Date(t.date) < oneYearAgo)
          .forEach((t) => {
            const sym = t.symbol.trim().toUpperCase();
            const qty = holdings1Y.get(sym) || 0;
            if (t.type === 'BUY') holdings1Y.set(sym, qty + t.quantity);
            else holdings1Y.set(sym, Math.max(0, qty - t.quantity));
          });

        let valueOneYearAgo = 0;
        holdings1Y.forEach((qty, sym) => {
          if (qty > 0) {
            const ticker = tickers.find(
              (t) => t.Tickers.trim().toUpperCase() === sym,
            );
            const price1Y =
              (ticker?.['Today - 365'] as number) ??
              ticker?.['Current Value'] ??
              0;
            valueOneYearAgo += qty * price1Y;
          }
        });

        const transactionsIn1Y = sortedTransactions.filter(
          (t) => new Date(t.date) >= oneYearAgo,
        );
        const buys1Y = transactionsIn1Y
          .filter((t) => t.type === 'BUY')
          .reduce((acc, t) => acc + t.quantity * t.price, 0);
        const sells1Y = transactionsIn1Y
          .filter((t) => t.type === 'SELL')
          .reduce((acc, t) => acc + t.quantity * t.price, 0);

        const denominator = valueOneYearAgo + buys1Y;
        const numerator = currentMarketValue + sells1Y;
        const oneYearReturn =
          denominator > 0 ? ((numerator - denominator) / denominator) * 100 : 0;

        const unrealizedReturn = currentMarketValue - currentCostBasis;
        const totalReturn = realizedReturn + unrealizedReturn;
        const netInvested = totalBought - totalSold;
        const profitPercentage =
          netInvested > 0 ? (totalReturn / netInvested) * 100 : 0;

        const cashFlows: { amount: number; date: Date }[] = [];
        sortedTransactions.forEach((t) => {
          const amount =
            t.type === 'BUY' ? -(t.quantity * t.price) : t.quantity * t.price;
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
          dayChangePercentage:
            currentMarketValue - dayChange > 0
              ? (dayChange / (currentMarketValue - dayChange)) * 100
              : 0,
          realizedReturn,
          unrealizedReturn,
          oneYearReturn,
        };
      },
      getAllocationData: (dimension) => {
        const { transactions, tickers } = get();
        if (transactions.length === 0) return [];

        const tickerMap = new Map(
          tickers.map((t) => [t.Tickers.trim().toUpperCase(), t]),
        );
        const sortedTransactions = [...transactions].sort((a, b) => {
          const dateDiff =
            new Date(a.date).getTime() - new Date(b.date).getTime();
          if (dateDiff !== 0) return dateDiff;
          if (a.type === b.type) return 0;
          return a.type === 'BUY' ? -1 : 1;
        });

        // Compute total global portfolio value for proportional percentages
        let globalPortfolioValue = 0;
        const globalHoldingsMap = new Map<
          string,
          { quantity: number; totalCost: number }
        >();
        sortedTransactions.forEach((t) => {
          const sym = t.symbol.trim().toUpperCase();
          const current = globalHoldingsMap.get(sym) || { quantity: 0, totalCost: 0 };
          if (t.type === 'BUY') {
            current.quantity += t.quantity;
            current.totalCost += t.quantity * t.price;
          } else {
            const avgPriceBefore =
              current.quantity > 0 ? current.totalCost / current.quantity : 0;
            current.quantity = Math.max(0, current.quantity - t.quantity);
            current.totalCost = Math.max(
              0,
              current.totalCost - t.quantity * avgPriceBefore,
            );
          }
          globalHoldingsMap.set(sym, current);
        });

        globalHoldingsMap.forEach((data, symbol) => {
          if (data.quantity <= 0) return;
          const ticker = tickerMap.get(symbol);
          const avgPrice = data.totalCost / data.quantity;
          const currentPrice = ticker?.['Current Value'] ?? avgPrice;
          globalPortfolioValue += data.quantity * currentPrice;
        });

        // Handle Broker dimension specifically by (symbol, broker) pair
        if (dimension === 'Broker') {
          const brokerHoldingsMap = new Map<
            string,
            { quantity: number; totalCost: number; symbol: string; broker: string }
          >();

          sortedTransactions.forEach((t) => {
            const sym = t.symbol.trim().toUpperCase();
            const broker = t.broker?.trim() || 'Unassigned';
            const key = `${sym}:::${broker}`;
            const current = brokerHoldingsMap.get(key) || {
              quantity: 0,
              totalCost: 0,
              symbol: t.symbol,
              broker,
            };
            if (t.type === 'BUY') {
              current.quantity += t.quantity;
              current.totalCost += t.quantity * t.price;
            } else {
              const avgPriceBefore =
                current.quantity > 0 ? current.totalCost / current.quantity : 0;
              current.quantity = Math.max(0, current.quantity - t.quantity);
              current.totalCost = Math.max(
                0,
                current.totalCost - t.quantity * avgPriceBefore,
              );
            }
            brokerHoldingsMap.set(key, current);
          });

          const groups: Record<
            string,
            { value: number; cost: number; quantity: number; stocksCount: number; symbol?: string }
          > = {};

          brokerHoldingsMap.forEach((data) => {
            if (data.quantity <= 0) return;
            const symUpper = data.symbol.trim().toUpperCase();
            const ticker = tickerMap.get(symUpper);
            const avgPrice = data.totalCost / data.quantity;
            const currentPrice = ticker?.['Current Value'] ?? avgPrice;
            const currentValue = data.quantity * currentPrice;
            const brokerName = data.broker;

            if (!groups[brokerName]) {
              groups[brokerName] = { value: 0, cost: 0, quantity: 0, stocksCount: 0 };
            }
            groups[brokerName].value += currentValue;
            groups[brokerName].cost += data.totalCost;
            groups[brokerName].quantity += data.quantity;
            groups[brokerName].stocksCount += 1;
          });

          return Object.entries(groups)
            .map(([name, data]) => ({
              name,
              symbol: undefined,
              value: data.value,
              totalCost: data.cost,
              quantity: data.quantity,
              stocksCount: data.stocksCount,
              logo: undefined,
              pnl: data.value - data.cost,
              pnlPercentage:
                data.cost > 0 ? ((data.value - data.cost) / data.cost) * 100 : 0,
              percentage:
                globalPortfolioValue > 0
                  ? (data.value / globalPortfolioValue) * 100
                  : 0,
            }))
            .sort((a, b) => b.value - a.value);
        }

        // Standard dimensions: Sector, Asset Type, Company Name
        const groups: Record<
          string,
          { value: number; cost: number; quantity: number; stocksCount: number; symbol?: string }
        > = {};

        globalHoldingsMap.forEach((data, symbol) => {
          if (data.quantity <= 0) return;
          const ticker = tickerMap.get(symbol);
          const avgPrice = data.totalCost / data.quantity;
          const currentPrice = ticker?.['Current Value'] ?? avgPrice;

          let dimensionValue = 'Unknown';
          if (ticker && ticker[dimension]) {
            dimensionValue = String(ticker[dimension]);
          } else if (dimension === 'Company Name') {
            dimensionValue = ticker ? ticker['Company Name'] : symbol;
          }

          const currentValue = data.quantity * currentPrice;
          if (!groups[dimensionValue])
            groups[dimensionValue] = { value: 0, cost: 0, quantity: 0, stocksCount: 0 };
          groups[dimensionValue].value += currentValue;
          groups[dimensionValue].cost += data.totalCost;
          groups[dimensionValue].quantity += data.quantity;
          groups[dimensionValue].stocksCount += 1;
          if (!groups[dimensionValue].symbol)
            groups[dimensionValue].symbol = symbol;
        });

        return Object.entries(groups)
          .map(([name, data]) => ({
            name,
            symbol: data.symbol,
            value: data.value,
            totalCost: data.cost,
            quantity: data.quantity,
            stocksCount: data.stocksCount,
            logo: data.symbol ? (tickerMap.get(data.symbol)?.Logo || getCompanyLogoUrl(data.symbol, name)) : undefined,
            pnl: data.value - data.cost,
            pnlPercentage:
              data.cost > 0 ? ((data.value - data.cost) / data.cost) * 100 : 0,
            percentage:
              globalPortfolioValue > 0
                ? (data.value / globalPortfolioValue) * 100
                : 0,
          }))
          .sort((a, b) => b.value - a.value);
      },
      getHoldingsData: (brokerFilter?: string) => {
        const { transactions, tickers } = get();
        if (transactions.length === 0) return [];

        const tickerMap = new Map(
          tickers.map((t) => [t.Tickers.trim().toUpperCase(), t]),
        );
        const sortedTransactions = [...transactions].sort((a, b) => {
          const dateDiff =
            new Date(a.date).getTime() - new Date(b.date).getTime();
          if (dateDiff !== 0) return dateDiff;
          if (a.type === b.type) return 0;
          return a.type === 'BUY' ? -1 : 1;
        });

        const effectiveTransactions = brokerFilter
          ? sortedTransactions.filter(
              (t) => (t.broker?.trim() || 'Unassigned') === brokerFilter,
            )
          : sortedTransactions;

        const holdingsMap = new Map<
          string,
          { quantity: number; totalCost: number; symbol: string }
        >();
        effectiveTransactions.forEach((t) => {
          const sym = t.symbol.trim().toUpperCase();
          const current = holdingsMap.get(sym) || {
            quantity: 0,
            totalCost: 0,
            symbol: t.symbol,
          };
          if (t.type === 'BUY') {
            current.quantity += t.quantity;
            current.totalCost += t.quantity * t.price;
          } else {
            const avgPriceBefore =
              current.quantity > 0 ? current.totalCost / current.quantity : 0;
            current.quantity = Math.max(0, current.quantity - t.quantity);
            current.totalCost = Math.max(
              0,
              current.totalCost - t.quantity * avgPriceBefore,
            );
          }
          holdingsMap.set(sym, current);
        });

        let totalHoldingsValue = 0;
        const preliminaryHoldings: import('../types').Holding[] = [];
        holdingsMap.forEach((data, symbol) => {
          if (data.quantity <= 0) return;
          const ticker = tickerMap.get(symbol);
          const avgPrice = data.totalCost / data.quantity;
          const currentPrice = ticker?.['Current Value'] ?? avgPrice;
          const yesterdayClose = ticker?.['Yesterday Close'] ?? currentPrice;
          const currentValue = data.quantity * currentPrice;
          const investedValue = data.totalCost;
          const dayChange = (currentPrice - yesterdayClose) * data.quantity;
          totalHoldingsValue += currentValue;

          // Find broker representation
          const stockTxs = sortedTransactions.filter(
            (t) => t.symbol.trim().toUpperCase() === symbol,
          );
          const distinctBrokers = Array.from(
            new Set(stockTxs.map((t) => t.broker?.trim() || 'Unassigned')),
          );
          const brokerLabel = brokerFilter
            ? brokerFilter
            : distinctBrokers.length > 1
              ? distinctBrokers.join(', ')
              : distinctBrokers[0] || 'Unassigned';

          preliminaryHoldings.push({
            symbol: data.symbol,
            companyName: ticker?.['Company Name'] || data.symbol,
            quantity: data.quantity,
            avgPrice,
            currentPrice,
            investedValue,
            currentValue,
            pnl: currentValue - investedValue,
            pnlPercentage:
              investedValue > 0
                ? ((currentValue - investedValue) / investedValue) * 100
                : 0,
            dayChange,
            dayChangePercentage:
              yesterdayClose > 0
                ? ((currentPrice - yesterdayClose) / yesterdayClose) * 100
                : 0,
            assetType: ticker?.['Asset Type'] || 'Other',
            sector: ticker?.['Sector'] || 'Other',
            high52: ticker?.High52,
            low52: ticker?.Low52,
            PE: ticker?.PE,
            DividendYield: ticker?.DividendYield || ticker?.['Dividend Yield'],
            DebtToEquity: ticker?.DebtToEquity || ticker?.['Debt to Equity'],
            logo: ticker?.Logo || getCompanyLogoUrl(data.symbol, ticker?.['Company Name']),
            marketCap: ticker?.['Market Cap'],
            broker: brokerLabel,
          });
        });

        return preliminaryHoldings
          .map((h) => ({
            ...h,
            contributionPercentage:
              totalHoldingsValue > 0
                ? (h.currentValue / totalHoldingsValue) * 100
                : 0,
          }))
          .sort((a, b) => b.currentValue - a.currentValue);
      },
      getYearlyAnalysis: () => {
        const { transactions, tickers } = get();
        if (transactions.length === 0) return [];
        const tickerMap = new Map(
          tickers.map((t) => [t.Tickers.trim().toUpperCase(), t]),
        );
        const sortedTransactions = [...transactions].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
        const years = Array.from(
          new Set(
            sortedTransactions.map((t) => new Date(t.date).getFullYear()),
          ),
        ).sort();
        const analysis: import('../types').YearlyAnalysis[] = [];
        const cumulativeHoldings = new Map<string, number>();
        let previousAverageMonthlyInvestment = 0;

        years.forEach((year) => {
          const yearTransactions = sortedTransactions.filter(
            (t) => new Date(t.date).getFullYear() === year,
          );
          let yearInvestment = 0;
          const assetValueMap = new Map<string, number>();
          let yearInvestmentValue = 0;

          yearTransactions.forEach((t) => {
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
            assetValueMap.set(
              assetType,
              (assetValueMap.get(assetType) || 0) + netValue,
            );
          });

          const assetDistribution = Array.from(assetValueMap.entries())
            .filter(([_, value]) => value !== 0)
            .map(([name, value]) => ({
              name,
              value,
              percentage:
                yearInvestmentValue !== 0
                  ? (value / Math.abs(yearInvestmentValue)) * 100
                  : 0,
            }))
            .sort((a, b) => b.value - a.value);

          const currentDate = new Date();
          const divisor =
            year === currentDate.getFullYear()
              ? currentDate.getMonth() + 1
              : 12;
          const averageMonthlyInvestment = yearInvestment / divisor;
          const percentageIncrease =
            previousAverageMonthlyInvestment > 0
              ? ((averageMonthlyInvestment - previousAverageMonthlyInvestment) /
                  previousAverageMonthlyInvestment) *
                100
              : 0;

          analysis.push({
            year,
            investment: yearInvestment,
            averageMonthlyInvestment,
            percentageIncrease,
            assetDistribution,
          });
          previousAverageMonthlyInvestment = averageMonthlyInvestment;
        });
        return analysis.reverse();
      },
      getMonthlyAnalysis: () => {
        const { transactions, tickers } = get();
        if (transactions.length === 0) return [];
        const tickerMap = new Map(
          tickers.map((t) => [t.Tickers.trim().toUpperCase(), t]),
        );
        const sortedTransactions = [...transactions].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
        const monthlyGroups = new Map<string, Transaction[]>();
        sortedTransactions.forEach((t) => {
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

        allMonthKeys.forEach((key) => {
          const monthTransactions = monthlyGroups.get(key) || [];
          let monthInvestment = 0;
          const assetValueMap = new Map<string, number>();
          let monthInvestmentValue = 0;

          monthTransactions.forEach((t) => {
            const sym = t.symbol.trim().toUpperCase();
            const currentQty = cumulativeHoldings.get(sym) || 0;
            const qtyChange = t.type === 'BUY' ? t.quantity : -t.quantity;
            cumulativeHoldings.set(sym, currentQty + qtyChange);
            const netValue =
              t.type === 'BUY' ? t.quantity * t.price : -(t.quantity * t.price);
            monthInvestment += netValue;
            monthInvestmentValue += netValue;
            const assetType = tickerMap.get(sym)?.['Asset Type'] || 'Other';
            assetValueMap.set(
              assetType,
              (assetValueMap.get(assetType) || 0) + netValue,
            );
          });

          const assetDistribution = Array.from(assetValueMap.entries())
            .filter(([_, value]) => value !== 0)
            .map(([name, value]) => ({
              name,
              value,
              percentage:
                monthInvestmentValue !== 0
                  ? (value / Math.abs(monthInvestmentValue)) * 100
                  : 0,
            }))
            .sort((a, b) => b.value - a.value);

          const [y, m] = key.split('-');
          const monthName = new Date(Number(y), Number(m) - 1).toLocaleString(
            'default',
            { month: 'short', year: 'numeric' },
          );
          const percentageIncrease =
            previousMonthInvestment !== 0
              ? ((monthInvestment - previousMonthInvestment) /
                  Math.abs(previousMonthInvestment)) *
                100
              : 0;

          analysis.push({
            month: monthName,
            monthKey: key,
            investment: monthInvestment,
            percentageIncrease,
            assetDistribution,
          });
          previousMonthInvestment = monthInvestment;
        });
        return analysis.reverse();
      },
      importTransactions: (newTransactions) =>
        set((state) => ({
          transactions: [
            ...state.transactions,
            ...newTransactions.map((t, idx) => ({
              ...t,
              id: t.id ? String(t.id) : `tx-${t.symbol || 'stock'}-${Date.now()}-${idx}`,
              updatedAt: t.updatedAt || new Date().toISOString(),
            })),
          ],
        })),
      isPrivacyMode: false,
      togglePrivacyMode: () =>
        set((state) => ({ isPrivacyMode: !state.isPrivacyMode })),
      userName: '',
      userEmail: '',
      userMobile: '',
      userImage: null,
      updateProfile: (profile) =>
        set((state) => ({
          userName: profile.name !== undefined ? profile.name : state.userName,
          userEmail:
            profile.email !== undefined ? profile.email : state.userEmail,
          userMobile:
            profile.mobile !== undefined ? profile.mobile : state.userMobile,
          userImage:
            profile.image !== undefined ? profile.image : state.userImage,
        })),
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      showCurrencySymbol: true,
      toggleCurrencySymbol: () =>
        set((state) => ({ showCurrencySymbol: !state.showCurrencySymbol })),
      recentSearches: [],
      addRecentSearch: (query) => {
        if (!query || query.trim() === '') return;
        const trimmedQuery = query.trim();
        set((state) => {
          const filtered = state.recentSearches.filter(
            (s) => s.toLowerCase() !== trimmedQuery.toLowerCase(),
          );
          const updated = [trimmedQuery, ...filtered].slice(0, 10);
          return { recentSearches: updated };
        });
      },
      clearRecentSearches: () => set({ recentSearches: [] }),
      headerLogo: null,
      headerLink: null,
      watchlist: [],
      toggleWatchlist: (ticker) =>
        set((state) => {
          const exists = state.watchlist.includes(ticker);
          if (exists) {
            return {
              watchlist: state.watchlist.filter((t) => t !== ticker),
              deletedWatchlistIds: [...(state.deletedWatchlistIds || []), ticker],
            };
          }
          return {
            watchlist: [...state.watchlist, ticker],
            deletedWatchlistIds: (state.deletedWatchlistIds || []).filter((id) => id !== ticker),
          };
        }),
      forecastYears: 15,
      setForecastYears: (years) => set({ forecastYears: years }),
      targetCorpus: 50000000,
      setTargetCorpus: (corpus) => set({ targetCorpus: corpus }),
      sipStepUp: 10,
      setSipStepUp: (stepUp) => set({ sipStepUp: stepUp }),
      manualMonthlySIP: null,
      setManualMonthlySIP: (sip) => set({ manualMonthlySIP: sip }),
      isInflationAdjusted: false,
      setIsInflationAdjusted: (isAdjusted) =>
        set({ isInflationAdjusted: isAdjusted }),
      activeScenarios: ['base', 'bull', 'bear'],
      toggleScenario: (scenario) =>
        set((state) => ({
          activeScenarios: state.activeScenarios.includes(scenario)
            ? state.activeScenarios.filter((s) => s !== scenario)
            : [...state.activeScenarios, scenario],
        })),
      defaultIndex: 'INDEXNSE:NIFTY_50',
      setDefaultIndex: (ticker) => set({ defaultIndex: ticker }),
      lastSyncedAt: null,
      clearAllData: () =>
        set((state) => ({
          transactions: [],
          tickers: state.tickers,
          deletedTransactionIds: [],
          deletedWatchlistIds: [],
          isPrivacyMode: false,
          userName: '',
          userEmail: '',
          userMobile: '',
          userImage: null,
          theme: 'system',
          showCurrencySymbol: true,
          recentSearches: [],
          headerLogo: null,
          headerLink: null,
          watchlist: [],
          forecastYears: 15,
          targetCorpus: 50000000,
          sipStepUp: 10,
          manualMonthlySIP: null,
          isInflationAdjusted: false,
          activeScenarios: ['base', 'bull', 'bear'],
          defaultIndex: 'INDEXNSE:NIFTY_50',
          lastSyncedAt: null,
          deviceId: state.deviceId,
        })),
    }),
    {
      name: 'portfolio-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.transactions)) {
          const seenIds = new Set<string>();
          const seenFp = new Set<string>();
          const uniqueTxs: Transaction[] = [];

          for (const t of state.transactions) {
            if (!t) continue;
            const id = t.id ? String(t.id) : '';
            const dateKey = t.date ? (typeof t.date === 'string' ? t.date.slice(0, 10) : new Date(t.date).toISOString().slice(0, 10)) : '';
            const fp = `${(t.symbol || '').toUpperCase()}|${(t.type || 'BUY').toUpperCase()}|${Number(t.quantity || 0)}|${Number(t.price || 0)}|${dateKey}|${(t.broker || '').trim().toLowerCase()}`;

            if (id && seenIds.has(id)) continue;
            if (seenFp.has(fp)) continue;

            if (id) seenIds.add(id);
            seenFp.add(fp);
            uniqueTxs.push({
              ...t,
              id: id || `tx-${(t.symbol || 'stock').toLowerCase()}-${dateKey}-${t.quantity}-${t.price}`,
            });
          }

          if (uniqueTxs.length !== state.transactions.length) {
            state.transactions = uniqueTxs;
          }
        }
      },
    },
  ),
);
