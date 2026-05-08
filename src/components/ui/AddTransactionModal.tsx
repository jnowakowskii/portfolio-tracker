import { useState, useEffect, useRef } from "react";
import Database from "@tauri-apps/plugin-sql";
import { X, Search, Hash, Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Transaction, SUPPORTED_CURRENCIES, CURRENCY_SYMBOLS, type SupportedCurrency } from "../../services/marketData";

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
                  className={`w-8 h-8 flex items-center justify-center rounded-md text-sm transition-colors ${
                    isSelected 
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

export function AddTransactionModal({ isOpen, onClose, onSave, editData }: AddTransactionModalProps) {
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState("BUY");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<SupportedCurrency>("PLN");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (isOpen) {
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
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#525252" }} />
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="TICKER"
                style={{ ...inputBase }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                className="placeholder:text-[#404040] uppercase"
                required
              />
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
