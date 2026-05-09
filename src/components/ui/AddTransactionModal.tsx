import { useState, useEffect, useRef } from "react";
import Database from "@tauri-apps/plugin-sql";
import { X, Search, Hash, Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, Globe } from "lucide-react";
import { Transaction, SUPPORTED_CURRENCIES, CURRENCY_SYMBOLS, type SupportedCurrency, SymbolSearchResult, searchSymbols } from "../../services/marketData";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editData?: Transaction | null;
}

const inputBase: React.CSSProperties = {
  width: "100%",
  background: "#0a0a0a",
  border: "1px solid #262626",
  borderRadius: "8px",
  padding: "10px 12px 10px 36px",
  color: "#ffffff",
  fontSize: "14px",
  fontFamily: "monospace",
  outline: "none",
};

const inputFocus: React.CSSProperties = {
  border: "1px solid #525252",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-widest" style={{ color: "#737373" }}>
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

  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Monday start

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
    e.currentTarget.style.border = "1px solid #525252";
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = "1px solid #262626";
  };

  const today = new Date();
  const todayISO = formatISO(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div className="relative" ref={containerRef}>
      <CalendarIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#525252", zIndex: 10 }} />
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
            background: "#171717",
            border: "1px solid #262626",
            width: "280px",
            left: "0",
            top: "100%"
          }}
        >
          <div className="flex justify-between items-center mb-4">
            <button onClick={handlePrevMonth} className="p-1 rounded-md hover:bg-[#262626] text-[#a3a3a3] hover:text-white transition-colors">
              <ChevronLeft size={16} />
            </button>
            <div className="text-sm font-semibold text-white">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </div>
            <button onClick={handleNextMonth} className="p-1 rounded-md hover:bg-[#262626] text-[#a3a3a3] hover:text-white transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
              <div key={d} className="text-center text-xs font-semibold text-[#525252]">
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
                      ? 'border border-[#525252] text-white font-medium'
                      : 'text-[#a3a3a3] hover:bg-[#262626] hover:text-white'
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

