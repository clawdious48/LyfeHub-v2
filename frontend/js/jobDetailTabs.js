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
    const roles = user.roles || user.role || [];
    const rolesArr = Array.isArray(roles) ? roles : [roles];
    if (rolesArr.includes('management')) return true;
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

        const renderFileRow = (file) => {
            const isPDF = /\.pdf$/i.test(file.name || '');
            const onClick = isPDF 
                ? `onclick="jobDetailTabs._previewDocument('${esc(file.id)}', '${esc(file.name || 'Document')}')"` 
                : `onclick="jobDetailTabs._downloadDocument('${esc(file.id)}', '${esc(file.name || 'Document')}')"`;
            
            return `
                <div class="jdt-file-row jdt-file-clickable" ${onClick}>
                    ${fileIcon(file.name || '')}
                    <span class="jdt-file-name">${esc(file.name || 'Untitled')}</span>
                    <span class="jdt-file-size">${esc(file.size || '')}</span>
                    <span class="jdt-file-date">${file.uploaded_at ? new Date(file.uploaded_at).toLocaleDateString() : ''}</span>
                    <button class="jdt-file-download" onclick="event.stopPropagation(); jobDetailTabs._downloadDocument('${esc(file.id)}', '${esc(file.name || 'Document')}')" title="Download">⬇</button>
                </div>
            `;
        };

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
                const _delRoles = window.currentUser?.roles || window.currentUser?.role || [];
                const _delArr = Array.isArray(_delRoles) ? _delRoles : [_delRoles];
                const canDelete = _delArr.includes('management');
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
        const canSeeFinancials = typeof userHasRole === 'function' && userHasRole('management', 'office_coordinator', 'estimator');
        const fmt = (amount) => canSeeFinancials ? `$${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—';
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

        // ---- Materials / Consumables section ----
        const materials = (job.materials || []).filter(phaseFilter);
        const totalMaterials = materials.reduce((s, m) => s + (m.quantity || 0) * (m.unit_cost || 0), 0);

        const materialRows = materials.length > 0
            ? materials.map(m => `
                <div class="jdt-expense-row">
                    <span class="jdt-expense-icon" style="color: var(--neon-green)">&#128230;</span>
                    <span class="jdt-expense-desc">${esc(m.item_name || 'Material')}</span>
                    <span class="jdt-category-badge">${esc(m.category || '')}</span>
                    <span class="jdt-expense-desc" style="opacity:0.7">${m.quantity || 0} × ${fmt(m.unit_cost || 0)}</span>
                    <span class="jdt-expense-amount">${fmt((m.quantity || 0) * (m.unit_cost || 0))}</span>
                    <span class="jdt-expense-date">${m.allocated_at ? new Date(m.allocated_at).toLocaleDateString() : ''}</span>
                </div>
            `).join('')
            : '<div class="apex-empty-state">No materials allocated yet</div>';

        const materialSection = `
            <div class="jdt-collapsible-section" data-section="materials">
                <div class="jdt-section-header" onclick="jobDetailTabs._toggleSection(this)">
                    <span class="jdt-section-arrow">&#9660;</span>
                    <h4 class="apex-phase-section-title">Materials / Consumables</h4>
                    <span class="jdt-section-meta">${materials.length} entries - ${fmt(totalMaterials)}</span>
                </div>
                <div class="jdt-section-body">
                    ${materialRows}
                    <button class="jdt-add-btn" onclick="jobDetailTabs._openAddMaterialModal('${job.id}')">+ Add Material</button>
                </div>
            </div>
        `;

        // ---- Subcontractor Invoices section ----
        const subInvoices = (job.sub_invoices || []).filter(phaseFilter);
        const totalSubs = subInvoices.reduce((s, si) => s + Number(si.amount || 0), 0);

        const subStatusBadge = (status) => {
            const colors = { received: 'rgba(0,170,255,0.3)', approved: 'rgba(5,255,161,0.3)', paid: 'rgba(5,255,161,0.5)', pending: 'rgba(255,200,0,0.3)' };
            return `<span class="jdt-category-badge" style="background:${colors[status] || 'rgba(128,128,128,0.3)'}">${esc((status || 'pending').replace(/_/g, ' '))}</span>`;
        };

        const subRows = subInvoices.length > 0
            ? subInvoices.map(si => `
                <div class="jdt-expense-row">
                    <span class="jdt-expense-icon" style="color: var(--neon-purple)">&#128179;</span>
                    <span class="jdt-expense-desc">${esc(si.sub_name || si.organization_name || 'Subcontractor')}</span>
                    ${subStatusBadge(si.status)}
                    <span class="jdt-expense-desc" style="opacity:0.7;font-size:0.75rem">${esc(si.description || '')}</span>
                    <span class="jdt-expense-amount">${fmt(si.amount)}</span>
                    <span class="jdt-expense-date">${si.invoice_date ? new Date(si.invoice_date).toLocaleDateString() : ''}</span>
                </div>
            `).join('')
            : '<div class="apex-empty-state">No sub invoices yet</div>';

        const subSection = `
            <div class="jdt-collapsible-section" data-section="subinvoices">
                <div class="jdt-section-header" onclick="jobDetailTabs._toggleSection(this)">
                    <span class="jdt-section-arrow">&#9660;</span>
                    <h4 class="apex-phase-section-title">Subcontractor Invoices</h4>
                    <span class="jdt-section-meta">${subInvoices.length} entries - ${fmt(totalSubs)}</span>
                </div>
                <div class="jdt-section-body">
                    ${subRows}
                    <button class="jdt-add-btn" onclick="jobDetailTabs._openAddSubInvoiceModal('${job.id}')">+ Add Sub Invoice</button>
                </div>
            </div>
        `;

        // ---- Fuel / Mileage section ----
        const fuel = (job.fuel || []).filter(phaseFilter);
        const totalFuel = fuel.reduce((s, f) => s + Number(f.cost || 0), 0);

        const fuelRows = fuel.length > 0
            ? fuel.map(f => `
                <div class="jdt-expense-row">
                    <span class="jdt-expense-icon" style="color: var(--neon-orange)">&#9981;</span>
                    <span class="jdt-expense-desc">${esc(f.employee_name || '')} - ${esc(f.vehicle || '')}</span>
                    <span class="jdt-expense-desc" style="opacity:0.7;font-size:0.75rem">${f.miles ? f.miles + ' mi' : ''}${f.miles && f.gallons ? ' / ' : ''}${f.gallons ? f.gallons + ' gal' : ''}</span>
                    <span class="jdt-expense-amount">${fmt(f.cost)}</span>
                    <span class="jdt-expense-date">${f.entry_date ? new Date(f.entry_date).toLocaleDateString() : ''}</span>
                </div>
            `).join('')
            : '<div class="apex-empty-state">No fuel entries yet</div>';

        const fuelSection = `
            <div class="jdt-collapsible-section" data-section="fuel">
                <div class="jdt-section-header" onclick="jobDetailTabs._toggleSection(this)">
                    <span class="jdt-section-arrow">&#9660;</span>
                    <h4 class="apex-phase-section-title">Fuel / Mileage</h4>
                    <span class="jdt-section-meta">${fuel.length} entries - ${fmt(totalFuel)}</span>
                </div>
                <div class="jdt-section-body">
                    ${fuelRows}
                    <button class="jdt-add-btn" onclick="jobDetailTabs._openAddFuelModal('${job.id}')">+ Add Fuel Entry</button>
                </div>
            </div>
        `;

        // Update summary to include new categories
        const allExpenses = grandTotal + totalMaterials + totalSubs + totalFuel;

        const fullSummary = `
            <div class="jdt-expenses-summary">
                <div class="jdt-expense-total">
                    <span class="apex-detail-label">Total Expenses</span>
                    <span class="jdt-expense-amount">${fmt(allExpenses)}</span>
                </div>
                <div class="jdt-expense-breakdown">
                    <span>Labor: ${fmt(totalLabor)}</span>
                    <span>Receipts: ${fmt(totalReceipts)}</span>
                    <span>Work Orders: ${fmt(totalWO)}</span>
                    <span>Materials: ${fmt(totalMaterials)}</span>
                    <span>Subs: ${fmt(totalSubs)}</span>
                    <span>Fuel: ${fmt(totalFuel)}</span>
                </div>
            </div>
        `;

        return `
            <div class="apex-modal-section">
                <h3 class="apex-section-title">Expenses</h3>
                ${fullSummary}
                ${laborSection}
                ${receiptSection}
                ${woSection}
                ${materialSection}
                ${subSection}
                ${fuelSection}
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
        setTimeout(() => jobDetailTabs._loadDryingState(job.id), 0);
        return `
            <div class="dry-tab-content" id="drying-tab-content">
                <div class="apex-empty-state">Loading drying log status...</div>
            </div>
        `;
    },

    // Cache for drying data
    _dryingLog: null,
    _dryingChambers: [],
    _dryingRooms: [],
    _dryingVisits: [],
    _dryingRefPoints: [],
    _dryingBaselines: [],

    async _loadDryingState(jobId, force = false) {
        if (!force && apexJobs.activeTab !== 'drying') return;
        const container = document.getElementById('drying-tab-content');
        if (!container) return;

        try {
            const log = await api.getDryingLog(jobId);
            jobDetailTabs._dryingLog = log;

            // State 2: Log exists but setup not complete — show Start Job (resume)
            if (!log.setup_complete) {
                container.innerHTML = jobDetailTabs._renderStartJobButton(jobId);
                return;
            }

            // State 3: Log exists and setup complete — show full view
            const [chambers, rooms, visits, refPoints, baselines, reports] = await Promise.all([
                api.getDryingChambers(jobId),
                api.getDryingRooms(jobId),
                api.getDryingVisits(jobId),
                api.getDryingRefPoints(jobId),
                api.getDryingBaselines(jobId),
                log.locked === 1 ? api.request(`/apex-jobs/${jobId}/drying/reports`).catch(() => []) : Promise.resolve([])
            ]);

            jobDetailTabs._dryingChambers = chambers;
            jobDetailTabs._dryingRooms = rooms;
            jobDetailTabs._dryingVisits = visits;
            jobDetailTabs._dryingRefPoints = refPoints;
            jobDetailTabs._dryingBaselines = baselines;
            jobDetailTabs._dryingReports = reports || [];

            container.innerHTML = jobDetailTabs._renderDryingLogView(log, jobId, visits, refPoints, baselines, chambers);
        } catch (err) {
            if (!force && apexJobs.activeTab !== 'drying') return;
            if (err.message && (err.message.includes('404') || err.message.includes('No drying log'))) {
                // State 1: No log — show Start Job
                container.innerHTML = jobDetailTabs._renderStartJobButton(jobId);
            } else {
                container.innerHTML = `<div class="apex-empty-state">Failed to load drying log. Please try again.</div>`;
                console.error('Failed to load drying state:', err);
            }
        }
    },

    _renderStartJobButton(jobId) {
        return `
            <div class="apex-empty-state">
                <p style="margin-bottom:12px;">Set up drying logs for this job.</p>
                <button class="dry-btn dry-btn-primary" id="start-drying-btn"
                    onclick="jobDetailTabs._startDryingJob('${jobId}')">
                    Start Job
                </button>
            </div>
        `;
    },

    async _startDryingJob(jobId) {
        const btn = document.getElementById('start-drying-btn');
        if (btn) { btn.disabled = true; btn.textContent = 'Starting...'; }

        try {
            await api.createDryingLog(jobId);
        } catch (err) {
            // 409 = log already exists, that's fine
            if (!err.message || (!err.message.includes('409') && !err.message.includes('already exists'))) {
                console.error('Failed to create drying log:', err);
                if (btn) { btn.disabled = false; btn.textContent = 'Start Job'; }
                return;
            }
        }
        dryingSetup.open(jobId);
    },

    _renderDryingLogView(log, jobId, visits, refPoints, baselines, chambers) {
        const esc = dryingUtils.escapeHtml;
        const isLocked = log.locked === 1;
        const statusClass = isLocked ? 'complete' : (log.status === 'active' ? 'in_progress' : 'complete');
        const statusLabel = isLocked ? 'Completed' : (log.status === 'active' ? 'Active' : 'Complete');

        // Check if drying can be completed: all non-demolished ref points dry + no equipment
        const activeRefPoints = refPoints.filter(rp => !rp.demolished_at);
        const allDry = activeRefPoints.length > 0 && activeRefPoints.every(rp => {
            const baseline = baselines.find(b => b.material_code === rp.material_code);
            if (!baseline) return false;
            // Check latest visit for this ref point's reading
            if (visits.length === 0) return false;
            return true; // Detailed check happens with visit data
        });

        const canComplete = !isLocked && log.status === 'active' && visits.length > 0;

        // Visit history
        const viewMode = jobDetailTabs._visitViewMode || 'card';
        const visitCards = visits.slice().map(v => {
            const date = v.visited_at ? new Date(v.visited_at).toLocaleDateString() : '';
            const equipmentCount = jobDetailTabs._getEquipmentCountForVisit(v);
            const equipmentBadge = equipmentCount > 0 ? `<span class="dry-equipment-badge" title="${equipmentCount} pieces of equipment active">${equipmentCount}</span>` : '';
            
            if (viewMode === 'list') {
                return `
                    <div class="dry-visit-list-item" onclick="jobDetailTabs._openVisitReadOnly('${jobId}', '${v.id}')" title="View Visit #${v.visit_number}">
                        <span class="dry-visit-list-num">Visit #${v.visit_number}</span>
                        <span class="dry-visit-list-date">${date}</span>
                        ${equipmentBadge}
                        ${!isLocked ? `<button class="dry-btn dry-btn-sm dry-visit-edit-btn" onclick="event.stopPropagation(); jobDetailTabs._openVisitEdit('${jobId}', '${v.id}')" title="Edit Visit">✏️</button>` : ''}
                    </div>
                `;
            }
            const shortDate = v.visited_at ? new Date(v.visited_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
            return `
                <div class="dry-visit-card" onclick="jobDetailTabs._openVisitReadOnly('${jobId}', '${v.id}')" title="View Visit #${v.visit_number}">
                    <div class="dry-visit-card-num">#${v.visit_number}</div>
                    <div class="dry-visit-card-date">${shortDate}</div>
                    ${equipmentBadge}
                    ${!isLocked ? `<button class="dry-visit-card-edit" onclick="event.stopPropagation(); jobDetailTabs._openVisitEdit('${jobId}', '${v.id}')" title="Edit">✏️</button>` : ''}
                </div>
            `;
        }).join('');

        // Structure summary
        const chamberCount = chambers.length;
        const roomCount = jobDetailTabs._dryingRooms.length;
        const rpCount = activeRefPoints.length;
        const totalRp = refPoints.length;
        const demolishedCount = totalRp - rpCount;

        return `
            <div class="dry-status-bar">
                <span class="apex-status-badge phase-status-${statusClass}">${statusLabel}</span>
                <span class="dry-status-meta">
                    ${chamberCount} chamber${chamberCount !== 1 ? 's' : ''} &middot;
                    ${roomCount} room${roomCount !== 1 ? 's' : ''} &middot;
                    ${rpCount} ref point${rpCount !== 1 ? 's' : ''}${demolishedCount > 0 ? ` (${demolishedCount} demolished)` : ''} &middot;
                    ${visits.length} visit${visits.length !== 1 ? 's' : ''}
                </span>
            </div>

            <div class="dry-action-bar">
                ${!isLocked ? `<button class="dry-btn dry-btn-primary dry-btn-sm${typeof dryingVisit !== 'undefined' && dryingVisit.hasDraft && dryingVisit.hasDraft(jobId) ? ' dry-btn-draft' : ''}" onclick="dryingVisit.open('${jobId}')">
                    ${typeof dryingVisit !== 'undefined' && dryingVisit.hasDraft && dryingVisit.hasDraft(jobId) ? '⏎ Resume Visit' : '+ Add Visit'}
                </button>` : ''}
                ${!isLocked && typeof userHasRole === 'function' && userHasRole('management', 'project_manager', 'office_coordinator') ? `<button class="dry-btn dry-btn-secondary dry-btn-sm" onclick="jobDetailTabs._editDryingSetup('${jobId}')">
                    Edit Job
                </button>` : ''}
                ${!isLocked ? `<button class="dry-btn dry-btn-sm ${canComplete ? 'dry-btn-success' : ''}" id="complete-drying-btn"
                    ${!canComplete ? 'disabled' : ''}
                    onclick="jobDetailTabs._showCompletionWorkflow('${jobId}')"
                    title="${!canComplete ? 'Complete all readings and remove equipment first' : 'Complete drying and lock all data'}">
                    Complete Dry Out
                </button>` : `<div class="dry-completed-badge">
                    🔒 Completed ${log.completed_at ? 'on ' + new Date(log.completed_at).toLocaleDateString() : ''}
                </div>`}
                ${isLocked ? jobDetailTabs._renderReportButtons(jobId) : ''}
                ${isLocked && typeof userHasRole === 'function' && userHasRole('admin', 'developer') ? `<button class="dry-btn dry-btn-secondary dry-btn-sm" onclick="jobDetailTabs._reopenDrying('${jobId}')" title="Reopen for editing">Reopen</button>` : ''}
            </div>

            <div class="dry-visit-list dry-visit-${viewMode}-mode">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                    <h4 class="apex-section-title" style="margin:0;">Visit History</h4>
                    <div class="dry-view-toggle">
                        <button class="dry-btn dry-btn-sm${viewMode === 'list' ? ' dry-btn-active' : ''}" onclick="jobDetailTabs._setVisitView('${jobId}', 'list')" title="List view">☰</button>
                        <button class="dry-btn dry-btn-sm${viewMode === 'card' ? ' dry-btn-active' : ''}" onclick="jobDetailTabs._setVisitView('${jobId}', 'card')" title="Card view">▦</button>
                    </div>
                </div>
                ${visits.length > 0 ? visitCards : '<div class="apex-empty-state">No visits yet. Click "+ Add Visit" to record your first drying visit.</div>'}
            </div>
        `;
    },

    _setVisitView(jobId, mode) {
        jobDetailTabs._visitViewMode = mode;
        jobDetailTabs._loadDryingState(jobId, true);
    },

    async _openVisitReadOnly(jobId, visitId) {
        if (typeof dryingVisit !== 'undefined' && dryingVisit.openReadOnly) {
            dryingVisit.openReadOnly(jobId, visitId);
        }
    },

    async _openVisitEdit(jobId, visitId) {
        if (typeof dryingVisit !== 'undefined' && dryingVisit.openEdit) {
            dryingVisit.openEdit(jobId, visitId);
        }
    },

    async _showCompletionWorkflow(jobId) {
        try {
            // First, check completion status
            const status = await api.request(`/apex-jobs/${jobId}/drying/completion-status`);
            this._showValidationModal(jobId, status);
        } catch (err) {
            console.error('Failed to check completion status:', err);
            alert('Unable to check completion status. Please try again.');
        }
    },

    _showValidationModal(jobId, status) {
        const esc = (str) => String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        
        // Count passing vs failing categories
        const categories = status.validation || {};
        const passing = Object.values(categories).filter(cat => cat.passed).length;
        const total = Object.keys(categories).length;
        const allPass = passing === total;

        let validationRows = '';
        for (const [category, result] of Object.entries(categories)) {
            const icon = result.passed ? '✅' : '❌';
            const statusClass = result.passed ? 'dry-validation-pass' : 'dry-validation-fail';
            const details = result.details || (result.passed ? 'All requirements met' : 'Requirements not met');
            
            validationRows += `
                <div class="dry-validation-row ${statusClass}">
                    <span class="dry-validation-icon">${icon}</span>
                    <div class="dry-validation-content">
                        <div class="dry-validation-category">${esc(category.replace(/_/g, ' ').toUpperCase())}</div>
                        <div class="dry-validation-details">${esc(details)}</div>
                    </div>
                </div>
            `;
        }

        const modal = document.createElement('div');
        modal.className = 'dry-confirm-overlay';
        modal.innerHTML = `
            <div class="dry-confirm-backdrop"></div>
            <div class="dry-confirm-card" style="max-width: 500px; text-align: left;">
                <div class="dry-confirm-icon" style="text-align: center;">${allPass ? '🎉' : '⚠️'}</div>
                <h3 class="dry-confirm-title" style="text-align: center;">${allPass ? 'Ready to Complete!' : 'Completion Check'}</h3>
                <div class="dry-validation-summary" style="text-align: center; margin-bottom: 1rem; font-size: 0.9rem; color: rgba(26,26,46,0.6);">
                    ${passing} of ${total} requirements met
                </div>
                <div class="dry-validation-list" style="margin-bottom: 1.5rem; max-height: 300px; overflow-y: auto;">
                    ${validationRows}
                </div>
                <div class="dry-confirm-actions" style="justify-content: ${allPass ? 'space-between' : 'center'};">
                    <button class="dry-btn dry-btn-secondary dry-confirm-cancel">Cancel</button>
                    ${allPass ? '<button class="dry-btn dry-btn-success" onclick="jobDetailTabs._showCompletionConfirm(\'' + jobId + '\')">Complete & Lock</button>' : ''}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add('visible'));

        const cleanup = () => {
            modal.classList.remove('visible');
            setTimeout(() => modal.remove(), 200);
        };

        modal.querySelector('.dry-confirm-backdrop').addEventListener('click', cleanup);
        modal.querySelector('.dry-confirm-cancel').addEventListener('click', cleanup);
    },

    _showCompletionConfirm(jobId) {
        // Close validation modal first
        document.querySelector('.dry-confirm-overlay')?.remove();

        const modal = document.createElement('div');
        modal.className = 'dry-confirm-overlay';
        modal.innerHTML = `
            <div class="dry-confirm-backdrop"></div>
            <div class="dry-confirm-card">
                <div class="dry-confirm-icon">🔒</div>
                <h3 class="dry-confirm-title">Complete Drying</h3>
                <p class="dry-confirm-message">This will lock all drying log data. Only an admin can reopen it.</p>
                <div class="dry-confirm-actions">
                    <button class="dry-btn dry-btn-secondary dry-confirm-cancel">Cancel</button>
                    <button class="dry-btn dry-btn-success" onclick="jobDetailTabs._confirmComplete('${jobId}')">Complete & Lock</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add('visible'));

        const cleanup = () => {
            modal.classList.remove('visible');
            setTimeout(() => modal.remove(), 200);
        };

        modal.querySelector('.dry-confirm-backdrop').addEventListener('click', cleanup);
        modal.querySelector('.dry-confirm-cancel').addEventListener('click', cleanup);
    },

    async _confirmComplete(jobId) {
        // Close confirmation modal
        document.querySelector('.dry-confirm-overlay')?.remove();

        try {
            await api.request(`/apex-jobs/${jobId}/drying/complete`, { method: 'POST' });
            
            // Show success and refresh
            alert('Drying completed and locked successfully!');
            jobDetailTabs._loadDryingState(jobId, true);
        } catch (err) {
            console.error('Failed to complete drying:', err);
            alert('Failed to complete drying. Please try again.');
        }
    },

    async _reopenDrying(jobId) {
        if (!confirm('Reopen this drying log for editing? This will unlock all data.')) return;
        
        try {
            await api.request(`/api/apex/jobs/${jobId}/drying/reopen`, { method: 'POST' });
            alert('Drying log reopened for editing.');
            jobDetailTabs._loadDryingState(jobId, true);
        } catch (err) {
            console.error('Failed to reopen drying:', err);
            alert('Failed to reopen drying log. Please try again.');
        }
    },

    // ========================================
    // Add Material Modal
    // ========================================
    async _openAddMaterialModal(jobId) {
        let items = [];
        try { items = await api.getInventoryItems(); } catch(e) { console.error(e); }
        if (!Array.isArray(items)) items = items?.items || [];

        const itemOptions = items.map(i =>
            `<option value="${i.id}" data-cost="${i.unit_cost || 0}" data-name="${(i.name || '').replace(/"/g, '&quot;')}" data-category="${i.category || ''}">${i.name} (${i.unit || 'ea'} - $${Number(i.unit_cost || 0).toFixed(2)})</option>`
        ).join('');

        const modal = document.createElement('div');
        modal.className = 'jdt-modal-overlay';
        modal.innerHTML = `
            <div class="jdt-modal">
                <h3>Add Material to Job</h3>
                <div class="jdt-form-group">
                    <label>Item</label>
                    <select id="jdt-mat-item" class="jdt-select">
                        <option value="">Select item...</option>
                        ${itemOptions}
                    </select>
                </div>
                <div class="jdt-form-group">
                    <label>Quantity</label>
                    <input type="number" id="jdt-mat-qty" class="jdt-input" min="0.01" step="0.01" value="1">
                </div>
                <div class="jdt-form-group">
                    <label>Unit Cost Override (optional)</label>
                    <input type="number" id="jdt-mat-cost" class="jdt-input" step="0.01" placeholder="Auto from catalog">
                </div>
                <div class="jdt-modal-actions">
                    <button class="jdt-submit-btn" onclick="jobDetailTabs._submitMaterial('${jobId}')">Add</button>
                    <button class="jdt-cancel-btn" onclick="this.closest('.jdt-modal-overlay').remove()">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Auto-fill cost from selected item
        modal.querySelector('#jdt-mat-item').addEventListener('change', (e) => {
            const opt = e.target.selectedOptions[0];
            if (opt) {
                const costInput = modal.querySelector('#jdt-mat-cost');
                costInput.placeholder = `$${opt.dataset.cost || 0}`;
            }
        });
    },

    async _submitMaterial(jobId) {
        const select = document.getElementById('jdt-mat-item');
        const opt = select?.selectedOptions[0];
        if (!opt || !opt.value) return;

        const data = {
            item_id: opt.value,
            item_name: opt.dataset.name,
            category: opt.dataset.category,
            quantity: parseFloat(document.getElementById('jdt-mat-qty')?.value || 1),
            unit_cost: parseFloat(document.getElementById('jdt-mat-cost')?.value) || parseFloat(opt.dataset.cost || 0),
            phase_id: window.apexJobs?.selectedPhaseId || null
        };

        try {
            await api.createJobMaterial(jobId, data);
            document.querySelector('.jdt-modal-overlay')?.remove();
            // Refresh
            const materials = await api.getJobMaterials(jobId);
            if (window.apexJobs?.currentJob) {
                window.apexJobs.currentJob.materials = materials;
                const panel = document.getElementById('job-detail-tab-panel');
                if (panel) panel.innerHTML = jobDetailTabs.renderExpensesTab(window.apexJobs.currentJob, window.apexJobs.selectedPhaseId);
                apexJobs.refreshSidebarData();
            }
        } catch(e) { console.error('Failed to add material:', e); }
    },

    // ========================================
    // Add Sub Invoice Modal
    // ========================================
    async _openAddSubInvoiceModal(jobId) {
        const modal = document.createElement('div');
        modal.className = 'jdt-modal-overlay';
        modal.innerHTML = `
            <div class="jdt-modal">
                <h3>Add Subcontractor Invoice</h3>
                <div class="jdt-form-group">
                    <label>Sub Name / Organization</label>
                    <input type="text" id="jdt-sub-name" class="jdt-input" placeholder="e.g. ABC Plumbing">
                </div>
                <div class="jdt-form-group">
                    <label>Description</label>
                    <input type="text" id="jdt-sub-desc" class="jdt-input" placeholder="Work performed">
                </div>
                <div class="jdt-form-group">
                    <label>Amount</label>
                    <input type="number" id="jdt-sub-amount" class="jdt-input" step="0.01" min="0">
                </div>
                <div class="jdt-form-group">
                    <label>Invoice Date</label>
                    <input type="date" id="jdt-sub-date" class="jdt-input" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="jdt-form-group">
                    <label>Status</label>
                    <select id="jdt-sub-status" class="jdt-select">
                        <option value="received">Received</option>
                        <option value="approved">Approved</option>
                        <option value="paid">Paid</option>
                    </select>
                </div>
                <div class="jdt-form-group">
                    <label>Invoice # (optional)</label>
                    <input type="text" id="jdt-sub-number" class="jdt-input" placeholder="INV-001">
                </div>
                <div class="jdt-modal-actions">
                    <button class="jdt-submit-btn" onclick="jobDetailTabs._submitSubInvoice('${jobId}')">Add</button>
                    <button class="jdt-cancel-btn" onclick="this.closest('.jdt-modal-overlay').remove()">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    async _submitSubInvoice(jobId) {
        const data = {
            sub_name: document.getElementById('jdt-sub-name')?.value || '',
            description: document.getElementById('jdt-sub-desc')?.value || '',
            amount: parseFloat(document.getElementById('jdt-sub-amount')?.value || 0),
            invoice_date: document.getElementById('jdt-sub-date')?.value || null,
            status: document.getElementById('jdt-sub-status')?.value || 'received',
            invoice_number: document.getElementById('jdt-sub-number')?.value || '',
            phase_id: window.apexJobs?.selectedPhaseId || null
        };
        if (!data.sub_name || !data.amount) return;

        try {
            await api.createJobSubInvoice(jobId, data);
            document.querySelector('.jdt-modal-overlay')?.remove();
            const subInvoices = await api.getJobSubInvoices(jobId);
            if (window.apexJobs?.currentJob) {
                window.apexJobs.currentJob.sub_invoices = subInvoices;
                const panel = document.getElementById('job-detail-tab-panel');
                if (panel) panel.innerHTML = jobDetailTabs.renderExpensesTab(window.apexJobs.currentJob, window.apexJobs.selectedPhaseId);
                apexJobs.refreshSidebarData();
            }
        } catch(e) { console.error('Failed to add sub invoice:', e); }
    },

    // ========================================
    // Add Fuel Entry Modal
    // ========================================
    _openAddFuelModal(jobId) {
        const modal = document.createElement('div');
        modal.className = 'jdt-modal-overlay';
        modal.innerHTML = `
            <div class="jdt-modal">
                <h3>Add Fuel / Mileage Entry</h3>
                <div class="jdt-form-group">
                    <label>Employee</label>
                    <input type="text" id="jdt-fuel-employee" class="jdt-input" placeholder="Employee name">
                </div>
                <div class="jdt-form-group">
                    <label>Vehicle</label>
                    <input type="text" id="jdt-fuel-vehicle" class="jdt-input" placeholder="e.g. White F-150">
                </div>
                <div class="jdt-form-group">
                    <label>Date</label>
                    <input type="date" id="jdt-fuel-date" class="jdt-input" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div style="display:flex;gap:8px">
                    <div class="jdt-form-group" style="flex:1">
                        <label>Miles</label>
                        <input type="number" id="jdt-fuel-miles" class="jdt-input" step="0.1" min="0">
                    </div>
                    <div class="jdt-form-group" style="flex:1">
                        <label>Gallons</label>
                        <input type="number" id="jdt-fuel-gallons" class="jdt-input" step="0.01" min="0">
                    </div>
                </div>
                <div class="jdt-form-group">
                    <label>Cost ($)</label>
                    <input type="number" id="jdt-fuel-cost" class="jdt-input" step="0.01" min="0">
                </div>
                <div class="jdt-modal-actions">
                    <button class="jdt-submit-btn" onclick="jobDetailTabs._submitFuel('${jobId}')">Add</button>
                    <button class="jdt-cancel-btn" onclick="this.closest('.jdt-modal-overlay').remove()">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    async _submitFuel(jobId) {
        const data = {
            employee_name: document.getElementById('jdt-fuel-employee')?.value || '',
            vehicle: document.getElementById('jdt-fuel-vehicle')?.value || '',
            entry_date: document.getElementById('jdt-fuel-date')?.value || null,
            miles: parseFloat(document.getElementById('jdt-fuel-miles')?.value) || null,
            gallons: parseFloat(document.getElementById('jdt-fuel-gallons')?.value) || null,
            cost: parseFloat(document.getElementById('jdt-fuel-cost')?.value || 0),
            phase_id: window.apexJobs?.selectedPhaseId || null
        };
        if (!data.cost) return;

        try {
            await api.createJobFuel(jobId, data);
            document.querySelector('.jdt-modal-overlay')?.remove();
            const fuel = await api.getJobFuel(jobId);
            if (window.apexJobs?.currentJob) {
                window.apexJobs.currentJob.fuel = fuel;
                const panel = document.getElementById('job-detail-tab-panel');
                if (panel) panel.innerHTML = jobDetailTabs.renderExpensesTab(window.apexJobs.currentJob, window.apexJobs.selectedPhaseId);
                apexJobs.refreshSidebarData();
            }
        } catch(e) { console.error('Failed to add fuel entry:', e); }
    },

    async _editDryingSetup(jobId) {
        try {
            await api.updateDryingLog(jobId, { setup_complete: 0 });
            dryingSetup.open(jobId);
        } catch (err) {
            console.error('Failed to reopen setup:', err);
        }
    },

    // ========================================
    // Report Generation
    // ========================================
    
    async _generateReport(jobId) {
        const btn = document.getElementById(`generate-report-btn-${jobId}`);
        const btnText = btn?.querySelector('.btn-text');
        const spinner = btn?.querySelector('.btn-spinner');
        
        if (!btn) return;
        
        // Show loading state
        btn.disabled = true;
        if (btnText) btnText.style.display = 'none';
        if (spinner) spinner.style.display = 'inline-block';
        
        try {
            const response = await api.request(`/apex-jobs/${jobId}/drying/generate-report`, { method: 'POST' });
            
            // Show success message
            if (window.showToast) {
                window.showToast('Report generated successfully! Check the Documents tab.', 'success');
            } else {
                alert('Report generated successfully! Check the Documents tab.');
            }
            
            // Update button to show regenerate option
            jobDetailTabs._updateReportButton(jobId, response);
            
        } catch (err) {
            console.error('Failed to generate report:', err);
            if (window.showToast) {
                window.showToast(err.message || 'Failed to generate report', 'error');
            } else {
                alert('Failed to generate report: ' + (err.message || 'Unknown error'));
            }
        } finally {
            // Reset button state
            btn.disabled = false;
            if (btnText) btnText.style.display = 'inline';
            if (spinner) spinner.style.display = 'none';
        }
    },

    _updateReportButton(jobId, reportData) {
        const btn = document.getElementById(`generate-report-btn-${jobId}`);
        if (!btn) return;
        
        // Replace button with view/regenerate options
        const actionBar = btn.parentElement;
        const reportButtons = document.createElement('div');
        reportButtons.className = 'dry-report-actions';
        reportButtons.innerHTML = `
            <button class="dry-btn dry-btn-secondary dry-btn-sm" onclick="jobDetailTabs._viewReport('${reportData.id || reportData.document_id}')" title="View generated report">
                📄 View Report
            </button>
            <button class="dry-btn dry-btn-primary dry-btn-sm" onclick="jobDetailTabs._generateReport('${jobId}')" title="Generate new report">
                🔄 Regenerate
            </button>
        `;
        
        actionBar.replaceChild(reportButtons, btn);
    },

    _renderReportButtons(jobId) {
        const reports = jobDetailTabs._dryingReports || [];
        const hasReports = reports.length > 0;
        
        if (hasReports) {
            const latestReport = reports[0]; // Reports are sorted by generated_at DESC
            return `
                <div class="dry-report-actions">
                    <button class="dry-btn dry-btn-secondary dry-btn-sm" onclick="jobDetailTabs._viewReport('${jobId}', '${latestReport.id}')" title="View generated report">
                        📄 View Report
                    </button>
                    <button class="dry-btn dry-btn-primary dry-btn-sm" onclick="jobDetailTabs._generateReport('${jobId}')" title="Generate new report">
                        🔄 Regenerate
                    </button>
                </div>
            `;
        } else {
            return `
                <button class="dry-btn dry-btn-primary dry-btn-sm" id="generate-report-btn-${jobId}" onclick="jobDetailTabs._generateReport('${jobId}')" title="Generate drying report PDF">
                    <span class="btn-text">📄 Generate Report</span>
                    <span class="btn-spinner" style="display:none"></span>
                </button>
            `;
        }
    },

    _viewReport(jobId, reportId) {
        // Open report for download
        window.open(`/api/apex-jobs/${jobId}/drying/reports/${reportId}/download`, '_blank');
    },

    /**
     * Get equipment count active during a visit
     * @param {Object} visit - Visit object with visited_at timestamp
     * @returns {number} Count of equipment pieces active during this visit
     */
    _getEquipmentCountForVisit(visit) {
        // For now, return 0 as equipment placement tracking is not fully implemented yet
        // In production, this would query equipment placements and count active equipment
        // during this visit's timeframe
        
        // Placeholder logic: count equipment from legacy visit data if available
        if (visit.equipment && Array.isArray(visit.equipment)) {
            return visit.equipment.reduce((count, eq) => count + (eq.quantity || 0), 0);
        }
        
        // When the equipment placement API is available, use:
        // const visitTime = new Date(visit.visited_at);
        // return this._dryingEquipmentPlacements?.filter(eq => {
        //     const placedDate = new Date(eq.placed_at);
        //     const removedDate = eq.removed_at ? new Date(eq.removed_at) : null;
        //     return placedDate <= visitTime && (!removedDate || removedDate > visitTime);
        // }).length || 0;
        
        return 0;
    },

    // ========================================
    // Document Preview & Download
    // ========================================
    
    _previewDocument(docId, docName) {
        if (typeof documentViewer !== 'undefined') {
            documentViewer.open(docId, docName);
        } else {
            // Fallback to download if documentViewer not available
            this._downloadDocument(docId, docName);
        }
    },

    _downloadDocument(docId, docName) {
        const link = document.createElement('a');
        link.href = `/api/documents/${docId}/download`;
        link.download = docName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
