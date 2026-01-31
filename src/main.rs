use axum::{
    Router,
    routing::get,
};
use tower_http::services::ServeDir;
use std::sync::Arc;
use parking_lot::RwLock;
use tracing::info;

mod api;
mod audio;
mod models;

use audio::controller::AudioController;

#[derive(Clone)]
pub struct AppState {
    pub audio: Arc<RwLock<AudioController>>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter("audio_remote=debug,axum=info")
        .init();

    info!("Starting Audio Remote Control Server...");

    let audio = Arc::new(RwLock::new(
        AudioController::new()?
    ));

    let state = AppState {
        audio,
    };

    let app = Router::new()
        .nest_service("/", ServeDir::new("web"))
        .route("/api/devices", get(api::devices::list_devices))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8449").await?;
    info!("Server running at http://0.0.0.0:8449");
    
    axum::serve(listener, app).await?;
    
    Ok(())
}
