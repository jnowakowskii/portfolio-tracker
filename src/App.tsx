import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "./layout/MainLayout";
import { AddTransactionModal } from "./components/ui/AddTransactionModal";
import { DashboardPage } from "./views/DashboardPage";
import { PlaceholderPage } from "./views/PlaceholderPage";
import { SettingsPage } from "./views/SettingsPage";
import { NAV_ITEMS } from "./config/navigation";
import Database from "@tauri-apps/plugin-sql";
import {
  getMarketData,
  getFxRates,
  aggregateHoldings,
  calculatePortfolioValue,
  calculateTotalCost,
  type MarketQuote,
  type Transaction,
  type PortfolioHolding,
  type FxRates,
  type SupportedCurrency,
} from "./services/marketData";

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Market data state
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [quotes, setQuotes] = useState<MarketQuote[]>([]);
  const [fxRates, setFxRates] = useState<FxRates>({ PLN: 1.0 });
  const [baseCurrency, setBaseCurrency] = useState<SupportedCurrency>(
    () => (localStorage.getItem("baseCurrency") as SupportedCurrency) ?? "PLN"
  );
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);

  const loadTransactions = async () => {
    try {
      const db = await Database.load("sqlite:portfolio.db");
      const result = await db.select<Transaction[]>("SELECT * FROM transactions ORDER BY id DESC");
      setTransactions(result);
    } catch (error) {
      console.error("Failed to load transactions:", error);
    }
  };

  const loadMarketData = useCallback(async (txs: Transaction[], rates: FxRates) => {
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
      const symbols = currentHoldings.map(h => h.symbol);
      const marketQuotes = await getMarketData(symbols);
      setQuotes(marketQuotes);
      setPortfolioValue(calculatePortfolioValue(currentHoldings, marketQuotes, rates));
      setTotalCost(calculateTotalCost(currentHoldings, rates));
    } catch (error) {
      console.error("Failed to fetch market data:", error);
    } finally {
      setIsLoadingMarket(false);
    }
  }, []);

  // When baseCurrency changes, recompute derived values from cached data
  useEffect(() => {
    if (holdings.length === 0 || quotes.length === 0) return;
    setPortfolioValue(calculatePortfolioValue(holdings, quotes, fxRates));
    setTotalCost(calculateTotalCost(holdings, fxRates));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseCurrency]);


  // Load FX rates and transactions on mount
  useEffect(() => {
    const init = async () => {
      const [, rates] = await Promise.all([
        loadTransactions(),
        getFxRates(),
      ]);
      setFxRates(rates);
    };
    init();
  }, []);

  // Fetch market data whenever transactions or FX rates change
  useEffect(() => {
    loadMarketData(transactions, fxRates);
  }, [transactions, fxRates, loadMarketData]);

  /** Persist and apply a new base currency selection */
  const handleBaseCurrencyChange = (currency: SupportedCurrency) => {
    localStorage.setItem("baseCurrency", currency);
    setBaseCurrency(currency);
  };

  /** Called after adding a transaction or resetting portfolio */
  const handleDataChange = async () => {
    await loadTransactions();
    // Also refresh FX rates
    const rates = await getFxRates();
    setFxRates(rates);
  };

  /** Render the active page based on the current tab */
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
      case "settings":
        return (
          <SettingsPage
            onPortfolioReset={handleDataChange}
            baseCurrency={baseCurrency}
            onBaseCurrencyChange={handleBaseCurrencyChange}
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
      <MainLayout activeTab={activeTab} setActiveTab={setActiveTab} onAddTransactionClick={() => setIsModalOpen(true)}>
        {renderPage()}
      </MainLayout>

      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleDataChange}
      />
    </>
  );
}

export default App;
