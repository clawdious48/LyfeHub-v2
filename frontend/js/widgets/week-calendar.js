(function() {
    'use strict';
    
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
            
            // Fetch task items for the week (calendar uses task-items API)
            let events = [];
            try {
                const start = days[0].toISOString().split('T')[0];
                const end = days[6].toISOString().split('T')[0];
                const res = await fetch(`/api/task-items/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    events = data.items || data || [];
                }
            } catch (e) { /* Calendar may not have events yet */ }
            
            const today = now.toISOString().split('T')[0];
            const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            
            container.innerHTML = `
                <div class="week-strip">
                    ${days.map((d, i) => {
                        const dateStr = d.toISOString().split('T')[0];
                        const isToday = dateStr === today;
                        const dayEvents = events.filter(e => (e.due_date || e.date || e.start_date || '').startsWith(dateStr));
                        return `
                            <div class="week-day ${isToday ? 'today' : ''}">
                                <span class="week-day-name">${dayNames[i]}</span>
                                <span class="week-day-number ${isToday ? 'today-number' : ''}">${d.getDate()}</span>
                                <div class="week-day-dots">
                                    ${dayEvents.slice(0, 3).map(() => '<span class="event-dot"></span>').join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            
            // If there are events today, list them below the strip
            const todayEvents = events.filter(e => (e.due_date || e.date || e.start_date || '').startsWith(today));
            if (todayEvents.length > 0) {
                container.innerHTML += `
                    <div class="week-today-events">
                        <h4>Today</h4>
                        ${todayEvents.slice(0, 3).map(e => `
                            <div class="week-event-item">
                                <span class="week-event-time">${e.due_time || e.start_time || ''}</span>
                                <span class="week-event-title">${e.title || e.name || 'Untitled'}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        } catch (err) {
            container.innerHTML = '<div class="widget-empty"><p>Calendar unavailable</p></div>';
        }
    }
    
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('week-calendar-content')) loadWeekCalendar();
    });
    window.WeekCalendarWidget = { refresh: loadWeekCalendar };
})();
