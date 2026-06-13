import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { MonthlyDividend, DividendStats } from "../services/dividendLogic";

interface DividendsPageProps {
  monthlyDividends: MonthlyDividend[];
  dividendStats: DividendStats;
}

export function DividendsPage({ monthlyDividends, dividendStats }: DividendsPageProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-100">
            Dividends
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Track your historical dividend income and estimated yield.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* TOP ROW: 2:1 Ratio */}
        {/* Left Card: Chart */}
        <div className="lg:col-span-8 p-6 rounded-xl bg-neutral-800/50 border border-neutral-700/50 backdrop-blur-md flex flex-col min-h-[400px]">
          <h2 className="text-lg font-semibold text-neutral-100 mb-6">
            Monthly Dividend Income
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
                  formatter={(value: number) => [
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
            <p className="text-sm font-medium text-neutral-400 mb-1">Portfolio Yield %</p>
            <p className="text-4xl font-bold text-neutral-100">
              {dividendStats.yield.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}%
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-400 mb-1">Yield on Cost %</p>
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

        {/* Right Placeholder */}
        <div className="lg:col-span-6 p-6 rounded-xl bg-neutral-800/50 border border-neutral-700/50 backdrop-blur-md flex items-center justify-center min-h-[200px]">
          <p className="text-neutral-400 text-sm font-medium">
            Top Payers (Coming Soon)
          </p>
        </div>
      </div>
    </div>
  );
}
