import { Transaction, PortfolioHolding, MarketQuote } from "./marketData";

export interface DividendEvent {
  symbol: string;
  amount: number;
  date: number; // unix timestamp
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

export interface TopPayer {
  symbol: string;
  name: string;
  totalAmount: number;
  annualAmount: number;
  annualAmountNative: number;
  currency: string;
  yield: number;
  yieldOnCost: number;
  quantity: number;
  dividendPerShare: number;
}

export interface DividendCalculationResult {
  monthlyData: MonthlyDividend[];
  stats: DividendStats;
  totalAllTime: number;
  topPayers: TopPayer[];
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export function calculateDividends(
  transactions: Transaction[],
  dividendEvents: DividendEvent[],
  fxRates: Record<string, number> | any,
  baseCurrency: string,
  portfolioValue: number,
  totalCost: number,
  holdings: PortfolioHolding[],
  quotes: Record<string, MarketQuote> | any
): DividendCalculationResult {
  let totalAllTime = 0;
  let annualIncome = 0;

  const monthlyData: MonthlyDividend[] = MONTH_NAMES.map(month => ({ month, amount: 0 }));
  const currencyMap = new Map<string, string>();
  const currentHoldingsMap = new Map<string, number>();

  for (const tx of transactions) {
    if (!currencyMap.has(tx.symbol)) currencyMap.set(tx.symbol, tx.currency);
    const qty = tx.side === "BUY" ? tx.quantity : -tx.quantity;
    currentHoldingsMap.set(tx.symbol, (currentHoldingsMap.get(tx.symbol) || 0) + qty);
  }

  const nowMs = new Date().getTime();
  const oneYearAgoMs = nowMs - 365 * 24 * 60 * 60 * 1000;

  // 1. chronological history: all-time earned & monthly chart
  for (const event of dividendEvents) {
    const eventDateMs = event.date * 1000;
    const currency = currencyMap.get(event.symbol) || baseCurrency;
    const fxRate = fxRates[currency] || 1.0;

    // calculate all-time earned based on exact holdings at ex-date
    let quantityAtExDate = 0;
    for (const tx of transactions) {
      if (tx.symbol !== event.symbol) continue;
      const txDateMs = new Date(tx.date).getTime();
      if (txDateMs <= eventDateMs) {
        quantityAtExDate += tx.side === "BUY" ? tx.quantity : -tx.quantity;
      }
    }
    if (quantityAtExDate > 0) {
      totalAllTime += (quantityAtExDate * event.amount) * fxRate;
    }

    // populate monthly chart (last 12 months)
    if (quantityAtExDate > 0 && eventDateMs >= oneYearAgoMs && eventDateMs <= nowMs) {
      const payoutBase = (event.amount * quantityAtExDate) * fxRate;
      const monthIndex = new Date(eventDateMs).getMonth();
      monthlyData[monthIndex].amount += payoutBase;
    }
  }

  // 2. forward projection: annual income & top payers
  const topPayers: TopPayer[] = [];

  for (const [symbol, currentQty] of currentHoldingsMap.entries()) {
    if (currentQty <= 0) continue;

    // bulletproof lookup in case `quotes` is an array or a record
    const quote = Array.isArray(quotes)
      ? quotes.find((q: any) => q.symbol === symbol)
      : quotes[symbol] || Object.values(quotes).find((q: any) => q.symbol === symbol);

    const holding = holdings.find(h => h.symbol === symbol);
    const currency = currencyMap.get(symbol) || baseCurrency;
    const fxRate = fxRates[currency] || 1.0;

    // handle both snake_case and camelcase serialization from rust
    const annualPerShareNative = quote?.dividendRate || quote?.dividend_rate || 0;

    if (annualPerShareNative > 0) {
      const forwardNative = annualPerShareNative * currentQty;
      const forwardBase = forwardNative * fxRate;
      annualIncome += forwardBase;

      const currentValueBase = holding && quote ? (holding.quantity * quote.price) * (fxRates[quote.currency] || 1) : 0;
      const totalCostBase = holding ? holding.totalCost * (fxRates[holding.currency] || 1) : 0;

      const symYield = currentValueBase > 0 ? (forwardBase / currentValueBase) * 100 : 0;
      const symYoc = totalCostBase > 0 ? (forwardBase / totalCostBase) * 100 : 0;

      topPayers.push({
        symbol,
        name: quote?.name || symbol,
        totalAmount: 0, // unused in ui, kept for interface compliance
        annualAmount: forwardBase,
        annualAmountNative: forwardNative,
        currency,
        yield: symYield,
        yieldOnCost: symYoc,
        quantity: currentQty,
        dividendPerShare: annualPerShareNative
      });
    }
  }

  const portfolioYield = portfolioValue > 0 ? (annualIncome / portfolioValue) * 100 : 0;
  const yieldOnCost = totalCost > 0 ? (annualIncome / totalCost) * 100 : 0;

  topPayers.sort((a, b) => b.annualAmount - a.annualAmount);

  return {
    monthlyData,
    stats: { annualIncome, yield: portfolioYield, yieldOnCost },
    totalAllTime,
    topPayers: topPayers.slice(0, 5),
  };
}