pub mod types;

use anyhow::{Context, Result};
use std::path::Path;
use types::AppConfig;

/// Load configuration from a YAML file, with environment variable substitution.
pub fn load_config(path: &Path) -> Result<AppConfig> {
    let raw = std::fs::read_to_string(path)
        .with_context(|| format!("Failed to read config file: {}", path.display()))?;

    // Substitute ${ENV_VAR} patterns with actual environment variables
    let expanded = shellexpand::env(&raw)
        .with_context(|| "Failed to expand environment variables in config")?
        .to_string();

    let config: AppConfig = serde_yaml::from_str(&expanded)
        .with_context(|| "Failed to parse config YAML")?;

    tracing::info!("Configuration loaded from {}", path.display());
    Ok(config)
}

/// Find the config file: check CLI arg, then ./config/default.yaml, then ./config/example.yaml
pub fn find_config_path() -> Result<std::path::PathBuf> {
    let candidates = [
        "config/default.yaml",
        "config/config.yaml",
        "config/example.yaml",
    ];

    for candidate in &candidates {
        let path = Path::new(candidate);
        if path.exists() {
            return Ok(path.to_path_buf());
        }
    }

    anyhow::bail!(
        "No config file found. Create config/default.yaml (see config/example.yaml for reference)"
    )
}
