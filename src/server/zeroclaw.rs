use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    routing::{get, put},
    Router,
};
use serde::Deserialize;
use std::time::Duration;

use super::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/status", get(check_status))
        .route("/config", get(get_config).put(save_config))
}

async fn check_status(State(state): State<AppState>) -> Json<serde_json::Value> {
    let url = state
        .db
        .get_setting("zeroclaw_url")
        .await
        .ok()
        .flatten()
        .unwrap_or_default();

    if url.is_empty() {
        return Json(serde_json::json!({
            "configured": false,
            "reachable": false,
            "url": "",
        }));
    }

    let health_url = format!("{}/api/status", url.trim_end_matches('/'));

    let reachable = reqwest::Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
        .ok()
        .map(|c| c.get(&health_url))
        .is_some();

    // Try actual request
    let reachable = if reachable {
        match reqwest::Client::builder()
            .timeout(Duration::from_secs(3))
            .build()
        {
            Ok(client) => client.get(&health_url).send().await.is_ok(),
            Err(_) => false,
        }
    } else {
        false
    };

    Json(serde_json::json!({
        "configured": true,
        "reachable": reachable,
        "url": url,
    }))
}

async fn get_config(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let url = state
        .db
        .get_setting("zeroclaw_url")
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .unwrap_or_default();

    let token = state
        .db
        .get_setting("zeroclaw_token")
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .unwrap_or_default();

    Ok(Json(serde_json::json!({
        "url": url,
        "token": token,
    })))
}

#[derive(Deserialize)]
struct SaveConfigRequest {
    url: Option<String>,
    token: Option<String>,
}

async fn save_config(
    State(state): State<AppState>,
    Json(body): Json<SaveConfigRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if let Some(url) = body.url {
        state
            .db
            .set_setting("zeroclaw_url", &url)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }
    if let Some(token) = body.token {
        state
            .db
            .set_setting("zeroclaw_token", &token)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    Ok(Json(serde_json::json!({ "status": "saved" })))
}
