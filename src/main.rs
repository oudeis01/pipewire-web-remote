use axum::{
    Router,
    routing::get,
};
use std::sync::Arc;
use parking_lot::RwLock;
use tracing::{info, error, warn};
use tracing_subscriber::prelude::*;
use crossbeam_channel::unbounded;
use clap::Parser;

mod api;
mod audio;
mod models;
mod utils;
mod graph;
mod cli;
mod systemd;

use audio::controller::AudioController;
use audio::pipewire::{PipeWireHandler, PwEvent};
use utils::broadcast::{EventBroadcaster, ServerEvent};
use utils::logger::WsLogLayer;
use utils::assets::{index_handler, static_handler};
use graph::manager::GraphManager;
use models::graph::{Node, NodeType};

#[derive(Clone)]
pub struct AppState {
    pub audio: Arc<RwLock<AudioController>>,
    pub graph: Arc<RwLock<GraphManager>>,
    pub broadcaster: Arc<EventBroadcaster>,
    pub pw_handler: Arc<PipeWireHandler>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = cli::Cli::parse();

    if let Some(cli::Commands::Systemd { action }) = cli.command {
        match action {
            cli::SystemdAction::Install { enable, now } => {
                tracing_subscriber::fmt::init();
                return systemd::install_user_service(enable, now);
            }
        }
    }

    let broadcaster = Arc::new(EventBroadcaster::new());

    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(tracing_subscriber::EnvFilter::from_default_env()
            .add_directive("pipewire_web_remote=debug".parse()?)
            .add_directive("axum=info".parse()?))
        .with(WsLogLayer::new(broadcaster.clone()))
        .init();

    info!("Starting PipeWire Web Remote Server...");

    // 1. Initialize Components
    let audio = Arc::new(RwLock::new(
        AudioController::new()?
    ));
    let graph = Arc::new(RwLock::new(
        GraphManager::new()
    ));

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
                PwEvent::VolumeChanged(id, vol, timestamp) => {
                    info!("Volume Changed: {} -> {}", id, vol);
                    broadcaster_clone.send(ServerEvent::VolumeChanged { id, volume: vol, timestamp });
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
    };

    let app = Router::new()
        .route("/", get(index_handler))
        .route("/*path", get(static_handler))
        .route("/api/devices", get(api::devices::list_devices))
        .route("/api/device/:id/volume", axum::routing::post(api::devices::set_volume))
        .route("/api/graph", get(api::graph::get_graph))
        .route("/api/link/create", axum::routing::post(api::graph::create_link))
        .route("/api/link/delete", axum::routing::post(api::graph::delete_link))
        .route("/ws", get(api::websocket::handler))
        .with_state(state);

    let addr = cli.get_listen_address();
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    
    info!("Server running at http://{}", addr);
    
    if cli.is_external() {
        warn!("⚠ SECURITY WARNING: Server is listening on ALL interfaces (0.0.0.0)");
        warn!("⚠ External connections are ALLOWED. Check your firewall settings!");
        warn!("⚠ For localhost-only access, remove --allow-external flag");
    } else {
        info!("✓ Server is localhost-only (127.0.0.1)");
        info!("✓ External connections are blocked");
        info!("  To allow external access, use: --allow-external");
    }
    
    axum::serve(listener, app).await?;
    
    Ok(())
}
