export class GraphCanvas extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.graph = { nodes: [], links: [] };
        this.nodePositions = new Map();
        this.scale = 1.0;
        this.panOffset = { x: 0, y: 0 };
        
        this.dragState = {
            type: null,
            active: false,
            startPort: null,
            targetNodeId: null,
            startPos: { x: 0, y: 0 },
            startPanOffset: { x: 0, y: 0 },
            nodeOffset: { x: 0, y: 0 },
            initialPinchDistance: 0,
            initialPinchScale: 1.0
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
        const ySpacing = 150;
        
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
                    width: 100vw;
                    height: 100vh;
                    background: #1a1a1a;
                    overflow: hidden; 
                    user-select: none;
                }
                svg {
                    width: 100%;
                    height: 100%;
                    touch-action: none;
                }
                .node rect {
                    fill: #333;
                    stroke: #555;
                    stroke-width: 2;
                    cursor: grab;
                }
                .node rect:active {
                    cursor: grabbing;
                    stroke: #007aff;
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
                <g id="viewport">
                    <g id="links-layer"></g>
                    <g id="nodes-layer"></g>
                    <path id="drag-line" class="drag-line" d="" style="display: none;"></path>
                </g>
            </svg>
        `;
    }

    updateViewportTransform() {
        const viewport = this.shadowRoot.getElementById('viewport');
        if (viewport) {
            viewport.setAttribute('transform', `translate(${this.panOffset.x}, ${this.panOffset.y}) scale(${this.scale})`);
        }
    }

    draw() {
        const nodesLayer = this.shadowRoot.getElementById('nodes-layer');
        const linksLayer = this.shadowRoot.getElementById('links-layer');
        
        if (!nodesLayer) return;

        nodesLayer.innerHTML = '';
        linksLayer.innerHTML = '';

        this.graph.links.forEach(link => {
            const path = this.createLinkPath(link);
            if (path) linksLayer.appendChild(path);
        });

        this.graph.nodes.forEach(node => {
            const g = this.createNodeGroup(node);
            nodesLayer.appendChild(g);
        });
        
        this.updateViewportTransform();
    }

    createNodeGroup(node) {
        const pos = this.nodePositions.get(node.id) || {x:0, y:0};
        const width = 200;
        const height = 40 + (node.ports.length * 24);
        
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
        
        const maxLen = 22;
        const displayName = node.name.length > maxLen 
            ? node.name.substring(0, maxLen) + '...' 
            : node.name;
            
        text.textContent = displayName;
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = node.name;
        g.appendChild(title);
        
        g.appendChild(text);
        
        node.ports.forEach((port, idx) => {
            const pCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            pCircle.setAttribute('class', 'port');
            pCircle.setAttribute('r', 7);
            pCircle.dataset.id = port.id;
            pCircle.dataset.nodeId = node.id;
            pCircle.dataset.direction = port.direction;
            
            const px = port.direction === 'Input' ? 0 : width;
            const py = 50 + (idx * 24);
            
            pCircle.setAttribute('cx', px);
            pCircle.setAttribute('cy', py);
            
            port._absPos = { x: pos.x + px, y: pos.y + py };
            
            const pText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            pText.setAttribute('x', port.direction === 'Input' ? 12 : width - 12);
            pText.setAttribute('y', py + 4);
            pText.setAttribute('font-size', '10px');
            pText.setAttribute('text-anchor', port.direction === 'Input' ? 'start' : 'end');
            pText.setAttribute('fill', '#aaa');
            pText.textContent = port.name.substring(0, 15);
            g.appendChild(pText);
            
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
        
        const width = 200;
        const x1 = outPos.x + width;
        const y1 = outPos.y + 50 + (outPortIdx * 24);
        
        const x2 = inPos.x;
        const y2 = inPos.y + 50 + (inPortIdx * 24);
        
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
        
        svg.addEventListener('mousedown', (e) => this.onPointerDown(e));
        document.addEventListener('mousemove', (e) => this.onPointerMove(e));
        document.addEventListener('mouseup', (e) => this.onPointerUp(e));
        
        svg.addEventListener('touchstart', (e) => this.onPointerDown(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.onPointerMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.onPointerUp(e));

        svg.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    }

    getDistance(p1, p2) {
        return Math.sqrt(Math.pow(p2.clientX - p1.clientX, 2) + Math.pow(p2.clientY - p1.clientY, 2));
    }

    normalizeEvent(e) {
        // For touch events, use e.touches for ongoing touches, e.changedTouches for touchend
        if (e.touches && e.touches.length > 0) {
            return {
                clientX: e.touches[0].clientX,
                clientY: e.touches[0].clientY,
                originalEvent: e,
                touches: e.touches
            };
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            // touchend uses changedTouches (e.touches is empty)
            return {
                clientX: e.changedTouches[0].clientX,
                clientY: e.changedTouches[0].clientY,
                originalEvent: e,
                touches: []
            };
        }
        return {
            clientX: e.clientX,
            clientY: e.clientY,
            originalEvent: e,
            touches: []
        };
    }

    onWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.scale *= delta;
        this.scale = Math.max(0.1, Math.min(this.scale, 5.0));
        this.updateViewportTransform();
    }

    onPointerDown(e) {
        const normalized = this.normalizeEvent(e);
        const { clientX, clientY, touches } = normalized;

        if (touches.length === 2) {
            this.dragState = {
                type: 'pinch',
                active: true,
                initialPinchDistance: this.getDistance(touches[0], touches[1]),
                initialPinchScale: this.scale
            };
            return;
        }

        const path = e.composedPath();
        const portTarget = path.find(el => el.classList && el.classList.contains('port'));
        if (portTarget) {
            this.startLinkDrag(portTarget);
            return;
        }

        const nodeTarget = path.find(el => el.classList && el.classList.contains('node'));
        if (nodeTarget) {
            this.startNodeDrag(nodeTarget, normalized);
            return;
        }

        const rect = this.shadowRoot.getElementById('svg-root').getBoundingClientRect();
        this.dragState = {
            type: 'pan',
            active: true,
            startPos: { x: clientX, y: clientY },
            startPanOffset: { ...this.panOffset }
        };
    }

    startLinkDrag(target) {
        const portId = parseInt(target.dataset.id);
        const nodeId = parseInt(target.dataset.nodeId);
        const direction = target.dataset.direction;
        
        const node = this.graph.nodes.find(n => n.id === nodeId);
        const portIdx = node.ports.findIndex(p => p.id === portId);
        const nodePos = this.nodePositions.get(nodeId);
        
        const width = 200;
        const px = direction === 'Input' ? 0 : width;
        const py = 50 + (portIdx * 24);
        
        const startX = nodePos.x + px;
        const startY = nodePos.y + py;
        
        this.dragState = {
            type: 'link',
            active: true,
            startPort: { id: portId, nodeId, direction, x: startX, y: startY },
        };
        
        const dragLine = this.shadowRoot.getElementById('drag-line');
        dragLine.style.display = 'block';
        dragLine.setAttribute('d', `M ${startX} ${startY} L ${startX} ${startY}`);
    }

    startNodeDrag(target, normalized) {
        const nodeId = parseInt(target.dataset.id);
        const pos = this.nodePositions.get(nodeId);
        const rect = this.shadowRoot.getElementById('svg-root').getBoundingClientRect();
        
        const mouseX = (normalized.clientX - rect.left - this.panOffset.x) / this.scale;
        const mouseY = (normalized.clientY - rect.top - this.panOffset.y) / this.scale;

        this.dragState = {
            type: 'node',
            active: true,
            targetNodeId: nodeId,
            nodeOffset: { x: mouseX - pos.x, y: mouseY - pos.y }
        };
    }

    onPointerMove(e) {
        if (!this.dragState.active) return;
        
        const normalized = this.normalizeEvent(e);
        if (normalized.originalEvent.cancelable) {
            normalized.originalEvent.preventDefault();
        }

        const rect = this.shadowRoot.getElementById('svg-root').getBoundingClientRect();
        const { clientX, clientY, touches } = normalized;

        if (this.dragState.type === 'pinch' && touches.length === 2) {
            const currentDistance = this.getDistance(touches[0], touches[1]);
            const scaleFactor = currentDistance / this.dragState.initialPinchDistance;
            this.scale = Math.max(0.1, Math.min(this.dragState.initialPinchScale * scaleFactor, 5.0));
            this.updateViewportTransform();
        } else if (this.dragState.type === 'link') {
            const x = (clientX - rect.left - this.panOffset.x) / this.scale;
            const y = (clientY - rect.top - this.panOffset.y) / this.scale;
            const start = this.dragState.startPort;
            const dragLine = this.shadowRoot.getElementById('drag-line');
            
            const cp1x = start.direction === 'Output' ? start.x + 50 : start.x - 50;
            const cp2x = start.direction === 'Output' ? x - 50 : x + 50;
            
            dragLine.setAttribute('d', `M ${start.x} ${start.y} C ${cp1x} ${start.y}, ${cp2x} ${y}, ${x} ${y}`);
        } else if (this.dragState.type === 'node') {
            const x = (clientX - rect.left - this.panOffset.x) / this.scale;
            const y = (clientY - rect.top - this.panOffset.y) / this.scale;
            const nodeId = this.dragState.targetNodeId;
            const newX = x - this.dragState.nodeOffset.x;
            const newY = y - this.dragState.nodeOffset.y;
            
            this.nodePositions.set(nodeId, { x: newX, y: newY });
            this.draw();
        } else if (this.dragState.type === 'pan') {
            const dx = clientX - this.dragState.startPos.x;
            const dy = clientY - this.dragState.startPos.y;
            
            this.panOffset.x = this.dragState.startPanOffset.x + dx;
            this.panOffset.y = this.dragState.startPanOffset.y + dy;
            
            this.updateViewportTransform();
        }
    }

    onPointerUp(e) {
        if (!this.dragState.active) return;
        
        const normalized = this.normalizeEvent(e);

        if (this.dragState.type === 'link') {
            this.endLinkDrag(normalized);
        }
        
        this.dragState = {
            type: null,
            active: false,
            startPort: null,
            targetNodeId: null,
            startPos: { x: 0, y: 0 },
            startPanOffset: { x: 0, y: 0 },
            nodeOffset: { x: 0, y: 0 },
            initialPinchDistance: 0,
            initialPinchScale: 1.0
        };
    }

    endLinkDrag(normalized) {
        const dragLine = this.shadowRoot.getElementById('drag-line');
        dragLine.style.display = 'none';
        
        const target = this.shadowRoot.elementFromPoint(normalized.clientX, normalized.clientY);
        const port = (target && target.classList.contains('port')) ? target : null;
        
        if (port) {
            const endPortId = parseInt(port.dataset.id);
            const endNodeId = parseInt(port.dataset.nodeId);
            const endDirection = port.dataset.direction;
            const start = this.dragState.startPort;
            
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
    }
}

customElements.define('graph-canvas', GraphCanvas);
