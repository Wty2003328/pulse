# Pulse

A configurable, self-hosted personal intelligence dashboard that aggregates news, data, and insights from diverse sources, curated by AI to match your interests.

![Rust](https://img.shields.io/badge/Rust-000000?style=flat&logo=rust)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

## Features

- **Multi-source aggregation** — RSS feeds, Hacker News, Reddit, stocks, weather, GitHub, and custom APIs
- **AI-powered curation** — Hybrid LLM pipeline (local Ollama + remote Claude/OpenAI) scores and summarizes items based on your natural-language interest profiles
- **Configurable dashboard** — Drag-and-drop widgets with dark theme
- **Single binary deployment** — Frontend embedded in the Rust binary via rust-embed
- **Runs anywhere** — Raspberry Pi, laptop, cloud server
- **YAML configuration** — Human-readable config with environment variable substitution

## Quick Start

```bash
# Clone the repo
git clone https://github.com/youruser/pulse.git
cd pulse

# Set up config
cp config/example.yaml config/default.yaml
# Edit config/default.yaml with your preferred sources

# Build frontend
cd web && npm install && npm run build && cd ..

# Build and run
cargo run --release
```

Open `http://localhost:8080` in your browser.

## Docker

```bash
cp config/example.yaml config/default.yaml
docker compose -f docker/docker-compose.yaml up -d
```

## Configuration

Edit `config/default.yaml` to customize:

- **Collectors** — Enable/disable data sources and set polling intervals
- **Interests** — Natural language descriptions of topics you care about (used by AI scoring)
- **Intelligence** — Configure local (Ollama) and/or remote (Claude/OpenAI) LLM integration
- **Dashboard** — Theme, refresh rate, widget layout

See `config/example.yaml` for a fully commented example.

## Architecture

```
Scheduler → Collectors → SQLite → Intelligence Pipeline → REST API → React Dashboard
```

- **Backend**: Rust (Axum + Tokio + SQLite)
- **Frontend**: React + TypeScript (Vite)
- **LLM**: Ollama (local) + Claude/OpenAI (remote)
- **Config**: YAML with env var substitution

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

## License

MIT
