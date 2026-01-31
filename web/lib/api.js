export class ApiClient {
    constructor() {
        this.listeners = new Map();
        this.ws = null;
        
        // Use configured host/port or fallback to window.location
        this.host = localStorage.getItem('server_host') || window.location.hostname;
        this.port = localStorage.getItem('server_port') || window.location.port;
        this.baseUrl = `${window.location.protocol}//${this.host}:${this.port}`;
        
        this.connect();
    }

    connect() {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Connect to configured address
        this.ws = new WebSocket(`${proto}//${this.host}:${this.port}/ws`);

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
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
        const res = await fetch(`${this.baseUrl}/api/devices`);
        return res.json();
    }

    async getGraph() {
        const res = await fetch(`${this.baseUrl}/api/graph`);
        return res.json();
    }

    async setVolume(id, volume, timestamp = null) {
        await fetch(`${this.baseUrl}/api/device/${id}/volume`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ volume, timestamp })
        });
    }

    async createLink(linkData) {
        await fetch(`${this.baseUrl}/api/link/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(linkData)
        });
    }

    async deleteLink(linkId) {
        await fetch(`${this.baseUrl}/api/link/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ linkId })
        });
    }
}
