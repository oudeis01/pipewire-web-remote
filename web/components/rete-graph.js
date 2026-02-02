import { NodeEditor, ClassicPreset } from 'rete';
import { AreaPlugin, AreaExtensions } from 'rete-area-plugin';
import { ConnectionPlugin, Presets as ConnectionPresets } from 'rete-connection-plugin';
import { createRoot } from 'react-dom/client';
import { ReactPlugin, Presets } from 'rete-react-plugin';

class AudioNode extends ClassicPreset.Node {
    constructor(pwId, label, data) {
        super(label);
        this.pwId = pwId;
        this.data = data;
        this.width = 220;
        this.height = 50 + (data.ports?.length || 0) * 36;
    }
}

class AudioConnection extends ClassicPreset.Connection {
    constructor(source, sourceOutput, target, targetInput, pwLinkId) {
        super(source, sourceOutput, target, targetInput);
        this.pwLinkId = pwLinkId;
    }
}

export class ReteGraph extends HTMLElement {
    constructor() {
        super();
        this.editor = null;
        this.area = null;
        this.connection = null;
        this.graph = { nodes: [], links: [] };
        this.nodeMap = new Map();
        this.nodePositions = new Map();
        this.isUpdating = false;
        this.pickedConnection = null;
    }

    connectedCallback() {
        this.render();
        setTimeout(() => this.initEditor(), 100);
    }

    render() {
        this.innerHTML = `
            <style>
                rete-graph {
                    display: block;
                    width: 100%;
                    height: 100%;
                    background: #1a1a1a;
                    overflow: hidden;
                }
                .rete-container {
                    width: 100%;
                    height: 100%;
                    position: relative;
                }
                .rete-container > div {
                    width: 100%;
                    height: 100%;
                }
                
                [data-testid="node"] {
                    background: #2d2d2d !important;
                    border: 2px solid #4a4a4a !important;
                    border-radius: 0 !important;
                    min-width: 180px !important;
                    height: auto !important;
                    min-height: unset !important;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                    color: #fff !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
                    padding-bottom: 8px !important;
                    overflow: visible !important;
                }
                [data-testid="node"]:hover {
                    border-color: #007aff !important;
                }
                [data-testid="title"] {
                    background: #3d3d3d !important;
                    padding: 8px 12px !important;
                    font-size: 13px !important;
                    font-weight: 600 !important;
                    border-radius: 0 !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    color: #fff !important;
                }
                
                [data-testid="node"] .input {
                    text-align: left !important;
                    padding: 4px 8px !important;
                    font-size: 12px !important;
                }
                [data-testid="node"] .output {
                    text-align: right !important;
                    padding: 4px 8px !important;
                    font-size: 12px !important;
                }
                [data-testid="node"] .input-title,
                [data-testid="node"] .output-title {
                    color: #ccc !important;
                    display: inline-block !important;
                    vertical-align: middle !important;
                    margin: 0 4px !important;
                }
                
                [data-testid="input-socket"],
                [data-testid="output-socket"] {
                    display: inline-block !important;
                    vertical-align: middle !important;
                }
                [data-testid="input-socket"] > span > div > div,
                [data-testid="output-socket"] > span > div > div {
                    width: 14px !important;
                    height: 14px !important;
                    border-radius: 0 !important;
                    background: #888 !important;
                    border: 2px solid #aaa !important;
                    cursor: pointer !important;
                }
                [data-testid="input-socket"] > span > div > div:hover,
                [data-testid="output-socket"] > span > div > div:hover {
                    background: #007aff !important;
                    border-color: #007aff !important;
                }
                
                [data-testid="connection"] path {
                    stroke: #888 !important;
                    stroke-width: 3px !important;
                    fill: none !important;
                }
                [data-testid="connection"]:hover path {
                    stroke: #007aff !important;
                    stroke-width: 4px !important;
                }
                
                .rete-container > div > div:has([data-testid="node"]) {
                    z-index: 1 !important;
                }
                .rete-container > div > div:has([data-testid="connection"]) {
                    z-index: 5 !important;
                }
            </style>
            <div class="rete-container"></div>
        `;
    }

