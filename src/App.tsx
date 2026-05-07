import { useState, useEffect } from "react";
import { MainLayout } from "./layout/MainLayout";
import { SummaryCard } from "./components/ui/SummaryCard";
import { AddTransactionModal } from "./components/ui/AddTransactionModal";
import Database from "@tauri-apps/plugin-sql";
import { Wallet, TrendingUp, PieChart, Activity } from "lucide-react";

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
          <SummaryCard title="Total Value" value="1,000.00 PLN" change="+2.4%" isPositive={true} icon={<Wallet size={20} />} />
          <SummaryCard title="Monthly Div." value="100.00 PLN" change="+12% vs last mo." isPositive={true} icon={<TrendingUp size={20} />} />
          <SummaryCard title="Realized Profit" value="-1,200.00 PLN" change="-5.2%" isPositive={false} icon={<PieChart size={20} />} />
        </div>

        <div className="bg-[#0f172a] border border-slate-800/80 rounded-2xl h-[450px] flex flex-col p-6 overflow-hidden shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-slate-400 uppercase tracking-widest text-xs font-bold">Recent Transactions</h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-800">
            {transactions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800/50 rounded-xl bg-[#020617]/50">
                <div className="w-12 h-12 bg-slate-800/50 rounded-full flex items-center justify-center mb-3">
                  <Activity size={24} className="text-slate-600" />
                </div>
                <p className="font-medium text-slate-300">No transactions yet</p>
                <p className="text-sm text-slate-600 mt-1">Click 'Add Transaction' to get started.</p>
              </div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="group flex justify-between items-center bg-[#020617] p-4 rounded-xl border border-slate-800/60 hover:border-slate-700 transition-colors shadow-sm hover:shadow-md">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm border ${tx.side === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                      {tx.side === 'BUY' ? 'B' : 'S'}
                    </div>
                    <div>
                      <div className="font-bold text-slate-100 tracking-wide">{tx.symbol}</div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">{new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-mono font-bold text-slate-100 text-base">${tx.price.toFixed(2)}</span>
                    <span className="font-mono text-xs text-slate-400 font-medium">{tx.quantity} shares</span>
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
