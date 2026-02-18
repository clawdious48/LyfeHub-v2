/**
 * Event Modal — Create / Edit calendar events
 */
const eventModal = {
    mode: 'create', // 'create' or 'edit'
    eventId: null,

    get modal() { return document.getElementById('event-modal'); },
    get titleEl() { return document.getElementById('event-modal-title'); },
    get titleInput() { return document.getElementById('event-title'); },
    get allDayCheck() { return document.getElementById('event-all-day'); },
    get startDate() { return document.getElementById('event-start-date'); },
    get startTime() { return document.getElementById('event-start-time'); },
    get endDate() { return document.getElementById('event-end-date'); },
    get endTime() { return document.getElementById('event-end-time'); },
    get calendarSelect() { return document.getElementById('event-calendar'); },
    get locationInput() { return document.getElementById('event-location'); },
    get descriptionInput() { return document.getElementById('event-description'); },
    get deleteBtn() { return document.getElementById('event-delete-btn'); },
    get saveBtn() { return document.getElementById('event-save-btn'); },

    init() {
        const modal = this.modal;
        if (!modal) return;

        // Close handlers
        modal.querySelector('.modal-backdrop')?.addEventListener('click', () => this.close());
        modal.querySelector('.modal-close')?.addEventListener('click', () => this.close());
        modal.querySelector('.modal-cancel')?.addEventListener('click', () => this.close());

        // Save / Delete
        this.saveBtn?.addEventListener('click', () => this.save());
        this.deleteBtn?.addEventListener('click', () => this.delete());

        // All-day toggle
        this.allDayCheck?.addEventListener('change', () => this.toggleAllDay());

        // Enter on title saves
        this.titleInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.save();
        });
    },

    /**
     * Open the modal
     * For new: { date, startTime, endTime, calendarId }
     * For edit: { event }
     */
    open(options = {}) {
        this.populateCalendars();

        if (options.event) {
            // Edit mode
            this.mode = 'edit';
            this.eventId = options.event.id;
            this.titleEl.textContent = 'Edit Event';
            this.deleteBtn.style.display = '';

            const ev = options.event;
            this.titleInput.value = ev.title || '';
            this.allDayCheck.checked = !!ev.is_all_day;
            this.startDate.value = ev.start_date || '';
            this.startTime.value = ev.start_time || '09:00';
            this.endDate.value = ev.end_date || ev.start_date || '';
            this.endTime.value = ev.end_time || '10:00';
            this.calendarSelect.value = ev.calendar_id || '';
            this.locationInput.value = ev.location || '';
            this.descriptionInput.value = ev.description || '';
        } else {
            // Create mode
            this.mode = 'create';
            this.eventId = null;
            this.titleEl.textContent = 'New Event';
            this.deleteBtn.style.display = 'none';

            const today = new Date().toISOString().split('T')[0];
            this.titleInput.value = '';
            this.allDayCheck.checked = false;
            this.startDate.value = options.date || today;
            this.startTime.value = options.startTime || '09:00';
            this.endDate.value = options.date || today;
            this.endTime.value = options.endTime || '10:00';
            this.locationInput.value = '';
            this.descriptionInput.value = '';

            if (options.calendarId) {
                this.calendarSelect.value = options.calendarId;
            }
        }

        this.toggleAllDay();
        this.modal.classList.add('open');
        this.titleInput.focus();
    },

    close() {
        this.modal.classList.remove('open');
        this.eventId = null;
    },

    toggleAllDay() {
        const hide = this.allDayCheck.checked;
        document.querySelectorAll('.event-time-field').forEach(el => {
            el.style.display = hide ? 'none' : '';
        });
    },

    populateCalendars() {
        const select = this.calendarSelect;
        if (!select) return;

        const calendars = (typeof calendar !== 'undefined' && calendar.calendars) ? calendar.calendars : [];
        select.innerHTML = calendars.map(cal => {
            const defaultAttr = cal.is_default ? ' selected' : '';
            return `<option value="${cal.id}"${defaultAttr}>${cal.name}</option>`;
        }).join('');
    },

    async save() {
        const title = this.titleInput.value.trim();
        if (!title) {
            this.titleInput.focus();
            return;
        }

        const data = {
            title,
            is_all_day: this.allDayCheck.checked,
            start_date: this.startDate.value,
            end_date: this.endDate.value || this.startDate.value,
            calendar_id: this.calendarSelect.value || undefined,
            location: this.locationInput.value.trim() || undefined,
            description: this.descriptionInput.value.trim() || undefined,
        };

        if (!data.is_all_day) {
            data.start_time = this.startTime.value || undefined;
            data.end_time = this.endTime.value || undefined;
        }

        try {
            this.saveBtn.disabled = true;
            if (this.mode === 'edit' && this.eventId) {
                await api.updateCalendarEvent(this.eventId, data);
            } else {
                await api.createCalendarEvent(data);
            }
            this.close();
            if (typeof calendar !== 'undefined' && calendar.load) {
                await calendar.load();
            }
        } catch (err) {
            console.error('Failed to save event:', err);
            alert('Failed to save event: ' + err.message);
        } finally {
            this.saveBtn.disabled = false;
        }
    },

    async delete() {
        if (!this.eventId) return;
        if (!confirm('Delete this event?')) return;

        try {
            await api.deleteCalendarEvent(this.eventId);
            this.close();
            if (typeof calendar !== 'undefined' && calendar.load) {
                await calendar.load();
            }
        } catch (err) {
            console.error('Failed to delete event:', err);
            alert('Failed to delete event: ' + err.message);
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => eventModal.init());
