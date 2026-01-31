export class GraphCanvas extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.graph = { nodes: [], links: [] };
        this.nodePositions = new Map(); // id -> {x, y}
    }

    connectedCallback() {
        this.render();
    }

    setGraph(graph) {
        this.graph = graph;
        this.layout();
        this.draw();
    }

    layout() {
        // Simple 3-column layout
        // Col 1: Sources (Audio/Source) & Input Ports
        // Col 2: Apps / Filters
        // Col 3: Sinks (Audio/Sink) & Output Ports
        
        // Actually, let's just differentiate by Node Type or direction
        // For now, simple grid
        const nodes = this.graph.nodes;
        const xSpacing = 300;
        const ySpacing = 120;
        
        let col1 = 0, col2 = 0, col3 = 0;
        
        nodes.forEach(node => {
            if (this.nodePositions.has(node.id)) return; // Keep existing pos
            
            let x = 0, y = 0;
            // Heuristic based on type
            if (node.node_type === 'Device') {
                 // Check ports to see if it's sink or source
                 const hasIn = node.ports.some(p => p.direction === 'Input');
                 const hasOut = node.ports.some(p => p.direction === 'Output');
                 
                 if (hasIn && !hasOut) {
                     x = xSpacing * 2; // Sink (Right)
                     y = col3++ * ySpacing;
                 } else if (!hasIn && hasOut) {
                     x = 0; // Source (Left)
                     y = col1++ * ySpacing;
                 } else {
                     x = xSpacing; // Duplex / Middle
                     y = col2++ * ySpacing;
                 }
            } else {
                x = xSpacing; // App (Middle)
                y = col2++ * ySpacing;
            }
            
            this.nodePositions.set(node.id, { x: x + 50, y: y + 50 });
        });
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    height: 600px;
                    background: #1a1a1a;
                    overflow: hidden;
                }
                svg {
                    width: 100%;
                    height: 100%;
                }
                .node rect {
                    fill: #333;
                    stroke: #555;
                    stroke-width: 2;
                    rx: 8;
                }
                .node text {
                    fill: #eee;
                    font-family: sans-serif;
                    font-size: 14px;
                    pointer-events: none;
                }
                .port {
                    fill: #777;
                    stroke: none;
                    cursor: pointer;
                }
                .port:hover {
                    fill: #fff;
                }
                .link {
                    stroke: #007aff;
                    stroke-width: 2;
                    fill: none;
                    opacity: 0.6;
                }
                .link:hover {
                    stroke-width: 4;
                    opacity: 1;
                    cursor: pointer;
                }
            </style>
            <svg id="svg-root">
                <g id="links-layer"></g>
                <g id="nodes-layer"></g>
            </svg>
        `;
    }

    draw() {
        const svg = this.shadowRoot.getElementById('svg-root');
        const nodesLayer = this.shadowRoot.getElementById('nodes-layer');
        const linksLayer = this.shadowRoot.getElementById('links-layer');
        
        if (!svg) return;

        // Clear existing
        nodesLayer.innerHTML = '';
        linksLayer.innerHTML = '';

        // Draw Nodes
        this.graph.nodes.forEach(node => {
            const pos = this.nodePositions.get(node.id) || {x:0, y:0};
            const width = 180;
            const height = 40 + (node.ports.length * 20); // Dynamic height
            
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('class', 'node');
            g.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
            g.dataset.id = node.id;
            
            // Box
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('width', width);
            rect.setAttribute('height', height);
            g.appendChild(rect);
            
            // Label
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', 10);
            text.setAttribute('y', 25);
            text.textContent = node.name;
            g.appendChild(text);
            
            // Ports
            node.ports.forEach((port, idx) => {
                const pCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                pCircle.setAttribute('class', 'port');
                pCircle.setAttribute('r', 6);
                pCircle.dataset.id = port.id;
                pCircle.dataset.nodeId = node.id;
                pCircle.dataset.direction = port.direction;
                
                // Input left, Output right
                const px = port.direction === 'Input' ? 0 : width;
                const py = 50 + (idx * 20);
                
                pCircle.setAttribute('cx', px);
                pCircle.setAttribute('cy', py);
                
                g.appendChild(pCircle);
            });
            
            nodesLayer.appendChild(g);
        });

        // Draw Links
        this.graph.links.forEach(link => {
            const outNode = this.graph.nodes.find(n => n.id === link.output_node);
            const inNode = this.graph.nodes.find(n => n.id === link.input_node);
            
            if (!outNode || !inNode) return;
            
            const outPos = this.nodePositions.get(outNode.id);
            const inPos = this.nodePositions.get(inNode.id);
            
            // Find port Y offset (simplified)
            // Ideally we need map of port -> Y
            const outPortIdx = outNode.ports.findIndex(p => p.id === link.output_port);
            const inPortIdx = inNode.ports.findIndex(p => p.id === link.input_port);
            
            if (outPortIdx === -1 || inPortIdx === -1) return;
            
            const x1 = outPos.x + 180; // Output is on right
            const y1 = outPos.y + 50 + (outPortIdx * 20);
            
            const x2 = inPos.x; // Input is on left
            const y2 = inPos.y + 50 + (inPortIdx * 20);
            
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('class', 'link');
            
            // Cubic Bezier
            const cp1x = x1 + 100;
            const cp1y = y1;
            const cp2x = x2 - 100;
            const cp2y = y2;
            
            path.setAttribute('d', `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`);
            path.dataset.id = link.id;
            
            linksLayer.appendChild(path);
        });
    }
}

customElements.define('graph-canvas', GraphCanvas);
