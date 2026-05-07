import { useState } from "react";
import { Trash2 } from "lucide-react";
import Database from "@tauri-apps/plugin-sql";

interface SettingsPageProps {
  onPortfolioReset?: () => void;
}

type ResetStep = "idle" | "confirm-text" | "final-warning";

export function SettingsPage({ onPortfolioReset }: SettingsPageProps) {
  const [resetStep, setResetStep] = useState<ResetStep>("idle");
  const [confirmInput, setConfirmInput] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const handleResetClick = () => {
    setResetStep("confirm-text");
    setConfirmInput("");
  };

  const handleConfirmText = () => {
    if (confirmInput === "CONFIRM") {
      setResetStep("final-warning");
    }
  };

  const handleFinalConfirm = async () => {
    setIsResetting(true);
    try {
      const db = await Database.load("sqlite:portfolio.db");
      await db.execute("DELETE FROM transactions");
      onPortfolioReset?.();
      setResetStep("idle");
      setConfirmInput("");
    } catch (error) {
      console.error("Failed to reset portfolio:", error);
      alert("Failed to reset portfolio: " + error);
    } finally {
      setIsResetting(false);
    }
  };

  const handleCancel = () => {
    setResetStep("idle");
    setConfirmInput("");
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent tracking-tight">
        Settings
      </h1>

      {/* Danger Zone */}
      <div className="bg-[#0f172a] border border-slate-800/80 rounded-2xl overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-rose-500/20 bg-rose-500/5">
          <h3 className="text-sm font-bold uppercase tracking-widest text-rose-400">Danger Zone</h3>
        </div>

        <div className="p-6">
          {/* Reset Portfolio */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-100">Reset Portfolio</p>
              <p className="text-sm text-slate-500 mt-0.5">Delete all transactions and portfolio data. This action cannot be undone.</p>
            </div>

            {resetStep === "idle" && (
              <button
                onClick={handleResetClick}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-rose-600/10 text-rose-400 border border-rose-500/20 hover:bg-rose-600/20 hover:border-rose-500/40 transition-all duration-200 cursor-pointer active:scale-95"
              >
                <Trash2 size={16} />
                Reset
              </button>
            )}
          </div>

          {/* Step 1: Type CONFIRM */}
          {resetStep === "confirm-text" && (
            <div className="mt-6 p-5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-4 animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-amber-400 text-lg font-bold">!</span>
                </div>
                <div>
                  <p className="font-semibold text-amber-300 text-sm">Warning: Destructive Action</p>
                  <p className="text-sm text-slate-400 mt-1">
                    This will permanently delete <span className="text-slate-200 font-medium">all transactions</span> and
                    <span className="text-slate-200 font-medium"> portfolio history</span>.
                    Type <code className="px-1.5 py-0.5 bg-slate-800 rounded text-amber-300 font-mono text-xs font-bold">CONFIRM</code> below to proceed.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleConfirmText()}
                  placeholder='Type "CONFIRM"'
                  autoFocus
                  className="flex-1 bg-[#020617] border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors"
                />
                <button
                  onClick={handleConfirmText}
                  disabled={confirmInput !== "CONFIRM"}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer active:scale-95"
                >
                  OK
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Final warning */}
          {resetStep === "final-warning" && (
            <div className="mt-6 p-5 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-4 animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-rose-400 text-lg font-bold">⚠</span>
                </div>
                <div>
                  <p className="font-semibold text-rose-300 text-sm">Are you absolutely sure?</p>
                  <p className="text-sm text-slate-400 mt-1">
                    This is your <span className="text-rose-300 font-bold">last chance</span> to cancel.
                    All data will be permanently erased and cannot be recovered.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleFinalConfirm}
                  disabled={isResetting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50 transition-all duration-200 cursor-pointer active:scale-95"
                >
                  <Trash2 size={15} />
                  {isResetting ? "Resetting…" : "Yes, erase everything"}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isResetting}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  No, keep my data
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
