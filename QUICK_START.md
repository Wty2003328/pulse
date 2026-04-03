# Phase 3 Intelligence Pipeline - Quick Start Guide

## 30-Second Overview

The Phase 3 pipeline adds AI-powered content analysis to Pulse:
1. **Stage 1**: Cheap local scoring (Ollama) filters items
2. **Stage 2**: Deep analysis (Claude/OpenAI) summarizes and tags remaining items
3. **Result**: Items stored with relevance scores, summaries, and tags

## Installation

No new dependencies needed. Code uses existing Cargo.toml packages:
```bash
# Files already created at:
/sessions/ecstatic-awesome-rubin/mnt/pulse/src/intelligence/
├── mod.rs           (orchestrator)
├── local_llm.rs     (Ollama)
├── remote_llm.rs    (Claude/OpenAI)
├── scorer.rs        (two-stage scoring)
├── summarizer.rs    (1-2 sentence summaries)
└── tagger.rs        (3-5 category tags)
```

## Configuration

### 1. Create `config.toml` with intelligence section:

```toml
[intelligence]
enabled = true

[intelligence.local]
enabled = true
provider = "ollama"
model = "llama3:8b"
endpoint = "http://localhost:11434"
relevance_threshold = 4

[intelligence.remote]
enabled = true
provider = "claude"
model = "claude-3-haiku-20240307"
api_key = "sk-ant-..."
max_daily_calls = 100
batch_size = 10

[[interests]]
name = "Rust"
description = "Articles about Rust programming language"
priority = "high"

[[interests]]
name = "AI/ML"
description = "Articles about artificial intelligence and machine learning"
priority = "medium"
```

### 2. Set environment variable:

```bash
export PULSE_INTELLIGENCE_REMOTE_API_KEY="sk-ant-v..."
```

### 3. Start Ollama (optional but recommended):

```bash
ollama serve
ollama pull llama3:8b
```

## Usage

### In Rust Code

```rust
use pulse::intelligence::IntelligencePipeline;
use pulse::storage::Database;

// Initialize
let db = Database::new("./data/pulse.db").await?;
let pipeline = IntelligencePipeline::new(
    config.intelligence,
    db.clone(),
    config.interests
).await?;

// Process items
let items = vec![/* RawItem instances */];
pipeline.process_items(&items).await?;

// Items now have scores, summaries, tags in database
let feed = db.get_feed(50, 0, None).await?;
for item in feed {
    println!("Item: {}", item.title);
    println!("  Score: {:?}", item.score);
    println!("  Summary: {:?}", item.summary);
    println!("  Tags: {:?}", item.tags);
}
```

## Processing Flow

```
Input: 10 articles
    ↓
[Stage 1: Ollama]
- Article A: 8/10 → passes (>= 4)
- Article B: 2/10 → dropped
- Article C: 7/10 → passes
- Article D: 3/10 → dropped
- Articles E-J: 6/10 each → pass
    ↓
[Stage 2: Claude] (only 8 items)
- Score each with reasoning
- If score >= 5.0: summarize & tag
- Uses 8 API calls
    ↓
[Database]
- Stores 8 scored items
- 6 items have summaries + tags
- 2 items have only scores
    ↓
[Feed API]
- Returns all items sorted by score
```

## Monitoring

### Check Logs
```bash
RUST_LOG=pulse=debug cargo run
```

Look for:
```
Local LLM (Ollama) connected and healthy
Remote LLM (Claude) connected and healthy
Processing 10 items through intelligence pipeline
Generated summary for item 'Example Title'
Auto-generated tags for 'Example Title': ["rust", "web", "async"]
```

### Check Database
```bash
sqlite3 data/pulse.db

-- View scores
SELECT item_id, interest_name, score, model_used FROM scores;

-- View summaries
SELECT item_id, summary FROM summaries;

-- View tags
SELECT item_id, tag FROM tags;

-- Get feed items with analysis
SELECT i.title, s.score, su.summary, GROUP_CONCAT(t.tag) as tags
FROM items i
LEFT JOIN (SELECT item_id, MAX(score) as score FROM scores GROUP BY item_id) s ON i.id = s.item_id
LEFT JOIN summaries su ON i.id = su.item_id
LEFT JOIN tags t ON i.id = t.item_id
GROUP BY i.id
ORDER BY s.score DESC;
```

## Troubleshooting

