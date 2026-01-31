use crate::utils::broadcast::{EventBroadcaster, ServerEvent};
use std::sync::Arc;
use tracing::Subscriber;
use tracing_subscriber::Layer;

pub struct WsLogLayer {
    broadcaster: Arc<EventBroadcaster>,
}

impl WsLogLayer {
    pub fn new(broadcaster: Arc<EventBroadcaster>) -> Self {
        Self { broadcaster }
    }
}

impl<S: Subscriber> Layer<S> for WsLogLayer {
    fn on_event(
        &self,
        event: &tracing::Event<'_>,
        _ctx: tracing_subscriber::layer::Context<'_, S>,
    ) {
        let target = event.metadata().target();

        // Filter out logs from web server components to prevent infinite loops
        if target.starts_with("axum::")
            || target.starts_with("hyper::")
            || target.starts_with("tokio_tungstenite::")
            || target.starts_with("tower_http::")
        {
            return;
        }

        let mut visitor = LogVisitor::new();
        event.record(&mut visitor);

        if !visitor.message.is_empty() {
            let level = event.metadata().level().to_string();
            let log_line = format!("[{}] [{}] {}", level, target, visitor.message);
            self.broadcaster.send(ServerEvent::Log(log_line));
        }
    }
}

struct LogVisitor {
    message: String,
}

impl LogVisitor {
    fn new() -> Self {
        Self {
            message: String::new(),
        }
    }
}

impl tracing::field::Visit for LogVisitor {
    fn record_str(&mut self, field: &tracing::field::Field, value: &str) {
        if field.name() == "message" || self.message.is_empty() {
            self.message = value.to_string();
        }
    }

    fn record_debug(&mut self, field: &tracing::field::Field, value: &dyn std::fmt::Debug) {
        if field.name() == "message" || self.message.is_empty() {
            let debug_val = format!("{:?}", value);
            self.message = if debug_val.starts_with('"') && debug_val.ends_with('"') {
                debug_val[1..debug_val.len() - 1].to_string()
            } else {
                debug_val
            };
        }
    }
}
