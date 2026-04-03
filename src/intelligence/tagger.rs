use anyhow::Result;
use tracing::debug;

use super::remote_llm::RemoteLLM;
use crate::storage::models::{RawItem, Tag};

/// Auto-tagging engine using remote LLM
pub struct Tagger;

impl Tagger {
    /// Auto-generate tags for an item
    pub async fn auto_tag(remote_llm: &RemoteLLM, item: &RawItem) -> Result<Vec<Tag>> {
        let text = item.content.as_deref().unwrap_or(&item.title);

        let prompt = format!(
            r#"Analyze the following article and generate 3-5 relevant category tags.

Title: {}

Content:
{}

Respond with ONLY a JSON array of tags:
["tag1", "tag2", "tag3"]

Tags should be lowercase, single words or short phrases, separated by hyphens."#,
            item.title, text
        );

        let response = remote_llm.generate(&prompt).await?;

        // Parse JSON array response
        let tags = match serde_json::from_str::<Vec<String>>(&response) {
            Ok(tag_list) => {
                debug!("Auto-generated tags for '{}': {:?}", item.title, tag_list);
                tag_list
                    .into_iter()
                    .map(|tag| Tag {
                        item_id: "placeholder".to_string(), // Will be set by orchestrator
                        tag: tag.to_lowercase().replace(" ", "-"),
                    })
                    .collect()
            }
            Err(e) => {
                debug!("Failed to parse tags response: {}", e);
                // Fallback: try to extract words from the response
                let tag_list: Vec<Tag> = response
                    .split(',')
                    .map(|t| t.trim().to_lowercase().replace(" ", "-"))
                    .filter(|t| !t.is_empty())
                    .take(5)
                    .map(|tag| Tag {
                        item_id: "placeholder".to_string(),
                        tag,
                    })
                    .collect();
                tag_list
            }
        };

        Ok(tags)
    }
}
