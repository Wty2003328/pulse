use anyhow::Result;
use async_trait::async_trait;
use chrono::Utc;
use serde::Deserialize;
use std::collections::HashMap;
use std::time::Duration;

use super::{parse_interval, Collector};
use crate::config::types::StocksConfig;
use crate::storage::models::RawItem;

/// Uses Yahoo Finance v8 API (no key required) for stock quotes.
pub struct StocksCollector {
    config: StocksConfig,
    client: reqwest::Client,
}

#[derive(Debug, Deserialize)]
struct YahooResponse {
    #[serde(rename = "quoteResponse")]
    quote_response: YahooQuoteResponse,
}

#[derive(Debug, Deserialize)]
struct YahooQuoteResponse {
    result: Vec<YahooQuote>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct YahooQuote {
    symbol: String,
    short_name: Option<String>,
    long_name: Option<String>,
    regular_market_price: Option<f64>,
    regular_market_change: Option<f64>,
    regular_market_change_percent: Option<f64>,
    regular_market_volume: Option<u64>,
    regular_market_previous_close: Option<f64>,
    regular_market_open: Option<f64>,
    regular_market_day_high: Option<f64>,
    regular_market_day_low: Option<f64>,
    fifty_two_week_high: Option<f64>,
    fifty_two_week_low: Option<f64>,
    market_cap: Option<u64>,
    currency: Option<String>,
}

impl StocksCollector {
    pub fn new(config: StocksConfig) -> Self {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .user_agent("Pulse/0.1.0")
            .build()
            .unwrap_or_default();

        Self { config, client }
    }
}

#[async_trait]
impl Collector for StocksCollector {
    fn id(&self) -> &str {
        "stocks"
    }

    fn name(&self) -> &str {
        "Stock Prices"
    }

    fn default_interval(&self) -> Duration {
        parse_interval(&self.config.interval)
    }

    fn enabled(&self) -> bool {
        self.config.enabled
    }

    async fn collect(&self) -> Result<Vec<RawItem>> {
        if self.config.symbols.is_empty() {
            return Ok(Vec::new());
        }

        tracing::debug!("Fetching stock quotes for: {:?}", self.config.symbols);

        let symbols_param = self.config.symbols.join(",");
        let url = format!(
            "https://query1.finance.yahoo.com/v7/finance/quote?symbols={}",
            symbols_param
        );

        let response = self.client.get(&url).send().await?;

        if !response.status().is_success() {
            anyhow::bail!("Yahoo Finance API returned status {}", response.status());
        }

        let yahoo: YahooResponse = response.json().await?;
        let now = Utc::now();

        let items: Vec<RawItem> = yahoo
            .quote_response
            .result
            .into_iter()
            .map(|quote| {
                let name = quote
                    .long_name
                    .clone()
                    .or(quote.short_name.clone())
                    .unwrap_or_else(|| quote.symbol.clone());

                let price = quote.regular_market_price.unwrap_or(0.0);
                let change = quote.regular_market_change.unwrap_or(0.0);
                let change_pct = quote.regular_market_change_percent.unwrap_or(0.0);
                let direction = if change >= 0.0 { "up" } else { "down" };

                let title = format!(
                    "{} ({}) ${:.2} {:+.2} ({:+.2}%)",
                    quote.symbol, name, price, change, change_pct
                );

                let metadata = serde_json::json!({
                    "symbol": quote.symbol,
                    "name": name,
                    "price": price,
                    "change": change,
                    "change_percent": change_pct,
                    "direction": direction,
                    "volume": quote.regular_market_volume,
                    "previous_close": quote.regular_market_previous_close,
                    "open": quote.regular_market_open,
                    "day_high": quote.regular_market_day_high,
                    "day_low": quote.regular_market_day_low,
                    "52w_high": quote.fifty_two_week_high,
                    "52w_low": quote.fifty_two_week_low,
                    "market_cap": quote.market_cap,
                    "currency": quote.currency,
                });

                RawItem {
                    source: format!("stock:{}", quote.symbol),
                    collector_id: "stocks".to_string(),
                    title,
                    url: Some(format!("https://finance.yahoo.com/quote/{}", quote.symbol)),
                    content: None,
                    metadata,
                    published_at: Some(now),
                }
            })
            .collect();

        tracing::info!("Fetched {} stock quotes", items.len());
        Ok(items)
    }
}
