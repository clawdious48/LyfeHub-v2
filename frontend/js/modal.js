/**
 * Modal functionality for project create/edit with reader/edit views
 * Includes interactive review workflow
 */

const modal = {
    el: null,
    form: null,
    readerView: null,
    confirmEl: null,
    reasonEl: null,
    currentTask: null,
    criteria: [],
    links: [],
    isEditMode: false,
    pendingStatusChange: null,
    
    // Review state tracking
    reviewState: {},
    hasReviewChanges: false,

    init() {
        this.el = document.getElementById('task-modal');
        this.form = document.getElementById('task-form');
        this.readerView = document.getElementById('reader-view');
        this.confirmEl = document.getElementById('confirm-modal');
        this.reasonEl = document.getElementById('reason-modal');
        
        // Configure marked.js
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                breaks: true,
                gfm: true
            });
        }
        
        this.bindEvents();
    },

    bindEvents() {
        // Close modal
        this.el.querySelector('.modal-backdrop').addEventListener('click', () => this.close());
        this.el.querySelector('.modal-close').addEventListener('click', () => this.close());
        this.el.querySelector('.modal-cancel').addEventListener('click', () => this.close());
        
        // Edit mode toggle
        document.getElementById('edit-mode-btn').addEventListener('click', () => this.toggleEditMode());
        
        // Submit review button
        document.getElementById('submit-review-btn').addEventListener('click', () => this.submitReview());
        
        // Confirm modal
        this.confirmEl.querySelector('.modal-backdrop').addEventListener('click', () => this.closeConfirm());
        document.getElementById('confirm-cancel').addEventListener('click', () => this.closeConfirm());
        document.getElementById('confirm-delete').addEventListener('click', () => this.confirmDelete());

        // Reason modal
        this.reasonEl.querySelector('.modal-backdrop').addEventListener('click', () => this.closeReason());
        document.getElementById('reason-cancel').addEventListener('click', () => this.closeReason());
        document.getElementById('reason-submit').addEventListener('click', () => this.submitReason());

        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Delete button
        document.getElementById('delete-task').addEventListener('click', () => this.showConfirm());

        // Criteria list
        document.getElementById('add-criteria').addEventListener('click', () => this.addCriteria());
        document.getElementById('criteria-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addCriteria();
            }
        });

        // Links list
        document.getElementById('add-link').addEventListener('click', () => this.addLink());
        document.getElementById('link-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addLink();
            }
        });

        // Markdown toolbar
        document.querySelectorAll('.markdown-toolbar button').forEach(btn => {
            btn.addEventListener('click', () => this.insertMarkdown(btn.dataset.md));
        });

        // Keyboard shortcuts for markdown
        document.getElementById('task-description').addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'b') {
                    e.preventDefault();
                    this.insertMarkdown('bold');
                } else if (e.key === 'i') {
                    e.preventDefault();
                    this.insertMarkdown('italic');
                }
            }
        });

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.reasonEl.classList.contains('open')) {
                    this.closeReason();
                } else if (this.confirmEl.classList.contains('open')) {
                    this.closeConfirm();
                } else if (this.el.classList.contains('open')) {
                    this.close();
                }
            }
        });
    },

    /**
     * Insert markdown formatting
     */
    insertMarkdown(type) {
        const textarea = document.getElementById('task-description');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selected = text.substring(start, end);
        
        let insertion = '';
        let cursorOffset = 0;
        
        switch (type) {
            case 'bold':
                insertion = `**${selected || 'bold text'}**`;
                cursorOffset = selected ? insertion.length : 2;
                break;
            case 'italic':
                insertion = `*${selected || 'italic text'}*`;
                cursorOffset = selected ? insertion.length : 1;
                break;
            case 'heading':
                insertion = `### ${selected || 'Heading'}`;
                cursorOffset = insertion.length;
                break;
            case 'link':
                insertion = selected ? `[${selected}](url)` : '[link text](url)';
                cursorOffset = selected ? insertion.length - 4 : 1;
                break;
            case 'list':
                insertion = `\n- ${selected || 'List item'}`;
                cursorOffset = insertion.length;
                break;
            case 'code':
                if (selected.includes('\n')) {
                    insertion = `\`\`\`\n${selected}\n\`\`\``;
                } else {
                    insertion = `\`${selected || 'code'}\``;
                }
                cursorOffset = selected ? insertion.length : 1;
                break;
        }
        
        textarea.value = text.substring(0, start) + insertion + text.substring(end);
        textarea.focus();
        
        const newPos = start + cursorOffset;
        textarea.setSelectionRange(newPos, newPos);
    },

    /**
     * Toggle between reader and edit modes
     */
    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        this.updateViewMode();
    },

    /**
     * Update the view based on current mode
     */
    updateViewMode() {
        const editBtn = document.getElementById('edit-mode-btn');
        const submitReviewBtn = document.getElementById('submit-review-btn');
        
        if (this.isEditMode) {
            this.readerView.style.display = 'none';
            this.form.style.display = 'block';
            submitReviewBtn.style.display = 'none';
            editBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                </svg>
            `;
            editBtn.title = 'View project';
        } else {
            this.readerView.style.display = 'block';
            this.form.style.display = 'none';
            editBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            `;
            editBtn.title = 'Edit project';
            this.renderReaderView();
        }
    },

    /**
     * Render markdown content
     */
    renderMarkdown(text) {
        if (!text) return '';
        if (typeof marked !== 'undefined') {
            return marked.parse(text);
        }
        return this.escapeHtml(text).replace(/\n/g, '<br>');
    },

    /**
     * Render the reader view
     */
    renderReaderView() {
        if (!this.currentTask) return;
        
        const task = this.currentTask;
        const isReview = task.status === 'review';
        const isPlanned = task.status === 'planned';
        const isInteractiveReview = isReview || isPlanned; // Both have interactive checklists
        const statusLabels = {
            'planned': 'Planned', 'ready': 'Ready', 'in_progress': 'In Progress',
            'blocked': 'Blocked', 'review': 'Review', 'done': 'Done'
        };
        const priorityLabels = {
            1: 'Critical', 2: 'High', 3: 'Medium', 4: 'Low', 5: 'Someday'
        };
        
        // Status and priority
        const statusEl = document.getElementById('reader-status');
        statusEl.className = `status-badge ${task.status}`;
        statusEl.textContent = statusLabels[task.status] || task.status;
        
        const priorityEl = document.getElementById('reader-priority');
        priorityEl.className = `priority-badge priority-${task.priority || 3}`;
        priorityEl.textContent = priorityLabels[task.priority || 3];
        
        // Description (markdown)
        document.getElementById('reader-description').innerHTML = this.renderMarkdown(task.description);
        
        // Acceptance criteria - interactive when in review
        const criteriaSection = document.getElementById('reader-criteria-section');
        const criteriaList = document.getElementById('reader-criteria');
        
        if (task.acceptance_criteria && task.acceptance_criteria.length > 0) {
            criteriaSection.style.display = 'block';
            
            // Update section title for review mode
            const sectionTitle = criteriaSection.querySelector('h4');
            sectionTitle.textContent = isPlanned ? 'Plan Checklist' : (isReview ? 'Review Checklist' : 'Acceptance Criteria');
            
            if (isInteractiveReview) {
                // Check All button state
                const allChecked = task.acceptance_criteria.every((_, i) => 
                    this.reviewState[i]?.status === 'approved'
                );
                
                // Interactive review mode - criteria first, then Check All button
                criteriaList.innerHTML = task.acceptance_criteria.map((c, index) => {
                    const state = this.reviewState[index] || { status: null, comment: '' };
                    const isApproved = state.status === 'approved';
                    const needsWork = state.status === 'needs_work';
                    const hasComment = state.comment && state.comment.trim();
                    
                    return `
                        <li class="review-criterion ${isApproved ? 'approved' : ''} ${needsWork ? 'needs-work' : ''}" data-index="${index}">
                            <div class="criterion-main">
                                <button type="button" class="criterion-checkbox ${isApproved ? 'checked' : ''}" 
                                        onclick="modal.toggleCriterionApproval(${index})" 
                                        title="Mark as approved">
                                    ${isApproved ? '✓' : ''}
                                </button>
                                <span class="criterion-text">${this.escapeHtml(c)}</span>
                                <button type="button" class="criterion-comment-btn ${hasComment ? 'has-comment' : ''}" 
                                        onclick="modal.toggleCriterionComment(${index})"
                                        title="Add feedback">
                                    💬
                                </button>
                            </div>
                            <div class="criterion-comment-area ${hasComment || needsWork ? 'open' : ''}" id="comment-area-${index}">
                                <textarea placeholder="What needs to change?" 
                                          onchange="modal.updateCriterionComment(${index}, this.value)"
                                          onfocus="modal.expandCommentArea(${index})">${this.escapeHtml(state.comment || '')}</textarea>
                            </div>
                        </li>
                    `;
                }).join('') + `
                    <li class="general-comment-row">
                        <textarea id="review-general-comment" class="general-comment-textarea" 
                                  placeholder="Additional thoughts"></textarea>
                    </li>
                    <li class="check-all-row">
                        <button type="button" class="action-btn check-all-btn ${allChecked ? 'active' : ''}" 
                                onclick="modal.checkAllCriteria()">
                            ${allChecked ? '✓ All Approved' : 'Approve All'}
                        </button>
                    </li>
                `;
            } else {
                // Static display
                criteriaList.innerHTML = task.acceptance_criteria.map(c => 
                    `<li>${this.escapeHtml(c)}</li>`
                ).join('');
            }
        } else {
            criteriaSection.style.display = 'none';
        }
        
        // Links
        const linksSection = document.getElementById('reader-links-section');
        const linksList = document.getElementById('reader-links');
        if (task.context_links && task.context_links.length > 0) {
            linksSection.style.display = 'block';
            linksList.innerHTML = task.context_links.map(url => {
                const display = url.length > 60 ? url.substring(0, 60) + '...' : url;
                return `<li><a href="${this.escapeHtml(url)}" target="_blank" rel="noopener">${this.escapeHtml(display)}</a></li>`;
            }).join('');
        } else {
            linksSection.style.display = 'none';
        }
        
        // Notes
        const notesSection = document.getElementById('reader-notes-section');
        const notesEl = document.getElementById('reader-notes');
        if (task.notes && task.notes.trim()) {
            notesSection.style.display = 'block';
            notesEl.innerHTML = this.renderMarkdown(task.notes);
        } else {
            notesSection.style.display = 'none';
        }
        
        // Meta
        const metaEl = document.getElementById('reader-meta');
        let metaHtml = '';
        if (task.created_at) metaHtml += `<p>Created: ${this.formatDate(task.created_at)}</p>`;
        if (task.updated_at) metaHtml += `<p>Updated: ${this.formatDate(task.updated_at)}</p>`;
        if (task.completed_at) metaHtml += `<p>Completed: ${this.formatDate(task.completed_at)}</p>`;
        if (task.session_id) metaHtml += `<p>Assigned: <span class="session-id">${this.escapeHtml(task.session_id)}</span></p>`;
        metaEl.innerHTML = metaHtml;
        
        // Activity log
        this.renderReaderActivityLog();
        
        // Update submit review button visibility
        this.updateSubmitReviewButton();
    },

    /**
     * Check all criteria as approved
     */
    checkAllCriteria() {
        if (!this.currentTask?.acceptance_criteria) return;
        
        const allChecked = this.currentTask.acceptance_criteria.every((_, i) => 
            this.reviewState[i]?.status === 'approved'
        );
        
        this.currentTask.acceptance_criteria.forEach((_, index) => {
            if (!this.reviewState[index]) {
                this.reviewState[index] = { status: null, comment: '' };
            }
            // Toggle: if all checked, uncheck all; otherwise check all
            this.reviewState[index].status = allChecked ? null : 'approved';
            if (!allChecked) this.reviewState[index].comment = '';
        });
        
        this.hasReviewChanges = true;
        this.renderReaderView();
    },

    /**
     * Toggle criterion approval checkbox
     */
    toggleCriterionApproval(index) {
        if (!this.reviewState[index]) {
            this.reviewState[index] = { status: null, comment: '' };
        }
        
        const current = this.reviewState[index].status;
        
        if (current === 'approved') {
            // Uncheck - back to null
            this.reviewState[index].status = null;
        } else {
            // Check as approved, clear needs_work
            this.reviewState[index].status = 'approved';
            this.reviewState[index].comment = '';
        }
        
        this.hasReviewChanges = true;
        this.renderReaderView();
    },

    /**
     * Toggle criterion comment area visibility
     */
    toggleCriterionComment(index) {
        const area = document.getElementById(`comment-area-${index}`);
        if (area) {
            area.classList.toggle('open');
            if (area.classList.contains('open')) {
                const textarea = area.querySelector('textarea');
                if (textarea) textarea.focus();
            }
        }
    },

    /**
     * Expand comment area when focusing
     */
    expandCommentArea(index) {
        const area = document.getElementById(`comment-area-${index}`);
        if (area) {
            area.classList.add('open');
        }
    },

    /**
     * Update criterion comment
     */
    updateCriterionComment(index, comment) {
        if (!this.reviewState[index]) {
            this.reviewState[index] = { status: null, comment: '' };
        }
        
        this.reviewState[index].comment = comment;
        
        // If there's a comment, mark as needs_work (unless explicitly approved)
        if (comment.trim() && this.reviewState[index].status !== 'approved') {
            this.reviewState[index].status = 'needs_work';
        }
        
        this.hasReviewChanges = true;
        this.updateSubmitReviewButton();
    },

    /**
     * Update submit review button state
     */
    updateSubmitReviewButton() {
        const btn = document.getElementById('submit-review-btn');
        const task = this.currentTask;
        const isInteractiveStatus = task && (task.status === 'review' || task.status === 'planned');
        
        if (!task || !isInteractiveStatus || this.isEditMode) {
            btn.style.display = 'none';
            return;
        }
        
        // Always show button in review/planned mode
        btn.style.display = 'flex';
        
        // Update button text based on status
        const btnText = task.status === 'planned' ? 'Submit Plan Review' : 'Submit Review';
        btn.querySelector('span').textContent = btnText;
        
        // Check if ALL criteria have been reviewed (approved or has comment)
        const allReviewed = task.acceptance_criteria && 
            task.acceptance_criteria.length > 0 &&
            task.acceptance_criteria.every((_, i) => {
                const s = this.reviewState[i];
                return s && (s.status === 'approved' || (s.status === 'needs_work' && s.comment?.trim()));
            });
        
        // Enable/disable based on whether all criteria reviewed
        btn.disabled = !allReviewed;
        btn.classList.toggle('active', allReviewed);
    },

    /**
     * Submit the review (works for both 'review' and 'planned' statuses)
     */
    async submitReview() {
        const btn = document.getElementById('submit-review-btn');
        const task = this.currentTask;
        
        if (!task || !task.acceptance_criteria) return;
        
        const isPlanned = task.status === 'planned';
        const endpoint = isPlanned ? `/tasks/${task.id}/plan-review` : `/tasks/${task.id}/review`;
        const itemLabel = isPlanned ? 'plan item' : 'criterion';
        
        // Build criteria array
        const criteria = [];
        task.acceptance_criteria.forEach((c, index) => {
            const state = this.reviewState[index];
            if (state && (state.status || (state.comment && state.comment.trim()))) {
                criteria.push({
                    index,
                    status: state.status || 'needs_work',
                    comment: state.comment || ''
                });
            }
        });
        
        if (criteria.length === 0) {
            alert(`Please review at least one ${itemLabel}`);
            return;
        }
        
        btn.disabled = true;
        btn.innerHTML = '<span>Submitting...</span>';
        
        // Get optional general comment
        const generalCommentEl = document.getElementById('review-general-comment');
        const generalComment = generalCommentEl ? generalCommentEl.value.trim() : '';
        
        try {
            const result = await api.request(endpoint, {
                method: 'POST',
                body: { criteria, generalComment }
            });
            
            // Show result
            if (result.allApproved) {
                if (isPlanned) {
                    alert(`🎉 Plan approved! Project is now ready for development.`);
                } else {
                    alert(`🎉 All criteria approved! Project complete.`);
                }
            } else {
                alert(`📋 Review submitted!\n✅ Approved: ${result.approved}\n❌ Needs work: ${result.needsWork}`);
            }
            
            this.close();
            kanban.loadTasks();
            
        } catch (err) {
            alert('Failed to submit review: ' + err.message);
        } finally {
            btn.disabled = false;
            const btnText = isPlanned ? 'Submit Plan Review' : 'Submit Review';
            btn.innerHTML = `<span>${btnText}</span>`;
        }
    },

    /**
     * Render activity log in reader view
     */
    renderReaderActivityLog() {
        const container = document.getElementById('reader-activity-log');
        const section = document.getElementById('reader-activity-section');
        
        if (!this.currentTask || !this.currentTask.activity_log || this.currentTask.activity_log.length === 0) {
            section.style.display = 'none';
            return;
        }
        
        section.style.display = 'block';
        const reversed = [...this.currentTask.activity_log].reverse();
        
        container.innerHTML = reversed.map(entry => `
            <div class="log-entry type-${entry.type || 'note'}">
                <span class="log-entry-time">${this.formatLogTime(entry.timestamp)}</span>
                <span class="log-entry-message">${this.escapeHtml(entry.message)}</span>
            </div>
        `).join('');
    },

    /**
     * Open modal for new project (edit mode)
     */
    openNew() {
        this.currentTask = null;
        this.criteria = [];
        this.links = [];
        this.reviewState = {};
        this.hasReviewChanges = false;
        this.isEditMode = true; // New projects open in edit mode
        
        this.el.classList.remove('editing');
        document.getElementById('modal-title').textContent = 'New Project';
        document.getElementById('edit-mode-btn').style.display = 'none';
        document.getElementById('submit-review-btn').style.display = 'none';
        
        this.form.reset();
        document.getElementById('task-status').value = 'planned';
        document.getElementById('task-priority').value = '3';
        document.getElementById('title-form-group').style.display = 'block';
        
        this.renderCriteria();
        this.renderLinks();
        this.renderMeta();
        this.renderActivityLog();
        
        this.readerView.style.display = 'none';
        this.form.style.display = 'block';
        
        this.el.classList.add('open');
        document.getElementById('task-title').focus();
    },

    /**
     * Open modal for existing project (reader mode by default)
     */
    openEdit(task) {
        this.currentTask = task;
        this.criteria = [...(task.acceptance_criteria || [])];
        this.links = [...(task.context_links || [])];
        this.reviewState = {}; // Reset review state for fresh review
        this.hasReviewChanges = false;
        this.isEditMode = false; // Existing projects open in reader mode
        
        this.el.classList.add('editing');
        document.getElementById('modal-title').textContent = task.title || 'Untitled';
        document.getElementById('edit-mode-btn').style.display = 'flex';
        document.getElementById('title-form-group').style.display = 'none';
        
        // Populate form fields for when user switches to edit mode
        document.getElementById('task-title').value = task.title || '';
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-status').value = task.status || 'planned';
        document.getElementById('task-priority').value = String(task.priority || 3);
        document.getElementById('task-notes').value = task.notes || '';
        
        this.renderCriteria();
        this.renderLinks();
        this.renderMeta();
        this.renderActivityLog();
        
        // Show reader view by default
        this.updateViewMode();
        
        this.el.classList.add('open');
    },

    /**
     * Close the modal
     */
    close() {
        this.el.classList.remove('open');
        this.currentTask = null;
        this.reviewState = {};
        this.hasReviewChanges = false;
        this.isEditMode = false;
        
        // Clear general comment textarea
        const generalComment = document.getElementById('review-general-comment');
        if (generalComment) generalComment.value = '';
    },

    /**
     * Show delete confirmation
     */
    showConfirm() {
        this.confirmEl.classList.add('open');
    },

    closeConfirm() {
        this.confirmEl.classList.remove('open');
    },

    /**
     * Show reason modal
     */
    showReasonModal(status, taskId, callback) {
        this.pendingStatusChange = { taskId, status, callback };
        
        const title = document.getElementById('reason-modal-title');
        const label = document.getElementById('reason-modal-label');
        const textarea = document.getElementById('status-reason');
        
        if (status === 'blocked') {
            title.textContent = 'Why is this blocked?';
            label.textContent = 'What\'s blocking progress?';
            textarea.placeholder = 'e.g., Waiting on API credentials...';
        } else if (status === 'review') {
            title.textContent = 'Ready for Review';
            label.textContent = 'What specifically needs to be reviewed?';
            textarea.placeholder = 'e.g., Check the new login flow works, verify mobile styling';
        } else {
            title.textContent = 'Status Update';
            label.textContent = 'Add a note (optional)';
            textarea.placeholder = 'Any context...';
        }
        
        textarea.value = '';
        this.reasonEl.classList.add('open');
        textarea.focus();
    },

    closeReason() {
        this.reasonEl.classList.remove('open');
        this.pendingStatusChange = null;
    },

    async submitReason() {
        if (!this.pendingStatusChange) return;
        
        const reason = document.getElementById('status-reason').value.trim();
        const { taskId, status, callback } = this.pendingStatusChange;
        
        this.closeReason();
        
        if (callback) {
            await callback(taskId, status, reason);
        }
    },

    async confirmDelete() {
        if (!this.currentTask) return;
        
        const btn = document.getElementById('confirm-delete');
        btn.disabled = true;
        btn.textContent = 'Deleting...';
        
        try {
            await api.deleteTask(this.currentTask.id);
            this.closeConfirm();
            this.close();
            kanban.loadTasks();
        } catch (err) {
            alert('Failed to delete: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Delete';
        }
    },

    async handleSubmit(e) {
        e.preventDefault();
        
        const newStatus = document.getElementById('task-status').value;
        const oldStatus = this.currentTask?.status;
        
        if (this.currentTask && newStatus !== oldStatus && (newStatus === 'blocked' || newStatus === 'review')) {
            this.showReasonModal(newStatus, this.currentTask.id, async (taskId, status, reason) => {
                await this.saveTask(reason);
            });
            return;
        }
        
        await this.saveTask();
    },

    async saveTask(statusReason = null) {
        const btn = this.form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Saving...';
        
        const taskData = {
            title: document.getElementById('task-title').value.trim(),
            description: document.getElementById('task-description').value.trim(),
            status: document.getElementById('task-status').value,
            priority: parseInt(document.getElementById('task-priority').value, 10),
            acceptance_criteria: this.criteria,
            context_links: this.links,
            notes: document.getElementById('task-notes').value.trim(),
        };
        
        if (statusReason) {
            taskData.status_reason = statusReason;
        }
        
        try {
            if (this.currentTask) {
                await api.updateTask(this.currentTask.id, taskData);
            } else {
                await api.createTask(taskData);
            }
            this.close();
            kanban.loadTasks();
        } catch (err) {
            alert('Failed to save: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Project';
        }
    },

    addCriteria() {
        const input = document.getElementById('criteria-input');
        const value = input.value.trim();
        if (value) {
            this.criteria.push(value);
            this.renderCriteria();
            input.value = '';
            input.focus();
        }
    },

    removeCriteria(index) {
        this.criteria.splice(index, 1);
        this.renderCriteria();
    },

    renderCriteria() {
        const container = document.getElementById('criteria-list');
        container.innerHTML = this.criteria.map((c, i) => `
            <div class="list-item">
                <span>${this.escapeHtml(c)}</span>
                <button type="button" class="list-item-remove" data-index="${i}">&times;</button>
            </div>
        `).join('');
        
        container.querySelectorAll('.list-item-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                this.removeCriteria(parseInt(btn.dataset.index, 10));
            });
        });
    },

    addLink() {
        const input = document.getElementById('link-input');
        let value = input.value.trim();
        if (value && !value.match(/^https?:\/\//)) {
            value = 'https://' + value;
        }
        if (value && this.isValidUrl(value)) {
            this.links.push(value);
            this.renderLinks();
            input.value = '';
            input.focus();
        } else if (value) {
            alert('Please enter a valid URL');
        }
    },

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch {
            return false;
        }
    },

    removeLink(index) {
        this.links.splice(index, 1);
        this.renderLinks();
    },

    renderLinks() {
        const container = document.getElementById('links-list');
        container.innerHTML = this.links.map((url, i) => {
            const displayUrl = url.length > 50 ? url.substring(0, 50) + '...' : url;
            return `
                <div class="list-item">
                    <a href="${this.escapeHtml(url)}" target="_blank" rel="noopener">${this.escapeHtml(displayUrl)}</a>
                    <button type="button" class="list-item-remove" data-index="${i}">&times;</button>
                </div>
            `;
        }).join('');
        
        container.querySelectorAll('.list-item-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                this.removeLink(parseInt(btn.dataset.index, 10));
            });
        });
    },

    renderMeta() {
        const container = document.getElementById('task-meta');
        if (!this.currentTask) {
            container.innerHTML = '';
            return;
        }
        
        const task = this.currentTask;
        let html = '';
        if (task.created_at) html += `<p>Created: ${this.formatDate(task.created_at)}</p>`;
        if (task.updated_at) html += `<p>Updated: ${this.formatDate(task.updated_at)}</p>`;
        if (task.completed_at) html += `<p>Completed: ${this.formatDate(task.completed_at)}</p>`;
        if (task.session_id) html += `<p>Assigned: <span class="session-id">${this.escapeHtml(task.session_id)}</span></p>`;
        container.innerHTML = html;
    },

    renderActivityLog() {
        const container = document.getElementById('activity-log');
        const section = document.getElementById('activity-log-section');
        
        if (!this.currentTask || !this.currentTask.activity_log || this.currentTask.activity_log.length === 0) {
            section.style.display = 'none';
            return;
        }
        
        section.style.display = 'block';
        const reversed = [...this.currentTask.activity_log].reverse();
        
        container.innerHTML = reversed.map(entry => `
            <div class="log-entry type-${entry.type || 'note'}">
                <span class="log-entry-time">${this.formatLogTime(entry.timestamp)}</span>
                <span class="log-entry-message">${this.escapeHtml(entry.message)}</span>
            </div>
        `).join('');
    },

    formatLogTime(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    },

    formatDate(isoString) {
        return new Date(isoString).toLocaleString();
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
};

document.addEventListener('DOMContentLoaded', () => modal.init());
window.modal = modal;