### "Local LLM not available"
- Check Ollama is running: `curl http://localhost:11434/api/tags`
- Fix: Start Ollama or set `enabled = false` in config

### "Remote LLM health check failed"
- Check API key is set: `echo $PULSE_INTELLIGENCE_REMOTE_API_KEY`
- Check API quota isn't exceeded
- Fix: Set correct API key or set `enabled = false`

### "No LLM available - pipeline disabled"
- Both Ollama and Claude/OpenAI are down/misconfigured
- Pipeline will store items but skip analysis
- Fix: Enable at least one LLM provider

### "Daily call budget exceeded"
- Hit max_daily_calls limit (default 100)
- Pipeline stops to avoid overspending
- Fix: Increase `max_daily_calls` or reduce items
- Budget resets at UTC midnight

### API errors in logs
- Check your internet connection
- Verify API keys are correct
- Check API rate limits aren't exceeded
- Try smaller batch_size (default 10)

## Performance Tips

### For Budget Control
```toml
max_daily_calls = 50      # More conservative
batch_size = 5            # Process fewer items per batch
```

### For Speed
```toml
batch_size = 20           # Process more items before budget check
# Skip Ollama for fast deep analysis only:
enabled = false           # (for intelligence.local)
```

### For Accuracy
```toml
relevance_threshold = 6   # Stricter Stage 1 filtering
model = "claude-3-opus"   # Better remote model (costs more)
```

## Configuration Reference

### LocalLlmConfig
| Field | Default | Description |
|-------|---------|-------------|
| enabled | true | Enable Ollama scoring |
| provider | ollama | Provider name (only "ollama" supported) |
| model | llama3:8b | Model to use |
| endpoint | http://localhost:11434 | Ollama endpoint |
| relevance_threshold | 4 | Score threshold for Stage 2 (0-10) |

### RemoteLlmConfig
| Field | Default | Description |
|-------|---------|-------------|
| enabled | true | Enable Claude/OpenAI |
| provider | claude | "claude" or "openai" |
| model | varies | Model name (set via api_key provider) |
| api_key | - | Required: Set via env var |
| max_daily_calls | 100 | Daily API call budget |
| batch_size | 10 | Items per batch |

### Interest
| Field | Default | Description |
|-------|---------|-------------|
| name | - | Interest name (e.g., "Rust") |
| description | - | What content you want (natural language) |
| priority | medium | "high", "medium", or "low" |

## Example Workflows

### Simple Setup (Local Only)
```toml
[intelligence]
enabled = true
[intelligence.local]
enabled = true
[intelligence.remote]
enabled = false
```
→ Ollama scores items only, no summaries/tags

### Budget-Conscious Setup
```toml
[intelligence.remote]
max_daily_calls = 20
batch_size = 5
```
→ Only 20 API calls/day, process 5 items at a time

### Full Analysis Setup
```toml
[intelligence.local]
enabled = true
[intelligence.remote]
enabled = true
max_daily_calls = 100
```
→ Both Ollama and Claude, analyzes ~8-10 items per day

## Next Steps

1. **Copy the config template** to your project
2. **Start Ollama** (if using local LLM)
3. **Set your API key** via environment variable
4. **Add interests** to config matching your goals
5. **Run `cargo run`** and check logs
6. **Verify database** has scores, summaries, tags
7. **Monitor costs** using `max_daily_calls` limit
8. **Adjust thresholds** based on results

## Support

- Full documentation: `INTELLIGENCE_PIPELINE_PHASE3.md`
- Implementation details: `IMPLEMENTATION_CHECKLIST.md`
- Architecture guide: `PHASE3_SUMMARY.md`

## What Gets Stored

For each article that passes through the pipeline:

**Score** (always if LLM available)
- Relevance score (0-10)
- Interest name it was scored against
- Model used (Ollama or Claude)
- Reasoning (if from remote LLM)
- Timestamp

**Summary** (if score >= 5.0)
- 1-2 sentence summary
- Model used
- Timestamp

**Tags** (if score >= 5.0)
- 3-5 category tags
- Each tag is lowercase, hyphen-separated

## Example Output

Feed API now returns:
```json
{
  "id": "item-123",
  "title": "Rust 1.80 Released",
  "source": "rust-blog",
  "url": "https://...",
  "content": "...",
  "summary": "Rust 1.80 introduces const closures and trait safety improvements.",
  "tags": ["rust", "release", "language"],
  "score": 8.5,
  "collected_at": "2024-04-03T15:00:00Z"
}
```
