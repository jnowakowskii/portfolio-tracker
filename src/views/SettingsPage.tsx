import { useState, useEffect } from "react";
import { Trash2, ChevronDown, RefreshCw, RotateCcw, Activity, Download, Upload, SlidersHorizontal, DatabaseZap, TriangleAlert } from "lucide-react";
import { save, open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import Database from "@tauri-apps/plugin-sql";
import { SUPPORTED_CURRENCIES, CURRENCY_SYMBOLS, type SupportedCurrency } from "../services/marketData";
import { usePortfolioStore } from "../store/usePortfolioStore";

type ResetStep = "idle" | "confirm-text" | "final-warning";

const panel: React.CSSProperties = {
  background: "var(--bg-panel)",
  border: "1px solid var(--border-primary)",
  borderRadius: "12px",
  overflow: "hidden",
  boxShadow: "var(--card-shadow)",
};

const panelHeader: React.CSSProperties = {
  padding: "14px 24px",
  borderBottom: "1px solid var(--border-primary)",
};

// helpers

function StatRow({ label, value, mono = true }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid var(--border-primary)" }}>
      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{label}</span>
      <span className={`text-xs font-semibold ${mono ? "font-mono" : ""}`} style={{ color: "var(--text-secondary)" }}>
        {value}
      </span>
    </div>
  );
}

