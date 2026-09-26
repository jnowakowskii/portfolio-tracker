import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";
import Database from "@tauri-apps/plugin-sql";
import {
  getCombinedDataRaw,
  aggregateHoldings,
  calculatePortfolioValue,
  calculateTotalCost,
  type MarketQuote,
  type Transaction,
  type PortfolioHolding,
  type FxRates,
  type SupportedCurrency,
} from "../services/marketData";
import {
  calculateDividends,
  type DividendEvent,
  type MonthlyDividend,
  type DividendStats,
  type TopPayer,
  type UpcomingDividend,
  type ReceivedDividend,
} from "../services/dividendLogic";
import { type ApiStat, initialApiStats } from "../types/apiStats";
import {
  generatePortfolioHistory,
  type ChartDataPoint,
  type HistoricalPrice,
} from "../services/chartLogic";

function applyCallResult(
  prev: ApiStat,
  success: boolean,
  latencyMs: number,
  errorMsg?: string
): ApiStat {
  const newTotal = prev.totalRequests + 1;
  const newAvg =
    prev.totalRequests === 0
      ? latencyMs
      : Math.round((prev.avgLatencyMs * prev.totalRequests + latencyMs) / newTotal);
  return {
    totalRequests: newTotal,
    successfulCalls: success ? prev.successfulCalls + 1 : prev.successfulCalls,
    failedCalls: success ? prev.failedCalls : prev.failedCalls + 1,
    lastFetchTime: success ? new Date() : prev.lastFetchTime,
    avgLatencyMs: newAvg,
    errors: errorMsg
      ? [{ message: errorMsg, time: new Date() }, ...prev.errors].slice(0, 3)
      : prev.errors,
    yahooStatus: success ? "online" : "error",
  };
}

interface PortfolioState {
  // data state
  transactions: Transaction[];
  holdings: PortfolioHolding[];
  quotes: MarketQuote[];
  fxRates: FxRates;
  baseCurrency: SupportedCurrency;
  theme: "dark" | "light";

  // calculated state
  portfolioValue: number;
  totalCost: number;
  portfolioHistory: ChartDataPoint[];

  // dividend state
  dividendEvents: DividendEvent[];
  monthlyDividends: MonthlyDividend[];
  dividendStats: DividendStats;
  topPayers: TopPayer[];
  upcomingDividends: UpcomingDividend[];
  receivedDividends: ReceivedDividend[];
  totalReceivedDividends: number;

  // api state
  isLoadingMarket: boolean;
  apiStats: ApiStat;
  lastFetchedSymbols: string[];

  // privacy state
  isPrivacyModeEnabled: boolean;

  // watchlist state
  watchlist: string[];

  // actions
  setTheme: (theme: "dark" | "light") => void;
  setBaseCurrency: (currency: SupportedCurrency) => Promise<void>;
  loadTransactions: () => Promise<Transaction[]>;
  importTransactions: (txs: Omit<Transaction, "id">[]) => Promise<void>;
  fetchMarketData: (overrideTxs?: Transaction[], forceApiRefresh?: boolean) => Promise<void>;
  resetApiStats: () => void;
  togglePrivacyMode: () => void;
  addToWatchlist: (symbol: string) => Promise<void>;
  removeFromWatchlist: (symbol: string) => void;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      // initial data state
      transactions: [],
      holdings: [],
      quotes: [],
      fxRates: { PLN: 1.0 },
      baseCurrency: "PLN", // default overwritten
      theme: "dark",

      // initial calculated state
      portfolioValue: 0,
      totalCost: 0,
      portfolioHistory: [],

      // initial dividend state
      dividendEvents: [],
      monthlyDividends: [],
      dividendStats: {
        annualIncome: 0,
        yield: 0,
        yieldOnCost: 0,
      },
      topPayers: [],
      upcomingDividends: [],
      receivedDividends: [],
      totalReceivedDividends: 0,

      // api state
      isLoadingMarket: false,
      apiStats: initialApiStats,
      lastFetchedSymbols: [],

      // privacy state
      isPrivacyModeEnabled: false,

      // watchlist state
      watchlist: [],