    async initEditor() {
        const container = this.querySelector('.rete-container');
        
        this.editor = new NodeEditor();
        this.area = new AreaPlugin(container);
        this.connection = new ConnectionPlugin();
        
        const reactRender = new ReactPlugin({ 
            createRoot
        });

        this.editor.use(this.area);
        this.area.use(reactRender);
        this.area.use(this.connection);

        reactRender.addPreset(Presets.classic.setup());
        this.connection.addPreset(ConnectionPresets.classic.setup());

        AreaExtensions.selectableNodes(this.area, AreaExtensions.selector(), {
            accumulating: AreaExtensions.accumulateOnCtrl()
        });
        AreaExtensions.simpleNodesOrder(this.area);

        this.setupEvents();
        
        if (this.graph && this.graph.nodes && this.graph.nodes.length > 0) {
            await this.updateEditor();
        }
    }

    setupEvents() {
        if (!this.area || !this.connection) return;
        
        this.connection.addPipe((context) => {
            if (this.isUpdating) return context;
            
            if (context.type === 'connectionpick') {
                const { socket } = context.data;
                
                const existingConnection = this.editor.getConnections().find(c => 
                    socket.side === 'input' 
                        ? c.target === socket.nodeId && c.targetInput === socket.key
                        : c.source === socket.nodeId && c.sourceOutput === socket.key
                );
                
                if (existingConnection) {
                    this.pickedConnection = existingConnection;
                } else {
                    this.pickedConnection = null;
                }
            }
            
            if (context.type === 'connectiondrop') {
                this.pickedConnection = null;
            }
            
            return context;
        });
        
        this.area.addPipe((context) => {
            if (this.isUpdating) return context;
            
            if (context.type === 'connectioncreated') {
                const conn = context.data;
                if (conn.pwLinkId) return context;
                
                const sourceNode = this.editor.getNode(conn.source);
                const targetNode = this.editor.getNode(conn.target);
                
                this.dispatchEvent(new CustomEvent('link-create', {
                    detail: {
                        outputNode: sourceNode.pwId,
                        outputPort: parseInt(conn.sourceOutput),
                        inputNode: targetNode.pwId,
                        inputPort: parseInt(conn.targetInput)
                    },
                    bubbles: true,
                    composed: true
                }));
            }
            
            if (context.type === 'connectionremoved') {
                const conn = context.data;
                if (conn.pwLinkId) {
                    this.dispatchEvent(new CustomEvent('link-delete', {
                        detail: { linkId: conn.pwLinkId },
                        bubbles: true,
                        composed: true
                    }));
                }
            }
            return context;
        });
        
        this.setupConnectionDoubleClick();
    }
    
    setupConnectionDoubleClick() {
        let lastClickTime = 0;
        let lastClickTarget = null;
        
        this.addEventListener('pointerdown', async (e) => {
            const connectionEl = e.target.closest('[data-testid="connection"]');
            if (!connectionEl) return;
            
            const now = Date.now();
            if (lastClickTarget === connectionEl && now - lastClickTime < 400) {
                const connectionId = connectionEl.dataset.connectionId || 
                    this.findConnectionIdFromElement(connectionEl);
                if (connectionId) {
                    const conn = this.editor.getConnection(connectionId);
                    if (conn?.pwLinkId) {
                        await this.editor.removeConnection(connectionId);
                    }
                }
                lastClickTime = 0;
                lastClickTarget = null;
            } else {
                lastClickTime = now;
                lastClickTarget = connectionEl;
            }
        });
    }
    
    findConnectionIdFromElement(el) {
        const connections = this.editor.getConnections();
        for (const conn of connections) {
            const view = this.area.connectionViews.get(conn.id);
            if (view?.element === el || view?.element?.contains(el)) {
                return conn.id;
            }
        }
        return null;
    }

    async setGraph(graph) {
        this.graph = graph;
        if (this.editor && this.area) {
            await this.updateEditor();
        }
    }

