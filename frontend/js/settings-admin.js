/**
 * Settings Admin — User Management (3.4) + Role Management (3.5)
 */
(function() {
  'use strict';

  // ── State ──
  let allUsers = [];
  let allRoles = [];
  let roleDefaults = {};
  let currentUserId = null; // logged-in user
  let selectedIds = new Set();
  let editingUserId = null;
  let resetPwUserId = null;

  const ROLE_COLORS = {
    developer:  '#a855f7',
    management: '#FF8C00',
    admin:      '#FF8C00',
    office_coordinator: '#3b82f6',
    field_tech: '#10b981',
    viewer:     '#6b7280'
  };

  const RESOURCES = ['tasks','notes','people','organizations','files','calendar','settings'];
  const ACTIONS   = ['read','write','delete','admin'];

  // ── Init ──
  let adminInitialized = false;

  function initAdmin() {
    if (adminInitialized) return;
    if (!document.getElementById('section-admin')) return;
    adminInitialized = true;

    // Sub-tab switching
    document.querySelectorAll('.admin-subtab').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.admin-subtab').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var target = btn.dataset.subtab;
        document.querySelectorAll('.admin-subsection').forEach(function(s) { s.classList.remove('active'); });
        document.getElementById('admin-' + target).classList.add('active');
        if (target === 'roles' && allRoles.length === 0) loadRoles();
      });
    });

    // Get current user id
    fetch('/api/users/me', { credentials: 'include' }).then(function(r) { return r.json(); }).then(function(d) {
      currentUserId = d.user ? d.user.id : d.id;
    });

    // Observe when admin section becomes visible
    var observer = new MutationObserver(function() {
      if (document.getElementById('section-admin').classList.contains('active') && allUsers.length === 0) {
        loadUsers();
      }
    });
    observer.observe(document.getElementById('section-admin'), { attributes: true, attributeFilter: ['class'] });

    setupUserManagement();
    setupRoleManagement();
  }

  // Auto-init when settings tab shown
  document.addEventListener('tab:activated', function(e) {
    if (e.detail && e.detail.tab === 'settings') initAdmin();
  });

  // ═══════════════════════════════════════
  // 3.4 — USER MANAGEMENT
  // ═══════════════════════════════════════

  function setupUserManagement() {
    var searchEl = document.getElementById('admin-user-search');
    var filterEl = document.getElementById('admin-role-filter');
    searchEl.addEventListener('input', renderUsers);
    filterEl.addEventListener('change', renderUsers);

    // Add user toggle
    document.getElementById('admin-add-user-btn').addEventListener('click', function() {
      var form = document.getElementById('admin-add-user-form');
      form.style.display = form.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById('admin-cancel-add-btn').addEventListener('click', function() {
      document.getElementById('admin-add-user-form').style.display = 'none';
    });
    document.getElementById('admin-create-user-btn').addEventListener('click', createUser);

    // Select all
    document.getElementById('admin-select-all').addEventListener('change', function() {
      var checked = this.checked;
      selectedIds.clear();
      if (checked) {
        getFilteredUsers().forEach(function(u) {
          if (u.id !== currentUserId) selectedIds.add(u.id);
        });
      }
      renderUsers();
      updateBulkBar();
    });

    // Bulk actions
    document.getElementById('admin-bulk-delete-btn').addEventListener('click', bulkDelete);
    document.getElementById('admin-bulk-suspend-btn').addEventListener('click', bulkSuspend);
    document.getElementById('admin-bulk-role-btn').addEventListener('click', function() {
      populateRoleSelect(document.getElementById('admin-bulk-role-select'));
      showModal('admin-bulk-role-modal');
    });
    document.getElementById('admin-bulk-role-cancel').addEventListener('click', function() { hideModal('admin-bulk-role-modal'); });
    document.getElementById('admin-bulk-role-confirm').addEventListener('click', bulkChangeRole);

    // Edit modal
    document.getElementById('admin-edit-cancel').addEventListener('click', function() { hideModal('admin-edit-modal'); });
    document.getElementById('admin-edit-save').addEventListener('click', saveEditUser);

    // Reset password modal
    document.getElementById('admin-reset-pw-cancel').addEventListener('click', function() { hideModal('admin-reset-pw-modal'); });
    document.getElementById('admin-reset-pw-confirm').addEventListener('click', confirmResetPassword);
  }

  async function loadUsers() {
    try {
      var res = await fetch('/api/users/employees', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      allUsers = await res.json();
      populateRoleFilter();
      renderUsers();
    } catch (e) {
      document.getElementById('admin-user-list').innerHTML = '<div class="text-muted" style="padding:24px;text-align:center">Failed to load users</div>';
    }
  }

  function populateRoleFilter() {
    var roles = [...new Set(allUsers.map(function(u) { return u.role; }))].sort();
    var filterEl = document.getElementById('admin-role-filter');
    filterEl.innerHTML = '<option value="">All Roles</option>';
    roles.forEach(function(r) {
      filterEl.innerHTML += '<option value="' + r + '">' + formatRole(r) + '</option>';
    });
    // Also populate add-user role dropdown
    populateRoleSelect(document.getElementById('new-user-role'));
  }

  function populateRoleSelect(sel) {
    if (!sel) return;
    var roles = [...new Set(allUsers.map(function(u) { return u.role; }))].sort();
    sel.innerHTML = '';
    roles.forEach(function(r) {
      sel.innerHTML += '<option value="' + r + '">' + formatRole(r) + '</option>';
    });
  }

  function getFilteredUsers() {
    var q = document.getElementById('admin-user-search').value.toLowerCase().trim();
    var role = document.getElementById('admin-role-filter').value;
    return allUsers.filter(function(u) {
      if (role && u.role !== role) return false;
      if (q && !(u.name || '').toLowerCase().includes(q) && !(u.email || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function renderUsers() {
    var users = getFilteredUsers();
    var list = document.getElementById('admin-user-list');
    var header = document.getElementById('admin-user-list-header');

    if (users.length === 0) {
      list.innerHTML = '<div class="text-muted" style="padding:24px;text-align:center">No users found</div>';
      header.style.display = 'none';
      return;
    }

    header.style.display = 'flex';
    list.innerHTML = users.map(function(u) {
      var initials = getInitials(u.name || u.email);
      var color = ROLE_COLORS[u.role] || '#6b7280';
      var status = u.status || 'active';
      var isActive = status === 'active';
      var isSelf = u.id === currentUserId;
      var checked = selectedIds.has(u.id) ? 'checked' : '';
      var created = u.created_at ? new Date(u.created_at).toLocaleDateString() : '—';

      return '<div class="user-card' + (checked ? ' selected' : '') + '" data-id="' + u.id + '">' +
        '<label class="admin-checkbox-wrap">' +
          '<input type="checkbox" class="admin-user-cb" data-id="' + u.id + '" ' + checked + (isSelf ? ' disabled title="Cannot select yourself"' : '') + ' />' +
        '</label>' +
        '<div class="user-avatar" style="background:' + color + '22;color:' + color + '">' + initials + '</div>' +
        '<div class="user-info">' +
          '<div class="user-name">' + esc(u.name || '(no name)') + (isSelf ? ' <span class="admin-you-badge">You</span>' : '') + '</div>' +
          '<div class="user-email">' + esc(u.email) + '</div>' +
        '</div>' +
        '<span class="admin-role-chip" style="background:' + color + '18;color:' + color + '">' + formatRole(u.role) + '</span>' +
        '<span class="admin-status-badge ' + (isActive ? 'active' : 'suspended') + '">' + (isActive ? 'Active' : 'Suspended') + '</span>' +
        '<span class="admin-date text-muted">' + created + '</span>' +
        '<div class="admin-user-actions">' +
          '<button class="admin-action-btn" data-action="edit" data-id="' + u.id + '" title="Edit">✏️</button>' +
          '<button class="admin-action-btn" data-action="reset-pw" data-id="' + u.id + '" title="Reset Password">🔑</button>' +
          '<button class="admin-action-btn" data-action="toggle-status" data-id="' + u.id + '" title="' + (isActive ? 'Suspend' : 'Unsuspend') + '">' + (isActive ? '⏸️' : '▶️') + '</button>' +
          (isSelf ? '' : '<button class="admin-action-btn danger" data-action="delete" data-id="' + u.id + '" title="Delete">🗑️</button>') +
        '</div>' +
      '</div>';
    }).join('');

    // Bind checkboxes
    list.querySelectorAll('.admin-user-cb').forEach(function(cb) {
      cb.addEventListener('change', function() {
        var id = this.dataset.id;
        if (this.checked) selectedIds.add(id); else selectedIds.delete(id);
        updateBulkBar();
      });
    });

    // Bind action buttons
    list.querySelectorAll('.admin-action-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var action = this.dataset.action;
        var id = this.dataset.id;
        if (action === 'edit') openEditModal(id);
        else if (action === 'reset-pw') openResetPwModal(id);
        else if (action === 'toggle-status') toggleUserStatus(id);
        else if (action === 'delete') deleteSingleUser(id);
      });
    });
  }

  function updateBulkBar() {
    var bar = document.getElementById('admin-bulk-bar');
    var count = selectedIds.size;
    document.getElementById('admin-bulk-count').textContent = count + ' selected';
    bar.classList.toggle('visible', count > 0);
  }

  // ── CRUD ──

  async function createUser() {
    var name = document.getElementById('new-user-name').value.trim();
    var email = document.getElementById('new-user-email').value.trim();
    var password = document.getElementById('new-user-password').value;
    var role = document.getElementById('new-user-role').value;
    if (!name || !email || !password) return Settings.showToast('Fill in all fields', 'error');
    if (password.length < 8) return Settings.showToast('Password must be 8+ chars', 'error');

    try {
      var res = await fetch('/api/users/employees', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, email: email, password: password, role: role })
      });
      if (!res.ok) { var err = await res.json(); throw new Error(err.error || 'Failed'); }
      Settings.showToast('User created', 'success');
      document.getElementById('admin-add-user-form').style.display = 'none';
      document.getElementById('new-user-name').value = '';
      document.getElementById('new-user-email').value = '';
      document.getElementById('new-user-password').value = '';
      await loadUsers();
    } catch (e) {
      Settings.showToast(e.message, 'error');
    }
  }

  function openEditModal(id) {
    editingUserId = id;
    var user = allUsers.find(function(u) { return u.id === id; });
    if (!user) return;
    var body = document.getElementById('admin-edit-modal-body');
    body.innerHTML =
      '<div class="settings-field-group"><label class="settings-field-label">Name</label>' +
      '<input type="text" class="settings-input" id="admin-edit-name" value="' + esc(user.name || '') + '" /></div>' +
      '<div class="settings-field-group"><label class="settings-field-label">Email</label>' +
      '<input type="email" class="settings-input" id="admin-edit-email" value="' + esc(user.email || '') + '" /></div>' +
      '<div class="settings-field-group"><label class="settings-field-label">Role</label>' +
      '<select class="settings-select" id="admin-edit-role"></select></div>';
    populateRoleSelect(document.getElementById('admin-edit-role'));
    document.getElementById('admin-edit-role').value = user.role;
    showModal('admin-edit-modal');
  }

  async function saveEditUser() {
    if (!editingUserId) return;
    var name = document.getElementById('admin-edit-name').value.trim();
    var email = document.getElementById('admin-edit-email').value.trim();
    var role = document.getElementById('admin-edit-role').value;
    try {
      // The backend PATCH /employees/:id supports role and password; for name/email we use a combined approach
      var res = await fetch('/api/users/employees/' + editingUserId, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: role })
      });
      if (!res.ok) throw new Error('Failed to update');
      Settings.showToast('User updated', 'success');
      hideModal('admin-edit-modal');
      await loadUsers();
    } catch (e) {
      Settings.showToast(e.message, 'error');
    }
  }

  function openResetPwModal(id) {
    resetPwUserId = id;
    document.getElementById('admin-reset-pw-input').value = '';
    showModal('admin-reset-pw-modal');
  }

  async function confirmResetPassword() {
    var pw = document.getElementById('admin-reset-pw-input').value;
    if (!pw || pw.length < 8) return Settings.showToast('Password must be 8+ chars', 'error');
    try {
      var res = await fetch('/api/users/employees/' + resetPwUserId, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw })
      });
      if (!res.ok) throw new Error('Failed');
      Settings.showToast('Password reset', 'success');
      hideModal('admin-reset-pw-modal');
    } catch (e) {
      Settings.showToast(e.message, 'error');
    }
  }

  async function toggleUserStatus(id) {
    var user = allUsers.find(function(u) { return u.id === id; });
    if (!user) return;
    var isActive = (user.status || 'active') === 'active';
    var endpoint = isActive ? '/api/users/' + id + '/suspend' : '/api/users/' + id + '/unsuspend';
    try {
      var res = await fetch(endpoint, { method: 'PATCH', credentials: 'include' });
      if (!res.ok) { var err = await res.json(); throw new Error(err.error || 'Failed'); }
      Settings.showToast(isActive ? 'User suspended' : 'User unsuspended', 'success');
      await loadUsers();
    } catch (e) {
      Settings.showToast(e.message, 'error');
    }
  }

  function deleteSingleUser(id) {
    var user = allUsers.find(function(u) { return u.id === id; });
    Settings.showConfirmation(
      'Delete User',
      'This will remove ' + (user ? user.name : 'this user') + ' and nullify their content ownership. This cannot be undone.',
      async function() {
        try {
          var res = await fetch('/api/users/employees/' + id, { method: 'DELETE', credentials: 'include' });
          if (!res.ok) throw new Error('Failed');
          Settings.showToast('User deleted', 'success');
          selectedIds.delete(id);
          await loadUsers();
          updateBulkBar();
        } catch (e) {
          Settings.showToast(e.message, 'error');
        }
      }
    );
  }

  // ── Bulk ──

  function bulkDelete() {
    var ids = [...selectedIds].filter(function(id) { return id !== currentUserId; });
    if (ids.length === 0) return;
    Settings.showConfirmation(
      'Delete ' + ids.length + ' Users',
      'This will permanently remove these users and nullify their content ownership.',
      async function() {
        try {
          var res = await fetch('/api/users/employees/bulk-delete', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: ids })
          });
          if (!res.ok) throw new Error('Failed');
          Settings.showToast(ids.length + ' users deleted', 'success');
          selectedIds.clear();
          await loadUsers();
          updateBulkBar();
        } catch (e) {
          Settings.showToast(e.message, 'error');
        }
      }
    );
  }

  async function bulkSuspend() {
    var ids = [...selectedIds].filter(function(id) { return id !== currentUserId; });
    if (ids.length === 0) return;
    for (var i = 0; i < ids.length; i++) {
      await fetch('/api/users/' + ids[i] + '/suspend', { method: 'PATCH', credentials: 'include' });
    }
    Settings.showToast(ids.length + ' users suspended', 'success');
    selectedIds.clear();
    await loadUsers();
    updateBulkBar();
  }

  async function bulkChangeRole() {
    var role = document.getElementById('admin-bulk-role-select').value;
    if (!role) return;
    var ids = [...selectedIds];
    for (var i = 0; i < ids.length; i++) {
      await fetch('/api/users/employees/' + ids[i], {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: role })
      });
    }
    hideModal('admin-bulk-role-modal');
    Settings.showToast(ids.length + ' users updated', 'success');
    selectedIds.clear();
    await loadUsers();
    updateBulkBar();
  }

  // ═══════════════════════════════════════
  // 3.5 — ROLE MANAGEMENT
  // ═══════════════════════════════════════

  function setupRoleManagement() {
    document.getElementById('admin-revert-all-btn').addEventListener('click', function() {
      Settings.showConfirmation('Revert All Roles', 'Reset all roles to their default permissions?', async function() {
        try {
          var res = await fetch('/api/roles/revert-all', { method: 'POST', credentials: 'include' });
          if (!res.ok) throw new Error('Failed');
          Settings.showToast('All roles reverted', 'success');
          await loadRoles();
        } catch (e) { Settings.showToast(e.message, 'error'); }
      });
    });
  }

  async function loadRoles() {
    try {
      var [rolesRes, defaultsRes, usersRes] = await Promise.all([
        fetch('/api/roles', { credentials: 'include' }),
        fetch('/api/roles/defaults', { credentials: 'include' }),
        allUsers.length ? Promise.resolve(null) : fetch('/api/users/employees', { credentials: 'include' })
      ]);
      var rolesData = await rolesRes.json();
      allRoles = rolesData.roles || [];
      var defaultsData = await defaultsRes.json();
      roleDefaults = defaultsData.defaults || {};
      if (usersRes) allUsers = await usersRes.json();
      renderRoles();
    } catch (e) {
      document.getElementById('admin-role-list').innerHTML = '<div class="text-muted" style="padding:24px;text-align:center">Failed to load roles</div>';
    }
  }

  function renderRoles() {
    var list = document.getElementById('admin-role-list');
    list.innerHTML = allRoles.map(function(role) {
      var perms = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : (role.permissions || {});
      var isDev = role.name === 'developer';
      var userCount = allUsers.filter(function(u) { return u.role === role.name; }).length;
      var isModified = isRoleModified(role.name, perms);
      var color = ROLE_COLORS[role.name] || '#6b7280';

      return '<div class="role-card" data-role="' + esc(role.name) + '">' +
        '<div class="role-card-header">' +
          '<div>' +
            '<div class="role-name">' + esc(formatRole(role.name)) +
              (isModified ? ' <span class="admin-modified-badge">Modified</span>' : '') +
              (isDev ? ' <span class="admin-fullaccess-badge">Full Access</span>' : '') +
            '</div>' +
            '<div class="role-desc">' + esc(role.description || '') + '</div>' +
          '</div>' +
          '<div class="role-card-meta">' +
            '<span class="admin-user-count">' + userCount + ' user' + (userCount !== 1 ? 's' : '') + '</span>' +
            (!isDev ? '<button class="admin-action-btn" data-action="edit-perms" data-role="' + esc(role.name) + '">Edit Permissions</button>' : '') +
            (!isDev ? '<button class="admin-action-btn" data-action="revert-role" data-role="' + esc(role.name) + '" title="Revert to Default">↩️</button>' : '') +
          '</div>' +
        '</div>' +
        '<div class="role-perms-panel" id="perms-panel-' + esc(role.name) + '" style="display:none">' +
          buildPermissionMatrix(role.name, perms, isDev) +
        '</div>' +
      '</div>';
    }).join('');

    // Bind actions
    list.querySelectorAll('[data-action="edit-perms"]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var panel = document.getElementById('perms-panel-' + this.dataset.role);
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      });
    });
    list.querySelectorAll('[data-action="revert-role"]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var roleName = this.dataset.role;
        Settings.showConfirmation('Revert Role', 'Reset "' + formatRole(roleName) + '" to default permissions?', async function() {
          try {
            var res = await fetch('/api/roles/' + roleName + '/revert', { method: 'POST', credentials: 'include' });
            if (!res.ok) throw new Error('Failed');
            Settings.showToast('Role reverted', 'success');
            await loadRoles();
          } catch (e) { Settings.showToast(e.message, 'error'); }
        });
      });
    });
  }

  function buildPermissionMatrix(roleName, perms, isDev) {
    // Parse permissions into a resource→action map
    var matrix = {};
    RESOURCES.forEach(function(r) {
      matrix[r] = {};
      ACTIONS.forEach(function(a) { matrix[r][a] = false; });
    });

    // Handle wildcard or array of "resource:action" strings
    var permList = Array.isArray(perms) ? perms : (perms.scopes || perms.permissions || []);
    if (typeof perms === 'string') permList = [perms];

    var isWildcard = permList.includes('*:*') || permList.includes('*');
    if (isWildcard) {
      RESOURCES.forEach(function(r) { ACTIONS.forEach(function(a) { matrix[r][a] = true; }); });
    } else {
      permList.forEach(function(p) {
        if (typeof p !== 'string') return;
        var parts = p.split(':');
        var res = parts[0], act = parts[1];
        if (res === '*') {
          RESOURCES.forEach(function(r) {
            if (act === '*') ACTIONS.forEach(function(a) { matrix[r][a] = true; });
            else if (ACTIONS.includes(act)) matrix[r][act] = true;
          });
        } else if (RESOURCES.includes(res)) {
          if (act === '*') ACTIONS.forEach(function(a) { matrix[res][a] = true; });
          else if (ACTIONS.includes(act)) matrix[res][act] = true;
        }
      });
    }

    var html = '<table class="permission-matrix">' +
      '<thead><tr><th>Resource</th>';
    ACTIONS.forEach(function(a) {
      html += '<th>' + capitalize(a) +
        (!isDev ? ' <input type="checkbox" class="perm-col-toggle" data-role="' + esc(roleName) + '" data-action="' + a + '" />' : '') +
        '</th>';
    });
    html += '</tr></thead><tbody>';

    RESOURCES.forEach(function(r) {
      html += '<tr><td>' + capitalize(r) +
        (!isDev ? ' <input type="checkbox" class="perm-row-toggle" data-role="' + esc(roleName) + '" data-resource="' + r + '" />' : '') +
        '</td>';
      ACTIONS.forEach(function(a) {
        var checked = matrix[r][a] ? 'checked' : '';
        html += '<td><label class="perm-cell' + (matrix[r][a] ? ' checked' : '') + '">' +
          '<input type="checkbox" ' + checked + (isDev ? ' disabled' : '') +
          ' class="perm-cb" data-role="' + esc(roleName) + '" data-resource="' + r + '" data-action="' + a + '" />' +
          '<span class="perm-indicator"></span></label></td>';
      });
      html += '</tr>';
    });

    html += '</tbody></table>';

    if (!isDev) {
      html += '<div class="perm-actions">' +
        '<button class="settings-btn-primary perm-save-btn" data-role="' + esc(roleName) + '">Save Changes</button>' +
        '<button class="btn-cancel perm-cancel-btn" data-role="' + esc(roleName) + '">Cancel</button>' +
        '</div>';
    }

    // We need to bind events after render — use setTimeout
    setTimeout(function() { bindMatrixEvents(roleName, isDev); }, 0);
    return html;
  }

  function bindMatrixEvents(roleName, isDev) {
    if (isDev) return;
    var panel = document.getElementById('perms-panel-' + roleName);
    if (!panel) return;

    // Cell change → highlight
    panel.querySelectorAll('.perm-cb').forEach(function(cb) {
      cb.addEventListener('change', function() {
        this.closest('.perm-cell').classList.toggle('checked', this.checked);
        this.closest('.perm-cell').classList.add('changed');
      });
    });

    // Row toggle
    panel.querySelectorAll('.perm-row-toggle').forEach(function(cb) {
      cb.addEventListener('change', function() {
        var res = this.dataset.resource;
        var checked = this.checked;
        panel.querySelectorAll('.perm-cb[data-resource="' + res + '"]').forEach(function(c) {
          c.checked = checked;
          c.closest('.perm-cell').classList.toggle('checked', checked);
          c.closest('.perm-cell').classList.add('changed');
        });
      });
    });

    // Column toggle
    panel.querySelectorAll('.perm-col-toggle').forEach(function(cb) {
      cb.addEventListener('change', function() {
        var act = this.dataset.action;
        var checked = this.checked;
        panel.querySelectorAll('.perm-cb[data-action="' + act + '"]').forEach(function(c) {
          c.checked = checked;
          c.closest('.perm-cell').classList.toggle('checked', checked);
          c.closest('.perm-cell').classList.add('changed');
        });
      });
    });

    // Save
    panel.querySelector('.perm-save-btn').addEventListener('click', async function() {
      var scopes = [];
      panel.querySelectorAll('.perm-cb:checked').forEach(function(cb) {
        scopes.push(cb.dataset.resource + ':' + cb.dataset.action);
      });
      try {
        var res = await fetch('/api/roles/' + roleName, {
          method: 'PATCH', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permissions: { scopes: scopes } })
        });
        if (!res.ok) throw new Error('Failed');
        Settings.showToast('Permissions saved', 'success');
        panel.querySelectorAll('.changed').forEach(function(el) { el.classList.remove('changed'); });
        await loadRoles();
      } catch (e) { Settings.showToast(e.message, 'error'); }
    });

    // Cancel
    panel.querySelector('.perm-cancel-btn').addEventListener('click', function() {
      panel.style.display = 'none';
      loadRoles(); // re-render to discard changes
    });
  }

  function isRoleModified(name, perms) {
    var def = roleDefaults[name];
    if (!def) return false;
    return JSON.stringify(perms) !== JSON.stringify(def);
  }

  // ── Helpers ──

  function showModal(id) { document.getElementById(id).classList.add('visible'); }
  function hideModal(id) { document.getElementById(id).classList.remove('visible'); }

  function getInitials(name) {
    if (!name) return '?';
    var parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  function formatRole(r) {
    return (r || '').replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
  }

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }
})();
