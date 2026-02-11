/**
 * Dashboard - Kanban/List/Card views with tabs
 */

const dashboard = {
    tasks: [],
    refreshInterval: null,
    REFRESH_MS: 30000,
    currentView: 'kanban',
    currentTab: 'projects',
    filters: {
        status: 'all',
        priority: 'all'
    },
    sort: {
        field: 'priority',
        direction: 'asc'
    },

    init() {
        this.bindEvents();
        this.loadTasks();
        this.startAutoRefresh();
    },

    bindEvents() {
        // Add task button
        document.getElementById('add-task-btn').addEventListener('click', () => {
            modal.openNew();
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', async () => {
            try {
                await api.logout();
            } catch (e) {}
            window.location.href = '/login.html';
        });

        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });

        // View switching
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchView(btn.dataset.view);
            });
        });

        // Filters
        document.getElementById('filter-status').addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.renderCurrentView();
        });
        document.getElementById('filter-priority').addEventListener('change', (e) => {
            this.filters.priority = e.target.value;
            this.renderCurrentView();
        });

        // Sortable columns in list view
        document.querySelectorAll('.task-table th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                this.handleSort(th.dataset.sort);
            });
        });

        // Drag-and-drop for kanban
        document.querySelectorAll('.column-tasks').forEach(column => {
            column.addEventListener('dragover', (e) => this.handleDragOver(e));
            column.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            column.addEventListener('drop', (e) => this.handleDrop(e));
        });

        // Column header click → modal
        document.querySelectorAll('.column-header').forEach(header => {
            header.addEventListener('click', () => {
                const column = header.closest('.column');
                this.openColumnView(column.dataset.status);
            });
        });

        // Column modal close
        const columnModal = document.getElementById('column-modal');
        columnModal.querySelector('.modal-backdrop').addEventListener('click', () => this.closeColumnView());
        columnModal.querySelector('.modal-close').addEventListener('click', () => this.closeColumnView());
    },

    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update tab buttons
        document.querySelectorAll('.tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabName);
        });
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(c => {
            c.classList.toggle('active', c.dataset.tab === tabName);
        });
        
        // Hide header add button on Tasks tab (has inline button)
        const addItemBtn = document.getElementById('add-item-btn');
        if (addItemBtn) {
            addItemBtn.style.display = tabName === 'tasks' ? 'none' : '';
        }
        
        // Load tasks when switching to Tasks tab
        if (tabName === 'tasks' && typeof taskModal !== 'undefined') {
            taskModal.loadTasks();
            taskModal.loadCounts();
            taskModal.loadLists();
        }

        // Load calendar when switching to Calendar tab
        if (tabName === 'calendar' && typeof calendar !== 'undefined') {
            calendar.load();
        }

        // Load Apex jobs when switching to Apex tab
        if (tabName === "apex" && typeof apexJobs !== "undefined") {
            if (!apexJobs.jobs || !apexJobs.jobs.length) {
                apexJobs.loadJobs();
            }
        }
    },

    switchView(viewName) {
        this.currentView = viewName;
        
        // Update view buttons
        document.querySelectorAll('.view-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.view === viewName);
        });
        
        // Update view containers
        document.querySelectorAll('.view-container').forEach(c => {
            c.classList.toggle('active', c.dataset.view === viewName);
        });

        this.renderCurrentView();
    },

    getFilteredTasks() {
        return this.tasks.filter(task => {
            if (this.filters.status !== 'all' && task.status !== this.filters.status) {
                return false;
            }
            if (this.filters.priority !== 'all' && task.priority !== parseInt(this.filters.priority)) {
                return false;
            }
            return true;
        });
    },

    handleSort(field) {
        // Toggle direction if same field, otherwise reset to asc
        if (this.sort.field === field) {
            this.sort.direction = this.sort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sort.field = field;
            this.sort.direction = 'asc';
        }

        // Update UI
        document.querySelectorAll('.task-table th.sortable').forEach(th => {
            th.classList.remove('sorted-asc', 'sorted-desc');
            if (th.dataset.sort === field) {
                th.classList.add(`sorted-${this.sort.direction}`);
            }
        });

        this.renderListView();
    },

    async loadTasks() {
        const indicator = document.getElementById('refresh-indicator');
        indicator.classList.add('spinning');
        
        try {
            const response = await api.getTasks();
            this.tasks = response.tasks || [];
            this.renderCurrentView();
        } catch (err) {
            console.error('Failed to load tasks:', err);
        } finally {
            indicator.classList.remove('spinning');
        }
    },

    startAutoRefresh() {
        this.refreshInterval = setInterval(() => this.loadTasks(), this.REFRESH_MS);
    },

    renderCurrentView() {
        this.renderKanbanView();
        this.renderListView();
        this.renderCardView();
    },

    // ==================
    // KANBAN VIEW
    // ==================
    renderKanbanView() {
        const statuses = ['planned', 'ready', 'in_progress', 'blocked', 'review', 'done'];
        const tasks = this.getFilteredTasks();
        
        const grouped = {};
        statuses.forEach(s => grouped[s] = []);
        
        tasks.forEach(task => {
            const status = task.status || 'planned';
            if (grouped[status]) {
                grouped[status].push(task);
            } else {
                grouped.planned.push(task);
            }
        });

        statuses.forEach(status => {
            grouped[status].sort((a, b) => (a.priority || 3) - (b.priority || 3));
        });

        statuses.forEach(status => {
            const column = document.querySelector(`.column-tasks[data-status="${status}"]`);
            const count = document.querySelector(`.task-count[data-count="${status}"]`);
            
            if (column) {
                column.innerHTML = grouped[status].map(task => this.renderKanbanCard(task)).join('');
                
                column.querySelectorAll('.task-card').forEach(card => {
                    card.addEventListener('click', (e) => {
                        if (!e.target.closest('.task-card-drag')) {
                            const task = this.tasks.find(t => t.id === card.dataset.id);
                            if (task) modal.openEdit(task);
                        }
                    });
                    card.addEventListener('dragstart', (e) => this.handleDragStart(e, card));
                    card.addEventListener('dragend', (e) => this.handleDragEnd(e, card));
                });
            }
            
            if (count) {
                count.textContent = grouped[status].length;
            }
        });
    },

    renderKanbanCard(task) {
        const priority = task.priority || 3;
        const hasCriteria = task.acceptance_criteria?.length > 0;
        const hasLinks = task.context_links?.length > 0;
        const hasNotes = task.notes?.trim().length > 0;
        
        let badges = '';
        if (hasCriteria) badges += '<span class="task-badge has-criteria"></span>';
        if (hasLinks) badges += '<span class="task-badge has-links"></span>';
        if (hasNotes) badges += '<span class="task-badge has-notes"></span>';

        const description = task.description 
            ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` 
            : '';

        return `
            <div class="task-card" data-id="${task.id}" draggable="true">
                <div class="task-card-header">
                    <span class="priority-dot priority-${priority}" title="Priority ${priority}"></span>
                    <span class="task-title">${this.escapeHtml(task.title)}</span>
                </div>
                ${description}
                ${badges ? `<div class="task-meta-row">${badges}</div>` : ''}
            </div>
        `;
    },

    // ==================
    // LIST VIEW
    // ==================
    renderListView() {
        const tasks = this.getFilteredTasks();
        const tbody = document.getElementById('list-body');
        const empty = document.getElementById('list-empty');

        // Sort tasks
        const sorted = [...tasks].sort((a, b) => {
            let valA = a[this.sort.field];
            let valB = b[this.sort.field];
            
            if (this.sort.field === 'priority') {
                valA = valA || 3;
                valB = valB || 3;
            }
            
            if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB?.toLowerCase() || '';
            }

            if (valA < valB) return this.sort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return this.sort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        if (sorted.length === 0) {
            tbody.innerHTML = '';
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';
        tbody.innerHTML = sorted.map(task => this.renderListRow(task)).join('');

        // Bind click events
        tbody.querySelectorAll('tr').forEach(row => {
            row.addEventListener('click', () => {
                const task = this.tasks.find(t => t.id === row.dataset.id);
                if (task) modal.openEdit(task);
            });
        });
    },

    renderListRow(task) {
        const priority = task.priority || 3;
        const statusLabels = {
            'planned': 'Planned',
            'ready': 'Ready',
            'in_progress': 'In Progress',
            'blocked': 'Blocked',
            'review': 'Review',
            'done': 'Done'
        };

        const updated = task.updated_at 
            ? new Date(task.updated_at).toLocaleDateString()
            : '-';

        return `
            <tr data-id="${task.id}">
                <td><span class="priority-dot priority-${priority}"></span></td>
                <td class="title-cell">${this.escapeHtml(task.title)}</td>
                <td><span class="status-badge ${task.status}">${statusLabels[task.status] || task.status}</span></td>
                <td>${updated}</td>
            </tr>
        `;
    },

    // ==================
    // CARD VIEW
    // ==================
    renderCardView() {
        const tasks = this.getFilteredTasks();
        const grid = document.getElementById('card-grid');
        const empty = document.getElementById('card-empty');

        // Sort by priority
        const sorted = [...tasks].sort((a, b) => (a.priority || 3) - (b.priority || 3));

        if (sorted.length === 0) {
            grid.innerHTML = '';
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';
        grid.innerHTML = sorted.map(task => this.renderProjectCard(task)).join('');

        // Bind click events
        grid.querySelectorAll('.project-card').forEach(card => {
            card.addEventListener('click', () => {
                const task = this.tasks.find(t => t.id === card.dataset.id);
                if (task) modal.openEdit(task);
            });
        });
    },

    renderProjectCard(task) {
        const priority = task.priority || 3;
        const statusLabels = {
            'planned': 'Planned',
            'ready': 'Ready',
            'in_progress': 'In Progress',
            'blocked': 'Blocked',
            'review': 'Review',
            'done': 'Done'
        };

        const description = task.description 
            ? `<div class="project-card-description">${this.escapeHtml(task.description)}</div>` 
            : '';

        const criteriaCount = task.acceptance_criteria?.length || 0;
        const linksCount = task.context_links?.length || 0;

        return `
            <div class="project-card priority-${priority}" data-id="${task.id}">
                <div class="project-card-header">
                    <span class="project-card-title">${this.escapeHtml(task.title)}</span>
                    <span class="project-card-priority">
                        <span class="priority-dot priority-${priority}"></span>
                    </span>
                </div>
                ${description}
                <div class="project-card-footer">
                    <span class="status-badge ${task.status}">${statusLabels[task.status] || task.status}</span>
                    <div class="project-card-meta">
                        ${criteriaCount > 0 ? `<span>✓ ${criteriaCount}</span>` : ''}
                        ${linksCount > 0 ? `<span>🔗 ${linksCount}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    },

    // ==================
    // COLUMN VIEW MODAL
    // ==================
    openColumnView(status) {
        const statusNames = {
            'planned': 'Planned', 'ready': 'Ready', 'in_progress': 'In Progress',
            'blocked': 'Blocked', 'review': 'Review', 'done': 'Done'
        };

        const columnModal = document.getElementById('column-modal');
        const title = document.getElementById('column-modal-title');
        const cardsContainer = document.getElementById('column-cards');
        const emptyMessage = document.getElementById('column-empty');

        const columnTasks = this.tasks.filter(t => t.status === status);
        columnTasks.sort((a, b) => (a.priority || 3) - (b.priority || 3));

        title.textContent = `${statusNames[status] || status} (${columnTasks.length})`;

        if (columnTasks.length === 0) {
            cardsContainer.innerHTML = '';
            emptyMessage.style.display = 'block';
        } else {
            emptyMessage.style.display = 'none';
            cardsContainer.innerHTML = columnTasks.map(task => this.renderColumnCard(task)).join('');

            cardsContainer.querySelectorAll('.column-view-card').forEach(card => {
                card.addEventListener('click', () => {
                    const task = this.tasks.find(t => t.id === card.dataset.id);
                    if (task) {
                        this.closeColumnView();
                        modal.openEdit(task);
                    }
                });
            });
        }

        columnModal.classList.add('open');
    },

    closeColumnView() {
        document.getElementById('column-modal').classList.remove('open');
    },

    renderColumnCard(task) {
        const priority = task.priority || 3;
        const description = task.description 
            ? `<div class="card-description">${this.escapeHtml(task.description)}</div>` 
            : '';
        
        let meta = [];
        if (task.acceptance_criteria?.length > 0) {
            meta.push(`<span class="card-criteria">${task.acceptance_criteria.length} criteria</span>`);
        }
        if (task.context_links?.length > 0) {
            meta.push(`<span class="card-links">${task.context_links.length} links</span>`);
        }
        if (task.notes?.trim()) {
            meta.push(`<span class="card-notes-indicator">📝 Has notes</span>`);
        }

        return `
            <div class="column-view-card" data-id="${task.id}">
                <div class="card-header">
                    <span class="priority-dot priority-${priority}" title="Priority ${priority}"></span>
                    <span class="card-title">${this.escapeHtml(task.title)}</span>
                </div>
                ${description}
                ${meta.length > 0 ? `<div class="card-meta">${meta.join('')}</div>` : ''}
            </div>
        `;
    },

    // ==================
    // DRAG & DROP
    // ==================
    handleDragStart(e, card) {
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.dataset.id);
    },

    handleDragEnd(e, card) {
        card.classList.remove('dragging');
        document.querySelectorAll('.column-tasks').forEach(col => col.classList.remove('drag-over'));
    },

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const column = e.target.closest('.column-tasks');
        if (column) column.classList.add('drag-over');
    },

    handleDragLeave(e) {
        const column = e.target.closest('.column-tasks');
        if (column && !column.contains(e.relatedTarget)) {
            column.classList.remove('drag-over');
        }
    },

    async handleDrop(e) {
        e.preventDefault();
        const column = e.target.closest('.column-tasks');
        if (!column) return;
        column.classList.remove('drag-over');
        
        const taskId = e.dataTransfer.getData('text/plain');
        const newStatus = column.dataset.status;
        if (!taskId || !newStatus) return;
        
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || task.status === newStatus) return;
        
        // If moving to blocked or review, prompt for reason
        if (newStatus === 'blocked' || newStatus === 'review') {
            modal.showReasonModal(newStatus, taskId, async (id, status, reason) => {
                await this.performStatusChange(task, status, reason);
            });
            return;
        }
        
        await this.performStatusChange(task, newStatus);
    },

    async performStatusChange(task, newStatus, reason = null) {
        const oldStatus = task.status;
        task.status = newStatus;
        this.renderCurrentView();
        
        try {
            const updateData = { status: newStatus };
            if (reason) {
                updateData.status_reason = reason;
            }
            await api.updateTask(task.id, updateData);
            // Reload to get updated activity log
            this.loadTasks();
        } catch (err) {
            task.status = oldStatus;
            this.renderCurrentView();
            alert('Failed to move task: ' + err.message);
        }
    },

    // ==================
    // UTILS
    // ==================
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
};

// Keep backward compatibility
const kanban = dashboard;

document.addEventListener('DOMContentLoaded', () => dashboard.init());
window.kanban = dashboard;
window.dashboard = dashboard;
