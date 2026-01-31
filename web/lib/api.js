export class ApiClient {
    constructor() {
        this.listeners = new Map();
        this.ws = null;
        this.connect();
    }

    connect() {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.ws = new WebSocket(`${proto}//${window.location.host}/ws`);

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                console.log('WS Message received:', msg.type);
                this.emit(msg.type, msg.data);
            } catch (e) {
                console.error('Failed to parse WS message:', e);
            }
        };

        this.ws.onclose = () => {
            console.log('WS closed, reconnecting in 3s...');
            setTimeout(() => this.connect(), 3000);
        };
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(cb => cb(data));
        }
    }

    async getDevices() {
        const res = await fetch('/api/devices');
        return res.json();
    }

    async getGraph() {
        const res = await fetch('/api/graph');
        return res.json();
    }

    async setVolume(id, volume, timestamp = null) {
        await fetch(`/api/device/${id}/volume`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ volume, timestamp })
        });
    }

    async createLink(linkData) {
        await fetch('/api/link/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(linkData)
        });
    }

    async deleteLink(linkId) {
        await fetch('/api/link/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ linkId })
        });
    }
}
