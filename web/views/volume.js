import '../components/slider.js';

export class VolumeView {
    constructor(api) {
        this.api = api;
        this.element = null;
    }

    render() {
        this.element = document.createElement('div');
        this.element.className = 'volume-view';
        this.element.innerHTML = '<div>Loading...</div>';

        this.loadDevices();
        this.setupRealtime();

        return this.element;
    }

    renderDevice(device) {
        const el = document.createElement('div');
        el.className = 'device-card';
        el.id = `device-${device.id}`;
        el.innerHTML = `
            <h3>${device.description}</h3>
            <p class="meta">${device.name}</p>
            <div class="controls">
                <volume-slider 
                    value="${Math.round(device.channels[0]?.volume * 100 || 100)}" 
                    data-id="${device.id}">
                </volume-slider>
            </div>
        `;
        
        const slider = el.querySelector('volume-slider');
        slider.addEventListener('change', (e) => {
            console.log(`Volume changed for ${device.id}: ${e.detail.value}`);
        });

        return el;
    }

    async loadDevices() {
        try {
            const devices = await this.api.getDevices();
            this.element.innerHTML = '';
            devices.forEach(d => this.element.appendChild(this.renderDevice(d)));
        } catch (e) {
            this.element.innerHTML = `Error: ${e.message}`;
        }
    }

    setupRealtime() {
        this.api.on('DeviceAdded', (device) => {
            if (!this.element.querySelector(`#device-${device.id}`)) {
                this.element.appendChild(this.renderDevice(device));
            }
        });

        this.api.on('DeviceRemoved', (id) => {
            const el = this.element.querySelector(`#device-${id}`);
            if (el) el.remove();
        });

        this.api.on('VolumeChanged', ({ id, volume }) => {
            const slider = this.element.querySelector(`#device-${id} volume-slider`);
            if (slider) {
                slider.value = Math.round(volume * 100);
            }
        });
    }
}
