export class SetupView {
    constructor(api) {
        this.api = api;
        this.element = null;
        this.logBuffer = [];
        this.maxLogs = 500;
    }

    render() {
        this.element = document.createElement('div');
        this.element.className = 'setup-view';
        
        const serverHost = localStorage.getItem('server_host') || window.location.hostname;
        const serverPort = localStorage.getItem('server_port') || window.location.port;

        this.element.innerHTML = `
            <div class="settings-panel">
                <h3>Connection Settings</h3>
                <div class="input-group">
                    <label>Server Address</label>
                    <input type="text" id="server-host" value="${serverHost}">
                </div>
                <div class="input-group">
                    <label>Server Port</label>
                    <input type="text" id="server-port" value="${serverPort}">
                </div>
                <button id="save-settings" class="action-btn">Save & Reconnect</button>
            </div>
            <div class="console-panel">
                <h3>System Logs</h3>
                <div id="log-console" class="console-output"></div>
            </div>
            <style>
                .setup-view {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    padding: 15px;
                    gap: 20px;
                    box-sizing: border-box;
                    color: #eee;
                }
                .settings-panel {
                    background: var(--card-bg);
                    padding: 15px;
                    border-radius: 0; /* Sharp corners */
                    flex-shrink: 0;
                }
                .settings-panel h3, .console-panel h3 {
                    margin-top: 0;
                    font-size: 16px;
                    color: #aaa;
                }
                .input-group {
                    margin-bottom: 10px;
                }
                .input-group label {
                    display: block;
                    font-size: 12px;
                    color: #888;
                    margin-bottom: 4px;
                }
                .input-group input {
                    width: 100%;
                    background: #333;
                    border: 1px solid #444;
                    color: white;
                    padding: 8px;
                    border-radius: 0; /* Sharp corners */
                    box-sizing: border-box;
                }
                .console-panel {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    min-height: 0;
                }
                .console-output {
                    flex: 1;
                    background: #000;
                    border: 1px solid #333;
                    border-radius: 0; /* Sharp corners */
                    padding: 10px;
                    font-family: 'SF Mono', 'Fira Code', monospace;
                    font-size: 11px;
                    overflow-y: auto;
                    white-space: pre-wrap;
                    word-break: break-all;
                    color: #00ff00; /* Classic console green */
                }
                .log-line {
                    margin-bottom: 2px;
                    border-bottom: 1px solid #111;
                }
            </style>
        `;

        this.element.querySelector('#save-settings').addEventListener('click', () => {
            const host = this.element.querySelector('#server-host').value;
            const port = this.element.querySelector('#server-port').value;
            localStorage.setItem('server_host', host);
            localStorage.setItem('server_port', port);
            window.location.reload();
        });

        this.setupLogging();
        return this.element;
    }

    setupLogging() {
        this.api.on('Log', (msg) => {
            this.addLog(msg);
        });
    }

    addLog(msg) {
        this.logBuffer.push(msg);
        if (this.logBuffer.length > this.maxLogs) {
            this.logBuffer.shift();
        }
        
        const consoleEl = this.element?.querySelector('#log-console');
        if (consoleEl) {
            const line = document.createElement('div');
            line.className = 'log-line';
            line.textContent = msg;
            consoleEl.appendChild(line);
            
            // Auto-scroll to bottom
            consoleEl.scrollTop = consoleEl.scrollHeight;
        }
    }
}
