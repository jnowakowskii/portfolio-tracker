import { invoke } from "@tauri-apps/api/core";

// types

export interface MarketQuote {
  symbol: string;
  price: number;
  change_percent: number;
  currency: string;
  name?: string;
  dividend_rate?: number;
}

export interface SymbolSearchResult {
  symbol: string;
  shortname?: string;
  exchange?: string;
  quoteType?: string;
}

export interface Transaction {
  id: number;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  commission: number;
  date: string;
  currency: string;
}

export interface PortfolioHolding {
  symbol: string;
  /** net quantity */
  quantity: number;
  /** total cost basis */
  totalCost: number;
  /** holding currency */
  currency: string;
}

/** fx rates relative to base currency */
export type FxRates = Record<string, number>;

export const SUPPORTED_CURRENCIES = ["PLN", "USD", "EUR", "GBP"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  PLN: "zł",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

/** combined data result */
export interface CombinedData {
  market_quotes: MarketQuote[];
  fx_rates: FxRates;
}

// api

/** get market data */
export async function getMarketDataRaw(symbols: string[]): Promise<MarketQuote[]> {
  if (symbols.length === 0) return [];
  return invoke<MarketQuote[]>("get_market_data", { symbols });
}

/**
 * combined api call to get quotes and fx rates
 */
export async function getCombinedDataRaw(symbols: string[], baseCurrency: string): Promise<CombinedData> {
  return invoke<CombinedData>("get_combined_data", { symbols, baseCurrency });
}

export async function searchSymbols(query: string): Promise<SymbolSearchResult[]> {
  if (!query.trim()) return [];
  return invoke<SymbolSearchResult[]>("search_symbols", { query });
}


// helpers

/**
 * aggregate transactions into net holdings per symbol
 */
export function aggregateHoldings(transactions: Transaction[]): PortfolioHolding[] {
  const map = new Map<string, PortfolioHolding>();

  for (const tx of transactions) {
    const existing = map.get(tx.symbol) ?? {
      symbol: tx.symbol,
      quantity: 0,
      totalCost: 0,
      currency: tx.currency || "PLN",
    };

    if (tx.side === "BUY") {
      existing.quantity += tx.quantity;
      existing.totalCost += tx.quantity * tx.price + tx.commission;
    } else {
      const avgCost = existing.quantity > 0 ? existing.totalCost / existing.quantity : 0;
      existing.quantity -= tx.quantity;
      existing.totalCost -= avgCost * tx.quantity;
    }

    map.set(tx.symbol, existing);
  }

  // return positions with shares still held
  return Array.from(map.values()).filter(h => h.quantity > 0);
}

/**
 * calculate total portfolio value
 */
export function calculatePortfolioValue(
  holdings: PortfolioHolding[],
  quotes: MarketQuote[],
  fxRates: FxRates
): number {
  const priceMap = new Map(quotes.map(q => [q.symbol, q]));

  return holdings.reduce((total, h) => {
    const quote = priceMap.get(h.symbol);
    if (!quote) return total;

    const priceInNative = quote.price;
    // the quote currency tells us what currency the market price is in
    const fxRate = fxRates[quote.currency] ?? 1.0;
    return total + h.quantity * priceInNative * fxRate;
  }, 0);
}

/**
 * calculate total cost basis
 */
export function calculateTotalCost(
  holdings: PortfolioHolding[],
  fxRates: FxRates
): number {
  return holdings.reduce((total, h) => {
    const fxRate = fxRates[h.currency] ?? 1.0;
    return total + h.totalCost * fxRate;
  }, 0);
}
