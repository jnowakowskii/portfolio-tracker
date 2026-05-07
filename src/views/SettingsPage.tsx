import { useState } from "react";
import { Trash2, ChevronDown } from "lucide-react";
import Database from "@tauri-apps/plugin-sql";
import { SUPPORTED_CURRENCIES, CURRENCY_SYMBOLS, type SupportedCurrency } from "../services/marketData";

interface SettingsPageProps {
  onPortfolioReset?: () => void;
  baseCurrency: SupportedCurrency;
  onBaseCurrencyChange: (currency: SupportedCurrency) => void;
}

type ResetStep = "idle" | "confirm-text" | "final-warning";

const panel: React.CSSProperties = {
  background: "#171717",
  border: "1px solid #262626",
  borderRadius: "12px",
  overflow: "hidden",
};

const panelHeader: React.CSSProperties = {
  padding: "14px 24px",
  borderBottom: "1px solid #262626",
};

export function SettingsPage({ onPortfolioReset, baseCurrency, onBaseCurrencyChange }: SettingsPageProps) {
  const [resetStep, setResetStep] = useState<ResetStep>("idle");
  const [confirmInput, setConfirmInput] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const handleResetClick = () => { setResetStep("confirm-text"); setConfirmInput(""); };
  const handleConfirmText = () => { if (confirmInput === "CONFIRM") setResetStep("final-warning"); };
  const handleCancel = () => { setResetStep("idle"); setConfirmInput(""); };

  const handleFinalConfirm = async () => {
    setIsResetting(true);
    try {
      const db = await Database.load("sqlite:portfolio.db");
      await db.execute("DELETE FROM transactions");
      onPortfolioReset?.();
      setResetStep("idle");
      setConfirmInput("");
    } catch (error) {
      alert("Failed to reset portfolio: " + error);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex items-start justify-center min-h-full py-4">
      <div className="space-y-6 w-full max-w-2xl">

        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#ffffff" }}>Settings</h1>

        {/* General */}
        <div style={panel}>
          <div style={panelHeader}>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#737373" }}>General</span>
          </div>
          <div className="flex items-center justify-between px-6 py-5">
            <div>
              <p className="text-sm font-medium" style={{ color: "#ffffff" }}>Base Currency</p>
              <p className="text-xs mt-1" style={{ color: "#737373" }}>All portfolio values are displayed in this currency.</p>
            </div>
            <div className="relative">
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#525252" }} />
              <select
                value={baseCurrency}
                onChange={(e) => onBaseCurrencyChange(e.target.value as SupportedCurrency)}
                className="appearance-none rounded-lg pl-3 pr-8 py-2 text-sm font-mono cursor-pointer focus:outline-none transition-colors"
                style={{ background: "#0a0a0a", border: "1px solid #262626", color: "#ffffff", minWidth: "110px" }}
              >
                {SUPPORTED_CURRENCIES.map(c => (
                  <option key={c} value={c} style={{ background: "#171717" }}>
                    {CURRENCY_SYMBOLS[c]} {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div style={{ ...panel, border: "1px solid #2d1515" }}>
          <div style={{ ...panelHeader, borderBottom: "1px solid #2d1515", background: "rgba(220,38,38,0.04)" }}>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#ef4444" }}>Danger Zone</span>
          </div>
          <div className="px-6 py-5 space-y-5">

            {/* Reset row */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: "#ffffff" }}>Reset Portfolio</p>
                <p className="text-xs mt-1" style={{ color: "#737373" }}>Delete all transactions. This cannot be undone.</p>
              </div>
              {resetStep === "idle" && (
                <button
                  onClick={handleResetClick}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95"
                  style={{ background: "rgba(220,38,38,0.08)", color: "#ef4444", border: "1px solid rgba(220,38,38,0.2)" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(220,38,38,0.15)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(220,38,38,0.08)"; }}
                >
                  <Trash2 size={14} /> Reset
                </button>
              )}
            </div>

            {/* Step 1: Type CONFIRM */}
            {resetStep === "confirm-text" && (
              <div className="p-4 rounded-lg space-y-4" style={{ background: "#1a1400", border: "1px solid rgba(234,179,8,0.2)" }}>
                <p className="text-xs font-semibold" style={{ color: "#eab308" }}>⚠ Warning: Destructive Action</p>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>
                  Type <code className="px-1.5 py-0.5 rounded font-mono font-bold" style={{ background: "#0a0a0a", color: "#eab308" }}>CONFIRM</code> to continue.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleConfirmText()}
                    placeholder='Type "CONFIRM"'
                    autoFocus
                    className="flex-1 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none"
                    style={{ background: "#0a0a0a", border: "1px solid #262626", color: "#ffffff" }}
                  />
                  <button
                    onClick={handleConfirmText}
                    disabled={confirmInput !== "CONFIRM"}
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer disabled:opacity-30"
                    style={{ background: "#eab308", color: "#0a0a0a" }}
                  >
                    OK
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer"
                    style={{ color: "#737373" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#ffffff")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#737373")}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Final warning */}
            {resetStep === "final-warning" && (
              <div className="p-4 rounded-lg space-y-4" style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}>
                <p className="text-xs font-semibold" style={{ color: "#ef4444" }}>Are you absolutely sure?</p>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>
                  This is your <span style={{ color: "#ef4444", fontWeight: 600 }}>last chance</span> to cancel. All data will be erased permanently.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleFinalConfirm}
                    disabled={isResetting}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                    style={{ background: "#dc2626" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#b91c1c")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#dc2626")}
                  >
                    <Trash2 size={14} />
                    {isResetting ? "Resetting…" : "Yes, erase everything"}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isResetting}
                    className="px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer"
                    style={{ color: "#737373" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#ffffff")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#737373")}
                  >
                    No, keep my data
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
