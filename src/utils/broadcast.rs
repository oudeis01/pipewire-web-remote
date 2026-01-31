use crate::models::device::AudioDevice;
use serde::Serialize;
use tokio::sync::broadcast;

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "type", content = "data")]
pub enum ServerEvent {
    DeviceAdded(AudioDevice),
    DeviceRemoved(u32),
    VolumeChanged { id: u32, volume: f32 },
}

pub struct EventBroadcaster {
    sender: broadcast::Sender<ServerEvent>,
}

impl EventBroadcaster {
    pub fn new() -> Self {
        let (sender, _) = broadcast::channel(100);
        Self { sender }
    }

    pub fn subscribe(&self) -> broadcast::Receiver<ServerEvent> {
        self.sender.subscribe()
    }

    pub fn send(&self, event: ServerEvent) {
        // We ignore errors if there are no listeners
        let _ = self.sender.send(event);
    }
}
