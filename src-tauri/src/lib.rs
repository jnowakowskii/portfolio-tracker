use std::collections::HashMap;
use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use tauri::State;
use tauri_plugin_sql::{Migration, MigrationKind};

// ── Yahoo Finance auth state ───────────────────────────────────────────

struct YahooAuth {
    crumb: Mutex<Option<String>>,
    cookie: Mutex<Option<String>>,
}

// ── Yahoo Finance response types ───────────────────────────────────────

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
}

// ── Public return types ────────────────────────────────────────────────

#[derive(Debug, Serialize, Clone)]
pub struct MarketQuote {
    pub symbol: String,
    pub price: f64,
    pub change_percent: f64,
    pub currency: String,
    pub name: Option<String>,
}

/// Combined response for a single-batch boot/refresh call.
/// Contains market quotes for user tickers and FX rates in one Yahoo request.
#[derive(Debug, Serialize, Clone)]
pub struct CombinedData {
    pub market_quotes: Vec<MarketQuote>,
    pub fx_rates: HashMap<String, f64>,
}

// ── Cookie + Crumb helpers ─────────────────────────────────────────────

async fn fetch_crumb_and_cookie() -> Result<(String, String), String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // Step 1: Hit the consent/finance page to get cookies
    let resp = client
        .get("https://fc.yahoo.com/")
        .send()
        .await
        .map_err(|e| format!("Cookie request failed: {}", e))?;

    // Collect Set-Cookie headers
    let cookies: Vec<String> = resp
        .headers()
        .get_all("set-cookie")
        .iter()
        .filter_map(|v| v.to_str().ok())
        .map(|v| {
            v.split(';').next().unwrap_or("").to_string()
        })
        .filter(|c| !c.is_empty())
        .collect();

    let cookie_header = cookies.join("; ");

    // Step 2: Fetch the crumb using the cookies
    let crumb_resp = client
        .get("https://query2.finance.yahoo.com/v1/test/getcrumb")
        .header("cookie", &cookie_header)
        .send()
        .await
        .map_err(|e| format!("Crumb request failed: {}", e))?;

    if !crumb_resp.status().is_success() {
        return Err(format!("Crumb endpoint returned status {}", crumb_resp.status()));
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

/// Shared helper to ensure we have valid auth, refreshing if needed
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

// ── Tauri commands ─────────────────────────────────────────────────────

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

#[tauri::command]
async fn get_fx_rates(
    auth: State<'_, YahooAuth>,
) -> Result<HashMap<String, f64>, String> {
    // Fetch FX pairs relative to PLN
    let fx_symbols = vec![
        "USDPLN=X".to_string(),
        "EURPLN=X".to_string(),
        "GBPPLN=X".to_string(),
    ];

    let (crumb, cookie) = ensure_auth(&auth).await?;
    let result = fetch_quotes(&fx_symbols, &crumb, &cookie).await;

    let quotes = match result {
        Ok(q) => q,
        Err(_) => {
            let (new_crumb, new_cookie) = refresh_auth(&auth).await?;
            fetch_quotes(&fx_symbols, &new_crumb, &new_cookie).await?
        }
    };

    Ok(parse_fx_rates(quotes))
}

/// Single-batch command: fetches user ticker symbols AND FX pairs in one HTTP
/// request, returns them pre-split so the frontend needs exactly one Yahoo call.
#[tauri::command]
async fn get_combined_data(
    symbols: Vec<String>,
    auth: State<'_, YahooAuth>,
) -> Result<CombinedData, String> {
    let fx_symbols = ["USDPLN=X", "EURPLN=X", "GBPPLN=X"];

    // Build the full batch: user tickers + FX pairs (deduped)
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

    // Split into market quotes vs FX quotes
    let mut market_quotes: Vec<MarketQuote> = Vec::new();
    let mut fx_quotes: Vec<MarketQuote> = Vec::new();

    for q in all_quotes {
        if q.symbol.ends_with("PLN=X") {
            fx_quotes.push(q);
        } else {
            market_quotes.push(q);
        }
    }

    let fx_rates = parse_fx_rates(fx_quotes);

    Ok(CombinedData { market_quotes, fx_rates })
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
        })
        .collect();

    Ok(quotes)
}

/// Extract FX rates (relative to PLN) from a slice of quotes for FX pair symbols.
fn parse_fx_rates(quotes: Vec<MarketQuote>) -> HashMap<String, f64> {
    let mut rates: HashMap<String, f64> = HashMap::new();
    rates.insert("PLN".to_string(), 1.0);
    for q in quotes {
        // Symbol is like "USDPLN=X" → currency code is "USD"
        let currency = q.symbol.replace("PLN=X", "");
        if !currency.is_empty() && q.price > 0.0 {
            rates.insert(currency, q.price);
        }
    }
    rates
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
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
        .plugin(tauri_plugin_sql::Builder::default().add_migrations("sqlite:portfolio.db", migrations).build())
        .invoke_handler(tauri::generate_handler![greet, get_market_data, get_fx_rates, get_combined_data])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
