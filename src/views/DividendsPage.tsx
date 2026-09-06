import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { usePortfolioStore } from "../store/usePortfolioStore";

export function DividendsPage() {
  const { monthlyDividends, dividendStats, topPayers, baseCurrency, isPrivacyModeEnabled } = usePortfolioStore();
  const mask = "*****";
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Dividends
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* top row */}
        {/* left card chart */}
        <div className="lg:col-span-8 p-6 rounded-xl flex flex-col min-h-[400px]" style={{ background: "var(--bg-panel)", border: "1px solid var(--border-primary)", boxShadow: "var(--card-shadow)" }}>
          <h2 className="text-lg font-semibold mb-6" style={{ color: "var(--text-primary)" }}>
            Dividend Income by Month
          </h2>
          <div className="flex-1 w-full h-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyDividends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="var(--text-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}`}
                />
                <Tooltip
                  cursor={{ fill: "var(--border-primary)" }}
                  contentStyle={{
                    backgroundColor: "var(--bg-panel)",
                    border: "1px solid var(--border-secondary)",
                    borderRadius: "8px",
                    color: "#f5f5f5",
                  }}
                  itemStyle={{ color: "#f5f5f5" }}
                  formatter={(value: any) => [
                    isPrivacyModeEnabled 
                      ? mask
                      : `${Number(value).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} ${baseCurrency}`,
                    "Income"
                  ]}
                />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* right card stats */}
        <div className="lg:col-span-4 p-6 rounded-xl flex flex-col justify-center space-y-6 min-h-[400px]" style={{ background: "var(--bg-panel)", border: "1px solid var(--border-primary)", boxShadow: "var(--card-shadow)" }}>

          {/* top annual income */}
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: "var(--text-muted)" }}>Annual Income</p>
            <p className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              {isPrivacyModeEnabled ? mask : dividendStats.annualIncome.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} <span className="text-2xl font-medium" style={{ color: "var(--text-muted)" }}>{baseCurrency}</span>
            </p>
          </div>

          {/* middle monthly and daily */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Monthly</p>
              <p className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text-secondary)" }}>
                {isPrivacyModeEnabled ? mask : (dividendStats.annualIncome / 12).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} <span className="text-sm font-medium" style={{ color: "var(--text-tertiary)" }}>{baseCurrency}</span>
              </p>
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Daily</p>
              <p className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text-secondary)" }}>
                {isPrivacyModeEnabled ? mask : (dividendStats.annualIncome / 365).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} <span className="text-sm font-medium" style={{ color: "var(--text-tertiary)" }}>{baseCurrency}</span>
              </p>
            </div>
          </div>

          {/* bottom yields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Yield</p>
              <p className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text-secondary)" }}>
                {dividendStats.yield.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}%
              </p>
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Yield on Cost</p>
              <p className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text-secondary)" }}>
                {dividendStats.yieldOnCost.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}%
              </p>
            </div>
          </div>

        </div>

        {/* bottom row */}
        {/* left placeholder */}
        <div className="lg:col-span-6 p-6 rounded-xl flex items-center justify-center min-h-[200px]" style={{ background: "var(--bg-panel)", border: "1px solid var(--border-primary)", boxShadow: "var(--card-shadow)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            Upcoming Dividends
          </p>
        </div>

        {/* right card top payers */}
        <div className="lg:col-span-6 p-6 rounded-xl flex flex-col min-h-[200px]" style={{ background: "var(--bg-panel)", border: "1px solid var(--border-primary)", boxShadow: "var(--card-shadow)" }}>
          <h2 className="text-lg font-semibold mb-6" style={{ color: "var(--text-primary)" }}>Stocks</h2>
          {topPayers.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>No data yet</p>
            </div>
          ) : (
            <div className="flex flex-col space-y-4">
              {topPayers.map((payer) => (
                <div key={payer.symbol} className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-medium" style={{ color: "var(--text-primary)" }}>{payer.symbol}</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{payer.name}</span>
                    <span className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                      {payer.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })} shares x {payer.dividendPerShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {payer.currency}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      {isPrivacyModeEnabled ? mask : payer.annualAmountNative.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {payer.currency}
                    </span>
                    <div className="flex space-x-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                      <span>Yield: {payer.yield.toFixed(2)}%</span>
                      <span>(YoC: {payer.yieldOnCost.toFixed(2)}%)</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
