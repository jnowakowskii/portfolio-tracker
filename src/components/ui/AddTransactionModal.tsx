import { useState, useEffect, useRef } from "react";
import Database from "@tauri-apps/plugin-sql";
import { X, Search, Hash, Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, Globe } from "lucide-react";
import { Transaction, SUPPORTED_CURRENCIES, CURRENCY_SYMBOLS, type SupportedCurrency, SymbolSearchResult, searchSymbols, getExchangeFlag } from "../../services/marketData";
import { usePortfolioStore } from "../../store/usePortfolioStore";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: Transaction | null;
  prefilledSymbol?: string;
}

const inputBase: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-base)",
  border: "1px solid var(--border-primary)",
  borderRadius: "8px",
  padding: "10px 12px 10px 36px",
  color: "var(--text-primary)",
  fontSize: "14px",
  fontFamily: "monospace",
  outline: "none",
};

const inputFocus: React.CSSProperties = {
  border: "1px solid var(--text-quaternary)",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function CustomDatePicker({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    return date ? new Date(date) : new Date();
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // monday start

  const days = [];
  for (let i = 0; i < startOffset; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const zeroPad = (num: number) => num.toString().padStart(2, '0');
  const formatISO = (y: number, m: number, d: number) => `${y}-${zeroPad(m + 1)}-${zeroPad(d)}`;

  const handleSelectDate = (day: number) => {
    onChange(formatISO(currentMonth.getFullYear(), currentMonth.getMonth(), day));
    setIsOpen(false);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = "1px solid var(--text-quaternary)";
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = "1px solid var(--border-primary)";
  };

  const today = new Date();
  const todayISO = formatISO(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div className="relative" ref={containerRef}>
      <CalendarIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-quaternary)", zIndex: 10 }} />
      <input
        type="text"
        readOnly
        value={date}
        onClick={() => setIsOpen(!isOpen)}
        style={{ ...inputBase, cursor: "pointer" }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        required
      />

      {isOpen && (
        <div
          className="absolute z-50 mt-2 p-4 rounded-xl shadow-2xl"
          style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--border-primary)",
            width: "280px",
            left: "0",
            top: "100%"
          }}
        >
          <div className="flex justify-between items-center mb-4">
            <button onClick={handlePrevMonth} className="p-1 rounded-md hover:bg-[var(--border-primary)] text-[var(--text-muted)] hover:text-white transition-colors">
              <ChevronLeft size={16} />
            </button>
            <div className="text-sm font-semibold text-white">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </div>
            <button onClick={handleNextMonth} className="p-1 rounded-md hover:bg-[var(--border-primary)] text-[var(--text-muted)] hover:text-white transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
              <div key={d} className="text-center text-xs font-semibold text-[var(--text-quaternary)]">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />;

              const dISO = formatISO(currentMonth.getFullYear(), currentMonth.getMonth(), day);
              const isSelected = date === dISO;
              const isToday = todayISO === dISO;

              return (
                <button
                  key={i}
                  onClick={(e) => { e.preventDefault(); handleSelectDate(day); }}
                  className={`w-8 h-8 flex items-center justify-center rounded-md text-sm transition-colors ${isSelected
                    ? 'bg-white text-black font-bold'
                    : isToday
                      ? 'border border-[var(--text-quaternary)] text-white font-medium'
                      : 'text-[var(--text-muted)] hover:bg-[var(--border-primary)] hover:text-white'
                    }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}



export function AddTransactionModal({ isOpen, onClose, editData, prefilledSymbol }: AddTransactionModalProps) {
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState("BUY");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<SupportedCurrency>("PLN");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [searchResults, setSearchResults] = useState<SymbolSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const initialLoadRef = useRef(false);
  const selectedFromDropdownRef = useRef(false);

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
    if (!symbol.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    if (selectedFromDropdownRef.current) {
      selectedFromDropdownRef.current = false;
      return;
    }

    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      setShowDropdown(true);
      try {
        const results = await searchSymbols(symbol);
        setSearchResults(results);
      } catch (error) {
        console.error("Failed to search symbols:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [symbol]);

  useEffect(() => {
    if (isOpen) {
      initialLoadRef.current = true;
      if (editData) {
        // strip suffix from symbol for pln
        let displaySymbol = editData.symbol;
        if (editData.currency === "PLN" && displaySymbol.endsWith(".WA")) {
          displaySymbol = displaySymbol.replace(".WA", "");
        }
        setSymbol(displaySymbol);
        setSide(editData.side);
        setQuantity(editData.quantity.toString());
        setPrice(editData.price.toString());
        setCurrency(editData.currency as SupportedCurrency);
        setDate(editData.date.split('T')[0]);
      } else {
        setSymbol(prefilledSymbol || ""); setSide("BUY"); setQuantity(""); setPrice(""); setCurrency("PLN");
        setDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [isOpen, editData, prefilledSymbol]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const db = await Database.load("sqlite:portfolio.db");
      const qtyNum = parseFloat(quantity);
      const priceNum = parseFloat(price);

      // append suffix for polish stocks
      let finalSymbol = symbol.trim().toUpperCase();
      if (currency === "PLN" && !finalSymbol.includes(".")) {
        finalSymbol += ".WA";
      }

      if (!finalSymbol || isNaN(qtyNum) || isNaN(priceNum) || !date) {
        alert("Please fill all required fields correctly.");
        return;
      }

      if (editData) {
        await db.execute(
          "UPDATE transactions SET symbol = $1, side = $2, quantity = $3, price = $4, commission = $5, date = $6, currency = $7 WHERE id = $8",
          [finalSymbol, side, qtyNum, priceNum, 0, new Date(date).toISOString(), currency, editData.id]
        );
      } else {
        await db.execute(
          "INSERT INTO transactions (symbol, side, quantity, price, commission, date, currency) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [finalSymbol, side, qtyNum, priceNum, 0, new Date(date).toISOString(), currency]
        );
      }

      const store = usePortfolioStore.getState();
      await store.loadTransactions();

      const isNewTicker = !store.quotes.some(q => q.symbol === finalSymbol);
      if (isNewTicker) {
        store.fetchMarketData();
      }

      onClose();
    } catch (error) {
      console.error("Failed to add transaction:", error);
      alert("Failed to save transaction.");
    }
  };

  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    Object.assign(e.currentTarget.style, inputFocus);
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.border = "1px solid var(--border-primary)";
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="w-full max-w-md rounded-xl shadow-2xl"
        style={{ background: "var(--bg-panel)", border: "1px solid var(--border-primary)", boxShadow: "var(--modal-shadow)" }}
      >
        {/* header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid var(--border-primary)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            {editData ? "Edit Transaction" : "Add Transaction"}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--border-primary)"; e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-tertiary)"; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* form */}
        <form onSubmit={handleSubmit} className="p-6 pb-40 space-y-5 max-h-[85vh] overflow-y-auto">

          {/* symbol field */}
          <Field label="Symbol">
            <div className="relative" ref={searchContainerRef}>
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-quaternary)" }} />
              <input
                type="text"
                value={symbol}
                onChange={(e) => {
                  setSymbol(e.target.value.toUpperCase());
                  selectedFromDropdownRef.current = false;
                }}
                placeholder="TICKER"
                style={{ ...inputBase }}
                onFocus={(e) => {
                  handleFocus(e);
                  if (searchResults.length > 0 || isSearching) setShowDropdown(true);
                }}
                onBlur={handleBlur}
                className="placeholder:text-[var(--border-secondary)] uppercase"
                required
                autoComplete="off"
              />
              {showDropdown && symbol.trim().length > 0 && (isSearching || searchResults.length > 0) && (
                <div
                  className="absolute z-50 mt-1 w-full rounded-lg shadow-2xl overflow-hidden flex flex-col"
                  style={{
                    background: "var(--bg-panel)",
                    border: "1px solid var(--border-primary)",
                    top: "100%",
                    left: 0,
                    maxHeight: "200px"
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
                            setSymbol(res.symbol);
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
          </Field>

          {/* side field */}
          <Field label="Side">
            <div className="grid grid-cols-2 gap-2">
              {(["BUY", "SELL"] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSide(s)}
                  className="py-2.5 rounded-lg text-sm font-bold transition-all duration-150"
                  style={side === s
                    ? s === "BUY"
                      ? { background: "rgba(16,185,129,0.12)", color: "var(--color-success)", border: "1px solid rgba(16,185,129,0.25)" }
                      : { background: "rgba(244,63,94,0.1)", color: "var(--color-danger)", border: "1px solid rgba(244,63,94,0.2)" }
                    : { background: "var(--bg-base)", color: "var(--text-quaternary)", border: "1px solid var(--border-primary)" }
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>

          {/* currency field */}
          <Field label="Currency">
            <div className="relative">
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-quaternary)" }} />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
                style={{ ...inputBase, paddingLeft: "12px", appearance: "none", cursor: "pointer" }}
                onFocus={handleFocus as React.FocusEventHandler<HTMLSelectElement>}
                onBlur={handleBlur as React.FocusEventHandler<HTMLSelectElement>}
              >
                {SUPPORTED_CURRENCIES.map(c => (
                  <option key={c} value={c} style={{ background: "var(--bg-panel)" }}>
                    {CURRENCY_SYMBOLS[c]} {c}
                  </option>
                ))}
              </select>
            </div>
          </Field>

          {/* quantity and price fields */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Quantity">
              <div className="relative">
                <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-quaternary)" }} />
                <input type="number" step="any" value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0.00" style={{ ...inputBase }}
                  onFocus={handleFocus} onBlur={handleBlur}
                  className="placeholder:text-[var(--border-secondary)]" required
                />
              </div>
            </Field>

            <Field label={`Price per share (${currencySymbol})`}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono pointer-events-none" style={{ color: "var(--text-quaternary)" }}>
                  {currencySymbol}
                </span>
                <input type="number" step="any" value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00" style={{ ...inputBase }}
                  onFocus={handleFocus} onBlur={handleBlur}
                  className="placeholder:text-[var(--border-secondary)]" required
                />
              </div>
            </Field>
          </div>

          {/* date field */}
          <Field label="Date">
            <CustomDatePicker date={date} onChange={setDate} />
          </Field>

          {/* action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{ background: "transparent", border: "1px solid var(--border-primary)", color: "var(--text-muted)" }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.borderColor = "var(--border-secondary)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border-primary)"; }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-[0.98] shadow-sm"
              style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)", border: "1px solid var(--btn-primary-border)" }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--btn-primary-hover)"; e.currentTarget.style.borderColor = "var(--btn-primary-border)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--btn-primary-bg)"; e.currentTarget.style.borderColor = "var(--btn-primary-border)"; }}
            >
              {editData ? "Save Changes" : "Save Transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
