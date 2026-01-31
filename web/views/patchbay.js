export class PatchbayView {
    constructor(api) {
        this.api = api;
        this.element = null;
    }

    render() {
        this.element = document.createElement('div');
        this.element.className = 'patchbay-view';
        this.element.innerHTML = `
            <graph-canvas id="graph"></graph-canvas>
        `;

        this.loadGraph();
        this.setupRealtime();

        return this.element;
    }

    async loadGraph() {
        try {
            const graph = await this.api.getGraph();
            const canvas = this.element.querySelector('graph-canvas');
            if (canvas) {
                canvas.setGraph(graph);
            }
        } catch (e) {
            console.error("Failed to load graph", e);
        }
    }

    setupRealtime() {
        const refresh = () => this.loadGraph();
        
        // Listen to all graph events
        this.api.on('DeviceAdded', refresh);
        this.api.on('DeviceRemoved', refresh);
        this.api.on('PortAdded', refresh);
        this.api.on('PortRemoved', refresh);
        this.api.on('LinkAdded', refresh);
        this.api.on('LinkRemoved', refresh);
    }
}
