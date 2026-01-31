export class VolumeSlider extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.isDragging = false;
    }

    static get observedAttributes() {
        return ['value', 'min', 'max', 'disabled'];
    }

    connectedCallback() {
        this.render();
        this.addEventListeners();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.updateVisuals();
        }
    }

    get value() {
        return parseInt(this.getAttribute('value') || '0');
    }

    set value(val) {
        this.setAttribute('value', val);
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    height: 48px; /* Touch friendly */
                    touch-action: none;
                    cursor: pointer;
                    user-select: none;
                }
                .track {
                    width: 100%;
                    height: 100%;
                    background: #333;
                    border-radius: 8px;
                    position: relative;
                    overflow: hidden;
                }
                .fill {
                    height: 100%;
                    background: var(--primary, #007aff);
                    width: 0%;
                    transition: width 0.1s;
                }
                .label {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    color: white;
                    font-weight: bold;
                    mix-blend-mode: difference;
                    pointer-events: none;
                }
            </style>
            <div class="track">
                <div class="fill"></div>
                <div class="label">0%</div>
            </div>
        `;
        this.updateVisuals();
    }

    updateVisuals() {
        const fill = this.shadowRoot.querySelector('.fill');
        const label = this.shadowRoot.querySelector('.label');
        if (!fill || !label) return;

        const val = this.value;
        const max = parseInt(this.getAttribute('max') || '100');
        const percent = Math.min(100, Math.max(0, (val / max) * 100));

        fill.style.width = `${percent}%`;
        label.textContent = `${val}%`;
    }

    addEventListeners() {
        const track = this.shadowRoot.querySelector('.track');
        
        const updateFromEvent = (e) => {
            if (this.hasAttribute('disabled')) return;
            
            const rect = track.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            
            let percent = (clientX - rect.left) / rect.width;
            percent = Math.max(0, Math.min(1, percent));
            
            const max = parseInt(this.getAttribute('max') || '100');
            const newValue = Math.round(percent * max);
            
            if (this.value !== newValue) {
                this.value = newValue;
                this.dispatchEvent(new CustomEvent('change', {
                    detail: { value: newValue },
                    bubbles: true,
                    composed: true
                }));
            }
        };

        track.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            updateFromEvent(e);
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) updateFromEvent(e);
        });

        document.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        track.addEventListener('touchstart', (e) => {
            this.isDragging = true;
            updateFromEvent(e);
        }, { passive: false });

        track.addEventListener('touchmove', (e) => {
            if (this.isDragging) {
                e.preventDefault(); // Prevent scroll while dragging
                updateFromEvent(e);
            }
        }, { passive: false });

        track.addEventListener('touchend', () => {
            this.isDragging = false;
        });
    }
}

customElements.define('volume-slider', VolumeSlider);
