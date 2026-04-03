use anyhow::Result;
use chrono::Utc;
use tracing::debug;
use uuid::Uuid;

use crate::config::types::Interest;
use crate::storage::models::{RawItem, Score};
use super::local_llm::LocalLLM;
use super::remote_llm::RemoteLLM;

/// Relevance scorer using local and remote LLMs
pub struct Scorer {
    local_llm: Option<LocalLLM>,
    remote_llm: Option<RemoteLLM>,
    local_threshold: u32,
}

impl Scorer {
    pub fn new(
        local_llm: Option<LocalLLM>,
        remote_llm: Option<RemoteLLM>,
        local_threshold: u32,
    ) -> Self {
        Self {
            local_llm,
            remote_llm,
            local_threshold,
        }
    }

    /// Score an item against interests using the two-stage pipeline
    /// Stage 1: Use local LLM for cheap filtering (0-10)
    /// Stage 2: Use remote LLM for deep analysis if local score passes threshold
    pub async fn score_item(
        &self,
        item: &RawItem,
        interests: &[Interest],
    ) -> Result<Vec<Score>> {
        if interests.is_empty() {
            return Ok(Vec::new());
        }

        let item_text = format!(
            "Title: {}\n\nContent: {}",
            item.title,
            item.content.as_deref().unwrap_or("(no content)")
        );

        let mut scores = Vec::new();

        for interest in interests {
            debug!("Scoring item '{}' for interest '{}'", item.title, interest.name);

            let mut score = 0.0;
            let mut model_used = "none".to_string();
            let mut reasoning = None;

            // Stage 1: Try local LLM for cheap filtering
            if let Some(local_llm) = &self.local_llm {
                match local_llm.score_relevance(&item_text, &interest.description).await {
                    Ok(local_score) => {
                        score = local_score as f64;
                        model_used = "local_llm".to_string();

                        // Only proceed to Stage 2 if local score passes threshold
                        if local_score >= self.local_threshold {
                            // Stage 2: Use remote LLM for deeper analysis
                            if let Some(remote_llm) = &self.remote_llm {
                                match self.deep_score(remote_llm, &item_text, interest).await {
                                    Ok((remote_score, reason)) => {
                                        score = remote_score;
                                        model_used = "remote_llm".to_string();
                                        reasoning = reason;
                                    }
                                    Err(e) => {
                                        debug!("Remote LLM scoring failed, using local score: {}", e);
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => {
                        debug!("Local LLM scoring failed: {}", e);
                        // Fall back to remote LLM if local fails
                        if let Some(remote_llm) = &self.remote_llm {
                            match self.deep_score(remote_llm, &item_text, interest).await {
                                Ok((remote_score, reason)) => {
                                    score = remote_score;
                                    model_used = "remote_llm".to_string();
                                    reasoning = reason;
                                }
                                Err(e) => {
                                    debug!("Remote LLM also failed, skipping score: {}", e);
                                }
                            }
                        }
                    }
                }
            } else if let Some(remote_llm) = &self.remote_llm {
                // If no local LLM, go straight to remote
                match self.deep_score(remote_llm, &item_text, interest).await {
                    Ok((remote_score, reason)) => {
                        score = remote_score;
                        model_used = "remote_llm".to_string();
                        reasoning = reason;
                    }
                    Err(e) => {
                        debug!("Remote LLM scoring failed: {}", e);
                    }
                }
            }

            if model_used != "none" {
                scores.push(Score {
                    id: Uuid::new_v4().to_string(),
                    item_id: "placeholder".to_string(), // Will be set by orchestrator
                    interest_name: interest.name.clone(),
                    score,
                    reasoning,
                    model_used,
                    scored_at: Utc::now(),
                });
            }
        }

        Ok(scores)
    }

    /// Deep scoring using remote LLM
    async fn deep_score(
        &self,
        remote_llm: &RemoteLLM,
        text: &str,
        interest: &Interest,
    ) -> Result<(f64, Option<String>)> {
        let prompt = format!(
            r#"You are an expert relevance scorer. Score how relevant this item is to the given interest on a scale of 0-10.

Interest: {} (priority: {})
Description: {}

Item:
{}

Provide a JSON response with the format:
{{"score": <number 0-10>, "reasoning": "<brief explanation>"}}

Respond ONLY with the JSON, no other text."#,
            interest.name, interest.priority, interest.description, text
        );

        let response = remote_llm.generate(&prompt).await?;

        // Parse JSON response
        match serde_json::from_str::<serde_json::Value>(&response) {
            Ok(obj) => {
                let score = obj
                    .get("score")
                    .and_then(|s| s.as_f64())
                    .unwrap_or(0.0)
                    .min(10.0);
                let reasoning = obj
                    .get("reasoning")
                    .and_then(|r| r.as_str())
                    .map(|s| s.to_string());
                Ok((score, reasoning))
            }
            Err(e) => {
                debug!("Failed to parse remote LLM response: {}", e);
                // Fallback: try to extract a number from the response
                if let Ok(score) = response.trim().parse::<f64>() {
                    Ok((score.min(10.0), None))
                } else {
                    Err(anyhow::anyhow!("Could not parse remote LLM response: {}", response))
                }
            }
        }
    }
}
