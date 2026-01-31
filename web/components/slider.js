export class VolumeSlider extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.isDragging = false;
        this._internalValue = 0;
        this.lastSentTime = 0;
        this.staleProtectionUntil = 0;
        this.throttleTimer = null;
    }

    static get observedAttributes() {
        return ['value', 'min', 'max', 'disabled', 'vertical'];
    }

    connectedCallback() {
        this.render();
        this.addEventListeners();
        this._internalValue = parseInt(this.getAttribute('value') || '0');
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            if (name === 'vertical') {
                this.render();
            } else if (name === 'value') {
                // External attribute changes (e.g. from volume.js setter) 
                // are usually triggered by server events.
                // We pass a dummy timestamp here or handle it in the component instance.
                this.onServerUpdate(parseInt(newValue || '0'));
            } else {
                this.updateVisuals();
            }
        }
    }

    onServerUpdate(value, timestamp = 0) {
        // 1. Dragging Guard
        if (this.isDragging) return;

        // 2. Protection Window (Zombie events after drag)
        if (Date.now() < this.staleProtectionUntil) return;

        // 3. Sequence Tracking (Echo suppression)
        if (timestamp && timestamp < this.lastSentTime) return;

        this._internalValue = value;
        this.updateVisuals();
    }

    get value() {
        return this._internalValue;
    }

    set value(val) {
        // Called by volume.js when WebSocket message arrives
        // We expect the caller to pass timestamp if available, but since standard
        // property setting doesn't support multiple args, we handle it via a specific method
        // or just let attributeChangedCallback handle the simplified guard.
        // Better: expose a method for sync updates.
        this.onServerUpdate(val);
    }

    // Expose method for volume.js to call with timestamp
    syncFromServer(value, timestamp) {
        this.onServerUpdate(value, timestamp);
    }

    render() {
        const isVertical = this.hasAttribute('vertical');
        
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: ${isVertical ? '48px' : '100%'};
                    height: ${isVertical ? '100%' : '48px'};
                    min-height: 0;
                    touch-action: none;
                    cursor: pointer;
                    user-select: none;
                    margin: 0 auto; 
                }
                .track {
                    width: 100%;
                    height: 100%;
                    background: #333;
                    border-radius: 0; /* Sharp corners */
                    position: relative;
                    overflow: hidden;
                }
                .fill {
                    background: var(--primary, #007aff);
                    transition: ${isVertical ? 'height' : 'width'} 0.1s;
                    position: absolute;
                    ${isVertical ? 'bottom: 0; left: 0; width: 100%; height: 0%;' : 'top: 0; left: 0; height: 100%; width: 0%;'}
                }
                :host(.dragging) .fill {
                    transition: none;
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
                    ${isVertical ? 'transform: translate(-50%, -50%) rotate(90deg);' : ''}
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

        const val = this._internalValue;
        const max = parseInt(this.getAttribute('max') || '100');
        const percent = Math.min(100, Math.max(0, (val / max) * 100));
        const isVertical = this.hasAttribute('vertical');

        if (isVertical) {
            fill.style.height = `${percent}%`;
        } else {
            fill.style.width = `${percent}%`;
        }
        label.textContent = `${val}%`;
    }

    addEventListeners() {
        const track = this.shadowRoot.querySelector('.track');
        
        const updateFromEvent = (e) => {
            if (this.hasAttribute('disabled')) return;
            
            const rect = track.getBoundingClientRect();
            const isVertical = this.hasAttribute('vertical');
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            let percent;
            if (isVertical) {
                percent = 1 - ((clientY - rect.top) / rect.height);
            } else {
                percent = (clientX - rect.left) / rect.width;
            }
            
            percent = Math.max(0, Math.min(1, percent));
            const max = parseInt(this.getAttribute('max') || '100');
            const newValue = Math.round(percent * max);
            
            if (this._internalValue !== newValue) {
                this._internalValue = newValue;
                this.updateVisuals(); 
                
                // Throttle API calls
                clearTimeout(this.throttleTimer);
                this.throttleTimer = setTimeout(() => {
                    this.lastSentTime = Date.now();
                    this.dispatchEvent(new CustomEvent('change', {
                        detail: { 
                            value: newValue,
                            timestamp: this.lastSentTime
                        },
                        bubbles: true,
                        composed: true
                    }));
                }, 50); // 50ms throttle
            }
        };

        const startDrag = (e) => {
            this.isDragging = true;
            this.classList.add('dragging');
            updateFromEvent(e);
        };

        const stopDrag = () => {
            if (this.isDragging) {
                clearTimeout(this.throttleTimer);
                // Send final value immediately
                this.lastSentTime = Date.now();
                this.dispatchEvent(new CustomEvent('change', {
                    detail: { 
                        value: this._internalValue,
                        timestamp: this.lastSentTime
                    },
                    bubbles: true,
                    composed: true
                }));

                // Start protection window
                this.staleProtectionUntil = Date.now() + 300;
                
                // Delay setting isDragging=false slightly to ensure callback 
                // doesn't catch very recent server events
                setTimeout(() => {
                    this.isDragging = false;
                    this.classList.remove('dragging');
                    this.setAttribute('value', this._internalValue);
                }, 300);
            }
        };

        track.addEventListener('mousedown', (e) => {
            startDrag(e);
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        const onMouseMove = (e) => {
            if (this.isDragging) updateFromEvent(e);
        };

        const onMouseUp = () => {
            stopDrag();
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        track.addEventListener('touchstart', (e) => {
            startDrag(e);
        }, { passive: false });

        track.addEventListener('touchmove', (e) => {
            if (this.isDragging) {
                e.preventDefault();
                updateFromEvent(e);
            }
        }, { passive: false });

        track.addEventListener('touchend', stopDrag);
        track.addEventListener('touchcancel', stopDrag);
    }
}

customElements.define('volume-slider', VolumeSlider);
