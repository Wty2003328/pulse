pub mod api;

use axum::Router;
use std::sync::Arc;
use tower_http::cors::CorsLayer;

use crate::collectors::Collector;
use crate::storage::Database;

/// Shared application state accessible from all route handlers.
#[derive(Clone)]
pub struct AppState {
    pub db: Database,
    pub collectors: Vec<Arc<dyn Collector>>,
}

/// Build the Axum router with all routes and middleware.
pub fn build_router(state: AppState) -> Router {
    let api_routes = api::routes();

    Router::new()
        .nest("/api", api_routes)
        .fallback(serve_frontend)
        .layer(CorsLayer::permissive())
        .with_state(state)
}

/// Serve the embedded frontend files (SPA fallback).
async fn serve_frontend(
    uri: axum::http::Uri,
) -> impl axum::response::IntoResponse {
    // Try to find the requested file in embedded assets
    let path = uri.path().trim_start_matches('/');

    // For SPA routing: if the path doesn't look like a file, serve index.html
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

/// Embedded frontend assets (built React app).
/// In development, this folder may be empty — that's fine.
#[derive(rust_embed::Embed)]
#[folder = "web/dist"]
#[allow(dead_code)]
struct FrontendAssets;
