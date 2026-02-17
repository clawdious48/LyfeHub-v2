/* ===================================================================
   dryingEventLogViewer.js — Event Log Viewer for Settings → Developer
   =================================================================== */
(function() {
    'use strict';

    const EVENT_COLORS = {
        API_ERROR: '#ef4444', CONFIRM_BLOCKED: '#f59e0b', DANGEROUS_CLEANUP_BLOCKED: '#f59e0b',
        ROOM_DELETE: '#ef4444', REFPOINT_DELETE: '#ef4444', CHAMBER_DELETE: '#ef4444',
        ROOM_CREATE: '#22c55e', ROOM_CREATE_BLANK: '#22c55e', CHAMBER_CREATE: '#22c55e',
        REFPOINT_CREATE: '#22c55e', BASELINE_SAVE: '#22c55e', CONFIRM_SETUP: '#22c55e',
        WIZARD_OPEN: '#6b7280', WIZARD_REOPEN: '#a855f7', STEP_CHANGE: '#6b7280',
        ROOM_RENAME: '#3b82f6', BLANK_ROOM_CLEANUP: '#f59e0b'
    };

    async function initEventLogViewer() {
        const panel = document.getElementById('event-logs-panel');
        if (!panel) return;

        try {
            const res = await fetch('/api/admin/drying-event-logs', { credentials: 'include' });
            if (!res.ok) {
                panel.innerHTML = '<p class="text-muted">Unable to load event logs.</p>';
                return;
            }
            const jobs = await res.json();
            if (!jobs.length) {
                panel.innerHTML = '<p class="text-muted">No event logs recorded yet.</p>';
                return;
            }
            renderJobsList(panel, jobs);
        } catch (err) {
            panel.innerHTML = '<p class="text-muted">Failed to load event logs.</p>';
        }
    }

    function renderJobsList(panel, jobs) {
        let html = '<div class="event-log-list">';
        for (const job of jobs) {
            const date = job.latest_timestamp ? new Date(job.latest_timestamp).toLocaleDateString() : '';
            html += `<div class="event-log-job-row" data-job-id="${esc(job.job_id)}">
                <span class="event-log-job-name">${esc(job.client_name || job.job_id)}</span>
                <span class="event-log-meta">${job.session_count} session${job.session_count > 1 ? 's' : ''} · ${date}</span>
            </div>`;
        }
        html += '</div><div id="event-log-detail"></div>';
        panel.innerHTML = html;

        panel.querySelectorAll('.event-log-job-row').forEach(row => {
            row.addEventListener('click', () => loadJobSessions(row.dataset.jobId));
        });
    }

    async function loadJobSessions(jobId) {
        const detail = document.getElementById('event-log-detail');
        if (!detail) return;
        detail.innerHTML = '<p class="text-muted">Loading sessions...</p>';

        try {
            const res = await fetch(`/api/apex-jobs/${jobId}/drying/event-log`, { credentials: 'include' });
            const sessions = await res.json();

            let html = '<div class="event-log-sessions">';
            html += `<button class="dry-btn dry-btn-sm dry-btn-secondary" id="event-log-back">← Back</button>`;
            for (const s of sessions) {
                const date = new Date(s.created_at).toLocaleString();
                html += `<div class="event-log-session-row" data-job-id="${esc(jobId)}" data-session-id="${esc(s.session_id)}">
                    <span>${date}</span>
                    <span class="event-log-meta">${s.event_count} events</span>
                </div>`;
            }
            html += '</div>';
            detail.innerHTML = html;

            document.getElementById('event-log-back').addEventListener('click', () => { detail.innerHTML = ''; });
            detail.querySelectorAll('.event-log-session-row').forEach(row => {
                row.addEventListener('click', () => loadSessionEvents(row.dataset.jobId, row.dataset.sessionId));
            });
        } catch (err) {
            detail.innerHTML = '<p class="text-muted">Failed to load sessions.</p>';
        }
    }

    async function loadSessionEvents(jobId, sessionId) {
        const detail = document.getElementById('event-log-detail');
        if (!detail) return;
        detail.innerHTML = '<p class="text-muted">Loading events...</p>';

        try {
            const res = await fetch(`/api/apex-jobs/${jobId}/drying/event-log/${sessionId}`, { credentials: 'include' });
            const data = await res.json();
            const events = data.events || [];

            let html = '<div class="event-log-events">';
            html += `<button class="dry-btn dry-btn-sm dry-btn-secondary" id="event-log-back-session">← Back to sessions</button>`;
            for (const evt of events) {
                const color = EVENT_COLORS[evt.event] || '#6b7280';
                const time = new Date(evt.timestamp).toLocaleTimeString();
                const dataStr = evt.data && Object.keys(evt.data).length ? JSON.stringify(evt.data) : '';
                html += `<div class="event-log-event-row" style="border-left: 3px solid ${color};">
                    <span class="event-log-time">${esc(time)}</span>
                    <span class="event-log-event-name" style="color:${color};">${esc(evt.event)}</span>
                    ${dataStr ? `<span class="event-log-event-data">${esc(dataStr)}</span>` : ''}
                </div>`;
            }
            html += '</div>';
            detail.innerHTML = html;

            document.getElementById('event-log-back-session').addEventListener('click', () => loadJobSessions(jobId));
        } catch (err) {
            detail.innerHTML = '<p class="text-muted">Failed to load events.</p>';
        }
    }

    function esc(str) {
        if (!str) return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    // Hook into SettingsDeveloper init
    const origInit = window.SettingsDeveloper?.init;
    window.SettingsDeveloper = {
        init: function() {
            if (origInit) origInit();
            initEventLogViewer();
        }
    };
})();
