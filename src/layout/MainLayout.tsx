import { ReactNode } from "react";
import { LayoutDashboard, History, Calendar, Settings, Plus } from "lucide-react";
import { NavItem } from "../components/ui/NavItem";

interface MainLayoutProps {
  children: ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onAddTransactionClick?: () => void;
}

export function MainLayout({ children, activeTab, setActiveTab, onAddTransactionClick }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-50 font-sans">
      {/* Sidebar */}
      <nav className="w-64 border-r border-slate-800 flex flex-col p-4 space-y-2">
        <div className="flex items-center gap-2 px-2 mb-8 mt-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">
            P
          </div>
          <span className="text-xl font-bold tracking-tight">PortfolioApp</span>
        </div>
        
        <NavItem icon={<LayoutDashboard size={18}/>} label="Dashboard" active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
        <NavItem icon={<History size={18}/>} label="History" active={activeTab === "history"} onClick={() => setActiveTab("history")} />
        <NavItem icon={<Calendar size={18}/>} label="Dividends" active={activeTab === "dividends"} onClick={() => setActiveTab("dividends")} />
        
        <div className="mt-auto">
          <NavItem icon={<Settings size={18}/>} label="Settings" active={activeTab === "settings"} onClick={() => setActiveTab("settings")} />
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8">
          <h2 className="text-lg font-semibold capitalize">{activeTab}</h2>
          <button onClick={onAddTransactionClick} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 transition-colors px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> Add Transaction
          </button>
        </header>

        <section className="p-8 overflow-y-auto">
          {children}
        </section>
      </main>
    </div>
  );
}
