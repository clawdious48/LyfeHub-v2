/**
 * Widget Picker Modal
 * Shows available widget types for adding to the dashboard.
 */
(function() {
    'use strict';

    const WidgetPicker = {
        overlay: null,
        _resolve: null,

        init() {
            this.overlay = document.createElement('div');
            this.overlay.className = 'widget-picker-overlay';
            this.overlay.innerHTML = `
                <div class="widget-picker-modal">
                    <div class="widget-picker-header">
                        <h3>Add Widget</h3>
                        <button class="widget-picker-close">&times;</button>
                    </div>
                    <div class="widget-picker-list" id="widget-picker-list"></div>
                </div>
            `;
            document.body.appendChild(this.overlay);

            // Close handlers
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) this.close();
            });
            this.overlay.querySelector('.widget-picker-close').addEventListener('click', () => this.close());
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.overlay.classList.contains('visible')) this.close();
            });
        },

        /**
         * Open the picker. Returns a Promise that resolves with { type, config }
         */
        open() {
            return new Promise((resolve) => {
                this._resolve = resolve;

                const list = this.overlay.querySelector('#widget-picker-list');
                const types = window.WidgetRegistry.getAll();

                list.innerHTML = types.map(t => `
                    <div class="widget-picker-item" data-type="${t.type}">
                        <span class="widget-picker-icon">${t.icon}</span>
                        <span class="widget-picker-label">${t.label}</span>
                    </div>
                `).join('');

                // Bind clicks
                list.querySelectorAll('.widget-picker-item').forEach(item => {
                    item.addEventListener('click', async () => {
                        const type = item.dataset.type;
                        const def = window.WidgetRegistry.get(type);

                        // If configurable, show config modal first
                        if (def && def.configurable && def.configModal) {
                            try {
                                const config = await def.configModal({});
                                this.close();
                                if (this._resolve) this._resolve({ type, config });
                            } catch (err) {
                                // User cancelled config — stay open
                            }
                        } else {
                            this.close();
                            if (this._resolve) this._resolve({ type, config: {} });
                        }
                    });
                });

                this.overlay.classList.add('visible');
            });
        },

        close() {
            this.overlay.classList.remove('visible');
            if (this._resolve) {
                this._resolve = null;
            }
        }
    };

    document.addEventListener('DOMContentLoaded', () => WidgetPicker.init());
    window.WidgetPicker = WidgetPicker;
})();
