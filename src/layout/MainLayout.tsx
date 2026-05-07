import { ReactNode } from "react";
import { Plus, Minus, X } from "lucide-react";
import { NavItem } from "../components/ui/NavItem";
import { NAV_ITEMS } from "../config/navigation";
import { getCurrentWindow } from '@tauri-apps/api/window';
import logoUrl from "../assets/logo.png";

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
    <div className="flex h-screen font-sans" style={{ background: "#0a0a0a", color: "#ffffff" }}>

      {/* Sidebar */}
      <nav
        className="w-56 flex flex-col p-4 space-y-1 z-10 shrink-0"
        style={{ background: "#111111", borderRight: "1px solid #262626" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 mb-8 mt-3">
          <div
            className="w-8 h-8 rounded-lg overflow-hidden shrink-0"
            style={{ background: "#ffffff" }}
          >
            <img src={logoUrl} alt="Portfolio logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-base font-semibold tracking-tight" style={{ color: "#ffffff" }}>Portfolio Tracker</span>
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
          <div className="mt-auto pt-4">
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

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header
          className="h-16 flex items-center justify-between px-8 shrink-0"
          style={{
            background: "rgba(10,10,10,0.85)",
            backdropFilter: "blur(8px)",
            borderBottom: "1px solid #262626",
          }}
        >
          <h2 className="text-lg font-semibold capitalize tracking-tight pointer-events-none" style={{ color: "#ffffff" }}>
            {activeTab}
          </h2>

          {/* Draggable */}
          <div data-tauri-drag-region className="flex-1 h-full mx-4 cursor-move" />

          <div className="flex items-center gap-4">
            {/* Add Transaction */}
            <button
              onClick={onAddTransactionClick}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 active:scale-95 group"
              style={{ background: "#ffffff", color: "#0a0a0a", border: "1px solid #ffffff" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#e5e5e5"; e.currentTarget.style.borderColor = "#e5e5e5"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#ffffff"; e.currentTarget.style.borderColor = "#ffffff"; }}
            >
              <Plus size={16} className="transition-transform group-hover:rotate-90" />
              Add Transaction
            </button>

            {/* Window controls */}
            <div className="flex items-center gap-0.5 pl-4" style={{ borderLeft: "1px solid #262626" }}>
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

        {/* Content */}
        <section className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}
