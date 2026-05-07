import { ReactNode } from "react";
import { Plus, Minus, X } from "lucide-react";
import { NavItem } from "../components/ui/NavItem";
import { NAV_ITEMS } from "../config/navigation";

import { getCurrentWindow } from '@tauri-apps/api/window';

interface MainLayoutProps {
  children: ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onAddTransactionClick?: () => void;
}

export function MainLayout({ children, activeTab, setActiveTab, onAddTransactionClick }: MainLayoutProps) {
  const appWindow = getCurrentWindow();

  const topItems = NAV_ITEMS.filter(item => !item.bottom);
  const bottomItems = NAV_ITEMS.filter(item => item.bottom);

  return (
    <div className="flex h-screen bg-[#020617] text-slate-50 font-sans selection:bg-blue-500/30">
      {/* Sidebar */}
      <nav className="w-56 bg-[#0f172a] border-r border-slate-800 flex flex-col p-4 space-y-2 z-10 shadow-2xl relative">
        <div className="flex items-center gap-3 px-2 mb-10 mt-4">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/25 border border-blue-400/20">
            P
          </div>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">Portfolio</span>
        </div>
        
        {topItems.map(item => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={activeTab === item.id}
            onClick={() => setActiveTab(item.id)}
          />
        ))}
        
        {bottomItems.length > 0 && (
          <div className="mt-auto pb-4">
            {bottomItems.map(item => (
              <NavItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={activeTab === item.id}
                onClick={() => setActiveTab(item.id)}
              />
            ))}
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Glassmorphism Header */}
        <header className="h-20 bg-[#020617]/70 backdrop-blur-md border-b border-slate-800/60 flex items-center justify-between px-10 sticky top-0 z-20">
          <h2 className="text-2xl font-bold capitalize tracking-tight text-slate-100 pointer-events-none">{activeTab}</h2>
          
          {/* Draggable Area - Fills empty space */}
          <div data-tauri-drag-region className="flex-1 h-full mx-4 cursor-move" />
          
          <div className="flex items-center gap-6">
            <button 
              onClick={onAddTransactionClick} 
              className="group flex items-center gap-2 bg-blue-600 hover:bg-blue-500 transition-all duration-300 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/20 hover:shadow-blue-500/40 border border-blue-500/30 active:scale-95 z-50 relative"
            >
              <Plus size={18} className="transition-transform group-hover:rotate-90" /> Add Transaction
            </button>

            {/* Window Controls (Windows style) */}
            <div className="flex items-center gap-1 pl-5 border-l border-slate-800/80 h-8 z-50 relative">
              <button 
                onClick={() => appWindow.minimize().catch(e => alert("Minimize error: " + e))}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-700/60 hover:text-slate-100 rounded-md transition-colors focus:outline-none cursor-pointer"
                title="Minimize"
              >
                <Minus size={15} strokeWidth={2} />
              </button>
              <button 
                onClick={() => appWindow.close().catch(e => alert("Close error: " + e))}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-rose-600 hover:text-white rounded-md transition-colors focus:outline-none cursor-pointer"
                title="Close"
              >
                <X size={15} strokeWidth={2} />
              </button>
            </div>
          </div>
        </header>

        <section className="p-10 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}
