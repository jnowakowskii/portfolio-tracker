import { useState, useEffect } from "react";
import { Trash2, ChevronDown, RefreshCw, RotateCcw, Activity } from "lucide-react";
import Database from "@tauri-apps/plugin-sql";
import { SUPPORTED_CURRENCIES, CURRENCY_SYMBOLS, type SupportedCurrency } from "../services/marketData";
import { usePortfolioStore } from "../store/usePortfolioStore";

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

// helpers

function StatRow({ label, value, mono = true }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid #1f1f1f" }}>
      <span className="text-xs" style={{ color: "#737373" }}>{label}</span>
      <span className={`text-xs font-semibold ${mono ? "font-mono" : ""}`} style={{ color: "#e5e5e5" }}>
        {value}
      </span>
    </div>
  );
}

function formatTime(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// component

export function SettingsPage() {
  const {
    baseCurrency,
    setBaseCurrency,
    apiStats,
    resetApiStats,
    loadTransactions,
    fetchMarketData,
  } = usePortfolioStore();
  const [resetStep, setResetStep] = useState<ResetStep>("idle");
  const [confirmInput, setConfirmInput] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const lastFetchMs = apiStats.lastFetchTime ? new Date(apiStats.lastFetchTime).getTime() : 0;
  const cooldownRemaining = Math.max(0, 180000 - (now - lastFetchMs));
  const canRefresh = cooldownRemaining === 0;

  const handleResetClick = () => { setResetStep("confirm-text"); setConfirmInput(""); };
  const handleConfirmText = () => { if (confirmInput === "CONFIRM") setResetStep("final-warning"); };
  const handleCancel = () => { setResetStep("idle"); setConfirmInput(""); };

  const handleFinalConfirm = async () => {
    setIsResetting(true);
    try {
      const db = await Database.load("sqlite:portfolio.db");
      await db.execute("DELETE FROM transactions");
      await loadTransactions();
      await fetchMarketData();
      setResetStep("idle");
      setConfirmInput("");
    } catch (error) {
      alert("Failed to reset portfolio: " + error);
    } finally {
      setIsResetting(false);
    }
  };

  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchMarketData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const statusColor = apiStats.yahooStatus === "online"
    ? "#10b981"
    : apiStats.yahooStatus === "error"
      ? "#f43f5e"
      : "#737373";

  const statusLabel = apiStats.yahooStatus === "online"
    ? "Online"
    : apiStats.yahooStatus === "error"
      ? "Error"
      : "Unknown";

  return (
    <div className="flex flex-col items-center py-4 w-full" style={{ minHeight: "88vh" }}>
      <div className="w-full max-w-2xl space-y-6 flex-1">

        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#ffffff" }}>Settings</h1>

        {/* general section */}
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
                onChange={(e) => setBaseCurrency(e.target.value as SupportedCurrency)}
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

        {/* api and system diagnostics */}
        <div style={panel}>
          {/* accordion header */}
          <button
            className="w-full flex items-center justify-between px-6 py-4 transition-colors"
            style={{ borderBottom: diagnosticsOpen ? "1px solid #262626" : "1px solid transparent" }}
            onClick={() => setDiagnosticsOpen(o => !o)}
            onMouseEnter={e => (e.currentTarget.style.background = "#1c1c1c")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <div className="flex items-center gap-2.5">
              <Activity size={15} style={{ color: "#737373" }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#737373" }}>
                API & System Diagnostics
              </span>
            </div>
            <ChevronDown
              size={16}
              style={{
                color: "#525252",
                transform: diagnosticsOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.75s ease",
              }}
            />
          </button>

          {/* accordion body */}
          <div
            style={{
              maxHeight: diagnosticsOpen ? "600px" : "0px",
              overflow: "hidden",
              transition: "max-height 0.75s ease",
            }}
          >
            <div className="px-6 py-5 space-y-5">

              {/* stats grid */}
              <div>
                <StatRow
                  label="Yahoo Finance Status"
                  mono={false}
                  value={
                    <span className="flex items-center gap-1.5">
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor, display: "inline-block" }} />
                      {statusLabel}
                    </span>
                  }
                />
                <StatRow label="Total Requests" value={apiStats.totalRequests} />
                <StatRow label="Successful Calls" value={<span style={{ color: "#10b981" }}>{apiStats.successfulCalls}</span>} />
                <StatRow label="Failed Calls" value={<span style={{ color: apiStats.failedCalls > 0 ? "#f43f5e" : "#737373" }}>{apiStats.failedCalls}</span>} />
                <StatRow label="Average Latency" value={apiStats.totalRequests === 0 ? "—" : `${apiStats.avgLatencyMs} ms`} />
                <StatRow label="Last Update" value={formatTime(apiStats.lastFetchTime)} />
              </div>

              {/* error log */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#525252" }}>Error Log (last 3)</p>
                <div
                  className="rounded-lg p-3 space-y-1.5 overflow-y-auto"
                  style={{ background: "#0a0a0a", border: "1px solid #262626", maxHeight: "100px", minHeight: "52px" }}
                >
                  {apiStats.errors.length === 0 ? (
                    <p className="text-xs font-mono" style={{ color: "#404040" }}>No errors recorded.</p>
                  ) : (
                    apiStats.errors.map((e, i) => (
                      <div key={i} className="flex gap-2 text-xs font-mono leading-snug">
                        <span style={{ color: "#525252", shrink: 0 } as React.CSSProperties}>[{formatTime(e.time)}]</span>
                        <span style={{ color: "#f43f5e", wordBreak: "break-all" }}>{e.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* action buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={resetApiStats}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  style={{ background: "#0a0a0a", border: "1px solid #262626", color: "#a3a3a3" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#1c1c1c"; e.currentTarget.style.color = "#ffffff"; e.currentTarget.style.borderColor = "#404040"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#0a0a0a"; e.currentTarget.style.color = "#a3a3a3"; e.currentTarget.style.borderColor = "#262626"; }}
                >
                  <RotateCcw size={13} />
                  Clear Stats
                </button>
                <button
                  onClick={handleForceRefresh}
                  disabled={isRefreshing || !canRefresh}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "#ffffff", border: "1px solid #ffffff", color: "#0a0a0a" }}
                  onMouseEnter={e => { if (!isRefreshing && canRefresh) { e.currentTarget.style.background = "#e5e5e5"; e.currentTarget.style.borderColor = "#e5e5e5"; } }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#ffffff"; e.currentTarget.style.borderColor = "#ffffff"; }}
                >
                  <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
                  {isRefreshing ? "Refreshing…" : !canRefresh ? `Wait ${Math.ceil(cooldownRemaining / 1000)}s` : "Refresh Data"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* danger zone */}
        <div style={{ ...panel, border: "1px solid #2d1515" }}>
          <div style={{ ...panelHeader, borderBottom: "1px solid #2d1515", background: "rgba(220,38,38,0.04)" }}>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#ef4444" }}>Danger Zone</span>
          </div>
          <div className="px-6 py-5 space-y-5">
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

      <div className="w-full max-w-2xl pt-12 pb-2 text-center mt-auto">
        <p className="text-[11px] uppercase tracking-[0.3em]" style={{ color: "#3f3f3fff" }}>
          Callisto Beta v0.2.1<br /><br />
          © 2026 jakubnowakowski.com<br />
          Data via Yahoo Finance
        </p>
      </div>

    </div>
  );
}
