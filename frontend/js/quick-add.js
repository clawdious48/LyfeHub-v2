/**
 * Quick Add Modal
 * Minimal capture modal with expandable options
 */

const quickAdd = {
    overlay: null,
    modal: null,
    input: null,
    saveBtn: null,
    moreBtn: null,
    expandedSection: null,
    currentType: 'task',
    isExpanded: false,
    lists: [],
    selectedPriority: 'medium',
    selectedListId: null,

    init() {
        this.createElements();
        this.bindEvents();
        this.loadLists();
    },

    createElements() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'quick-add-overlay';
        this.overlay.innerHTML = `
            <div class="quick-add-modal">
                <div class="quick-add-header">
                    <h3 class="quick-add-title">Quick Add Task</h3>
                    <button class="quick-add-close">&times;</button>
                </div>
                <div class="quick-add-type-toggle">
                    <button type="button" class="quick-add-type-btn active" data-type="task">Task</button>
                    <button type="button" class="quick-add-type-btn" data-type="event">Event</button>
                </div>
                <input type="text" class="quick-add-input" placeholder="What do you need to do?" autocomplete="off">
                <div class="quick-add-actions">
                    <button class="quick-add-more">
                        More options
                        <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
                    </button>
                    <button class="quick-add-save" disabled>Save</button>
                </div>
                <div class="quick-add-expanded">
                    <div class="quick-add-row">
                        <div class="quick-add-field">
                            <label>Due Date</label>
                            <input type="date" id="quick-add-date">
                        </div>
                        <div class="quick-add-field">
                            <label>Time</label>
                            <input type="time" id="quick-add-time">
                        </div>
                    </div>
                    <div class="quick-add-field">
                        <label>Priority</label>
                        <div class="quick-add-priority-group">
                            <button type="button" class="priority-btn" data-priority="low">Low</button>
                            <button type="button" class="priority-btn active" data-priority="medium">Medium</button>
                            <button type="button" class="priority-btn" data-priority="high">High</button>
                        </div>
                    </div>
                    <div class="quick-add-field">
                        <label>List</label>
                        <select id="quick-add-list" class="quick-add-list-selector">
                            <option value="">No list</option>
                        </select>
                    </div>
                    <div class="quick-add-field">
                        <label>Description</label>
                        <textarea id="quick-add-description" placeholder="Add details..."></textarea>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);

        // Cache elements
        this.modal = this.overlay.querySelector('.quick-add-modal');
        this.input = this.overlay.querySelector('.quick-add-input');
        this.saveBtn = this.overlay.querySelector('.quick-add-save');
        this.moreBtn = this.overlay.querySelector('.quick-add-more');
        this.expandedSection = this.overlay.querySelector('.quick-add-expanded');

        // Create toast
        this.toast = document.createElement('div');
        this.toast.className = 'quick-add-toast';
        document.body.appendChild(this.toast);
    },

    bindEvents() {
        // Close button
        this.overlay.querySelector('.quick-add-close').addEventListener('click', () => this.close());

        // Backdrop click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });

        // Input handling
        this.input.addEventListener('input', () => {
            this.saveBtn.disabled = !this.input.value.trim();
        });

        // Enter to save
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && this.input.value.trim()) {
                e.preventDefault();
                this.save();
            }
            if (e.key === 'Escape') {
                this.close();
            }
        });

        // More options toggle
        this.moreBtn.addEventListener('click', () => this.toggleExpanded());

        // Save button
        this.saveBtn.addEventListener('click', () => this.save());

        // Type toggle (Task / Event)
        this.overlay.querySelectorAll('.quick-add-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                if (type === 'event') {
                    this.close();
                    if (typeof eventModal !== 'undefined') {
                        const today = new Date().toISOString().split('T')[0];
                        eventModal.open({ date: today });
                    }
                    return;
                }
                // Reset active state
                this.overlay.querySelectorAll('.quick-add-type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentType = type;
            });
        });

        // Priority buttons
        this.expandedSection.querySelectorAll('.priority-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.expandedSection.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedPriority = btn.dataset.priority;
            });
        });
    },

    async loadLists() {
        try {
            const response = await fetch('/api/task-lists', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                this.lists = data.lists || [];
                this.renderListOptions();
            }
        } catch (err) {
            console.error('Failed to load lists:', err);
        }
    },

    renderListOptions() {
        const select = this.overlay.querySelector('#quick-add-list');
        if (!select) return;

        select.innerHTML = '<option value="">No list</option>' +
            this.lists.map(list => 
                `<option value="${list.id}">${this.escapeHtml(list.name)}</option>`
            ).join('');
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    open(type = 'task') {
        // If event type, delegate to eventModal directly
        if (type === 'event') {
            if (typeof eventModal !== 'undefined') {
                const today = new Date().toISOString().split('T')[0];
                eventModal.open({ date: today });
            }
            return;
        }

        this.currentType = type;
        
        // Update title based on type
        const titles = {
            task: 'Quick Add Task',
            note: 'Quick Add Note',
            job: 'Quick Add Job'
        };
        this.overlay.querySelector('.quick-add-title').textContent = titles[type] || 'Quick Add';

        // Update placeholder
        const placeholders = {
            task: 'What do you need to do?',
            note: 'What\'s on your mind?',
            job: 'Client name or job title...'
        };
        this.input.placeholder = placeholders[type] || 'Enter title...';

        // Reset form
        this.reset();

        // Show modal
        this.overlay.classList.add('visible');
        
        // Focus input after animation
        setTimeout(() => this.input.focus(), 300);
    },

    close() {
        this.overlay.classList.remove('visible');
        this.reset();
    },

    reset() {
        this.input.value = '';
        this.saveBtn.disabled = true;
        this.isExpanded = false;
        this.expandedSection.classList.remove('visible');
        this.moreBtn.classList.remove('expanded');
        this.selectedPriority = 'medium';
        
        // Reset expanded form
        const dateInput = this.overlay.querySelector('#quick-add-date');
        const timeInput = this.overlay.querySelector('#quick-add-time');
        const listSelect = this.overlay.querySelector('#quick-add-list');
        const descInput = this.overlay.querySelector('#quick-add-description');
        
        if (dateInput) dateInput.value = '';
        if (timeInput) timeInput.value = '';
        if (listSelect) listSelect.value = '';
        if (descInput) descInput.value = '';

        // Reset priority buttons
        this.expandedSection.querySelectorAll('.priority-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.priority === 'medium');
        });
    },

    toggleExpanded() {
        this.isExpanded = !this.isExpanded;
        this.expandedSection.classList.toggle('visible', this.isExpanded);
        this.moreBtn.classList.toggle('expanded', this.isExpanded);
    },

    async save() {
        const title = this.input.value.trim();
        if (!title) return;

        this.saveBtn.disabled = true;
        this.saveBtn.textContent = 'Saving...';

        try {
            if (this.currentType === 'task') {
                await this.saveTask(title);
            } else if (this.currentType === 'note') {
                await this.saveNote(title);
            } else if (this.currentType === 'job') {
                await this.saveJob(title);
            }

            this.close();
            this.showToast(`${this.capitalize(this.currentType)} created!`);

            // Refresh tasks view if visible
            if (typeof taskModal !== 'undefined' && taskModal.loadTasks) {
                taskModal.loadTasks();
                taskModal.loadCounts();
            }

        } catch (err) {
            console.error('Failed to save:', err);
            this.showToast('Failed to save. Try again.');
        } finally {
            this.saveBtn.disabled = false;
            this.saveBtn.textContent = 'Save';
        }
    },

    async saveTask(title) {
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        
        // Get expanded form values if expanded
        const dateInput = this.overlay.querySelector('#quick-add-date');
        const timeInput = this.overlay.querySelector('#quick-add-time');
        const listSelect = this.overlay.querySelector('#quick-add-list');
        const descInput = this.overlay.querySelector('#quick-add-description');

        const taskData = {
            title: title,
            description: this.isExpanded && descInput ? descInput.value : '',
            due_date: this.isExpanded && dateInput && dateInput.value ? dateInput.value : today,
            due_time: this.isExpanded && timeInput ? timeInput.value || null : null,
            priority: this.selectedPriority,
            list_id: this.isExpanded && listSelect && listSelect.value ? listSelect.value : null,
            important: false,
            completed: false,
            subtasks: [],
            recurring: null,
            recurring_days: [],
            calendar_ids: [],
            project_id: null,
            people_ids: [],
            note_ids: [],
            energy: null,
            location: null
        };

        const response = await fetch('/api/task-items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(taskData)
        });

        if (!response.ok) {
            throw new Error('Failed to create task');
        }

        return response.json();
    },

    async saveNote(title) {
        // For now, just show a toast - notes feature may not be implemented yet
        this.showToast('Notes coming soon!');
        throw new Error('Not implemented');
    },

    async saveJob(title) {
        // For now, just show a toast - would integrate with apex-jobs
        this.showToast('Use Apex Jobs tab to create jobs');
        throw new Error('Not implemented');
    },

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    showToast(message) {
        this.toast.textContent = message;
        this.toast.classList.add('visible');
        
        setTimeout(() => {
            this.toast.classList.remove('visible');
        }, 3000);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => quickAdd.init());
