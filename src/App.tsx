import { useState, useEffect } from "react";
import { MainLayout } from "./layout/MainLayout";
import { AddTransactionModal } from "./components/ui/AddTransactionModal";
import { DashboardPage } from "./views/DashboardPage";
import { PlaceholderPage } from "./views/PlaceholderPage";
import { SettingsPage } from "./views/SettingsPage";
import { NAV_ITEMS } from "./config/navigation";
import Database from "@tauri-apps/plugin-sql";

interface Transaction {
  id: number;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  commission: number;
  date: string;
}

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadTransactions = async () => {
    try {
      const db = await Database.load("sqlite:portfolio.db");
      const result = await db.select<Transaction[]>("SELECT * FROM transactions ORDER BY id DESC");
      setTransactions(result);
    } catch (error) {
      console.error("Failed to load transactions:", error);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  /** Render the active page based on the current tab */
  const renderPage = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardPage transactions={transactions} />;
      case "settings":
        return <SettingsPage onPortfolioReset={loadTransactions} />;
      default: {
        // Find the label from the nav config for a nice title
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
        onSave={loadTransactions}
      />
    </>
  );
}

export default App;
