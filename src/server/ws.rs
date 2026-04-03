use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
};
use std::sync::Arc;
use tokio::sync::broadcast;

use super::AppState;

/// Shared broadcast channel for pushing updates to all connected clients.
#[derive(Clone)]
pub struct WsBroadcast {
    tx: broadcast::Sender<String>,
}

impl WsBroadcast {
    pub fn new() -> Self {
        let (tx, _) = broadcast::channel(128);
        Self { tx }
    }

    /// Send a notification to all connected WebSocket clients.
    pub fn notify(&self, event: &str) {
        let _ = self.tx.send(event.to_string());
    }

    /// Subscribe to receive notifications.
    pub fn subscribe(&self) -> broadcast::Receiver<String> {
        self.tx.subscribe()
    }
}

/// WebSocket upgrade handler.
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

/// Handle an individual WebSocket connection.
async fn handle_socket(mut socket: WebSocket, state: AppState) {
    let mut rx = state.ws_broadcast.subscribe();

    // Send a welcome message
    let _ = socket
        .send(Message::Text(
            serde_json::json!({"type": "connected", "message": "Pulse WebSocket connected"})
                .to_string().into(),
        ))
        .await;

    loop {
        tokio::select! {
            // Forward broadcast messages to this client
            msg = rx.recv() => {
                match msg {
                    Ok(text) => {
                        if socket.send(Message::Text(text.into())).await.is_err() {
                            break; // Client disconnected
                        }
                    }
                    Err(_) => break,
                }
            }
            // Handle incoming messages from the client (ping/pong, close)
            msg = socket.recv() => {
                match msg {
                    Some(Ok(Message::Close(_))) | None => break,
                    Some(Ok(Message::Ping(data))) => {
                        if socket.send(Message::Pong(data)).await.is_err() {
                            break;
                        }
                    }
                    _ => {} // Ignore other messages
                }
            }
        }
    }

    tracing::debug!("WebSocket client disconnected");
}
