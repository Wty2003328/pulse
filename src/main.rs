mod collectors;
mod config;
mod intelligence;
mod scheduler;
mod server;
mod storage;

use anyhow::Result;
use std::sync::Arc;
use tracing_subscriber::EnvFilter;

use collectors::Collector;
use storage::Database;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("pulse=info")),
        )
        .init();

    tracing::info!("Starting Pulse v{}", env!("CARGO_PKG_VERSION"));

    // Load configuration
    let config_path = config::find_config_path()?;
    let app_config = config::load_config(&config_path)?;

    // Initialize database
    let db = Database::new(&app_config.database.path).await?;

    // Build collectors from config
    let mut collector_list: Vec<Arc<dyn Collector>> = Vec::new();

    if let Some(ref rss_config) = app_config.collectors.rss {
        collector_list.push(Arc::new(collectors::rss::RssCollector::new(
            rss_config.clone(),
        )));
    }

    if let Some(ref hn_config) = app_config.collectors.hackernews {
        collector_list.push(Arc::new(collectors::hackernews::HackerNewsCollector::new(
            hn_config.clone(),
        )));
    }

    tracing::info!("Registered {} collectors", collector_list.len());

    // Start the scheduler (runs collectors on their intervals)
    let sched = Arc::new(scheduler::Scheduler::new(collector_list.clone(), db.clone()));
    let sched_handle = Arc::clone(&sched);
    tokio::spawn(async move {
        sched_handle.start().await;
    });

    // Build and start the web server
    let state = server::AppState {
        db,
        collectors: collector_list,
    };

    let app = server::build_router(state);

    let addr = format!("{}:{}", app_config.server.host, app_config.server.port);
    tracing::info!("Pulse dashboard available at http://{}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
