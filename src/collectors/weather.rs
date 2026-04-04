use anyhow::Result;
use async_trait::async_trait;
use chrono::Utc;
use serde::Deserialize;
use std::time::Duration;

use super::{parse_interval, Collector};
use crate::config::types::WeatherConfig;
use crate::storage::models::RawItem;

/// Uses wttr.in for weather data (no API key required).
/// Falls back to OpenWeatherMap if an API key is provided.
pub struct WeatherCollector {
    config: WeatherConfig,
    client: reqwest::Client,
}

#[derive(Debug, Deserialize)]
struct WttrResponse {
    current_condition: Vec<WttrCondition>,
    nearest_area: Option<Vec<WttrArea>>,
    weather: Option<Vec<WttrForecast>>,
}

#[derive(Debug, Deserialize)]
struct WttrCondition {
    temp_C: String,
    temp_F: String,
    #[serde(rename = "FeelsLikeC")]
    feels_like_c: String,
    #[serde(rename = "FeelsLikeF")]
    feels_like_f: String,
    humidity: String,
    #[serde(rename = "weatherDesc")]
    weather_desc: Vec<WttrValue>,
    #[serde(rename = "windspeedKmph")]
    windspeed_kmph: String,
    #[serde(rename = "winddir16Point")]
    wind_dir: String,
    visibility: String,
    #[serde(rename = "uvIndex")]
    uv_index: String,
}

#[derive(Debug, Deserialize)]
struct WttrValue {
    value: String,
}

#[derive(Debug, Deserialize)]
struct WttrArea {
    #[serde(rename = "areaName")]
    area_name: Vec<WttrValue>,
    region: Vec<WttrValue>,
    country: Vec<WttrValue>,
}

#[derive(Debug, Deserialize)]
struct WttrForecast {
    #[serde(rename = "maxtempC")]
    max_temp_c: String,
    #[serde(rename = "mintempC")]
    min_temp_c: String,
    #[serde(rename = "maxtempF")]
    max_temp_f: String,
    #[serde(rename = "mintempF")]
    min_temp_f: String,
    date: String,
    hourly: Option<Vec<WttrHourly>>,
}

#[derive(Debug, Deserialize)]
struct WttrHourly {
    #[serde(rename = "weatherDesc")]
    weather_desc: Vec<WttrValue>,
    #[serde(rename = "chanceofrain")]
    chance_of_rain: String,
}

impl WeatherCollector {
    pub fn new(config: WeatherConfig) -> Self {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(15))
            .user_agent("Pulse/0.1.0")
            .build()
            .unwrap_or_default();

        Self { config, client }
    }
}

#[async_trait]
impl Collector for WeatherCollector {
    fn id(&self) -> &str {
        "weather"
    }

    fn name(&self) -> &str {
        "Weather"
    }

    fn default_interval(&self) -> Duration {
        parse_interval(&self.config.interval)
    }

    fn enabled(&self) -> bool {
        self.config.enabled
    }

    async fn collect(&self) -> Result<Vec<RawItem>> {
        let location = self.config.location.as_deref().unwrap_or("auto");

        tracing::debug!("Fetching weather for: {}", location);

        // Use wttr.in JSON API (free, no key needed)
        let url = format!("https://wttr.in/{}?format=j1", urlencoded(location));

        let response = self.client.get(&url).send().await?;
        if !response.status().is_success() {
            anyhow::bail!("wttr.in returned status {}", response.status());
        }

        let wttr: WttrResponse = response.json().await?;
        let now = Utc::now();

        let mut items = Vec::new();

        if let Some(current) = wttr.current_condition.first() {
            let desc = current
                .weather_desc
                .first()
                .map(|v| v.value.clone())
                .unwrap_or_else(|| "Unknown".to_string());

            let area_name = wttr
                .nearest_area
                .as_ref()
                .and_then(|a| a.first())
                .and_then(|a| a.area_name.first())
                .map(|v| v.value.clone())
                .unwrap_or_else(|| location.to_string());

            let title = format!(
                "{}: {}°F ({}°C) — {}",
                area_name, current.temp_F, current.temp_C, desc
            );

            // Build forecast summary with descriptions and rain chance
            let forecast: Vec<serde_json::Value> = wttr
                .weather
                .unwrap_or_default()
                .into_iter()
                .map(|day| {
                    let desc = day
                        .hourly
                        .as_ref()
                        .and_then(|h| h.get(4)) // midday hourly
                        .and_then(|h| h.weather_desc.first())
                        .map(|v| v.value.clone())
                        .unwrap_or_default();
                    let rain = day
                        .hourly
                        .as_ref()
                        .and_then(|h| h.get(4))
                        .map(|h| h.chance_of_rain.clone())
                        .unwrap_or_default();
                    serde_json::json!({
                        "date": day.date,
                        "high_f": day.max_temp_f,
                        "low_f": day.min_temp_f,
                        "high_c": day.max_temp_c,
                        "low_c": day.min_temp_c,
                        "description": desc,
                        "rain_chance": rain,
                    })
                })
                .collect();

            let metadata = serde_json::json!({
                "location": area_name,
                "temp_f": current.temp_F.parse::<f64>().unwrap_or(0.0),
                "temp_c": current.temp_C.parse::<f64>().unwrap_or(0.0),
                "feels_like_f": current.feels_like_f.parse::<f64>().unwrap_or(0.0),
                "feels_like_c": current.feels_like_c.parse::<f64>().unwrap_or(0.0),
                "humidity": current.humidity.parse::<f64>().unwrap_or(0.0),
                "description": desc,
                "wind_speed_kmph": current.windspeed_kmph.parse::<f64>().unwrap_or(0.0),
                "wind_direction": current.wind_dir,
                "visibility": current.visibility,
                "uv_index": current.uv_index.parse::<f64>().unwrap_or(0.0),
                "forecast": forecast,
            });

            items.push(RawItem {
                source: "weather".to_string(),
                collector_id: "weather".to_string(),
                title,
                url: Some(format!("https://wttr.in/{}", urlencoded(location))),
                content: Some(format!(
                    "Feels like {}°F. Humidity: {}%. Wind: {} km/h {}. UV Index: {}.",
                    current.feels_like_f,
                    current.humidity,
                    current.windspeed_kmph,
                    current.wind_dir,
                    current.uv_index
                )),
                metadata,
                published_at: Some(now),
            });
        }

        tracing::info!("Fetched weather for {}", location);
        Ok(items)
    }
}

fn urlencoded(s: &str) -> String {
    s.replace(' ', "+")
}
