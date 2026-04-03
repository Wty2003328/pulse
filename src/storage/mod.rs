pub mod models;

use anyhow::{Context, Result};
use chrono::Utc;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};
use std::path::Path;
use std::str::FromStr;
use uuid::Uuid;

use models::{FeedItem, Item, RawItem, CollectorRun, Score, Summary, Tag};

#[derive(Clone)]
pub struct Database {
    pool: SqlitePool,
}

impl Database {
    /// Create a new database connection and run migrations.
    pub async fn new(db_path: &str) -> Result<Self> {
        // Ensure parent directory exists
        if let Some(parent) = Path::new(db_path).parent() {
            std::fs::create_dir_all(parent)
                .with_context(|| format!("Failed to create database directory: {}", parent.display()))?;
        }

        let options = SqliteConnectOptions::from_str(db_path)
            .unwrap_or_else(|_| SqliteConnectOptions::new().filename(db_path))
            .create_if_missing(true)
            .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal);

        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect_with(options)
            .await
            .with_context(|| "Failed to connect to SQLite database")?;

        let db = Self { pool };
        db.run_migrations().await?;

        tracing::info!("Database initialized at {}", db_path);
        Ok(db)
    }

    /// Run schema migrations.
    async fn run_migrations(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS items (
                id TEXT PRIMARY KEY,
                source TEXT NOT NULL,
                collector_id TEXT NOT NULL,
                title TEXT NOT NULL,
                url TEXT,
                content TEXT,
                metadata TEXT NOT NULL DEFAULT '{}',
                published_at TEXT,
                collected_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_items_collected_at ON items(collected_at);
            CREATE INDEX IF NOT EXISTS idx_items_source ON items(source);
            CREATE INDEX IF NOT EXISTS idx_items_collector ON items(collector_id);
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS scores (
                id TEXT PRIMARY KEY,
                item_id TEXT NOT NULL REFERENCES items(id),
                interest_name TEXT NOT NULL,
                score REAL NOT NULL,
                reasoning TEXT,
                model_used TEXT NOT NULL,
                scored_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_scores_item ON scores(item_id);
            CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score);
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS summaries (
                id TEXT PRIMARY KEY,
                item_id TEXT NOT NULL REFERENCES items(id),
                summary TEXT NOT NULL,
                model_used TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS tags (
                item_id TEXT NOT NULL REFERENCES items(id),
                tag TEXT NOT NULL,
                PRIMARY KEY (item_id, tag)
            );

            CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS collector_runs (
                id TEXT PRIMARY KEY,
                collector_id TEXT NOT NULL,
                started_at TEXT NOT NULL,
                finished_at TEXT,
                items_count INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'running',
                error TEXT
            );
            "#,
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Insert a raw item into the database. Returns the new item ID.
    pub async fn insert_item(&self, raw: &RawItem) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let metadata = serde_json::to_string(&raw.metadata)?;
        let published = raw.published_at.map(|d| d.to_rfc3339());

        sqlx::query(
            "INSERT INTO items (id, source, collector_id, title, url, content, metadata, published_at, collected_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&raw.source)
        .bind(&raw.collector_id)
        .bind(&raw.title)
        .bind(&raw.url)
        .bind(&raw.content)
        .bind(&metadata)
        .bind(&published)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        Ok(id)
    }

    /// Check if an item with the given URL already exists.
    pub async fn item_exists_by_url(&self, url: &str) -> Result<bool> {
        let row: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM items WHERE url = ?")
            .bind(url)
            .fetch_one(&self.pool)
            .await?;
        Ok(row.0 > 0)
    }

    /// Get feed items with optional filtering, ordered by collected_at desc.
    pub async fn get_feed(&self, limit: u32, offset: u32, source: Option<&str>) -> Result<Vec<FeedItem>> {
        let base_query = if let Some(src) = source {
            format!(
                "SELECT i.*, s.summary, sc.score FROM items i
                 LEFT JOIN summaries s ON s.item_id = i.id
                 LEFT JOIN (SELECT item_id, MAX(score) as score FROM scores GROUP BY item_id) sc ON sc.item_id = i.id
                 WHERE i.source = '{}'
                 ORDER BY i.collected_at DESC LIMIT {} OFFSET {}",
                src, limit, offset
            )
        } else {
            format!(
                "SELECT i.*, s.summary, sc.score FROM items i
                 LEFT JOIN summaries s ON s.item_id = i.id
                 LEFT JOIN (SELECT item_id, MAX(score) as score FROM scores GROUP BY item_id) sc ON sc.item_id = i.id
                 ORDER BY i.collected_at DESC LIMIT {} OFFSET {}",
                limit, offset
            )
        };

        let rows = sqlx::query_as::<_, (
            String, String, String, String, Option<String>, Option<String>,
            String, Option<String>, String, Option<String>, Option<f64>,
        )>(&base_query)
            .fetch_all(&self.pool)
            .await?;

        let mut items = Vec::new();
        for row in rows {
            let tags = self.get_tags(&row.0).await.unwrap_or_default();
            items.push(FeedItem {
                id: row.0,
                source: row.1,
                collector_id: row.2,
                title: row.3,
                url: row.4,
                content: row.5,
                summary: row.9,
                metadata: serde_json::from_str(&row.6).unwrap_or_default(),
                tags,
                score: row.10,
                published_at: row.7.and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok().map(|d| d.with_timezone(&Utc))),
                collected_at: chrono::DateTime::parse_from_rfc3339(&row.8)
                    .map(|d| d.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
            });
        }

        Ok(items)
    }

    /// Get tags for an item.
    async fn get_tags(&self, item_id: &str) -> Result<Vec<String>> {
        let rows: Vec<(String,)> = sqlx::query_as("SELECT tag FROM tags WHERE item_id = ?")
            .bind(item_id)
            .fetch_all(&self.pool)
            .await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    /// Record a collector run start.
    pub async fn start_collector_run(&self, collector_id: &str) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        sqlx::query(
            "INSERT INTO collector_runs (id, collector_id, started_at, status) VALUES (?, ?, ?, 'running')"
        )
        .bind(&id)
        .bind(collector_id)
        .bind(&now)
        .execute(&self.pool)
        .await?;
        Ok(id)
    }

    /// Record a collector run completion.
    pub async fn finish_collector_run(&self, run_id: &str, items_count: u32, error: Option<&str>) -> Result<()> {
        let now = Utc::now().to_rfc3339();
        let status = if error.is_some() { "error" } else { "success" };
        sqlx::query(
            "UPDATE collector_runs SET finished_at = ?, items_count = ?, status = ?, error = ? WHERE id = ?"
        )
        .bind(&now)
        .bind(items_count as i64)
        .bind(status)
        .bind(error)
        .bind(run_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Get latest collector runs for status display.
    pub async fn get_collector_status(&self) -> Result<Vec<CollectorRun>> {
        let rows = sqlx::query_as::<_, (String, String, String, Option<String>, i64, String, Option<String>)>(
            "SELECT id, collector_id, started_at, finished_at, items_count, status, error
             FROM collector_runs
             WHERE id IN (SELECT id FROM collector_runs GROUP BY collector_id ORDER BY started_at DESC)
             ORDER BY started_at DESC"
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|r| CollectorRun {
            id: r.0,
            collector_id: r.1,
            started_at: chrono::DateTime::parse_from_rfc3339(&r.2)
                .map(|d| d.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
            finished_at: r.3.and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok().map(|d| d.with_timezone(&Utc))),
            items_count: r.4 as u32,
            status: r.5,
            error: r.6,
        }).collect())
    }

    /// Get top items sorted by AI score (for the digest endpoint).
    pub async fn get_digest(&self, limit: u32) -> Result<Vec<FeedItem>> {
        let query = format!(
            "SELECT i.*, s.summary, sc.score FROM items i
             LEFT JOIN summaries s ON s.item_id = i.id
             INNER JOIN (SELECT item_id, MAX(score) as score FROM scores GROUP BY item_id) sc ON sc.item_id = i.id
             ORDER BY sc.score DESC LIMIT {}",
            limit
        );

        let rows = sqlx::query_as::<_, (
            String, String, String, String, Option<String>, Option<String>,
            String, Option<String>, String, Option<String>, Option<f64>,
        )>(&query)
            .fetch_all(&self.pool)
            .await?;

        let mut items = Vec::new();
        for row in rows {
            let tags = self.get_tags(&row.0).await.unwrap_or_default();
            items.push(FeedItem {
                id: row.0,
                source: row.1,
                collector_id: row.2,
                title: row.3,
                url: row.4,
                content: row.5,
                summary: row.9,
                metadata: serde_json::from_str(&row.6).unwrap_or_default(),
                tags,
                score: row.10,
                published_at: row.7.and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok().map(|d| d.with_timezone(&Utc))),
                collected_at: chrono::DateTime::parse_from_rfc3339(&row.8)
                    .map(|d| d.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
            });
        }

        Ok(items)
    }

    /// Prune items older than the given number of days.
    pub async fn prune_old_items(&self, retention_days: u32) -> Result<u64> {
        let cutoff = (Utc::now() - chrono::Duration::days(retention_days as i64)).to_rfc3339();
        let result = sqlx::query("DELETE FROM items WHERE collected_at < ?")
            .bind(&cutoff)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected())
    }

    /// Insert a relevance score for an item.
    pub async fn insert_score(&self, score: &Score) -> Result<()> {
        let now = Utc::now().to_rfc3339();
        sqlx::query(
            "INSERT INTO scores (id, item_id, interest_name, score, reasoning, model_used, scored_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&score.id)
        .bind(&score.item_id)
        .bind(&score.interest_name)
        .bind(score.score)
        .bind(&score.reasoning)
        .bind(&score.model_used)
        .bind(&now)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Insert a summary for an item.
    pub async fn insert_summary(&self, summary: &Summary) -> Result<()> {
        let now = Utc::now().to_rfc3339();
        sqlx::query(
            "INSERT INTO summaries (id, item_id, summary, model_used, created_at)
             VALUES (?, ?, ?, ?, ?)"
        )
        .bind(&summary.id)
        .bind(&summary.item_id)
        .bind(&summary.summary)
        .bind(&summary.model_used)
        .bind(&now)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Insert a tag for an item.
    pub async fn insert_tag(&self, tag: &Tag) -> Result<()> {
        sqlx::query(
            "INSERT OR IGNORE INTO tags (item_id, tag) VALUES (?, ?)"
        )
        .bind(&tag.item_id)
        .bind(&tag.tag)
        .execute(&self.pool)
        .await?;
        Ok(())
    }
}
