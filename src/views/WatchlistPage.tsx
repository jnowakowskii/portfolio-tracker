import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Search, Globe, X, PlusCircle } from "lucide-react";
import { usePortfolioStore } from "../store/usePortfolioStore";
import { searchSymbols, getExchangeFlag, type SymbolSearchResult } from "../services/marketData";
import { AddTransactionModal } from "../components/ui/AddTransactionModal";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

export function WatchlistPage() {
  const { watchlist, addToWatchlist, removeFromWatchlist, quotes, fetchMarketData } = usePortfolioStore();
  const [newSymbol, setNewSymbol] = useState("");
  const [deleteTargetSymbol, setDeleteTargetSymbol] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SymbolSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<SymbolSearchResult | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prefilledSymbol, setPrefilledSymbol] = useState("");

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const selectedFromDropdownRef = useRef(false);

  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!newSymbol.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    if (selectedFromDropdownRef.current) {
      selectedFromDropdownRef.current = false;
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      setShowDropdown(true);
      try {
        const results = await searchSymbols(newSymbol);
        setSearchResults(results);
      } catch (error) {
        console.error("Failed to search symbols:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [newSymbol]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSymbol.trim()) {
      addToWatchlist(newSymbol.trim().toUpperCase());
      setNewSymbol("");
      setSelectedAsset(null);
      setSearchResults([]);
      setShowDropdown(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto w-full">
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
          <div className="relative flex-1" ref={searchContainerRef}>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} style={{ color: "var(--text-tertiary)" }} />
            </div>
            {selectedAsset ? (
              <div
                className="flex items-center w-full pl-10 pr-3 py-2.5 rounded-lg transition-colors cursor-pointer"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-primary)",
                  color: "var(--text-primary)",
                }}
                onClick={() => {
                  setSelectedAsset(null);
                  setNewSymbol("");
                }}
              >
                <span className="font-mono font-bold text-sm mr-3">{selectedAsset.symbol}</span>
                {selectedAsset.shortname && (
                  <span className="truncate mr-3 text-xs" style={{ color: "var(--text-muted)" }}>
                    {selectedAsset.shortname}
                  </span>
                )}
                {selectedAsset.quoteType && (
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 mr-auto"
                    style={{ background: "var(--border-primary)", color: "var(--text-muted)" }}
                  >
                    {selectedAsset.quoteType === "EQUITY" ? "STOCK" : selectedAsset.quoteType === "CRYPTOCURRENCY" ? "CRYPTO" : selectedAsset.quoteType}
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAsset(null);
                    setNewSymbol("");
                  }}
                  className="p-1 rounded-md transition-colors text-[var(--text-tertiary)] hover:text-[var(--text-primary)] ml-auto"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <input
                type="text"
                value={newSymbol}
                onChange={(e) => {
                  setNewSymbol(e.target.value.toUpperCase());
                  selectedFromDropdownRef.current = false;
                }}
                onFocus={() => {
                  if (searchResults.length > 0 || isSearching) setShowDropdown(true);
                }}
                placeholder="Add symbol"
                className="block w-full pl-10 pr-3 py-2.5 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 uppercase"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-primary)",
                  color: "var(--text-primary)",
                }}
                autoComplete="off"
              />
            )}

            {showDropdown && !selectedAsset && newSymbol.trim().length > 0 && (isSearching || searchResults.length > 0) && (
              <div
                className="absolute z-50 mt-1 w-full rounded-lg shadow-2xl overflow-hidden flex flex-col"
                style={{
                  background: "var(--bg-panel)",
                  border: "1px solid var(--border-primary)",
                  top: "100%",
                  left: 0,
                  maxHeight: "300px"
                }}
              >
                {isSearching ? (
                  <div className="p-3 text-sm font-medium" style={{ color: "var(--text-tertiary)", textAlign: "center" }}>Searching...</div>
                ) : (
                  <div className="overflow-y-auto">
                    {searchResults.map((res, i) => (
                      <div
                        key={`${res.symbol}-${i}`}
                        onClick={() => {
                          setNewSymbol(res.symbol);
                          setSelectedAsset(res);
                          selectedFromDropdownRef.current = true;
                          setShowDropdown(false);
                        }}
                        className="px-3 py-2 cursor-pointer transition-colors"
                        style={{ borderBottom: i < searchResults.length - 1 ? "1px solid var(--border-primary)" : "none" }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--border-primary)"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-mono font-bold text-sm" style={{ color: "var(--text-primary)" }}>{res.symbol}</span>
                          {res.exchange && (
                            <span className="text-xs uppercase flex items-center" style={{ color: "var(--text-tertiary)" }}>
                              {(() => {
                                const flagCode = getExchangeFlag(res.exchange, res.quoteType);
                                if (flagCode === "crypto") {
                                  return <span className="mr-2 text-[11px] opacity-80">🪙</span>;
                                }
                                if (flagCode === "globe") {
                                  return <Globe size={12} className="mr-2 opacity-80" />;
                                }
                                return (
                                  <img
                                    src={`https://flagcdn.com/w20/${flagCode}.png`}
                                    width="16"
                                    className="mr-2 opacity-90"
                                    loading="lazy"
                                    alt={flagCode}
                                    style={{ height: "auto", borderRadius: "2px" }}
                                  />
                                );
                              })()}
                              {res.exchange}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center mt-1">
                          {res.shortname && <div className="text-xs truncate mr-2" style={{ color: "var(--text-muted)" }}>{res.shortname}</div>}
                          {res.quoteType && (
                            <span
                              className="ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                              style={{ background: "var(--border-primary)", color: "var(--text-muted)" }}
                            >
                              {res.quoteType === "EQUITY" ? "STOCK" : res.quoteType === "CRYPTOCURRENCY" ? "CRYPTO" : res.quoteType}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={!newSymbol.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 active:scale-95 disabled:active:scale-100 group shadow-sm"
            style={{
              background: "var(--btn-primary-bg)",
              color: "var(--btn-primary-text)",
              border: "1px solid var(--btn-primary-border)",
              cursor: newSymbol.trim() ? "pointer" : "not-allowed",
              opacity: newSymbol.trim() ? 1 : 0.5
            }}
            onMouseEnter={e => { if (newSymbol.trim()) { e.currentTarget.style.background = "var(--btn-primary-hover)"; e.currentTarget.style.borderColor = "var(--btn-primary-border)"; } }}
            onMouseLeave={e => { if (newSymbol.trim()) { e.currentTarget.style.background = "var(--btn-primary-bg)"; e.currentTarget.style.borderColor = "var(--btn-primary-border)"; } }}
          >
            <Plus size={16} className={newSymbol.trim() ? "transition-transform group-hover:rotate-90" : ""} />
            Add
          </button>
        </form>

        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border-primary)" }}>
          <table className="min-w-full">
            <thead style={{ background: "var(--bg-primary)" }}>
              <tr className="border-b border-[var(--border-primary)]">
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  Name / Ticker
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  Current Price
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  Daily Change
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  Dividend Yield
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  P/E
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  7D Trend
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody style={{ background: "var(--bg-panel)" }}>
              {watchlist.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search size={32} style={{ color: "var(--border-secondary)" }} className="mb-2" />
                      <span className="text-sm font-medium" style={{ color: "var(--text-tertiary)" }}>
                        Your watchlist is empty
                      </span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Add symbols to start tracking them
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                watchlist.map((symbol) => {
                  const quote = quotes.find((q) => q.symbol === symbol);
                  const stockName = quote?.name || symbol;

                  return (
                    <tr key={symbol} className="transition-colors group hover:bg-black/5 dark:hover:bg-white/5 border-b border-[var(--border-primary)] last:border-0">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm font-medium text-[var(--text-secondary)] truncate" title={stockName}>
                            {stockName}
                          </span>
                          <span className="text-xs text-[var(--text-tertiary)] mt-0.5 truncate">
                            {symbol}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-mono" style={{ color: "var(--text-primary)" }}>
                        {quote?.price != null ? `${quote.price.toFixed(2)} ${quote.currency || ""}` : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" style={{ color: quote && quote.change_percent >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
                        {quote?.change_percent != null ? `${quote.change_percent > 0 ? "+" : ""}${quote.change_percent.toFixed(2)}%` : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm" style={{ color: "var(--text-secondary)" }}>
                        {quote?.dividend_rate ? `${quote.dividend_rate.toFixed(2)}%` : quote?.yield_percent ? `${quote.yield_percent.toFixed(2)}%` : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm" style={{ color: "var(--text-secondary)" }}>
                        {quote?.pe ? quote.pe.toFixed(2) : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm" style={{ color: "var(--text-secondary)" }}>
                        {quote?.history7d && quote.history7d.length > 1 ? (
                          <div className="w-[100px] h-[30px] ml-auto">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={quote.history7d.map((val, idx) => ({ value: val, index: idx }))}>
                                <YAxis domain={['dataMin', 'dataMax']} hide />
                                <Line
                                  type="linear"
                                  dataKey="value"
                                  stroke={quote.history7d[quote.history7d.length - 1] >= quote.history7d[0] ? "var(--color-success)" : "var(--color-danger)"}
                                  strokeWidth={2}
                                  dot={false}
                                  isAnimationActive={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        ) : quote?.trend7d != null ? (
                          `${quote.trend7d > 0 ? "+" : ""}${quote.trend7d.toFixed(2)}%`
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => {
                            setPrefilledSymbol(symbol);
                            setIsModalOpen(true);
                          }}
                          className="p-2 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 inline-block"
                          style={{ color: "var(--text-primary)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--border-primary)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          title="Add Transaction"
                        >
                          <PlusCircle size={18} />
                        </button>
                        <button
                          onClick={() => setDeleteTargetSymbol(symbol)}
                          className="p-2 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 inline-block"
                          style={{ color: "var(--color-danger)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(244,63,94,0.1)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          title="Remove from Watchlist"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        prefilledSymbol={prefilledSymbol}
      />

      {deleteTargetSymbol !== null && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
        >
          <div
            className="w-full max-w-sm rounded-xl overflow-hidden"
            style={{ background: "var(--bg-panel)", border: "1px solid var(--border-primary)", boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}
          >
            <div className="px-6 py-5" style={{ borderBottom: "1px solid var(--border-primary)" }}>
              <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Remove Symbol</h2>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Are you sure you want to remove {deleteTargetSymbol} from your watchlist?
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeleteTargetSymbol(null)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={{ background: "transparent", border: "1px solid var(--border-primary)", color: "var(--text-muted)" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.borderColor = "var(--border-secondary)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border-primary)"; }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    removeFromWatchlist(deleteTargetSymbol);
                    setDeleteTargetSymbol(null);
                  }}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-[0.98]"
                  style={{ background: "var(--color-danger)", color: "var(--text-primary)", border: "1px solid var(--color-danger)" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--color-danger)"; e.currentTarget.style.borderColor = "var(--color-danger)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "var(--color-danger)"; e.currentTarget.style.borderColor = "var(--color-danger)"; }}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
