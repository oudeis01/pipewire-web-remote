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
mod graph;

use audio::controller::AudioController;
use audio::pipewire::{PipeWireHandler, PwEvent};
use utils::broadcast::{EventBroadcaster, ServerEvent};
use graph::manager::GraphManager;
use graph::preset::PresetManager;
use models::graph::{Node, NodeType};

#[derive(Clone)]
pub struct AppState {
    pub audio: Arc<RwLock<AudioController>>,
    pub graph: Arc<RwLock<GraphManager>>,
    pub broadcaster: Arc<EventBroadcaster>,
    pub pw_handler: Arc<PipeWireHandler>,
    pub preset_manager: Arc<PresetManager>,
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
    let graph = Arc::new(RwLock::new(
        GraphManager::new()
    ));
    let broadcaster = Arc::new(EventBroadcaster::new());
    let preset_manager = Arc::new(PresetManager::new());
    preset_manager.init().await?;

    // 2. Setup PipeWire Event Channel
    let (event_sender, event_receiver) = unbounded();
    
    // 3. Start PipeWire Handler
    let pw_handler = Arc::new(PipeWireHandler::new(event_sender)?);

    // 4. Spawn Background Task to Process PipeWire Events
    let audio_clone = audio.clone();
    let graph_clone = graph.clone();
    let broadcaster_clone = broadcaster.clone();

    tokio::task::spawn_blocking(move || {
        info!("Event listener started");
        while let Ok(event) = event_receiver.recv() {
            match event {
                PwEvent::DeviceAdded(device) => {
                    info!("Device Added: {} ({})", device.name, device.id);
                    audio_clone.write().add_device(device.clone());
                    broadcaster_clone.send(ServerEvent::DeviceAdded(device.clone()));

                    // Also add to Graph
                    let node = Node {
                        id: device.id,
                        name: device.name,
                        node_type: match device.device_type {
                            models::device::DeviceType::Sink => NodeType::Device,
                            models::device::DeviceType::Source => NodeType::Device,
                        },
                        ports: Vec::new(),
                    };
                    graph_clone.write().add_node(node);
                }
                PwEvent::DeviceRemoved(id) => {
                    info!("Device Removed: {}", id);
                    audio_clone.write().remove_device(id);
                    graph_clone.write().remove_node(id);
                    broadcaster_clone.send(ServerEvent::DeviceRemoved(id));
                }
                PwEvent::VolumeChanged(id, vol) => {
                    info!("Volume Changed: {} -> {}", id, vol);
                    broadcaster_clone.send(ServerEvent::VolumeChanged { id, volume: vol });
                }
                PwEvent::PortAdded(port) => {
                    graph_clone.write().add_port(port.clone());
                    broadcaster_clone.send(ServerEvent::PortAdded(port));
                }
                PwEvent::PortRemoved(id) => {
                    graph_clone.write().remove_port(id);
                    broadcaster_clone.send(ServerEvent::PortRemoved(id));
                }
                PwEvent::LinkAdded(link) => {
                    graph_clone.write().add_link(link.clone());
                    broadcaster_clone.send(ServerEvent::LinkAdded(link));
                }
                PwEvent::LinkRemoved(id) => {
                    graph_clone.write().remove_link(id);
                    broadcaster_clone.send(ServerEvent::LinkRemoved(id));
                }
            }
        }
        error!("Event listener loop ended unexpectedly");
    });

    let state = AppState {
        audio,
        graph,
        broadcaster,
        pw_handler,
        preset_manager,
    };

    let app = Router::new()
        .nest_service("/", ServeDir::new("web"))
        .route("/api/devices", get(api::devices::list_devices))
        .route("/api/graph", get(api::graph::get_graph))
        .route("/api/link/create", axum::routing::post(api::graph::create_link))
        .route("/api/link/delete", axum::routing::post(api::graph::delete_link))
        .route("/api/presets", get(api::presets::list_presets).post(api::presets::save_preset))
        .route("/api/presets/:name/load", axum::routing::post(api::presets::load_preset))
        .route("/ws", get(api::websocket::handler))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8449").await?;
    info!("Server running at http://0.0.0.0:8449");
    
    axum::serve(listener, app).await?;
    
    Ok(())
}
