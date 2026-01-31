use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use tracing::info;
use crate::AppState;
use crate::models::device::AudioDevice;

pub async fn list_devices(
    State(state): State<AppState>,
) -> Json<Vec<AudioDevice>> {
    let audio = state.audio.read();
    Json(audio.list_devices())
}

#[derive(Deserialize)]
pub struct SetVolumeRequest {
    pub volume: f32,
    pub timestamp: Option<u64>,
}

pub async fn set_volume(
    State(state): State<AppState>,
    Path(id): Path<u32>,
    Json(payload): Json<SetVolumeRequest>,
) -> StatusCode {
    info!("API Request: Set volume for device {} to {:.2}", id, payload.volume);
    // 1. Command PipeWire
    state.pw_handler.set_volume(id, payload.volume, payload.timestamp);
    
    StatusCode::OK
}
