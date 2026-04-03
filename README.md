# Pulse

A configurable, self-hosted personal intelligence dashboard that aggregates news, data, and insights from diverse sources, curated by AI to match your interests.

![Rust](https://img.shields.io/badge/Rust-000000?style=flat&logo=rust)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

## Features

- **Multi-source aggregation** — RSS feeds, Hacker News, Reddit, stocks, weather, GitHub, and custom APIs
- **7 AI providers** — Claude, GPT, Gemini, DeepSeek, GitHub Copilot, MiniMax, and GLM (Zhipu AI) — configure API keys from the built-in Settings UI
- **AI-powered curation** — Hybrid LLM pipeline (local Ollama + remote provider) scores and summarizes items based on your natural-language interest profiles
- **Adaptive widget dashboard** — Square-mesh grid with drag-and-drop; widgets auto-adjust content based on their size, similar to phone home screen widgets
- **Single binary deployment** — Frontend embedded in the Rust binary via rust-embed
- **Runs anywhere** — Raspberry Pi, laptop, cloud server
- **YAML + UI configuration** — Human-readable config file with environment variable substitution, plus a web-based Settings page for AI provider management

## Quick Start

```bash
# Clone
git clone https://github.com/Wty2003328/pulse.git
cd pulse

# Set up config
cp config/example.yaml config/default.yaml
# Edit config/default.yaml with your preferred sources

# Build frontend
cd web && npm install && npm run build && cd ..

# Build and run
cargo run --release
```

Open `http://localhost:8080` in your browser. Navigate to **Settings** (gear icon) to configure AI providers.

## Docker

```bash
cp config/example.yaml config/default.yaml
docker compose -f docker/docker-compose.yaml up -d
```

## Configuration

### Data Sources

Edit `config/default.yaml` to customize:

- **Collectors** — Enable/disable data sources and set polling intervals
- **Interests** — Natural language descriptions of topics you care about (used by AI scoring)
- **Intelligence** — Configure local (Ollama) LLM integration via YAML

See `config/example.yaml` for a fully commented example.

### AI Providers

Navigate to `http://localhost:8080/settings` to configure AI providers through the web UI:

| Provider | Auth | Notes |
|----------|------|-------|
| Claude | API key | [console.anthropic.com](https://console.anthropic.com) |
| GPT | API key | [platform.openai.com](https://platform.openai.com) |
| Gemini | API key | [aistudio.google.com](https://aistudio.google.com) |
| DeepSeek | API key | [platform.deepseek.com](https://platform.deepseek.com) |
| GitHub Copilot | GitHub PAT | [github.com/settings/tokens](https://github.com/settings/tokens) |
| MiniMax | API key | [api.minimax.chat](https://api.minimax.chat) |
| GLM | API key | [open.bigmodel.cn](https://open.bigmodel.cn) |

API keys are stored locally in your SQLite database — they never leave your machine.

## Architecture

```
Scheduler → Collectors → SQLite → Intelligence Pipeline → REST API → React Dashboard
                                                                    → Settings Page
```

- **Backend**: Rust (Axum + Tokio + SQLite)
- **Frontend**: React 19 + TypeScript + Tailwind CSS + shadcn/ui (Vite)
- **LLM**: Ollama (local) + 7 remote providers
- **Config**: YAML (data sources) + SQLite (provider keys via Settings UI)

## Adding a New Collector

Create a new file in `src/collectors/` implementing the `Collector` trait:

```rust
#[async_trait]
impl Collector for MyCollector {
    fn id(&self) -> &str { "my_source" }
    fn name(&self) -> &str { "My Source" }
    fn default_interval(&self) -> Duration { Duration::from_secs(1800) }
    fn enabled(&self) -> bool { true }
    async fn collect(&self) -> Result<Vec<RawItem>> { /* ... */ }
}
```

Register it in `src/main.rs` and add config types in `src/config/types.rs`.

## Development

```bash
# Frontend dev server (hot reload, proxies API to :8080)
cd web && npm run dev

# Backend
cargo run

# Lint
cargo fmt --check
cargo clippy -- -D warnings

# Type check frontend
cd web && npx tsc --noEmit
```

## License

MIT
