use axum::{
    extract::{State, Path},
    Json,
    http::StatusCode,
};
use crate::AppState;
use crate::graph::preset::Preset;

pub async fn list_presets(
    State(state): State<AppState>,
) -> Json<Vec<String>> {
    let list = state.preset_manager.list_presets().await.unwrap_or_default();
    Json(list)
}

pub async fn save_preset(
    State(state): State<AppState>,
    Json(preset): Json<Preset>,
) -> StatusCode {
    match state.preset_manager.save_preset(&preset).await {
        Ok(_) => StatusCode::OK,
        Err(e) => {
            eprintln!("Failed to save preset: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}

pub async fn load_preset(
    State(state): State<AppState>,
    Path(name): Path<String>,
) -> StatusCode {
    let preset = match state.preset_manager.load_preset(&name).await {
        Ok(p) => p,
        Err(_) => return StatusCode::NOT_FOUND,
    };

    let graph = state.graph.read();
    let current_nodes = &graph.get_graph().nodes;

    for link_spec in preset.links {
        // Resolve Names to IDs
        let out_node = current_nodes.iter().find(|n| n.name == link_spec.output_node);
        let in_node = current_nodes.iter().find(|n| n.name == link_spec.input_node);

        if let (Some(out), Some(input)) = (out_node, in_node) {
            let out_port = out.ports.iter().find(|p| p.name == link_spec.output_port);
            let in_port = input.ports.iter().find(|p| p.name == link_spec.input_port);

            if let (Some(op), Some(ip)) = (out_port, in_port) {
                state.pw_handler.create_link(out.id, op.id, input.id, ip.id);
            }
        }
    }

    StatusCode::OK
}
