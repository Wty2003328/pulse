// Intelligence pipeline — Phase 3 implementation.
// This module will contain:
// - local_llm.rs  — Ollama integration for cheap filtering
// - remote_llm.rs — Claude/OpenAI integration for deep analysis
// - scorer.rs     — Relevance scoring engine
// - summarizer.rs — Article summarization
// - tagger.rs     — Auto-categorization & tagging
//
// For Phase 1, the intelligence layer is a no-op passthrough.
// Items are collected and stored without scoring or summarization.

use anyhow::Result;
use crate::storage::models::RawItem;

/// Placeholder intelligence pipeline. In Phase 3, this will run the
/// two-stage LLM scoring and summarization.
pub async fn process_items(_items: &[RawItem]) -> Result<()> {
    // Phase 1: no-op — items pass through without processing
    // Phase 3 will add:
    //   1. Local LLM relevance filtering (Ollama)
    //   2. Remote LLM scoring + summarization (Claude/OpenAI)
    //   3. Auto-tagging and clustering
    Ok(())
}