    async updateEditor() {
        if (!this.editor || !this.area) return;
        if (this.isUpdating) return;
        
        this.isUpdating = true;
        
        try {
            const currentNodes = new Map();
            for (const node of this.editor.getNodes()) {
                currentNodes.set(node.pwId, node);
            }
            
            const currentConnections = new Map();
            for (const conn of this.editor.getConnections()) {
                if (conn.pwLinkId) {
                    currentConnections.set(conn.pwLinkId, conn);
                }
            }
            
            const newNodeIds = new Set(this.graph.nodes.map(n => n.id));
            const newLinkIds = new Set(this.graph.links.map(l => l.id));
            
            for (const [pwLinkId, conn] of currentConnections) {
                if (!newLinkIds.has(pwLinkId)) {
                    await this.editor.removeConnection(conn.id);
                }
            }
            
            for (const [pwId, node] of currentNodes) {
                if (!newNodeIds.has(pwId)) {
                    const view = this.area.nodeViews.get(node.id);
                    if (view) {
                        this.nodePositions.set(pwId, { ...view.position });
                    }
                    await this.editor.removeNode(node.id);
                    this.nodeMap.delete(pwId);
                }
            }
            
            let index = this.nodeMap.size;
            const newNodes = [];
            for (const nodeData of this.graph.nodes) {
                if (!currentNodes.has(nodeData.id)) {
                    const node = new AudioNode(nodeData.id, nodeData.name, nodeData);
                    const socket = new ClassicPreset.Socket('audio');
                    
                    nodeData.ports.forEach(port => {
                        if (port.direction === 'Input') {
                            node.addInput(port.id.toString(), new ClassicPreset.Input(socket, port.name));
                        } else {
                            node.addOutput(port.id.toString(), new ClassicPreset.Output(socket, port.name));
                        }
                    });

                    await this.editor.addNode(node);
                    this.nodeMap.set(nodeData.id, node);
                    newNodes.push({ node, nodeData });
                }
            }
            
            if (newNodes.length > 0 && this.nodePositions.size === 0) {
                this.layoutNodes(newNodes);
            } else {
                for (const { node, nodeData } of newNodes) {
                    const savedPos = this.nodePositions.get(nodeData.id);
                    const x = savedPos?.x ?? (index * 300 + 50);
                    const y = savedPos?.y ?? 50;
                    await this.area.translate(node.id, { x, y });
                    index++;
                }
            }
            
            for (const link of this.graph.links) {
                if (!currentConnections.has(link.id)) {
                    const sourceNode = this.nodeMap.get(link.output_node);
                    const targetNode = this.nodeMap.get(link.input_node);
                    
                    if (sourceNode && targetNode) {
                        const existingConn = this.editor.getConnections().find(c =>
                            c.source === sourceNode.id &&
                            c.sourceOutput === link.output_port.toString() &&
                            c.target === targetNode.id &&
                            c.targetInput === link.input_port.toString()
                        );
                        
                        if (existingConn) {
                            if (!existingConn.pwLinkId) {
                                await this.editor.removeConnection(existingConn.id);
                            } else {
                                continue;
                            }
                        }
                        
                        const connection = new AudioConnection(
                            sourceNode,
                            link.output_port.toString(),
                            targetNode,
                            link.input_port.toString(),
                            link.id
                        );
                        await this.editor.addConnection(connection);
                    }
                }
            }
            
            if (this.nodePositions.size === 0 && this.editor.getNodes().length > 0) {
                await AreaExtensions.zoomAt(this.area, this.editor.getNodes());
            }
        } finally {
            this.isUpdating = false;
        }
    }
    
    async layoutNodes(newNodes) {
        const container = this.querySelector('.rete-container');
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;
        
        const sources = [];
        const filters = [];
        const sinks = [];
        
        for (const { node, nodeData } of newNodes) {
            const hasInput = nodeData.ports.some(p => p.direction === 'Input');
            const hasOutput = nodeData.ports.some(p => p.direction === 'Output');
            
            if (hasOutput && !hasInput) {
                sources.push(node);
            } else if (hasInput && !hasOutput) {
                sinks.push(node);
            } else {
                filters.push(node);
            }
        }
        
        const padding = 50;
        const columnWidth = (width - padding * 2) / 3;
        const nodeWidth = 220;
        
        const positionColumn = async (nodes, columnIndex) => {
            if (nodes.length === 0) return;
            
            const x = padding + columnIndex * columnWidth + (columnWidth - nodeWidth) / 2;
            const totalHeight = nodes.reduce((sum, n) => sum + n.height + 20, -20);
            let y = Math.max(padding, (height - totalHeight) / 2);
            
            for (const node of nodes) {
                await this.area.translate(node.id, { x, y });
                this.nodePositions.set(node.pwId, { x, y });
                y += node.height + 20;
            }
        };
        
        await positionColumn(sources, 0);
        await positionColumn(filters, 1);
        await positionColumn(sinks, 2);
    }
}

customElements.define('rete-graph', ReteGraph);
