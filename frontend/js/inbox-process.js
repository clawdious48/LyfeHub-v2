/**
 * Inbox Processing Modal
 * Lightweight triage modal for unprocessed inbox items.
 * Shows contextual fields based on item type (task/note/person).
 */
const InboxProcessor = {
    overlay: null,
    currentItem: null,
    currentType: null,
    lists: [],
    projects: [],

    init() {
        this.createElements();
        this.bindGlobalEvents();
        this.preloadDropdownData();
    },

    createElements() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'process-overlay';
        this.overlay.innerHTML = `
            <div class="process-modal">
                <div class="process-modal-header">
                    <div class="process-modal-type">
                        <div class="process-modal-type-icon" id="process-type-icon"></div>
                        <span class="process-modal-type-label" id="process-type-label"></span>
                    </div>
                    <button class="process-modal-close" id="process-close">&times;</button>
                </div>
                <div class="process-modal-title" id="process-title"></div>
                
                <div class="process-quick-actions" id="process-quick-actions"></div>
                
                <div class="process-modal-fields" id="process-fields"></div>
                
                <div class="process-modal-actions">
                    <button class="process-btn process-btn-danger" id="process-delete">🗑️ Delete</button>
                    <button class="process-btn process-btn-primary" id="process-save">✅ Process</button>
                </div>
            </div>
        `;
        document.body.appendChild(this.overlay);
    },

    bindGlobalEvents() {
        // Close on backdrop click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });

        // Close button
        this.overlay.querySelector('#process-close').addEventListener('click', () => this.close());

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay.classList.contains('visible')) {
                this.close();
            }
        });

        // Save button
        this.overlay.querySelector('#process-save').addEventListener('click', () => this.save());

        // Delete button
        this.overlay.querySelector('#process-delete').addEventListener('click', () => this.deleteItem());
    },

    async preloadDropdownData() {
        try {
            const [listsRes, projectsRes] = await Promise.all([
                fetch('/api/task-lists', { credentials: 'include' }).then(r => r.ok ? r.json() : { lists: [] }),
                fetch('/api/bases/core/core-projects/records', { credentials: 'include' }).then(r => r.ok ? r.json() : { records: [] }).catch(() => ({ records: [] }))
            ]);
            this.lists = listsRes.lists || listsRes || [];
            this.projects = projectsRes.records || [];
        } catch (err) {
            console.error('Failed to preload dropdown data:', err);
        }
    },

    async open(id, type) {
        this.currentType = type;

        // Fetch full item data
        try {
            let url;
            if (type === 'task') url = `/api/task-items/${id}`;
            else if (type === 'note') url = `/api/bases/core/core-notes/records/${id}`;
            else if (type === 'person') url = `/api/people/${id}`;

            const res = await fetch(url, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch item');
            const data = await res.json();
            this.currentItem = data.item || data.record || data;
            this.currentItem._id = id;
            this.currentItem._type = type;
        } catch (err) {
            console.error('Failed to open item:', err);
            return;
        }

        this.render();
        this.overlay.classList.add('visible');
    },

    close() {
        this.overlay.classList.remove('visible');
        this.currentItem = null;
        this.currentType = null;
    },

    render() {
        const typeIcons = { task: '✓', note: '📝', person: '👤' };
        const typeLabels = { task: 'Task', note: 'Note', person: 'Person' };
        const typeIconClasses = { task: 'type-task', note: 'type-note', person: 'type-person' };

        const iconEl = this.overlay.querySelector('#process-type-icon');
        iconEl.textContent = typeIcons[this.currentType] || '📥';
        iconEl.className = 'process-modal-type-icon inbox-item-icon ' + (typeIconClasses[this.currentType] || '');

        this.overlay.querySelector('#process-type-label').textContent = typeLabels[this.currentType] || 'Item';
        this.overlay.querySelector('#process-title').textContent = this.currentItem.title || this.currentItem.name || 'Untitled';

        // Render quick actions (type-specific)
        this.renderQuickActions();

        // Render fields (type-specific)
        this.renderFields();
    },

    renderQuickActions() {
        const container = this.overlay.querySelector('#process-quick-actions');
        let html = '';

        if (this.currentType === 'task') {
            html = `
                <button class="process-quick-btn" data-action="do_next">📌 Do Next</button>
                <button class="process-quick-btn" data-action="snooze">⏰ Snooze</button>
                <button class="process-quick-btn" data-action="someday">💭 Someday</button>
                <button class="process-quick-btn" data-action="my_day">☀️ My Day</button>
            `;
        }

        container.innerHTML = html;

        // Bind quick action buttons
        container.querySelectorAll('.process-quick-btn').forEach(btn => {
            btn.addEventListener('click', () => this.quickAction(btn.dataset.action));
        });
    },

    renderFields() {
        const container = this.overlay.querySelector('#process-fields');
        let html = '';

        if (this.currentType === 'task') {
            html = this.renderTaskFields();
        } else if (this.currentType === 'note') {
            html = this.renderNoteFields();
        } else if (this.currentType === 'person') {
            html = this.renderPersonFields();
        }

        container.innerHTML = html;
    },

    renderTaskFields() {
        const item = this.currentItem;
        const listOptions = this.lists.map(l =>
            `<option value="${l.id}" ${l.id === item.list_id ? 'selected' : ''}>${this.esc(l.name)}</option>`
        ).join('');

        const projectOptions = this.projects.map(p =>
            `<option value="${p.id}" ${p.id === item.project_id ? 'selected' : ''}>${this.esc(p.values?.name || p.name || 'Untitled')}</option>`
        ).join('');

        return `
            <div class="process-field">
                <label>Due Date</label>
                <input type="date" id="process-due-date" value="${item.due_date || ''}">
            </div>
            <div class="process-field">
                <label>Priority</label>
                <div class="process-priority-group">
                    <button type="button" class="process-priority-btn ${item.priority === 'low' ? 'active' : ''}" data-priority="low">Low</button>
                    <button type="button" class="process-priority-btn ${(!item.priority || item.priority === 'medium') ? 'active' : ''}" data-priority="medium">Medium</button>
                    <button type="button" class="process-priority-btn ${item.priority === 'high' ? 'active' : ''}" data-priority="high">High</button>
                </div>
            </div>
            <div class="process-field">
                <label>List</label>
                <select id="process-list">
                    <option value="">No list</option>
                    ${listOptions}
                </select>
            </div>
            <div class="process-field">
                <label>Project</label>
                <select id="process-project">
                    <option value="">No project</option>
                    ${projectOptions}
                </select>
            </div>
        `;
    },

    renderNoteFields() {
        const item = this.currentItem;
        const noteTypes = ['Journal', 'Meeting', 'Web Clip', 'Reference', 'Idea', 'Plan', 'Voice Note', 'Daily', 'Quote'];

        const typeOptions = noteTypes.map(t =>
            `<option value="${t}" ${(item.type || item.values?.type) === t ? 'selected' : ''}>${t}</option>`
        ).join('');

        const projectOptions = this.projects.map(p =>
            `<option value="${p.id}" ${(item.project_id || item.values?.project_id) === p.id ? 'selected' : ''}>${this.esc(p.values?.name || p.name || 'Untitled')}</option>`
        ).join('');

        return `
            <div class="process-field">
                <label>Type</label>
                <select id="process-note-type">
                    <option value="">Select type...</option>
                    ${typeOptions}
                </select>
            </div>
            <div class="process-field">
                <label>Project</label>
                <select id="process-project">
                    <option value="">No project</option>
                    ${projectOptions}
                </select>
            </div>
        `;
    },

    renderPersonFields() {
        const item = this.currentItem;

        return `
            <div class="process-field">
                <label>Email</label>
                <input type="email" id="process-email" value="${this.esc(item.email || '')}" placeholder="email@example.com">
            </div>
            <div class="process-field">
                <label>Phone</label>
                <input type="tel" id="process-phone" value="${this.esc(item.phone_mobile || '')}" placeholder="801-555-1234">
            </div>
            <div class="process-field">
                <label>Company</label>
                <input type="text" id="process-company" value="${this.esc(item.company || '')}" placeholder="Company name">
            </div>
            <div class="process-field">
                <label>Relationship</label>
                <select id="process-relationship">
                    <option value="">Select...</option>
                    <option value="friend" ${item.relationship === 'friend' ? 'selected' : ''}>Friend</option>
                    <option value="family" ${item.relationship === 'family' ? 'selected' : ''}>Family</option>
                    <option value="colleague" ${item.relationship === 'colleague' ? 'selected' : ''}>Colleague</option>
                    <option value="client" ${item.relationship === 'client' ? 'selected' : ''}>Client</option>
                    <option value="contractor" ${item.relationship === 'contractor' ? 'selected' : ''}>Contractor</option>
                    <option value="adjuster" ${item.relationship === 'adjuster' ? 'selected' : ''}>Adjuster</option>
                    <option value="vendor" ${item.relationship === 'vendor' ? 'selected' : ''}>Vendor</option>
                    <option value="other" ${item.relationship === 'other' ? 'selected' : ''}>Other</option>
                </select>
            </div>
        `;
    },

    async quickAction(action) {
        if (!this.currentItem) return;
        const id = this.currentItem._id || this.currentItem.id;

        try {
            if (this.currentType === 'task') {
                let updateData = {};
                const today = new Date().toISOString().split('T')[0];

                switch (action) {
                    case 'do_next':
                        updateData = { smart_list: 'do_next' };
                        break;
                    case 'snooze':
                        // Snooze for 1 day by default
                        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
                        updateData = { snooze_date: tomorrow, smart_list: 'snoozed' };
                        break;
                    case 'someday':
                        updateData = { smart_list: 'someday' };
                        break;
                    case 'my_day':
                        updateData = { due_date: today, my_day: true, smart_list: 'calendar' };
                        break;
                }

                await fetch(`/api/task-items/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(updateData)
                });
            }

            this.close();
            this.refreshWidgets('process');
        } catch (err) {
            console.error('Quick action failed:', err);
        }
    },

    async save() {
        if (!this.currentItem) return;
        const id = this.currentItem._id || this.currentItem.id;

        try {
            if (this.currentType === 'task') {
                const dueDate = this.overlay.querySelector('#process-due-date')?.value || null;
                const priorityBtn = this.overlay.querySelector('.process-priority-btn.active');
                const priority = priorityBtn ? priorityBtn.dataset.priority : 'medium';
                const listId = this.overlay.querySelector('#process-list')?.value || null;
                const projectId = this.overlay.querySelector('#process-project')?.value || null;

                // Bind priority button clicks
                this.overlay.querySelectorAll('.process-priority-btn').forEach(btn => {
                    btn.onclick = () => {
                        this.overlay.querySelectorAll('.process-priority-btn').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                    };
                });

                const updateData = {
                    due_date: dueDate,
                    priority: priority,
                    list_id: listId,
                    project_id: projectId
                };

                // If due_date was set, smart_list auto-computes to 'calendar' on backend
                // If no due_date but other fields filled, it's still processed (has metadata)
                // We explicitly set smart_list based on what was filled
                if (dueDate) {
                    updateData.smart_list = 'calendar';
                } else if (listId || projectId) {
                    updateData.smart_list = 'do_next'; // Has organizational context
                }

                await fetch(`/api/task-items/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(updateData)
                });

            } else if (this.currentType === 'note') {
                const noteType = this.overlay.querySelector('#process-note-type')?.value || '';
                const projectId = this.overlay.querySelector('#process-project')?.value || '';

                // Update note via core bases API
                await fetch(`/api/bases/core/core-notes/records/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ values: { type: noteType, project_id: projectId } })
                });

            } else if (this.currentType === 'person') {
                const email = this.overlay.querySelector('#process-email')?.value || '';
                const phone = this.overlay.querySelector('#process-phone')?.value || '';
                const company = this.overlay.querySelector('#process-company')?.value || '';
                const relationship = this.overlay.querySelector('#process-relationship')?.value || '';

                await fetch(`/api/people/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email, phone_mobile: phone, company, relationship })
                });
            }

            this.close();
            this.refreshWidgets('process');
        } catch (err) {
            console.error('Process save failed:', err);
        }
    },

    async deleteItem() {
        if (!this.currentItem) return;
        const id = this.currentItem._id || this.currentItem.id;
        const title = this.currentItem.title || this.currentItem.name || 'this item';

        if (!confirm(`Delete "${title}"? This can't be undone.`)) return;

        try {
            let url;
            if (this.currentType === 'task') url = `/api/task-items/${id}`;
            else if (this.currentType === 'note') url = `/api/bases/core/core-notes/records/${id}`;
            else if (this.currentType === 'person') url = `/api/people/${id}`;

            await fetch(url, {
                method: 'DELETE',
                credentials: 'include'
            });

            this.close();
            this.refreshWidgets('delete');
        } catch (err) {
            console.error('Delete failed:', err);
        }
    },

    refreshWidgets(action) {
        document.dispatchEvent(new CustomEvent(action === 'delete' ? 'inbox:deleted' : 'inbox:processed'));
        if (window.InboxWidget) window.InboxWidget.refresh();
        if (window.MyDayWidget) window.MyDayWidget.refresh();
    },

    esc(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    InboxProcessor.init();

    // Bind priority buttons after fields render
    const observer = new MutationObserver(() => {
        const btns = document.querySelectorAll('.process-priority-btn');
        btns.forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.process-priority-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };
        });
    });
    const fieldsEl = document.getElementById('process-fields');
    if (fieldsEl) observer.observe(fieldsEl, { childList: true });
});

window.InboxProcessor = InboxProcessor;
