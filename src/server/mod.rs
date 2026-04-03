pub mod api;
pub mod ws;

use axum::{routing::get, Router};
use std::sync::Arc;
use tower_http::cors::CorsLayer;

use crate::collectors::Collector;
use crate::storage::Database;
use ws::WsBroadcast;

/// Shared application state accessible from all route handlers.
#[derive(Clone)]
pub struct AppState {
    pub db: Database,
    pub collectors: Vec<Arc<dyn Collector>>,
    pub ws_broadcast: WsBroadcast,
}

/// Build the Axum router with all routes and middleware.
pub fn build_router(state: AppState) -> Router {
    let api_routes = api::routes();

    Router::new()
        .nest("/api", api_routes)
        .route("/api/ws", get(ws::ws_handler))
        .fallback(serve_frontend)
        .layer(CorsLayer::permissive())
        .with_state(state)
}

/// Serve the embedded frontend files (SPA fallback).
async fn serve_frontend(
    uri: axum::http::Uri,
) -> impl axum::response::IntoResponse {
    let path = uri.path().trim_start_matches('/');

    if let Some(content) = FrontendAssets::get(path) {
        let mime = mime_guess::from_path(path).first_or_octet_stream();
        (
            [(axum::http::header::CONTENT_TYPE, mime.to_string())],
            content.data.to_vec(),
        )
            .into_response()
    } else if let Some(content) = FrontendAssets::get("index.html") {
        (
            [(
                axum::http::header::CONTENT_TYPE,
                "text/html".to_string(),
            )],
            content.data.to_vec(),
        )
            .into_response()
    } else {
        (
            axum::http::StatusCode::NOT_FOUND,
            "Frontend not found. Build the web frontend first.",
        )
            .into_response()
    }
}

use axum::response::IntoResponse;

#[derive(rust_embed::Embed)]
#[folder = "web/dist"]
#[allow(dead_code)]
struct FrontendAssets;
