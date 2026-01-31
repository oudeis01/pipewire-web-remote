use crate::models::graph::{AudioGraph, Link, Node, Port};
use std::collections::HashMap;

#[derive(Debug)]
pub struct GraphManager {
    graph: AudioGraph,
    orphan_ports: HashMap<u32, Vec<Port>>,
}

impl GraphManager {
    pub fn new() -> Self {
        Self {
            graph: AudioGraph {
                nodes: Vec::new(),
                links: Vec::new(),
            },
            orphan_ports: HashMap::new(),
        }
    }

    pub fn get_graph(&self) -> &AudioGraph {
        &self.graph
    }

    pub fn clear(&mut self) {
        self.graph.nodes.clear();
        self.graph.links.clear();
        self.orphan_ports.clear();
    }

    pub fn add_node(&mut self, mut node: Node) {
        self.graph.nodes.retain(|n| n.id != node.id);

        // Attach orphans if any
        if let Some(ports) = self.orphan_ports.remove(&node.id) {
            for p in ports {
                if !node.ports.iter().any(|np| np.id == p.id) {
                    node.ports.push(p);
                }
            }
        }

        self.graph.nodes.push(node);
    }

    pub fn remove_node(&mut self, id: u32) {
        self.graph.nodes.retain(|n| n.id != id);
        self.graph
            .links
            .retain(|l| l.output_node != id && l.input_node != id);
    }

    pub fn add_port(&mut self, port: Port) {
        if let Some(node) = self.graph.nodes.iter_mut().find(|n| n.id == port.node_id) {
            // Remove existing if update
            node.ports.retain(|p| p.id != port.id);
            node.ports.push(port);
        } else {
            // Store orphan
            self.orphan_ports
                .entry(port.node_id)
                .or_default()
                .push(port);
        }
    }

    pub fn remove_port(&mut self, id: u32) {
        for node in &mut self.graph.nodes {
            node.ports.retain(|p| p.id != id);
        }
        // Also check orphans
        for ports in self.orphan_ports.values_mut() {
            ports.retain(|p| p.id != id);
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
