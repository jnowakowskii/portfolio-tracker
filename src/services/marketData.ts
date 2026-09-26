import { invoke } from "@tauri-apps/api/core";

// types
export interface MarketQuote {
  symbol: string;
  price: number;
  change_percent: number;
  currency: string;
  name?: string;
  dividendRate?: number;
  dividend_rate?: number;
  exDividendDate?: number;
  ex_dividend_date?: number;
  lastDividendDate?: number;
  last_dividend_date?: number;
  paymentDate?: number;
  payment_date?: number;
  pe?: number;
  yield_percent?: number;
  trend7d?: number;
  history7d?: number[];
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
  quantity: number; // net quantity
  totalCost: number; // total cost basis
  currency: string; // holding currency
}

// fx rates relative to base currency
export type FxRates = Record<string, number>;

export const SUPPORTED_CURRENCIES = ["PLN", "USD", "EUR", "GBP"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  PLN: "zł",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

// combined data result
export interface CombinedData {
  market_quotes: MarketQuote[];
  fx_rates: FxRates;
}

// api

// get market data
export async function getMarketDataRaw(symbols: string[]): Promise<MarketQuote[]> {
  if (symbols.length === 0) return [];
  return invoke<MarketQuote[]>("get_market_data", { symbols });
}

// combined api call to get quotes and forex rates
export async function getCombinedDataRaw(symbols: string[], baseCurrency: string): Promise<CombinedData> {
  return invoke<CombinedData>("get_combined_data", { symbols, baseCurrency });
}

export async function searchSymbols(query: string): Promise<SymbolSearchResult[]> {
  if (!query.trim()) return [];
  return invoke<SymbolSearchResult[]>("search_symbols", { query });
}

export function getExchangeFlag(exchange?: string, quoteType?: string): string {
  if (quoteType === "CRYPTOCURRENCY") return "crypto";
  if (!exchange) return "globe";

  const ex = exchange.toLowerCase();

  // usa
  if (ex.includes("nyse") || ex.includes("nasdaq") || ex.includes("otc") || ex.includes("nms") || ex.includes("nyq") || ex.includes("pnk") || ex.includes("oqx") || ex.includes("obc") || ex.includes("bzx") || ex.includes("cboe") || ex.includes("arcx") || ex.includes("bats") || ex.includes("iex") || ex.includes("phlx")) return "us";

  // europe
  if (ex.includes("dxe") || ex.includes("cboe europe") || (ex.includes("euronext") && !ex.includes("paris") && !ex.includes("amsterdam") && !ex.includes("brussels") && !ex.includes("lisbon"))) return "eu";
  if (ex.includes("warsaw") || ex.includes("wse")) return "pl";
  if (ex.includes("frankfurt") || ex.includes("xetra") || ex.includes("ger") || ex.includes("fra") || ex.includes("stuttgart") || ex.includes("stu") || ex.includes("berlin") || ex.includes("munich") || ex.includes("dus") || ex.includes("hamburg") || ex.includes("hannover") || ex.includes("mun")) return "de";
  if (ex.includes("london") || ex.includes("lse") || ex.includes("iobe") || ex.includes("aquis")) return "gb";
  if (ex.includes("paris") || ex.includes("par")) return "fr";
  if (ex.includes("amsterdam") || ex.includes("ams")) return "nl";
  if (ex.includes("brussels") || ex.includes("bru")) return "be";
  if (ex.includes("lisbon") || ex.includes("eli") || ex.includes("lis")) return "pt";
  if (ex.includes("madrid") || ex.includes("bme") || ex.includes("mcb") || ex.includes("barcelona") || ex.includes("valencia") || ex.includes("mce")) return "es";
  if (ex.includes("milan") || ex.includes("mil") || ex.includes("bit")) return "it";
  if (ex.includes("swiss") || ex.includes("ebs") || ex.includes("zurich") || ex.includes("swx")) return "ch";
  if (ex.includes("vienna") || ex.includes("vie") || ex.includes("wbag")) return "at";
  if (ex.includes("copenhagen") || ex.includes("cph")) return "dk";
  if (ex.includes("stockholm") || ex.includes("sto") || ex.includes("ngm")) return "se";
  if (ex.includes("oslo") || ex.includes("osl")) return "no";
  if (ex.includes("helsinki") || ex.includes("hel")) return "fi";
  if (ex.includes("dublin") || ex.includes("ise")) return "ie";
  if (ex.includes("athens") || ex.includes("ase") || ex.includes("ath")) return "gr";
  if (ex.includes("prague") || ex.includes("pse") || ex.includes("prg")) return "cz";
  if (ex.includes("budapest") || ex.includes("bse") || ex.includes("bud")) return "hu";
  if (ex.includes("moscow") || ex.includes("mcx") || ex.includes("moex")) return "ru";

  // americas
  if (ex.includes("toronto") || ex.includes("tsx") || ex.includes("tor") || ex.includes("van") || ex.includes("neo") || ex.includes("cnsx") || ex.includes("cse") || ex.includes("cns")) return "ca";
  if (ex.includes("mexico") || ex.includes("mex") || ex.includes("bmv")) return "mx";
  if (ex.includes("sao paulo") || ex.includes("b3") || ex.includes("sao") || ex.includes("bovespa")) return "br";
  if (ex.includes("buenos aires") || ex.includes("bue") || ex.includes("bcba")) return "ar";
  if (ex.includes("santiago") || ex.includes("snse") || ex.includes("sgo")) return "cl";
  if (ex.includes("colombia") || ex.includes("bvc") || ex.includes("bogota")) return "co";
  if (ex.includes("lima") || ex.includes("bvl")) return "pe";

  // asia
  if (ex.includes("tokyo") || ex.includes("tse") || ex.includes("tyo") || ex.includes("ose") || ex.includes("fuk") || ex.includes("tok") || ex.includes("fka") || ex.includes("sap")) return "jp";
  if (ex.includes("hong kong") || ex.includes("hkse") || ex.includes("hkg")) return "hk";
  if (ex.includes("shanghai") || ex.includes("shenzhen") || ex.includes("shh") || ex.includes("shz") || ex.includes("sse") || ex.includes("szse")) return "cn";
  if (ex.includes("taiwan") || ex.includes("twse") || ex.includes("tai") || ex.includes("tpex") || ex.includes("two")) return "tw";
  if (ex.includes("korea") || ex.includes("kse") || ex.includes("kosdaq") || ex.includes("krx") || ex.includes("ksc") || ex.includes("koe")) return "kr";
  if (ex.includes("bombay") || ex.includes("nse") || ex.includes("nsi") || ex.includes("india")) return "in";
  if (ex.includes("singapore") || ex.includes("sgx") || ex.includes("ses")) return "sg";
  if (ex.includes("australia") || ex.includes("asx") || ex.includes("sydney")) return "au";
  if (ex.includes("new zealand") || ex.includes("nzx") || ex.includes("nze")) return "nz";
  if (ex.includes("jakarta") || ex.includes("jkse") || ex.includes("idx") || ex.includes("jkt")) return "id";
  if (ex.includes("kuala lumpur") || ex.includes("klse") || ex.includes("bursa") || ex.includes("kls")) return "my";
  if (ex.includes("bangkok") || ex.includes("set") || ex.includes("thailand")) return "th";
  if (ex.includes("manila") || ex.includes("pse") || ex.includes("psi")) return "ph";

  // middle east africa
  if (ex.includes("johannesburg") || ex.includes("jse") || ex.includes("jnb")) return "za";
  if (ex.includes("tel aviv") || ex.includes("tae") || ex.includes("tase") || ex.includes("tlv")) return "il";
  if (ex.includes("saudi") || ex.includes("tadawul") || ex.includes("ksa") || ex.includes("sau")) return "sa";
  if (ex.includes("dubai") || ex.includes("dfm") || ex.includes("abu dhabi") || ex.includes("adx")) return "ae";
  if (ex.includes("qatar") || ex.includes("qse") || ex.includes("doh")) return "qa";
  if (ex.includes("istanbul") || ex.includes("bist") || ex.includes("ist")) return "tr";

  return "globe";
}


// helpers


// transactions into net holdings per symbol
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

  // return positions with shares still in portfoio
  return Array.from(map.values()).filter(h => h.quantity > 0);
}

// calculate total portfolio value
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


// calculate total cost basis
export function calculateTotalCost(
  holdings: PortfolioHolding[],
  fxRates: FxRates
): number {
  return holdings.reduce((total, h) => {
    const fxRate = fxRates[h.currency] ?? 1.0;
    return total + h.totalCost * fxRate;
  }, 0);
}
