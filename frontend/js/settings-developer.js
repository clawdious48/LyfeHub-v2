/**
 * Settings Developer Section
 * API Keys management with scope picker
 */
(function() {
    'use strict';

    let initialized = false;
    let availableScopes = [];
    let userRole = null;
    let allScopes = []; // full list for graying out unavailable ones

    const SCOPE_GROUPS = {
        'Tasks':        { resource: 'tasks',    actions: ['read', 'write', 'delete'] },
        'Notes':        { resource: 'notes',    actions: ['read', 'write', 'delete'] },
        'People':       { resource: 'people',   actions: ['read', 'write', 'delete'] },
        'Bases':        { resource: 'bases',    actions: ['read', 'write', 'delete'] },
        'Records':      { resource: 'records',  actions: ['read', 'write', 'delete'] },
        'Calendar':     { resource: 'calendar', actions: ['read', 'write', 'delete'] },
        'Jobs':         { resource: 'jobs',     actions: ['read', 'write', 'delete'] },
        'Users':        { resource: 'users',    actions: ['read', 'write', 'admin'] },
        'API Keys':     { resource: 'api_keys', actions: ['manage'] },
        'Organization': { resource: 'org',      actions: ['read', 'write', 'admin'] },
    };

    // All possible scopes (for total count and graying out)
    const ALL_POSSIBLE_SCOPES = [];
    Object.values(SCOPE_GROUPS).forEach(function(g) {
        g.actions.forEach(function(a) {
            ALL_POSSIBLE_SCOPES.push(g.resource + ':' + a);
        });
    });

    async function initDeveloper() {
        if (initialized) return;
        initialized = true;

        try {
            const [keysRes, scopesRes] = await Promise.all([
                fetch('/api/api-keys', { credentials: 'include' }),
                fetch('/api/api-keys/scopes', { credentials: 'include' })
            ]);

            if (keysRes.ok) {
                const data = await keysRes.json();
                userRole = data.role;
                renderKeysList(data.keys || []);
            }

            if (scopesRes.ok) {
                const data = await scopesRes.json();
                availableScopes = data.scopes || [];
            }

            renderScopePicker(availableScopes, userRole);
            setupEventListeners();
        } catch (err) {
            console.error('Failed to init developer section:', err);
            document.getElementById('api-keys-list').innerHTML =
                '<p class="text-muted" style="color: var(--apex-danger);">Failed to load API keys.</p>';
        }
    }

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

        // Bind revoke buttons
        container.querySelectorAll('.key-revoke-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                revokeKey(btn.dataset.id, btn.dataset.name);
            });
        });

        // Bind copy buttons
        container.querySelectorAll('.key-copy-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                copyKey(btn.dataset.id);
            });
        });
    }

    function renderScopePicker(allowedScopes, role) {
        var container = document.getElementById('scope-groups');
        var html = '';

        Object.keys(SCOPE_GROUPS).forEach(function(groupName) {
            var group = SCOPE_GROUPS[groupName];
            var groupId = 'scope-group-' + group.resource;

            html += '<div class="scope-group" id="' + groupId + '">' +
                '<div class="scope-group-header">' +
                    '<label class="scope-group-toggle">' +
                        '<input type="checkbox" class="scope-group-all" data-resource="' + group.resource + '" />' +
                        '<span>' + escapeHtml(groupName) + '</span>' +
                    '</label>' +
                '</div>' +
                '<div class="scope-group-actions">';

            group.actions.forEach(function(action) {
                var scope = group.resource + ':' + action;
                var isAllowed = allowedScopes.includes(scope);
                var disabledAttr = isAllowed ? '' : ' disabled';
                var lockedClass = isAllowed ? '' : ' scope-locked';
                var tooltip = isAllowed ? '' : ' title="Requires management or developer role"';

                html += '<label class="scope-action-label' + lockedClass + '"' + tooltip + '>' +
                    '<input type="checkbox" class="scope-checkbox" data-scope="' + scope + '" data-resource="' + group.resource + '"' + disabledAttr + ' />' +
                    '<span class="scope-action-name">' + formatAction(action) + '</span>' +
                    (isAllowed ? '' : '<svg class="scope-lock-icon" viewBox="0 0 24 24" width="12" height="12"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>') +
                '</label>';
            });

            html += '</div></div>';
        });

        container.innerHTML = html;
        updateScopeCounter();

        // Group "select all" toggles
        container.querySelectorAll('.scope-group-all').forEach(function(checkbox) {
            checkbox.addEventListener('change', function() {
                var resource = checkbox.dataset.resource;
                var groupEl = document.getElementById('scope-group-' + resource);
                groupEl.querySelectorAll('.scope-checkbox:not(:disabled)').forEach(function(cb) {
                    cb.checked = checkbox.checked;
                });
                updateScopeCounter();
                updatePresetState();
            });
        });

        // Individual scope toggles
        container.querySelectorAll('.scope-checkbox').forEach(function(cb) {
            cb.addEventListener('change', function() {
                updateGroupAllState(cb.dataset.resource);
                updateScopeCounter();
                updatePresetState();
            });
        });
    }

    function updateGroupAllState(resource) {
        var groupEl = document.getElementById('scope-group-' + resource);
        if (!groupEl) return;
        var checkboxes = groupEl.querySelectorAll('.scope-checkbox:not(:disabled)');
        var allChecked = checkboxes.length > 0;
        checkboxes.forEach(function(cb) { if (!cb.checked) allChecked = false; });
        var groupAll = groupEl.querySelector('.scope-group-all');
        if (groupAll) groupAll.checked = allChecked;
    }

    function updateScopeCounter() {
        var total = document.querySelectorAll('#scope-groups .scope-checkbox').length;
        var selected = document.querySelectorAll('#scope-groups .scope-checkbox:checked').length;
        var counter = document.getElementById('scope-counter');
        if (counter) counter.textContent = selected + ' of ' + total + ' scopes selected';
    }

    function updatePresetState() {
        var all = document.querySelectorAll('#scope-groups .scope-checkbox:not(:disabled)');
        var checked = document.querySelectorAll('#scope-groups .scope-checkbox:checked');
        var readOnly = document.querySelectorAll('#scope-groups .scope-checkbox[data-scope$=":read"]:checked');
        var totalRead = document.querySelectorAll('#scope-groups .scope-checkbox[data-scope$=":read"]:not(:disabled)');

        document.querySelectorAll('.scope-preset-btn').forEach(function(b) { b.classList.remove('active'); });

        if (checked.length === all.length && all.length > 0) {
            document.querySelector('[data-preset="full"]').classList.add('active');
        } else if (readOnly.length === totalRead.length && checked.length === readOnly.length && readOnly.length > 0) {
            document.querySelector('[data-preset="readonly"]').classList.add('active');
        } else {
            document.querySelector('[data-preset="custom"]').classList.add('active');
        }
    }

    function applyPreset(preset) {
        var checkboxes = document.querySelectorAll('#scope-groups .scope-checkbox:not(:disabled)');

        if (preset === 'full') {
            checkboxes.forEach(function(cb) { cb.checked = true; });
        } else if (preset === 'readonly') {
            checkboxes.forEach(function(cb) {
                cb.checked = cb.dataset.scope.endsWith(':read');
            });
        } else {
            checkboxes.forEach(function(cb) { cb.checked = false; });
        }

        // Update group-all checkboxes
        Object.values(SCOPE_GROUPS).forEach(function(g) { updateGroupAllState(g.resource); });
        updateScopeCounter();

        document.querySelectorAll('.scope-preset-btn').forEach(function(b) { b.classList.remove('active'); });
        document.querySelector('[data-preset="' + preset + '"]').classList.add('active');
    }

    function getSelectedScopes() {
        var scopes = [];
        document.querySelectorAll('#scope-groups .scope-checkbox:checked').forEach(function(cb) {
            scopes.push(cb.dataset.scope);
        });
        return scopes;
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

            // Show the new key
            var display = document.getElementById('new-key-display');
            var keyText = document.getElementById('new-key-value-text');
            keyText.textContent = data.key.full_key || data.key.key || '—';
            display.style.display = 'block';
            display.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            // Copy button
            document.getElementById('new-key-copy-btn').onclick = function() {
                navigator.clipboard.writeText(keyText.textContent).then(function() {
                    Settings.showToast('Key copied to clipboard', 'success');
                });
            };

            // Reset form
            nameInput.value = '';
            expiryInput.value = '';
            applyPreset('custom');

            // Reload list
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
                    var res = await fetch('/api/api-keys/' + id, {
                        method: 'DELETE',
                        credentials: 'include'
                    });
                    if (!res.ok) {
                        var data = await res.json();
                        Settings.showToast(data.error || 'Failed to revoke key', 'error');
                        return;
                    }
                    Settings.showToast('API key revoked', 'success');
                    // Reload list
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
        // Create key form
        var form = document.getElementById('create-key-form');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                createKey();
            });
        }

        // Preset buttons
        document.querySelectorAll('.scope-preset-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                applyPreset(btn.dataset.preset);
            });
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

    function formatAction(action) {
        return action.charAt(0).toUpperCase() + action.slice(1);
    }

    window.SettingsDeveloper = {
        init: initDeveloper
    };
})();
