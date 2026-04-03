# Phase 3: Intelligence Pipeline Implementation

## Overview

The Phase 3 intelligence pipeline for the Pulse project implements a two-stage processing system that uses both local and remote LLMs to analyze, score, summarize, and tag collected articles.

## Architecture

### Two-Stage Pipeline

**Stage 1: Local LLM Relevance Filtering (Ollama)**
- Uses a fast, local Ollama instance for cheap relevance scoring
- Scores items on a scale of 0-10
- Only items above the configured threshold (default: 4) proceed to Stage 2
- Graceful degradation: if Ollama is unavailable, skips to Stage 2 directly

**Stage 2: Remote LLM Deep Analysis (Claude/OpenAI)**
- Performs detailed relevance scoring with reasoning
- Generates article summaries (1-2 sentences)
- Auto-generates 3-5 category tags
- Only runs on items with final score >= 5.0
- Budget-aware: respects `max_daily_calls` limit from config

## Modules

### 1. `src/intelligence/mod.rs` - Orchestrator
The main entry point that coordinates the two-stage pipeline.

**Key Components:**
- `IntelligencePipeline` struct: Manages the overall pipeline
- Health checks for both local and remote LLMs on startup
- Budget tracking with daily reset
- Batch processing with configurable batch size
- Graceful error handling with fallbacks

**Public API:**
```rust
impl IntelligencePipeline {
    pub async fn new(
        config: IntelligenceConfig,
        db: Database,
        interests: Vec<Interest>,
    ) -> Result<Self>

    pub async fn process_items(&self, items: &[RawItem]) -> Result<()>
}
```

### 2. `src/intelligence/local_llm.rs` - Ollama Integration
Handles communication with local Ollama instance via HTTP API.

**Features:**
- Configurable endpoint (default: `http://localhost:11434`)
- Uses POST to `/api/generate` endpoint
- Streams disabled for simpler response handling
- Relevance scoring with 0-10 scale
- Health check via `/api/tags` endpoint

**Key Methods:**
```rust
impl LocalLLM {
    pub async fn health_check(&self) -> bool
    pub async fn generate(&self, prompt: &str) -> Result<String>
    pub async fn score_relevance(&self, text: &str, interest: &str) -> Result<u32>
}
```

### 3. `src/intelligence/remote_llm.rs` - Claude/OpenAI Integration
Unified interface for remote LLM providers.

**Supported Providers:**
- **Claude** (Anthropic): `https://api.anthropic.com/v1/messages`
  - Headers: `x-api-key`, `anthropic-version: 2023-06-01`
  - Model default: `claude-3-haiku-20240307`

- **OpenAI** (ChatGPT): `https://api.openai.com/v1/chat/completions`
  - Header: `Authorization: Bearer {api_key}`
  - Model default: `gpt-4-turbo`

**Key Methods:**
```rust
pub enum RemoteLLM {
    Claude { ... },
    OpenAI { ... },
}

impl RemoteLLM {
    pub fn new(config: RemoteLlmConfig) -> Result<Self>
    pub async fn health_check(&self) -> bool
    pub async fn generate(&self, prompt: &str) -> Result<String>
    pub fn provider_name(&self) -> &str
}
```

### 4. `src/intelligence/scorer.rs` - Relevance Scoring Engine
Two-stage scoring system with fallback logic.

**Scoring Logic:**
1. Local LLM scores item against interest description (0-10)
2. If score >= threshold, remote LLM performs deep analysis
3. Remote LLM returns structured JSON with score (0-10) and reasoning
4. Fallback: If local fails, try remote directly; if remote fails, skip scoring

**Key Methods:**
```rust
impl Scorer {
    pub async fn score_item(
        &self,
        item: &RawItem,
        interests: &[Interest],
    ) -> Result<Vec<Score>>

    async fn deep_score(
        &self,
        remote_llm: &RemoteLLM,
        text: &str,
        interest: &Interest,
    ) -> Result<(f64, Option<String>)>
}
```

### 5. `src/intelligence/summarizer.rs` - Article Summarization
Generates concise summaries using remote LLM.

**Features:**
- 1-2 sentence summaries capturing key points
- Uses article title and content
- Only runs on items with score >= 5.0
- Generates UUID for each summary

**Key Methods:**
```rust
impl Summarizer {
    pub async fn summarize(
        remote_llm: &RemoteLLM,
        item: &RawItem,
    ) -> Result<Summary>
}
```

### 6. `src/intelligence/tagger.rs` - Auto-Categorization
Auto-generates relevant tags for articles.

