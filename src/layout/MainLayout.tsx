import { ReactNode } from "react";
import { Plus, Minus, X, RefreshCw } from "lucide-react";
import { NavItem } from "../components/ui/NavItem";
import { NAV_ITEMS } from "../config/navigation";
import { getCurrentWindow } from '@tauri-apps/api/window';
import logoUrl from "../assets/logo.png";
import { usePortfolioStore } from "../store/usePortfolioStore";

interface MainLayoutProps {
  children: ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onAddTransactionClick?: () => void;
}

export function MainLayout({ children, activeTab, setActiveTab, onAddTransactionClick }: MainLayoutProps) {
  const appWindow = getCurrentWindow();
  const { isLoadingMarket } = usePortfolioStore();

  const topItems = NAV_ITEMS.filter(item => !item.bottom);
  const bottomItems = NAV_ITEMS.filter(item => item.bottom);

  return (
    <div className="flex flex-col h-screen font-sans" style={{ background: "#0a0a0a", color: "#ffffff" }}>

      {/* Unified Header */}
      <header
        data-tauri-drag-region
        className="relative h-16 flex items-center justify-between px-6 bg-[#171717] border-b border-[#262626] w-full shrink-0 select-none z-50"
      >
        {/* Left Section: Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg overflow-hidden shrink-0"
            style={{ background: "#ffffff" }}
          >
            <img src={logoUrl} alt="Callisto logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-base font-semibold tracking-tight" style={{ color: "#ffffff" }}>Callisto</span>
          {isLoadingMarket && <RefreshCw size={14} className="text-neutral-500 animate-spin ml-2" />}
        </div>

        {/* Center Section: Navigation */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center gap-6">
          {topItems.map(item => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              onClick={() => setActiveTab(item.id)}
            />
          ))}
        </div>

        {/* Right Section: Actions & Window Controls */}
        <div className="flex items-center gap-4">
          {/* Add Transaction */}
          <button
            onClick={onAddTransactionClick}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 active:scale-95 group z-50"
            style={{ background: "#ffffff", color: "#0a0a0a", border: "1px solid #ffffff" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#e5e5e5"; e.currentTarget.style.borderColor = "#e5e5e5"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#ffffff"; e.currentTarget.style.borderColor = "#ffffff"; }}
          >
            <Plus size={16} className="transition-transform group-hover:rotate-90" />
            Add Transaction
          </button>

          {/* Settings */}
          <div className="flex items-center z-50">
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

          {/* Window controls */}
          <div className="flex items-center gap-0.5 pl-4 z-50" style={{ borderLeft: "1px solid #262626" }}>
            <button
              onClick={() => appWindow.minimize().catch(e => alert("Minimize error: " + e))}
              className="w-8 h-8 flex items-center justify-center rounded-md transition-colors focus:outline-none cursor-pointer"
              style={{ color: "#525252" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#262626"; e.currentTarget.style.color = "#ffffff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#525252"; }}
              title="Minimize"
            >
              <Minus size={14} strokeWidth={2} />
            </button>
            <button
              onClick={() => appWindow.close().catch(e => alert("Close error: " + e))}
              className="w-8 h-8 flex items-center justify-center rounded-md transition-colors focus:outline-none cursor-pointer"
              style={{ color: "#525252" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#dc2626"; e.currentTarget.style.color = "#ffffff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#525252"; }}
              title="Close"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
