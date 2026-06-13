import { Transaction, FxRates } from "./marketData";

export interface DividendEvent {
  symbol: string;
  amount: number;
  date: number; // Unix timestamp in seconds
}

export interface MonthlyDividend {
  month: string;
  amount: number;
}

export interface DividendStats {
  annualIncome: number;
  yield: number;
  yieldOnCost: number;
}

export interface DividendCalculationResult {
  monthlyData: MonthlyDividend[];
  stats: DividendStats;
  totalAllTime: number;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export function calculateDividends(
  transactions: Transaction[],
  dividendEvents: DividendEvent[],
  fxRates: FxRates,
  baseCurrency: string,
  portfolioValue: number,
  totalCost: number
): DividendCalculationResult {
  let totalAllTime = 0;
  let annualIncome = 0; // sum over the last 12 months

  const now = new Date();
  const currentYear = now.getFullYear();

  // Initialize current year's monthly data array
  const monthlyData: MonthlyDividend[] = MONTH_NAMES.map(month => ({
    month,
    amount: 0,
  }));

  // Create a map to quickly look up currency per symbol
  // We assume all transactions for a given symbol share the same currency
  const currencyMap = new Map<string, string>();
  for (const tx of transactions) {
    if (!currencyMap.has(tx.symbol)) {
      currencyMap.set(tx.symbol, tx.currency);
    }
  }

  // Pre-sort transactions by date to optimize? The array of tx is probably small enough.
  // We'll iterate events instead.
  for (const event of dividendEvents) {
    // Yahoo Finance returns dividend dates as unix timestamps in seconds.
    // Convert to milliseconds for Date comparison.
    const eventDateMs = event.date * 1000;
    const eventDate = new Date(eventDateMs);
    
    // Filter transactions for this symbol that occurred before or on the dividend ex-date
    let quantity = 0;
    for (const tx of transactions) {
      if (tx.symbol !== event.symbol) continue;

      const txDateMs = new Date(tx.date).getTime();
      if (txDateMs <= eventDateMs) {
        if (tx.side === "BUY") {
          quantity += tx.quantity;
        } else if (tx.side === "SELL") {
          quantity -= tx.quantity;
        }
      }
    }

    if (quantity > 0) {
      const payoutLocal = quantity * event.amount;
      const currency = currencyMap.get(event.symbol) || baseCurrency;
      const fxRate = fxRates[currency] || 1.0;
      
      const payoutBase = payoutLocal * fxRate;

      // 1. Add to total all-time
      totalAllTime += payoutBase;

      // 2. Check if in current calendar year to fill monthly chart
      if (eventDate.getFullYear() === currentYear) {
        const monthIndex = eventDate.getMonth();
        monthlyData[monthIndex].amount += payoutBase;
      }

      // 3. Check if in the last 12 months to estimate annual income
      // The event date should be > (now - 1 year)
      const oneYearAgoMs = now.getTime() - 365 * 24 * 60 * 60 * 1000;
      if (eventDateMs >= oneYearAgoMs && eventDateMs <= now.getTime()) {
        annualIncome += payoutBase;
      }
    }
  }

  const portfolioYield = portfolioValue > 0 ? (annualIncome / portfolioValue) * 100 : 0;
  const yieldOnCost = totalCost > 0 ? (annualIncome / totalCost) * 100 : 0;

  return {
    monthlyData,
    stats: {
      annualIncome,
      yield: portfolioYield,
      yieldOnCost,
    },
    totalAllTime,
  };
}
