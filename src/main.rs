use axum::{
    Router,
    routing::get,
};
use tower_http::services::ServeDir;
use std::sync::Arc;
use parking_lot::RwLock;
use tracing::{info, error};
use crossbeam_channel::unbounded;

mod api;
mod audio;
mod models;
mod utils;

use audio::controller::AudioController;
use audio::pipewire::{PipeWireHandler, PwEvent};
use utils::broadcast::{EventBroadcaster, ServerEvent};

#[derive(Clone)]
pub struct AppState {
    pub audio: Arc<RwLock<AudioController>>,
    pub broadcaster: Arc<EventBroadcaster>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter("audio_remote=debug,axum=info")
        .init();

    info!("Starting Audio Remote Control Server...");

    // 1. Initialize Components
    let audio = Arc::new(RwLock::new(
        AudioController::new()?
    ));
    let broadcaster = Arc::new(EventBroadcaster::new());

    // 2. Setup PipeWire Event Channel
    let (event_sender, event_receiver) = unbounded();
    
    // 3. Start PipeWire Handler
    let _pw_handler = PipeWireHandler::new(event_sender)?;

    // 4. Spawn Background Task to Process PipeWire Events
    let audio_clone = audio.clone();
    let broadcaster_clone = broadcaster.clone();

    tokio::task::spawn_blocking(move || {
        info!("Event listener started");
        while let Ok(event) = event_receiver.recv() {
            match event {
                PwEvent::DeviceAdded(device) => {
                    info!("Device Added: {} ({})", device.name, device.id);
                    audio_clone.write().add_device(device.clone());
                    broadcaster_clone.send(ServerEvent::DeviceAdded(device));
                }
                PwEvent::DeviceRemoved(id) => {
                    info!("Device Removed: {}", id);
                    audio_clone.write().remove_device(id);
                    broadcaster_clone.send(ServerEvent::DeviceRemoved(id));
                }
                PwEvent::VolumeChanged(id, vol) => {
                    info!("Volume Changed: {} -> {}", id, vol);
                    broadcaster_clone.send(ServerEvent::VolumeChanged { id, volume: vol });
                }
            }
        }
        error!("Event listener loop ended unexpectedly");
    });

    let state = AppState {
        audio,
        broadcaster,
    };

    let app = Router::new()
        .nest_service("/", ServeDir::new("web"))
        .route("/api/devices", get(api::devices::list_devices))
        .route("/ws", get(api::websocket::handler))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8449").await?;
    info!("Server running at http://0.0.0.0:8449");
    
    axum::serve(listener, app).await?;
    
    Ok(())
}
