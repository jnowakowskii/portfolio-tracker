import { useMemo } from "react";
import { PieChart as PieChartIcon } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { CURRENCY_SYMBOLS } from "../services/marketData";
import { usePortfolioStore } from "../store/usePortfolioStore";

const COLORS = [
  "#60A5FA", "#A78BFA", "#2DD4BF", "#FBBF24", "#FB7185",
  "#818CF8", "#F472B6", "#34D399", "#38BDF8", "#C084FC",
  "#A3E635", "#F87171", "#22D3EE", "#FB923C", "#E879F9",
  "#FACC15", "#4ADE80", "#94A3B8", "#A8A29E", "#3B82F6",
  "#8B5CF6", "#14B8A6", "#F59E0B", "#F43F5E", "#86EFAC",
  "#6366F1", "#EC4899", "#10B981", "#0EA5E9", "#A855F7",
  "#84CC16", "#EF4444", "#06B6D4", "#F97316", "#D946EF",
  "#EAB308", "#22C55E", "#64748B", "#78716C", "#F0ABFC",
  "#7DD3FC", "#A5B4FC", "#5EEAD4", "#FCD34D", "#FDA4AF",
  "#6EE7B7", "#D8B4FE", "#FCA5A5", "#67E8F9", "#FDBA74",
];


