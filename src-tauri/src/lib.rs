use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;
use tauri_plugin_sql::{Migration, MigrationKind};

// ── yahoo finance auth state ───────────────────────────────────────────

struct YahooAuth {
    crumb: Mutex<Option<String>>,
    cookie: Mutex<Option<String>>,
}

// ── yahoo finance response types ───────────────────────────────────────

#[derive(Debug, Deserialize)]
struct YahooChartResponse {
    chart: YahooChartResult,
}

#[derive(Debug, Deserialize)]
struct YahooChartResult {
    result: Option<Vec<YahooChartData>>,
}

#[derive(Debug, Deserialize)]
struct YahooChartData {
    events: Option<YahooChartEvents>,
    timestamp: Option<Vec<i64>>,
    indicators: Option<YahooChartIndicators>,
}

#[derive(Debug, Deserialize)]
struct YahooChartIndicators {
    quote: Option<Vec<YahooChartQuote>>,
}

#[derive(Debug, Deserialize)]
struct YahooChartQuote {
    close: Option<Vec<Option<f64>>>,
}

#[derive(Debug, Deserialize)]
struct YahooChartEvents {
    dividends: Option<HashMap<String, YahooDividendData>>,
}

#[derive(Debug, Deserialize)]
struct YahooDividendData {
    amount: f64,
    date: i64,
}

#[derive(Debug, Deserialize)]
struct YahooQuoteResponse {
    #[serde(rename = "quoteResponse")]
    quote_response: YahooQuoteResult,
}

#[derive(Debug, Deserialize)]
struct YahooQuoteResult {
    result: Vec<YahooQuote>,
}

#[derive(Debug, Deserialize)]
struct YahooQuote {
    symbol: String,
    #[serde(rename = "regularMarketPrice", default)]
    regular_market_price: Option<f64>,
    #[serde(rename = "regularMarketChangePercent", default)]
    regular_market_change_percent: Option<f64>,
    #[serde(default)]
    currency: Option<String>,
    #[serde(rename = "shortName", default)]
    short_name: Option<String>,
    #[serde(rename = "dividendRate", default)]
    dividend_rate: Option<f64>,
    #[serde(rename = "trailingAnnualDividendRate", default)]
    trailing_annual_dividend_rate: Option<f64>,
}

// ── public return types ────────────────────────────────────────────────

#[derive(Debug, Serialize, Clone)]
pub struct DividendEvent {
    pub symbol: String,
    pub amount: f64,
    pub date: i64,
}

#[derive(Debug, Serialize, Clone)]
pub struct MarketQuote {
    pub symbol: String,
    pub price: f64,
    pub change_percent: f64,
    pub currency: String,
    pub name: Option<String>,
    pub dividend_rate: Option<f64>,
}

#[derive(Debug, Serialize, Clone)]
pub struct HistoricalPrice {
    pub timestamp: i64,
    pub close: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SymbolSearchResult {
    pub symbol: String,
    pub shortname: Option<String>,
    pub exchange: Option<String>,
    #[serde(rename = "quoteType")]
    pub quote_type: Option<String>,
}

#[derive(Debug, Deserialize)]
struct YahooSearchResponse {
    quotes: Vec<SymbolSearchResult>,
}

/// combined response for a single-batch boot/refresh call.
/// contains market quotes for user tickers and fx rates in one yahoo request.
#[derive(Debug, Serialize, Clone)]
pub struct CombinedData {
    pub market_quotes: Vec<MarketQuote>,
    pub fx_rates: HashMap<String, f64>,
}

// ── cookie + crumb helpers ─────────────────────────────────────────────

async fn fetch_crumb_and_cookie() -> Result<(String, String), String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // step 1: hit the consent/finance page to get cookies
    let resp = client
        .get("https://fc.yahoo.com/")
        .send()
        .await
        .map_err(|e| format!("Cookie request failed: {}", e))?;

    // collect set-cookie headers
    let cookies: Vec<String> = resp
        .headers()
        .get_all("set-cookie")
        .iter()
        .filter_map(|v| v.to_str().ok())
        .map(|v| v.split(';').next().unwrap_or("").to_string())
        .filter(|c| !c.is_empty())
        .collect();

