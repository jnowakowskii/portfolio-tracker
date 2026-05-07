

export function SummaryCard({ title, value, change, isPositive }: any) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
      <p className="text-sm text-slate-400 uppercase tracking-wider mb-2">{title}</p>
      <div className="flex flex-col">
        <h3 className="text-2xl font-bold font-mono">{value}</h3>
        <span className={`text-xs font-bold mt-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>{change}</span>
      </div>
    </div>
  );
}
