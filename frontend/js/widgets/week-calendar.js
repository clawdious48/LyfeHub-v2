(function() {
    'use strict';

    let weekOffset = 0;
    let refreshInterval = null;

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
            const now = new Date();
            const monday = new Date(now);
            monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + (weekOffset * 7));

            const days = [];
            for (let i = 0; i < 7; i++) {
                const d = new Date(monday);
                d.setDate(monday.getDate() + i);
                days.push(d);
            }

            const start = days[0].toISOString().split('T')[0];
            const end = days[6].toISOString().split('T')[0];

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

            function getTasksForDate(dateStr) {
                return tasks.filter(e => (e.due_date || e.date || e.start_date || '').startsWith(dateStr));
            }
            function getEventsForDate(dateStr) {
                return calEvents.filter(e => {
                    const eDate = (e.start_date || e.date || '').substring(0, 10);
                    return eDate === dateStr;
                });
            }

            // Week label
            const sunday = days[6];
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const weekLabel = days[0].getMonth() === sunday.getMonth()
                ? `${monthNames[days[0].getMonth()]} ${days[0].getDate()}–${sunday.getDate()}`
                : `${monthNames[days[0].getMonth()]} ${days[0].getDate()} – ${monthNames[sunday.getMonth()]} ${sunday.getDate()}`;

            // Default selected date: today if in this week, else monday
            const defaultSelected = days.find(d => d.toISOString().split('T')[0] === today)
                ? today
                : start;

            container.innerHTML = `
                <div class="week-nav">
                    <button class="week-nav-btn" id="week-prev">‹</button>
                    <span class="week-nav-label">${weekLabel}</span>
                    <button class="week-nav-btn" id="week-next">›</button>
                </div>
                <div class="week-strip">
                    ${days.map((d, i) => {
                        const dateStr = d.toISOString().split('T')[0];
                        const isToday = dateStr === today;
                        const isSelected = dateStr === defaultSelected;
                        const dayTasks = getTasksForDate(dateStr);
                        const dayEvents = getEventsForDate(dateStr);
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
                            <div class="week-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" data-date="${dateStr}">
                                <span class="week-day-name">${dayNames[i]}</span>
                                <span class="week-day-number ${isToday ? 'today-number' : ''}">${d.getDate()}</span>
                                <div class="week-day-dots">
                                    ${dots.join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div id="week-day-detail"></div>
            `;

            // Render detail for a date
            function renderDayDetail(dateStr) {
                const detailEl = document.getElementById('week-day-detail');
                if (!detailEl) return;
                const dayTasks = getTasksForDate(dateStr);
                const dayEvents = getEventsForDate(dateStr);

                if (dayEvents.length === 0 && dayTasks.length === 0) {
                    detailEl.innerHTML = '';
                    return;
                }

                const merged = [];
                dayEvents.forEach(ev => {
                    merged.push({
                        type: 'event',
                        time: ev.start_time || ev.time || '',
                        title: ev.title || ev.name || 'Untitled',
                        color: ev.calendar_color || ev.color || '#00aaff'
                    });
                });
                dayTasks.forEach(t => {
                    merged.push({
                        type: 'task',
                        time: t.due_time || t.start_time || '',
                        title: t.title || t.name || 'Untitled',
                        color: null
                    });
                });
                merged.sort((a, b) => (a.time || 'zzz').localeCompare(b.time || 'zzz'));

                const dateObj = new Date(dateStr + 'T12:00:00');
                const label = dateStr === today ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

                detailEl.innerHTML = `
                    <div class="week-today-events">
                        <h4>${label}</h4>
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

            // Initial detail render
            renderDayDetail(defaultSelected);

            // Day click handlers
            container.querySelectorAll('.week-day[data-date]').forEach(el => {
                el.style.cursor = 'pointer';
                el.addEventListener('click', () => {
                    container.querySelectorAll('.week-day.selected').forEach(s => s.classList.remove('selected'));
                    el.classList.add('selected');
                    renderDayDetail(el.dataset.date);
                });
            });

            // Week nav handlers
            document.getElementById('week-prev')?.addEventListener('click', () => { weekOffset--; loadWeekCalendar(); });
            document.getElementById('week-next')?.addEventListener('click', () => { weekOffset++; loadWeekCalendar(); });

        } catch (err) {
            container.innerHTML = '<div class="widget-empty"><p>Calendar unavailable</p></div>';
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        loadWeekCalendar();

        // Auto-refresh every 60s
        refreshInterval = setInterval(loadWeekCalendar, 60000);

        document.querySelectorAll('.widget-link[data-navigate]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = link.dataset.navigate;
                if (window.kanban && window.kanban.switchTab) {
                    window.kanban.switchTab(tab);
                } else {
                    const tabBtn = document.querySelector(`.tab[data-tab="${tab}"]`);
                    if (tabBtn) tabBtn.click();
                }
            });
        });
    });

    window.WeekCalendarWidget = { refresh: loadWeekCalendar };
})();
