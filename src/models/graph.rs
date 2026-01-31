use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NodeType {
    Device,
    Application,
    Filter,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PortDirection {
    Input,
    Output,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Port {
    pub id: u32,
    pub node_id: u32,
    pub name: String,
    pub direction: PortDirection,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Node {
    pub id: u32,
    pub name: String,
    pub node_type: NodeType,
    pub ports: Vec<Port>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Link {
    pub id: u32,
    pub output_node: u32,
    pub output_port: u32,
    pub input_node: u32,
    pub input_port: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioGraph {
    pub nodes: Vec<Node>,
    pub links: Vec<Link>,
}
