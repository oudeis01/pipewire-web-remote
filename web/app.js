import { ApiClient } from './lib/api.js';
import { VolumeView } from './views/volume.js';
import { PatchbayView } from './views/patchbay.js';
import { SetupView } from './views/setup.js';
import './components/slider.js';
import './components/rete-graph.js';

class App {
    constructor() {
        this.api = new ApiClient();
        this.container = document.getElementById('view-container');
        this.views = {
            volume: new VolumeView(this.api),
            patchbay: new PatchbayView(this.api),
            setup: new SetupView(this.api)
        };
        this.currentView = null;
    }

    init() {
        this.setupNavigation();
        this.setupGlobalActions();
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

    setupGlobalActions() {
        const filterBtn = document.getElementById('global-toggle-filter');
        const orientBtn = document.getElementById('global-toggle-orient');

        filterBtn.addEventListener('click', () => {
            if (this.currentView === 'volume') {
                const active = this.views.volume.toggleFilter();
                filterBtn.classList.toggle('active', active);
                filterBtn.textContent = active ? 'All' : 'Select';
            }
        });

        orientBtn.addEventListener('click', () => {
            if (this.currentView === 'volume') {
                const isVertical = this.views.volume.toggleOrientation();
                orientBtn.classList.toggle('active', isVertical);
            }
        });
    }

    navigate(viewName) {
        if (this.currentView === viewName) return;
        
        const view = this.views[viewName];
        if (view) {
            this.container.innerHTML = '';
            this.container.appendChild(view.render());
            this.currentView = viewName;

            const isVol = viewName === 'volume';
            const divider = document.getElementById('volume-actions-divider');
            const filterBtn = document.getElementById('global-toggle-filter');
            const orientBtn = document.getElementById('global-toggle-orient');

            divider.classList.toggle('hidden', !isVol);
            filterBtn.classList.toggle('hidden', !isVol);
            orientBtn.classList.toggle('hidden', !isVol);
            
            if (isVol) {
                const v = this.views.volume;
                filterBtn.classList.toggle('active', v.showSelectedOnly);
                filterBtn.textContent = v.showSelectedOnly ? 'All' : 'Select';
                orientBtn.classList.toggle('active', v.isVertical);
            }
        }
    }
}

const app = new App();
app.init();
