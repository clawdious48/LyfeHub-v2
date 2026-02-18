/**
 * Settings Organization — Org Member Management
 */
(function() {
  'use strict';

  const ROLE_COLORS = {
    developer: '#8b5cf6',
    management: '#ef4444',
    office_coordinator: '#f59e0b',
    project_manager: '#3b82f6',
    estimator: '#10b981',
    field_tech: '#6b7280'
  };

  const VALID_ROLES = ['management', 'office_coordinator', 'project_manager', 'estimator', 'field_tech'];

  let members = [];
  let orgInitialized = false;

  function isManager() {
    return window.currentOrg?.role === 'management' || window.currentUser?.role === 'developer';
  }

  function getOrg() {
    return window.currentOrg;
  }

  function formatRole(r) {
    return (r || '').replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function getInitials(name) {
    if (!name) return '?';
    var parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  async function initOrganization() {
    if (orgInitialized) return;
    var section = document.getElementById('section-organization');
    if (!section) return;
    orgInitialized = true;

    // Fetch org data if not already available
    if (!window.currentOrg) {
      try {
        var res = await fetch('/api/apex-orgs/mine', { credentials: 'include' });
        if (res.ok) {
          var data = await res.json();
          window.currentOrg = data.org || null;
        }
      } catch (e) { /* ignore */ }
    }

    updateVisibility();

    // Observe when section becomes visible
    var observer = new MutationObserver(function() {
      if (section.classList.contains('active') && members.length === 0) {
        loadMembers();
      }
    });
    observer.observe(section, { attributes: true, attributeFilter: ['class'] });

    setupEvents();
  }

  function setupEvents() {
    // Add member button
    var addBtn = document.getElementById('org-add-member-btn');
    if (addBtn) {
      addBtn.addEventListener('click', function() {
        showAddMemberModal();
      });
    }
  }

  async function loadMembers() {
    var org = getOrg();
    if (!org) return;

    var list = document.getElementById('org-member-list');
    list.innerHTML = '<div class="text-muted" style="padding:24px;text-align:center">Loading members…</div>';

    try {
      var res = await fetch('/api/apex-orgs/' + org.id + '/members', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load members');
      members = await res.json();
      renderHeader();
      renderMembers();
    } catch (e) {
      list.innerHTML = '<div class="text-muted" style="padding:24px;text-align:center">Failed to load members</div>';
    }
  }

  function renderHeader() {
    var org = getOrg();
    var headerEl = document.getElementById('org-header-info');
    if (!headerEl || !org) return;
    var color = ROLE_COLORS[org.role] || '#6b7280';
    headerEl.innerHTML =
      '<div class="org-header-name">' + esc(org.name || 'Organization') + '</div>' +
      '<span class="admin-role-chip" style="background:' + color + '18;color:' + color + '">' + formatRole(org.role) + '</span>';
  }

  function renderMembers() {
    var list = document.getElementById('org-member-list');
    var canManage = isManager();

    if (members.length === 0) {
      list.innerHTML = '<div class="text-muted" style="padding:24px;text-align:center">No members found</div>';
      return;
    }

    list.innerHTML = members.map(function(m) {
      var name = m.user_name || '(no name)';
      var email = m.user_email || '';
      var role = m.role || m.member_role || 'field_tech';
      var color = ROLE_COLORS[role] || '#6b7280';
      var initials = getInitials(name);
      var joined = m.created_at ? new Date(m.created_at).toLocaleDateString() : '—';

      var actionsHtml = '';
      if (canManage) {
        actionsHtml =
          '<div class="admin-user-actions">' +
            '<select class="settings-select org-role-select" data-user-id="' + esc(m.user_id) + '" style="min-width:140px;font-size:13px;">' +
              VALID_ROLES.map(function(r) {
                return '<option value="' + r + '"' + (r === role ? ' selected' : '') + '>' + formatRole(r) + '</option>';
              }).join('') +
            '</select>' +
            '<button class="admin-action-btn danger org-remove-btn" data-user-id="' + esc(m.user_id) + '" data-name="' + esc(name) + '" title="Remove member">🗑️</button>' +
          '</div>';
      }

      return '<div class="user-card">' +
        '<div class="user-avatar" style="background:' + color + '22;color:' + color + '">' + initials + '</div>' +
        '<div class="user-info">' +
          '<div class="user-name">' + esc(name) + '</div>' +
          '<div class="user-email">' + esc(email) + '</div>' +
        '</div>' +
        '<span class="admin-role-chip" style="background:' + color + '18;color:' + color + '">' + formatRole(role) + '</span>' +
        '<span class="admin-date text-muted">' + joined + '</span>' +
        actionsHtml +
      '</div>';
    }).join('');

    // Bind role change
    list.querySelectorAll('.org-role-select').forEach(function(sel) {
      sel.addEventListener('change', function() {
        changeRole(this.dataset.userId, this.value);
      });
    });

    // Bind remove
    list.querySelectorAll('.org-remove-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        removeMember(this.dataset.userId, this.dataset.name);
      });
    });
  }

  async function changeRole(userId, newRole) {
    var org = getOrg();
    if (!org) return;
    try {
      var res = await fetch('/api/apex-orgs/' + org.id + '/members/' + userId, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) {
        var err = await res.json();
        throw new Error(err.error || 'Failed to update role');
      }
      Settings.showToast('Role updated', 'success');
      await loadMembers();
    } catch (e) {
      Settings.showToast(e.message, 'error');
      renderMembers(); // reset select
    }
  }

  function removeMember(userId, name) {
    Settings.showConfirmation(
      'Remove Member',
      'Remove ' + (name || 'this member') + ' from the organization? They will lose access to org resources.',
      async function() {
        var org = getOrg();
        if (!org) return;
        try {
          var res = await fetch('/api/apex-orgs/' + org.id + '/members/' + userId, {
            method: 'DELETE', credentials: 'include'
          });
          if (!res.ok) {
            var err = await res.json();
            throw new Error(err.error || 'Failed to remove member');
          }
          Settings.showToast('Member removed', 'success');
          await loadMembers();
        } catch (e) {
          Settings.showToast(e.message, 'error');
        }
      }
    );
  }

  function showAddMemberModal() {
    var modal = document.getElementById('org-add-member-modal');
    if (!modal) return;
    document.getElementById('org-add-email').value = '';
    document.getElementById('org-add-role').value = 'field_tech';
    modal.classList.add('visible');
  }

  function hideAddMemberModal() {
    var modal = document.getElementById('org-add-member-modal');
    if (modal) modal.classList.remove('visible');
  }

  async function addMember() {
    var email = document.getElementById('org-add-email').value.trim();
    var role = document.getElementById('org-add-role').value;
    if (!email) return Settings.showToast('Enter an email address', 'error');

    var org = getOrg();
    if (!org) return;

    try {
      var res = await fetch('/api/apex-orgs/' + org.id + '/members', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, role: role })
      });
      if (!res.ok) {
        var err = await res.json();
        throw new Error(err.error || 'Failed to add member');
      }
      Settings.showToast('Member added', 'success');
      hideAddMemberModal();
      await loadMembers();
    } catch (e) {
      Settings.showToast(e.message, 'error');
    }
  }

  // Bind modal events after DOM ready
  document.addEventListener('DOMContentLoaded', function() {
    var cancelBtn = document.getElementById('org-add-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', hideAddMemberModal);
    var confirmBtn = document.getElementById('org-add-confirm');
    if (confirmBtn) confirmBtn.addEventListener('click', addMember);
  });

  // Auto-init when tab shown
  document.addEventListener('tab:activated', function(e) {
    if (e.detail && e.detail.tab === 'settings') initOrganization();
  });

  function updateVisibility() {
    var tabBtn = document.querySelector('.settings-tab[data-tab="organization"]');
    var addBtn = document.getElementById('org-add-member-btn');
    if (tabBtn) {
      tabBtn.style.display = window.currentOrg ? '' : 'none';
    }
    if (addBtn) {
      addBtn.style.display = isManager() ? '' : 'none';
    }
  }

  // Also try init on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
      initOrganization();
      updateVisibility();
    }, 200);
  });

  // Re-check visibility when app-init completes
  document.addEventListener('app:ready', updateVisibility);

  window.SettingsOrganization = { init: initOrganization, load: loadMembers };
})();
