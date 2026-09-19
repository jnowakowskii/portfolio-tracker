import { useState } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import { usePortfolioStore } from "../store/usePortfolioStore";

export function WatchlistPage() {
  const { watchlist, addToWatchlist, removeFromWatchlist } = usePortfolioStore();
  const [newSymbol, setNewSymbol] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSymbol.trim()) {
      addToWatchlist(newSymbol.trim().toUpperCase());
      setNewSymbol("");
    }
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Watchlist
          </h1>
        </div>
      </div>

      <div
        className="rounded-xl flex flex-col p-6 shadow-sm"
        style={{ 
          background: "var(--bg-panel)", 
          border: "1px solid var(--border-primary)", 
          boxShadow: "var(--card-shadow)" 
        }}
      >
        <form onSubmit={handleAdd} className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} style={{ color: "var(--text-tertiary)" }} />
            </div>
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              placeholder="Add symbol (e.g. AAPL, MSFT)"
              className="block w-full pl-10 pr-3 py-2.5 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border-primary)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!newSymbol.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: newSymbol.trim() ? "var(--text-primary)" : "var(--border-secondary)",
              color: "var(--bg-primary)",
              cursor: newSymbol.trim() ? "pointer" : "not-allowed",
              opacity: newSymbol.trim() ? 1 : 0.7
            }}
          >
            <Plus size={18} />
            Add
          </button>
        </form>

        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border-primary)" }}>
          <table className="min-w-full divide-y" style={{ borderColor: "var(--border-primary)" }}>
            <thead style={{ background: "var(--bg-primary)" }}>
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  Symbol
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border-primary)", background: "var(--bg-panel)" }}>
              {watchlist.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-12 text-center flex flex-col items-center justify-center gap-2">
                    <Search size={32} style={{ color: "var(--border-secondary)" }} className="mb-2" />
                    <span className="text-sm font-medium" style={{ color: "var(--text-tertiary)" }}>
                      Your watchlist is empty
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Add symbols above to start tracking them
                    </span>
                  </td>
                </tr>
              ) : (
                watchlist.map((symbol) => (
                  <tr key={symbol} className="transition-colors group hover:bg-black/5 dark:hover:bg-white/5">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold" style={{ color: "var(--text-primary)" }}>
                      {symbol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => removeFromWatchlist(symbol)}
                        className="p-2 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        style={{ color: "var(--color-danger)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(244,63,94,0.1)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        title="Remove from Watchlist"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
