import { ApiClient } from './lib/api.js';
import './components/slider.js';

const api = new ApiClient();
const container = document.getElementById('device-list');

function renderDevice(device) {
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
    
    // Add event listener for slider change
    const slider = el.querySelector('volume-slider');
    slider.addEventListener('change', (e) => {
        console.log(`Volume changed for ${device.id}: ${e.detail.value}`);
        // TODO: Call API to set volume
    });

    return el;
}

async function init() {
    // Initial Load
    const devices = await api.getDevices();
    container.innerHTML = '';
    devices.forEach(d => container.appendChild(renderDevice(d)));

    // Real-time Updates
    api.on('DeviceAdded', (device) => {
        if (!document.getElementById(`device-${device.id}`)) {
            container.appendChild(renderDevice(device));
        }
    });

    api.on('DeviceRemoved', (id) => {
        const el = document.getElementById(`device-${id}`);
        if (el) el.remove();
    });

    api.on('VolumeChanged', ({ id, volume }) => {
        const slider = document.querySelector(`#device-${id} volume-slider`);
        if (slider) {
            slider.value = Math.round(volume * 100);
        }
    });
}

init();
