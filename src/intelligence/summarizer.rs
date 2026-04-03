use anyhow::Result;
use chrono::Utc;
use tracing::debug;
use uuid::Uuid;

use super::remote_llm::RemoteLLM;
use crate::storage::models::{RawItem, Summary};

/// Article summarizer using remote LLM
pub struct Summarizer;

impl Summarizer {
    /// Generate a summary of an article using the remote LLM
    pub async fn summarize(remote_llm: &RemoteLLM, item: &RawItem) -> Result<Summary> {
        let text = item.content.as_deref().unwrap_or(&item.title);

        let prompt = format!(
            r#"Summarize the following article in 1-2 sentences, capturing the key points.

Title: {}

Content:
{}

Provide ONLY the summary text, no other commentary."#,
            item.title, text
        );

        let summary_text = remote_llm.generate(&prompt).await?;

        debug!(
            "Generated summary for item '{}': {}",
            item.title, summary_text
        );

        Ok(Summary {
            id: Uuid::new_v4().to_string(),
            item_id: "placeholder".to_string(), // Will be set by orchestrator
            summary: summary_text,
            model_used: "remote_llm".to_string(),
            created_at: Utc::now(),
        })
    }
}
