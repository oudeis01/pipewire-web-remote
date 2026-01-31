use axum::{
    extract::State,
    Json,
    http::StatusCode,
};
use serde::Deserialize;
use crate::AppState;
use crate::models::graph::AudioGraph;

pub async fn get_graph(
    State(state): State<AppState>,
) -> Json<AudioGraph> {
    let graph_manager = state.graph.read();
    Json(graph_manager.get_graph().clone())
}

#[derive(Deserialize)]
pub struct CreateLinkRequest {
    pub output_node: u32,
    pub output_port: u32,
    pub input_node: u32,
    pub input_port: u32,
}

pub async fn create_link(
    State(state): State<AppState>,
    Json(payload): Json<CreateLinkRequest>,
) -> StatusCode {
    state.pw_handler.create_link(
        payload.output_node,
        payload.output_port,
        payload.input_node,
        payload.input_port
    );
    StatusCode::ACCEPTED
}

#[derive(Deserialize)]
pub struct DeleteLinkRequest {
    #[serde(rename = "linkId")]
    pub link_id: u32,
}

pub async fn delete_link(
    State(state): State<AppState>,
    Json(payload): Json<DeleteLinkRequest>,
) -> StatusCode {
    state.pw_handler.delete_link(payload.link_id);
    StatusCode::ACCEPTED
}
