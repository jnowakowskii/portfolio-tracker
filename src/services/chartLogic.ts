import { Transaction } from "./marketData";

export interface HistoricalPrice {
  timestamp: number;
  close: number;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  timestamp: number;
}

export function generatePortfolioHistory(
  transactions: Transaction[],
  historicalPrices: Record<string, HistoricalPrice[]>,
  fxRates: Record<string, number>,
  baseCurrency: string,
  days = 90
): ChartDataPoint[] {
  const chartData: ChartDataPoint[] = [];

  // use the current date to determine historical midnights
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const currentDayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i).getTime();
    const dateStr = new Date(currentDayMs).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    // filter transactions to find the exact holdings owned strictly on or before this specific day
    const holdings = new Map<string, { quantity: number, currency: string }>();

    for (const tx of transactions) {
      const txTime = new Date(tx.date).getTime();
      if (txTime <= currentDayMs) {
        const existing = holdings.get(tx.symbol) ?? { quantity: 0, currency: tx.currency || baseCurrency };
        if (tx.side === "BUY") {
          existing.quantity += tx.quantity;
        } else if (tx.side === "SELL") {
          existing.quantity -= tx.quantity;
        }
        holdings.set(tx.symbol, existing);
      }
    }

    let dailyTotal = 0;

    // iterate through these held symbols
    for (const [symbol, holding] of holdings.entries()) {
      if (holding.quantity <= 0) continue;

      const symbolHistory = historicalPrices[symbol];
      let lastClose = 0;

      if (symbolHistory && symbolHistory.length > 0) {
        // find the last available closing price on or before the current day's timestamp
        let found = false;

        for (let j = symbolHistory.length - 1; j >= 0; j--) {
          // yahoo finance timestamp is in seconds so convert to milliseconds
          const histMs = symbolHistory[j].timestamp * 1000;
          if (histMs <= currentDayMs) {
            lastClose = symbolHistory[j].close;
            found = true;
            break;
          }
        }

        if (!found) {
          lastClose = 0;
        }
      }

      // convert the matched historical close price to the baseCurrency using the current fxRates
      const fxRate = fxRates[holding.currency] ?? 1.0;

      dailyTotal += lastClose * holding.quantity * fxRate;
    }

    chartData.push({
      date: dateStr,
      value: dailyTotal,
      timestamp: currentDayMs,
    });
  }

  return chartData;
}
