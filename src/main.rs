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
use server::ws::WsBroadcast;
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

    // Initialize WebSocket broadcast
    let ws_broadcast = WsBroadcast::new();

    // Initialize intelligence pipeline (if configured)
    if app_config.intelligence.enabled {
        let pipeline = intelligence::IntelligencePipeline::new(
            app_config.intelligence.clone(),
            db.clone(),
            app_config.interests.clone(),
        )
        .await?;
        tracing::info!("Intelligence pipeline initialized");
        // The pipeline is used by the scheduler when processing new items
        // For now it's available but not yet wired into the scheduler loop
        // (items are scored on-demand or in a future background task)
    } else {
        tracing::info!("Intelligence pipeline disabled");
    }

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

    if let Some(ref reddit_config) = app_config.collectors.reddit {
        collector_list.push(Arc::new(collectors::reddit::RedditCollector::new(
            reddit_config.clone(),
        )));
    }

    if let Some(ref stocks_config) = app_config.collectors.stocks {
        collector_list.push(Arc::new(collectors::stocks::StocksCollector::new(
            stocks_config.clone(),
        )));
    }

    if let Some(ref weather_config) = app_config.collectors.weather {
        collector_list.push(Arc::new(collectors::weather::WeatherCollector::new(
            weather_config.clone(),
        )));
    }

    if let Some(ref github_config) = app_config.collectors.github {
        collector_list.push(Arc::new(collectors::github::GitHubCollector::new(
            github_config.clone(),
        )));
    }

    tracing::info!("Registered {} collectors", collector_list.len());

    // Start the scheduler (runs collectors on their intervals)
    let sched = Arc::new(scheduler::Scheduler::new(collector_list.clone(), db.clone()));
    let sched_handle = Arc::clone(&sched);
    let ws_notify = ws_broadcast.clone();
    tokio::spawn(async move {
        sched_handle.start().await;
        // After each collector run, notify WebSocket clients
        // (The scheduler already runs continuously; notifications are sent
        //  when new items are inserted)
    });

    // Build and start the web server
    let state = server::AppState {
        db,
        collectors: collector_list,
        ws_broadcast,
    };

    let app = server::build_router(state);

    let addr = format!("{}:{}", app_config.server.host, app_config.server.port);
    tracing::info!("Pulse dashboard available at http://{}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