      // actions
      setTheme: (theme) => set({ theme }),
      togglePrivacyMode: () => set((state) => ({ isPrivacyModeEnabled: !state.isPrivacyModeEnabled })),
      resetApiStats: () => set({ apiStats: initialApiStats }),
      addToWatchlist: async (symbol) => {
        const state = get();
        if (!state.watchlist.includes(symbol)) {
          set({ watchlist: [...state.watchlist, symbol] });
          await get().fetchMarketData();
        }
      },
      removeFromWatchlist: (symbol) => set((state) => ({
        watchlist: state.watchlist.filter((s) => s !== symbol)
      })),
      setBaseCurrency: async (currency: SupportedCurrency) => {
        set({ baseCurrency: currency });
        // fetch rates and recalculate
        await get().fetchMarketData();
      },

      importTransactions: async (txs) => {
        try {
          const db = await Database.load("sqlite:portfolio.db");
          await db.execute("DELETE FROM transactions");
          for (const tx of txs) {
            await db.execute(
              "INSERT INTO transactions (symbol, side, quantity, price, commission, date, currency) VALUES ($1, $2, $3, $4, $5, $6, $7)",
              [tx.symbol, tx.side, tx.quantity, tx.price, tx.commission, tx.date, tx.currency]
            );
          }
          await get().loadTransactions();
          await get().fetchMarketData();
        } catch (error) {
          console.error("Failed to import transactions:", error);
          throw error;
        }
      },

      loadTransactions: async () => {
        try {
          const db = await Database.load("sqlite:portfolio.db");
          const result = await db.select<Transaction[]>(
            "SELECT * FROM transactions ORDER BY id DESC"
          );
          set({ transactions: result });

          const state = get();
          const currentHoldings = aggregateHoldings(result);
          set({ holdings: currentHoldings });

          if (currentHoldings.length === 0) {
            set({
              portfolioValue: 0,
              totalCost: 0,
              monthlyDividends: [],
              dividendStats: { annualIncome: 0, yield: 0, yieldOnCost: 0 },
              topPayers: [],
              upcomingDividends: [],
              receivedDividends: [],
              totalReceivedDividends: 0,
              dividendEvents: [],
            });
            return result;
          }

          const pValue = calculatePortfolioValue(currentHoldings, state.quotes, state.fxRates);
          const tCost = calculateTotalCost(currentHoldings, state.fxRates);
          set({ portfolioValue: pValue, totalCost: tCost });

          const divRes = calculateDividends(
            result,
            state.dividendEvents,
            state.fxRates,
            state.baseCurrency,
            pValue,
            tCost,
            currentHoldings,
            state.quotes
          );

          set({
            monthlyDividends: divRes.monthlyData,
            dividendStats: divRes.stats,
            topPayers: divRes.topPayers,
            upcomingDividends: divRes.upcomingDividends,
            receivedDividends: divRes.receivedDividends,
            totalReceivedDividends: divRes.totalReceivedDividends,
          });

          return result;
        } catch (error) {
          console.error("Failed to load transactions:", error);
          return [];
        }
      },

