/**
 * Base View Widget — Shows a compact table from a saved view
 */
(function() {
    'use strict';

    var MAX_ROWS = 8;

    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Render a base_view widget into a container element
     * @param {HTMLElement} container - The widget-content div
     * @param {Object} config - { base_id, view_id, view_name }
     */
    function render(container, config) {
        if (!config || !config.base_id || !config.view_id) {
            container.innerHTML = '<div class="widget-empty"><p>No view configured</p><p class="widget-empty-sub">Edit this widget to select a table view</p></div>';
            return;
        }

        container.innerHTML = '<div class="widget-skeleton"></div>';

        fetch('/api/bases/' + encodeURIComponent(config.base_id) + '/views/' + encodeURIComponent(config.view_id) + '/data', {
            credentials: 'include'
        })
        .then(function(res) {
            if (!res.ok) throw new Error('Failed to load view data');
            return res.json();
        })
        .then(function(data) {
            var records = data.records || data.rows || data || [];
            var columns = data.columns || data.fields || [];

            if (!records.length) {
                container.innerHTML = '<div class="widget-empty"><p>No records</p></div>';
                return;
            }

            // If no columns metadata, derive from first record
            if (!columns.length && records.length) {
                var firstValues = records[0].values || records[0];
                columns = Object.keys(firstValues).filter(function(k) {
                    return k !== 'id' && k !== '_id';
                }).slice(0, 5).map(function(k) {
                    return { name: k, key: k };
                });
            }

            // Limit columns to 5 for compact display
            var displayCols = columns.slice(0, 5);
            var displayRows = records.slice(0, MAX_ROWS);

            var html = '<div class="base-view-widget-table-wrap">';
            html += '<table class="base-view-widget-table">';
            html += '<thead><tr>';
            displayCols.forEach(function(col) {
                html += '<th>' + escapeHtml(col.name || col.label || col.key) + '</th>';
            });
            html += '</tr></thead><tbody>';

            displayRows.forEach(function(record) {
                var values = record.values || record;
                var recordId = record.id || record._id || '';
                html += '<tr' + (recordId ? ' data-record-id="' + escapeHtml(String(recordId)) + '"' : '') + '>';
                displayCols.forEach(function(col) {
                    var key = col.key || col.name;
                    var val = values[key];
                    if (val === null || val === undefined) val = '';
                    if (typeof val === 'object') val = JSON.stringify(val);
                    html += '<td>' + escapeHtml(String(val)) + '</td>';
                });
                html += '</tr>';
            });

            html += '</tbody></table></div>';

            var totalCount = data.total_count || records.length;
            if (totalCount > MAX_ROWS) {
                html += '<div class="base-view-widget-more"><a href="#" class="widget-link" data-navigate="bases">' + (totalCount - MAX_ROWS) + ' more rows →</a></div>';
            }

            container.innerHTML = html;

            // Clickable rows
            var rows = container.querySelectorAll('.base-view-widget-table tbody tr[data-record-id]');
            rows.forEach(function(row) {
                row.addEventListener('click', function() {
                    var recordId = row.dataset.recordId;
                    var baseId = config.base_id;
                    if (window.ContextSheet && typeof ContextSheet.showRecord === 'function') {
                        ContextSheet.showRecord(baseId, recordId);
                    } else {
                        if (window.switchTab) window.switchTab('bases');
                    }
                });
            });

            // "Show more" link click
            var moreLink = container.querySelector('.base-view-widget-more a');
            if (moreLink) {
                moreLink.addEventListener('click', function(e) {
                    e.preventDefault();
                    if (window.switchTab) window.switchTab('bases');
                });
            }
        })
        .catch(function() {
            container.innerHTML = '<div class="widget-empty"><p>Could not load view</p><p class="widget-empty-sub">The view or base may no longer exist</p></div>';
        });
    }

    /**
     * Show configuration flow for selecting a base + view
     * Returns a Promise that resolves with { base_id, view_id, view_name }
     */
    function showConfigModal(existingConfig) {
        return new Promise(function(resolve, reject) {
            var overlay = document.createElement('div');
            overlay.className = 'capture-modal-overlay visible';

            overlay.innerHTML =
                '<div class="capture-modal-backdrop"></div>' +
                '<div class="capture-modal">' +
                    '<div class="capture-modal-header">' +
                        '<h3>Configure Table View Widget</h3>' +
                        '<button class="capture-modal-close" aria-label="Close">&times;</button>' +
                    '</div>' +
                    '<div class="capture-modal-body">' +
                        '<label class="sheet-label">Base</label>' +
                        '<select class="sheet-select" id="bvw-base-select"><option value="">Loading bases...</option></select>' +
                        '<label class="sheet-label" style="margin-top:12px">View</label>' +
                        '<select class="sheet-select" id="bvw-view-select" disabled><option value="">Select a base first</option></select>' +
                    '</div>' +
                    '<div class="capture-modal-footer">' +
                        '<button class="capture-submit-btn" id="bvw-save-btn" disabled>Save</button>' +
                    '</div>' +
                '</div>';

            document.body.appendChild(overlay);

            var baseSelect = overlay.querySelector('#bvw-base-select');
            var viewSelect = overlay.querySelector('#bvw-view-select');
            var saveBtn = overlay.querySelector('#bvw-save-btn');
            var selectedViewName = '';

            function closeOverlay(result) {
                overlay.remove();
                if (result) resolve(result);
                else reject(new Error('Cancelled'));
            }

            overlay.querySelector('.capture-modal-backdrop').addEventListener('click', function() { closeOverlay(null); });
            overlay.querySelector('.capture-modal-close').addEventListener('click', function() { closeOverlay(null); });

            // Load bases
            Promise.all([
                fetch('/api/bases/core/list', { credentials: 'include' }).then(function(r) { return r.ok ? r.json() : { bases: [] }; }),
                fetch('/api/bases/list', { credentials: 'include' }).then(function(r) { return r.ok ? r.json() : { bases: [] }; })
            ]).then(function(results) {
                var allBases = (results[0].bases || results[0] || []).concat(results[1].bases || results[1] || []);
                baseSelect.innerHTML = '<option value="">Select a base...</option>';
                allBases.forEach(function(base) {
                    var opt = document.createElement('option');
                    opt.value = base.id;
                    opt.textContent = (base.icon || '') + ' ' + base.name;
                    if (existingConfig && existingConfig.base_id === base.id) opt.selected = true;
                    baseSelect.appendChild(opt);
                });
                if (existingConfig && existingConfig.base_id) {
                    loadViews(existingConfig.base_id, existingConfig.view_id);
                }
            }).catch(function() {
                baseSelect.innerHTML = '<option value="">Failed to load bases</option>';
            });

            function loadViews(baseId, preselect) {
                viewSelect.innerHTML = '<option value="">Loading views...</option>';
                viewSelect.disabled = true;
                saveBtn.disabled = true;

                fetch('/api/bases/' + encodeURIComponent(baseId) + '/views', { credentials: 'include' })
                    .then(function(r) {
                        if (!r.ok) throw new Error('No views');
                        return r.json();
                    })
                    .then(function(data) {
                        var views = data.views || data || [];
                        if (!views.length) {
                            viewSelect.innerHTML = '<option value="">No views available</option>';
                            return;
                        }
                        viewSelect.innerHTML = '<option value="">Select a view...</option>';
                        views.forEach(function(v) {
                            var opt = document.createElement('option');
                            opt.value = v.id;
                            opt.textContent = v.name || v.id;
                            if (preselect && preselect === v.id) opt.selected = true;
                            viewSelect.appendChild(opt);
                        });
                        viewSelect.disabled = false;
                        if (preselect) {
                            var selOpt = viewSelect.querySelector('option[value="' + preselect + '"]');
                            if (selOpt) {
                                selectedViewName = selOpt.textContent;
                                saveBtn.disabled = false;
                            }
                        }
                    })
                    .catch(function() {
                        viewSelect.innerHTML = '<option value="">Failed to load views</option>';
                    });
            }

            baseSelect.addEventListener('change', function() {
                var baseId = baseSelect.value;
                if (baseId) {
                    loadViews(baseId);
                } else {
                    viewSelect.innerHTML = '<option value="">Select a base first</option>';
                    viewSelect.disabled = true;
                    saveBtn.disabled = true;
                }
            });

            viewSelect.addEventListener('change', function() {
                var selOpt = viewSelect.options[viewSelect.selectedIndex];
                selectedViewName = selOpt ? selOpt.textContent : '';
                saveBtn.disabled = !viewSelect.value;
            });

            saveBtn.addEventListener('click', function() {
                if (!baseSelect.value || !viewSelect.value) return;
                closeOverlay({
                    base_id: baseSelect.value,
                    view_id: viewSelect.value,
                    view_name: selectedViewName
                });
            });
        });
    }

    /**
     * Create a full dashboard widget element for base_view type
     */
    function createWidget(config) {
        var widget = document.createElement('div');
        widget.className = 'dashboard-widget widget-base-view';

        var title = (config && config.view_name) ? config.view_name : 'Table View';

        widget.innerHTML =
            '<div class="widget-header">' +
                '<h2 class="base-view-widget-title" style="cursor:pointer">' + escapeHtml(title) + '</h2>' +
                '<a href="#" class="widget-link base-view-widget-link">View All →</a>' +
            '</div>' +
            '<div class="widget-content base-view-widget-content">' +
                '<div class="widget-skeleton"></div>' +
            '</div>';

        var contentEl = widget.querySelector('.base-view-widget-content');

        // Click title/link to navigate to the base
        function navigateToBase() {
            if (config && config.base_id) {
                if (window.switchTab) window.switchTab('bases');
                setTimeout(function() {
                    if (typeof window.openBase === 'function') {
                        window.openBase(config.base_id, config.view_id);
                    } else {
                        document.dispatchEvent(new CustomEvent('bases:open', { detail: { baseId: config.base_id, viewId: config.view_id } }));
                    }
                }, 100);
            }
        }

        widget.querySelector('.base-view-widget-title').addEventListener('click', navigateToBase);
        widget.querySelector('.base-view-widget-link').addEventListener('click', function(e) {
            e.preventDefault();
            navigateToBase();
        });

        // Render data
        if (config && config.base_id && config.view_id) {
            render(contentEl, config);
        } else {
            contentEl.innerHTML = '<div class="widget-empty"><p>No view configured</p></div>';
        }

        return widget;
    }

    // Expose API
    window.baseViewWidget = {
        render: render,
        showConfigModal: showConfigModal,
        createWidget: createWidget,
        type: 'base_view',
        label: 'Table View',
        icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>'
    };
})();
