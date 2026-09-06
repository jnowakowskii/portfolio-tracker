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
          <h1 className="text-2xl font-semibold tracking-tight">
            Dividends
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* top row */}
        {/* left card chart */}
        <div className="lg:col-span-8 p-6 rounded-xl bg-neutral-800/50 border border-neutral-700/50 backdrop-blur-md flex flex-col min-h-[400px]">
          <h2 className="text-lg font-semibold text-neutral-100 mb-6">
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
                    border: "1px solid #404040",
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
        <div className="lg:col-span-4 p-6 rounded-xl bg-neutral-800/50 border border-neutral-700/50 backdrop-blur-md flex flex-col justify-center space-y-6 min-h-[400px]">

          {/* top annual income */}
          <div>
            <p className="text-sm font-medium text-neutral-400 mb-1">Annual Income</p>
            <p className="text-3xl font-bold text-neutral-100 tracking-tight">
              {isPrivacyModeEnabled ? mask : dividendStats.annualIncome.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} <span className="text-2xl text-neutral-400 font-medium">{baseCurrency}</span>
            </p>
          </div>

          {/* middle monthly and daily */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-neutral-400 mb-1">Monthly</p>
              <p className="text-2xl font-semibold text-neutral-200 tracking-tight">
                {isPrivacyModeEnabled ? mask : (dividendStats.annualIncome / 12).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} <span className="text-sm text-neutral-500 font-medium">{baseCurrency}</span>
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-400 mb-1">Daily</p>
              <p className="text-2xl font-semibold text-neutral-200 tracking-tight">
                {isPrivacyModeEnabled ? mask : (dividendStats.annualIncome / 365).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} <span className="text-sm text-neutral-500 font-medium">{baseCurrency}</span>
              </p>
            </div>
          </div>

          {/* bottom yields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-neutral-400 mb-1">Yield</p>
              <p className="text-2xl font-semibold text-neutral-200 tracking-tight">
                {dividendStats.yield.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}%
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-400 mb-1">Yield on Cost</p>
              <p className="text-2xl font-semibold text-neutral-200 tracking-tight">
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
        <div className="lg:col-span-6 p-6 rounded-xl bg-neutral-800/50 border border-neutral-700/50 backdrop-blur-md flex items-center justify-center min-h-[200px]">
          <p className="text-neutral-400 text-sm font-medium">
            Upcoming Dividends
          </p>
        </div>

        {/* right card top payers */}
        <div className="lg:col-span-6 p-6 rounded-xl bg-neutral-800/50 border border-neutral-700/50 backdrop-blur-md flex flex-col min-h-[200px]">
          <h2 className="text-lg font-semibold text-neutral-100 mb-6">Stocks</h2>
          {topPayers.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-neutral-400 text-sm font-medium">No data yet</p>
            </div>
          ) : (
            <div className="flex flex-col space-y-4">
              {topPayers.map((payer) => (
                <div key={payer.symbol} className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-neutral-100 font-medium">{payer.symbol}</span>
                    <span className="text-neutral-400 text-xs">{payer.name}</span>
                    <span className="text-neutral-500 text-xs mt-0.5">
                      {payer.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })} shares x {payer.dividendPerShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {payer.currency}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-neutral-100 font-semibold">
                      {isPrivacyModeEnabled ? mask : payer.annualAmountNative.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {payer.currency}
                    </span>
                    <div className="flex space-x-2 text-xs text-neutral-500">
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
