import { useState, useEffect, useRef } from "react";
import { MainLayout } from "./layout/MainLayout";
import { AddTransactionModal } from "./components/ui/AddTransactionModal";
import { DashboardPage } from "./views/DashboardPage";
import { AllocationPage } from "./views/AllocationPage";
import { PlaceholderPage } from "./views/PlaceholderPage";
import { SettingsPage } from "./views/SettingsPage";
import { HistoryPage } from "./views/HistoryPage";
import { DividendsPage } from "./views/DividendsPage";
import { NAV_ITEMS } from "./config/navigation";
import { usePortfolioStore } from "./store/usePortfolioStore";
import type { Transaction } from "./services/marketData";

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTransactionData, setEditTransactionData] = useState<Transaction | null>(null);

  const hasInitialized = useRef(false);

  // boot sequence
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // initial background fetch
    usePortfolioStore.getState().loadTransactions().then(() =>
      usePortfolioStore.getState().fetchMarketData()
    );
  }, []);

  const handleEditTransaction = (tx: Transaction) => {
    setEditTransactionData(tx);
    setIsModalOpen(true);
  };

  // render section
  const renderPage = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardPage />;
      case "allocation":
        return <AllocationPage />;
      case "settings":
        return <SettingsPage />;
      case "history":
        return (
          <HistoryPage
            onEdit={handleEditTransaction}
          />
        );
      case "dividends":
        return <DividendsPage />;
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
        editData={editTransactionData}
      />
    </>
  );
}

export default App;
