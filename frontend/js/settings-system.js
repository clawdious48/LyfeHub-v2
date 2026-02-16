/**
 * Settings — System Section (developer-only)
 */
(function() {
  'use strict';

  let auditPage = 1;
  let auditFilter = '';
  let auditLoading = false;

  function init() {
    const section = document.getElementById('section-system');
    if (!section) return;

    // Watch for section becoming active
    const observer = new MutationObserver(function() {
      if (section.classList.contains('active') && !section.dataset.loaded) {
        section.dataset.loaded = '1';
        render(section);
        loadAll();
      }
    });
    observer.observe(section, { attributes: true, attributeFilter: ['class'] });

    // Check if already active
    if (section.classList.contains('active')) {
      section.dataset.loaded = '1';
      render(section);
      loadAll();
    }
  }

  function render(section) {
    // Keep the header, replace the rest
    section.innerHTML = `
      <h2 class="settings-section-header">System</h2>

      <!-- App Info -->
      <div class="system-card" id="system-app-info">
        <div class="system-card-title">
          <svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          App Info
        </div>
        <div class="system-card-body">
          <div class="system-info-grid">
            <div class="system-info-item">
              <span class="system-info-label">App Name</span>
              <span class="system-info-value">LyfeHub v2</span>
            </div>
            <div class="system-info-item">
              <span class="system-info-label">Version</span>
              <span class="system-info-value" id="sys-version">—</span>
            </div>
            <div class="system-info-item">
              <span class="system-info-label">Environment</span>
              <span class="system-info-value" id="sys-env">—</span>
            </div>
            <div class="system-info-item">
              <span class="system-info-label">Uptime</span>
              <span class="system-info-value" id="sys-uptime">—</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Database Stats -->
      <div class="system-card" id="system-db-stats">
        <div class="system-card-title">
          <svg viewBox="0 0 24 24" width="18" height="18"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
          Database Stats
        </div>
        <div class="system-card-body" id="db-stats-body">
          <div class="system-loading">Loading stats...</div>
        </div>
      </div>

      <!-- System Health -->
      <div class="system-card" id="system-health">
        <div class="system-card-title">
          <svg viewBox="0 0 24 24" width="18" height="18"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          System Health
        </div>
        <div class="system-card-body" id="health-body">
          <div class="system-loading">Checking health...</div>
        </div>
      </div>

      <!-- Audit Log -->
      <div class="system-card" id="system-audit">
        <div class="system-card-title">
          <svg viewBox="0 0 24 24" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          Audit Log
        </div>
        <div class="system-card-controls">
          <select class="settings-select system-audit-filter" id="audit-filter">
            <option value="">All</option>
            <option value="user">User Changes</option>
            <option value="role">Role Changes</option>
            <option value="api_key">API Key Changes</option>
          </select>
        </div>
        <div class="system-card-body" id="audit-body">
          <div class="system-loading">Loading audit log...</div>
        </div>
      </div>

      <!-- About -->
      <div class="system-card" id="system-about">
        <div class="system-card-title">
          <svg viewBox="0 0 24 24" width="18" height="18"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          About
        </div>
        <div class="system-card-body system-about-body">
          <div class="system-about-brand">LyfeHub v2</div>
          <div class="system-about-tagline">Built with ❤️ for productivity</div>
          <div class="system-about-links">
            <a href="https://github.com/clawdious48/LyfeHub-v2" target="_blank" rel="noopener">GitHub</a>
            <span class="system-about-sep">·</span>
            <a href="#" onclick="return false;">Documentation</a>
          </div>
        </div>
      </div>
    `;

    // Bind filter
    document.getElementById('audit-filter').addEventListener('change', function() {
      auditFilter = this.value;
      auditPage = 1;
      loadAuditLog(true);
    });
  }

  function loadAll() {
    loadHealth();
    loadStats();
    loadAuditLog(true);
  }

  // --- Health ---
  async function loadHealth() {
    const body = document.getElementById('health-body');
    if (!body) return;
    try {
      const res = await fetch('/api/system/health', { credentials: 'include' });
      const data = await res.json();

      const uptimeStr = formatUptime(data.uptime);
      document.getElementById('sys-uptime').textContent = uptimeStr;

      // Detect environment from URL
      const env = location.hostname.includes('localhost') || location.hostname === '127.0.0.1' ? 'Development' : 'Production';
      document.getElementById('sys-env').textContent = env;
      document.getElementById('sys-version').textContent = '2.0.0';

      body.innerHTML = `
        <div class="health-indicators">
          ${healthRow('Database', data.database.status)}
          ${healthRow('API Status', data.api.status)}
        </div>
      `;
    } catch (e) {
      body.innerHTML = '<div class="system-error">Failed to load health data</div>';
    }
  }

  function healthRow(label, status) {
    const icon = status === 'ok' ? '✅' : status === 'warning' ? '🟡' : '🔴';
    const text = status === 'ok' ? 'Connected' : status === 'warning' ? 'Warning' : 'Error';
    return `<div class="health-row">
      <span class="health-icon">${icon}</span>
      <span class="health-label">${label}</span>
      <span class="health-status health-${status}">${text}</span>
    </div>`;
  }

  // --- Stats ---
  async function loadStats() {
    const body = document.getElementById('db-stats-body');
    if (!body) return;
    try {
      const res = await fetch('/api/system/stats', { credentials: 'include' });
      const data = await res.json();
      const s = data.stats;

      const items = [
        { label: 'Users', value: Number(s.user_count).toLocaleString() },
        { label: 'Tasks', value: Number(s.task_count).toLocaleString() },
        { label: 'Notes', value: Number(s.note_count).toLocaleString() },
        { label: 'People', value: Number(s.people_count).toLocaleString() },
      ];
      if (s.db_size) items.push({ label: 'Database Size', value: s.db_size });

      body.innerHTML = `<div class="system-info-grid">${items.map(i =>
        `<div class="system-info-item">
          <span class="system-info-label">${i.label}</span>
          <span class="system-info-value system-stat-value">${i.value}</span>
        </div>`
      ).join('')}</div>`;
    } catch (e) {
      body.innerHTML = '<div class="system-error">Failed to load database stats</div>';
    }
  }

  // --- Audit Log ---
  async function loadAuditLog(reset) {
    if (auditLoading) return;
    auditLoading = true;
    const body = document.getElementById('audit-body');
    if (!body) return;

    if (reset) {
      auditPage = 1;
      body.innerHTML = '<div class="system-loading">Loading audit log...</div>';
    }

    try {
      let url = `/api/audit?page=${auditPage}&limit=20`;
      if (auditFilter) url += `&action=${encodeURIComponent(auditFilter)}`;

      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();

      if (reset) body.innerHTML = '';

      if (!data.entries || data.entries.length === 0) {
        if (auditPage === 1) {
          body.innerHTML = '<div class="audit-empty">No audit entries yet</div>';
        }
        // Remove load more if exists
        const btn = body.querySelector('.audit-load-more');
        if (btn) btn.remove();
      } else {
        // Build table if first page
        let table = body.querySelector('.audit-table');
        let tbody;
        if (!table) {
          table = document.createElement('table');
          table.className = 'audit-table';
          table.innerHTML = `<thead><tr>
            <th>When</th><th>Actor</th><th>Action</th><th>Target</th><th></th>
          </tr></thead><tbody></tbody>`;
          body.appendChild(table);
          tbody = table.querySelector('tbody');
        } else {
          tbody = table.querySelector('tbody');
        }

        data.entries.forEach(function(entry) {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td class="audit-time">${timeAgo(entry.created_at)}</td>
            <td class="audit-actor">${esc(entry.actor_name || entry.actor_id || '—')}</td>
            <td class="audit-action"><span class="audit-action-badge">${humanAction(entry.action)}</span></td>
            <td class="audit-target">${esc(entry.target_type || '')} ${esc(entry.target_id ? '#' + entry.target_id.slice(0,8) : '')}</td>
            <td class="audit-details-toggle">${entry.details ? '<button class="audit-expand-btn" title="Show details">▶</button>' : ''}</td>
          `;
          // Expandable details
          if (entry.details) {
            const detailsRow = document.createElement('tr');
            detailsRow.className = 'audit-details-row';
            detailsRow.style.display = 'none';
            detailsRow.innerHTML = `<td colspan="5"><pre class="audit-details-json">${esc(JSON.stringify(entry.details, null, 2))}</pre></td>`;
            
            tr.querySelector('.audit-expand-btn').addEventListener('click', function() {
              const visible = detailsRow.style.display !== 'none';
              detailsRow.style.display = visible ? 'none' : 'table-row';
              this.textContent = visible ? '▶' : '▼';
            });
            tbody.appendChild(tr);
            tbody.appendChild(detailsRow);
          } else {
            tbody.appendChild(tr);
          }
        });

        // Load more button
        let loadMore = body.querySelector('.audit-load-more');
        if (data.entries.length >= 20) {
          if (!loadMore) {
            loadMore = document.createElement('button');
            loadMore.className = 'audit-load-more settings-btn-primary';
            loadMore.textContent = 'Load More';
            loadMore.addEventListener('click', function() {
              auditPage++;
              loadAuditLog(false);
            });
            body.appendChild(loadMore);
          }
        } else if (loadMore) {
          loadMore.remove();
        }
      }
    } catch (e) {
      if (auditPage === 1) {
        body.innerHTML = '<div class="system-error">Failed to load audit log</div>';
      }
    }
    auditLoading = false;
  }

  // --- Helpers ---
  function formatUptime(seconds) {
    if (!seconds) return '—';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (d > 0) parts.push(d + 'd');
    if (h > 0) parts.push(h + 'h');
    parts.push(m + 'm');
    return parts.join(' ');
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '—';
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
    if (diff < 86400) return Math.floor(diff / 3600) + ' hours ago';
    if (diff < 604800) return Math.floor(diff / 86400) + ' days ago';
    return new Date(dateStr).toLocaleDateString();
  }

  function humanAction(action) {
    const map = {
      'user_role_change': 'Changed role',
      'role_change': 'Changed role',
      'user_create': 'Created user',
      'user_delete': 'Deleted user',
      'user_update': 'Updated user',
      'api_key_create': 'Created API key',
      'api_key_revoke': 'Revoked API key',
      'api_key_delete': 'Deleted API key',
      'login': 'Logged in',
      'password_change': 'Changed password',
    };
    return map[action] || (action || '—').replace(/_/g, ' ');
  }

  function esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // Auto-init when settings tab shown
  document.addEventListener('tab:activated', function(e) {
    if (e.detail && e.detail.tab === 'settings') init();
  });
})();
