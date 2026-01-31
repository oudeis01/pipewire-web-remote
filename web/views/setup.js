export class SetupView {
    constructor(api) {
        this.api = api;
        this.element = null;
        this.logBuffer = ["Console initialized..."];
        this.maxLogs = 500;
        
        this.api.on('Log', (msg) => {
            this.addLog(msg);
        });
    }

    render() {
        this.element = document.createElement('div');
        this.element.className = 'setup-view';
        
        this.element.innerHTML = `
            <div class="console-panel">
                <h3>System Console</h3>
                <div id="log-console" class="console-output"></div>
            </div>
            <style>
                .setup-view {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    padding: 10px;
                    box-sizing: border-box;
                    color: #eee;
                }
                .console-panel {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    min-height: 0;
                }
                .console-panel h3 {
                    margin-top: 0;
                    margin-bottom: 8px;
                    font-size: 14px;
                    color: #888;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .console-output {
                    flex: 1;
                    background: #000;
                    border: 1px solid #333;
                    padding: 12px;
                    font-family: 'SF Mono', 'Fira Code', ui-monospace, monospace;
                    font-size: 11px;
                    overflow-y: auto;
                    white-space: pre-wrap;
                    word-break: break-all;
                    color: #00ff00;
                    line-height: 1.4;
                }
                .log-line {
                    margin-bottom: 4px;
                    border-bottom: 1px solid #111;
                    padding-bottom: 2px;
                }
            </style>
        `;

        // Fill with existing logs
        const consoleEl = this.element.querySelector('#log-console');
        this.logBuffer.forEach(msg => {
            const line = document.createElement('div');
            line.className = 'log-line';
            line.textContent = msg;
            consoleEl.appendChild(line);
        });
        consoleEl.scrollTop = consoleEl.scrollHeight;

        return this.element;
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
