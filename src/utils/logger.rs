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
        let mut visitor = LogVisitor::new();
        event.record(&mut visitor);

        if !visitor.message.is_empty() {
            let level = event.metadata().level().to_string();
            let target = event.metadata().target();
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
    fn record_debug(&mut self, field: &tracing::field::Field, value: &dyn std::fmt::Debug) {
        if field.name() == "message" {
            self.message = format!("{:?}", value);
        }
    }
}
