use axum::{
    extract::State,
    Json,
};
use crate::AppState;
use crate::models::device::AudioDevice;

pub async fn list_devices(
    State(state): State<AppState>,
) -> Json<Vec<AudioDevice>> {
    let audio = state.audio.read();
    Json(audio.list_devices())
}
