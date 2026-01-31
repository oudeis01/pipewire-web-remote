import '../components/slider.js';

export class VolumeView {
    constructor(api) {
        this.api = api;
        this.element = null;
        this.selectedIds = new Set();
        this.showSelectedOnly = false;
        this.isVertical = false; 
        this.devicesCache = [];
    }

    render() {
        this.element = document.createElement('div');
        this.element.className = 'volume-view';
        this.element.innerHTML = `
            <div id="device-list" class="device-list-container">Loading...</div>
            <style>
                .volume-view {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    overflow: hidden;
                }
                .device-list-container {
                    padding: 10px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    flex: 1; 
                }
                
                /* Horizontal Layout (Portrait) */
                .device-card {
                    background: var(--card-bg);
                    padding: 16px;
                    border-radius: 0; /* Sharp corners */
                    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                    flex-shrink: 0;
                    display: flex;
                    flex-direction: column;
                }
                .device-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 8px;
                }
                .device-info {
                    flex: 1;
                    min-width: 0;
                }
                .device-card h3 {
                    margin: 0;
                    font-size: 14px;
                    font-weight: 600;
                    white-space: normal;
                    word-break: break-word;
                }
                .device-card .meta {
                    margin: 0;
                    font-size: 11px;
                    color: var(--secondary-text);
                }
                .controls {
                    width: 100%;
                }

                /* Vertical Layout (Landscape Mixer) */
                .device-list-container.vertical-layout {
                    display: grid;
                    grid-auto-flow: column;
                    grid-auto-columns: 70px;
                    grid-template-rows: 100%;
                    overflow-x: auto;
                    overflow-y: hidden;
                    height: 100%;
                    gap: 4px;
                    padding: 8px;
                    padding-bottom: env(safe-area-inset-bottom, 10px);
                }
                .vertical-layout .device-card {
                    width: 100%;
                    height: 100%;
                    padding: 8px 4px;
                    display: grid;
                    grid-template-columns: 24px 1fr; 
                    grid-template-rows: 100%;
                    gap: 4px;
                    border-radius: 0; /* Sharp corners */
                    box-sizing: border-box;
                }
                .vertical-layout .device-header {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: space-between;
                    height: 100%;
                    grid-column: 1;
                }
                .vertical-layout .device-select {
                    margin: 0;
                    width: 16px;
                    height: 16px;
                    order: -1;
                }
                .vertical-layout .device-info {
                    position: relative;
                    flex: 1;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                }
                .vertical-layout h3 {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    /* Rotate to match slider N% text direction */
                    transform: translate(-50%, -50%) rotate(90deg);
                    width: 40vh; /* Fill based on viewport height */
                    text-align: center;
                    font-size: 11px;
                    white-space: normal; /* Allow wrapping */
                    word-break: break-word; /* Fill line completely */
                    overflow: visible;
                    line-height: 1.1;
                }
                .vertical-layout .meta {
                    display: none; 
                }
                .vertical-layout .controls {
                    grid-column: 2;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    min-height: 0;
                }
                .vertical-layout volume-slider {
                    flex: 1;
                    height: 100%;
                }
            </style>
        `;

        this.loadDevices();
        this.setupRealtime();

        return this.element;
    }

    toggleFilter() {
        this.showSelectedOnly = !this.showSelectedOnly;
        this.refreshVisibility();
        return this.showSelectedOnly;
    }

    toggleOrientation() {
        this.isVertical = !this.isVertical;
        this.updateLayoutUI();
        this.reRenderAll();
        return this.isVertical;
    }

    updateLayoutUI() {
        const container = this.element.querySelector('#device-list');
        if (this.isVertical) {
            container.classList.add('vertical-layout');
        } else {
            container.classList.remove('vertical-layout');
        }
    }

    refreshVisibility() {
        this.devicesCache.forEach(device => {
            const el = this.element.querySelector(`#device-${device.id}`);
            if (el) {
                const visible = !this.showSelectedOnly || this.selectedIds.has(device.id);
                el.style.display = visible ? (this.isVertical ? 'grid' : 'flex') : 'none';
            }
        });
    }

    reRenderAll() {
        const container = this.element.querySelector('#device-list');
        if (!container) return;
        container.innerHTML = '';
        this.devicesCache.forEach(d => container.appendChild(this.createDeviceElement(d)));
        this.refreshVisibility();
    }

    createDeviceElement(device) {
        const el = document.createElement('div');
        el.className = 'device-card';
        el.id = `device-${device.id}`;
        
        const isSelected = this.selectedIds.has(device.id);
        const volume = Math.round(device.channels[0]?.volume * 100 || 100);
        const verticalAttr = this.isVertical ? 'vertical' : '';
        
        el.innerHTML = `
            <div class="device-header">
                <input type="checkbox" class="device-select" ${isSelected ? 'checked' : ''}>
                <div class="device-info">
                    <h3>${device.description}</h3>
                    <p class="meta">${device.name}</p>
                </div>
            </div>
            <div class="controls">
                <volume-slider 
                    value="${volume}" 
                    data-id="${device.id}"
                    ${verticalAttr}>
                </volume-slider>
            </div>
        `;
        
        const slider = el.querySelector('volume-slider');
        slider.addEventListener('change', async (e) => {
            try {
                await this.api.setVolume(device.id, e.detail.value / 100, e.detail.timestamp);
            } catch (err) {
                console.error('Failed to set volume:', err);
            }
        });

        const checkbox = el.querySelector('.device-select');
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                this.selectedIds.add(device.id);
            } else {
                this.selectedIds.delete(device.id);
            }
            if (this.showSelectedOnly && !e.target.checked) {
                this.refreshVisibility();
            }
        });

        return el;
    }

    async loadDevices() {
        try {
            this.devicesCache = await this.api.getDevices();
            this.reRenderAll();
        } catch (e) {
            const container = this.element.querySelector('#device-list');
            if(container) container.innerHTML = `Error: ${e.message}`;
        }
    }

    setupRealtime() {
        this.api.on('DeviceAdded', (device) => {
            const idx = this.devicesCache.findIndex(d => d.id === device.id);
            if (idx >= 0) {
                this.devicesCache[idx] = device;
                const slider = this.element.querySelector(`#device-${device.id} volume-slider`);
                if (slider) slider.value = Math.round(device.channels[0]?.volume * 100 || 100);
            } else {
                this.devicesCache.push(device);
                const container = this.element.querySelector('#device-list');
                if (container) {
                    container.appendChild(this.createDeviceElement(device));
                    this.refreshVisibility();
                }
            }
        });

        this.api.on('DeviceRemoved', (id) => {
            const idx = this.devicesCache.findIndex(d => d.id === id);
            if (idx === -1) return;

            this.devicesCache.splice(idx, 1);
            this.selectedIds.delete(id);
            const el = this.element.querySelector(`#device-${id}`);
            if (el) el.remove();
        });

        this.api.on('VolumeChanged', ({ id, volume, timestamp }) => {
            const device = this.devicesCache.find(d => d.id === id);
            if (device && device.channels[0]) {
                device.channels[0].volume = volume;
            }
            
            const slider = this.element.querySelector(`#device-${id} volume-slider`);
            if (slider) {
                slider.syncFromServer(Math.round(volume * 100), timestamp);
            }
        });
    }
}
