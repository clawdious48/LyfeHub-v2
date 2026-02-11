// ============================================
// Dashboard Hub - Command Center
// ============================================

const dashboardHub = {
  widgets: [],
  summaryData: null,
  initialized: false,

  // ========================================
  // INIT
  // ========================================
  init() {
    if (this.initialized) return;
    this.initialized = true;
    this.bindEvents();
    this.load();
  },

  bindEvents() {
    // Quick capture
    const captureInput = document.getElementById('dash-quick-capture');
    if (captureInput) {
      captureInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && captureInput.value.trim()) {
          e.preventDefault();
          this.handleQuickCapture(captureInput.value.trim());
          captureInput.value = '';
        }
        if (e.key === 'Escape') {
          captureInput.value = '';
          captureInput.blur();
          this.hideSearchResults();
        }
      });

      let searchTimeout;
      captureInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        const q = captureInput.value.trim();
        if (q.length < 2) {
          this.hideSearchResults();
          return;
        }
        // Don't search if it starts with a command prefix
        if (q.startsWith('/')) return;
        searchTimeout = setTimeout(() => this.performSearch(q), 250);
      });

      captureInput.addEventListener('blur', () => {
        // Delay to allow click on results
        setTimeout(() => this.hideSearchResults(), 200);
      });
    }

    // Global Ctrl+K
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Switch to dashboard tab if not there
        if (dashboard.currentTab !== 'dashboard') {
          dashboard.switchTab('dashboard');
        }
        const input = document.getElementById('dash-quick-capture');
        if (input) {
          input.focus();
          input.select();
        }
      }
    });

    // Add widget button
    const addWidgetBtn = document.getElementById('dash-add-widget-btn');
    if (addWidgetBtn) {
      addWidgetBtn.addEventListener('click', () => this.openAddWidgetModal());
    }

    // Widget modal events
    const modalClose = document.getElementById('dash-widget-modal-close');
    const modalCancel = document.getElementById('dash-widget-cancel');
    const modalSave = document.getElementById('dash-widget-save');
    const modalBackdrop = document.querySelector('#dash-widget-modal .modal-backdrop');

    if (modalClose) modalClose.addEventListener('click', () => this.closeWidgetModal());
    if (modalCancel) modalCancel.addEventListener('click', () => this.closeWidgetModal());
    if (modalBackdrop) modalBackdrop.addEventListener('click', () => this.closeWidgetModal());
    if (modalSave) modalSave.addEventListener('click', () => this.saveWidget());

    // Base select change -> load views
    const baseSelect = document.getElementById('dash-widget-base-select');
    if (baseSelect) {
      baseSelect.addEventListener('change', (e) => this.onBaseSelected(e.target.value));
    }
  },

  // ========================================
  // LOAD DATA
  // ========================================
  async load() {
    try {
      const [summary, widgets] = await Promise.all([
        api.request('/dashboard/summary'),
        api.request('/dashboard/widgets')
      ]);
      this.summaryData = summary;
      this.widgets = widgets;

      this.renderTodayPanel(summary.today);
      this.renderOverduePanel(summary.today.overdue);
      this.renderProjectsPanel(summary.projects);
      this.renderUpcomingPanel(summary.today.upcoming);
      this.renderStats(summary.stats);
      this.renderBaseWidgets();
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  },

  // ========================================
  // QUICK CAPTURE
  // ========================================
  async handleQuickCapture(text) {
    try {
      await api.createTaskItem({
        title: text,
        my_day: 1
      });
      this.load(); // Refresh
    } catch (err) {
      console.error('Quick capture failed:', err);
    }
  },

  // ========================================
  // SEARCH
  // ========================================
  async performSearch(query) {
    const resultsEl = document.getElementById('dash-search-results');
    if (!resultsEl) return;

    try {
      // Search across task items, projects, bases, and people in parallel
      const [taskItems, projects, bases, people] = await Promise.all([
        api.request('/task-items').catch(() => []),
        api.request('/tasks').then(r => r.tasks || []).catch(() => []),
        api.request('/bases').catch(() => []),
        api.request('/people').catch(() => [])
      ]);

      const q = query.toLowerCase();
      const results = [];

      // Search task items
      (Array.isArray(taskItems) ? taskItems : []).forEach(t => {
        if (t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)) {
          results.push({ type: 'task', icon: '✓', title: t.title, subtitle: t.due_date ? `Due: ${new Date(t.due_date).toLocaleDateString()}` : '', id: t.id, tab: 'tasks' });
        }
      });

      // Search projects
      projects.forEach(p => {
        if (p.title?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)) {
          results.push({ type: 'project', icon: '◆', title: p.title, subtitle: p.status, id: p.id, tab: 'projects' });
        }
      });

      // Search bases
      bases.forEach(b => {
        if (b.name?.toLowerCase().includes(q) || b.description?.toLowerCase().includes(q)) {
          results.push({ type: 'base', icon: b.icon || '📊', title: b.name, subtitle: `${b.record_count || 0} records`, id: b.id, tab: 'bases' });
        }
      });

      // Search people
      (Array.isArray(people) ? people : []).forEach(p => {
        if (p.name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q) || p.company?.toLowerCase().includes(q)) {
          results.push({ type: 'person', icon: '👤', title: p.name, subtitle: [p.company, p.email].filter(Boolean).join(' · '), id: p.id, tab: 'people' });
        }
      });

      if (results.length === 0) {
        resultsEl.innerHTML = `<div class="dash-search-empty">No results. Press Enter to capture as task.</div>`;
      } else {
        resultsEl.innerHTML = results.slice(0, 10).map(r => `
          <div class="dash-search-item" data-tab="${this.escapeHtml(r.tab)}" data-id="${this.escapeHtml(r.id)}">
            <span class="dash-search-icon">${r.icon}</span>
            <div class="dash-search-info">
              <span class="dash-search-title">${this.escapeHtml(r.title)}</span>
              <span class="dash-search-subtitle">${this.escapeHtml(r.subtitle)}</span>
            </div>
            <span class="dash-search-type">${r.type}</span>
          </div>
        `).join('');

        resultsEl.querySelectorAll('.dash-search-item').forEach(item => {
          item.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const tab = item.dataset.tab;
            if (tab) dashboard.switchTab(tab);
            this.hideSearchResults();
            document.getElementById('dash-quick-capture').value = '';
          });
        });
      }
      resultsEl.style.display = 'block';
    } catch (err) {
      console.error('Search error:', err);
    }
  },

  hideSearchResults() {
    const el = document.getElementById('dash-search-results');
    if (el) el.style.display = 'none';
  },

  // ========================================
  // RENDER: TODAY PANEL
  // ========================================
  renderTodayPanel(today) {
    const list = document.getElementById('dash-today-list');
    const count = document.getElementById('dash-today-count');
    if (!list) return;

    const tasks = today.tasks || [];
    count.textContent = tasks.length;

    if (tasks.length === 0) {
      list.innerHTML = `<div class="dash-empty">No tasks for today. Use quick capture above to add one.</div>`;
      return;
    }

    list.innerHTML = tasks.map(t => {
      const subtaskInfo = Array.isArray(t.subtasks) && t.subtasks.length > 0
        ? (() => {
            const done = t.subtasks.filter(s => s.completed).length;
            return `<span class="dash-task-subtasks">${done}/${t.subtasks.length}</span>`;
          })()
        : '';

      return `
        <div class="dash-task-item ${t.important ? 'important' : ''}" data-id="${t.id}">
          <button class="dash-task-check" data-id="${t.id}" title="Complete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
          </button>
          <div class="dash-task-info">
            <span class="dash-task-title">${this.escapeHtml(t.title)}</span>
            <div class="dash-task-meta">
              ${t.due_time ? `<span class="dash-task-time">${t.due_time}</span>` : ''}
              ${subtaskInfo}
              ${t.important ? '<span class="dash-task-star">★</span>' : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Bind complete buttons
    list.querySelectorAll('.dash-task-check').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        try {
          await api.request(`/task-items/${id}`, { method: 'PATCH', body: { completed: true } });
          btn.closest('.dash-task-item').classList.add('completing');
          setTimeout(() => this.load(), 400);
        } catch (err) {
          console.error('Complete failed:', err);
        }
      });
    });

    // Click task to go to tasks tab
    list.querySelectorAll('.dash-task-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.dash-task-check')) return;
        dashboard.switchTab('tasks');
      });
    });
  },

  // ========================================
  // RENDER: OVERDUE PANEL
  // ========================================
  renderOverduePanel(overdue) {
    const section = document.getElementById('dash-overdue-section');
    const list = document.getElementById('dash-overdue-list');
    const count = document.getElementById('dash-overdue-count');
    if (!section || !list) return;

    if (!overdue || overdue.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = '';
    count.textContent = overdue.length;

    list.innerHTML = overdue.map(t => `
      <div class="dash-task-item overdue" data-id="${t.id}">
        <span class="dash-task-overdue-dot"></span>
        <div class="dash-task-info">
          <span class="dash-task-title">${this.escapeHtml(t.title)}</span>
          <span class="dash-task-due">Due: ${new Date(t.due_date).toLocaleDateString()}</span>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.dash-task-item').forEach(item => {
      item.addEventListener('click', () => dashboard.switchTab('tasks'));
    });
  },

  // ========================================
  // RENDER: PROJECTS PANEL
  // ========================================
  renderProjectsPanel(projects) {
    const list = document.getElementById('dash-projects-list');
    const count = document.getElementById('dash-projects-count');
    if (!list) return;

    const active = projects.active || [];
    count.textContent = active.length;

    if (active.length === 0) {
      list.innerHTML = `<div class="dash-empty">No active projects.</div>`;
      return;
    }

    const statusColors = {
      'in_progress': 'var(--neon-orange)',
      'blocked': 'var(--neon-pink)',
      'review': 'var(--neon-cyan)'
    };

    const statusLabels = {
      'in_progress': 'In Progress',
      'blocked': 'Blocked',
      'review': 'Review'
    };

    list.innerHTML = active.map(p => `
      <div class="dash-project-item" data-id="${p.id}">
        <span class="dash-project-dot" style="background: ${statusColors[p.status] || 'var(--neon-purple)'}"></span>
        <div class="dash-project-info">
          <span class="dash-project-title">${this.escapeHtml(p.title)}</span>
          <span class="dash-project-status" style="color: ${statusColors[p.status] || 'var(--neon-purple)'}">${statusLabels[p.status] || p.status}</span>
        </div>
        <span class="dash-project-priority priority-dot priority-${p.priority || 3}"></span>
      </div>
    `).join('');

    list.querySelectorAll('.dash-project-item').forEach(item => {
      item.addEventListener('click', () => {
        dashboard.switchTab('projects');
        const task = dashboard.tasks.find(t => t.id === item.dataset.id);
        if (task && typeof modal !== 'undefined') modal.openEdit(task);
      });
    });
  },

  // ========================================
  // RENDER: UPCOMING PANEL
  // ========================================
  renderUpcomingPanel(upcoming) {
    const list = document.getElementById('dash-upcoming-list');
    if (!list) return;

    if (!upcoming || upcoming.length === 0) {
      list.innerHTML = `<div class="dash-empty">Nothing scheduled for the next 7 days.</div>`;
      return;
    }

    // Group by date
    const grouped = {};
    upcoming.forEach(t => {
      const d = t.due_date;
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(t);
    });

    let html = '';
    for (const [date, tasks] of Object.entries(grouped)) {
      const d = new Date(date);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      html += `<div class="dash-upcoming-day"><span class="dash-upcoming-date">${dayName}</span></div>`;
      tasks.forEach(t => {
        html += `
          <div class="dash-task-item upcoming" data-id="${t.id}">
            <div class="dash-task-info">
              <span class="dash-task-title">${this.escapeHtml(t.title)}</span>
              ${t.due_time ? `<span class="dash-task-time">${t.due_time}</span>` : ''}
            </div>
            ${t.important ? '<span class="dash-task-star">★</span>' : ''}
          </div>
        `;
      });
    }

    list.innerHTML = html;

    list.querySelectorAll('.dash-task-item').forEach(item => {
      item.addEventListener('click', () => dashboard.switchTab('tasks'));
    });
  },

  // ========================================
  // RENDER: STATS
  // ========================================
  renderStats(stats) {
    const todayEl = document.getElementById('dash-stat-completed-today');
    const weekEl = document.getElementById('dash-stat-completed-week');
    const pendingEl = document.getElementById('dash-stat-pending');

    if (todayEl) todayEl.textContent = stats.tasks_completed_today;
    if (weekEl) weekEl.textContent = stats.tasks_completed_this_week;
    if (pendingEl) pendingEl.textContent = stats.total_pending;
  },

  // ========================================
  // BASE VIEW WIDGETS
  // ========================================
  async renderBaseWidgets() {
    const container = document.getElementById('dash-base-widgets');
    if (!container) return;

    const baseWidgets = this.widgets.filter(w => w.widget_type === 'base_view');

    if (baseWidgets.length === 0) {
      container.innerHTML = '';
      return;
    }

    // Load all needed bases in parallel
    const baseLoads = baseWidgets.map(async (widget) => {
      try {
        const baseId = widget.config.base_id;
        if (!baseId) return { widget, base: null, error: 'No base_id' };
        const base = await api.request(`/bases/${baseId}?expandRelations=true`);
        const views = await api.request(`/bases/${baseId}/views`).catch(() => []);
        return { widget, base, views };
      } catch (err) {
        return { widget, base: null, error: err.message };
      }
    });

    const results = await Promise.all(baseLoads);

    container.innerHTML = results.map(({ widget, base, views, error }) => {
      if (error || !base) {
        return `
          <section class="dash-widget dash-base-widget">
            <div class="dash-widget-header">
              <h2 class="dash-widget-title">${this.escapeHtml(widget.title)}</h2>
              <button class="dash-widget-remove" data-widget-id="${widget.id}" title="Remove widget">&times;</button>
            </div>
            <div class="dash-widget-body">
              <div class="dash-empty">Could not load base data.</div>
            </div>
          </section>
        `;
      }

      return this.renderBaseViewWidget(widget, base, views || []);
    }).join('');

    // Bind remove buttons
    container.querySelectorAll('.dash-widget-remove').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const widgetId = btn.dataset.widgetId;
        try {
          await api.request(`/dashboard/widgets/${widgetId}`, { method: 'DELETE' });
          this.widgets = this.widgets.filter(w => w.id !== widgetId);
          this.renderBaseWidgets();
        } catch (err) {
          console.error('Failed to remove widget:', err);
        }
      });
    });

    // Bind "Open in Bases" links
    container.querySelectorAll('.dash-base-open-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        dashboard.switchTab('bases');
      });
    });
  },

  // ========================================
  // RENDER: SINGLE BASE VIEW WIDGET
  // ========================================
  renderBaseViewWidget(widget, base, views) {
    const config = widget.config || {};
    const maxRows = config.max_rows || 8;
    const viewId = config.view_id;

    // Get properties (columns)
    let properties = base.properties || [];
    let records = base.records || [];

    // Apply view filter if a view is selected
    if (viewId) {
      const view = (Array.isArray(views) ? views : []).find(v => v.id === viewId);
      if (view && view.config) {
        const vc = typeof view.config === 'string' ? JSON.parse(view.config) : view.config;

        // Apply filters
        if (vc.filters && vc.filters.length > 0) {
          records = this.applyBaseFilters(records, properties, vc.filters);
        }

        // Apply column visibility
        if (vc.visibleColumns && vc.visibleColumns.length > 0) {
          properties = properties.filter(p => vc.visibleColumns.includes(p.id));
        }

        // Apply column order
        if (vc.columnOrder && vc.columnOrder.length > 0) {
          const orderMap = {};
          vc.columnOrder.forEach((id, idx) => orderMap[id] = idx);
          properties = [...properties].sort((a, b) => {
            const posA = orderMap[a.id] !== undefined ? orderMap[a.id] : 999;
            const posB = orderMap[b.id] !== undefined ? orderMap[b.id] : 999;
            return posA - posB;
          });
        }

        // Apply sort
        if (vc.sortColumn) {
          const sortProp = base.properties.find(p => p.id === vc.sortColumn);
          const dir = vc.sortDirection === 'desc' ? -1 : 1;
          records = [...records].sort((a, b) => {
            const valA = a.values[vc.sortColumn] || '';
            const valB = b.values[vc.sortColumn] || '';
            if (sortProp?.type === 'number') return (Number(valA) - Number(valB)) * dir;
            return String(valA).localeCompare(String(valB)) * dir;
          });
        }
      }
    }

    // Limit visible columns to first 5 for compact display
    const visibleProps = properties.slice(0, 5);
    const displayRecords = records.slice(0, maxRows);
    const totalRecords = records.length;

    // Build table
    const headerCells = visibleProps.map(p =>
      `<th class="dash-base-th">${this.escapeHtml(p.name)}</th>`
    ).join('');

    const rows = displayRecords.map(record => {
      const cells = visibleProps.map(p => {
        const val = record.values[p.id];
        return `<td class="dash-base-td">${this.renderBaseCellContent(p, val, record)}</td>`;
      }).join('');
      return `<tr class="dash-base-tr">${cells}</tr>`;
    }).join('');

    const footer = totalRecords > maxRows
      ? `<div class="dash-base-footer">${totalRecords - maxRows} more records <a href="#" class="dash-base-open-link">Open in Bases</a></div>`
      : totalRecords > 0
        ? `<div class="dash-base-footer">${totalRecords} records <a href="#" class="dash-base-open-link">Open in Bases</a></div>`
        : `<div class="dash-base-footer"><a href="#" class="dash-base-open-link">Open in Bases</a></div>`;

    return `
      <section class="dash-widget dash-base-widget">
        <div class="dash-widget-header">
          <h2 class="dash-widget-title">
            <span class="dash-base-icon">${base.icon || '📊'}</span>
            ${this.escapeHtml(widget.title)}
          </h2>
          <button class="dash-widget-remove" data-widget-id="${widget.id}" title="Remove widget">&times;</button>
        </div>
        <div class="dash-widget-body dash-base-table-wrap">
          ${displayRecords.length === 0
            ? '<div class="dash-empty">No records match this view.</div>'
            : `<table class="dash-base-table">
                <thead><tr>${headerCells}</tr></thead>
                <tbody>${rows}</tbody>
              </table>`
          }
          ${footer}
        </div>
      </section>
    `;
  },

  // ========================================
  // CELL RENDERER (compact version for dashboard)
  // ========================================
  renderBaseCellContent(prop, value, record) {
    if (value === undefined || value === null || value === '') {
      return '<span class="dash-cell-empty">-</span>';
    }

    switch (prop.type) {
      case 'checkbox':
        return value ? '✓' : '-';

      case 'select': {
        const opts = (prop.options || []);
        const opt = opts.find(o => (o.value || o) === value);
        const label = opt ? (opt.label || opt.value || value) : value;
        const color = opt?.color || 'var(--neon-purple)';
        return `<span class="dash-cell-tag" style="--tag-color: ${color}">${this.escapeHtml(String(label))}</span>`;
      }

      case 'multi_select': {
        const vals = Array.isArray(value) ? value : [];
        if (vals.length === 0) return '<span class="dash-cell-empty">-</span>';
        const opts = (prop.options || []);
        return vals.map(v => {
          const opt = opts.find(o => (o.value || o) === v);
          const label = opt ? (opt.label || opt.value || v) : v;
          const color = opt?.color || 'var(--neon-purple)';
          return `<span class="dash-cell-tag" style="--tag-color: ${color}">${this.escapeHtml(String(label))}</span>`;
        }).join(' ');
      }

      case 'date':
        return new Date(value).toLocaleDateString();

      case 'number':
        return String(value);

      case 'url':
        return `<a href="${this.escapeHtml(value)}" target="_blank" class="dash-cell-link" title="${this.escapeHtml(value)}">Link</a>`;

      case 'relation': {
        const ids = Array.isArray(value) ? value : [value];
        const expanded = record._expandedRelations?.[prop.id];
        if (expanded && expanded.length > 0) {
          return expanded.map(r => `<span class="dash-cell-relation">${this.escapeHtml(r.displayValue || `#${r.global_id}`)}</span>`).join(' ');
        }
        return `<span class="dash-cell-empty">${ids.length} linked</span>`;
      }

      case 'files': {
        const files = Array.isArray(value) ? value : [];
        return files.length > 0 ? `${files.length} file${files.length > 1 ? 's' : ''}` : '-';
      }

      case 'text':
      default:
        const str = String(value);
        return str.length > 60 ? this.escapeHtml(str.substring(0, 57)) + '...' : this.escapeHtml(str);
    }
  },

  // ========================================
  // FILTER ENGINE (subset of bases.js logic)
  // ========================================
  applyBaseFilters(records, properties, filters) {
    return records.filter(record => {
      return filters.every(f => {
        const prop = properties.find(p => p.id === f.propertyId);
        if (!prop) return true;
        const val = record.values[f.propertyId];
        return this.evaluateFilter(prop, val, f.operator, f.value);
      });
    });
  },

  evaluateFilter(prop, value, operator, filterValue) {
    const str = value != null ? String(value).toLowerCase() : '';
    const fv = filterValue != null ? String(filterValue).toLowerCase() : '';

    switch (operator) {
      case 'contains': return str.includes(fv);
      case 'equals': return str === fv;
      case 'starts_with': return str.startsWith(fv);
      case 'is_empty': return !value || (Array.isArray(value) && value.length === 0);
      case 'is_not_empty': return value && (!Array.isArray(value) || value.length > 0);
      case 'is': return str === fv;
      case 'is_not': return str !== fv;
      case 'is_checked': return !!value;
      case 'is_not_checked': return !value;
      case 'eq': return Number(value) === Number(filterValue);
      case 'neq': return Number(value) !== Number(filterValue);
      case 'gt': return Number(value) > Number(filterValue);
      case 'lt': return Number(value) < Number(filterValue);
      case 'gte': return Number(value) >= Number(filterValue);
      case 'lte': return Number(value) <= Number(filterValue);
      case 'before': return value && value < filterValue;
      case 'after': return value && value > filterValue;
      case 'does_not_contain':
        if (Array.isArray(value)) return !value.some(v => String(v).toLowerCase() === fv);
        return !str.includes(fv);
      default: return true;
    }
  },

  // ========================================
  // ADD WIDGET MODAL
  // ========================================
  async openAddWidgetModal() {
    const modal = document.getElementById('dash-widget-modal');
    if (!modal) return;

    // Load bases for the dropdown
    try {
      const bases = await api.request('/bases');
      const select = document.getElementById('dash-widget-base-select');
      if (select) {
        select.innerHTML = '<option value="">Choose a base...</option>' +
          bases.map(b => `<option value="${b.id}">${this.escapeHtml(b.icon || '📊')} ${this.escapeHtml(b.name)} (${b.record_count || 0})</option>`).join('');
      }
    } catch (err) {
      console.error('Failed to load bases:', err);
    }

    // Reset form
    document.getElementById('dash-widget-title-input').value = '';
    document.getElementById('dash-widget-max-rows').value = '8';
    const viewGroup = document.getElementById('dash-widget-view-group');
    if (viewGroup) viewGroup.style.display = 'none';

    modal.classList.add('open');
  },

  async onBaseSelected(baseId) {
    const viewGroup = document.getElementById('dash-widget-view-group');
    const viewSelect = document.getElementById('dash-widget-view-select');
    const titleInput = document.getElementById('dash-widget-title-input');

    if (!baseId) {
      if (viewGroup) viewGroup.style.display = 'none';
      return;
    }

    // Auto-fill title from base name
    try {
      const bases = await api.request('/bases');
      const base = bases.find(b => b.id === baseId);
      if (base && titleInput && !titleInput.value) {
        titleInput.value = base.name;
      }

      // Load views
      const views = await api.request(`/bases/${baseId}/views`);
      if (viewSelect) {
        viewSelect.innerHTML = '<option value="">All records (default)</option>' +
          (Array.isArray(views) ? views : []).map(v =>
            `<option value="${v.id}">${this.escapeHtml(v.name)}</option>`
          ).join('');
      }
      if (viewGroup) viewGroup.style.display = '';
    } catch (err) {
      console.error('Failed to load views:', err);
    }
  },

  closeWidgetModal() {
    const modal = document.getElementById('dash-widget-modal');
    if (modal) modal.classList.remove('open');
  },

  async saveWidget() {
    const baseId = document.getElementById('dash-widget-base-select')?.value;
    const viewId = document.getElementById('dash-widget-view-select')?.value || null;
    const title = document.getElementById('dash-widget-title-input')?.value.trim();
    const maxRows = parseInt(document.getElementById('dash-widget-max-rows')?.value) || 8;

    if (!baseId) {
      alert('Please select a base.');
      return;
    }
    if (!title) {
      alert('Please enter a title.');
      return;
    }

    try {
      const widget = await api.request('/dashboard/widgets', {
        method: 'POST',
        body: {
          widget_type: 'base_view',
          title,
          config: {
            base_id: baseId,
            view_id: viewId,
            max_rows: maxRows
          }
        }
      });

      this.widgets.push(widget);
      this.closeWidgetModal();
      this.renderBaseWidgets();
    } catch (err) {
      console.error('Failed to save widget:', err);
      alert('Failed to add widget.');
    }
  },

  // ========================================
  // UTILS
  // ========================================
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }
};

window.dashboardHub = dashboardHub;
