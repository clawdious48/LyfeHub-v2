/**
 * Job Detail Tabs - Content renderers for the 6 tab panels
 * Each function receives a job object and returns an HTML string.
 */

function _relativeTime(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
}

function _canModifyNote(note) {
    const user = window.currentUser || {};
    if (user.role === 'management') return true;
    if (note.author_id && note.author_id === user.id) {
        const age = Date.now() - new Date(note.created_at).getTime();
        return age < 5 * 60 * 1000; // 5 minutes
    }
    return false;
}

const jobDetailTabs = {

    // ========================================
    // Tab 1: Dates
    // ========================================
    renderDatesTab(job) {
        const esc = apexJobs.escapeHtml;
        const dateFields = [
            { key: 'loss_date', label: 'Date of Loss', highlight: true },
            { key: 'contacted_date', label: 'Contacted' },
            { key: 'inspection_date', label: 'Inspection' },
            { key: 'work_auth_date', label: 'Work Auth' },
            { key: 'start_date', label: 'Start Date', highlight: true },
            { key: 'cos_date', label: 'COS Date' },
            { key: 'completion_date', label: 'Completion', highlight: true }
        ];

        const fields = dateFields.map(f => {
            const val = job[f.key] || '';
            const display = val ? new Date(val).toLocaleDateString() : 'Not set';
            const highlightClass = f.highlight ? ' jdt-date-highlight' : '';
            return `
                <div class="jdt-date-field${highlightClass}" data-field="${f.key}" data-job-id="${job.id}">
                    <span class="apex-detail-label">${esc(f.label)}</span>
                    <span class="jdt-date-display" onclick="jobDetailTabs._editDate(this, '${f.key}', '${job.id}')">${esc(display)}</span>
                    <input type="date" class="jdt-date-input" value="${esc(val)}" style="display:none"
                        onchange="jobDetailTabs._saveDate(this, '${f.key}', '${job.id}')"
                        onblur="jobDetailTabs._cancelDate(this)">
                </div>
            `;
        }).join('');

        return `
            <div class="apex-modal-section">
                <h3 class="apex-section-title">Key Dates</h3>
                <div class="jdt-dates-grid">${fields}</div>
            </div>
        `;
    },

    _editDate(el, field, jobId) {
        const container = el.closest('.jdt-date-field');
        el.style.display = 'none';
        const input = container.querySelector('.jdt-date-input');
        input.style.display = 'block';
        input.focus();
    },

    async _saveDate(input, field, jobId) {
        const container = input.closest('.jdt-date-field');
        const display = container.querySelector('.jdt-date-display');
        const value = input.value;
        try {
            await api.updateApexJobDates(jobId, { [field]: value || null });
            display.textContent = value ? new Date(value).toLocaleDateString() : 'Not set';
        } catch (err) {
            console.error('Failed to update date:', err);
        }
        input.style.display = 'none';
        display.style.display = '';
    },

    _cancelDate(input) {
        setTimeout(() => {
            if (document.activeElement !== input) {
                input.style.display = 'none';
                const container = input.closest('.jdt-date-field');
                container.querySelector('.jdt-date-display').style.display = '';
            }
        }, 150);
    },

    // ========================================
    // Tab 2: Documents
    // ========================================
    renderDocumentsTab(job, phaseId) {
        const esc = apexJobs.escapeHtml;
        const docs = job.documents || [];
        const photos = docs.filter(d => /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(d.name || ''));
        const files = docs.filter(d => !photos.includes(d));

        const fileIcon = (name) => {
            if (/\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(name)) return '<span class="jdt-file-icon jdt-icon-image">&#128247;</span>';
            if (/\.pdf$/i.test(name)) return '<span class="jdt-file-icon jdt-icon-pdf">&#128196;</span>';
            if (/\.(xls|xlsx|csv)$/i.test(name)) return '<span class="jdt-file-icon jdt-icon-excel">&#128200;</span>';
            return '<span class="jdt-file-icon">&#128206;</span>';
        };

        const renderFileRow = (file) => `
            <div class="jdt-file-row">
                ${fileIcon(file.name || '')}
                <span class="jdt-file-name">${esc(file.name || 'Untitled')}</span>
                <span class="jdt-file-size">${esc(file.size || '')}</span>
                <span class="jdt-file-date">${file.uploaded_at ? new Date(file.uploaded_at).toLocaleDateString() : ''}</span>
            </div>
        `;

        const photoSection = photos.length > 0
            ? photos.map(renderFileRow).join('')
            : '<div class="apex-empty-state">No photos uploaded yet</div>';

        const fileSection = files.length > 0
            ? files.map(renderFileRow).join('')
            : '<div class="apex-empty-state">No files uploaded yet</div>';

        return `
            <div class="apex-modal-section">
                <h3 class="apex-section-title">Photos</h3>
                ${photoSection}
            </div>
            <div class="apex-modal-section">
                <h3 class="apex-section-title">Files</h3>
                ${fileSection}
                <button class="jdt-upload-btn" onclick="document.getElementById('jdt-file-upload').click()">+ Upload File</button>
                <input type="file" id="jdt-file-upload" style="display:none" multiple>
            </div>
        `;
    },

    // ========================================
    // Tab 3: Tasks
    // ========================================
    renderTasksTab(job) {
        const esc = apexJobs.escapeHtml;
        const defaultMitTasks = [
            'Equipment Placed',
            'Initial Readings',
            'Daily Monitoring',
            'Final Readings',
            'Equipment Pickup',
            'COS Signed'
        ];

        let tasks = job.tasks || [];
        if (tasks.length === 0) {
            const isMit = (job.phases || []).some(p => p.job_type_code === 'MIT');
            if (isMit) {
                tasks = defaultMitTasks.map(name => ({ name, completed: false, completed_at: null }));
            }
        }

        if (tasks.length === 0) {
            return `
                <div class="apex-modal-section">
                    <h3 class="apex-section-title">Tasks</h3>
                    <div class="apex-empty-state">No tasks defined for this job</div>
                </div>
            `;
        }

        const rows = tasks.map((task, i) => {
            const checked = task.completed ? 'checked' : '';
            const completedClass = task.completed ? ' completed' : '';
            const completedDate = task.completed_at ? new Date(task.completed_at).toLocaleDateString() : '';
            return `
                <div class="apex-task-item${completedClass}">
                    <input type="checkbox" class="jdt-task-check" data-index="${i}" ${checked}
                        onchange="jobDetailTabs._toggleTask(this, '${job.id}', ${i})">
                    <span class="apex-task-name">${esc(task.name)}</span>
                    ${completedDate ? `<span class="jdt-task-completed-date">${esc(completedDate)}</span>` : ''}
                </div>
            `;
        }).join('');

        return `
            <div class="apex-modal-section">
                <h3 class="apex-section-title">Tasks</h3>
                <div class="apex-tasks-container">${rows}</div>
            </div>
        `;
    },

    async _toggleTask(checkbox, jobId, index) {
        const item = checkbox.closest('.apex-task-item');
        if (checkbox.checked) {
            item.classList.add('completed');
        } else {
            item.classList.remove('completed');
        }
    },

    // ========================================
    // Tab 4: Notes
    // ========================================
    renderNotesTab(job, phaseId) {
        const esc = apexJobs.escapeHtml;
        const allNotes = (job.notes || []).filter(n => !phaseId || !n.phase_id || n.phase_id === phaseId);
        const notes = allNotes.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const typeBadgeColors = {
            general: 'rgba(128,128,128,0.3)',
            call: 'rgba(0,170,255,0.3)',
            email: 'rgba(191,90,242,0.3)',
            site_visit: 'rgba(5,255,161,0.3)',
            documentation: 'rgba(255,107,53,0.3)'
        };

        const typeBadgeTextColors = {
            general: '#aaa',
            call: 'var(--neon-blue)',
            email: 'var(--neon-purple)',
            site_visit: 'var(--neon-green)',
            documentation: 'var(--neon-orange)'
        };

        const form = `
            <div class="jdt-note-form-toggle">
                <button class="jdt-add-note-btn" onclick="jobDetailTabs._toggleNoteForm()">+ Add Note</button>
            </div>
            <div class="jdt-note-form" id="jdt-note-form" style="display:none">
                <input type="text" id="jdt-note-subject" class="jdt-input" placeholder="Subject (optional)">
                <select id="jdt-note-type" class="jdt-select">
                    <option value="general">General</option>
                    <option value="call">Phone Call</option>
                    <option value="email">Email</option>
                    <option value="site_visit">Site Visit</option>
                    <option value="documentation">Documentation</option>
                </select>
                <textarea id="jdt-note-content" class="jdt-textarea" placeholder="Note content..." rows="3"></textarea>
                <button class="jdt-submit-btn" onclick="jobDetailTabs._submitNote('${job.id}')">Save Note</button>
            </div>
        `;

        const notesList = notes.length > 0
            ? notes.map(note => {
                const noteType = note.note_type || note.type || 'general';
                const typeColor = typeBadgeColors[noteType] || typeBadgeColors.general;
                const typeText = typeBadgeTextColors[noteType] || typeBadgeTextColors.general;
                const typeLabel = noteType.replace(/_/g, ' ');
                const authorName = note.author_name || note.author || '';
                const canDelete = (window.currentUser?.role === 'management');
                return `
                    <div class="jdt-note-item" style="border-left: 3px solid var(--neon-cyan)">
                        <div class="jdt-note-header">
                            <span class="jdt-note-date" title="${note.created_at ? new Date(note.created_at).toLocaleString() : ''}">${_relativeTime(note.created_at)}</span>
                            ${authorName ? `<span class="jdt-note-author">${esc(authorName)}</span>` : ''}
                            <span class="jdt-note-type-badge" style="background:${typeColor};color:${typeText}">${esc(typeLabel)}</span>
                            ${canDelete ? `<button class="jdt-note-delete" onclick="jobDetailTabs._deleteNote('${job.id}', '${note.id}')" title="Delete note">&times;</button>` : ''}
                        </div>
                        ${note.subject ? `<div class="jdt-note-subject">${esc(note.subject)}</div>` : ''}
                        <div class="jdt-note-content">${esc(note.content || '')}</div>
                    </div>
                `;
            }).join('')
            : '<div class="apex-empty-state">No notes yet</div>';

        return `
            <div class="apex-modal-section">
                <h3 class="apex-section-title">Notes</h3>
                ${form}
                <div class="jdt-notes-list">${notesList}</div>
            </div>
        `;
    },

    _toggleNoteForm() {
        const form = document.getElementById('jdt-note-form');
        if (form) {
            form.style.display = form.style.display === 'none' ? 'block' : 'none';
        }
    },

    async _submitNote(jobId) {
        const subject = document.getElementById('jdt-note-subject')?.value || '';
        const note_type = document.getElementById('jdt-note-type')?.value || 'general';
        const content = document.getElementById('jdt-note-content')?.value || '';
        if (!content.trim()) return;

        const phase_id = window.apexJobs?.selectedPhaseId || null;
        try {
            await api.createApexJobNote(jobId, { subject, note_type, content, phase_id });
            // Refresh notes by re-fetching and re-rendering
            const notes = await api.getApexJobNotes(jobId);
            if (window.apexJobs && window.apexJobs.currentJob) {
                window.apexJobs.currentJob.notes = notes;
                const container = document.getElementById('job-detail-tab-panel');
                if (container) container.innerHTML = jobDetailTabs.renderNotesTab(window.apexJobs.currentJob, phase_id);
            }
        } catch (err) {
            console.error('Failed to create note:', err);
        }
    },

    async _deleteNote(jobId, noteId) {
        if (!confirm('Delete this note?')) return;
        try {
            await api.deleteApexJobNote(jobId, noteId);
            const notes = await api.getApexJobNotes(jobId);
            if (window.apexJobs && window.apexJobs.currentJob) {
                window.apexJobs.currentJob.notes = notes;
                const phaseId = window.apexJobs.selectedPhaseId || null;
                const container = document.getElementById('job-detail-tab-panel');
                if (container) container.innerHTML = jobDetailTabs.renderNotesTab(window.apexJobs.currentJob, phaseId);
            }
        } catch (err) {
            console.error('Failed to delete note:', err);
        }
    },

    // ========================================
    // Tab 5: Expenses
    // ========================================
    renderExpensesTab(job, phaseId) {
        const esc = apexJobs.escapeHtml;
        const fmt = (amount) => `$${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        const phaseFilter = (item) => !phaseId || !item.phase_id || item.phase_id === phaseId;

        const labor = (job.labor || []).filter(phaseFilter);
        const receipts = (job.receipts || []).filter(phaseFilter);
        const workOrders = (job.work_orders || []).filter(phaseFilter);

        const totalLabor = labor.reduce((s, e) => s + (e.hours || 0) * (e.hourly_rate || e.rate || 0), 0);
        const totalReceipts = receipts.reduce((s, r) => s + Number(r.amount || 0), 0);
        const totalWO = workOrders.reduce((s, w) => s + Number(w.budget_amount || w.budget || 0), 0);
        const grandTotal = totalLabor + totalReceipts + totalWO;

        // Summary bar
        const summary = `
            <div class="jdt-expenses-summary">
                <div class="jdt-expense-total">
                    <span class="apex-detail-label">Total Expenses</span>
                    <span class="jdt-expense-amount">${fmt(grandTotal)}</span>
                </div>
                <div class="jdt-expense-breakdown">
                    <span>Labor: ${fmt(totalLabor)}</span>
                    <span>Materials: ${fmt(totalReceipts)}</span>
                    <span>Work Orders: ${fmt(totalWO)}</span>
                </div>
            </div>
        `;

        // Labor section
        const laborCategoryBadge = (cat) => {
            const labels = { demo: 'Demo', drying: 'Drying', cleanup: 'Cleanup', monitoring: 'Monitoring', repair: 'Repair', admin: 'Admin', travel: 'Travel', other: 'Other' };
            return `<span class="jdt-category-badge">${esc(labels[cat] || cat || 'Other')}</span>`;
        };

        const laborRows = labor.length > 0
            ? labor.map(entry => `
                <div class="jdt-expense-row" onclick="jobDetailModals.openLaborEntryModal('${job.id}', ${JSON.stringify(entry).replace(/'/g, '&#39;').replace(/"/g, '&quot;')}, function(){ location.reload(); })">
                    <span class="jdt-expense-icon" style="color: var(--neon-blue)">&#9201;</span>
                    <span class="jdt-expense-desc">${esc(entry.employee_name || '')} - ${entry.hours || 0}h @ ${fmt(entry.hourly_rate || 0)}</span>
                    ${laborCategoryBadge(entry.work_category)}
                    <span class="jdt-expense-amount">${fmt((entry.hours || 0) * (entry.hourly_rate || 0))}</span>
                    <span class="jdt-expense-date">${entry.work_date ? new Date(entry.work_date).toLocaleDateString() : ''}</span>
                </div>
            `).join('')
            : '<div class="apex-empty-state">No labor entries yet</div>';

        const laborSection = `
            <div class="jdt-collapsible-section" data-section="labor">
                <div class="jdt-section-header" onclick="jobDetailTabs._toggleSection(this)">
                    <span class="jdt-section-arrow">&#9660;</span>
                    <h4 class="apex-phase-section-title">Labor</h4>
                    <span class="jdt-section-meta">${labor.length} entries - ${fmt(totalLabor)}</span>
                </div>
                <div class="jdt-section-body">
                    ${laborRows}
                    <button class="jdt-add-btn" onclick="jobDetailModals.openLaborEntryModal('${job.id}', null, function(){ location.reload(); })">+ Log Hours</button>
                </div>
            </div>
        `;

        // Receipts section
        const receiptRows = receipts.length > 0
            ? receipts.map(r => `
                <div class="jdt-expense-row" onclick="jobDetailModals.openReceiptModal('${job.id}', ${JSON.stringify(r).replace(/'/g, '&#39;').replace(/"/g, '&quot;')}, function(){ location.reload(); })">
                    <span class="jdt-expense-icon" style="color: var(--neon-orange)">&#128203;</span>
                    <span class="jdt-expense-desc">${esc(r.description || 'Receipt')}</span>
                    <span class="jdt-category-badge">${esc(r.expense_category || r.category || '')}</span>
                    <span class="jdt-expense-paid">${esc(r.paid_by || '')}</span>
                    ${r.reimbursable ? '<span class="jdt-reimburse-flag">R</span>' : ''}
                    <span class="jdt-expense-amount">${fmt(r.amount)}</span>
                    <span class="jdt-expense-date">${r.expense_date ? new Date(r.expense_date).toLocaleDateString() : ''}</span>
                </div>
            `).join('')
            : '<div class="apex-empty-state">No receipts yet</div>';

        const receiptSection = `
            <div class="jdt-collapsible-section" data-section="receipts">
                <div class="jdt-section-header" onclick="jobDetailTabs._toggleSection(this)">
                    <span class="jdt-section-arrow">&#9660;</span>
                    <h4 class="apex-phase-section-title">Receipts / Materials</h4>
                    <span class="jdt-section-meta">${receipts.length} entries - ${fmt(totalReceipts)}</span>
                </div>
                <div class="jdt-section-body">
                    ${receiptRows}
                    <button class="jdt-add-btn" onclick="jobDetailModals.openReceiptModal('${job.id}', null, function(){ location.reload(); })">+ Add Receipt</button>
                </div>
            </div>
        `;

        // Work Orders section
        const woStatusBadge = (status) => {
            const cls = `phase-status-${status || 'draft'}`;
            const label = (status || 'draft').replace(/_/g, ' ');
            return `<span class="apex-status-badge ${cls}">${apexJobs.escapeHtml(label)}</span>`;
        };

        const woRows = workOrders.length > 0
            ? workOrders.map(wo => `
                <div class="jdt-expense-row" onclick="jobDetailModals.openWorkOrderModal('${job.id}', ${JSON.stringify(wo).replace(/'/g, '&#39;').replace(/"/g, '&quot;')}, function(){ location.reload(); })">
                    <span class="jdt-expense-icon" style="color: var(--neon-purple)">&#128221;</span>
                    <span class="jdt-expense-desc">${esc(wo.wo_number ? 'WO#' + wo.wo_number + ' - ' : '')}${esc(wo.title || 'Work Order')}</span>
                    ${woStatusBadge(wo.status)}
                    <span class="jdt-expense-amount">${fmt(wo.budget_amount || wo.budget)}</span>
                    <span class="jdt-expense-date">${wo.created_at ? new Date(wo.created_at).toLocaleDateString() : ''}</span>
                </div>
            `).join('')
            : '<div class="apex-empty-state">No work orders yet</div>';

        const woSection = `
            <div class="jdt-collapsible-section" data-section="workorders">
                <div class="jdt-section-header" onclick="jobDetailTabs._toggleSection(this)">
                    <span class="jdt-section-arrow">&#9660;</span>
                    <h4 class="apex-phase-section-title">Work Orders</h4>
                    <span class="jdt-section-meta">${workOrders.length} entries - ${fmt(totalWO)}</span>
                </div>
                <div class="jdt-section-body">
                    ${woRows}
                    <button class="jdt-add-btn" onclick="jobDetailModals.openWorkOrderModal('${job.id}', null, function(){ location.reload(); })">+ Create Work Order</button>
                </div>
            </div>
        `;

        return `
            <div class="apex-modal-section">
                <h3 class="apex-section-title">Expenses</h3>
                ${summary}
                ${laborSection}
                ${receiptSection}
                ${woSection}
            </div>
        `;
    },

    _toggleSection(headerEl) {
        const section = headerEl.closest('.jdt-collapsible-section');
        section.classList.toggle('collapsed');
    },

    // ========================================
    // Tab 6: Drying
    // ========================================
    renderDryingTab(job) {
        const isMit = (job.phases || []).some(p => p.job_type_code === 'MIT');

        if (!isMit) {
            return `
                <div class="apex-modal-section">
                    <h3 class="apex-section-title">Structural Drying</h3>
                    <div class="apex-empty-state">Drying monitoring is only available for Mitigation (MIT) phases</div>
                </div>
            `;
        }

        return `
            <div class="apex-modal-section">
                <h3 class="apex-section-title">Structural Drying</h3>

                <div class="apex-phase-section">
                    <h4 class="apex-phase-section-title">Equipment Tracking</h4>
                    <div class="apex-empty-state">No equipment tracked yet. Place equipment to begin monitoring.</div>
                </div>

                <div class="apex-phase-section">
                    <h4 class="apex-phase-section-title">Daily Readings</h4>
                    <div class="apex-empty-state">No daily readings recorded yet.</div>
                </div>

                <div class="apex-phase-section">
                    <h4 class="apex-phase-section-title">Moisture Levels</h4>
                    <div class="apex-empty-state">No moisture level data recorded yet.</div>
                </div>
            </div>
        `;
    }
};

// Dispatch method — maps tab name to individual render function
jobDetailTabs.renderTab = function(tabName, job, phaseId, panel) {
    const renderers = {
        dates:     () => this.renderDatesTab(job),
        documents: () => this.renderDocumentsTab(job, phaseId),
        tasks:     () => this.renderTasksTab(job, phaseId),
        notes:     () => this.renderNotesTab(job, phaseId),
        expenses:  () => this.renderExpensesTab(job, phaseId),
        drying:    () => this.renderDryingTab(job, phaseId)
    };

    const render = renderers[tabName];
    if (render) {
        panel.innerHTML = render();
    } else {
        panel.innerHTML = '<div class="apex-empty-state">Unknown tab</div>';
    }
};

window.jobDetailTabs = jobDetailTabs;