    let cookie_header = cookies.join("; ");

    // step 2: fetch the crumb using the cookies
    let crumb_resp = client
        .get("https://query2.finance.yahoo.com/v1/test/getcrumb")
        .header("cookie", &cookie_header)
        .send()
        .await
        .map_err(|e| format!("Crumb request failed: {}", e))?;

    if !crumb_resp.status().is_success() {
        return Err(format!(
            "Crumb endpoint returned status {}",
            crumb_resp.status()
        ));
    }

    let crumb = crumb_resp
        .text()
        .await
        .map_err(|e| format!("Failed to read crumb: {}", e))?;

    if crumb.is_empty() || crumb.contains("<!DOCTYPE") {
        return Err("Received invalid crumb (HTML instead of token)".to_string());
    }

    Ok((crumb, cookie_header))
}

/// shared helper to ensure we have valid auth, refreshing if needed
async fn ensure_auth(auth: &State<'_, YahooAuth>) -> Result<(String, String), String> {
    let cached_crumb = auth.crumb.lock().unwrap().clone();
    let cached_cookie = auth.cookie.lock().unwrap().clone();

    match (cached_crumb, cached_cookie) {
        (Some(c), Some(k)) => Ok((c, k)),
        _ => {
            let (new_crumb, new_cookie) = fetch_crumb_and_cookie().await?;
            *auth.crumb.lock().unwrap() = Some(new_crumb.clone());
            *auth.cookie.lock().unwrap() = Some(new_cookie.clone());
            Ok((new_crumb, new_cookie))
        }
    }
}

/// Refresh auth credentials
async fn refresh_auth(auth: &State<'_, YahooAuth>) -> Result<(String, String), String> {
    let (new_crumb, new_cookie) = fetch_crumb_and_cookie().await?;
    *auth.crumb.lock().unwrap() = Some(new_crumb.clone());
    *auth.cookie.lock().unwrap() = Some(new_cookie.clone());
    Ok((new_crumb, new_cookie))
}

// ── tauri commands ─────────────────────────────────────────────────────

#[tauri::command]
async fn get_market_data(
    symbols: Vec<String>,
    auth: State<'_, YahooAuth>,
) -> Result<Vec<MarketQuote>, String> {
    if symbols.is_empty() {
        return Ok(vec![]);
    }

    let (crumb, cookie) = ensure_auth(&auth).await?;
    let result = fetch_quotes(&symbols, &crumb, &cookie).await;

    match result {
        Ok(quotes) => Ok(quotes),
        Err(_) => {
            let (new_crumb, new_cookie) = refresh_auth(&auth).await?;
            fetch_quotes(&symbols, &new_crumb, &new_cookie).await
        }
    }
}

/// Single-batch command: fetches user ticker symbols AND FX pairs in one HTTP
/// request, returns them pre-split so the frontend needs exactly one Yahoo call.
#[tauri::command]
async fn get_combined_data(
    symbols: Vec<String>,
    base_currency: String,
    auth: State<'_, YahooAuth>,
) -> Result<CombinedData, String> {
    let supported_currencies = ["USD", "EUR", "GBP", "PLN"];
    let mut fx_symbols = Vec::new();
    for curr in &supported_currencies {
        if *curr != base_currency {
            fx_symbols.push(format!("{}{}=X", curr, base_currency));
        }
    }

    // build the full batch: user tickers + fx pairs (deduped)
    let mut all_symbols: Vec<String> = symbols.clone();
    for fx in &fx_symbols {
        let s = fx.to_string();
        if !all_symbols.contains(&s) {
            all_symbols.push(s);
        }
    }

    let (crumb, cookie) = ensure_auth(&auth).await?;
    let result = fetch_quotes(&all_symbols, &crumb, &cookie).await;

    let all_quotes = match result {
        Ok(q) => q,
        Err(_) => {
            let (new_crumb, new_cookie) = refresh_auth(&auth).await?;
            fetch_quotes(&all_symbols, &new_crumb, &new_cookie).await?
        }
    };

    // split into market quotes vs fx quotes
    let mut market_quotes: Vec<MarketQuote> = Vec::new();
    let mut fx_quotes: Vec<MarketQuote> = Vec::new();
    let suffix = format!("{}={}", base_currency, "X");

    for q in all_quotes {
        if q.symbol.ends_with(&suffix) {
            fx_quotes.push(q);
        } else {
            market_quotes.push(q);
        }
    }

    let fx_rates = parse_fx_rates(fx_quotes, &base_currency);

    Ok(CombinedData {
        market_quotes,
        fx_rates,
    })
}

