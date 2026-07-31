import { Wallet, PieChart, Activity } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { SummaryCard } from "../components/ui/SummaryCard";
import { CURRENCY_SYMBOLS } from "../services/marketData";
import { usePortfolioStore } from "../store/usePortfolioStore";

function formatCurrency(value: number, symbol: string): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${value < 0 ? "-" : ""}${formatted} ${symbol}`;
}

export function DashboardPage() {
  const {
    transactions,
    holdings,
    quotes,
    fxRates,
    baseCurrency,
    portfolioValue,
    totalCost,
    portfolioHistory,
  } = usePortfolioStore();

  const baseSymbol = CURRENCY_SYMBOLS[baseCurrency] ?? baseCurrency;
  const baseRate = fxRates[baseCurrency] ?? 1.0;
  const displayPortfolioValue = portfolioValue / baseRate;
  const displayTotalCost = totalCost / baseRate;
  const unrealizedPL = displayPortfolioValue - displayTotalCost;
  const unrealizedPLPercent = displayTotalCost > 0 ? (unrealizedPL / displayTotalCost) * 100 : 0;

  const weightedDailyChange = (() => {
    if (!holdings.length || !quotes.length) return 0;
    const priceMap = new Map(quotes.map(q => [q.symbol, q]));
    let totalW = 0, weightedSum = 0;
    for (const h of holdings) {
      const q = priceMap.get(h.symbol);
      if (q) {
        const v = h.quantity * q.price * (fxRates[q.currency] ?? 1.0);
        weightedSum += q.change_percent * v;
        totalW += v;
      }
    }
    return totalW > 0 ? weightedSum / totalW : 0;
  })();

  const displayValue = formatCurrency(displayPortfolioValue, baseSymbol);
  const displayChange = `${weightedDailyChange >= 0 ? "+" : ""}${weightedDailyChange.toFixed(2)}% today`;
  const displayPL = `${unrealizedPL >= 0 ? "+" : ""}${formatCurrency(unrealizedPL, baseSymbol)}`;
  const displayPLPct = `${unrealizedPLPercent >= 0 ? "+" : ""}${unrealizedPLPercent.toFixed(1)}%`;

  return (
    <>
      {/* summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <SummaryCard title={`Total Value (${baseCurrency})`} value={displayValue}
          change={displayChange} isPositive={weightedDailyChange >= 0} icon={<Wallet size={18} />} />
        <SummaryCard title={`Unrealized P/L (${baseCurrency})`} value={displayPL}
          change={displayPLPct} isPositive={unrealizedPL >= 0} icon={<PieChart size={18} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* performance chart */}
        <div className="lg:col-span-7 xl:col-span-8">
          <div
            className="rounded-xl flex flex-col h-[650px]"
            style={{ background: "#171717", border: "1px solid #262626" }}
          >
            <div
              className="px-6 py-4 shrink-0"
              style={{ borderBottom: "1px solid #262626" }}
            >
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#737373" }}>
                Portfolio Performance
              </span>
            </div>
            <div className="flex-1 w-full h-full p-4 pt-6">
              {portfolioHistory && portfolioHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={portfolioHistory}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      stroke="#737373"
                      tick={{ fill: '#737373', fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={30}
                    />
                    <YAxis
                      hide
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', color: '#fff', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}
                      itemStyle={{ color: '#10b981', fontWeight: 600 }}
                      labelStyle={{ color: '#a3a3a3', marginBottom: '4px' }}
                      formatter={(value: any) => [`${formatCurrency(Number(value), baseSymbol)}`, 'Value']}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorValue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-sm" style={{ color: "#404040" }}>
                    No historical data available
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* transactions column */}
        <div className="lg:col-span-5 xl:col-span-4">
          {/* transactions panel */}
          <div
            className="rounded-xl flex flex-col overflow-hidden h-[650px]"
            style={{ background: "#171717", border: "1px solid #262626" }}
          >
            {/* panel header */}
            <div
              className="flex items-center justify-between px-6 py-4 shrink-0"
              style={{ borderBottom: "1px solid #262626" }}
            >
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#737373" }}>
                Recent Transactions
              </span>
              <span className="text-xs font-mono" style={{ color: "#525252" }}>
                {transactions.length} entries
              </span>
            </div>

            {/* transaction list */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {transactions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: "#262626" }}
                  >
                    <Activity size={22} style={{ color: "#525252" }} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: "#737373" }}>No transactions yet</p>
                  <p className="text-xs" style={{ color: "#404040" }}>Use "Add Transaction" to get started</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "#1f1f1f" }}>
                  {transactions.map((tx) => {
                    const sym = CURRENCY_SYMBOLS[tx.currency] || tx.currency;
                    const isBuy = tx.side === "BUY";
                    const quote = quotes.find(q => q.symbol === tx.symbol);
                    const displayName = quote?.name ? `${quote.name} (${tx.symbol})` : tx.symbol;

                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between px-6 py-5 transition-colors shrink-0"
                        style={{ borderBottom: "1px solid #1f1f1f" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#1c1c1c")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        {/* transaction left side */}
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                            style={isBuy
                              ? { background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }
                              : { background: "rgba(244,63,94,0.08)", color: "#f43f5e", border: "1px solid rgba(244,63,94,0.15)" }
                            }
                          >
                            {isBuy ? "B" : "S"}
                          </div>
                          <div className="flex flex-col min-w-0 w-full">
                            <div className="text-sm font-semibold font-mono truncate w-full block" style={{ color: "#ffffff" }}>{displayName}</div>
                            <div className="text-xs mt-0.5" style={{ color: "#525252" }}>
                              {new Date(tx.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                            </div>
                          </div>
                        </div>

                        {/* transaction right side */}
                        <div className="flex flex-col items-end shrink-0 ml-4">
                          <div className="text-sm font-semibold font-mono" style={{ color: "#ffffff" }}>
                            {sym}{tx.price.toFixed(2)}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: "#525252" }}>
                            x{tx.quantity} shares
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