function getExchangeFlag(exchange?: string, quoteType?: string): string {
  if (quoteType === "CRYPTOCURRENCY") return "crypto";
  if (!exchange) return "globe";

  const ex = exchange.toLowerCase();

  // US
  if (ex.includes("nyse") || ex.includes("nasdaq") || ex.includes("otc") || ex.includes("nms") || ex.includes("nyq") || ex.includes("pnk") || ex.includes("oqx") || ex.includes("obc") || ex.includes("bzx") || ex.includes("cboe") || ex.includes("arcx") || ex.includes("bats") || ex.includes("iex") || ex.includes("phlx")) return "us";

  // Europe (Pan-European)
  if (ex.includes("dxe") || ex.includes("cboe europe") || (ex.includes("euronext") && !ex.includes("paris") && !ex.includes("amsterdam") && !ex.includes("brussels") && !ex.includes("lisbon"))) return "eu";

  // Europe (National)
  if (ex.includes("warsaw") || ex.includes("wse")) return "pl";
  if (ex.includes("frankfurt") || ex.includes("xetra") || ex.includes("ger") || ex.includes("fra") || ex.includes("stuttgart") || ex.includes("stu") || ex.includes("berlin") || ex.includes("munich") || ex.includes("dus") || ex.includes("hamburg") || ex.includes("hannover") || ex.includes("mun")) return "de";
  if (ex.includes("london") || ex.includes("lse") || ex.includes("iobe") || ex.includes("aquis")) return "gb";
  if (ex.includes("paris") || ex.includes("par")) return "fr";
  if (ex.includes("amsterdam") || ex.includes("ams")) return "nl";
  if (ex.includes("brussels") || ex.includes("bru")) return "be";
  if (ex.includes("lisbon") || ex.includes("eli") || ex.includes("lis")) return "pt";
  if (ex.includes("madrid") || ex.includes("bme") || ex.includes("mcb") || ex.includes("barcelona") || ex.includes("valencia") || ex.includes("mce")) return "es";
  if (ex.includes("milan") || ex.includes("mil") || ex.includes("bit")) return "it";
  if (ex.includes("swiss") || ex.includes("ebs") || ex.includes("zurich") || ex.includes("swx")) return "ch";
  if (ex.includes("vienna") || ex.includes("vie") || ex.includes("wbag")) return "at";
  if (ex.includes("copenhagen") || ex.includes("cph")) return "dk";
  if (ex.includes("stockholm") || ex.includes("sto") || ex.includes("ngm")) return "se";
  if (ex.includes("oslo") || ex.includes("osl")) return "no";
  if (ex.includes("helsinki") || ex.includes("hel")) return "fi";
  if (ex.includes("dublin") || ex.includes("ise")) return "ie";
  if (ex.includes("athens") || ex.includes("ase") || ex.includes("ath")) return "gr";
  if (ex.includes("prague") || ex.includes("pse") || ex.includes("prg")) return "cz";
  if (ex.includes("budapest") || ex.includes("bse") || ex.includes("bud")) return "hu";
  if (ex.includes("moscow") || ex.includes("mcx") || ex.includes("moex")) return "ru";

  // Americas
  if (ex.includes("toronto") || ex.includes("tsx") || ex.includes("tor") || ex.includes("van") || ex.includes("neo") || ex.includes("cnsx") || ex.includes("cse") || ex.includes("cns")) return "ca";
  if (ex.includes("mexico") || ex.includes("mex") || ex.includes("bmv")) return "mx";
  if (ex.includes("sao paulo") || ex.includes("b3") || ex.includes("sao") || ex.includes("bovespa")) return "br";
  if (ex.includes("buenos aires") || ex.includes("bue") || ex.includes("bcba")) return "ar";
  if (ex.includes("santiago") || ex.includes("snse") || ex.includes("sgo")) return "cl";
  if (ex.includes("colombia") || ex.includes("bvc") || ex.includes("bogota")) return "co";
  if (ex.includes("lima") || ex.includes("bvl")) return "pe";

  // Asia / Pacific
  if (ex.includes("tokyo") || ex.includes("tse") || ex.includes("tyo") || ex.includes("ose") || ex.includes("fuk") || ex.includes("tok") || ex.includes("fka") || ex.includes("sap")) return "jp";
  if (ex.includes("hong kong") || ex.includes("hkse") || ex.includes("hkg")) return "hk";
  if (ex.includes("shanghai") || ex.includes("shenzhen") || ex.includes("shh") || ex.includes("shz") || ex.includes("sse") || ex.includes("szse")) return "cn";
  if (ex.includes("taiwan") || ex.includes("twse") || ex.includes("tai") || ex.includes("tpex") || ex.includes("two")) return "tw";
  if (ex.includes("korea") || ex.includes("kse") || ex.includes("kosdaq") || ex.includes("krx") || ex.includes("ksc") || ex.includes("koe")) return "kr";
  if (ex.includes("bombay") || ex.includes("nse") || ex.includes("nsi") || ex.includes("india")) return "in";
  if (ex.includes("singapore") || ex.includes("sgx") || ex.includes("ses")) return "sg";
  if (ex.includes("australia") || ex.includes("asx") || ex.includes("sydney")) return "au";
  if (ex.includes("new zealand") || ex.includes("nzx") || ex.includes("nze")) return "nz";
  if (ex.includes("jakarta") || ex.includes("jkse") || ex.includes("idx") || ex.includes("jkt")) return "id";
  if (ex.includes("kuala lumpur") || ex.includes("klse") || ex.includes("bursa") || ex.includes("kls")) return "my";
  if (ex.includes("bangkok") || ex.includes("set") || ex.includes("thailand")) return "th";
  if (ex.includes("manila") || ex.includes("pse") || ex.includes("psi")) return "ph";

  // Middle East / Africa
  if (ex.includes("johannesburg") || ex.includes("jse") || ex.includes("jnb")) return "za";
  if (ex.includes("tel aviv") || ex.includes("tae") || ex.includes("tase") || ex.includes("tlv")) return "il";
  if (ex.includes("saudi") || ex.includes("tadawul") || ex.includes("ksa") || ex.includes("sau")) return "sa";
  if (ex.includes("dubai") || ex.includes("dfm") || ex.includes("abu dhabi") || ex.includes("adx")) return "ae";
  if (ex.includes("qatar") || ex.includes("qse") || ex.includes("doh")) return "qa";
  if (ex.includes("istanbul") || ex.includes("bist") || ex.includes("ist")) return "tr";

  return "globe";
}