const panel: React.CSSProperties = {
  background: "var(--bg-panel)",
  border: "1px solid #262626",
  borderRadius: "12px",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

const panelHeader: React.CSSProperties = {
  padding: "14px 24px",
  borderBottom: "1px solid #262626",
};

export function AllocationPage() {
  const { holdings, quotes, fxRates, baseCurrency, isPrivacyModeEnabled } = usePortfolioStore();
  const baseSymbol = CURRENCY_SYMBOLS[baseCurrency] ?? baseCurrency;
  const baseRate = fxRates[baseCurrency] ?? 1.0;
  const mask = "*****";

  const { holdingsData, totalValue } = useMemo(() => {
    const hData = holdings.map(h => {
      const quote = quotes.find(q => q.symbol === h.symbol);
      let valueBase = 0;
      if (quote) {
        const vPln = h.quantity * quote.price * (fxRates[quote.currency] ?? 1.0);
        valueBase = vPln / baseRate;
      }
      return {
        name: h.symbol,
        symbol: h.symbol,
        stockName: quote?.name || h.symbol,
        price: quote?.price || 0,
        priceCurrency: quote?.currency || h.currency,
        avgCost: h.quantity > 0 ? h.totalCost / h.quantity : 0,
        costCurrency: h.currency,
        value: valueBase,
      };
    }).filter(d => d.value > 0).sort((a, b) => b.value - a.value);

    const tValue = hData.reduce((sum, d) => sum + d.value, 0);

    return { holdingsData: hData, totalValue: tValue };
  }, [holdings, quotes, fxRates, baseCurrency, baseRate]);

  if (holdings.length === 0) {
    return (
      <div className="flex flex-col items-center py-4 w-full" style={{ minHeight: "88vh" }}>
        <div className="w-full max-w-6xl space-y-6 flex-1 flex flex-col">
          <div className="flex items-end justify-between">
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>Allocation</h1>
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium" style={{ color: "var(--text-tertiary)" }}>Total Value</span>
              <span className="text-2xl font-semibold font-mono tracking-tight" style={{ color: "var(--text-primary)" }}>
                {isPrivacyModeEnabled ? mask : "0.00"} <span className="text-xl text-[#a3a3a3] font-sans ml-1">{baseSymbol}</span>
              </span>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "var(--border-primary)" }}>
              <PieChartIcon size={22} style={{ color: "var(--text-quaternary)" }} />
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--text-tertiary)" }}>No data to display. Add transactions to see your allocation.</p>
          </div>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percent = totalValue > 0 ? ((data.value / totalValue) * 100).toFixed(1) : "0.0";
      const formattedValue = data.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      return (
        <div className="p-3 rounded-lg shadow-xl border" style={{ background: "var(--bg-base)", borderColor: "var(--border-primary)" }}>
          <p className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>{data.name}</p>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-6">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Value</span>
              <span className="text-xs font-mono font-medium" style={{ color: "var(--text-secondary)" }}>
                {isPrivacyModeEnabled ? mask : `${formattedValue} ${baseSymbol}`}
              </span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Allocation</span>
              <span className="text-xs font-mono font-medium" style={{ color: "var(--text-secondary)" }}>
                {percent}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-2">
        {payload.map((entry: any, index: number) => {
          const data = entry.payload;
          const percent = totalValue > 0 ? ((data.value / totalValue) * 100).toFixed(1) : "0.0";
          return (
            <li key={`item-${index}`} className="flex items-center gap-2">
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: entry.color, display: "inline-block" }} />
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{entry.value}</span>
                <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{percent}%</span>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="flex flex-col items-center py-4 w-full" style={{ minHeight: "88vh" }}>
      <div className="w-full max-w-6xl space-y-6 flex-1">
        <div className="flex items-end justify-between">
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>Allocation</h1>
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium" style={{ color: "var(--text-tertiary)" }}>Total Value</span>
            <span className="text-2xl font-semibold font-mono tracking-tight" style={{ color: "var(--text-primary)" }}>
              {isPrivacyModeEnabled ? mask : totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xl text-[#a3a3a3] font-sans ml-1">{baseSymbol}</span>
            </span>
          </div>
        </div>

        <div style={panel}>
          <div style={panelHeader}>
            <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>
              Holdings by ticker
            </span>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center min-h-[460px] select-none cursor-default" style={{ userSelect: "none", WebkitUserSelect: "none" }}>
            <ResponsiveContainer width="100%" height={420} className="allocation-chart" style={{ userSelect: "none" }}>
              <PieChart style={{ userSelect: "none", outline: "none" }}>
                <Pie
                  data={holdingsData}
                  cx="50%"
                  cy="45%"
                  innerRadius={105}
                  outerRadius={160}
                  paddingAngle={1}
                  dataKey="value"
                  stroke="var(--bg-panel)"
                  strokeWidth={3}
                  isAnimationActive={false}
                >
                  {holdingsData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
                <Legend content={renderLegend} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={panel}>
          <div style={panelHeader}>
            <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>
              Assets Breakdown
            </span>
          </div>
          <div className="flex flex-col">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-[#262626] text-xs font-medium text-[#737373] uppercase tracking-wider">
              <div className="col-span-4">Name / ticker</div>
              <div className="col-span-3 text-right">Current Price / Average Cost</div>
              <div className="col-span-3 text-right">Market Value</div>
              <div className="col-span-2 text-right">Allocation</div>
            </div>
            <div className="flex flex-col">
              {holdingsData.map((item, index) => {
                const percent = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : "0.0";
                const color = COLORS[index % COLORS.length];

                return (
                  <div key={item.symbol} className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-[#262626] last:border-0 items-center hover:bg-[#1f1f1f] transition-colors">
                    <div className="col-span-4 flex flex-col overflow-hidden">
                      <span className="text-sm font-medium text-[#e5e5e5] truncate" title={item.stockName}>{item.stockName}</span>
                      <span className="text-xs text-[#737373] mt-0.5 truncate">{item.symbol}</span>
                    </div>
                    <div className="col-span-3 flex flex-col items-end overflow-hidden">
                      <span className="text-sm font-mono text-[#e5e5e5] truncate w-full text-right" title={`${item.price} ${item.priceCurrency}`}>
                        {isPrivacyModeEnabled ? mask : item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.priceCurrency}
                      </span>
                      <span className="text-xs font-mono text-[#737373] mt-0.5 truncate w-full text-right" title={`Avg: ${item.avgCost} ${item.costCurrency}`}>
                        Avg Cost: {isPrivacyModeEnabled ? mask : item.avgCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.costCurrency}
                      </span>
                    </div>
                    <div className="col-span-3 flex flex-col items-end justify-center overflow-hidden">
                      <span className="text-sm font-mono text-[#e5e5e5] truncate w-full text-right" title={`${item.value} ${baseCurrency}`}>
                        {isPrivacyModeEnabled ? mask : item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {baseSymbol}
                      </span>
                    </div>
                    <div className="col-span-2 flex flex-col items-end justify-center overflow-hidden">
                      <span className="text-sm font-mono font-medium text-right mb-1.5" style={{ color }}>
                        {percent}%
                      </span>
                      <div className="w-28 h-1.5 bg-[#262626] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${percent}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