**Features:**
- 3-5 category tags per item
- Lowercase, hyphen-separated format
- JSON array response parsing with fallback
- Only runs on items with score >= 5.0

**Key Methods:**
```rust
impl Tagger {
    pub async fn auto_tag(
        remote_llm: &RemoteLLM,
        item: &RawItem,
    ) -> Result<Vec<Tag>>
}
```

## Database Integration

### Updated Storage Methods (`src/storage/mod.rs`)

```rust
impl Database {
    pub async fn insert_score(&self, score: &Score) -> Result<()>
    pub async fn insert_summary(&self, summary: &Summary) -> Result<()>
    pub async fn insert_tag(&self, tag: &Tag) -> Result<()>
}
```

These methods handle persistence of:
- **Scores**: Relevance scores with reasoning and model metadata
- **Summaries**: AI-generated article summaries
- **Tags**: Auto-generated category tags

## Configuration

### Required Config Structure (in `config.toml` or `config.yaml`)

```yaml
intelligence:
  enabled: true

  local:
    enabled: true
    provider: ollama
    model: llama3:8b
    endpoint: http://localhost:11434
    relevance_threshold: 4

  remote:
    enabled: true
    provider: claude  # or "openai"
    model: claude-3-haiku-20240307
    api_key: "sk-..."  # Set via environment: PULSE_INTELLIGENCE_REMOTE_API_KEY
    max_daily_calls: 100
    batch_size: 10

interests:
  - name: "Rust Programming"
    description: "Articles about Rust language, systems programming, and Rust ecosystem"
    priority: "high"

  - name: "AI/ML"
    description: "Articles about artificial intelligence, machine learning, and large language models"
    priority: "medium"
```

### Environment Variables

- `PULSE_INTELLIGENCE_REMOTE_API_KEY`: API key for Claude or OpenAI
- Standard Rust logging: `RUST_LOG=pulse=debug`

## Processing Flow

```
Input Items (RawItem)
    ↓
Intelligence Pipeline (enabled check)
    ↓
[Stage 1: Local LLM Filtering]
- Health check Ollama
- Score each item against interests (0-10)
- Items below threshold are skipped
    ↓
[Stage 2: Remote LLM Analysis]
- Health check Claude/OpenAI
- Deep score with reasoning (0-10)
- If final score >= 5.0:
  - Generate summary (1-2 sentences)
  - Auto-generate tags (3-5 tags)
- Track daily API calls
- Respect batch size and budget
    ↓
Database Storage
- Insert scores → scores table
- Insert summaries → summaries table
- Insert tags → tags table
    ↓
Feed API
- Combines items with scores, summaries, tags
```

## Graceful Degradation

The pipeline is designed to degrade gracefully if components are unavailable:

| Scenario | Behavior |
|----------|----------|
| Ollama down, Claude up | Skip local scoring, go straight to remote |
| Ollama up, Claude down | Use local scores only, no summaries/tags |
| Both down | Pipeline disabled, items stored without analysis |
| Budget exceeded | Stop processing, log warning |
| Individual item fails | Log error, continue with next item |

## Error Handling

- Connection errors to Ollama/Claude/OpenAI are logged and trigger fallback behavior
- JSON parsing errors fallback to extracting raw numbers
- Items with errors are skipped without stopping the pipeline
- All errors use structured logging with `tracing` crate

## Performance Considerations

### Budget Control
- Daily call counter resets at UTC midnight
- Respects `max_daily_calls` configuration
- Batch processing with configurable `batch_size`
- Only Stage 2 operations (summarization, tagging) count toward budget

### Resource Usage
- Local LLM scoring is fast (1-2 seconds per item)
- Remote LLM operations cached in database (no duplicate summaries)
- Batch processing reduces context switching overhead
- Each pipeline instance has its own atomic call counter

## Testing Recommendations

1. **Unit Tests**: Mock HTTP responses for Ollama and Claude APIs
2. **Integration Tests**: Use test Ollama instance and API keys
3. **Configuration Tests**: Verify fallback behavior with disabled providers
4. **Load Tests**: Process 100+ items with budget constraints
5. **Error Scenarios**: Test network timeouts, invalid JSON responses, rate limits

## Future Enhancements

- Caching of Ollama responses to avoid redundant scoring
- Parallel processing of items using tokio tasks
- Configurable scoring thresholds per interest
- Fine-tuned local models for specific domains
- Webhook notifications for high-scoring items
- User feedback loop to improve relevance scores
