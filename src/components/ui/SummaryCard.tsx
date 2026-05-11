import { TrendingUp, TrendingDown } from "lucide-react";
import { ReactNode } from "react";

interface SummaryCardProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: ReactNode;
  changeIcon?: ReactNode;
}

export function SummaryCard({ title, value, change, isPositive, icon, changeIcon }: SummaryCardProps) {
  return (
    <div
      className="relative p-6 rounded-xl transition-colors duration-200"
      style={{ background: "#171717", border: "1px solid #262626" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#404040")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "#262626")}
    >
      <div className="flex justify-between items-start mb-5">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#a3a3a3" }}>{title}</p>
        <div className="p-1.5 rounded-lg" style={{ background: "#262626", color: "#a3a3a3" }}>
          {icon}
        </div>
      </div>

      <h3 className="text-2xl font-bold font-mono mb-3 tracking-tight" style={{ color: "#ffffff" }}>{value}</h3>

      <span
        className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded"
        style={isPositive
          ? { background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.15)" }
          : { background: "rgba(244,63,94,0.08)", color: "#f43f5e", border: "1px solid rgba(244,63,94,0.12)" }
        }
      >
        {changeIcon !== undefined ? changeIcon : (isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />)}
        {change}
      </span>
    </div>
  );
}