function formatTime(date: Date | string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// component

export function SettingsPage() {
  const {
    baseCurrency,
    setBaseCurrency,
    apiStats,
    theme,
    setTheme,
    resetApiStats,
    loadTransactions,
    fetchMarketData,
  } = usePortfolioStore();
  const [resetStep, setResetStep] = useState<ResetStep>("idle");
  const [confirmInput, setConfirmInput] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [importStep, setImportStep] = useState<"idle" | "confirm">("idle");
  const [importedTxs, setImportedTxs] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
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

  const handleExport = async () => {
    try {
      const filePath = await save({
        filters: [{ name: 'JSON', extensions: ['json'] }],
        defaultPath: 'portfolio-backup.json'
      });
      if (filePath) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const exportData = usePortfolioStore.getState().transactions.map(({ id, ...rest }) => rest);
        await writeTextFile(filePath, JSON.stringify(exportData, null, 2));
      }
    } catch (e) {
      alert("Export failed: " + e);
    }
  };

  const handleImportClick = async () => {
    try {
      const selected = await open({
        filters: [{ name: 'JSON', extensions: ['json'] }],
        multiple: false
      });
      if (selected && typeof selected === 'string') {
        const contents = await readTextFile(selected);
        const parsed = JSON.parse(contents);
        if (Array.isArray(parsed)) {
          setImportedTxs(parsed);
          setImportStep("confirm");
        } else {
          alert("Invalid backup file format.");
        }
      }
    } catch (e) {
      alert("Import failed: " + e);
    }
  };

  const confirmImport = async () => {
    setIsImporting(true);
    try {
      await usePortfolioStore.getState().importTransactions(importedTxs);
      setImportStep("idle");
      setImportedTxs([]);
    } catch (e) {
      alert("Failed to import data: " + e);
    } finally {
      setIsImporting(false);
    }
  };

  const cancelImport = () => {
    setImportStep("idle");
    setImportedTxs([]);
  };

  const statusColor = apiStats.yahooStatus === "online"
    ? "var(--color-success)"
    : apiStats.yahooStatus === "error"
      ? "var(--color-danger)"
      : "var(--text-tertiary)";

  const statusLabel = apiStats.yahooStatus === "online"
    ? "Online"
    : apiStats.yahooStatus === "error"
      ? "Error"
      : "Unknown";

  return (
    <div className="flex flex-col items-center py-4 w-full" style={{ minHeight: "88vh" }}>
      <div className="w-full max-w-2xl space-y-6 flex-1">

        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>Settings</h1>

        {/* general section */}
        <div style={panel}>
          <div style={panelHeader}>
            <div className="flex items-center gap-2.5">
              <SlidersHorizontal size={15} style={{ color: "var(--text-tertiary)" }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>
                General
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between px-6 py-5">
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Base Currency</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>All portfolio values are displayed in this currency.</p>
            </div>
            <div className="relative">
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-quaternary)" }} />
              <select
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value as SupportedCurrency)}
                className="appearance-none rounded-lg pl-3 pr-8 py-2 text-sm font-mono cursor-pointer focus:outline-none transition-colors"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border-primary)", color: "var(--text-primary)", minWidth: "110px" }}
              >
                {SUPPORTED_CURRENCIES.map(c => (
                  <option key={c} value={c} style={{ background: "var(--bg-panel)" }}>
                    {CURRENCY_SYMBOLS[c]} {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between px-6 py-5 border-t border-[var(--border-primary)]" style={{ borderTop: "1px solid var(--border-primary)" }}>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Theme</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Choose between dark and light mode.</p>
            </div>
            <div className="relative">
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-quaternary)" }} />
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as "dark" | "light")}
                className="appearance-none rounded-lg pl-3 pr-8 py-2 text-sm font-mono cursor-pointer focus:outline-none transition-colors"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border-primary)", color: "var(--text-primary)", minWidth: "110px" }}
              >
                <option value="dark" style={{ background: "var(--bg-panel)" }}>Dark</option>
                <option value="light" style={{ background: "var(--bg-panel)" }}>Light</option>
              </select>
            </div>
          </div>
        </div>

        {/* data backup and restore */}
        <div style={panel}>
          <div style={panelHeader}>
            <div className="flex items-center gap-2.5">
              <DatabaseZap size={15} style={{ color: "var(--text-tertiary)" }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>Data Backup & Restore</span>
            </div>
          </div>
          <div className="px-6 py-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Export / Import Portfolio</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Save your data to a file or restore from a backup.</p>
              </div>
              {importStep === "idle" && (
                <div className="flex gap-2">
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95"
                    style={{ background: "var(--border-primary)", color: "var(--text-secondary)", border: "1px solid var(--border-secondary)" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-hover-darker)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "var(--border-primary)"; }}
                  >
                    <Download size={14} /> Export
                  </button>
                  <button
                    onClick={handleImportClick}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95"
                    style={{ background: "var(--bg-base)", color: "var(--text-muted)", border: "1px solid var(--border-primary)" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-base)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                  >
                    <Upload size={14} /> Import
                  </button>
                </div>
              )}
            </div>

            {importStep === "confirm" && (
              <div className="p-4 rounded-lg space-y-4" style={{ background: "var(--color-warning-bg)", border: "1px solid var(--color-warning-border)" }}>
                <p className="text-xs font-semibold" style={{ color: "var(--color-warning)" }}>Confirm Import</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  This will completely overwrite your current portfolio with <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{importedTxs.length} transactions</span> from the backup file. This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={confirmImport}
                    disabled={isImporting}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                    style={{ background: "var(--color-warning)", color: "var(--bg-base)" }}
                  >
                    <Upload size={14} />
                    {isImporting ? "Importing…" : "Yes, overwrite data"}
                  </button>
                  <button
                    onClick={cancelImport}
                    disabled={isImporting}
                    className="px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer"
                    style={{ color: "var(--text-tertiary)" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--text-tertiary)")}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* api and system diagnostics */}
        <div style={panel}>
          {/* accordion header */}
          <button
            className="w-full flex items-center justify-between px-6 py-4 transition-colors"
            style={{ borderBottom: diagnosticsOpen ? "1px solid var(--border-primary)" : "1px solid transparent" }}
            onClick={() => setDiagnosticsOpen(o => !o)}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <div className="flex items-center gap-2.5">
              <Activity size={15} style={{ color: "var(--text-tertiary)" }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>
                API & System Diagnostics
              </span>
            </div>
            <ChevronDown
              size={16}
              style={{
                color: "var(--text-quaternary)",
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
                <StatRow label="Successful Calls" value={<span style={{ color: "var(--color-success)" }}>{apiStats.successfulCalls}</span>} />
                <StatRow label="Failed Calls" value={<span style={{ color: apiStats.failedCalls > 0 ? "var(--color-danger)" : "var(--text-tertiary)" }}>{apiStats.failedCalls}</span>} />
                <StatRow label="Average Latency" value={apiStats.totalRequests === 0 ? "—" : `${apiStats.avgLatencyMs} ms`} />
                <StatRow label="Last Update" value={formatTime(apiStats.lastFetchTime)} />
              </div>

              {/* error log */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-quaternary)" }}>Error Log (last 3)</p>
                <div
                  className="rounded-lg p-3 space-y-1.5 overflow-y-auto"
                  style={{ background: "var(--bg-base)", border: "1px solid var(--border-primary)", maxHeight: "100px", minHeight: "52px" }}
                >
                  {!apiStats?.errors || apiStats.errors.length === 0 ? (
                    <p className="text-xs font-mono" style={{ color: "var(--border-secondary)" }}>No errors recorded.</p>
                  ) : (
                    apiStats.errors.map((e, i) => (
                      <div key={i} className="flex gap-2 text-xs font-mono leading-snug">
                        <span style={{ color: "var(--text-quaternary)", shrink: 0 } as React.CSSProperties}>[{formatTime(e.time)}]</span>
                        <span style={{ color: "var(--color-danger)", wordBreak: "break-all" }}>{e.message}</span>
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
                  style={{ background: "var(--bg-base)", border: "1px solid var(--border-primary)", color: "var(--text-muted)" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.borderColor = "var(--border-secondary)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-base)"; e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border-primary)"; }}
                >
                  <RotateCcw size={13} />
                  Clear Stats
                </button>
                <button
                  onClick={handleForceRefresh}
                  disabled={isRefreshing || !canRefresh}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "var(--text-primary)", border: "1px solid var(--text-primary)", color: "var(--bg-base)" }}
                  onMouseEnter={e => { if (!isRefreshing && canRefresh) { e.currentTarget.style.background = "var(--text-secondary)"; e.currentTarget.style.borderColor = "var(--text-secondary)"; } }}
                  onMouseLeave={e => { e.currentTarget.style.background = "var(--text-primary)"; e.currentTarget.style.borderColor = "var(--text-primary)"; }}
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
          <div style={{ ...panelHeader, borderBottom: "1px solid #2d1515", background: "var(--color-danger-bg)" }}>
            <div className="flex items-center gap-2.5">
              <TriangleAlert size={15} style={{ color: "var(--color-danger)" }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-danger)" }}>Danger Zone</span>
            </div>
          </div>
          <div className="px-6 py-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Reset Portfolio</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Delete all transactions. This cannot be undone.</p>
              </div>
              {resetStep === "idle" && (
                <button
                  onClick={handleResetClick}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95"
                  style={{ background: "var(--color-danger-bg)", color: "var(--color-danger)", border: "1px solid var(--color-danger-border)" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--color-danger-bg)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "var(--color-danger-bg)"; }}
                >
                  <Trash2 size={14} /> Reset
                </button>
              )}
            </div>

            {resetStep === "confirm-text" && (
              <div className="p-4 rounded-lg space-y-4" style={{ background: "var(--color-warning-bg)", border: "1px solid var(--color-warning-border)" }}>
                <p className="text-xs font-semibold" style={{ color: "var(--color-warning)" }}>⚠ Warning: Destructive Action</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Type <code className="px-1.5 py-0.5 rounded font-mono font-bold" style={{ background: "var(--bg-panel)", color: "var(--color-warning)" }}>CONFIRM</code> to continue.
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
                    style={{ background: "var(--bg-base)", border: "1px solid var(--border-primary)", color: "var(--text-primary)" }}
                  />
                  <button
                    onClick={handleConfirmText}
                    disabled={confirmInput !== "CONFIRM"}
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer disabled:opacity-30 shadow-sm"
                    style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)", border: "1px solid var(--btn-primary-border)" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--btn-primary-hover)"; e.currentTarget.style.borderColor = "var(--btn-primary-border)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "var(--btn-primary-bg)"; e.currentTarget.style.borderColor = "var(--btn-primary-border)"; }}
                  >
                    OK
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer"
                    style={{ color: "var(--text-tertiary)" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--text-tertiary)")}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {resetStep === "final-warning" && (
              <div className="p-4 rounded-lg space-y-4" style={{ background: "rgba(220,38,38,0.06)", border: "1px solid var(--color-danger-border)" }}>
                <p className="text-xs font-semibold" style={{ color: "var(--color-danger)" }}>Are you absolutely sure?</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  This is your <span style={{ color: "var(--color-danger)", fontWeight: 600 }}>last chance</span> to cancel. All data will be erased permanently.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleFinalConfirm}
                    disabled={isResetting}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                    style={{ background: "var(--color-danger)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--color-danger)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "var(--color-danger)")}
                  >
                    <Trash2 size={14} />
                    {isResetting ? "Resetting…" : "Yes, erase everything"}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isResetting}
                    className="px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer"
                    style={{ color: "var(--text-tertiary)" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--text-tertiary)")}
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
        <p className="text-[11px] uppercase tracking-[0.3em]" style={{ color: "var(--text-tertiary)" }}>
          Callisto Beta v0.3.0<br /><br />
          © 2026 jakubnowakowski.com<br />
          Data via Yahoo Finance
        </p>
      </div>

    </div>
  );
}
