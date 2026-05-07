import { invoke } from "@tauri-apps/api/core";

// ── Types ──────────────────────────────────────────────────────────────

export interface MarketQuote {
  symbol: string;
  price: number;
  change_percent: number;
  currency: string;
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
  /** Net quantity (BUY adds, SELL subtracts) */
  quantity: number;
  /** Total cost basis in the holding's native currency */
  totalCost: number;
  /** Currency of this holding's transactions */
  currency: string;
}

/** FX rates relative to PLN. Key = currency code, value = rate to PLN */
export type FxRates = Record<string, number>;

export const SUPPORTED_CURRENCIES = ["PLN", "USD", "EUR", "GBP"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  PLN: "zł",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

// ── API ────────────────────────────────────────────────────────────────

/**
 * Fetch live market data for the given symbols via the Rust backend.
 * Returns an empty array if the API is unavailable or symbols is empty.
 */
export async function getMarketData(symbols: string[]): Promise<MarketQuote[]> {
  if (symbols.length === 0) return [];

  try {
    const quotes = await invoke<MarketQuote[]>("get_market_data", { symbols });
    return quotes;
  } catch (error) {
    console.error("Failed to fetch market data:", error);
    return [];
  }
}

/**
 * Fetch FX rates relative to PLN from the Rust backend.
 * Returns at minimum { PLN: 1.0 } even on failure.
 */
export async function getFxRates(): Promise<FxRates> {
  try {
    const rates = await invoke<FxRates>("get_fx_rates");
    return rates;
  } catch (error) {
    console.error("Failed to fetch FX rates:", error);
    return { PLN: 1.0 };
  }
}

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Aggregate transactions into net holdings per symbol.
 * Tracks the currency from the first transaction for that symbol.
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
      existing.quantity -= tx.quantity;
      existing.totalCost -= tx.quantity * tx.price - tx.commission;
    }

    map.set(tx.symbol, existing);
  }

  // Only return positions with shares still held
  return Array.from(map.values()).filter(h => h.quantity > 0);
}

/**
 * Calculate total portfolio market value in PLN by multiplying held quantities
 * by their current market prices, converted to PLN via FX rates.
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
    // The quote.currency tells us what currency the market price is in
    const fxRate = fxRates[quote.currency] ?? 1.0;
    return total + h.quantity * priceInNative * fxRate;
  }, 0);
}

/**
 * Calculate total cost basis of current holdings in PLN.
 * Each holding's cost is in its native currency, converted via FX rates.
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
