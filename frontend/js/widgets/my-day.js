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

    function formatTime(timeStr) {
        if (!timeStr) return '';
        try {
            const [h, m] = timeStr.split(':');
            const hour = parseInt(h, 10);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const h12 = hour % 12 || 12;
            return m === '00' ? `${h12} ${ampm}` : `${h12}:${m} ${ampm}`;
        } catch { return timeStr; }
    }

    function renderTask(task) {
        const isCompleted = !!task.completed;
        const dueTime = task.due_time ? formatTime(task.due_time) : formatDueTime(task.due_date);
        const areaDot = task.area_id
            ? `<span class="my-day-area-dot" style="background:${task.area_color || '#888'}"></span>`
            : '';

        return `
            <div class="my-day-task ${isCompleted ? 'completed' : ''}" data-id="${task.id}" data-type="task">
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

    function renderEvent(event) {
        const color = event.calendar_color || event.color || '#00aaff';
        const timeStr = event.start_time ? formatTime(event.start_time) : '';
        const endStr = event.end_time ? formatTime(event.end_time) : '';
        const timeDisplay = timeStr && endStr ? `${timeStr} – ${endStr}` : timeStr || 'All day';

        return `
            <div class="my-day-task my-day-event" data-id="${event.id}" data-type="event">
                <span class="my-day-event-dot" style="background:${color}"></span>
                <div class="my-day-task-info">
                    <span class="my-day-task-title">${escapeHtml(event.title || event.name || 'Untitled')}</span>
                    <span class="my-day-due-time">${timeDisplay}</span>
                </div>
            </div>`;
    }

    async function loadMyDay() {
        const container = document.getElementById('my-day-content');
        if (!container) return;

        try {
            const today = getUserToday();

            // Fetch tasks and calendar events in parallel
            const [tasksRes, eventsRes] = await Promise.allSettled([
                fetch(`/api/task-items?view=my-day&today=${today}`, { credentials: 'include' }),
                fetch(`/api/calendar-events?start=${today}&end=${today}`, { credentials: 'include' })
            ]);

            let allTasks = [];
            let calEvents = [];

            if (tasksRes.status === 'fulfilled' && tasksRes.value.ok) {
                const data = await tasksRes.value.json();
                allTasks = data.items || [];
            }
            if (eventsRes.status === 'fulfilled' && eventsRes.value.ok) {
                const data = await eventsRes.value.json();
                calEvents = data.events || data || [];
            }

            if (allTasks.length === 0 && calEvents.length === 0) {
                container.innerHTML = `
                    <div class="widget-empty">
                        <p>No tasks or events for today 🎉</p>
                        <p class="widget-empty-sub">Enjoy your day or add something new</p>
                    </div>`;
                return;
            }

            // Build merged timeline: events + tasks sorted by time
            const timeline = [];

            calEvents.forEach(ev => {
                timeline.push({
                    type: 'event',
                    sortTime: ev.start_time || '00:00',
                    data: ev
                });
            });

            allTasks.forEach(task => {
                timeline.push({
                    type: 'task',
                    sortTime: task.due_time || task.due_date?.substring(11, 16) || 'zz:zz',
                    data: task
                });
            });

            // Sort: timed items first (by time), then untimed
            timeline.sort((a, b) => (a.sortTime || 'zz:zz').localeCompare(b.sortTime || 'zz:zz'));

            container.innerHTML = `
                <div class="my-day-list">
                    ${timeline.map(item => 
                        item.type === 'event' ? renderEvent(item.data) : renderTask(item.data)
                    ).join('')}
                </div>`;

            // Bind checkboxes (tasks only)
            container.querySelectorAll('.my-day-checkbox').forEach(cb => {
                cb.addEventListener('change', async (e) => {
                    e.stopPropagation();
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

            // Bind task click → open reader modal
            container.querySelectorAll('.my-day-task[data-type="task"]').forEach(item => {
                item.addEventListener('click', async (e) => {
                    if (e.target.closest('.my-day-check-label')) return;
                    const taskId = item.dataset.id;
                    if (!taskId || typeof taskModal === 'undefined') return;
                    try {
                        const res = await fetch(`/api/task-items/${taskId}`, { credentials: 'include' });
                        if (!res.ok) return;
                        const data = await res.json();
                        taskModal.openEdit(data.item || data);
                    } catch (err) {
                        console.error('Failed to open task:', err);
                    }
                });
                item.style.cursor = 'pointer';
            });
        } catch (err) {
            container.innerHTML = '<div class="widget-empty"><p>Could not load tasks</p></div>';
            console.error('My Day widget error:', err);
        }
    }

    // Initialize — only auto-load if #my-day-content exists in DOM already
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('my-day-content')) {
            loadMyDay();
        }
        document.addEventListener('sidebar:navigate', (e) => {
            if (e.detail && e.detail.tab === 'dashboard') setTimeout(loadMyDay, 100);
        });
    });

    window.MyDayWidget = { refresh: loadMyDay };
})();
