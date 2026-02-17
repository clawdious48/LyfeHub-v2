/* ===================================================================
   dryingEventLog.js — Lightweight event logger for drying wizard
   Captures every wizard action for debugging and audit
   =================================================================== */

const dryingEventLog = {
    _events: [],
    _jobId: null,
    _sessionId: null,
    _flushTimer: null,

    init(jobId) {
        this.destroy(true); // clean up previous session without flush
        this._jobId = jobId;
        this._sessionId = crypto.randomUUID ? crypto.randomUUID() : 
            'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                const r = Math.random() * 16 | 0;
                return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
            });
        this._events = [];
        this._flushTimer = setInterval(() => this.flush(), 30000);
    },

    log(event, data) {
        this._events.push({
            timestamp: new Date().toISOString(),
            event,
            data: data || {}
        });
    },

    async flush() {
        if (!this._jobId || !this._sessionId || this._events.length === 0) return;
        const toSend = this._events.splice(0);
        try {
            await fetch(`/api/apex-jobs/${this._jobId}/drying/event-log`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: this._sessionId, events: toSend })
            });
        } catch (err) {
            // Put events back on failure
            this._events.unshift(...toSend);
            console.warn('dryingEventLog flush failed:', err);
        }
    },

    getEvents() {
        return [...this._events];
    },

    destroy(skipFlush) {
        if (this._flushTimer) {
            clearInterval(this._flushTimer);
            this._flushTimer = null;
        }
        if (!skipFlush) this.flush();
        this._events = [];
        this._jobId = null;
        this._sessionId = null;
    }
};

window.dryingEventLog = dryingEventLog;
