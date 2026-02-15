(function() {
    'use strict';

    function getUserToday() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function formatDueTime(dueDate) {
        if (!dueDate || dueDate.length <= 10) return '';
        try {
            const d = new Date(dueDate);
            return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        } catch { return ''; }
    }

    function renderTask(task) {
        const isCompleted = !!task.completed;
        const dueTime = formatDueTime(task.due_date);
        const areaDot = task.area_id
            ? `<span class="my-day-area-dot" style="background:${task.area_color || '#888'}"></span>`
            : '';

        return `
            <div class="my-day-task ${isCompleted ? 'completed' : ''}" data-id="${task.id}">
                <label class="my-day-check-label">
                    <input type="checkbox" class="my-day-checkbox" data-task-id="${task.id}"
                        ${isCompleted ? 'checked' : ''}>
                    <span class="my-day-checkmark"></span>
                </label>
                <div class="my-day-task-info">
                    <span class="my-day-task-title">${escapeHtml(task.title)}</span>
                    ${dueTime ? `<span class="my-day-due-time">${dueTime}</span>` : ''}
                </div>
                ${areaDot}
            </div>`;
    }

    function renderColumn(label, tasks) {
        return `
            <div class="my-day-column">
                <div class="my-day-column-header">${label} <span class="my-day-count">${tasks.length}</span></div>
                <div class="my-day-column-tasks">
                    ${tasks.length ? tasks.map(renderTask).join('') : '<div class="my-day-empty-col">—</div>'}
                </div>
            </div>`;
    }

    async function loadMyDay() {
        const container = document.getElementById('my-day-content');
        if (!container) return;

        try {
            const today = getUserToday();
            const response = await fetch(`/api/task-items?view=my-day&today=${today}`, {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to load tasks');
            const data = await response.json();
            const allTasks = data.items || [];

            if (allTasks.length === 0) {
                container.innerHTML = `
                    <div class="widget-empty">
                        <p>No tasks for today 🎉</p>
                        <p class="widget-empty-sub">Enjoy your day or add something new</p>
                    </div>`;
                return;
            }

            const todo = allTasks.filter(t => !t.completed && t.status !== 'in_progress');
            const inProgress = allTasks.filter(t => !t.completed && t.status === 'in_progress');
            const done = allTasks.filter(t => t.completed);

            container.innerHTML = `
                <div class="my-day-kanban">
                    ${renderColumn('To Do', todo)}
                    ${renderColumn('In Progress', inProgress)}
                    ${renderColumn('Done', done)}
                </div>`;

            // Bind checkboxes
            container.querySelectorAll('.my-day-checkbox').forEach(cb => {
                cb.addEventListener('change', async (e) => {
                    const taskId = e.target.dataset.taskId;
                    try {
                        await fetch(`/api/task-items/${taskId}/toggle`, {
                            method: 'POST',
                            credentials: 'include'
                        });
                        loadMyDay();
                    } catch (err) {
                        console.error('Failed to toggle task:', err);
                    }
                });
            });
        } catch (err) {
            container.innerHTML = '<div class="widget-empty"><p>Could not load tasks</p></div>';
            console.error('My Day widget error:', err);
        }
    }

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
        loadMyDay();
        document.addEventListener('sidebar:navigate', (e) => {
            if (e.detail && e.detail.tab === 'dashboard') setTimeout(loadMyDay, 100);
        });
    });

    window.MyDayWidget = { refresh: loadMyDay };
})();
