use anyhow::{anyhow, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tracing::{debug, warn};

use crate::config::types::LocalLlmConfig;

/// Ollama API request structure
#[derive(Debug, Serialize)]
struct OllamaRequest {
    model: String,
    prompt: String,
    stream: bool,
}

/// Ollama API response structure
#[derive(Debug, Deserialize)]
struct OllamaResponse {
    response: String,
}

/// Local LLM provider using Ollama
#[derive(Clone)]
pub struct LocalLLM {
    pub config: LocalLlmConfig,
    client: std::sync::Arc<Client>,
}

impl LocalLLM {
    pub fn new(config: LocalLlmConfig) -> Self {
        Self {
            config,
            client: std::sync::Arc::new(Client::new()),
        }
    }

    /// Check if the local LLM is available
    pub async fn health_check(&self) -> bool {
        match self.client.get(&format!("{}/api/tags", self.config.endpoint)).send().await {
            Ok(resp) => resp.status().is_success(),
            Err(_) => false,
        }
    }

    /// Generate a response from Ollama for the given prompt
    pub async fn generate(&self, prompt: &str) -> Result<String> {
        let request = OllamaRequest {
            model: self.config.model.clone(),
            prompt: prompt.to_string(),
            stream: false,
        };

        let response = self.client
            .post(&format!("{}/api/generate", self.config.endpoint))
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow!(
                "Ollama API error: {} {}",
                response.status(),
                response.text().await.unwrap_or_default()
            ));
        }

        let body: OllamaResponse = response.json().await?;
        Ok(body.response.trim().to_string())
    }

    /// Score relevance of text against an interest description
    /// Returns a score from 0-10
    pub async fn score_relevance(&self, text: &str, interest: &str) -> Result<u32> {
        let prompt = format!(
            r#"You are a relevance scorer. Rate how relevant this text is to the given interest on a scale of 0-10.

Interest: {}

Text: {}

Respond with ONLY a single number from 0-10, nothing else."#,
            interest, text
        );

        let response = self.generate(&prompt).await?;

        // Parse the response as a number
        let score: u32 = response
            .trim()
            .parse()
            .unwrap_or(0)
            .min(10);

        debug!("Local LLM relevance score for '{}': {}", interest, score);
        Ok(score)
    }
}