      fetchMarketData: async (overrideTxs?: Transaction[], forceApiRefresh?: boolean) => {
        set({ isLoadingMarket: true });

        try {
          const state = get();
          const txs = overrideTxs || state.transactions;
          const currentBaseCurrency = state.baseCurrency;

          const currentHoldings = aggregateHoldings(txs);
          set({ holdings: currentHoldings });

          const symbols = Array.from(new Set([...txs.map(t => t.symbol), ...state.watchlist]));

          if (symbols.length === 0) {
            set({
              quotes: [],
              portfolioValue: 0,
              totalCost: 0,
              portfolioHistory: [],
              monthlyDividends: [],
              dividendStats: { annualIncome: 0, yield: 0, yieldOnCost: 0 },
              topPayers: [],
              upcomingDividends: [],
              receivedDividends: [],
              totalReceivedDividends: 0,
              dividendEvents: [],
              isLoadingMarket: false,
              lastFetchedSymbols: []
            });
            return;
          }

          const sortedSymbols = [...symbols].sort();
          const symbolsChanged = JSON.stringify(sortedSymbols) !== JSON.stringify(state.lastFetchedSymbols);
          const timeSinceLastFetch = Date.now() - (state.apiStats.lastFetchTime ? new Date(state.apiStats.lastFetchTime).getTime() : 0);
          const needsApiFetch = forceApiRefresh || symbolsChanged || timeSinceLastFetch > 5 * 60 * 1000;

          let marketQuotes: MarketQuote[] = state.quotes;
          let rates: FxRates = state.fxRates;
          let events: DividendEvent[] = state.dividendEvents;

          if (needsApiFetch) {
            const t0 = Date.now();
            try {
              const data = await getCombinedDataRaw(symbols, currentBaseCurrency);
              // preserve existing trend data to prevent UI flicker while intraday data is loading
              marketQuotes = data.market_quotes.map(newQuote => {
                const existingQuote = state.quotes.find(q => q.symbol === newQuote.symbol);
                if (existingQuote) {
                  return {
                    ...newQuote,
                    trend7d: existingQuote.trend7d,
                    history7d: existingQuote.history7d
                  };
                }
                return newQuote;
              });
              rates = data.fx_rates;
              set({
                quotes: marketQuotes,
                fxRates: rates,
                apiStats: applyCallResult(get().apiStats, true, Date.now() - t0)
              });
            } catch (error) {
              const msg = `[Combined] ${String(error).slice(0, 120)}`;
              set({ apiStats: applyCallResult(get().apiStats, false, Date.now() - t0, msg) });
              console.error("Failed to fetch combined market data:", error);
            }

            // fetch dividend events
            try {
              events = await invoke<DividendEvent[]>("get_dividend_history", { symbols });
              set({ dividendEvents: events });
            } catch (error) {
              console.error("Failed to fetch dividend history:", error);
            }

            // fetch historical prices
            let historicalPrices: Record<string, HistoricalPrice[]> = {};
            try {
              historicalPrices = await invoke<Record<string, HistoricalPrice[]>>("get_historical_prices", { symbols });
              const history = generatePortfolioHistory(txs, historicalPrices, rates, currentBaseCurrency, 1825);
              set({ portfolioHistory: history });
            } catch (error) {
              console.error("Failed to fetch historical prices:", error);
            }

            // fetch intraday prices for sparklines
            let intradayPrices: Record<string, HistoricalPrice[]> = {};
            try {
              intradayPrices = await invoke<Record<string, HistoricalPrice[]>>("get_intraday_prices", { symbols });
              
              // calculate 7d trend and history
              marketQuotes = marketQuotes.map(q => {
                const intra = intradayPrices[q.symbol];
                if (intra && intra.length > 0) {
                  const latest = intra[intra.length - 1];
                  const past = intra[0];
                  const trend7d = past.close ? ((latest.close - past.close) / past.close) * 100 : undefined;
                  const history7d = intra.map(h => h.close);
                  return { ...q, trend7d, history7d };
                }
                return q;
              });
              set({ quotes: marketQuotes });
            } catch (error) {
              console.error("Failed to fetch intraday prices:", error);
            }

            set({ lastFetchedSymbols: sortedSymbols });
          }

          // run calculations
          const pValue = calculatePortfolioValue(currentHoldings, marketQuotes, rates);
          const tCost = calculateTotalCost(currentHoldings, rates);
          set({ portfolioValue: pValue, totalCost: tCost });

          const divRes = calculateDividends(
            txs,
            events,
            rates,
            currentBaseCurrency,
            pValue,
            tCost,
            currentHoldings,
            marketQuotes
          );

          set({
            monthlyDividends: divRes.monthlyData,
            dividendStats: divRes.stats,
            topPayers: divRes.topPayers,
            upcomingDividends: divRes.upcomingDividends,
            receivedDividends: divRes.receivedDividends,
            totalReceivedDividends: divRes.totalReceivedDividends,
          });

        } finally {
          set({ isLoadingMarket: false });
        }
      },
    }),
    {
      name: "portfolio-storage",
      storage: createJSONStorage(() => localStorage),
      // partialize to only persist data
      partialize: (state) => ({
        transactions: state.transactions,
        holdings: state.holdings,
        quotes: state.quotes,
        fxRates: state.fxRates,
        baseCurrency: state.baseCurrency,
        theme: state.theme,
        portfolioValue: state.portfolioValue,
        totalCost: state.totalCost,
        portfolioHistory: state.portfolioHistory,
        dividendEvents: state.dividendEvents,
        monthlyDividends: state.monthlyDividends,
        dividendStats: state.dividendStats,
        topPayers: state.topPayers,
        upcomingDividends: state.upcomingDividends,
        receivedDividends: state.receivedDividends,
        totalReceivedDividends: state.totalReceivedDividends,
        apiStats: state.apiStats,
        isPrivacyModeEnabled: state.isPrivacyModeEnabled,
        watchlist: state.watchlist,
      }),
    }
  )
);
