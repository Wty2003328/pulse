# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pulse is a self-hosted personal intelligence dashboard that aggregates news/data from multiple sources (RSS, Hacker News, Reddit, stocks, weather, GitHub) with AI-powered curation via a hybrid LLM pipeline (local Ollama + 7 remote providers). Rust backend (Axum/Tokio/SQLite) with an embedded React frontend (Vite/TypeScript/Tailwind/shadcn-ui) — ships as a single binary.

## Commands

```bash
# Build frontend (required before backend build — assets are embedded via rust-embed)
cd web && npm install && npm run build && cd ..

# Build and run
cargo build --release
cargo run --release

# Lint
cargo fmt --check
cargo clippy -- -D warnings

# Tests
cargo test

# Docker
cp config/example.yaml config/default.yaml
docker compose -f docker/docker-compose.yaml up -d
```

## Architecture

```
Scheduler → Collectors → SQLite → Intelligence Pipeline → REST API / WebSocket → React Dashboard
                                                                                → Settings Page
```

**Backend modules** (`src/`):
- `collectors/` — `Collector` trait with 6 implementations (rss, hackernews, reddit, stocks, weather, github). Add new sources by implementing the trait and registering in `main.rs`.
- `intelligence/` — Two-stage AI pipeline: `local_llm.rs` (Ollama) for fast filtering, `remote_llm.rs` for deep analysis. Supports 7 providers: Claude, OpenAI, Gemini, DeepSeek, GitHub Copilot, MiniMax, GLM. Orchestrated by `IntelligencePipeline` in `mod.rs`. Sub-modules: `scorer.rs`, `summarizer.rs`, `tagger.rs`.
- `storage/` — SQLite database abstraction. `models.rs` defines `RawItem`, `Item`, `Score`, `Summary`, `Tag`, `CollectorRun`, `ProviderSetting`. Tables include `provider_settings` for persisting API keys.
- `config/` — YAML config loading with env var substitution (`shellexpand`). Schema in `types.rs`.
- `scheduler/` — Spawns async tasks for each collector on configured intervals.
- `server/` — Axum router. `api.rs` for feed/collector REST endpoints, `settings.rs` for provider CRUD + test endpoints, `ws.rs` for WebSocket broadcast.

**Frontend** (`web/src/`):
- React 19 + TypeScript + Tailwind CSS + shadcn/ui components, built with Vite
- `react-router-dom` for routing: `/` (Dashboard) and `/settings` (AI Provider Settings)
- `components/ui/` — shadcn-style components (Button, Input, Card, Badge, Skeleton)
- `components/widgets/` — Dashboard widgets (NewsFeed, Digest, Weather, StockTicker, Trending, CollectorStatus)
- `components/settings/` — ProviderCard for configuring AI provider API keys
- `lib/` — `utils.ts` (cn helper), `time.ts` (timeAgo), `providers.ts` (provider metadata)
- `hooks/` — `useWebSocket.ts` for real-time updates, `useWidgetData.ts` for data fetching

**Configuration**: `config/default.yaml` (copy from `config/example.yaml`). Supports env var substitution for secrets. Provider API keys can also be configured via the Settings UI (stored in SQLite).

**Key endpoints**:
- Feed: `/api/feed`, `/api/feed/digest`
- Collectors: `/api/collectors`, `/api/collectors/{id}/run`
- Settings: `/api/settings/providers`, `/api/settings/providers/{id}`, `/api/settings/providers/{id}/test`, `/api/settings/providers/{id}/activate`
- Other: `/api/health`, `/api/ws`
