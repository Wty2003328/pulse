use anyhow::{anyhow, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tracing::debug;

use crate::config::types::RemoteLlmConfig;

// --- Anthropic Claude ---

#[derive(Debug, Serialize)]
struct ClaudeMessage {
    role: String,
    content: String,
}

#[derive(Debug, Serialize)]
struct ClaudeRequest {
    model: String,
    max_tokens: u32,
    messages: Vec<ClaudeMessage>,
}

#[derive(Debug, Deserialize)]
struct ClaudeResponse {
    content: Vec<ClaudeContent>,
}

#[derive(Debug, Deserialize)]
struct ClaudeContent {
    text: String,
}

// --- OpenAI-compatible (OpenAI, DeepSeek, Copilot, GLM) ---

#[derive(Debug, Serialize, Deserialize)]
struct OpenAIMessage {
    role: String,
    content: String,
}

#[derive(Debug, Serialize)]
struct OpenAIRequest {
    model: String,
    max_tokens: u32,
    messages: Vec<OpenAIMessage>,
}

#[derive(Debug, Deserialize)]
struct OpenAIResponse {
    choices: Vec<OpenAIChoice>,
}

#[derive(Debug, Deserialize)]
struct OpenAIChoice {
    message: OpenAIMessage,
}

// --- Google Gemini ---

#[derive(Debug, Serialize)]
struct GeminiRequest {
    contents: Vec<GeminiContent>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GeminiContent {
    parts: Vec<GeminiPart>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GeminiPart {
    text: String,
}

#[derive(Debug, Deserialize)]
struct GeminiResponse {
    candidates: Vec<GeminiCandidate>,
}

#[derive(Debug, Deserialize)]
struct GeminiCandidate {
    content: GeminiContent,
}

// --- MiniMax ---

#[derive(Debug, Serialize)]
struct MiniMaxRequest {
    model: String,
    messages: Vec<OpenAIMessage>,
}

#[derive(Debug, Deserialize)]
struct MiniMaxResponse {
    choices: Vec<MiniMaxChoice>,
}

#[derive(Debug, Deserialize)]
struct MiniMaxChoice {
    message: OpenAIMessage,
}

/// Remote LLM provider supporting multiple backends.
#[derive(Clone)]
pub struct RemoteLLM {
    pub provider_id: String,
    pub api_key: String,
    pub model: String,
    pub endpoint: String,
    client: std::sync::Arc<Client>,
}

/// Provider endpoint and default model info.
struct ProviderDefaults {
    endpoint: &'static str,
    default_model: &'static str,
}

fn provider_defaults(provider_id: &str) -> Option<ProviderDefaults> {
    match provider_id {
        "claude" => Some(ProviderDefaults {
            endpoint: "https://api.anthropic.com/v1/messages",
            default_model: "claude-sonnet-4-20250514",
        }),
        "openai" => Some(ProviderDefaults {
            endpoint: "https://api.openai.com/v1/chat/completions",
            default_model: "gpt-4o-mini",
        }),
        "gemini" => Some(ProviderDefaults {
            endpoint: "https://generativelanguage.googleapis.com/v1beta",
            default_model: "gemini-2.0-flash",
        }),
        "deepseek" => Some(ProviderDefaults {
            endpoint: "https://api.deepseek.com/v1/chat/completions",
            default_model: "deepseek-chat",
        }),
        "copilot" => Some(ProviderDefaults {
            endpoint: "https://models.inference.ai.azure.com/chat/completions",
            default_model: "gpt-4o",
        }),
        "minimax" => Some(ProviderDefaults {
            endpoint: "https://api.minimax.chat/v1/text/chatcompletion_v2",
            default_model: "MiniMax-Text-01",
        }),
        "glm" => Some(ProviderDefaults {
            endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
            default_model: "glm-4-flash",
        }),
        _ => None,
    }
}

impl RemoteLLM {
    /// Create from config (backward compatible with existing YAML config).
    pub fn new(mut config: RemoteLlmConfig) -> Result<Self> {
        let api_key = config
            .api_key
            .take()
            .ok_or_else(|| anyhow!("No API key configured for remote LLM"))?;
        let provider_id = config.provider.clone();
        let defaults = provider_defaults(&provider_id)
            .ok_or_else(|| anyhow!("Unknown remote LLM provider: {}", provider_id))?;

        let model = config
            .model
            .take()
            .unwrap_or_else(|| defaults.default_model.to_string());

        Ok(Self {
            provider_id,
            api_key,
            model,
            endpoint: defaults.endpoint.to_string(),
            client: std::sync::Arc::new(Client::new()),
        })
    }

    /// Create from explicit parameters (for database-stored provider settings).
    pub fn from_params(
        provider_id: &str,
        api_key: &str,
        model: Option<&str>,
        endpoint: Option<&str>,
    ) -> Result<Self> {
        let defaults = provider_defaults(provider_id)
            .ok_or_else(|| anyhow!("Unknown provider: {}", provider_id))?;

        Ok(Self {
            provider_id: provider_id.to_string(),
            api_key: api_key.to_string(),
            model: model
                .unwrap_or(defaults.default_model)
                .to_string(),
            endpoint: endpoint
                .unwrap_or(defaults.endpoint)
                .to_string(),
            client: std::sync::Arc::new(Client::new()),
        })
    }

    pub fn provider_name(&self) -> &str {
        match self.provider_id.as_str() {
            "claude" => "Claude",
            "openai" => "OpenAI",
            "gemini" => "Gemini",
            "deepseek" => "DeepSeek",
            "copilot" => "GitHub Copilot",
            "minimax" => "MiniMax",
            "glm" => "GLM",
            _ => &self.provider_id,
        }
    }

    /// Generate a response from the remote LLM.
    pub async fn generate(&self, prompt: &str) -> Result<String> {
        match self.provider_id.as_str() {
            "claude" => self.generate_claude(prompt).await,
            "gemini" => self.generate_gemini(prompt).await,
            "minimax" => self.generate_minimax(prompt).await,
            // OpenAI-compatible: openai, deepseek, copilot, glm
            _ => self.generate_openai_compatible(prompt).await,
        }
    }

    async fn generate_claude(&self, prompt: &str) -> Result<String> {
        let request = ClaudeRequest {
            model: self.model.clone(),
            max_tokens: 1024,
            messages: vec![ClaudeMessage {
                role: "user".to_string(),
                content: prompt.to_string(),
            }],
        };

        let response = self
            .client
            .post(&self.endpoint)
            .header("x-api-key", &self.api_key)
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
        body.content
            .first()
            .map(|c| c.text.trim().to_string())
            .ok_or_else(|| anyhow!("Empty response from Claude"))
    }

    async fn generate_openai_compatible(&self, prompt: &str) -> Result<String> {
        let request = OpenAIRequest {
            model: self.model.clone(),
            max_tokens: 1024,
            messages: vec![OpenAIMessage {
                role: "user".to_string(),
                content: prompt.to_string(),
            }],
        };

        let response = self
            .client
            .post(&self.endpoint)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow!(
                "{} API error: {} {}",
                self.provider_name(),
                response.status(),
                response.text().await.unwrap_or_default()
            ));
        }

        let body: OpenAIResponse = response.json().await?;
        body.choices
            .first()
            .map(|c| c.message.content.trim().to_string())
            .ok_or_else(|| anyhow!("Empty response from {}", self.provider_name()))
    }

    async fn generate_gemini(&self, prompt: &str) -> Result<String> {
        let url = format!(
            "{}/models/{}:generateContent?key={}",
            self.endpoint.trim_end_matches('/'),
            self.model,
            self.api_key
        );

        let request = GeminiRequest {
            contents: vec![GeminiContent {
                parts: vec![GeminiPart {
                    text: prompt.to_string(),
                }],
            }],
        };

        let response = self.client.post(&url).json(&request).send().await?;

        if !response.status().is_success() {
            return Err(anyhow!(
                "Gemini API error: {} {}",
                response.status(),
                response.text().await.unwrap_or_default()
            ));
        }

        let body: GeminiResponse = response.json().await?;
        body.candidates
            .first()
            .and_then(|c| c.content.parts.first())
            .map(|p| p.text.trim().to_string())
            .ok_or_else(|| anyhow!("Empty response from Gemini"))
    }

    async fn generate_minimax(&self, prompt: &str) -> Result<String> {
        let request = MiniMaxRequest {
            model: self.model.clone(),
            messages: vec![OpenAIMessage {
                role: "user".to_string(),
                content: prompt.to_string(),
            }],
        };

        let response = self
            .client
            .post(&self.endpoint)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow!(
                "MiniMax API error: {} {}",
                response.status(),
                response.text().await.unwrap_or_default()
            ));
        }

        let body: MiniMaxResponse = response.json().await?;
        body.choices
            .first()
            .map(|c| c.message.content.trim().to_string())
            .ok_or_else(|| anyhow!("Empty response from MiniMax"))
    }

    /// Check if the remote LLM is available (basic health check).
    pub async fn health_check(&self) -> bool {
        let test_prompt = "Say 'ok'";
        self.generate(test_prompt).await.is_ok()
    }

    /// Test a provider connection with given credentials (static, no instance needed).
    pub async fn test_connection(
        provider_id: &str,
        api_key: &str,
        model: Option<&str>,
    ) -> Result<String> {
        let llm = Self::from_params(provider_id, api_key, model, None)?;
        debug!("Testing connection to {} (model: {})", llm.provider_name(), llm.model);

        let response = llm.generate("Say 'ok' and nothing else.").await?;
        Ok(format!(
            "Connected to {} (model: {}). Response: {}",
            llm.provider_name(),
            llm.model,
            response.chars().take(50).collect::<String>()
        ))
    }
}
