use axum::{
    extract::State,
    Json,
};
use crate::AppState;
use crate::models::graph::AudioGraph;

pub async fn get_graph(
    State(state): State<AppState>,
) -> Json<AudioGraph> {
    let graph_manager = state.graph.read();
    Json(graph_manager.get_graph().clone())
}

// TODO: Implement create_link and delete_link
