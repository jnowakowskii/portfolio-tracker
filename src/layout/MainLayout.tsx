import { ReactNode } from "react";
import { Plus, Minus, X, RefreshCw, Eye, EyeOff } from "lucide-react";
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
  const { isLoadingMarket, isPrivacyModeEnabled, togglePrivacyMode } = usePortfolioStore();

  const topItems = NAV_ITEMS.filter(item => !item.bottom);
  const bottomItems = NAV_ITEMS.filter(item => item.bottom);

  return (
    <div className="flex flex-col h-screen font-sans" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>

      {/* unified header */}
      <header
        data-tauri-drag-region
        className="relative h-16 flex items-center justify-between px-6 border-b border-[var(--border-primary)] w-full shrink-0 select-none z-50"
        style={{ background: "var(--bg-nav)" }}
      >
        {/* logo section */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg overflow-hidden shrink-0"
            style={{ background: "var(--text-primary)" }}
          >
            <img src={logoUrl} alt="Callisto logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-base font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>Callisto</span>
          {isLoadingMarket && <RefreshCw size={14} className="text-neutral-500 animate-spin ml-2" />}
        </div>

        {/* navigation section */}
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

        {/* actions and controls */}
        <div className="flex items-center gap-4">
          {/* privacy mode toggle */}
          <button
            onClick={togglePrivacyMode}
            className="flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-150 active:scale-95 z-50"
            style={{ background: isPrivacyModeEnabled ? "var(--color-success-bg)" : "transparent", color: isPrivacyModeEnabled ? "var(--color-success)" : "var(--text-muted)", border: isPrivacyModeEnabled ? "1px solid var(--color-success-border)" : "1px solid transparent" }}
            onMouseEnter={e => { if (!isPrivacyModeEnabled) { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.background = "var(--border-primary)"; } }}
            onMouseLeave={e => { if (!isPrivacyModeEnabled) { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; } }}
            title="Toggle Privacy Mode"
          >
            {isPrivacyModeEnabled ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>

          {/* add transaction button */}
          <button
            onClick={onAddTransactionClick}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 active:scale-95 group z-50 shadow-sm"
            style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)", border: "1px solid var(--btn-primary-border)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--btn-primary-hover)"; e.currentTarget.style.borderColor = "var(--btn-primary-border)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--btn-primary-bg)"; e.currentTarget.style.borderColor = "var(--btn-primary-border)"; }}
          >
            <Plus size={16} className="transition-transform group-hover:rotate-90" />
            Add Transaction
          </button>

          {/* settings button */}
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

          {/* window controls */}
          <div className="flex items-center gap-0.5 pl-4 z-50" style={{ borderLeft: "1px solid var(--border-primary)" }}>
            <button
              onClick={() => appWindow.minimize().catch(e => alert("Minimize error: " + e))}
              className="w-8 h-8 flex items-center justify-center rounded-md transition-colors focus:outline-none cursor-pointer"
              style={{ color: "var(--text-quaternary)" }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--border-primary)"; e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-quaternary)"; }}
              title="Minimize"
            >
              <Minus size={14} strokeWidth={2} />
            </button>
            <button
              onClick={() => appWindow.close().catch(e => alert("Close error: " + e))}
              className="w-8 h-8 flex items-center justify-center rounded-md transition-colors focus:outline-none cursor-pointer"
              style={{ color: "var(--text-quaternary)" }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--color-danger)"; e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-quaternary)"; }}
              title="Close"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

      {/* main content area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
