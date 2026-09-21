import { Transaction, PortfolioHolding, MarketQuote } from "./marketData";

export interface DividendEvent {
  symbol: string;
  amount: number;
  date: number; // ex-date unix timestamp
  paymentDate?: number;
  payment_date?: number;
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

export interface ReceivedDividend {
  symbol: string;
  name: string;
  date: string; // dateStr
  amountNative: number;
  totalNative: number;
  currency: string;
  totalBase: number;
  dateMs: number; // For sorting
}

export interface UpcomingDividend {
  symbol: string;
  name: string;
  totalNative: number;
  totalBase: number;
  currency: string;
  dateMs: number;
  dateStr: string;
}

export interface DividendCalculationResult {
  monthlyData: MonthlyDividend[];
  stats: DividendStats;
  totalAllTime: number;
  topPayers: TopPayer[];
  upcomingDividends: UpcomingDividend[];
  receivedDividends: ReceivedDividend[];
  totalReceivedDividends: number;
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
  let totalReceivedDividends = 0;

  const monthlyData: MonthlyDividend[] = MONTH_NAMES.map(month => ({ month, amount: 0 }));
  const currencyMap = new Map<string, string>();
  const currentHoldingsMap = new Map<string, number>();

  for (const tx of transactions) {
    if (!currencyMap.has(tx.symbol)) currencyMap.set(tx.symbol, tx.currency);
    const qty = tx.side === "BUY" ? tx.quantity : -tx.quantity;
    currentHoldingsMap.set(tx.symbol, (currentHoldingsMap.get(tx.symbol) || 0) + qty);
  }

  const nowMs = new Date().getTime();
  const currentYear = new Date().getFullYear();

  const augmentedEvents: DividendEvent[] = [...dividendEvents];
  
  const eventsBySymbol = new Map<string, DividendEvent[]>();
  for (const event of dividendEvents) {
      if (!eventsBySymbol.has(event.symbol)) {
          eventsBySymbol.set(event.symbol, []);
      }
      eventsBySymbol.get(event.symbol)!.push(event);
  }

  for (const [symbol, currentQty] of currentHoldingsMap.entries()) {
    if (currentQty <= 0) continue;
    
    const quote = Array.isArray(quotes)
      ? quotes.find((q: any) => q.symbol === symbol)
      : quotes[symbol] || Object.values(quotes).find((q: any) => q.symbol === symbol);
    
    const annualPerShareNative = quote?.dividendRate || quote?.dividend_rate || 0;
    if (annualPerShareNative <= 0) continue;

    const symEvents = eventsBySymbol.get(symbol) || [];
    symEvents.sort((a, b) => a.date - b.date);

    const currency = currencyMap.get(symbol) || baseCurrency;
    const isUS = currency === "USD" || (!symbol.includes(".") && symbol.toUpperCase() === symbol);

    // Get reference date from quote or last actual event
    let refDateMs = 0;
    if (symEvents.length > 0) {
        refDateMs = symEvents[symEvents.length - 1].date * 1000;
    } else if (quote) {
        const d = quote.exDividendDate || quote.ex_dividend_date || quote.lastDividendDate || quote.last_dividend_date;
        if (d) {
            refDateMs = d * 1000;
        }
    }

    let targetMonths: number[] = [];
    if (isUS) {
        if (refDateMs > 0) {
            const baseMonth = new Date(refDateMs).getMonth();
            targetMonths = [baseMonth % 3, (baseMonth % 3) + 3, (baseMonth % 3) + 6, (baseMonth % 3) + 9];
        } else {
            targetMonths = [1, 4, 7, 10]; // Feb, May, Aug, Nov
        }
    } else {
        if (refDateMs > 0) {
            targetMonths = [new Date(refDateMs).getMonth()];
        } else {
            targetMonths = [6]; // July
        }
    }

    const hasHistory = symEvents.length > 0;

    for (const year of [currentYear - 1, currentYear, currentYear + 1]) {
        for (const month of targetMonths) {
            const dateMs = new Date(year, month, 15).getTime();
            const isFuture = dateMs > nowMs;

            // Strict rule: Only generate synthetic historical events if NO history exists.
            // If history exists, we ONLY generate synthetic events for FUTURE projections.
            if (!hasHistory || isFuture) {
                const hasActualEvent = symEvents.some(e => {
                    const d = new Date(e.date * 1000);
                    // consider +/- 1 month as the same payment event to avoid duplicates from slight date shifts
                    return d.getFullYear() === year && Math.abs(d.getMonth() - month) <= 1;
                });

                if (!hasActualEvent) {
                    const amount = isUS ? annualPerShareNative / 4 : annualPerShareNative;
                    augmentedEvents.push({ symbol, amount, date: dateMs / 1000 });
                }
            }
        }
    }
  }

