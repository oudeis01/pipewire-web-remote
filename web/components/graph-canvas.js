export class GraphCanvas extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.graph = { nodes: [], links: [] };
        this.nodePositions = new Map();
        
        this.dragState = {
            active: false,
            startPort: null,
            currentPos: { x: 0, y: 0 }
        };
    }

    connectedCallback() {
        this.render();
        this.setupEvents();
    }

    setGraph(graph) {
        this.graph = graph;
        this.layout();
        this.draw();
    }

    layout() {
        const nodes = this.graph.nodes;
        const xSpacing = 300;
        const ySpacing = 120;
        
        let col1 = 0, col2 = 0, col3 = 0;
        
        nodes.forEach(node => {
            if (this.nodePositions.has(node.id)) return;
            
            let x = 0, y = 0;
            if (node.node_type === 'Device') {
                 const hasIn = node.ports.some(p => p.direction === 'Input');
                 const hasOut = node.ports.some(p => p.direction === 'Output');
                 
                 if (hasIn && !hasOut) {
                     x = xSpacing * 2;
                     y = col3++ * ySpacing;
                 } else if (!hasIn && hasOut) {
                     x = 0;
                     y = col1++ * ySpacing;
                 } else {
                     x = xSpacing;
                     y = col2++ * ySpacing;
                 }
            } else {
                x = xSpacing;
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
                    user-select: none;
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
                    transition: fill 0.2s;
                }
                .port:hover {
                    fill: #fff;
                    stroke: #007aff;
                    stroke-width: 2;
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
                .drag-line {
                    stroke: #ff9500;
                    stroke-width: 2;
                    fill: none;
                    stroke-dasharray: 5,5;
                    pointer-events: none;
                }
            </style>
            <svg id="svg-root">
                <g id="links-layer"></g>
                <g id="nodes-layer"></g>
                <path id="drag-line" class="drag-line" d="" style="display: none;"></path>
            </svg>
        `;
    }

    draw() {
        const svg = this.shadowRoot.getElementById('svg-root');
        const nodesLayer = this.shadowRoot.getElementById('nodes-layer');
        const linksLayer = this.shadowRoot.getElementById('links-layer');
        
        if (!svg) return;

        nodesLayer.innerHTML = '';
        linksLayer.innerHTML = '';

        // Draw Links
        this.graph.links.forEach(link => {
            const path = this.createLinkPath(link);
            if (path) linksLayer.appendChild(path);
        });

        // Draw Nodes
        this.graph.nodes.forEach(node => {
            const g = this.createNodeGroup(node);
            nodesLayer.appendChild(g);
        });
    }

    createNodeGroup(node) {
        const pos = this.nodePositions.get(node.id) || {x:0, y:0};
        const width = 180;
        const height = 40 + (node.ports.length * 20);
        
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'node');
        g.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
        g.dataset.id = node.id;
        
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', width);
        rect.setAttribute('height', height);
        g.appendChild(rect);
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', 10);
        text.setAttribute('y', 25);
        text.textContent = node.name;
        g.appendChild(text);
        
        node.ports.forEach((port, idx) => {
            const pCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            pCircle.setAttribute('class', 'port');
            pCircle.setAttribute('r', 6);
            pCircle.dataset.id = port.id;
            pCircle.dataset.nodeId = node.id;
            pCircle.dataset.direction = port.direction;
            
            const px = port.direction === 'Input' ? 0 : width;
            const py = 50 + (idx * 20);
            
            pCircle.setAttribute('cx', px);
            pCircle.setAttribute('cy', py);
            
            // Store absolute position for linking
            port._absPos = { x: pos.x + px, y: pos.y + py };
            
            g.appendChild(pCircle);
        });
        
        return g;
    }

    createLinkPath(link) {
        const outNode = this.graph.nodes.find(n => n.id === link.output_node);
        const inNode = this.graph.nodes.find(n => n.id === link.input_node);
        
        if (!outNode || !inNode) return null;
        
        const outPos = this.nodePositions.get(outNode.id);
        const inPos = this.nodePositions.get(inNode.id);
        
        const outPortIdx = outNode.ports.findIndex(p => p.id === link.output_port);
        const inPortIdx = inNode.ports.findIndex(p => p.id === link.input_port);
        
        if (outPortIdx === -1 || inPortIdx === -1) return null;
        
        const x1 = outPos.x + 180;
        const y1 = outPos.y + 50 + (outPortIdx * 20);
        const x2 = inPos.x;
        const y2 = inPos.y + 50 + (inPortIdx * 20);
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'link');
        
        const cp1x = x1 + 100;
        const cp2x = x2 - 100;
        
        path.setAttribute('d', `M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`);
        path.dataset.id = link.id;
        path.onclick = (e) => {
            e.stopPropagation();
            this.dispatchEvent(new CustomEvent('link-delete', {
                detail: { linkId: link.id },
                bubbles: true,
                composed: true
            }));
        };
        
        return path;
    }

    setupEvents() {
        const svg = this.shadowRoot.getElementById('svg-root');
        
        svg.addEventListener('mousedown', (e) => this.onDragStart(e));
        document.addEventListener('mousemove', (e) => this.onDragMove(e));
        document.addEventListener('mouseup', (e) => this.onDragEnd(e));
    }

    onDragStart(e) {
        const target = e.composedPath().find(el => el.classList && el.classList.contains('port'));
        if (!target) return;
        
        const rect = this.getBoundingClientRect();
        const portId = parseInt(target.dataset.id);
        const nodeId = parseInt(target.dataset.nodeId);
        const direction = target.dataset.direction;
        
        // Find port absolute position
        const node = this.graph.nodes.find(n => n.id === nodeId);
        const portIdx = node.ports.findIndex(p => p.id === portId);
        const nodePos = this.nodePositions.get(nodeId);
        
        const px = direction === 'Input' ? 0 : 180;
        const py = 50 + (portIdx * 20);
        
        const startX = nodePos.x + px;
        const startY = nodePos.y + py;
        
        this.dragState = {
            active: true,
            startPort: { id: portId, nodeId, direction, x: startX, y: startY },
        };
        
        const dragLine = this.shadowRoot.getElementById('drag-line');
        dragLine.style.display = 'block';
        dragLine.setAttribute('d', `M ${startX} ${startY} L ${startX} ${startY}`);
    }

    onDragMove(e) {
        if (!this.dragState.active) return;
        
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const start = this.dragState.startPort;
        const dragLine = this.shadowRoot.getElementById('drag-line');
        
        // Draw bezier to mouse
        const cp1x = start.direction === 'Output' ? start.x + 50 : start.x - 50;
        const cp2x = start.direction === 'Output' ? x - 50 : x + 50;
        
        dragLine.setAttribute('d', `M ${start.x} ${start.y} C ${cp1x} ${start.y}, ${cp2x} ${y}, ${x} ${y}`);
    }

    onDragEnd(e) {
        if (!this.dragState.active) return;
        
        const dragLine = this.shadowRoot.getElementById('drag-line');
        dragLine.style.display = 'none';
        
        // Check drop target
        // We need to use elementsFromPoint on shadow root or calculate geometry
        // Since event target might be the svg background if we dropped on top
        
        // Actually composedPath might help if we are over a port
        const target = e.composedPath().find(el => el.classList && el.classList.contains('port'));
        
        if (target) {
            const endPortId = parseInt(target.dataset.id);
            const endNodeId = parseInt(target.dataset.nodeId);
            const endDirection = target.dataset.direction;
            
            const start = this.dragState.startPort;
            
            // Validate link (Output -> Input)
            if (start.direction !== endDirection && start.nodeId !== endNodeId) {
                const source = start.direction === 'Output' ? start : { id: endPortId, nodeId: endNodeId };
                const sink = start.direction === 'Input' ? start : { id: endPortId, nodeId: endNodeId };
                
                this.dispatchEvent(new CustomEvent('link-create', {
                    detail: {
                        outputNode: source.nodeId,
                        outputPort: source.id,
                        inputNode: sink.nodeId,
                        inputPort: sink.id
                    },
                    bubbles: true,
                    composed: true
                }));
            }
        }
        
        this.dragState.active = false;
        this.dragState.startPort = null;
    }
}

customElements.define('graph-canvas', GraphCanvas);
