use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tokio::fs;
use anyhow::Result;

#[derive(Debug, Serialize, Deserialize)]
pub struct LinkSpec {
    pub output_node: String,
    pub output_port: String,
    pub input_node: String,
    pub input_port: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Preset {
    pub name: String,
    pub description: String,
    pub links: Vec<LinkSpec>,
}

pub struct PresetManager {
    base_path: PathBuf,
}

impl PresetManager {
    pub fn new() -> Self {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        let path = PathBuf::from(home).join(".config/audio-remote/presets");
        Self { base_path: path }
    }

    pub async fn init(&self) -> Result<()> {
        fs::create_dir_all(&self.base_path).await?;
        Ok(())
    }

    pub async fn list_presets(&self) -> Result<Vec<String>> {
        let mut presets = Vec::new();
        let mut entries = fs::read_dir(&self.base_path).await?;

        while let Some(entry) = entries.next_entry().await? {
            if let Some(name) = entry.file_name().to_str() {
                if name.ends_with(".json") {
                    presets.push(name.trim_end_matches(".json").to_string());
                }
            }
        }
        Ok(presets)
    }

    pub async fn save_preset(&self, preset: &Preset) -> Result<()> {
        let path = self.base_path.join(format!("{}.json", preset.name));
        let content = serde_json::to_string_pretty(preset)?;
        fs::write(path, content).await?;
        Ok(())
    }

    pub async fn load_preset(&self, name: &str) -> Result<Preset> {
        let path = self.base_path.join(format!("{}.json", name));
        let content = fs::read_to_string(path).await?;
        let preset: Preset = serde_json::from_str(&content)?;
        Ok(preset)
    }
}
