use crate::models::graph::{AudioGraph, Link, Node, NodeType, Port, PortDirection};
use anyhow::Result;
use std::collections::HashMap;

#[derive(Debug)]
pub struct GraphManager {
    graph: AudioGraph,
    // Auxiliary maps for O(1) lookups if needed,
    // but for small graphs, linear scan is fine.
    // We will stick to the struct fields for now.
}

impl GraphManager {
    pub fn new() -> Self {
        Self {
            graph: AudioGraph {
                nodes: Vec::new(),
                links: Vec::new(),
            },
        }
    }

    pub fn get_graph(&self) -> &AudioGraph {
        &self.graph
    }

    pub fn clear(&mut self) {
        self.graph.nodes.clear();
        self.graph.links.clear();
    }

    pub fn add_node(&mut self, node: Node) {
        // Idempotency: if node exists, update it or ignore?
        // For PW events, usually we get "Added" once.
        // We'll replace if exists to be safe.
        self.graph.nodes.retain(|n| n.id != node.id);
        self.graph.nodes.push(node);
    }

    pub fn remove_node(&mut self, id: u32) {
        self.graph.nodes.retain(|n| n.id != id);
        // Also remove links connected to this node
        self.graph
            .links
            .retain(|l| l.output_node != id && l.input_node != id);
    }

    pub fn add_port(&mut self, port: Port) {
        if let Some(node) = self.graph.nodes.iter_mut().find(|n| n.id == port.node_id) {
            node.ports.retain(|p| p.id != port.id);
            node.ports.push(port);
        } else {
            // Warn? or Store orphan ports?
            // PipeWire sometimes sends port info before node info?
            // Usually Node comes first. We'll ignore orphans for now or handle them if it becomes an issue.
            eprintln!("Warning: Port added for unknown node {}", port.node_id);
        }
    }

    pub fn remove_port(&mut self, id: u32) {
        for node in &mut self.graph.nodes {
            node.ports.retain(|p| p.id != id);
        }
        self.graph
            .links
            .retain(|l| l.output_port != id && l.input_port != id);
    }

    pub fn add_link(&mut self, link: Link) {
        self.graph.links.retain(|l| l.id != link.id);
        self.graph.links.push(link);
    }

    pub fn remove_link(&mut self, id: u32) {
        self.graph.links.retain(|l| l.id != id);
    }
}
