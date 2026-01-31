export class PresetView {
    constructor(api) {
        this.api = api;
        this.element = null;
    }

    render() {
        this.element = document.createElement('div');
        this.element.className = 'preset-view';
        this.element.innerHTML = `
            <div class="preset-controls">
                <input type="text" id="preset-name" placeholder="Preset Name">
                <button id="save-btn">Save Current</button>
            </div>
            <div id="preset-list" class="preset-list">Loading...</div>
        `;

        this.element.querySelector('#save-btn').addEventListener('click', () => this.savePreset());
        this.loadPresets();

        return this.element;
    }

    async loadPresets() {
        const list = this.element.querySelector('#preset-list');
        try {
            const res = await fetch('/api/presets');
            const presets = await res.json();
            
            list.innerHTML = presets.map(name => `
                <div class="preset-item">
                    <span>${name}</span>
                    <button data-name="${name}" class="load-btn">Load</button>
                </div>
            `).join('');
            
            list.querySelectorAll('.load-btn').forEach(btn => {
                btn.addEventListener('click', () => this.loadPreset(btn.dataset.name));
            });
        } catch (e) {
            list.innerHTML = `Error: ${e.message}`;
        }
    }

    async savePreset() {
        const input = this.element.querySelector('#preset-name');
        const name = input.value.trim();
        if (!name) return;

        // Fetch current graph to save
        // Ideally backend does this, but for now we construct the preset object here?
        // Wait, API expects `Preset` struct.
        // We need to fetch current graph, convert links to LinkSpec, then send.
        
        try {
            const graph = await this.api.getGraph();
            const links = graph.links.map(l => {
                const outNode = graph.nodes.find(n => n.id === l.output_node);
                const inNode = graph.nodes.find(n => n.id === l.input_node);
                // Need ports too
                const outPort = outNode?.ports.find(p => p.id === l.output_port);
                const inPort = inNode?.ports.find(p => p.id === l.input_port);
                
                return {
                    output_node: outNode?.name || "",
                    output_port: outPort?.name || "",
                    input_node: inNode?.name || "",
                    input_port: inPort?.name || ""
                };
            }).filter(l => l.output_node && l.input_node);

            const preset = {
                name,
                description: "User saved preset",
                links
            };

            await fetch('/api/presets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(preset)
            });
            
            input.value = '';
            this.loadPresets();
        } catch (e) {
            console.error("Save failed", e);
        }
    }

    async loadPreset(name) {
        try {
            await fetch(`/api/presets/${name}/load`, { method: 'POST' });
            // Notify success
        } catch (e) {
            console.error("Load failed", e);
        }
    }
}
