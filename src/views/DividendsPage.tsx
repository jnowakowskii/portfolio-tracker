import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { MonthlyDividend, DividendStats, TopPayer } from "../services/dividendLogic";

interface DividendsPageProps {
  monthlyDividends: MonthlyDividend[];
  dividendStats: DividendStats;
  topPayers?: TopPayer[];
}

export function DividendsPage({ monthlyDividends, dividendStats, topPayers = [] }: DividendsPageProps) {
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
        {/* TOP ROW: 2:1 Ratio */}
        {/* Left Card: Chart */}
        <div className="lg:col-span-8 p-6 rounded-xl bg-neutral-800/50 border border-neutral-700/50 backdrop-blur-md flex flex-col min-h-[400px]">
          <h2 className="text-lg font-semibold text-neutral-100 mb-6">
            Dividend Income by Month
          </h2>
          <div className="flex-1 w-full h-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyDividends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#404040" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#a3a3a3"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#a3a3a3"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}`}
                />
                <Tooltip
                  cursor={{ fill: "#262626" }}
                  contentStyle={{
                    backgroundColor: "#171717",
                    border: "1px solid #404040",
                    borderRadius: "8px",
                    color: "#f5f5f5",
                  }}
                  itemStyle={{ color: "#f5f5f5" }}
                  formatter={(value: any) => [
                    value.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }),
                    "Amount"
                  ]}
                />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Card: Stats */}
        <div className="lg:col-span-4 p-6 rounded-xl bg-neutral-800/50 border border-neutral-700/50 backdrop-blur-md flex flex-col justify-center space-y-8 min-h-[400px]">
          <div>
            <p className="text-sm font-medium text-neutral-400 mb-1">Annual Income</p>
            <p className="text-4xl font-bold text-neutral-100">
              {dividendStats.annualIncome.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-400 mb-1">Portfolio Yield</p>
            <p className="text-4xl font-bold text-neutral-100">
              {dividendStats.yield.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}%
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-400 mb-1">Yield on Cost</p>
            <p className="text-4xl font-bold text-neutral-100">
              {dividendStats.yieldOnCost.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}%
            </p>
          </div>
        </div>

        {/* BOTTOM ROW: 1:1 Ratio */}
        {/* Left Placeholder */}
        <div className="lg:col-span-6 p-6 rounded-xl bg-neutral-800/50 border border-neutral-700/50 backdrop-blur-md flex items-center justify-center min-h-[200px]">
          <p className="text-neutral-400 text-sm font-medium">
            Upcoming Dividends (Coming Soon)
          </p>
        </div>

        {/* Right Card: Top Payers */}
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
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-neutral-100 font-semibold">
                      {payer.annualAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
