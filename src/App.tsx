import { useState, useEffect } from "react";
import { MainLayout } from "./layout/MainLayout";
import { SummaryCard } from "./components/ui/SummaryCard";
import { AddTransactionModal } from "./components/ui/AddTransactionModal";
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

  return (
    <>
      <MainLayout activeTab={activeTab} setActiveTab={setActiveTab} onAddTransactionClick={() => setIsModalOpen(true)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <SummaryCard title="Total Value" value="1,000.00PLN" change="+2.4%" isPositive={true} />
          <SummaryCard title="Monthly Div." value="100.00PLN" change="+12% vs last mo." isPositive={true} />
          <SummaryCard title="Realized Profit" value="-1,200.00 PLN" change="-5.2%" isPositive={false} />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl h-80 flex flex-col p-6 overflow-hidden">
          <h3 className="text-slate-400 uppercase tracking-wider text-sm mb-4">Recent Transactions</h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {transactions.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 italic">
                No transactions found. Click 'Add Transaction' to get started.
              </div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-4">
                    <span className={`font-bold ${tx.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {tx.side}
                    </span>
                    <span className="font-medium text-slate-200">{tx.symbol}</span>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-slate-400">
                    <span>{tx.quantity} shares</span>
                    <span>${tx.price.toFixed(2)}</span>
                    <span>{new Date(tx.date).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
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
