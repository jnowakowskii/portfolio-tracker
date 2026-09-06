import { useState } from "react";
import { Transaction } from "../services/marketData";
import { Pencil, Trash2 } from "lucide-react";

import { usePortfolioStore } from "../store/usePortfolioStore";
import Database from "@tauri-apps/plugin-sql";

interface HistoryPageProps {
  onEdit: (tx: Transaction) => void;
}

const tableHeaderStyle: React.CSSProperties = {
  padding: "12px 16px",
  textAlign: "left",
  fontSize: "12px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--text-tertiary)",
  borderBottom: "1px solid #262626",
};

const tableCellStyle: React.CSSProperties = {
  padding: "14px 16px",
  fontSize: "14px",
  color: "var(--text-secondary)",
  borderBottom: "1px solid #1f1f1f",
};

export function HistoryPage({ onEdit }: HistoryPageProps) {
  const { transactions, loadTransactions, isPrivacyModeEnabled } = usePortfolioStore();
  const mask = "*****";
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const handleDeleteClick = (id: number) => {
    setDeleteTargetId(id);
  };

  const confirmDelete = async () => {
    if (deleteTargetId !== null) {
      try {
        const db = await Database.load("sqlite:portfolio.db");
        await db.execute("DELETE FROM transactions WHERE id = $1", [deleteTargetId]);
        await loadTransactions();
      } catch (error) {
        console.error("Failed to delete transaction:", error);
        alert("Failed to delete transaction.");
      } finally {
        setDeleteTargetId(null);
      }
    }
  };

  return (
    <div className="flex items-start justify-center min-h-full py-4">
      <div className="w-full max-w-5xl space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Transaction History
        </h1>

        <div
          style={{
            background: "var(--bg-panel)",
            border: "1px solid #262626",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          {transactions.length === 0 ? (
            <div className="p-8 text-center" style={{ color: "var(--text-tertiary)" }}>
              <p className="text-sm">No transactions found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse whitespace-nowrap">
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>Date</th>
                    <th style={tableHeaderStyle}>Symbol</th>
                    <th style={tableHeaderStyle}>Side</th>
                    <th style={tableHeaderStyle}>Quantity</th>
                    <th style={tableHeaderStyle}>Price</th>
                    <th style={tableHeaderStyle}>Currency</th>
                    <th style={{ ...tableHeaderStyle, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const dateObj = new Date(tx.date);
                    const dateStr = dateObj.toLocaleDateString();

                    const isBuy = tx.side === "BUY";
                    const sideColor = isBuy ? "var(--color-success)" : "var(--color-danger)";
                    const sideBg = isBuy ? "rgba(16,185,129,0.12)" : "rgba(244,63,94,0.1)";
                    const sideBorder = isBuy ? "rgba(16,185,129,0.25)" : "rgba(244,63,94,0.2)";

                    return (
                      <tr key={tx.id} className="transition-colors hover:bg-[#1c1c1c]">
                        <td style={tableCellStyle}>{dateStr}</td>
                        <td style={{ ...tableCellStyle, fontWeight: 600 }}>{tx.symbol}</td>
                        <td style={tableCellStyle}>
                          <span
                            className="px-2 py-0.5 rounded text-xs font-bold inline-block"
                            style={{
                              color: sideColor,
                              background: sideBg,
                              border: `1px solid ${sideBorder}`,
                            }}
                          >
                            {tx.side}
                          </span>
                        </td>
                        <td style={{ ...tableCellStyle, fontFamily: "monospace" }}>
                          {isPrivacyModeEnabled ? mask : tx.quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        </td>
                        <td style={{ ...tableCellStyle, fontFamily: "monospace" }}>
                          {isPrivacyModeEnabled ? mask : tx.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        </td>
                        <td style={tableCellStyle}>{tx.currency}</td>
                        <td style={{ ...tableCellStyle, textAlign: "right" }}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => onEdit(tx)}
                              className="p-1.5 rounded transition-colors"
                              style={{ color: "var(--text-muted)" }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = "var(--text-primary)";
                                e.currentTarget.style.background = "var(--border-primary)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = "var(--text-muted)";
                                e.currentTarget.style.background = "transparent";
                              }}
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(tx.id)}
                              className="p-1.5 rounded transition-colors"
                              style={{ color: "#ef4444" }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = "#f87171";
                                e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = "#ef4444";
                                e.currentTarget.style.background = "transparent";
                              }}
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {deleteTargetId !== null && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
        >
          <div
            className="w-full max-w-sm rounded-xl overflow-hidden"
            style={{ background: "var(--bg-panel)", border: "1px solid #262626", boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}
          >
            <div className="px-6 py-5" style={{ borderBottom: "1px solid #262626" }}>
              <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Delete Transaction</h2>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Are you sure you want to delete this transaction? This action cannot be undone.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeleteTargetId(null)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={{ background: "transparent", border: "1px solid #262626", color: "var(--text-muted)" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.borderColor = "var(--border-secondary)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border-primary)"; }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-[0.98]"
                  style={{ background: "#dc2626", color: "var(--text-primary)", border: "1px solid #dc2626" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#b91c1c"; e.currentTarget.style.borderColor = "#b91c1c"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#dc2626"; e.currentTarget.style.borderColor = "#dc2626"; }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
