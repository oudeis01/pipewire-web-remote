use axum::{
    extract::{
        ws::{WebSocket, WebSocketUpgrade, Message},
        State,
    },
    response::Response,
};
use crate::AppState;
use futures::{sink::SinkExt, stream::StreamExt};
use tracing::info;

pub async fn handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> Response {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: AppState) {
    let (mut sender, mut _receiver) = socket.split();
    
    // Subscribe to broadcast events
    let mut rx = state.broadcaster.subscribe();
    info!("WebSocket client subscribed to logs");

    loop {
        match rx.recv().await {
            Ok(event) => {
                if let Ok(msg) = serde_json::to_string(&event) {
                    if sender.send(Message::Text(msg)).await.is_err() {
                        break;
                    }
                }
            }
            Err(tokio::sync::broadcast::error::RecvError::Lagged(n)) => {
                eprintln!("WS client lagged by {} messages", n);
                continue;
            }
            Err(_) => break,
        }
    }
}