export function AddTransactionModal({ isOpen, onClose, onSave, editData }: AddTransactionModalProps) {
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
        // Strip `.WA` from display symbol if the currency is PLN.
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
        setSymbol(""); setSide("BUY"); setQuantity(""); setPrice(""); setCurrency("PLN");
        setDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [isOpen, editData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const db = await Database.load("sqlite:portfolio.db");
      const qtyNum = parseFloat(quantity);
      const priceNum = parseFloat(price);

      // Auto-append .WA for Polish stocks if no suffix is provided
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

      onSave();
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
    e.currentTarget.style.border = "1px solid #262626";
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="w-full max-w-md rounded-xl"
        style={{ background: "#171717", border: "1px solid #262626", boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid #262626" }}>
          <h2 className="text-base font-semibold" style={{ color: "#ffffff" }}>
            {editData ? "Edit Transaction" : "Add Transaction"}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
            style={{ color: "#737373" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#262626"; e.currentTarget.style.color = "#ffffff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#737373"; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Symbol */}
          <Field label="Symbol">
            <div className="relative" ref={searchContainerRef}>
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#525252" }} />
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
                className="placeholder:text-[#404040] uppercase"
                required
                autoComplete="off"
              />
              {showDropdown && symbol.trim().length > 0 && (isSearching || searchResults.length > 0) && (
                <div
                  className="absolute z-50 mt-1 w-full rounded-lg shadow-2xl overflow-hidden flex flex-col"
                  style={{
                    background: "#171717",
                    border: "1px solid #262626",
                    top: "100%",
                    left: 0,
                    maxHeight: "200px"
                  }}
                >
                  {isSearching ? (
                    <div className="p-3 text-sm font-medium" style={{ color: "#737373", textAlign: "center" }}>Searching...</div>
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
                          style={{ borderBottom: i < searchResults.length - 1 ? "1px solid #262626" : "none" }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#262626"}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-mono font-bold text-sm" style={{ color: "#ffffff" }}>{res.symbol}</span>
                            {res.exchange && (
                              <span className="text-xs uppercase flex items-center" style={{ color: "#737373" }}>
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
                            {res.shortname && <div className="text-xs truncate mr-2" style={{ color: "#a3a3a3" }}>{res.shortname}</div>}
                            {res.quoteType && (
                              <span
                                className="ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                                style={{ background: "#262626", color: "#a3a3a3" }}
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

          {/* Side */}
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
                      ? { background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }
                      : { background: "rgba(244,63,94,0.1)", color: "#f43f5e", border: "1px solid rgba(244,63,94,0.2)" }
                    : { background: "#0a0a0a", color: "#525252", border: "1px solid #262626" }
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>

          {/* Currency */}
          <Field label="Currency">
            <div className="relative">
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#525252" }} />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
                style={{ ...inputBase, paddingLeft: "12px", appearance: "none", cursor: "pointer" }}
                onFocus={handleFocus as React.FocusEventHandler<HTMLSelectElement>}
                onBlur={handleBlur as React.FocusEventHandler<HTMLSelectElement>}
              >
                {SUPPORTED_CURRENCIES.map(c => (
                  <option key={c} value={c} style={{ background: "#171717" }}>
                    {CURRENCY_SYMBOLS[c]} {c}
                  </option>
                ))}
              </select>
            </div>
          </Field>

          {/* Qty & Price */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Quantity">
              <div className="relative">
                <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#525252" }} />
                <input type="number" step="any" value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0.00" style={{ ...inputBase }}
                  onFocus={handleFocus} onBlur={handleBlur}
                  className="placeholder:text-[#404040]" required
                />
              </div>
            </Field>

            <Field label={`Price (${currencySymbol})`}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono pointer-events-none" style={{ color: "#525252" }}>
                  {currencySymbol}
                </span>
                <input type="number" step="any" value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00" style={{ ...inputBase }}
                  onFocus={handleFocus} onBlur={handleBlur}
                  className="placeholder:text-[#404040]" required
                />
              </div>
            </Field>
          </div>

          {/* Date */}
          <Field label="Date">
            <CustomDatePicker date={date} onChange={setDate} />
          </Field>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{ background: "transparent", border: "1px solid #262626", color: "#a3a3a3" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#1c1c1c"; e.currentTarget.style.color = "#ffffff"; e.currentTarget.style.borderColor = "#404040"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#a3a3a3"; e.currentTarget.style.borderColor = "#262626"; }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-[0.98]"
              style={{ background: "#ffffff", color: "#0a0a0a", border: "1px solid #ffffff" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#e5e5e5"; e.currentTarget.style.borderColor = "#e5e5e5"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#ffffff"; e.currentTarget.style.borderColor = "#ffffff"; }}
            >
              {editData ? "Save Changes" : "Save Transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
