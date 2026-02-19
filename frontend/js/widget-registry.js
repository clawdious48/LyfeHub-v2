/**
 * Widget Registry
 * Central registry of all dashboard widget types.
 * Each widget defines: label, icon, render function, default size, and optional config.
 */
(function() {
    'use strict';

    const WidgetRegistry = {
        _types: {},

        /**
         * Register a widget type
         */
        register(type, definition) {
            this._types[type] = {
                type,
                label: definition.label || type,
                icon: definition.icon || '📦',
                render: definition.render,       // fn(container, config, widgetId)
                refresh: definition.refresh,     // fn(container, config, widgetId) — optional
                defaultSize: definition.defaultSize || { w: 6, h: 4 },
                minSize: definition.minSize || { w: 3, h: 2 },
                maxSize: definition.maxSize || { w: 12, h: 12 },
                configurable: !!definition.configurable,
                configModal: definition.configModal || null,  // fn(existingConfig) => Promise<config>
            };
        },

        /**
         * Get a widget type definition
         */
        get(type) {
            return this._types[type] || null;
        },

        /**
         * Get all registered types
         */
        getAll() {
            return Object.values(this._types);
        },

        /**
         * Render a widget into a container
         */
        renderWidget(type, container, config, widgetId) {
            const def = this._types[type];
            if (!def || !def.render) {
                container.innerHTML = '<div class="widget-empty"><p>Unknown widget type</p></div>';
                return;
            }
            try {
                def.render(container, config || {}, widgetId);
            } catch (err) {
                console.error(`Widget render error (${type}):`, err);
                container.innerHTML = '<div class="widget-empty"><p>Widget failed to load</p></div>';
            }
        },

        /**
         * Refresh a widget
         */
        refreshWidget(type, container, config, widgetId) {
            const def = this._types[type];
            if (def && def.refresh) {
                def.refresh(container, config || {}, widgetId);
            } else if (def && def.render) {
                def.render(container, config || {}, widgetId);
            }
        }
    };

    // =============================================
    // Register built-in widgets
    // =============================================

    // --- My Day ---
    WidgetRegistry.register('my-day', {
        label: 'My Day',
        icon: '☀️',
        defaultSize: { w: 6, h: 4 },
        minSize: { w: 4, h: 3 },
        render(container) {
            container.id = 'my-day-content';
            if (window.MyDayWidget) {
                window.MyDayWidget.refresh();
            } else {
                container.innerHTML = '<div class="widget-skeleton"></div>';
                // MyDayWidget will init itself when it finds #my-day-content
            }
        },
        refresh(container) {
            if (window.MyDayWidget) window.MyDayWidget.refresh();
        }
    });

    // --- Inbox ---
    WidgetRegistry.register('inbox', {
        label: 'Inbox',
        icon: '📥',
        defaultSize: { w: 6, h: 4 },
        minSize: { w: 4, h: 3 },
        render(container) {
            container.id = 'inbox-content';
            if (window.InboxWidget) {
                window.InboxWidget.refresh();
            } else {
                container.innerHTML = '<div class="widget-skeleton"></div>';
            }
        },
        refresh(container) {
            if (window.InboxWidget) window.InboxWidget.refresh();
        }
    });

    // --- Week Calendar ---
    WidgetRegistry.register('week-cal', {
        label: 'This Week',
        icon: '📅',
        defaultSize: { w: 6, h: 3 },
        minSize: { w: 4, h: 3 },
        render(container) {
            container.id = 'week-calendar-content';
            if (window.WeekCalendarWidget) {
                window.WeekCalendarWidget.refresh();
            } else {
                container.innerHTML = '<div class="widget-skeleton"></div>';
            }
        },
        refresh(container) {
            if (window.WeekCalendarWidget) window.WeekCalendarWidget.refresh();
        }
    });

    // --- Quick Notes ---
    WidgetRegistry.register('quick-notes', {
        label: 'Quick Notes',
        icon: '📝',
        defaultSize: { w: 6, h: 3 },
        minSize: { w: 4, h: 3 },
        render(container) {
            container.id = 'quick-notes-content';
            if (window.QuickNotesWidget) {
                window.QuickNotesWidget.refresh();
            } else {
                container.innerHTML = '<div class="widget-skeleton"></div>';
            }
        },
        refresh(container) {
            if (window.QuickNotesWidget) window.QuickNotesWidget.refresh();
        }
    });

    // --- Base View (configurable) ---
    WidgetRegistry.register('base-view', {
        label: 'Table View',
        icon: '📊',
        defaultSize: { w: 6, h: 4 },
        minSize: { w: 4, h: 3 },
        configurable: true,
        configModal(existingConfig) {
            if (window.baseViewWidget && window.baseViewWidget.showConfigModal) {
                return window.baseViewWidget.showConfigModal(existingConfig);
            }
            return Promise.reject(new Error('Base view config not available'));
        },
        render(container, config) {
            if (window.baseViewWidget && config && config.base_id) {
                window.baseViewWidget.render(container, config);
            } else {
                container.innerHTML = '<div class="widget-empty"><p>No view configured</p><p class="widget-empty-sub">Edit this widget to select a table view</p></div>';
            }
        }
    });

    // --- Areas ---
    WidgetRegistry.register('areas', {
        label: 'Areas',
        icon: '🎯',
        defaultSize: { w: 6, h: 3 },
        minSize: { w: 4, h: 2 },
        render(container) {
            container.id = 'areas-overview-content';
            container.innerHTML = `
                <div class="widget-empty-state" style="text-align: center; padding: 2rem 1rem; color: var(--text-secondary, #888);">
                    <p style="font-size: 1rem; margin-bottom: 0.5rem;">No areas configured yet</p>
                    <p style="font-size: 0.85rem; opacity: 0.7;">Areas help you organize everything by life context</p>
                </div>
            `;
        }
    });

    // Expose globally
    window.WidgetRegistry = WidgetRegistry;
})();
