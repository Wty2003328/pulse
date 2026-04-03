use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use super::AppState;
use crate::scheduler;

/// Build the API route tree.
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/health", get(health))
        .route("/feed", get(get_feed))
        .route("/collectors", get(get_collectors))
        .route("/collectors/{id}/run", post(trigger_collector))
}

// --- Health ---

async fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "ok",
        "version": env!("CARGO_PKG_VERSION"),
    }))
}

// --- Feed ---

#[derive(Debug, Deserialize)]
struct FeedQuery {
    #[serde(default = "default_limit")]
    limit: u32,
    #[serde(default)]
    offset: u32,
    source: Option<String>,
}

fn default_limit() -> u32 {
    50
}

async fn get_feed(
    State(state): State<AppState>,
    Query(query): Query<FeedQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let items = state
        .db
        .get_feed(query.limit, query.offset, query.source.as_deref())
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(serde_json::json!({
        "items": items,
        "count": items.len(),
        "limit": query.limit,
        "offset": query.offset,
    })))
}

// --- Collectors ---

#[derive(Serialize)]
struct CollectorInfo {
    id: String,
    name: String,
    enabled: bool,
    interval_secs: u64,
}

async fn get_collectors(
    State(state): State<AppState>,
) -> Json<serde_json::Value> {
    let collectors: Vec<CollectorInfo> = state
        .collectors
        .iter()
        .map(|c| CollectorInfo {
            id: c.id().to_string(),
            name: c.name().to_string(),
            enabled: c.enabled(),
            interval_secs: c.default_interval().as_secs(),
        })
        .collect();

    let status = state.db.get_collector_status().await.unwrap_or_default();

    Json(serde_json::json!({
        "collectors": collectors,
        "recent_runs": status,
    }))
}

async fn trigger_collector(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    scheduler::trigger_collector(&state.collectors, &state.db, &id)
        .await
        .map_err(|e| (StatusCode::NOT_FOUND, e.to_string()))?;

    Ok(Json(serde_json::json!({
        "status": "triggered",
        "collector": id,
    })))
}
