import { Transaction, FxRates, PortfolioHolding, MarketQuote } from "./marketData";

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

export interface TopPayer {
  symbol: string;
  name: string;
  totalAmount: number;
  annualAmount: number;
  annualAmountNative: number;
  currency: string;
  yield: number;
  yieldOnCost: number;
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
  fxRates: FxRates,
  baseCurrency: string,
  portfolioValue: number,
  totalCost: number,
  holdings: PortfolioHolding[],
  quotes: MarketQuote[]
): DividendCalculationResult {
  let totalAllTime = 0;
  let annualIncome = 0; 

  const now = new Date();
  
  const monthlyData: MonthlyDividend[] = MONTH_NAMES.map(month => ({
    month,
    amount: 0,
  }));

  // Map to store current currency and holdings per symbol
  const currencyMap = new Map<string, string>();
  const currentHoldings = new Map<string, number>();

  for (const tx of transactions) {
    if (!currencyMap.has(tx.symbol)) {
      currencyMap.set(tx.symbol, tx.currency);
    }
    const qty = tx.side === "BUY" ? tx.quantity : -tx.quantity;
    currentHoldings.set(tx.symbol, (currentHoldings.get(tx.symbol) || 0) + qty);
  }

  const payoutsPerSymbol = new Map<string, number>();
  const annualPerSymbol = new Map<string, number>();
  const annualPerSymbolNative = new Map<string, number>();
  const oneYearAgoMs = now.getTime() - 365 * 24 * 60 * 60 * 1000;

  for (const event of dividendEvents) {
    const eventDateMs = event.date * 1000;
    
    // 1. CHRONOLOGICAL REALITY (Total Earned All-Time & Top Payers)
    let quantityAtExDate = 0;
    for (const tx of transactions) {
      if (tx.symbol !== event.symbol) continue;
      const txDateMs = new Date(tx.date).getTime();
      if (txDateMs <= eventDateMs) {
        if (tx.side === "BUY") quantityAtExDate += tx.quantity;
        else if (tx.side === "SELL") quantityAtExDate -= tx.quantity;
      }
    }

    if (quantityAtExDate > 0) {
      const payoutLocal = quantityAtExDate * event.amount;
      const currency = currencyMap.get(event.symbol) || baseCurrency;
      const fxRate = fxRates[currency] || 1.0;
      const payoutBase = payoutLocal * fxRate;

      totalAllTime += payoutBase;
      payoutsPerSymbol.set(event.symbol, (payoutsPerSymbol.get(event.symbol) || 0) + payoutBase);
    }

    // 2. FORWARD PROJECTION (Projected Annual Income & Monthly Chart)
    // Project the upcoming 12 months based on the last 365 days of events and CURRENT holdings
    if (eventDateMs >= oneYearAgoMs && eventDateMs <= now.getTime()) {
      const currentQty = currentHoldings.get(event.symbol) || 0;
      if (currentQty > 0) {
        const payoutLocal = currentQty * event.amount;
        const currency = currencyMap.get(event.symbol) || baseCurrency;
        const fxRate = fxRates[currency] || 1.0;
        const payoutBase = payoutLocal * fxRate;

        annualIncome += payoutBase;
        annualPerSymbol.set(event.symbol, (annualPerSymbol.get(event.symbol) || 0) + payoutBase);
        annualPerSymbolNative.set(event.symbol, (annualPerSymbolNative.get(event.symbol) || 0) + payoutLocal);

        const eventDate = new Date(eventDateMs);
        const monthIndex = eventDate.getMonth();
        monthlyData[monthIndex].amount += payoutBase;
      }
    }
  }

  const portfolioYield = portfolioValue > 0 ? (annualIncome / portfolioValue) * 100 : 0;
  const yieldOnCost = totalCost > 0 ? (annualIncome / totalCost) * 100 : 0;

  const allSymbols = new Set([...payoutsPerSymbol.keys(), ...annualPerSymbol.keys()]);
  const topPayers: TopPayer[] = Array.from(allSymbols)
    .map(symbol => {
      const totalAmount = payoutsPerSymbol.get(symbol) || 0;
      const annualAmount = annualPerSymbol.get(symbol) || 0;

      const quote = quotes.find(q => q.symbol === symbol);
      const holding = holdings.find(h => h.symbol === symbol);

      const name = quote?.name || symbol;

      let symYield = 0;
      let symYoc = 0;

      if (holding && quote && quote.price > 0 && holding.quantity > 0) {
        const fxRateQuote = fxRates[quote.currency] || 1;
        const currentValueBase = holding.quantity * quote.price * fxRateQuote;
        if (currentValueBase > 0) {
          symYield = (annualAmount / currentValueBase) * 100;
        }

        const fxRateHolding = fxRates[holding.currency] || 1;
        const totalCostBase = holding.totalCost * fxRateHolding;
        if (totalCostBase > 0) {
          symYoc = (annualAmount / totalCostBase) * 100;
        }
      }

      return {
        symbol,
        name,
        totalAmount,
        annualAmount,
        annualAmountNative: annualPerSymbolNative.get(symbol) || 0,
        currency: quote?.currency || currencyMap.get(symbol) || baseCurrency,
        yield: symYield,
        yieldOnCost: symYoc,
      };
    })
    .sort((a, b) => b.annualAmount - a.annualAmount)
    .slice(0, 5);

  return {
    monthlyData,
    stats: {
      annualIncome,
      yield: portfolioYield,
      yieldOnCost,
    },
    totalAllTime,
    topPayers,
  };
}
