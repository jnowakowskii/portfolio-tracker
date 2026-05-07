import { TrendingUp, TrendingDown } from "lucide-react";
import { ReactNode } from "react";

interface SummaryCardProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: ReactNode;
}

export function SummaryCard({ title, value, change, isPositive, icon }: SummaryCardProps) {
  return (
    <div className="bg-gradient-to-br from-[#0f172a] to-[#020617] border border-slate-800/80 p-6 rounded-2xl relative overflow-hidden shadow-lg group hover:border-slate-700 transition-colors duration-300">
      {/* Decorative background glow */}
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/10 transition-colors duration-500" />
      
      <div className="flex justify-between items-start mb-4">
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <div className="p-2 bg-slate-800/50 rounded-lg text-slate-400 border border-slate-700/50 shadow-sm">
          {icon}
        </div>
      </div>
      
      <div className="flex flex-col gap-2">
        <h3 className="text-3xl font-bold font-mono text-slate-50 tracking-tight">{value}</h3>
        
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md ${
            isPositive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {change}
          </span>
        </div>
      </div>
    </div>
  );
}
