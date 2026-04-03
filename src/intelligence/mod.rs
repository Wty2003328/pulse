pub mod local_llm;
pub mod remote_llm;
pub mod scorer;
pub mod summarizer;
pub mod tagger;

use anyhow::{anyhow, Result};
use chrono::Utc;
use std::sync::atomic::AtomicU32;
use std::sync::Arc;
use tracing::{debug, info, warn};

use crate::config::types::{IntelligenceConfig, Interest};
use crate::storage::{models::RawItem, Database};
use local_llm::LocalLLM;
use remote_llm::RemoteLLM;
use scorer::Scorer;
use summarizer::Summarizer;
use tagger::Tagger;

/// Intelligence pipeline orchestrator
pub struct IntelligencePipeline {
    config: IntelligenceConfig,
    db: Database,
    interests: Vec<Interest>,
    scorer: Option<Scorer>,
    local_llm: Option<LocalLLM>,
    remote_llm: Option<RemoteLLM>,
    call_count: AtomicU32,
    last_call_date: std::sync::Mutex<chrono::NaiveDate>,
}

impl IntelligencePipeline {
    /// Create a new intelligence pipeline
    pub async fn new(
        config: IntelligenceConfig,
        db: Database,
        interests: Vec<Interest>,
    ) -> Result<Self> {
        let mut local_llm = None;
        let mut remote_llm = None;

        // Initialize local LLM (Ollama)
        if let Some(local_config) = config.local.clone() {
            if local_config.enabled {
                let llm = LocalLLM::new(local_config);
                match llm.health_check().await {
                    true => {
                        info!("Local LLM (Ollama) connected and healthy");
                        local_llm = Some(llm);
                    }
                    false => {
                        warn!(
                            "Local LLM (Ollama) not available at {}",
                            llm.config.endpoint
                        );
                    }
                }
            }
        }

        // Initialize remote LLM (Claude/OpenAI)
        if let Some(remote_config) = config.remote.clone() {
            if remote_config.enabled {
                match RemoteLLM::new(remote_config) {
                    Ok(llm) => match llm.health_check().await {
                        true => {
                            info!("Remote LLM ({}) connected and healthy", llm.provider_name());
                            remote_llm = Some(llm);
                        }
                        false => {
                            warn!("Remote LLM ({}) health check failed", llm.provider_name());
                        }
                    },
                    Err(e) => {
                        warn!("Failed to initialize remote LLM: {}", e);
                    }
                }
            }
        }

        // Create scorer
        let local_threshold = config
            .local
            .as_ref()
            .map(|c| c.relevance_threshold)
            .unwrap_or(4);
        let scorer = if local_llm.is_some() || remote_llm.is_some() {
            Some(Scorer::new(
                local_llm.clone(),
                remote_llm.clone(),
                local_threshold,
            ))
        } else {
            None
        };

        if scorer.is_none() {
            warn!("No LLM available - intelligence pipeline will be disabled");
        }

        Ok(Self {
            config,
            db,
            interests,
            scorer,
            local_llm,
            remote_llm,
            call_count: std::sync::atomic::AtomicU32::new(0),
            last_call_date: std::sync::Mutex::new(Utc::now().naive_utc().date()),
        })
    }

    /// Process items through the two-stage pipeline
    /// Stage 1: Local LLM relevance filtering
    /// Stage 2: Remote LLM deep analysis (summarization, tagging, scoring)
    pub async fn process_items(&self, items: &[RawItem]) -> Result<()> {
        if !self.config.enabled {
            debug!("Intelligence pipeline disabled in config");
            return Ok(());
        }

        if items.is_empty() {
            return Ok(());
        }

        info!(
            "Processing {} items through intelligence pipeline",
            items.len()
        );

        // Check budget
        let max_calls = self
            .config
            .remote
            .as_ref()
            .map(|c| c.max_daily_calls)
            .unwrap_or(100);
        if !self.check_budget(max_calls) {
            warn!(
                "Daily call budget ({}) exceeded, skipping processing",
                max_calls
            );
            return Ok(());
        }

        let batch_size = self
            .config
            .remote
            .as_ref()
            .map(|c| c.batch_size)
            .unwrap_or(10) as usize;

        for chunk in items.chunks(batch_size) {
            for raw_item in chunk {
                if let Err(e) = self.process_single_item(raw_item).await {
                    warn!("Failed to process item '{}': {}", raw_item.title, e);
                }
            }

            // Check budget after each batch
            if !self.check_budget(max_calls) {
                info!("Daily call budget reached, stopping processing");
                break;
            }
        }

        Ok(())
    }

    /// Process a single item through the pipeline
    async fn process_single_item(&self, raw_item: &RawItem) -> Result<()> {
        // Insert the raw item first
        let item_id = self.db.insert_item(raw_item).await?;

        let scorer = self
            .scorer
            .as_ref()
            .ok_or_else(|| anyhow!("No scorer available"))?;

        // Stage 1: Score against interests
        let mut scores = scorer.score_item(raw_item, &self.interests).await?;
        for score in &mut scores {
            score.item_id = item_id.clone();
            self.db.insert_score(score).await?;
        }

        // Only proceed to Stage 2 if we have remote LLM and high enough score
        if let Some(remote_llm) = &self.remote_llm {
            let max_score = scores.iter().map(|s| s.score).fold(0.0, f64::max);
            if max_score >= 5.0 {
                // Stage 2: Summarize
                match Summarizer::summarize(remote_llm, raw_item).await {
                    Ok(mut summary) => {
                        summary.item_id = item_id.clone();
                        self.db.insert_summary(&summary).await?;
                        self.increment_call_count();
                    }
                    Err(e) => {
                        debug!("Failed to summarize item: {}", e);
                    }
                }

                // Stage 2: Auto-tag
                match Tagger::auto_tag(remote_llm, raw_item).await {
                    Ok(mut tags) => {
                        for tag in &mut tags {
                            tag.item_id = item_id.clone();
                            self.db.insert_tag(tag).await?;
                        }
                        self.increment_call_count();
                    }
                    Err(e) => {
                        debug!("Failed to auto-tag item: {}", e);
                    }
                }
            }
        }

        Ok(())
    }

    /// Check if we've exceeded the daily call budget
    fn check_budget(&self, max_calls: u32) -> bool {
        let today = Utc::now().naive_utc().date();
        let mut last_date = self.last_call_date.lock().unwrap();

        // Reset counter if it's a new day
        if *last_date != today {
            *last_date = today;
            self.call_count
                .store(0, std::sync::atomic::Ordering::SeqCst);
        }

        let current_count = self.call_count.load(std::sync::atomic::Ordering::SeqCst);
        current_count < max_calls
    }

    /// Increment the call counter
    fn increment_call_count(&self) {
        use std::sync::atomic::Ordering;
        self.call_count.fetch_add(1, Ordering::SeqCst);
    }
}

/// Legacy function for compatibility
pub async fn process_items(_items: &[RawItem]) -> Result<()> {
    // Phase 1: no-op — items pass through without processing
    // Use IntelligencePipeline directly for Phase 3
    Ok(())
}