async fn fetch_quotes(
    symbols: &[String],
    crumb: &str,
    cookie: &str,
) -> Result<Vec<MarketQuote>, String> {
    let joined = symbols.join(",");
    let url = format!(
        "https://query1.finance.yahoo.com/v7/finance/quote?symbols={}&crumb={}",
        joined, crumb
    );

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get(&url)
        .header("cookie", cookie)
        .send()
        .await
        .map_err(|e| format!("Network request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Yahoo API returned status {}", response.status()));
    }

    let data: YahooQuoteResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse API response: {}", e))?;

    let quotes: Vec<MarketQuote> = data
        .quote_response
        .result
        .into_iter()
        .map(|q| MarketQuote {
            symbol: q.symbol,
            price: q.regular_market_price.unwrap_or(0.0),
            change_percent: q.regular_market_change_percent.unwrap_or(0.0),
            currency: q.currency.unwrap_or_else(|| "USD".to_string()),
            name: q.short_name,
            dividend_rate: q.dividend_rate.or(q.trailing_annual_dividend_rate).or(Some(0.0)),
        })
        .collect();

    Ok(quotes)
}

#[tauri::command]
async fn get_dividend_history(
    symbols: Vec<String>,
    auth: State<'_, YahooAuth>,
) -> Result<Vec<DividendEvent>, String> {
    let mut unique_symbols = symbols.clone();
    unique_symbols.sort();
    unique_symbols.dedup();

    let (mut crumb, mut cookie) = ensure_auth(&auth).await?;
    let mut all_dividends = Vec::new();

    for symbol in unique_symbols {
        if symbol.contains("=X") {
            continue;
        }

        let mut result = fetch_dividends(&symbol, &crumb, &cookie).await;

        if result.is_err() {
            if let Ok((new_crumb, new_cookie)) = refresh_auth(&auth).await {
                crumb = new_crumb;
                cookie = new_cookie;
                result = fetch_dividends(&symbol, &crumb, &cookie).await;
            }
        }

        if let Ok(divs) = result {
            all_dividends.extend(divs);
        }
    }

    Ok(all_dividends)
}

async fn fetch_dividends(
    symbol: &str,
    crumb: &str,
    cookie: &str,
) -> Result<Vec<DividendEvent>, String> {
    let url = format!(
        "https://query2.finance.yahoo.com/v8/finance/chart/{}?interval=1d&range=5y&events=div&crumb={}",
        symbol, crumb
    );

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get(&url)
        .header("cookie", cookie)
        .send()
        .await
        .map_err(|e| format!("Network request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Yahoo API returned status {}", response.status()));
    }

    let data: YahooChartResponse = match response.json().await {
        Ok(d) => d,
        Err(_) => return Ok(vec![]),
    };

    let mut dividends = Vec::new();
    if let Some(results) = data.chart.result {
        if let Some(first_result) = results.first() {
            if let Some(events) = &first_result.events {
                if let Some(divs) = &events.dividends {
                    for div in divs.values() {
                        dividends.push(DividendEvent {
                            symbol: symbol.to_string(),
                            amount: div.amount,
                            date: div.date,
                        });
                    }
                }
            }
        }
    }

    dividends.sort_by_key(|d| d.date);
    Ok(dividends)
}

