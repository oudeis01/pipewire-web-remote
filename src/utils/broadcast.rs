use crate::models::device::AudioDevice;
use crate::models::graph::{Link, Port};
use serde::Serialize;
use tokio::sync::broadcast;

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "type", content = "data")]
pub enum ServerEvent {
    DeviceAdded(AudioDevice),
    DeviceRemoved(u32),
    VolumeChanged {
        id: u32,
        volume: f32,
        #[serde(skip_serializing_if = "Option::is_none")]
        timestamp: Option<u64>,
    },
    PortAdded(Port),
    PortRemoved(u32),
    LinkAdded(Link),
    LinkRemoved(u32),
    Log(String),
}

pub struct EventBroadcaster {
    sender: broadcast::Sender<ServerEvent>,
}

impl EventBroadcaster {
    pub fn new() -> Self {
        let (sender, _) = broadcast::channel(1000); // Increased buffer for logs
        Self { sender }
    }

    pub fn subscribe(&self) -> broadcast::Receiver<ServerEvent> {
        self.sender.subscribe()
    }

    pub fn send(&self, event: ServerEvent) {
        let _ = self.sender.send(event);
    }
}
