use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DeviceType {
    Sink,
    Source,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DeviceState {
    Running,
    Suspended,
    Idle,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Channel {
    pub index: u32,
    pub name: String,
    pub volume: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioDevice {
    pub id: u32,
    pub name: String,
    pub description: String,
    pub device_type: DeviceType,
    pub state: DeviceState,
    pub channels: Vec<Channel>,
    pub muted: bool,
    pub base_volume: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stream {
    pub id: u32,
    pub application_name: String,
    pub sink_id: u32,
    pub volume: f32,
    pub muted: bool,
}
