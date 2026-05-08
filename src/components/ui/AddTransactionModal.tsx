import { useState } from "react";
import Database from "@tauri-apps/plugin-sql";
import { X, Search, Hash, Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { SUPPORTED_CURRENCIES, CURRENCY_SYMBOLS, type SupportedCurrency } from "../../services/marketData";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
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

export function AddTransactionModal({ isOpen, onClose, onSave }: AddTransactionModalProps) {
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState("BUY");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<SupportedCurrency>("PLN");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

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
      await db.execute(
        "INSERT INTO transactions (symbol, side, quantity, price, commission, date, currency) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [finalSymbol, side, qtyNum, priceNum, 0, new Date(date).toISOString(), currency]
      );
      setSymbol(""); setSide("BUY"); setQuantity(""); setPrice(""); setCurrency("PLN");
      setDate(new Date().toISOString().split('T')[0]);
      onSave(); onClose();
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
        className="w-full max-w-md rounded-xl overflow-hidden"
        style={{ background: "#171717", border: "1px solid #262626", boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid #262626" }}>
          <h2 className="text-base font-semibold" style={{ color: "#ffffff" }}>Add Transaction</h2>
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
            <div className="relative">
              <CalendarIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#525252" }} />
              <input type="date" value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ ...inputBase }}
                onFocus={handleFocus} onBlur={handleBlur}
                className="[&::-webkit-calendar-picker-indicator]:opacity-30 [&::-webkit-calendar-picker-indicator]:invert cursor-pointer"
                required
              />
            </div>
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
              Save Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