#[tauri::command]
async fn get_historical_prices(
    symbols: Vec<String>,
    auth: State<'_, YahooAuth>,
) -> Result<HashMap<String, Vec<HistoricalPrice>>, String> {
    let mut unique_symbols = symbols.clone();
    unique_symbols.sort();
    unique_symbols.dedup();

    let (mut crumb, mut cookie) = ensure_auth(&auth).await?;
    let mut results = HashMap::new();

    for symbol in unique_symbols {
        if symbol.contains("=X") {
            continue;
        }

        let mut result = fetch_historical_prices(&symbol, &crumb, &cookie).await;

        if result.is_err() {
            if let Ok((new_crumb, new_cookie)) = refresh_auth(&auth).await {
                crumb = new_crumb;
                cookie = new_cookie;
                result = fetch_historical_prices(&symbol, &crumb, &cookie).await;
            }
        }

        if let Ok(prices) = result {
            if !prices.is_empty() {
                results.insert(symbol.clone(), prices);
            }
        }
    }

    Ok(results)
}

async fn fetch_historical_prices(
    symbol: &str,
    crumb: &str,
    cookie: &str,
) -> Result<Vec<HistoricalPrice>, String> {
    let url = format!(
        "https://query2.finance.yahoo.com/v8/finance/chart/{}?interval=1d&range=5y&crumb={}",
        symbol, crumb
    );

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get(&url)
        .header("cookie", cookie)
        .send()
        .await
        .map_err(|e| format!("Network request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Yahoo API returned status {}", response.status()));
    }

    let data: YahooChartResponse = match response.json().await {
        Ok(d) => d,
        Err(_) => return Ok(vec![]),
    };

    let mut prices = Vec::new();
    if let Some(results) = data.chart.result {
        if let Some(first_result) = results.first() {
            if let (Some(timestamps), Some(indicators)) = (&first_result.timestamp, &first_result.indicators) {
                if let Some(quotes) = &indicators.quote {
                    if let Some(first_quote) = quotes.first() {
                        if let Some(closes) = &first_quote.close {
                            for (i, t) in timestamps.iter().enumerate() {
                                if let Some(Some(close)) = closes.get(i) {
                                    prices.push(HistoricalPrice {
                                        timestamp: *t,
                                        close: *close,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(prices)
}

#[tauri::command]
async fn search_symbols(query: String) -> Result<Vec<SymbolSearchResult>, String> {
    if query.trim().is_empty() {
        return Ok(vec![]);
    }

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get("https://query2.finance.yahoo.com/v1/finance/search")
        .query(&[
            ("q", query.as_str()),
            ("quotesCount", "6"),
            ("newsCount", "0"),
        ])
        .send()
        .await
        .map_err(|e| format!("Network request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Yahoo API returned status {}", response.status()));
    }

    let data: YahooSearchResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse API response: {}", e))?;

    Ok(data.quotes)
}

/// Extract FX rates (relative to base_currency) from a slice of quotes for FX pair symbols.
fn parse_fx_rates(quotes: Vec<MarketQuote>, base_currency: &str) -> HashMap<String, f64> {
    let mut rates: HashMap<String, f64> = HashMap::new();
    rates.insert(base_currency.to_string(), 1.0);
    let suffix = format!("{}={}", base_currency, "X");
    
    for q in quotes {
        // Symbol is like "USDEUR=X" → currency code is "USD"
        let currency = q.symbol.replace(&suffix, "");
        if !currency.is_empty() && q.price > 0.0 {
            rates.insert(currency, q.price);
        }
    }
    rates
}

// ── App entry ──────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_transactions_table",
            sql: "CREATE TABLE transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT NOT NULL,
                side TEXT NOT NULL,
                quantity REAL NOT NULL,
                price REAL NOT NULL,
                commission REAL DEFAULT 0,
                date TEXT NOT NULL
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_currency_column",
            sql: "ALTER TABLE transactions ADD COLUMN currency TEXT NOT NULL DEFAULT 'PLN';",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .manage(YahooAuth {
            crumb: Mutex::new(None),
            cookie: Mutex::new(None),
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:portfolio.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![get_market_data, get_combined_data, search_symbols, get_dividend_history, get_historical_prices])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
