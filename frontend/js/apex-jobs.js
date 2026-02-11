/**
 * Apex Jobs Module - Displays restoration jobs from Zoho
 * Read-only view with Kanban, List, and Card views
 */

const TYPE_CODE_TO_NAME = { MIT: 'mitigation', RPR: 'reconstruction', RMD: 'remodel', ABT: 'abatement', REM: 'remediation' };
const TYPE_CODE_LABELS = { mitigation: 'Mitigation', reconstruction: 'Reconstruction', remodel: 'Remodel', abatement: 'Abatement', remediation: 'Remediation' };

const apexJobs = {
    jobs: [],
    stats: {},
    syncedAt: null,
    currentView: 'kanban',
    filters: {
        status: 'all',
        lossType: 'all',
        owner: 'all'
    },
    sort: {
        field: 'name',
        direction: 'asc'
    },

    init() {
        this.bindEvents();
        // Auto-load if apex tab is active
        const apexTab = document.querySelector(".tab[data-tab=\"apex\"]");
        if (apexTab && apexTab.classList.contains("active")) {
            this.loadJobs();
        }
    },

    bindEvents() {
        // View switching (apex-specific)
        document.querySelectorAll('.apex-view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchView(btn.dataset.view);
            });
        });

        // Filter events
        const statusFilter = document.getElementById('apex-filter-status');
        const lossFilter = document.getElementById('apex-filter-loss');
        const ownerFilter = document.getElementById('apex-filter-owner');

        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.renderCurrentView();
            });
        }
        if (lossFilter) {
            lossFilter.addEventListener('change', (e) => {
                this.filters.lossType = e.target.value;
                this.renderCurrentView();
            });
        }
        if (ownerFilter) {
            ownerFilter.addEventListener('change', (e) => {
                this.filters.owner = e.target.value;
                this.renderCurrentView();
            });
        }

        // Sortable columns in list view
        document.querySelectorAll('.apex-task-table th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                this.handleSort(th.dataset.sort);
            });
        });
    },

    switchView(viewName) {
        this.currentView = viewName;

        // Update view buttons
        document.querySelectorAll('.apex-view-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.view === viewName);
        });

        // Update view containers
        document.querySelectorAll('.apex-view-container').forEach(c => {
            c.classList.toggle('active', c.dataset.view === viewName);
        });

        this.renderCurrentView();
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
        document.querySelectorAll('.apex-task-table th.sortable').forEach(th => {
            th.classList.remove('sorted-asc', 'sorted-desc');
            if (th.dataset.sort === field) {
                th.classList.add(`sorted-${this.sort.direction}`);
            }
        });

        this.renderListView();
    },

    async loadJobs() {
        const indicator = document.getElementById('apex-refresh-indicator');
        if (indicator) indicator.classList.add('spinning');

        try {
            const data = await api.getApexJobs();

            this.jobs = data.projects || [];
            this.stats = data.stats || {};
            this.syncedAt = data.syncedAt;

            this.updateSyncInfo();
            this.populateFilters();
            this.renderCurrentView();
        } catch (err) {
            console.error('Failed to load Apex jobs:', err);
        } finally {
            if (indicator) indicator.classList.remove('spinning');
        }
    },

    updateSyncInfo() {
        const syncEl = document.getElementById('apex-sync-time');
        if (syncEl && this.syncedAt) {
            const date = new Date(this.syncedAt);
            syncEl.textContent = `Synced: ${date.toLocaleTimeString()}`;
            syncEl.title = date.toLocaleString();
        }
    },

    populateFilters() {
        // Populate loss type filter
        const lossTypes = [...new Set(this.jobs.map(j => j.lossType).filter(Boolean))];
        const lossFilter = document.getElementById('apex-filter-loss');
        if (lossFilter && lossFilter.options.length <= 1) {
            lossTypes.forEach(type => {
                const opt = document.createElement('option');
                opt.value = type;
                opt.textContent = type;
                lossFilter.appendChild(opt);
            });
        }

        // Populate owner filter
        const owners = [...new Set(this.jobs.map(j => j.owner?.name).filter(Boolean))];
        const ownerFilter = document.getElementById('apex-filter-owner');
        if (ownerFilter && ownerFilter.options.length <= 1) {
            owners.forEach(owner => {
                const opt = document.createElement('option');
                opt.value = owner;
                opt.textContent = owner;
                ownerFilter.appendChild(opt);
            });
        }
    },

    getFilteredJobs() {
        return this.jobs.filter(job => {
            if (this.filters.status !== 'all' && job.status !== this.filters.status) {
                return false;
            }
            if (this.filters.lossType !== 'all' && job.lossType !== this.filters.lossType) {
                return false;
            }
            if (this.filters.owner !== 'all' && job.owner?.name !== this.filters.owner) {
                return false;
            }
            return true;
        });
    },

    renderCurrentView() {
        this.renderKanban();
        this.renderList();
        this.renderCards();
    },

    // Alias methods for backwards compatibility
    renderKanbanView() { this.renderKanban(); },
    renderListView() { this.renderList(); },
    renderCardView() { this.renderCards(); },

    // ==================
    // KANBAN VIEW
    // ==================
    renderKanban() {
        const statuses = ['active', 'pending_insurance', 'complete'];
        const statusLabels = {
            'active': 'Active',
            'pending_insurance': 'Pending',
            'complete': 'Complete'
        };
        
        const jobs = this.getFilteredJobs();
        
        // Group jobs by status
        const grouped = {};
        statuses.forEach(s => grouped[s] = []);
        
        jobs.forEach(job => {
            const status = job.status || 'active';
            if (grouped[status]) {
                grouped[status].push(job);
            } else {
                grouped.active.push(job);
            }
        });

        statuses.forEach(status => {
            const column = document.querySelector(`.apex-column-tasks[data-status="${status}"]`);
            const count = document.querySelector(`.apex-task-count[data-count="${status}"]`);
            
            if (column) {
                column.innerHTML = grouped[status].map(job => this.renderJobCard(job)).join('');
                
                // Bind click events
                column.querySelectorAll('.apex-job-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const job = this.jobs.find(j => String(j.id) === card.dataset.id);
                        if (job) this.openJobDetail(job);
                    });
                });
            }
            
            if (count) {
                count.textContent = grouped[status].length;
            }
        });
    },

    renderJobCard(job) {
        const taskTotal = job.taskSummary?.total || job.tasks?.length || 0;
        const taskComplete = job.taskSummary?.completed || job.tasks?.filter(t => t.completed).length || 0;
        const progress = taskTotal > 0 ? Math.round((taskComplete / taskTotal) * 100) : 0;

        const lossTypeClass = (job.lossType || 'unknown').toLowerCase().replace(/\s+/g, '-');

        // Phase badges
        const phaseBadges = (job.phases || []).map(p =>
            `<span class="apex-phase-badge phase-${p.job_type_code.toLowerCase()}">${this.escapeHtml(p.job_type_code)}</span>`
        ).join('');

        return `
            <div class="apex-job-card" data-id="${job.id}">
                <div class="apex-job-header">
                    <span class="apex-job-title">${this.escapeHtml(job.name || 'Unnamed Job')}</span>
                </div>
                ${phaseBadges ? `<div class="apex-phase-badges">${phaseBadges}</div>` : ''}
                <div class="apex-job-client">${this.escapeHtml(job.client?.name || job.clientName || '')}</div>
                <div class="apex-job-meta">
                    <span class="apex-loss-badge loss-${lossTypeClass}">${this.escapeHtml(job.lossType || 'Unknown')}</span>
                    <span class="apex-task-progress" title="${taskComplete} of ${taskTotal} tasks complete">
                        <span class="progress-bar">
                            <span class="progress-fill" style="width: ${progress}%"></span>
                        </span>
                        <span class="progress-text">${taskComplete}/${taskTotal}</span>
                    </span>
                </div>
                <div class="apex-job-footer">
                    <span class="apex-owner">${this.escapeHtml(job.owner?.name || '')}</span>
                    <span class="apex-status-dot status-${job.status || 'active'}"></span>
                </div>
            </div>
        `;
    },

    // ==================
    // LIST VIEW (Sortable Table)
    // ==================
    renderList() {
        const jobs = this.getFilteredJobs();
        const tbody = document.getElementById('apex-list-body');
        const empty = document.getElementById('apex-list-empty');

        if (!tbody) return;

        // Apply sorting
        const sorted = [...jobs].sort((a, b) => {
            let valA, valB;
            
            switch(this.sort.field) {
                case 'name':
                    valA = (a.name || '').toLowerCase();
                    valB = (b.name || '').toLowerCase();
                    break;
                case 'client':
                    valA = (a.client?.name || a.clientName || '').toLowerCase();
                    valB = (b.client?.name || b.clientName || '').toLowerCase();
                    break;
                case 'lossType':
                    valA = (a.lossType || '').toLowerCase();
                    valB = (b.lossType || '').toLowerCase();
                    break;
                case 'owner':
                    valA = (a.owner?.name || '').toLowerCase();
                    valB = (b.owner?.name || '').toLowerCase();
                    break;
                case 'status':
                    valA = a.status || '';
                    valB = b.status || '';
                    break;
                case 'progress':
                    const totalA = a.taskSummary?.total || a.tasks?.length || 0;
                    const completeA = a.taskSummary?.completed || 0;
                    valA = totalA > 0 ? completeA / totalA : 0;
                    const totalB = b.taskSummary?.total || b.tasks?.length || 0;
                    const completeB = b.taskSummary?.completed || 0;
                    valB = totalB > 0 ? completeB / totalB : 0;
                    break;
                default:
                    valA = (a.name || '').toLowerCase();
                    valB = (b.name || '').toLowerCase();
            }
            
            if (valA < valB) return this.sort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return this.sort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        if (sorted.length === 0) {
            tbody.innerHTML = '';
            if (empty) empty.style.display = 'block';
            return;
        }

        if (empty) empty.style.display = 'none';
        
        tbody.innerHTML = sorted.map(job => {
            const taskTotal = job.taskSummary?.total || job.tasks?.length || 0;
            const taskComplete = job.taskSummary?.completed || 0;
            const lossTypeClass = (job.lossType || 'unknown').toLowerCase().replace(/\s+/g, '-');

            const phaseBadges = (job.phases || []).map(p =>
                `<span class="apex-phase-badge phase-${p.job_type_code.toLowerCase()}">${this.escapeHtml(p.job_type_code)}</span>`
            ).join('');

            return `
                <tr data-id="${job.id}">
                    <td class="title-cell">
                        ${this.escapeHtml(job.name || 'Unnamed')}
                        ${phaseBadges ? `<div class="apex-phase-badges">${phaseBadges}</div>` : ''}
                    </td>
                    <td>${this.escapeHtml(job.client?.name || job.clientName || '')}</td>
                    <td><span class="apex-loss-badge loss-${lossTypeClass}">${this.escapeHtml(job.lossType || '-')}</span></td>
                    <td>${taskComplete}/${taskTotal}</td>
                    <td>${this.escapeHtml(job.owner?.name || '-')}</td>
                    <td><span class="apex-status-badge status-${job.status}">${this.formatStatus(job.status)}</span></td>
                </tr>
            `;
        }).join('');

        // Bind click events
        tbody.querySelectorAll('tr').forEach(row => {
            row.addEventListener('click', () => {
                const job = this.jobs.find(j => String(j.id) === row.dataset.id);
                if (job) this.openJobDetail(job);
            });
        });
    },

    // ==================
    // CARD VIEW (Grid Layout)
    // ==================
    renderCards() {
        const jobs = this.getFilteredJobs();
        const grid = document.getElementById('apex-card-grid');
        const empty = document.getElementById('apex-card-empty');

        if (!grid) return;

        if (jobs.length === 0) {
            grid.innerHTML = '';
            if (empty) empty.style.display = 'block';
            return;
        }

        if (empty) empty.style.display = 'none';
        
        grid.innerHTML = jobs.map(job => this.renderProjectCard(job)).join('');

        // Bind click events
        grid.querySelectorAll('.apex-project-card').forEach(card => {
            card.addEventListener('click', () => {
                const job = this.jobs.find(j => String(j.id) === card.dataset.id);
                if (job) this.openJobDetail(job);
            });
        });
    },

    renderProjectCard(job) {
        const taskTotal = job.taskSummary?.total || job.tasks?.length || 0;
        const taskComplete = job.taskSummary?.completed || 0;
        const progress = taskTotal > 0 ? Math.round((taskComplete / taskTotal) * 100) : 0;
        const lossTypeClass = (job.lossType || 'unknown').toLowerCase().replace(/\s+/g, '-');

        // Format address
        const address = job.client?.address?.replace(/\r?\n/g, ', ').replace(/,\s*,/g, ',') || '';

        // Phase badges
        const phaseBadges = (job.phases || []).map(p =>
            `<span class="apex-phase-badge phase-${p.job_type_code.toLowerCase()}">${this.escapeHtml(p.job_type_code)}</span>`
        ).join('');

        return `
            <div class="apex-project-card loss-border-${lossTypeClass}" data-id="${job.id}">
                <div class="apex-project-header">
                    <span class="apex-project-title">${this.escapeHtml(job.name || 'Unnamed Job')}</span>
                    <span class="apex-loss-badge loss-${lossTypeClass}">${this.escapeHtml(job.lossType || 'Unknown')}</span>
                </div>
                ${phaseBadges ? `<div class="apex-phase-badges">${phaseBadges}</div>` : ''}
                <div class="apex-project-client">
                    <strong>${this.escapeHtml(job.client?.name || job.clientName || '')}</strong>
                    ${address ? `<div class="apex-address">${this.escapeHtml(address)}</div>` : ''}
                </div>
                <div class="apex-project-progress">
                    <div class="progress-bar large">
                        <span class="progress-fill" style="width: ${progress}%"></span>
                    </div>
                    <span class="progress-label">${taskComplete} of ${taskTotal} tasks (${progress}%)</span>
                </div>
                <div class="apex-project-footer">
                    <span class="apex-owner">${this.escapeHtml(job.owner?.name || '')}</span>
                    <span class="apex-status-badge status-${job.status}">${this.formatStatus(job.status)}</span>
                </div>
            </div>
        `;
    },

    // ==================
    // FULL-PAGE JOB DETAIL VIEW
    // ==================
    currentJob: null,
    selectedPhaseId: null,
    selectedAccountingType: null,
    activeTab: 'dates',

    async openJobDetail(job) {
        const container = document.getElementById('apex-job-detail');
        const content = document.getElementById('apex-jobs-content');
        if (!container) return;

        this.currentJob = job;

        // Hide view controls and kanban/list/cards, show detail view
        const viewControls = content?.querySelector('.apex-view-controls');
        const viewContainers = content?.querySelectorAll('.apex-view-container');
        if (viewControls) viewControls.style.display = 'none';
        if (viewContainers) viewContainers.forEach(c => c.style.display = 'none');
        container.style.display = 'block';

        // Show loading state
        container.innerHTML = '<div class="apex-empty-message">Loading job details...</div>';

        try {
            // Fetch full job data + related data in parallel
            const [fullJob, accounting, activity, notes, contacts, estimates] = await Promise.all([
                api.getApexJob(job.id),
                api.getApexJobAccounting(job.id).catch(() => ({})),
                api.getApexJobActivity(job.id).catch(() => []),
                api.getApexJobNotes(job.id).catch(() => []),
                // Contacts — placeholder until People module integration
                Promise.resolve([]),
                api.getApexJobEstimates(job.id).catch(() => [])
            ]);

            fullJob.accounting_summary = accounting;
            fullJob.activity_log = activity;
            fullJob.contacts = contacts || [];
            fullJob.notes = notes || [];
            fullJob.estimates = estimates || [];
            this.currentJob = fullJob;

            // Set initial phase and accounting type from first phase
            if (fullJob.phases && fullJob.phases.length > 0) {
                this.selectedPhaseId = fullJob.phases[0].id;
                this.selectedAccountingType = TYPE_CODE_TO_NAME[fullJob.phases[0].job_type_code] || null;
            } else {
                this.selectedAccountingType = null;
            }
            this.activeTab = 'dates';

            // Render full detail layout
            this.renderDetailView(fullJob);
            this.bindDetailEvents();
        } catch (err) {
            console.error('Failed to load job details:', err);
            // Fall back to summary data
            this.renderDetailView(job);
            this.bindDetailEvents();
        }
    },

    closeJobDetail() {
        const container = document.getElementById('apex-job-detail');
        const content = document.getElementById('apex-jobs-content');
        if (container) {
            container.style.display = 'none';
            container.innerHTML = '';
        }

        // Restore view controls and active view container
        if (content) {
            const viewControls = content.querySelector('.apex-view-controls');
            if (viewControls) viewControls.style.display = '';
            content.querySelectorAll('.apex-view-container').forEach(c => {
                c.style.display = '';
            });
        }

        this.currentJob = null;
        this.selectedPhaseId = null;
        this.selectedAccountingType = null;
        this._activeEstTab = null;
    },

    renderDetailView(job) {
        const container = document.getElementById('apex-job-detail');
        if (!container) return;

        const accounting = job.accounting_summary || {};
        const activities = job.activity_log || [];
        const contacts = job.contacts || [];
        const estimates = job.estimates || [];

        container.innerHTML = `
            <button class="job-detail-back" onclick="apexJobs.closeJobDetail()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
                Back to Jobs
            </button>

            <div class="job-detail-grid">
                <div class="job-detail-main">
                    ${this.renderDetailHeader(job)}
                    ${this.renderInfoCards(job)}
                    ${this.renderPhaseBar(job)}
                    ${this.renderContentTabs()}
                    <div id="job-detail-tab-panel" class="job-detail-tab-content"></div>
                    ${this.renderContactsSection(contacts)}
                </div>
                <div class="job-detail-sidebar">
                    ${this.renderAccountingSidebar(accounting, estimates)}
                    ${this.renderActivitySidebar(activities)}
                </div>
            </div>
        `;

        // Render initial tab content
        this.renderActiveTabContent();
    },

    getDamageIcon(source) {
        const s = (source || '').toLowerCase();
        if (s.includes('water') || s.includes('sewage') || s.includes('flood')) {
            return '<svg viewBox="0 0 24 24" fill="none" stroke="#00aaff" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>';
        }
        if (s.includes('fire') || s.includes('smoke')) {
            return '<svg viewBox="0 0 24 24" fill="none" stroke="#ff6b35" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>';
        }
        if (s.includes('mold')) {
            return '<svg viewBox="0 0 24 24" fill="none" stroke="#05ffa1" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
        }
        return '<svg viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>';
    },

    renderDetailHeader(job) {
        const clientName = job.client_name || 'No client';
        const address = this.formatAddress(job);
        const statusLabel = this.formatStatus(job.status);

        return `
            <div class="job-detail-header">
                <div class="job-detail-header-inner">
                    <div class="job-detail-header-left">
                        <div class="job-detail-damage-icon">
                            ${this.getDamageIcon(job.loss_type)}
                        </div>
                        <div class="job-detail-header-text">
                            <h1>${this.escapeHtml(job.name || job.job_number || 'Job Details')}</h1>
                            <div class="client-name">${this.escapeHtml(clientName)}</div>
                            ${address ? `<div class="address">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
                                ${this.escapeHtml(address)}
                            </div>` : ''}
                        </div>
                    </div>
                    <div class="job-detail-header-right">
                        <div class="job-detail-status-btn" id="job-status-toggle" role="button" tabindex="0">
                            <span class="apex-status-badge status-${job.status || 'active'}">${statusLabel}</span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
                            <div class="status-dropdown" id="job-status-dropdown" style="display: none;">
                                ${[
                                    { value: 'active', label: 'Active' },
                                    { value: 'pending_insurance', label: 'Pending Insurance' },
                                    { value: 'complete', label: 'Complete' },
                                    { value: 'archived', label: 'Archived' }
                                ].map(s =>
                                    `<button data-status="${s.value}">${s.label}</button>`
                                ).join('')}
                            </div>
                        </div>
                        <button class="job-detail-edit-btn" id="job-edit-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Edit
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    renderInfoCards(job) {
        const clientAddr = [job.client_street, [job.client_city, job.client_state].filter(Boolean).join(', '), job.client_zip].filter(Boolean).join(', ');

        const catLabels = { cat1: '1 - Clean Water', cat2: '2 - Gray Water', cat3: '3 - Black Water', '1': '1 - Clean Water', '2': '2 - Gray Water', '3': '3 - Black Water' };
        const classLabels = { class1: '1', class2: '2', class3: '3', class4: '4', '1': '1', '2': '2', '3': '3', '4': '4' };
        const catDisplay = catLabels[job.water_category] || job.water_category || '';
        const classDisplay = classLabels[job.damage_class] || job.damage_class || '';

        return `
            <div class="job-detail-info-row">
                <div class="job-info-card">
                    <div class="job-info-card-title">Client</div>
                    <p class="font-medium">${this.escapeHtml(job.client_name || '-')}</p>
                    ${job.client_phone ? `<a href="tel:${this.escapeHtml(job.client_phone)}" class="info-link">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        ${this.formatPhone(job.client_phone)}
                    </a>` : ''}
                    ${job.client_email ? `<a href="mailto:${this.escapeHtml(job.client_email)}" class="info-link">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        ${this.escapeHtml(job.client_email)}
                    </a>` : ''}
                    ${clientAddr ? `<p class="text-muted" style="margin-top:0.25rem">${this.escapeHtml(clientAddr)}</p>` : ''}
                </div>

                <div class="job-info-card">
                    <div class="job-info-card-title">Insurance</div>
                    ${job.ins_carrier ? `<p class="font-medium">${this.escapeHtml(job.ins_carrier)}</p>` : '<p class="text-muted">No carrier</p>'}
                    ${job.ins_claim ? `<div class="info-row"><span class="info-label">Claim</span><span>${this.escapeHtml(job.ins_claim)}</span></div>` : ''}
                    ${job.ins_policy ? `<div class="info-row"><span class="info-label">Policy</span><span>${this.escapeHtml(job.ins_policy)}</span></div>` : ''}
                    ${job.deductible != null ? `<div class="info-row"><span class="info-label">Deductible</span><span>$${Number(job.deductible).toLocaleString()}</span></div>` : ''}
                    ${job.adj_name ? `
                        <div style="margin-top:0.5rem;padding-top:0.5rem;border-top:1px solid rgba(255,255,255,0.05)">
                            <span style="font-size:0.65rem;color:var(--text-muted);text-transform:uppercase">Adjuster</span>
                            <p style="font-size:0.8rem;margin:0.2rem 0">${this.escapeHtml(job.adj_name)}</p>
                            ${job.adj_phone ? `<a href="tel:${this.escapeHtml(job.adj_phone)}" class="info-link" style="font-size:0.75rem">${this.formatPhone(job.adj_phone)}</a>` : ''}
                            ${job.adj_email ? `<a href="mailto:${this.escapeHtml(job.adj_email)}" class="info-link" style="font-size:0.75rem">${this.escapeHtml(job.adj_email)}</a>` : ''}
                        </div>
                    ` : ''}
                </div>

                <div class="job-info-card">
                    <div class="job-info-card-title">Property</div>
                    ${this.formatAddress(job) ? `<p class="text-muted">${this.escapeHtml(this.formatAddress(job))}</p>` : ''}
                    ${job.prop_type ? `<p class="font-medium">${this.escapeHtml(job.prop_type)}</p>` : ''}
                    <div style="display:flex;gap:0.75rem;font-size:0.8rem;color:var(--text-muted);margin-top:0.25rem">
                        ${catDisplay ? `<span>Cat ${this.escapeHtml(catDisplay)}</span>` : ''}
                        ${classDisplay ? `<span>Class ${this.escapeHtml(classDisplay)}</span>` : ''}
                    </div>
                    <div class="info-row"><span class="info-label">Source</span><span>${this.escapeHtml(job.loss_type || 'Unknown')}</span></div>
                </div>
            </div>
        `;
    },

    renderPhaseBar(job) {
        const phases = job.phases || [];
        if (phases.length <= 1) return '';

        return `
            <div class="job-detail-phase-bar">
                ${phases.map(phase => `
                    <button class="phase-btn ${phase.id === this.selectedPhaseId ? 'active' : ''}" data-phase-id="${phase.id}">
                        <span class="phase-badge">${this.escapeHtml(phase.job_type_code)}</span>
                        <span class="phase-number">${this.escapeHtml(phase.job_number)}</span>
                    </button>
                `).join('')}
            </div>
        `;
    },

    renderContentTabs() {
        const tabs = [
            { id: 'dates', label: 'Dates', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' },
            { id: 'documents', label: 'Documents', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>' },
            { id: 'tasks', label: 'Tasks', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>' },
            { id: 'notes', label: 'Notes', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' },
            { id: 'expenses', label: 'Expenses', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><path d="M14 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/></svg>' },
            { id: 'drying', label: 'Drying', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>' },
        ];

        return `
            <div class="job-detail-tabs">
                ${tabs.map(t => `
                    <button class="job-detail-tab-btn ${t.id === this.activeTab ? 'active' : ''}" data-tab="${t.id}">
                        ${t.icon}
                        ${t.label}
                    </button>
                `).join('')}
            </div>
        `;
    },

    renderActiveTabContent() {
        const panel = document.getElementById('job-detail-tab-panel');
        if (!panel || !this.currentJob) return;

        // Delegate to jobDetailTabs renderer if available
        if (window.jobDetailTabs && typeof window.jobDetailTabs.renderTab === 'function') {
            window.jobDetailTabs.renderTab(this.activeTab, this.currentJob, this.selectedPhaseId, panel);
        } else {
            panel.innerHTML = '<div class="apex-empty-state">Tab content loading...</div>';
        }
    },

    renderAccountingSidebar(accounting, estimates) {
        estimates = estimates || [];
        const type = this.selectedAccountingType;
        const job = this.currentJob || {};

        // Build phase tabs from job phases
        const phases = job.phases || [];
        const phaseTabs = phases.map(p => {
            const typeName = TYPE_CODE_TO_NAME[p.job_type_code] || null;
            const isActive = type === typeName;
            return `<button class="acct-phase-tab ${isActive ? 'active' : ''}" data-type="${typeName || ''}">${this.escapeHtml(p.job_type_code)}</button>`;
        });
        phaseTabs.push(`<button class="acct-phase-tab ${type == null ? 'active' : ''}" data-type="all">ALL</button>`);

        // Resolve metrics: support nested { all, by_type } and old flat format
        const metrics = (type && accounting.by_type?.[type]) || accounting.all || accounting;

        const totalEstimates = metrics.total_estimates || 0;
        const approvedEstimates = metrics.approved_estimates || 0;
        const totalPayments = metrics.total_paid || 0;
        const totalCosts = metrics.total_cost || 0;
        const balanceDue = metrics.balance_due != null ? metrics.balance_due : (totalEstimates - totalPayments);
        const grossProfit = approvedEstimates - totalCosts;
        const gpMargin = approvedEstimates > 0 ? ((grossProfit / approvedEstimates) * 100) : 0;

        let gpClass = 'gp-good';
        if (gpMargin < 15) gpClass = 'gp-bad';
        else if (gpMargin < 30) gpClass = 'gp-warn';

        const readyToInvoice = job.ready_to_invoice;

        return `
            <div class="job-accounting">
                <h3>Accounting</h3>
                ${phaseTabs.length > 0 ? `<div class="acct-phase-tabs">${phaseTabs.join('')}</div>` : ''}
                <div class="accounting-metrics">
                    <div class="accounting-metric">
                        <span class="metric-label">Total Estimates</span>
                        <span class="metric-value">$${totalEstimates.toLocaleString()}</span>
                    </div>
                    <div class="accounting-metric">
                        <span class="metric-label">Total Payments</span>
                        <span class="metric-value">$${totalPayments.toLocaleString()}</span>
                    </div>
                    <div class="accounting-metric">
                        <span class="metric-label">Total Costs</span>
                        <span class="metric-value">$${totalCosts.toLocaleString()}</span>
                    </div>
                    <div class="accounting-metric">
                        <span class="metric-label">GP Margin</span>
                        <span class="metric-value ${gpClass}">${gpMargin.toFixed(1)}%</span>
                    </div>
                    <div class="accounting-metric full-width">
                        <span class="metric-label">Balance Due</span>
                        <span class="metric-value ${balanceDue > 0 ? 'balance-due' : 'balance-paid'}">$${balanceDue.toLocaleString()}</span>
                    </div>
                </div>
                ${this.renderEstimatesBreakdown(estimates, type)}
                <div class="accounting-actions">
                    <button class="accounting-action-btn" data-action="add-estimate">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Estimate
                    </button>
                    <button class="accounting-action-btn" data-action="record-payment">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        Payment
                    </button>
                    <button class="accounting-action-btn" data-action="add-labor">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        Labor
                    </button>
                    <button class="accounting-action-btn" data-action="add-receipt">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><path d="M14 8H8"/><path d="M16 12H8"/></svg>
                        Receipt
                    </button>
                    <button class="accounting-action-btn" data-action="add-work-order">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        Work Order
                    </button>
                </div>
                <button class="accounting-invoice-toggle ${readyToInvoice ? 'ready' : 'not-ready'}" id="invoice-toggle-btn">
                    ${readyToInvoice ? 'Ready to Invoice' : 'Not Ready to Invoice'}
                </button>
            </div>
        `;
    },

    renderEstimatesBreakdown(estimates, selectedType) {
        if (!estimates || estimates.length === 0) return '';

        // Group estimates by type
        const byType = {};
        estimates.forEach(est => {
            const t = (est.estimate_type || est.type || 'unknown').toLowerCase();
            if (!byType[t]) byType[t] = [];
            byType[t].push(est);
        });

        // Filter to selectedType if set, otherwise show all with sub-tabs
        let typesToShow;
        if (selectedType) {
            typesToShow = byType[selectedType] ? { [selectedType]: byType[selectedType] } : {};
        } else {
            typesToShow = byType;
        }

        const typeKeys = Object.keys(typesToShow);
        if (typeKeys.length === 0) return '<div class="estimates-breakdown"><div class="apex-empty-state">No estimates</div></div>';

        // If ALL view, show type sub-tabs
        const activeEstTab = this._activeEstTab || typeKeys[0];
        let subTabs = '';
        if (!selectedType && typeKeys.length > 1) {
            subTabs = `<div class="estimates-type-tabs">${typeKeys.map(k =>
                `<button class="est-tab ${k === activeEstTab ? 'active' : ''}" data-est-type="${k}">${TYPE_CODE_LABELS[k] || k}</button>`
            ).join('')}</div>`;
        }

        // Render the estimates for the visible type
        const visibleType = selectedType || activeEstTab;
        const visibleEstimates = typesToShow[visibleType] || [];

        return `
            <div class="estimates-breakdown">
                <div class="estimates-breakdown-header">
                    <span>Estimates Breakdown</span>
                    <svg class="collapse-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
                </div>
                ${subTabs}
                <div class="estimates-breakdown-body">
                    ${this._renderEstimateTypeSection(visibleType, visibleEstimates)}
                </div>
            </div>
        `;
    },

    _renderEstimateTypeSection(typeName, estimates) {
        if (!estimates || estimates.length === 0) return '<div class="apex-empty-state">No estimates for this type</div>';

        // Sort versions descending (latest first)
        const sorted = [...estimates].sort((a, b) => (b.version || 0) - (a.version || 0));
        const current = sorted[0];
        const original = sorted.find(e => (e.version || 0) === 1) || sorted[sorted.length - 1];

        const currentAmount = current?.amount || 0;
        const totalForType = currentAmount;
        const originalAmount = original?.amount || 0;

        // Reduction calculation
        const reduction = originalAmount > 0 ? ((originalAmount - currentAmount) / originalAmount) * 100 : 0;
        let reductionClass = '';
        if (reduction > 0) {
            if (reduction <= 10) reductionClass = 'reduction-green';
            else if (reduction <= 15) reductionClass = 'reduction-yellow';
            else if (reduction <= 20) reductionClass = 'reduction-orange';
            else reductionClass = 'reduction-red';
        }

        const label = TYPE_CODE_LABELS[typeName] || typeName;

        return `
            <div class="est-type-header">
                <span class="est-type-label">${this.escapeHtml(label)}</span>
                <span class="est-type-total">$${totalForType.toLocaleString()}</span>
            </div>
            <div class="est-summary-row">
                <span>Current (v${current?.version || '?'})</span>
                <span>$${currentAmount.toLocaleString()}</span>
            </div>
            <div class="est-summary-row">
                <span>Original (v1)</span>
                <span>$${originalAmount.toLocaleString()}</span>
            </div>
            ${reduction > 0 ? `<div class="est-summary-row">
                <span>Reduction</span>
                <span class="${reductionClass}">${reduction.toFixed(1)}%</span>
            </div>` : ''}
            <div class="est-version-list">
                ${sorted.map(est => {
                    const ver = est.version || 1;
                    const delta = originalAmount > 0 && ver > 1 ? ((est.amount - originalAmount) / originalAmount * 100) : 0;
                    const dollarDelta = ver > 1 ? (est.amount - originalAmount) : 0;
                    const absDelta = Math.abs(delta);
                    let deltaClass = '';
                    if (delta !== 0) {
                        if (absDelta <= 10) deltaClass = 'reduction-green';
                        else if (absDelta <= 15) deltaClass = 'reduction-yellow';
                        else if (absDelta <= 20) deltaClass = 'reduction-orange';
                        else deltaClass = 'reduction-red';
                    }
                    const statusClass = this._estStatusClass(est.status);
                    const isOriginal = ver === 1;
                    return `
                        <div class="est-version-row">
                            <span class="est-ver-num">v${ver}${isOriginal ? ' <span class="est-original-tag">(original)</span>' : ''}</span>
                            <span class="est-ver-amount">$${(est.amount || 0).toLocaleString()}</span>
                            ${delta !== 0 ? `<span class="est-ver-delta ${deltaClass}">\u0394 ${dollarDelta >= 0 ? '' : '-'}$${Math.abs(dollarDelta).toLocaleString()} (${delta > 0 ? '+' : ''}${delta.toFixed(1)}%)</span>` : ''}
                            <span class="est-status-badge ${statusClass}">${this.escapeHtml(est.status || 'draft')}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    _estStatusClass(status) {
        const map = {
            draft: 'est-draft',
            submitted: 'est-submitted',
            approved: 'est-approved',
            revision_requested: 'est-revision',
            denied: 'est-denied'
        };
        return map[(status || '').toLowerCase()] || 'est-draft';
    },

    refreshAccountingSidebar() {
        const container = document.querySelector('.job-accounting');
        if (!container || !this.currentJob) return;
        const accounting = this.currentJob.accounting_summary || {};
        const estimates = this.currentJob.estimates || [];
        container.outerHTML = this.renderAccountingSidebar(accounting, estimates);
        this.bindSidebarTabEvents();
    },

    async refreshSidebarData() {
        const job = this.currentJob;
        if (!job) return;
        const [accounting, estimates] = await Promise.all([
            api.getApexJobAccounting(job.id).catch(() => ({ all: {}, by_type: {} })),
            api.getApexJobEstimates(job.id).catch(() => [])
        ]);
        job.accounting_summary = accounting;
        job.estimates = estimates;
        this.refreshAccountingSidebar();
    },

    bindSidebarTabEvents() {
        const container = document.querySelector('.job-accounting');
        if (!container) return;

        // Phase tabs
        container.querySelectorAll('.acct-phase-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const t = tab.dataset.type;
                this.selectedAccountingType = (t && t !== 'all') ? t : null;
                this.refreshAccountingSidebar();
            });
        });

        // Estimates breakdown collapse toggle
        const breakdownHeader = container.querySelector('.estimates-breakdown-header');
        if (breakdownHeader) {
            breakdownHeader.addEventListener('click', () => {
                const body = container.querySelector('.estimates-breakdown-body');
                const icon = breakdownHeader.querySelector('.collapse-icon');
                if (body) {
                    const isCollapsed = body.style.display === 'none';
                    body.style.display = isCollapsed ? '' : 'none';
                    if (icon) icon.style.transform = isCollapsed ? '' : 'rotate(-90deg)';
                }
            });
        }

        // Estimate type sub-tabs (ALL view)
        container.querySelectorAll('.estimates-type-tabs .est-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this._activeEstTab = tab.dataset.estType;
                this.refreshAccountingSidebar();
            });
        });

        // Re-bind accounting action buttons (since outerHTML destroys old bindings)
        const refreshDetail = () => this.openJobDetail(this.currentJob);
        container.querySelectorAll('.accounting-action-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const action = btn.dataset.action;
                const job = this.currentJob;
                if (!window.jobDetailModals || !job) return;

                switch (action) {
                    case 'add-estimate': {
                        const estimates = await api.getApexJobEstimates(job.id);
                        window.jobDetailModals.openAddEstimateModal(job.id, estimates, refreshDetail);
                        break;
                    }
                    case 'record-payment': {
                        const estimates = await api.getApexJobEstimates(job.id);
                        window.jobDetailModals.openRecordPaymentModal(job.id, estimates, refreshDetail);
                        break;
                    }
                    case 'add-labor':
                        window.jobDetailModals.openLaborEntryModal(job.id, null, refreshDetail);
                        break;
                    case 'add-receipt':
                        window.jobDetailModals.openReceiptModal(job.id, null, refreshDetail);
                        break;
                    case 'add-work-order':
                        window.jobDetailModals.openWorkOrderModal(job.id, null, refreshDetail);
                        break;
                }
            });
        });

        // Invoice toggle
        const invoiceBtn = container.querySelector('#invoice-toggle-btn');
        if (invoiceBtn) {
            invoiceBtn.addEventListener('click', async () => {
                try {
                    const newVal = !this.currentJob.ready_to_invoice;
                    await api.toggleApexJobInvoice(this.currentJob.id, newVal);
                    this.currentJob.ready_to_invoice = newVal;
                    invoiceBtn.className = `accounting-invoice-toggle ${newVal ? 'ready' : 'not-ready'}`;
                    invoiceBtn.textContent = newVal ? 'Ready to Invoice' : 'Not Ready to Invoice';
                } catch (err) {
                    console.error('Failed to toggle invoice status:', err);
                }
            });
        }
    },

    renderActivitySidebar(activities) {
        const eventTypes = ['all', 'status', 'payment', 'estimate', 'note', 'contact'];

        return `
            <div class="job-activity">
                <h3>Activity</h3>
                <div class="activity-filters">
                    ${eventTypes.map(type => `
                        <button class="activity-filter-btn ${type === 'all' ? 'active' : ''}" data-filter="${type}">
                            ${type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                    `).join('')}
                </div>
                <div class="activity-timeline" id="activity-timeline">
                    ${activities.length > 0 ? activities.map(event => {
                        const dotClass = 'dot-' + (event.event_type || 'default');
                        const dateStr = event.created_at ? new Date(event.created_at).toLocaleDateString() : '';
                        return `
                            <div class="activity-event" data-type="${event.event_type || 'default'}">
                                <span class="event-dot ${dotClass}"></span>
                                <div class="event-body">
                                    <div class="event-date">${dateStr}</div>
                                    <div class="event-desc">${this.escapeHtml(event.description || '')}</div>
                                </div>
                                ${event.amount ? `<span class="event-amount">$${Number(event.amount).toLocaleString()}</span>` : ''}
                            </div>
                        `;
                    }).join('') : '<div class="apex-empty-state">No activity yet</div>'}
                </div>
            </div>
        `;
    },

    renderContactsSection(contacts) {
        return `
            <div class="job-contacts">
                <div class="job-contacts-header">
                    <div class="job-contacts-header-left">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        <h3>Assigned Contacts</h3>
                        <span class="contact-count">${contacts.length}</span>
                    </div>
                    <button class="job-contacts-add-btn" id="add-contact-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Add Contact
                    </button>
                </div>
                ${contacts.length > 0 ? `
                    <div class="contacts-grid">
                        ${contacts.map(c => this.renderContactCard(c)).join('')}
                    </div>
                ` : '<div class="apex-empty-state">No contacts assigned to this project</div>'}
            </div>
        `;
    },

    renderContactCard(contact) {
        const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ');
        return `
            <div class="contact-card">
                <div class="contact-card-top">
                    <div>
                        <span class="contact-name">${this.escapeHtml(name)}</span>
                        ${contact.role_on_project ? `<span class="contact-role"> (${this.escapeHtml(contact.role_on_project)})</span>` : ''}
                        ${contact.has_msa ? '<span class="msa-badge">MSA</span>' : ''}
                    </div>
                </div>
                ${contact.organization_name ? `<div class="contact-org">${this.escapeHtml(contact.organization_name)}</div>` : ''}
                <div class="contact-card-actions">
                    ${contact.phone ? `<a href="tel:${this.escapeHtml(contact.phone)}" title="Call">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    </a>` : ''}
                    ${contact.email ? `<a href="mailto:${this.escapeHtml(contact.email)}" title="Email">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    </a>` : ''}
                </div>
            </div>
        `;
    },

    bindDetailEvents() {
        const container = document.getElementById('apex-job-detail');
        if (!container) return;

        // Status dropdown toggle
        const statusToggle = container.querySelector('#job-status-toggle');
        const statusDropdown = container.querySelector('#job-status-dropdown');
        if (statusToggle && statusDropdown) {
            statusToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = statusDropdown.style.display !== 'none';
                statusDropdown.style.display = isOpen ? 'none' : 'block';
            });

            statusDropdown.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const newStatus = btn.dataset.status;
                    statusDropdown.style.display = 'none';
                    try {
                        await api.updateApexJobStatus(this.currentJob.id, newStatus);
                        this.currentJob.status = newStatus;
                        // Re-render header
                        const header = container.querySelector('.job-detail-header');
                        if (header) {
                            header.outerHTML = this.renderDetailHeader(this.currentJob);
                            this.bindDetailEvents();
                        }
                    } catch (err) {
                        console.error('Failed to update status:', err);
                    }
                });
            });

            // Close dropdown on outside click
            document.addEventListener('click', () => {
                if (statusDropdown) statusDropdown.style.display = 'none';
            }, { once: true });
        }

        // Edit button
        const editBtn = container.querySelector('#job-edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                if (window.jobDetailModals) {
                    window.jobDetailModals.openEditJobModal(this.currentJob, () => {
                        this.openJobDetail(this.currentJob);
                    });
                }
            });
        }

        // Phase bar buttons
        container.querySelectorAll('.job-detail-phase-bar .phase-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectedPhaseId = btn.dataset.phaseId;
                container.querySelectorAll('.job-detail-phase-bar .phase-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderActiveTabContent();
                // Sync accounting sidebar with selected phase
                const phase = this.currentJob.phases?.find(p => p.id == this.selectedPhaseId);
                if (phase) {
                    this.selectedAccountingType = TYPE_CODE_TO_NAME[phase.job_type_code] || null;
                    this.refreshAccountingSidebar();
                }
            });
        });

        // Content tab buttons
        container.querySelectorAll('.job-detail-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.activeTab = btn.dataset.tab;
                container.querySelectorAll('.job-detail-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderActiveTabContent();
            });
        });

        // Bind sidebar tabs, accounting actions, and invoice toggle
        this.bindSidebarTabEvents();

        // Add contact button
        const refreshDetail = () => this.openJobDetail(this.currentJob);
        const addContactBtn = container.querySelector('#add-contact-btn');
        if (addContactBtn) {
            addContactBtn.addEventListener('click', () => {
                if (window.jobDetailModals) {
                    window.jobDetailModals.openAddContactModal(this.currentJob.id, refreshDetail);
                }
            });
        }

        // Activity filter buttons
        container.querySelectorAll('.activity-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.dataset.filter;
                container.querySelectorAll('.activity-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const timeline = container.querySelector('#activity-timeline');
                if (timeline) {
                    timeline.querySelectorAll('.activity-event').forEach(event => {
                        if (filter === 'all') {
                            event.style.display = '';
                        } else {
                            event.style.display = event.dataset.type === filter ? '' : 'none';
                        }
                    });
                }
            });
        });
    },

    formatAddress(job) {
        const street = job.prop_street || '';
        const city = job.prop_city || '';
        const state = job.prop_state || '';
        const zip = job.prop_zip || '';
        const cityState = [city, state].filter(Boolean).join(', ');
        return [street, cityState, zip].filter(Boolean).join(', ');
    },

    formatPhaseStatus(status) {
        const labels = {
            'not_started': 'Not Started',
            'in_progress': 'In Progress',
            'pending_approval': 'Pending Approval',
            'approved': 'Approved',
            'complete': 'Complete'
        };
        return labels[status] || status || 'Not Started';
    },

    closeJobModal() {
        const modal = document.getElementById('apex-job-modal');
        if (modal) modal.classList.remove('open');
    },

    // ==================
    // UTILS
    // ==================
    formatStatus(status) {
        const labels = {
            'active': 'Active',
            'pending_insurance': 'Pending Insurance',
            'complete': 'Complete',
            'archived': 'Archived'
        };
        return labels[status] || status || 'Unknown';
    },

    formatPhone(phone) {
        if (!phone) return null;
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10) {
            return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
        }
        return phone;
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    apexJobs.init();
    
    // Close modal on backdrop click
    const modal = document.getElementById('apex-job-modal');
    if (modal) {
        modal.querySelector('.modal-backdrop')?.addEventListener('click', () => apexJobs.closeJobModal());
        modal.querySelector('.modal-close')?.addEventListener('click', () => apexJobs.closeJobModal());
    }
});

window.apexJobs = apexJobs;
