use anyhow::{anyhow, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tracing::debug;

use crate::config::types::RemoteLlmConfig;

/// Claude API message structure
#[derive(Debug, Serialize)]
struct ClaudeMessage {
    role: String,
    content: String,
}

/// Claude API request structure
#[derive(Debug, Serialize)]
struct ClaudeRequest {
    model: String,
    max_tokens: u32,
    messages: Vec<ClaudeMessage>,
}

/// Claude API response structure
#[derive(Debug, Deserialize)]
struct ClaudeResponse {
    content: Vec<ClaudeContent>,
}

#[derive(Debug, Deserialize)]
struct ClaudeContent {
    text: String,
}

/// OpenAI ChatGPT message structure
#[derive(Debug, Serialize, Deserialize)]
struct OpenAIMessage {
    role: String,
    content: String,
}

/// OpenAI ChatGPT request structure
#[derive(Debug, Serialize)]
struct OpenAIRequest {
    model: String,
    max_tokens: u32,
    messages: Vec<OpenAIMessage>,
}

/// OpenAI ChatGPT response structure
#[derive(Debug, Deserialize)]
struct OpenAIResponse {
    choices: Vec<OpenAIChoice>,
}

#[derive(Debug, Deserialize)]
struct OpenAIChoice {
    message: OpenAIMessage,
}

/// Remote LLM provider (Claude or OpenAI)
#[derive(Clone)]
pub enum RemoteLLM {
    Claude {
        config: RemoteLlmConfig,
        client: std::sync::Arc<Client>,
        api_key: String,
    },
    OpenAI {
        config: RemoteLlmConfig,
        client: std::sync::Arc<Client>,
        api_key: String,
    },
}

impl RemoteLLM {
    pub fn new(mut config: RemoteLlmConfig) -> Result<Self> {
        let api_key = config.api_key.take().ok_or_else(|| anyhow!("No API key configured for remote LLM"))?;
        let client = std::sync::Arc::new(Client::new());

        match config.provider.as_str() {
            "claude" => {
                let model = config.model.take().unwrap_or_else(|| "claude-3-haiku-20240307".to_string());
                config.model = Some(model);
                Ok(RemoteLLM::Claude { config, client, api_key })
            }
            "openai" => {
                let model = config.model.take().unwrap_or_else(|| "gpt-4-turbo".to_string());
                config.model = Some(model);
                Ok(RemoteLLM::OpenAI { config, client, api_key })
            }
            other => Err(anyhow!("Unknown remote LLM provider: {}", other)),
        }
    }

    pub fn provider_name(&self) -> &str {
        match self {
            RemoteLLM::Claude { .. } => "Claude",
            RemoteLLM::OpenAI { .. } => "OpenAI",
        }
    }

    /// Generate a response from the remote LLM
    pub async fn generate(&self, prompt: &str) -> Result<String> {
        match self {
            RemoteLLM::Claude { config, client, api_key } => {
                let model = config.model.as_ref().unwrap().clone();
                let request = ClaudeRequest {
                    model,
                    max_tokens: 1024,
                    messages: vec![ClaudeMessage {
                        role: "user".to_string(),
                        content: prompt.to_string(),
                    }],
                };

                let response = client
                    .post("https://api.anthropic.com/v1/messages")
                    .header("x-api-key", api_key)
                    .header("anthropic-version", "2023-06-01")
                    .json(&request)
                    .send()
                    .await?;

                if !response.status().is_success() {
                    return Err(anyhow!(
                        "Claude API error: {} {}",
                        response.status(),
                        response.text().await.unwrap_or_default()
                    ));
                }

                let body: ClaudeResponse = response.json().await?;
                Ok(body.content.first()
                    .map(|c| c.text.trim().to_string())
                    .ok_or_else(|| anyhow!("Empty response from Claude"))?)
            }
            RemoteLLM::OpenAI { config, client, api_key } => {
                let model = config.model.as_ref().unwrap().clone();
                let request = OpenAIRequest {
                    model,
                    max_tokens: 1024,
                    messages: vec![OpenAIMessage {
                        role: "user".to_string(),
                        content: prompt.to_string(),
                    }],
                };

                let response = client
                    .post("https://api.openai.com/v1/chat/completions")
                    .header("Authorization", format!("Bearer {}", api_key))
                    .json(&request)
                    .send()
                    .await?;

                if !response.status().is_success() {
                    return Err(anyhow!(
                        "OpenAI API error: {} {}",
                        response.status(),
                        response.text().await.unwrap_or_default()
                    ));
                }

                let body: OpenAIResponse = response.json().await?;
                Ok(body.choices.first()
                    .map(|c| c.message.content.trim().to_string())
                    .ok_or_else(|| anyhow!("Empty response from OpenAI"))?)
            }
        }
    }

    /// Check if the remote LLM is available (basic health check)
    pub async fn health_check(&self) -> bool {
        let test_prompt = "Say 'ok'";
        self.generate(test_prompt).await.is_ok()
    }
}
