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
  
  // calculated state
  portfolioValue: number;
  totalCost: number;
  portfolioHistory: ChartDataPoint[];
  
  // dividend state
  dividendEvents: DividendEvent[];
  monthlyDividends: MonthlyDividend[];
  dividendStats: DividendStats;
  topPayers: TopPayer[];

  // api state
  isLoadingMarket: boolean;
  apiStats: ApiStat;

  // privacy state
  isPrivacyModeEnabled: boolean;

  // actions
  setBaseCurrency: (currency: SupportedCurrency) => Promise<void>;
  loadTransactions: () => Promise<Transaction[]>;
  importTransactions: (txs: Omit<Transaction, "id">[]) => Promise<void>;
  fetchMarketData: (txs?: Transaction[]) => Promise<void>;
  resetApiStats: () => void;
  togglePrivacyMode: () => void;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      // initial data state
      transactions: [],
      holdings: [],
      quotes: [],
      fxRates: { PLN: 1.0 },
      baseCurrency: "PLN", // default overwritten by persist
      
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

      // api state
      isLoadingMarket: false,
      apiStats: initialApiStats,

      // privacy state
      isPrivacyModeEnabled: false,

      // actions
      togglePrivacyMode: () => set((state) => ({ isPrivacyModeEnabled: !state.isPrivacyModeEnabled })),
      resetApiStats: () => set({ apiStats: initialApiStats }),
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
          });

          return result;
        } catch (error) {
          console.error("Failed to load transactions:", error);
          return [];
        }
      },

      fetchMarketData: async (overrideTxs?: Transaction[]) => {
        set({ isLoadingMarket: true });
        
        try {
          const state = get();
          const txs = overrideTxs || state.transactions;
          const currentBaseCurrency = state.baseCurrency;

          const currentHoldings = aggregateHoldings(txs);
          set({ holdings: currentHoldings });

          if (currentHoldings.length === 0) {
            set({
              quotes: [],
              portfolioValue: 0,
              totalCost: 0,
              portfolioHistory: [],
              monthlyDividends: [],
              dividendStats: { annualIncome: 0, yield: 0, yieldOnCost: 0 },
              topPayers: [],
              dividendEvents: [],
              isLoadingMarket: false
            });
            return;
          }

          const symbols = Array.from(new Set(txs.map(t => t.symbol)));

          // fetch market quotes and fx rates
          let marketQuotes: MarketQuote[] = state.quotes;
          let rates: FxRates = state.fxRates;
          const t0 = Date.now();
          try {
             const data = await getCombinedDataRaw(symbols, currentBaseCurrency);
             marketQuotes = data.market_quotes;
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
          let events: DividendEvent[] = state.dividendEvents;
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
        portfolioValue: state.portfolioValue,
        totalCost: state.totalCost,
        portfolioHistory: state.portfolioHistory,
        dividendEvents: state.dividendEvents,
        monthlyDividends: state.monthlyDividends,
        dividendStats: state.dividendStats,
        topPayers: state.topPayers,
        apiStats: state.apiStats,
        isPrivacyModeEnabled: state.isPrivacyModeEnabled,
      }),
    }
  )
);
