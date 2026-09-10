import { TrendingUp, TrendingDown } from "lucide-react";
import { ReactNode } from "react";
import { usePortfolioStore } from "../../store/usePortfolioStore";

interface SummaryCardProps {
  title: string;
  value: string;
  change: string;
  changePrefix?: string;
  secondaryChange?: string;
  isPositive: boolean;
  icon: ReactNode;
  changeIcon?: ReactNode;
}

export function SummaryCard({ title, value, change, changePrefix, secondaryChange, isPositive, icon, changeIcon }: SummaryCardProps) {
  const { isPrivacyModeEnabled } = usePortfolioStore();
  const mask = "*****";

  return (
    <div
      className="relative p-6 rounded-xl transition-colors duration-200"
      style={{ background: "var(--bg-panel)", border: "1px solid var(--border-primary)", boxShadow: "var(--card-shadow)" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-secondary)")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-primary)")}
    >
      <div className="flex justify-between items-start mb-5">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{title}</p>
        <div className="p-1.5 rounded-lg" style={{ background: "var(--border-primary)", color: "var(--text-muted)" }}>
          {icon}
        </div>
      </div>

      <h3 className="text-2xl font-bold font-mono mb-3 tracking-tight" style={{ color: "var(--text-primary)" }}>
        {isPrivacyModeEnabled ? mask : value}
      </h3>

      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded"
          style={isPositive
            ? { background: "rgba(16,185,129,0.1)", color: "var(--color-success)", border: "1px solid rgba(16,185,129,0.15)" }
            : { background: "rgba(244,63,94,0.08)", color: "var(--color-danger)", border: "1px solid rgba(244,63,94,0.12)" }
          }
        >
          {changePrefix && <span className="opacity-90 font-medium mr-0.5">{changePrefix}</span>}
          {changeIcon !== undefined ? changeIcon : (isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />)}
          {isPrivacyModeEnabled ? mask : change}
        </span>
        {secondaryChange && (
          <span className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
            {isPrivacyModeEnabled ? mask : secondaryChange}
          </span>
        )}
      </div>
    </div>
  );
}
