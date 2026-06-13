import { useState, useEffect, useCallback, useRef } from "react";
import { MainLayout } from "./layout/MainLayout";
import { AddTransactionModal } from "./components/ui/AddTransactionModal";
import { DashboardPage } from "./views/DashboardPage";
import { AllocationPage } from "./views/AllocationPage";
import { PlaceholderPage } from "./views/PlaceholderPage";
import { SettingsPage } from "./views/SettingsPage";
import { HistoryPage } from "./views/HistoryPage";
import { DividendsPage } from "./views/DividendsPage"; // We'll assume DividendsPage is created later
import { NAV_ITEMS } from "./config/navigation";
import Database from "@tauri-apps/plugin-sql";
import { invoke } from "@tauri-apps/api/core";
import {
  getCombinedDataRaw,
  getMarketDataRaw,
  aggregateHoldings,
  calculatePortfolioValue,
  calculateTotalCost,
  type MarketQuote,
  type Transaction,
  type PortfolioHolding,
  type FxRates,
  type SupportedCurrency,
} from "./services/marketData";
import { type ApiStat, initialApiStats } from "./types/apiStats";
import {
  calculateDividends,
  type DividendEvent,
  type MonthlyDividend,
  type DividendStats,
} from "./services/dividendLogic";

// ── Stat helper ───────────────────────────────────────────────────────────────

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

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTransactionData, setEditTransactionData] = useState<Transaction | null>(null);

  // Market data
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [quotes, setQuotes] = useState<MarketQuote[]>([]);
  const [fxRates, setFxRates] = useState<FxRates>({ PLN: 1.0 });
  const [baseCurrency, setBaseCurrency] = useState<SupportedCurrency>(
    () => (localStorage.getItem("baseCurrency") as SupportedCurrency) ?? "PLN"
  );
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);

  // Dividend Data
  const [dividendEvents, setDividendEvents] = useState<DividendEvent[]>([]);
  const [monthlyDividends, setMonthlyDividends] = useState<MonthlyDividend[]>([]);
  const [dividendStats, setDividendStats] = useState<DividendStats>({
    annualIncome: 0,
    yield: 0,
    yieldOnCost: 0,
  });

  // API diagnostics
  const [apiStats, setApiStats] = useState<ApiStat>(initialApiStats);

  // Stable ref so callbacks always see the latest fxRates without creating stale closures
  const fxRatesRef = useRef<FxRates>({ PLN: 1.0 });
  useEffect(() => { fxRatesRef.current = fxRates; }, [fxRates]);

  const dividendEventsRef = useRef<DividendEvent[]>([]);
  useEffect(() => { dividendEventsRef.current = dividendEvents; }, [dividendEvents]);

  // Prevents React 18 Strict Mode from double-firing the boot effect in dev
  const hasInitialized = useRef(false);

  // ── Primitive helpers ────────────────────────────────────────────────────────

  /**
   * Load all transactions from SQLite. Returns the loaded array so callers can
   * pass it directly to loadMarketData without waiting for React state to settle.
   */
  const loadTransactions = async (): Promise<Transaction[]> => {
    try {
      const db = await Database.load("sqlite:portfolio.db");
      const result = await db.select<Transaction[]>(
        "SELECT * FROM transactions ORDER BY id DESC"
      );
      setTransactions(result);
      return result;
    } catch (error) {
      console.error("Failed to load transactions:", error);
      return [];
    }
  };

  /** Yahoo Call B — fetch market quotes for held symbols, record stats (used after transaction changes). */
  const fetchMarketDataTracked = useCallback(async (
    symbols: string[]
  ): Promise<MarketQuote[]> => {
    if (symbols.length === 0) return [];
    const t0 = Date.now();
    try {
      const data = await getMarketDataRaw(symbols);
      setApiStats(prev => applyCallResult(prev, true, Date.now() - t0));
      return data;
    } catch (error) {
      const msg = `[Market] ${String(error).slice(0, 120)}`;
      setApiStats(prev => applyCallResult(prev, false, Date.now() - t0, msg));
      console.error("Failed to fetch market data:", error);
      return [];
    }
  }, []);

  /**
   * Single combined Yahoo Finance call \u2014 fetches both ticker quotes and FX
   * rates in one batch request. Records exactly 1 stat entry.
   * Used on boot and force-refresh.
   */
  const fetchCombinedTracked = useCallback(async (
    symbols: string[],
    currentBaseCurrency: string
  ): Promise<{ marketQuotes: MarketQuote[]; rates: FxRates }> => {
    const t0 = Date.now();
    try {
      const data = await getCombinedDataRaw(symbols, currentBaseCurrency);
      setApiStats(prev => applyCallResult(prev, true, Date.now() - t0));
      return { marketQuotes: data.market_quotes, rates: data.fx_rates };
    } catch (error) {
      const msg = `[Combined] ${String(error).slice(0, 120)}`;
      setApiStats(prev => applyCallResult(prev, false, Date.now() - t0, msg));
      console.error("Failed to fetch combined data:", error);
      return { marketQuotes: [], rates: { PLN: 1.0 } };
    }
  }, []);

  const applyMarketData = useCallback((
    txs: Transaction[],
    marketQuotes: MarketQuote[],
    rates: FxRates
  ) => {
    const currentHoldings = aggregateHoldings(txs);
    setHoldings(currentHoldings);
    setQuotes(marketQuotes);
    if (currentHoldings.length === 0) {
      setPortfolioValue(0);
      setTotalCost(0);
    } else {
      setPortfolioValue(calculatePortfolioValue(currentHoldings, marketQuotes, rates));
      setTotalCost(calculateTotalCost(currentHoldings, rates));
    }
  }, []);

  const recalculateDividends = useCallback((
    txs: Transaction[],
    events: DividendEvent[],
    rates: FxRates,
    currency: string
  ) => {
    const res = calculateDividends(txs, events, rates, currency);
    setMonthlyDividends(res.monthlyData);
    setDividendStats(res.stats);
  }, []);

  /**
   * Market-only reload (after a transaction change). Uses cached FX rates.
   * Makes exactly 1 Yahoo call for ticker quotes.
   */
  const loadMarketData = useCallback(async (
    txs: Transaction[],
    rates: FxRates
  ) => {
    const currentHoldings = aggregateHoldings(txs);
    setHoldings(currentHoldings);

    if (currentHoldings.length === 0) {
      setQuotes([]);
      setPortfolioValue(0);
      setTotalCost(0);
      return;
    }

    setIsLoadingMarket(true);
    try {
      const symbols = Array.from(new Set(txs.map(t => t.symbol)));
      const marketQuotes = await fetchMarketDataTracked(symbols); // 1 Yahoo call
      setQuotes(marketQuotes);
      setPortfolioValue(calculatePortfolioValue(currentHoldings, marketQuotes, rates));
      setTotalCost(calculateTotalCost(currentHoldings, rates));
      
      // Recalculate dividends with existing events but new transactions/prices
      recalculateDividends(txs, dividendEventsRef.current, rates, baseCurrency);
    } finally {
      setIsLoadingMarket(false);
    }
  }, [fetchMarketDataTracked, recalculateDividends, baseCurrency]);

  // When baseCurrency changes, recalculate from cached data — NO Yahoo calls
  useEffect(() => {
    if (holdings.length === 0 || quotes.length === 0) return;
    setPortfolioValue(calculatePortfolioValue(holdings, quotes, fxRates));
    setTotalCost(calculateTotalCost(holdings, fxRates));
    recalculateDividends(transactions, dividendEvents, fxRates, baseCurrency);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseCurrency]);

  // ── Boot sequence ─────────────────────────────────────────────────────────────────────
  //
  //  On mount: exactly 1 Yahoo call that fetches both FX rates and market
  //  quotes in a single batch request.
  //  The hasInitialized ref prevents React 18 Strict Mode from double-firing.
  //
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const init = async () => {
      const txs = await loadTransactions();
      const symbols = Array.from(new Set(txs.map(t => t.symbol)));

      setIsLoadingMarket(true);
      try {
        const { marketQuotes, rates } = await fetchCombinedTracked(symbols, baseCurrency); // 1 Yahoo call
        setFxRates(rates);
        fxRatesRef.current = rates;
        applyMarketData(txs, marketQuotes, rates);

        // Fetch dividends right after combined data
        try {
          const events = await invoke<DividendEvent[]>("get_dividend_history", { symbols });
          setDividendEvents(events);
          dividendEventsRef.current = events;
          recalculateDividends(txs, events, rates, baseCurrency);
        } catch (e) {
          console.error("Failed to fetch dividend history:", e);
        }

      } finally {
        setIsLoadingMarket(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────────────────

  /**
   * Called after adding a transaction or resetting the portfolio.
   * FX rates are cached — make only 1 Yahoo call (market data only).
   */
  const handleDataChange = useCallback(async () => {
    const txs = await loadTransactions();            // DB only
    await loadMarketData(txs, fxRatesRef.current);  // 1 Yahoo call (market only)
  }, [loadMarketData]);

  /** Full refresh: 1 combined Yahoo call fetching FX + market in one batch. */
  const handleForceRefresh = useCallback(async () => {
    const txs = await loadTransactions();
    const symbols = Array.from(new Set(txs.map(t => t.symbol)));

    setIsLoadingMarket(true);
    try {
      const { marketQuotes, rates } = await fetchCombinedTracked(symbols, baseCurrency); // 1 Yahoo call
      setFxRates(rates);
      fxRatesRef.current = rates;
      applyMarketData(txs, marketQuotes, rates);

      // Fetch dividends right after combined data
      try {
        const events = await invoke<DividendEvent[]>("get_dividend_history", { symbols });
        setDividendEvents(events);
        dividendEventsRef.current = events;
        recalculateDividends(txs, events, rates, baseCurrency);
      } catch (e) {
        console.error("Failed to fetch dividend history:", e);
      }
    } finally {
      setIsLoadingMarket(false);
    }
  }, [fetchCombinedTracked, applyMarketData, recalculateDividends, baseCurrency]);

  /** Persist and apply a new base currency (no Yahoo calls). */
  const handleBaseCurrencyChange = (currency: SupportedCurrency) => {
    localStorage.setItem("baseCurrency", currency);
    setBaseCurrency(currency);
  };

  /** Reset all API diagnostic counters. */
  const handleResetStats = useCallback(() => {
    setApiStats(initialApiStats);
  }, []);

  const handleEditTransaction = (tx: Transaction) => {
    setEditTransactionData(tx);
    setIsModalOpen(true);
  };

  const handleDeleteTransaction = async (id: number) => {
    try {
      const db = await Database.load("sqlite:portfolio.db");
      await db.execute("DELETE FROM transactions WHERE id = $1", [id]);
      await handleDataChange();
    } catch (error) {
      console.error("Failed to delete transaction:", error);
      alert("Failed to delete transaction.");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  const renderPage = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardPage
            transactions={transactions}
            holdings={holdings}
            quotes={quotes}
            fxRates={fxRates}
            baseCurrency={baseCurrency}
            portfolioValue={portfolioValue}
            totalCost={totalCost}
            isLoadingMarket={isLoadingMarket}
          />
        );
      case "allocation":
        return (
          <AllocationPage
            holdings={holdings}
            quotes={quotes}
            fxRates={fxRates}
            baseCurrency={baseCurrency}
          />
        );
      case "settings":
        return (
          <SettingsPage
            onPortfolioReset={handleDataChange}
            baseCurrency={baseCurrency}
            onBaseCurrencyChange={handleBaseCurrencyChange}
            apiStats={apiStats}
            onForceRefresh={handleForceRefresh}
            onResetStats={handleResetStats}
          />
        );
      case "history":
        return (
          <HistoryPage
            transactions={transactions}
            onEdit={handleEditTransaction}
            onDelete={handleDeleteTransaction}
          />
        );
      case "dividends":
        return (
          <DividendsPage
            monthlyDividends={monthlyDividends}
            dividendStats={dividendStats}
          />
        );
      default: {
        const navItem = NAV_ITEMS.find(item => item.id === activeTab);
        return <PlaceholderPage title={navItem?.label ?? activeTab} />;
      }
    }
  };

  return (
    <>
      <MainLayout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onAddTransactionClick={() => setIsModalOpen(true)}
      >
        {renderPage()}
      </MainLayout>

      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditTransactionData(null);
        }}
        onSave={handleDataChange}
        editData={editTransactionData}
      />
    </>
  );
}

export default App;
