/**
 * Dashboard Controller
 * Orchestrates GridStack, widget registry, layout persistence, and edit mode.
 */
(function() {
    'use strict';

    let grid = null;
    let editMode = false;
    let saveTimer = null;
    let currentLayout = null;

    /**
     * Generate a unique widget ID
     */
    function genId() {
        return 'w-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Debounced layout save
     */
    function scheduleSave() {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(saveLayout, 1000);
    }

    /**
     * Save current layout to server
     */
    async function saveLayout() {
        if (!grid) return;
        const items = grid.getGridItems();
        const widgets = [];

        items.forEach(el => {
            const node = el.gridstackNode;
            if (!node) return;
            const widgetId = el.getAttribute('gs-id');
            const type = el.dataset.widgetType;
            const configStr = el.dataset.widgetConfig;
            const config = configStr ? JSON.parse(configStr) : {};

            widgets.push({
                id: widgetId,
                type: type,
                x: node.x,
                y: node.y,
                w: node.w,
                h: node.h,
                config: Object.keys(config).length ? config : undefined
            });
        });

        currentLayout = { widgets };

        try {
            await fetch('/api/dashboard/layout', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ layout: currentLayout })
            });
        } catch (err) {
            console.error('Failed to save layout:', err);
        }
    }

    /**
     * Load layout from server
     */
    async function loadLayout() {
        try {
            const res = await fetch('/api/dashboard/layout', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to load layout');
            const data = await res.json();
            return data.layout;
        } catch (err) {
            console.error('Failed to load layout:', err);
            return null;
        }
    }

    /**
     * Create the DOM element for a widget
     */
    function createWidgetElement(widgetData) {
        const def = window.WidgetRegistry.get(widgetData.type);
        if (!def) return null;

        const widgetId = widgetData.id || genId();

        // Build header with badge support for inbox
        let headerExtra = '';
        if (widgetData.type === 'inbox') {
            headerExtra = ' <span class="inbox-badge empty" id="inbox-badge">0</span>';
        }

        // Navigate link
        const navMap = {
            'my-day': 'tasks',
            'week-cal': 'calendar',
            'quick-notes': 'notes',
            'inbox': null,
            'areas': null,
            'base-view': null
        };
        const navTarget = navMap[widgetData.type];
        const navLink = navTarget
            ? `<a href="#" class="widget-link" data-navigate="${navTarget}">View All →</a>`
            : (widgetData.type === 'inbox' ? '<a href="#" class="widget-link" id="inbox-process-all">Process All →</a>' : '');

        const content = document.createElement('div');
        content.innerHTML = `
            <div class="widget-frame">
                <div class="widget-frame-header">
                    <h2>${def.icon} ${def.label}${headerExtra}</h2>
                    <div class="widget-frame-actions">
                        ${navLink}
                        ${def.configurable ? '<button class="widget-config-btn" title="Configure">⚙</button>' : ''}
                        <button class="widget-remove-btn" title="Remove widget">×</button>
                    </div>
                </div>
                <div class="widget-frame-body" id="widget-body-${widgetId}">
                    <div class="widget-skeleton"></div>
                </div>
            </div>
        `;

        return {
            id: widgetId,
            el: content.firstElementChild,
            x: widgetData.x,
            y: widgetData.y,
            w: widgetData.w || def.defaultSize.w,
            h: widgetData.h || def.defaultSize.h,
            minW: def.minSize.w,
            minH: def.minSize.h,
            type: widgetData.type,
            config: widgetData.config || {}
        };
    }

    /**
     * Render widget content into its body container
     */
    function renderWidgetContent(widgetId, type, config) {
        const body = document.getElementById('widget-body-' + widgetId);
        if (!body) return;
        window.WidgetRegistry.renderWidget(type, body, config, widgetId);
    }

    /**
     * Initialize the dashboard
     */
    async function initDashboard() {
        const container = document.getElementById('dashboard-grid');
        if (!container) return;

        // Load layout
        const layout = await loadLayout();
        if (!layout || !layout.widgets || !layout.widgets.length) return;
        currentLayout = layout;

        // Initialize GridStack
        grid = GridStack.init({
            column: 12,
            cellHeight: 70,
            animate: true,
            float: false,
            disableDrag: true,
            disableResize: true,
            margin: 6,
            removable: false
        }, container);

        // Add widgets from layout
        grid.batchUpdate();
        for (const w of layout.widgets) {
            const widgetData = createWidgetElement(w);
            if (!widgetData) continue;

            const gsItem = grid.addWidget({
                id: widgetData.id,
                x: widgetData.x,
                y: widgetData.y,
                w: widgetData.w,
                h: widgetData.h,
                minW: widgetData.minW,
                minH: widgetData.minH,
                content: widgetData.el.outerHTML
            });

            // Store metadata on the DOM element
            gsItem.dataset.widgetType = widgetData.type;
            gsItem.dataset.widgetConfig = JSON.stringify(widgetData.config);
        }
        grid.commit();

        // Render all widget contents (after DOM is settled)
        setTimeout(() => {
            for (const w of layout.widgets) {
                const widgetId = w.id;
                renderWidgetContent(widgetId, w.type, w.config || {});
            }
            bindWidgetEvents();
        }, 100);

        // Listen for grid changes (drag/resize)
        grid.on('change', () => {
            scheduleSave();
        });

        // Setup edit mode toggle
        setupEditMode();

        // Setup add widget button
        setupAddWidget();
    }

    /**
     * Bind remove/config buttons on all widgets
     */
    function bindWidgetEvents() {
        document.querySelectorAll('.widget-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const gsItem = btn.closest('.grid-stack-item');
                if (!gsItem || !grid) return;
                const type = gsItem.dataset.widgetType;
                const def = window.WidgetRegistry.get(type);
                const label = def ? def.label : 'this widget';
                if (confirm(`Remove "${label}" from dashboard?`)) {
                    grid.removeWidget(gsItem);
                    scheduleSave();
                }
            });
        });

        document.querySelectorAll('.widget-config-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const gsItem = btn.closest('.grid-stack-item');
                if (!gsItem) return;
                const type = gsItem.dataset.widgetType;
                const def = window.WidgetRegistry.get(type);
                if (!def || !def.configModal) return;

                const existingConfig = JSON.parse(gsItem.dataset.widgetConfig || '{}');
                try {
                    const newConfig = await def.configModal(existingConfig);
                    gsItem.dataset.widgetConfig = JSON.stringify(newConfig);
                    const widgetId = gsItem.getAttribute('gs-id');
                    renderWidgetContent(widgetId, type, newConfig);
                    scheduleSave();
                } catch (err) {
                    // User cancelled
                }
            });
        });

        // Navigate links
        document.querySelectorAll('.widget-frame-actions .widget-link[data-navigate]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = link.dataset.navigate;
                if (window.kanban && window.kanban.switchTab) {
                    window.kanban.switchTab(target);
                } else {
                    const tab = document.querySelector(`.tab[data-tab="${target}"]`);
                    if (tab) tab.click();
                }
            });
        });
    }

    /**
     * Setup edit mode toggle
     */
    function setupEditMode() {
        const btn = document.getElementById('dashboard-edit-toggle');
        if (!btn) return;

        btn.addEventListener('click', () => {
            editMode = !editMode;
            const container = document.querySelector('.dashboard-container');

            if (editMode) {
                btn.classList.add('active');
                btn.innerHTML = '✓ <span>Done</span>';
                container.classList.add('dashboard-editing');
                grid.enableMove(true);
                grid.enableResize(true);
            } else {
                btn.classList.remove('active');
                btn.innerHTML = '✏️ <span>Edit</span>';
                container.classList.remove('dashboard-editing');
                grid.enableMove(false);
                grid.enableResize(false);
                saveLayout(); // Final save when exiting edit mode
            }
        });
    }

    /**
     * Setup add widget button
     */
    function setupAddWidget() {
        const btn = document.getElementById('widget-add-btn');
        if (!btn || !window.WidgetPicker) return;

        btn.addEventListener('click', async () => {
            const result = await window.WidgetPicker.open();
            if (!result) return;

            const { type, config } = result;
            const def = window.WidgetRegistry.get(type);
            if (!def) return;

            const widgetId = genId();
            const widgetData = {
                id: widgetId,
                type: type,
                x: 0,
                y: 999, // Bottom of grid
                w: def.defaultSize.w,
                h: def.defaultSize.h,
                config: config
            };

            const widgetEl = createWidgetElement(widgetData);
            if (!widgetEl) return;

            const gsItem = grid.addWidget({
                id: widgetId,
                w: widgetEl.w,
                h: widgetEl.h,
                minW: widgetEl.minW,
                minH: widgetEl.minH,
                content: widgetEl.el.outerHTML,
                autoPosition: true
            });

            gsItem.dataset.widgetType = type;
            gsItem.dataset.widgetConfig = JSON.stringify(config);

            // Render content
            setTimeout(() => {
                renderWidgetContent(widgetId, type, config);
                bindWidgetEvents();
            }, 100);

            scheduleSave();
        });
    }

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        // Small delay to ensure GridStack and registry are loaded
        setTimeout(initDashboard, 50);
    });

    // Expose for external use
    window.DashboardController = {
        refreshWidget(widgetId, type) {
            const def = window.WidgetRegistry.get(type);
            if (!def) return;
            const body = document.getElementById('widget-body-' + widgetId);
            if (body) window.WidgetRegistry.refreshWidget(type, body, {}, widgetId);
        },
        saveLayout,
        isEditMode() { return editMode; }
    };
})();
