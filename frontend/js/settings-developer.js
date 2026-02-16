/**
 * Settings Developer Section
 * API Keys management with redesigned scope picker
 * - Collapsible group cards with toggle switches
 * - Nested groups (parent→child cascade)
 * - Presets, search/filter, scope counter
 */
(function() {
    'use strict';

    let initialized = false;
    let availableScopes = [];
    let userRole = null;
    let scopeGroups = [];
    let allScopes = [];
    let enabledScopes = new Set();

    // Fallback scope groups if backend hasn't landed yet
    const FALLBACK_GROUPS = [
        { id: 'tasks', label: 'Tasks', icon: '☑', description: 'Task management, lists, and items', scopes: ['tasks:read', 'tasks:write', 'tasks:delete'], children: null },
        { id: 'notes', label: 'Notes', icon: '📝', description: 'Notes and documentation', scopes: ['notes:read', 'notes:write', 'notes:delete'], children: null },
        { id: 'people', label: 'People & Contacts', icon: '👤', description: 'Contact and people management', scopes: ['people:read', 'people:write', 'people:delete'], children: null },
        { id: 'bases', label: 'Bases & Records', icon: '🗄', description: 'Database bases and record access', scopes: ['bases:read', 'bases:write', 'bases:delete'], children: [
            { id: 'bases.records', label: 'Records', scopes: ['records:read', 'records:write', 'records:delete'] }
        ]},
        { id: 'calendar', label: 'Calendar', icon: '📅', description: 'Calendar events and scheduling', scopes: ['calendar:read', 'calendar:write', 'calendar:delete'], children: null },
        { id: 'jobs', label: 'Jobs', icon: '🔨', description: 'Apex job management', scopes: ['jobs:read', 'jobs:write', 'jobs:delete'], children: [
            { id: 'jobs.estimates', label: 'Estimates', scopes: ['jobs.estimates:read', 'jobs.estimates:write'] },
            { id: 'jobs.payments', label: 'Payments', scopes: ['jobs.payments:read', 'jobs.payments:write'] },
            { id: 'jobs.labor', label: 'Labor', scopes: ['jobs.labor:read', 'jobs.labor:write'] },
            { id: 'jobs.notes', label: 'Job Notes', scopes: ['jobs.notes:read', 'jobs.notes:write'] },
            { id: 'jobs.phases', label: 'Phases', scopes: ['jobs.phases:read', 'jobs.phases:write'] }
        ]},
        { id: 'users', label: 'Users', icon: '👥', description: 'User management', scopes: ['users:read', 'users:write', 'users:admin'], children: null },
        { id: 'api_keys', label: 'API Keys', icon: '🔑', description: 'API key management', scopes: ['api_keys:manage'], children: null },
        { id: 'org', label: 'Organization', icon: '🏢', description: 'Organization settings', scopes: ['org:read', 'org:write', 'org:admin'], children: null },
    ];

    async function initDeveloper() {
        if (initialized) return;
        initialized = true;

        try {
            var [keysRes, scopesRes] = await Promise.all([
                fetch('/api/api-keys', { credentials: 'include' }),
                fetch('/api/api-keys/scopes', { credentials: 'include' })
            ]);

            if (keysRes.ok) {
                var data = await keysRes.json();
                userRole = data.role;
                renderKeysList(data.keys || []);
            }

            if (scopesRes.ok) {
                var data = await scopesRes.json();
                if (data.groups && Array.isArray(data.groups)) {
                    scopeGroups = data.groups;
                    allScopes = data.allScopes || buildAllScopes(scopeGroups);
                    availableScopes = data.scopes || allScopes;
                } else {
                    availableScopes = data.scopes || [];
                    scopeGroups = FALLBACK_GROUPS;
                    allScopes = buildAllScopes(scopeGroups);
                }
            } else {
                scopeGroups = FALLBACK_GROUPS;
                allScopes = buildAllScopes(scopeGroups);
                availableScopes = allScopes;
            }

            renderScopePicker(scopeGroups, availableScopes, userRole);
            setupEventListeners();
        } catch (err) {
            console.error('Failed to init developer section:', err);
            scopeGroups = FALLBACK_GROUPS;
            allScopes = buildAllScopes(scopeGroups);
            availableScopes = allScopes;
            renderScopePicker(scopeGroups, availableScopes, userRole);
            setupEventListeners();
        }
    }

    function buildAllScopes(groups) {
        var result = [];
        groups.forEach(function(g) {
            result = result.concat(g.scopes || []);
            if (g.children) {
                g.children.forEach(function(c) {
                    result = result.concat(c.scopes || []);
                });
            }
        });
        return result;
    }

    function getActionLabel(scope) {
        var parts = scope.split(':');
        var action = parts[parts.length - 1];
        var labels = { read: 'Read', write: 'Write', delete: 'Delete', admin: 'Admin', manage: 'Manage' };
        return labels[action] || action.charAt(0).toUpperCase() + action.slice(1);
    }

    function getScopeSummary(groupScopes, allowed) {
        var enabled = 0;
        var total = groupScopes.length;
        var readOnly = true;
        groupScopes.forEach(function(s) {
            if (enabledScopes.has(s)) {
                enabled++;
                if (!s.endsWith(':read')) readOnly = false;
            }
        });
        if (enabled === 0) return '<span class="scope-summary-text">None enabled</span>';
        if (enabled === total) return '<span class="scope-summary-text scope-summary-all">All enabled</span>';
        if (readOnly && enabled > 0) return '<span class="scope-summary-text">Read only</span>';
        return '<span class="scope-summary-text">' + enabled + ' of ' + total + '</span>';
    }

    function getAllGroupScopes(group) {
        var scopes = (group.scopes || []).slice();
        if (group.children) {
            group.children.forEach(function(c) {
                scopes = scopes.concat(c.scopes || []);
            });
        }
        return scopes;
    }

    // ─── Render ───

    function renderScopePicker(groups, allowed, role) {
        var container = document.getElementById('scope-groups');
        var html = '';

        // Search filter
        html += '<div class="scope-filter-wrap">' +
            '<svg class="scope-filter-icon" viewBox="0 0 24 24" width="14" height="14"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>' +
            '<input type="text" class="scope-filter-input" id="scope-filter" placeholder="Filter scopes..." />' +
            '</div>';

        groups.forEach(function(group) {
            html += renderGroup(group, allowed, false);
        });

        container.innerHTML = html;

        // Bind all interactions
        bindGroupInteractions(container);
        updateScopeCounter();
        updatePresetState();
    }

    function renderGroup(group, allowed, isNested) {
        var groupScopes = getAllGroupScopes(group);
        var cls = isNested ? 'scope-group scope-nested' : 'scope-group';
        var icon = group.icon || '';

        var html = '<div class="' + cls + '" data-group-id="' + group.id + '">';

        // Header
        html += '<div class="scope-group-header" data-group-id="' + group.id + '">' +
            '<div class="scope-group-header-left">' +
                '<svg class="scope-chevron" viewBox="0 0 24 24" width="16" height="16"><path d="M9 18l6-6-6-6"/></svg>' +
                (icon ? '<span class="scope-group-icon">' + icon + '</span>' : '') +
                '<span class="scope-group-label">' + escapeHtml(group.label) + '</span>' +
                '<span class="scope-group-summary" data-group-id="' + group.id + '">' + getScopeSummary(groupScopes, allowed) + '</span>' +
            '</div>' +
            '<label class="scope-group-all-toggle toggle-switch-sm" onclick="event.stopPropagation()">' +
                '<input type="checkbox" class="scope-group-all-cb" data-group-id="' + group.id + '" />' +
                '<span class="slider-sm"></span>' +
                '<span class="scope-all-label">All</span>' +
            '</label>' +
        '</div>';

        // Body (collapsible)
        html += '<div class="scope-group-body" data-group-id="' + group.id + '">';

        // Own scopes
        (group.scopes || []).forEach(function(scope) {
            var isAllowed = allowed.includes(scope);
            html += renderScopeRow(scope, isAllowed);
        });

        // Nested children
        if (group.children && group.children.length) {
            html += '<div class="scope-nested-children">';
            group.children.forEach(function(child) {
                html += renderGroup(child, allowed, true);
            });
            html += '</div>';
        }

        html += '</div></div>';
        return html;
    }

    function renderScopeRow(scope, isAllowed) {
        var label = getActionLabel(scope);
        var disabledClass = isAllowed ? '' : ' scope-row-disabled';

        return '<div class="scope-row' + disabledClass + '" data-scope="' + scope + '">' +
            '<span class="scope-row-label">' + escapeHtml(label) + '</span>' +
            (isAllowed ?
                '<label class="toggle-switch-sm scope-row-toggle" onclick="event.stopPropagation()">' +
                    '<input type="checkbox" class="scope-toggle-cb" data-scope="' + scope + '" />' +
                    '<span class="slider-sm"></span>' +
                '</label>'
                :
                '<span class="scope-row-lock" title="Requires a higher role">' +
                    '<svg viewBox="0 0 24 24" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' +
                '</span>'
            ) +
        '</div>';
    }

    function bindGroupInteractions(container) {
        // Header click → expand/collapse
        container.querySelectorAll('.scope-group-header').forEach(function(header) {
            header.addEventListener('click', function(e) {
                if (e.target.closest('.scope-group-all-toggle')) return;
                var group = header.closest('.scope-group');
                group.classList.toggle('expanded');
            });
        });

        // Group "All" toggle
        container.querySelectorAll('.scope-group-all-cb').forEach(function(cb) {
            cb.addEventListener('change', function() {
                var groupId = cb.dataset.groupId;
                var group = findGroup(groupId);
                if (!group) return;
                var scopes = getAllGroupScopes(group);
                scopes.forEach(function(s) {
                    if (availableScopes.includes(s)) {
                        if (cb.checked) enabledScopes.add(s);
                        else enabledScopes.delete(s);
                    }
                });
                syncTogglesFromState(container);
                updateAllGroupStates(container);
                updateScopeCounter();
                updatePresetState();
            });
        });

        // Individual scope toggles
        container.querySelectorAll('.scope-toggle-cb').forEach(function(cb) {
            cb.addEventListener('change', function() {
                var scope = cb.dataset.scope;
                if (cb.checked) {
                    enabledScopes.add(scope);
                    // Cascade parent→child: if parent read is enabled, enable child reads
                    cascadeParentToChildren(scope);
                } else {
                    enabledScopes.delete(scope);
                }
                syncTogglesFromState(container);
                updateAllGroupStates(container);
                updateScopeCounter();
                updatePresetState();
            });
        });

        // Row click toggles the scope
        container.querySelectorAll('.scope-row:not(.scope-row-disabled)').forEach(function(row) {
            row.addEventListener('click', function(e) {
                if (e.target.closest('.scope-row-toggle')) return;
                var cb = row.querySelector('.scope-toggle-cb');
                if (cb) {
                    cb.checked = !cb.checked;
                    cb.dispatchEvent(new Event('change'));
                }
            });
        });

        // Filter
        var filterInput = container.querySelector('#scope-filter');
        if (filterInput) {
            filterInput.addEventListener('input', function() {
                filterScopes(filterInput.value.trim().toLowerCase());
            });
        }
    }

    function cascadeParentToChildren(scope) {
        // e.g. enabling jobs:read → enable jobs.estimates:read, jobs.payments:read, etc.
        var parts = scope.split(':');
        if (parts.length !== 2) return;
        var resource = parts[0];
        var action = parts[1];

        scopeGroups.forEach(function(group) {
            if (group.id === resource && group.children) {
                group.children.forEach(function(child) {
                    var childScope = child.id + ':' + action;
                    if ((child.scopes || []).includes(childScope) && availableScopes.includes(childScope)) {
                        enabledScopes.add(childScope);
                    }
                });
            }
        });
    }

    function findGroup(id) {
        for (var i = 0; i < scopeGroups.length; i++) {
            if (scopeGroups[i].id === id) return scopeGroups[i];
            if (scopeGroups[i].children) {
                for (var j = 0; j < scopeGroups[i].children.length; j++) {
                    if (scopeGroups[i].children[j].id === id) return scopeGroups[i].children[j];
                }
            }
        }
        return null;
    }

    function syncTogglesFromState(container) {
        container.querySelectorAll('.scope-toggle-cb').forEach(function(cb) {
            cb.checked = enabledScopes.has(cb.dataset.scope);
        });
    }

    function updateAllGroupStates(container) {
        container.querySelectorAll('.scope-group-all-cb').forEach(function(cb) {
            var groupId = cb.dataset.groupId;
            var group = findGroup(groupId);
            if (!group) return;
            var scopes = getAllGroupScopes(group);
            var allEnabled = scopes.length > 0;
            var anyEnabled = false;
            scopes.forEach(function(s) {
                if (availableScopes.includes(s)) {
                    if (enabledScopes.has(s)) anyEnabled = true;
                    else allEnabled = false;
                }
            });
            cb.checked = allEnabled;
            cb.indeterminate = anyEnabled && !allEnabled;
        });

        // Update summaries
        container.querySelectorAll('.scope-group-summary').forEach(function(el) {
            var groupId = el.dataset.groupId;
            var group = findGroup(groupId);
            if (!group) return;
            el.innerHTML = getScopeSummary(getAllGroupScopes(group), availableScopes);
        });
    }

    function updateScopeCounter() {
        var total = allScopes.length;
        var selected = enabledScopes.size;
        var counter = document.getElementById('scope-counter');
        if (!counter) return;
        counter.textContent = selected + ' of ' + total + ' scopes enabled';

        counter.className = 'scope-counter';
        var ratio = total > 0 ? selected / total : 0;
        if (ratio >= 1) counter.classList.add('scope-counter-red');
        else if (ratio > 0.6) counter.classList.add('scope-counter-orange');
        else if (selected > 0) counter.classList.add('scope-counter-green');
    }

    function updatePresetState() {
        var allEnabled = allScopes.every(function(s) {
            return !availableScopes.includes(s) || enabledScopes.has(s);
        });
        var readOnlyEnabled = true;
        var onlyReads = true;
        allScopes.forEach(function(s) {
            if (!availableScopes.includes(s)) return;
            if (s.endsWith(':read')) {
                if (!enabledScopes.has(s)) readOnlyEnabled = false;
            } else {
                if (enabledScopes.has(s)) onlyReads = false;
            }
        });

        document.querySelectorAll('.scope-preset-btn').forEach(function(b) { b.classList.remove('active'); });
        if (allEnabled && enabledScopes.size > 0) {
            document.querySelector('[data-preset="full"]').classList.add('active');
        } else if (readOnlyEnabled && onlyReads && enabledScopes.size > 0) {
            document.querySelector('[data-preset="readonly"]').classList.add('active');
        } else {
            document.querySelector('[data-preset="custom"]').classList.add('active');
        }
    }

    function applyPreset(preset) {
        enabledScopes.clear();
        if (preset === 'full') {
            allScopes.forEach(function(s) {
                if (availableScopes.includes(s)) enabledScopes.add(s);
            });
        } else if (preset === 'readonly') {
            allScopes.forEach(function(s) {
                if (availableScopes.includes(s) && s.endsWith(':read')) enabledScopes.add(s);
            });
        }

        var container = document.getElementById('scope-groups');
        syncTogglesFromState(container);
        updateAllGroupStates(container);
        updateScopeCounter();

        document.querySelectorAll('.scope-preset-btn').forEach(function(b) { b.classList.remove('active'); });
        document.querySelector('[data-preset="' + preset + '"]').classList.add('active');
    }

    function getSelectedScopes() {
        return Array.from(enabledScopes);
    }

    function filterScopes(query) {
        var groups = document.querySelectorAll('#scope-groups > .scope-group');
        groups.forEach(function(groupEl) {
            if (!query) {
                groupEl.style.display = '';
                groupEl.querySelectorAll('.scope-row, .scope-nested').forEach(function(el) { el.style.display = ''; });
                return;
            }
            var groupLabel = groupEl.querySelector('.scope-group-label');
            var groupMatch = groupLabel && groupLabel.textContent.toLowerCase().includes(query);
            var anyVisible = groupMatch;

            groupEl.querySelectorAll('.scope-row').forEach(function(row) {
                var label = row.querySelector('.scope-row-label');
                var matches = groupMatch || (label && label.textContent.toLowerCase().includes(query));
                row.style.display = matches ? '' : 'none';
                if (matches) anyVisible = true;
            });

            // Nested groups
            groupEl.querySelectorAll('.scope-nested').forEach(function(nested) {
                var nestedLabel = nested.querySelector('.scope-group-label');
                var nestedMatch = nestedLabel && nestedLabel.textContent.toLowerCase().includes(query);
                var nestedAny = nestedMatch || groupMatch;
                nested.querySelectorAll('.scope-row').forEach(function(row) {
                    var label = row.querySelector('.scope-row-label');
                    var matches = nestedMatch || groupMatch || (label && label.textContent.toLowerCase().includes(query));
                    row.style.display = matches ? '' : 'none';
                    if (matches) nestedAny = true;
                });
                nested.style.display = nestedAny ? '' : 'none';
                if (nestedAny) anyVisible = true;
            });

            groupEl.style.display = anyVisible ? '' : 'none';

            // Auto-expand groups that match filter
            if (anyVisible && query) groupEl.classList.add('expanded');
        });
    }

    // ─── Keys List ───

    function renderKeysList(keys) {
        var container = document.getElementById('api-keys-list');
        if (!keys.length) {
            container.innerHTML =
                '<div class="developer-empty-state">' +
                    '<svg viewBox="0 0 24 24" width="40" height="40" style="stroke: var(--apex-text-muted); stroke-width: 1.5; fill: none; margin-bottom: 8px;"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>' +
                    '<p>No API keys yet. Create one below.</p>' +
                '</div>';
            return;
        }

        var html = '<div class="api-keys-table-wrap"><table class="api-keys-table"><thead><tr>' +
            '<th>Name</th><th>Key</th><th>Scopes</th><th>Created</th><th>Last Used</th><th>Expires</th><th>Status</th><th></th>' +
            '</tr></thead><tbody>';

        keys.forEach(function(key) {
            var isExpired = key.expires_at && new Date(key.expires_at) < new Date();
            var isRevoked = key.revoked_at || key.status === 'revoked';
            var status = isRevoked ? 'revoked' : (isExpired ? 'expired' : 'active');
            var statusClass = status === 'active' ? 'status-active' : 'status-expired';
            var scopeCount = key.scopes ? (Array.isArray(key.scopes) ? key.scopes.length : JSON.parse(key.scopes || '[]').length) : 0;

            html += '<tr>' +
                '<td class="key-name-cell">' + escapeHtml(key.name) + '</td>' +
                '<td class="key-prefix-cell"><code>' + escapeHtml(key.prefix || key.key_prefix || '—') + '</code></td>' +
                '<td><span class="scope-count-badge">' + scopeCount + '</span></td>' +
                '<td>' + formatDate(key.created_at) + '</td>' +
                '<td>' + (key.last_used_at ? formatDate(key.last_used_at) : '<span class="text-muted">Never</span>') + '</td>' +
                '<td>' + (key.expires_at ? formatDate(key.expires_at) : '<span class="text-muted">Never</span>') + '</td>' +
                '<td><span class="key-status ' + statusClass + '">' + status + '</span></td>' +
                '<td class="key-actions-cell">';

            if (status === 'active') {
                if (userRole === 'management' || userRole === 'developer') {
                    html += '<button class="key-action-btn key-copy-btn" data-id="' + key.id + '" title="Copy Full Key">' +
                        '<svg viewBox="0 0 24 24" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
                        '</button>';
                }
                html += '<button class="key-action-btn key-revoke-btn" data-id="' + key.id + '" data-name="' + escapeHtml(key.name) + '" title="Revoke">Revoke</button>';
            }

            html += '</td></tr>';
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;

        container.querySelectorAll('.key-revoke-btn').forEach(function(btn) {
            btn.addEventListener('click', function() { revokeKey(btn.dataset.id, btn.dataset.name); });
        });
        container.querySelectorAll('.key-copy-btn').forEach(function(btn) {
            btn.addEventListener('click', function() { copyKey(btn.dataset.id); });
        });
    }

    async function createKey() {
        var nameInput = document.getElementById('key-name-input');
        var expiryInput = document.getElementById('key-expiry-input');
        var btn = document.getElementById('generate-key-btn');
        var name = nameInput.value.trim();

        if (!name) {
            Settings.showToast('Key name is required', 'error');
            nameInput.focus();
            return;
        }

        var scopes = getSelectedScopes();
        if (scopes.length === 0) {
            Settings.showToast('Select at least one scope', 'error');
            return;
        }

        btn.disabled = true;
        btn.querySelector('.btn-text').textContent = 'Generating...';
        btn.querySelector('.btn-spinner').style.display = '';

        try {
            var body = { name: name, scopes: scopes };
            if (expiryInput.value) body.expiresAt = expiryInput.value;

            var res = await fetch('/api/api-keys', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            var data = await res.json();
            if (!res.ok) {
                Settings.showToast(data.error || 'Failed to create key', 'error');
                return;
            }

            var display = document.getElementById('new-key-display');
            var keyText = document.getElementById('new-key-value-text');
            keyText.textContent = data.key.full_key || data.key.key || '—';
            display.style.display = 'block';
            display.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            document.getElementById('new-key-copy-btn').onclick = function() {
                navigator.clipboard.writeText(keyText.textContent).then(function() {
                    Settings.showToast('Key copied to clipboard', 'success');
                });
            };

            nameInput.value = '';
            expiryInput.value = '';
            applyPreset('custom');

            var keysRes = await fetch('/api/api-keys', { credentials: 'include' });
            if (keysRes.ok) {
                var keysData = await keysRes.json();
                renderKeysList(keysData.keys || []);
            }

            Settings.showToast('API key created successfully', 'success');
        } catch (err) {
            console.error('Create key error:', err);
            Settings.showToast('Failed to create key', 'error');
        } finally {
            btn.disabled = false;
            btn.querySelector('.btn-text').textContent = 'Generate Key';
            btn.querySelector('.btn-spinner').style.display = 'none';
        }
    }

    function revokeKey(id, name) {
        Settings.showConfirmation(
            'Revoke API Key',
            'Are you sure you want to revoke "' + (name || 'this key') + '"? This action cannot be undone.',
            async function() {
                try {
                    var res = await fetch('/api/api-keys/' + id, { method: 'DELETE', credentials: 'include' });
                    if (!res.ok) {
                        var data = await res.json();
                        Settings.showToast(data.error || 'Failed to revoke key', 'error');
                        return;
                    }
                    Settings.showToast('API key revoked', 'success');
                    var keysRes = await fetch('/api/api-keys', { credentials: 'include' });
                    if (keysRes.ok) {
                        var keysData = await keysRes.json();
                        renderKeysList(keysData.keys || []);
                    }
                } catch (err) {
                    Settings.showToast('Failed to revoke key', 'error');
                }
            }
        );
    }

    async function copyKey(id) {
        try {
            var res = await fetch('/api/api-keys/' + id + '/full', { credentials: 'include' });
            if (!res.ok) {
                var data = await res.json();
                Settings.showToast(data.error || 'Cannot retrieve key', 'error');
                return;
            }
            var data = await res.json();
            await navigator.clipboard.writeText(data.key);
            Settings.showToast('Key copied to clipboard', 'success');
        } catch (err) {
            Settings.showToast('Failed to copy key', 'error');
        }
    }

    function setupEventListeners() {
        var form = document.getElementById('create-key-form');
        if (form) {
            form.addEventListener('submit', function(e) { e.preventDefault(); createKey(); });
        }

        document.querySelectorAll('.scope-preset-btn').forEach(function(btn) {
            btn.addEventListener('click', function() { applyPreset(btn.dataset.preset); });
        });
    }

    // Helpers
    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '—';
        var d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    window.SettingsDeveloper = { init: initDeveloper };
})();
