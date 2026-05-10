import { useMemo } from "react";
import { PieChart as PieChartIcon } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { CURRENCY_SYMBOLS, type MarketQuote, type PortfolioHolding, type FxRates, type SupportedCurrency } from "../services/marketData";

interface AllocationPageProps {
  holdings: PortfolioHolding[];
  quotes: MarketQuote[];
  fxRates: FxRates;
  baseCurrency: SupportedCurrency;
}

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
  background: "#171717",
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

export function AllocationPage({ holdings, quotes, fxRates, baseCurrency }: AllocationPageProps) {
  const baseSymbol = CURRENCY_SYMBOLS[baseCurrency] ?? baseCurrency;
  const baseRate = fxRates[baseCurrency] ?? 1.0;

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
        value: valueBase,
      };
    }).filter(d => d.value > 0).sort((a, b) => b.value - a.value);

    const tValue = hData.reduce((sum, d) => sum + d.value, 0);

    return { holdingsData: hData, totalValue: tValue };
  }, [holdings, quotes, fxRates, baseCurrency, baseRate]);

  if (holdings.length === 0) {
    return (
      <div className="flex flex-col items-center py-4 w-full" style={{ minHeight: "88vh" }}>
        <div className="w-full max-w-2xl space-y-6 flex-1 flex flex-col">
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#ffffff" }}>Allocation</h1>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "#262626" }}>
              <PieChartIcon size={22} style={{ color: "#525252" }} />
            </div>
            <p className="text-sm font-medium" style={{ color: "#737373" }}>No data to display. Add transactions to see your allocation.</p>
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
        <div className="p-3 rounded-lg shadow-xl border" style={{ background: "#0a0a0a", borderColor: "#262626" }}>
          <p className="text-sm font-medium mb-2" style={{ color: "#e5e5e5" }}>{data.name}</p>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-6">
              <span className="text-xs" style={{ color: "#a3a3a3" }}>Value</span>
              <span className="text-xs font-mono font-medium" style={{ color: "#e5e5e5" }}>
                {formattedValue} {baseSymbol}
              </span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <span className="text-xs" style={{ color: "#a3a3a3" }}>Allocation</span>
              <span className="text-xs font-mono font-medium" style={{ color: "#e5e5e5" }}>
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
                <span className="text-xs font-medium" style={{ color: "#a3a3a3" }}>{entry.value}</span>
                <span className="text-[10px]" style={{ color: "#737373" }}>{percent}%</span>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="flex flex-col items-center py-4 w-full" style={{ minHeight: "88vh" }}>
      <div className="w-full max-w-2xl space-y-6 flex-1">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#ffffff" }}>Allocation</h1>

        <div style={panel}>
          <div style={panelHeader}>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#737373" }}>
              Holdings
            </span>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center min-h-[360px]">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={holdingsData}
                  cx="50%"
                  cy="45%"
                  innerRadius={75}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="#171717"
                  strokeWidth={3}
                  isAnimationActive={false}
                >
                  {holdingsData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
                <Legend content={renderLegend} verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
