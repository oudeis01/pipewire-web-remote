async function init() {
    const container = document.getElementById('device-list');
    try {
        const res = await fetch('/api/devices');
        const devices = await res.json();
        
        container.innerHTML = devices.map(d => `
            <div class="device-card">
                <h3>${d.description}</h3>
                <p>Type: ${d.device_type}</p>
                <p>Volume: ${Math.round(d.channels[0].volume * 100)}%</p>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = `Error: ${e.message}`;
    }
}

init();
