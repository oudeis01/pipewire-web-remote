import { ApiClient } from './lib/api.js';
import { VolumeView } from './views/volume.js';
import { PatchbayView } from './views/patchbay.js';
import './components/slider.js';
import './components/graph-canvas.js';

class App {
    constructor() {
        this.api = new ApiClient();
        this.container = document.getElementById('view-container');
        this.views = {
            volume: new VolumeView(this.api),
            patchbay: new PatchbayView(this.api)
        };
        this.currentView = null;
    }

    init() {
        this.setupNavigation();
        this.navigate('volume');
    }

    setupNavigation() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                this.navigate(view);
                
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    navigate(viewName) {
        if (this.currentView === viewName) return;
        
        const view = this.views[viewName];
        if (view) {
            this.container.innerHTML = '';
            this.container.appendChild(view.render());
            this.currentView = viewName;
        }
    }
}

const app = new App();
app.init();
