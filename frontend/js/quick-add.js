/* Quick Add — Centered Modal */
(function() {
    'use strict';

    let overlay, panel, titleInput, dateInput, mydayToggle, createBtn;
    let statusValue = 'todo';
    let priorityValue = '';
    let isOpen = false;

    function build() {
        overlay = document.createElement('div');
        overlay.className = 'quick-add-overlay';
        overlay.addEventListener('click', close);

        panel = document.createElement('div');
        panel.className = 'quick-add-panel';
        panel.innerHTML = `
            <button class="quick-add-close" type="button">&times;</button>
            <input class="quick-add-title" type="text" placeholder="What do you need to do?" autocomplete="off" />
            <div class="quick-add-divider"></div>

            <div class="quick-add-field">
                <label>Status</label>
                <div class="quick-add-segments" id="qa-status-group">
                    <button class="quick-add-segment active" data-value="todo" type="button">To Do</button>
                    <button class="quick-add-segment" data-value="in_progress" type="button">In Progress</button>
                    <button class="quick-add-segment" data-value="done" type="button">Done</button>
                </div>
            </div>

            <div class="quick-add-field">
                <label>Due Date</label>
                <input id="qa-date" type="date" />
            </div>

            <div class="quick-add-field">
                <label>Priority</label>
                <div class="quick-add-pills" id="qa-priority-group">
                    <button class="quick-add-pill" data-value="1" type="button">Critical</button>
                    <button class="quick-add-pill" data-value="2" type="button">High</button>
                    <button class="quick-add-pill" data-value="3" type="button">Medium</button>
                    <button class="quick-add-pill" data-value="4" type="button">Low</button>
                </div>
            </div>

            <div class="quick-add-myday" id="qa-myday">
                <span class="quick-add-myday-icon">My Day</span>
                <span class="quick-add-myday-text">Add to My Day</span>
            </div>

            <button class="quick-add-create" type="button" disabled>Create Task</button>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(panel);

        titleInput = panel.querySelector('.quick-add-title');
        dateInput = panel.querySelector('#qa-date');
        mydayToggle = panel.querySelector('#qa-myday');
        createBtn = panel.querySelector('.quick-add-create');

        titleInput.addEventListener('input', () => {
            createBtn.disabled = !titleInput.value.trim();
        });

        titleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && titleInput.value.trim()) {
                e.preventDefault();
                handleCreate();
            }
        });

        panel.querySelector('#qa-status-group').addEventListener('click', (e) => {
            const seg = e.target.closest('.quick-add-segment');
            if (!seg) return;
            panel.querySelectorAll('#qa-status-group .quick-add-segment').forEach(s => s.classList.remove('active'));
            seg.classList.add('active');
            statusValue = seg.dataset.value;
        });

        panel.querySelector('#qa-priority-group').addEventListener('click', (e) => {
            const pill = e.target.closest('.quick-add-pill');
            if (!pill) return;
            const wasActive = pill.classList.contains('active');
            panel.querySelectorAll('#qa-priority-group .quick-add-pill').forEach(p => p.classList.remove('active'));
            if (!wasActive) { pill.classList.add('active'); priorityValue = pill.dataset.value; }
            else { priorityValue = ''; }
        });

        mydayToggle.addEventListener('click', () => mydayToggle.classList.toggle('active'));
        createBtn.addEventListener('click', handleCreate);
        panel.querySelector('.quick-add-close').addEventListener('click', close);
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen) close(); });
    }

    async function handleCreate() {
        const title = titleInput.value.trim();
        if (!title) return;
        createBtn.disabled = true;
        createBtn.textContent = 'Creating...';

        try {
            const res = await fetch('/api/task-items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    title,
                    status: statusValue,
                    due_date: dateInput.value || null,
                    priority: priorityValue ? parseInt(priorityValue) : null,
                }),
            });
            if (!res.ok) throw new Error('Failed');
            const task = await res.json();

            if (mydayToggle.classList.contains('active') && task.id) {
                await fetch(`/api/task-items/${task.id}/toggle-my-day`, {
                    method: 'POST', credentials: 'include',
                });
            }

            showToast('Task created');
            close();
            if (window.taskModal && taskModal.loadTasks) {
                taskModal.loadTasks();
                taskModal.loadCounts();
            }
        } catch (err) {
            console.error('Quick add error:', err);
            showToast('Error creating task');
            createBtn.disabled = false;
            createBtn.textContent = 'Create Task';
        }
    }

    function open() {
        if (!panel) build();
        titleInput.value = '';
        statusValue = 'todo';
        priorityValue = '';
        dateInput.value = '';
        mydayToggle.classList.remove('active');
        panel.querySelectorAll('.quick-add-segment').forEach(s => s.classList.remove('active'));
        panel.querySelector('.quick-add-segment[data-value="todo"]').classList.add('active');
        panel.querySelectorAll('.quick-add-pill').forEach(p => p.classList.remove('active'));
        createBtn.disabled = true;
        createBtn.textContent = 'Create Task';
        requestAnimationFrame(() => {
            overlay.classList.add('visible');
            panel.classList.add('visible');
            isOpen = true;
            setTimeout(() => titleInput.focus(), 200);
        });
    }

    function close() {
        if (!overlay) return;
        overlay.classList.remove('visible');
        panel.classList.remove('visible');
        isOpen = false;
    }

    function showToast(msg) {
        let toast = document.querySelector('.quick-add-toast');
        if (!toast) { toast = document.createElement('div'); toast.className = 'quick-add-toast'; document.body.appendChild(toast); }
        toast.textContent = msg;
        toast.classList.add('visible');
        setTimeout(() => toast.classList.remove('visible'), 2000);
    }

    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('nav-add-btn');
        if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); open(); });
    });

    window.quickAdd = { open, close };
})();
