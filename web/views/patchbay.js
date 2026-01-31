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
        this.setupInteraction();

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

    setupInteraction() {
        const canvas = this.element.querySelector('graph-canvas');
        
        canvas.addEventListener('link-create', async (e) => {
            const { outputNode, outputPort, inputNode, inputPort } = e.detail;
            console.log('Creating link:', e.detail);
            try {
                await this.api.createLink({ 
                    output_node: outputNode, 
                    output_port: outputPort, 
                    input_node: inputNode, 
                    input_port: inputPort 
                });
            } catch (err) {
                console.error('Failed to create link:', err);
            }
        });
        
        canvas.addEventListener('link-delete', async (e) => {
            console.log('Deleting link:', e.detail.linkId);
            try {
                await this.api.deleteLink(e.detail.linkId);
            } catch (err) {
                console.error('Failed to delete link:', err);
            }
        });
    }
}