  const upcomingDividends: UpcomingDividend[] = [];
  const receivedDividends: ReceivedDividend[] = [];

  for (const event of augmentedEvents) {
    const exDateMs = event.date * 1000;
    const pDate = event.paymentDate || event.payment_date;
    const paymentDateMs = pDate ? pDate * 1000 : exDateMs;
    
    const currency = currencyMap.get(event.symbol) || baseCurrency;
    const fxRate = fxRates[currency] || 1.0;

    let trueQuantityAtExDate = 0;
    for (const tx of transactions) {
      if (tx.symbol !== event.symbol) continue;
      const txDateMs = new Date(tx.date).getTime();
      if (txDateMs <= exDateMs) {
        trueQuantityAtExDate += tx.side === "BUY" ? tx.quantity : -tx.quantity;
      }
    }

    const currentQty = currentHoldingsMap.get(event.symbol) || 0;
    const chartQuantity = trueQuantityAtExDate > 0 ? trueQuantityAtExDate : currentQty;

    const eventDate = new Date(paymentDateMs);
    const dateStr = eventDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

    if (trueQuantityAtExDate > 0 && paymentDateMs <= nowMs) {
      const totalBase = (event.amount * trueQuantityAtExDate) * fxRate;
      totalAllTime += totalBase;
      totalReceivedDividends += totalBase;

      const quote = Array.isArray(quotes)
        ? quotes.find((q: any) => q.symbol === event.symbol)
        : quotes[event.symbol] || Object.values(quotes).find((q: any) => q.symbol === event.symbol);

      receivedDividends.push({
        symbol: event.symbol,
        name: quote?.name || event.symbol,
        date: dateStr,
        amountNative: event.amount,
        totalNative: event.amount * trueQuantityAtExDate,
        currency,
        totalBase,
        dateMs: paymentDateMs,
      });
    }

    if (chartQuantity > 0) {
      const payoutBase = (event.amount * chartQuantity) * fxRate;

      // Populate monthly chart for the current calendar year (YTD + Projected)
      if (eventDate.getFullYear() === currentYear) {
        const monthIndex = eventDate.getMonth();
        monthlyData[monthIndex].amount += payoutBase;
      }

      // Populate upcoming dividends (strictly forward-looking)
      if (paymentDateMs >= nowMs) {
        const quote = Array.isArray(quotes)
          ? quotes.find((q: any) => q.symbol === event.symbol)
          : quotes[event.symbol] || Object.values(quotes).find((q: any) => q.symbol === event.symbol);
        
        upcomingDividends.push({
          symbol: event.symbol,
          name: quote?.name || event.symbol,
          totalNative: event.amount * chartQuantity,
          totalBase: payoutBase,
          currency,
          dateMs: paymentDateMs,
          dateStr
        });
      }
    }
  }

  upcomingDividends.sort((a, b) => a.dateMs - b.dateMs);
  receivedDividends.sort((a, b) => b.dateMs - a.dateMs);

  // 2. forward projection: annual income & top payers
  const topPayers: TopPayer[] = [];

  for (const [symbol, currentQty] of currentHoldingsMap.entries()) {
    if (currentQty <= 0) continue;

    const quote = Array.isArray(quotes)
      ? quotes.find((q: any) => q.symbol === symbol)
      : quotes[symbol] || Object.values(quotes).find((q: any) => q.symbol === symbol);

    const holding = holdings.find(h => h.symbol === symbol);
    const currency = currencyMap.get(symbol) || baseCurrency;
    const fxRate = fxRates[currency] || 1.0;

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
        totalAmount: 0,
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
    upcomingDividends: upcomingDividends.slice(0, 10),
    receivedDividends,
    totalReceivedDividends,
  };
}