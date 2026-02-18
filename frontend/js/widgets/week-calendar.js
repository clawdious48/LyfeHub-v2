(function() {
    'use strict';

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
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

    async function loadWeekCalendar() {
        const container = document.getElementById('week-calendar-content');
        if (!container) return;

        try {
            // Calculate week range (Mon-Sun)
            const now = new Date();
            const monday = new Date(now);
            monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));

            const days = [];
            for (let i = 0; i < 7; i++) {
                const d = new Date(monday);
                d.setDate(monday.getDate() + i);
                days.push(d);
            }

            const start = days[0].toISOString().split('T')[0];
            const end = days[6].toISOString().split('T')[0];

            // Fetch tasks and calendar events in parallel
            let tasks = [];
            let calEvents = [];

            const [tasksRes, eventsRes] = await Promise.allSettled([
                fetch(`/api/task-items/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, { credentials: 'include' }),
                fetch(`/api/calendar-events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, { credentials: 'include' })
            ]);

            if (tasksRes.status === 'fulfilled' && tasksRes.value.ok) {
                const data = await tasksRes.value.json();
                tasks = data.items || data || [];
            }
            if (eventsRes.status === 'fulfilled' && eventsRes.value.ok) {
                const data = await eventsRes.value.json();
                calEvents = data.events || data || [];
            }

            const today = now.toISOString().split('T')[0];
            const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

            // Helper to get items for a date
            function getTasksForDate(dateStr) {
                return tasks.filter(e => (e.due_date || e.date || e.start_date || '').startsWith(dateStr));
            }
            function getEventsForDate(dateStr) {
                return calEvents.filter(e => {
                    const eDate = (e.start_date || e.date || '').substring(0, 10);
                    return eDate === dateStr;
                });
            }

            container.innerHTML = `
                <div class="week-strip">
                    ${days.map((d, i) => {
                        const dateStr = d.toISOString().split('T')[0];
                        const isToday = dateStr === today;
                        const dayTasks = getTasksForDate(dateStr);
                        const dayEvents = getEventsForDate(dateStr);
                        const totalItems = dayTasks.length + dayEvents.length;
                        // Show up to 3 dots: events as colored, tasks as default
                        const dots = [];
                        dayEvents.slice(0, 3).forEach(ev => {
                            const color = ev.calendar_color || ev.color || '#00aaff';
                            dots.push(`<span class="event-dot" style="background:${color}"></span>`);
                        });
                        const remaining = 3 - dots.length;
                        dayTasks.slice(0, remaining).forEach(() => {
                            dots.push('<span class="event-dot task-dot"></span>');
                        });
                        return `
                            <div class="week-day ${isToday ? 'today' : ''}">
                                <span class="week-day-name">${dayNames[i]}</span>
                                <span class="week-day-number ${isToday ? 'today-number' : ''}">${d.getDate()}</span>
                                <div class="week-day-dots">
                                    ${dots.join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;

            // Show today's events + tasks below the strip
            const todayTasks = getTasksForDate(today);
            const todayEvents = getEventsForDate(today);

            if (todayEvents.length > 0 || todayTasks.length > 0) {
                // Merge and sort by time
                const merged = [];
                todayEvents.forEach(ev => {
                    merged.push({
                        type: 'event',
                        time: ev.start_time || ev.time || '',
                        title: ev.title || ev.name || 'Untitled',
                        color: ev.calendar_color || ev.color || '#00aaff'
                    });
                });
                todayTasks.forEach(t => {
                    merged.push({
                        type: 'task',
                        time: t.due_time || t.start_time || '',
                        title: t.title || t.name || 'Untitled',
                        color: null
                    });
                });
                merged.sort((a, b) => (a.time || 'zzz').localeCompare(b.time || 'zzz'));

                container.innerHTML += `
                    <div class="week-today-events">
                        <h4>Today</h4>
                        ${merged.slice(0, 5).map(item => `
                            <div class="week-event-item">
                                ${item.type === 'event'
                                    ? `<span class="week-event-dot" style="background:${item.color}"></span>`
                                    : '<span class="week-task-icon">☐</span>'
                                }
                                <span class="week-event-time">${formatTime(item.time)}</span>
                                <span class="week-event-title">${escapeHtml(item.title)}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        } catch (err) {
            container.innerHTML = '<div class="widget-empty"><p>Calendar unavailable</p></div>';
        }
    }

    // Wire up "View All →" to navigate to calendar tab
    document.addEventListener('DOMContentLoaded', () => {
        loadWeekCalendar();

        // Wire up all data-navigate links on dashboard
        document.querySelectorAll('.widget-link[data-navigate]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = link.dataset.navigate;
                const tabBtn = document.querySelector(`.tab[data-tab="${tab}"]`);
                if (tabBtn) tabBtn.click();
            });
        });
    });

    window.WeekCalendarWidget = { refresh: loadWeekCalendar };
})();
