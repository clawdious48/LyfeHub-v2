/**
 * Calendar Module
 * Handles calendar views (Month, Week, 3-Day, Day) with task integration
 */

const calendar = {
    // State
    currentDate: new Date(),
    currentView: 'month',
    scheduledTasks: [],
    unscheduledTasks: [],
    calendarEvents: [],
    calendars: [],
    selectedCalendarIds: [], // Track which calendars are selected for filtering
    isInitialized: false,

    // Drag state for drag-and-drop scheduling (existing tasks)
    dragState: {
        taskId: null,
        startHour: null,
        startMinutes: null,
        currentHour: null,
        currentMinutes: null,
        dateStr: null,
        previewEl: null
    },

    // Click-drag state for creating new time blocks (uses total minutes since midnight)
    clickDragState: {
        active: false,
        startMinutes: null,
        currentMinutes: null,
        dateStr: null,
        previewEl: null,
        containerEl: null
    },

    // Time picker modal state (uses total minutes since midnight for 15-min increments)
    timePickerState: {
        taskId: null,
        date: null,
        startMinutes: null,
        endMinutes: null,
        isAllDay: false,
        isDragging: false
    },

    // Pending block state for drop-then-resize workflow (uses total minutes since midnight)
    pendingBlockState: {
        active: false,
        taskId: null,
        taskTitle: null,
        dateStr: null,
        startMinutes: null,
        endMinutes: null,
        element: null,
        containerEl: null,
        resizing: null,  // 'top', 'bottom', or null
        isDayView: false
    },

    /**
     * Initialize the calendar
     */
    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        // Bind click-drag event handlers to maintain 'this' context
        this.onClickDragMove = this._onClickDragMove.bind(this);
        this.onClickDragEnd = this._onClickDragEnd.bind(this);
        this.onClickDragTouchMove = (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this._onClickDragMove({ clientX: touch.clientX, clientY: touch.clientY });
        };
        this.onClickDragTouchEnd = (e) => {
            const touch = e.changedTouches[0];
            this._onClickDragEnd({ clientX: touch.clientX, clientY: touch.clientY });
        };

        this.bindEvents();
        this.bindCalendarModalEvents();
        this.bindTimePickerEvents();
        this.bindTimeBlockPopupEvents();
        this.bindSidebarUnscheduleEvents();
        // Don't load data on init - wait for tab switch
    },

    /**
     * Bind all event listeners
     */
    bindEvents() {
        // View toggle buttons
        document.querySelectorAll('.calendar-view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchView(btn.dataset.view);
            });
        });

        // Navigation buttons
        document.getElementById('calendar-prev')?.addEventListener('click', () => this.navigate(-1));
        document.getElementById('calendar-next')?.addEventListener('click', () => this.navigate(1));
        document.getElementById('calendar-today')?.addEventListener('click', () => this.goToToday());

        // Sidebar group toggle (Calendars, Tasks headers)
        document.querySelectorAll('.calendar-sidebar-toggle').forEach(toggle => {
            toggle.addEventListener('click', () => {
                const group = toggle.closest('.calendar-sidebar-group');
                group.classList.toggle('collapsed');
            });
        });

        // Sidebar section toggle (Scheduled, Unscheduled within Tasks)
        document.querySelectorAll('.calendar-section-header').forEach(header => {
            header.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent bubbling to group toggle
                const section = header.closest('.calendar-section');
                section.classList.toggle('collapsed');
            });
        });

        // Create Event button
        document.getElementById('calendar-create-event-btn')?.addEventListener('click', () => {
            if (typeof eventModal !== 'undefined') {
                eventModal.open({ date: this.formatDateISO(this.currentDate) });
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            // Only handle when calendar tab is active
            const calendarTab = document.querySelector('.tab-content[data-tab="calendar"]');
            if (!calendarTab?.classList.contains('active')) return;

            // Don't handle if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.navigate(-1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.navigate(1);
                    break;
                case 't':
                case 'T':
                    // 't' for today
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        this.goToToday();
                    }
                    break;
                case 'm':
                case 'M':
                    // 'm' for month view
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        this.switchView('month');
                    }
                    break;
                case 'w':
                case 'W':
                    // 'w' for week view
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        this.switchView('week');
                    }
                    break;
                case 'd':
                case 'D':
                    // 'd' for day view
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        this.switchView('day');
                    }
                    break;
                case '3':
                    // '3' for 3-day view
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        this.switchView('3day');
                    }
                    break;
                case 'Escape':
                    // Close any open popups/modals and cancel pending blocks
                    this.closeTimePicker();
                    this.closeTimeBlockPopup();
                    this.cancelPendingBlock();
                    break;
            }
        });
    },

    /**
     * Load calendar data when tab becomes active
     */
    async load() {
        await Promise.all([
            this.loadCalendars(),
            this.loadScheduledTasks(),
            this.loadUnscheduledTasks(),
            this.loadCalendarEvents()
        ]);
        this.updateTotalTasksCount();
        this.render();

        // Start the time indicator timer
        this.startTimeIndicatorTimer();
    },

    /**
     * Load user's calendars
     */
    async loadCalendars() {
        try {
            const response = await api.getCalendars();
            this.calendars = response.calendars || [];

            // Initialize selectedCalendarIds to all calendars on first load
            if (this.selectedCalendarIds.length === 0 && this.calendars.length > 0) {
                this.selectedCalendarIds = this.calendars.map(c => c.id);
            }

            this.renderCalendarsList();
        } catch (err) {
            console.error('Failed to load calendars:', err);
        }
    },

    /**
     * Render calendars in sidebar
     */
    renderCalendarsList() {
        const container = document.getElementById('calendars-list');
        if (!container) return;

        if (this.calendars.length === 0) {
            container.innerHTML = '<div class="calendar-task-empty">No calendars</div>';
            return;
        }

        container.innerHTML = this.calendars.map(cal => {
            const isSelected = this.selectedCalendarIds.includes(cal.id);
            return `
                <div class="calendar-list-item${isSelected ? ' selected' : ''}" data-calendar-id="${cal.id}">
                    <span class="calendar-color" style="background: ${cal.color};${isSelected ? '' : ' opacity: 0.3;'}"></span>
                    <span class="calendar-name">${this.escapeHtml(cal.name)}</span>
                    <button type="button" class="calendar-edit-btn" data-calendar-id="${cal.id}" title="Edit calendar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                </div>
            `;
        }).join('');

        // Bind click events for toggling selection
        container.querySelectorAll('.calendar-list-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't toggle if clicking the edit button
                if (e.target.closest('.calendar-edit-btn')) return;
                const calId = item.dataset.calendarId;
                this.toggleCalendarSelection(calId);
            });
        });

        // Bind edit button events
        container.querySelectorAll('.calendar-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const calId = btn.dataset.calendarId;
                this.openEditCalendarModal(calId);
            });
        });
    },

    /**
     * Toggle calendar selection for filtering
     * Note: This only affects the calendar view, not the sidebar task lists
     */
    toggleCalendarSelection(calendarId) {
        const index = this.selectedCalendarIds.indexOf(calendarId);
        if (index > -1) {
            // Deselect - but keep at least one selected
            if (this.selectedCalendarIds.length > 1) {
                this.selectedCalendarIds.splice(index, 1);
            }
        } else {
            // Select
            this.selectedCalendarIds.push(calendarId);
        }

        // Just re-render - no need to reload tasks since sidebar shows all
        // and calendar view filters client-side
        this.renderCalendarsList();
        this.render();
    },

    // Track currently editing calendar
    editingCalendarId: null,

    /**
     * Bind events for new calendar modal
     */
    bindCalendarModalEvents() {
        // Open modal button
        document.getElementById('new-calendar-btn')?.addEventListener('click', () => {
            this.openNewCalendarModal();
        });

        // Modal close/cancel
        const modal = document.getElementById('new-calendar-modal');
        if (modal) {
            modal.querySelector('.modal-close')?.addEventListener('click', () => this.closeNewCalendarModal());
            modal.querySelector('.modal-cancel')?.addEventListener('click', () => this.closeNewCalendarModal());
            modal.querySelector('.modal-backdrop')?.addEventListener('click', () => this.closeNewCalendarModal());
        }

        // Color presets
        document.querySelectorAll('#calendar-color-presets .color-preset').forEach(preset => {
            preset.addEventListener('click', () => {
                const color = preset.dataset.color;
                document.getElementById('new-calendar-color').value = color;
                // Update active state
                document.querySelectorAll('#calendar-color-presets .color-preset').forEach(p => p.classList.remove('active'));
                preset.classList.add('active');
            });
        });

        // Create button
        document.getElementById('create-calendar-btn')?.addEventListener('click', () => {
            this.createCalendar();
        });

        // Enter key to submit
        document.getElementById('new-calendar-name')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.createCalendar();
            }
        });

        // --- Edit Calendar Modal ---
        const editModal = document.getElementById('edit-calendar-modal');
        if (editModal) {
            editModal.querySelector('.modal-close')?.addEventListener('click', () => this.closeEditCalendarModal());
            editModal.querySelector('.modal-cancel')?.addEventListener('click', () => this.closeEditCalendarModal());
            editModal.querySelector('.modal-backdrop')?.addEventListener('click', () => this.closeEditCalendarModal());
        }

        // Edit color presets
        document.querySelectorAll('#edit-calendar-color-presets .color-preset').forEach(preset => {
            preset.addEventListener('click', () => {
                const color = preset.dataset.color;
                document.getElementById('edit-calendar-color').value = color;
                document.querySelectorAll('#edit-calendar-color-presets .color-preset').forEach(p => p.classList.remove('active'));
                preset.classList.add('active');
            });
        });

        // Save button
        document.getElementById('save-calendar-btn')?.addEventListener('click', () => {
            this.saveCalendar();
        });

        // Enter key to submit in edit modal
        document.getElementById('edit-calendar-name')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveCalendar();
            }
        });
    },

    /**
     * Open new calendar modal
     */
    openNewCalendarModal() {
        const modal = document.getElementById('new-calendar-modal');
        if (!modal) return;

        // Reset form
        document.getElementById('new-calendar-name').value = '';
        document.getElementById('new-calendar-color').value = '#00aaff';
        document.getElementById('new-calendar-description').value = '';
        document.querySelectorAll('#calendar-color-presets .color-preset').forEach(p => p.classList.remove('active'));
        document.querySelector('#calendar-color-presets .color-preset[data-color="#00aaff"]')?.classList.add('active');

        modal.classList.add('open');
        document.getElementById('new-calendar-name').focus();
    },

    /**
     * Close new calendar modal
     */
    closeNewCalendarModal() {
        const modal = document.getElementById('new-calendar-modal');
        if (modal) {
            modal.classList.remove('open');
        }
    },

    /**
     * Create new calendar
     */
    async createCalendar() {
        const name = document.getElementById('new-calendar-name').value.trim();
        if (!name) {
            document.getElementById('new-calendar-name').focus();
            return;
        }

        const color = document.getElementById('new-calendar-color').value;
        const description = document.getElementById('new-calendar-description').value.trim();

        try {
            await api.createCalendar({ name, color, description });
            this.closeNewCalendarModal();
            await this.loadCalendars();
        } catch (err) {
            console.error('Failed to create calendar:', err);
            alert('Failed to create calendar: ' + err.message);
        }
    },

    /**
     * Open edit calendar modal
     */
    openEditCalendarModal(calendarId) {
        const modal = document.getElementById('edit-calendar-modal');
        if (!modal) return;

        const cal = this.calendars.find(c => c.id === calendarId);
        if (!cal) return;

        this.editingCalendarId = calendarId;

        // Populate form with current values
        document.getElementById('edit-calendar-name').value = cal.name || '';
        document.getElementById('edit-calendar-color').value = cal.color || '#00aaff';
        document.getElementById('edit-calendar-description').value = cal.description || '';

        // Update color preset active state
        document.querySelectorAll('#edit-calendar-color-presets .color-preset').forEach(p => {
            p.classList.toggle('active', p.dataset.color === cal.color);
        });

        modal.classList.add('open');
        document.getElementById('edit-calendar-name').focus();
    },

    /**
     * Close edit calendar modal
     */
    closeEditCalendarModal() {
        const modal = document.getElementById('edit-calendar-modal');
        if (modal) {
            modal.classList.remove('open');
        }
        this.editingCalendarId = null;
    },

    /**
     * Save edited calendar
     */
    async saveCalendar() {
        if (!this.editingCalendarId) return;

        const name = document.getElementById('edit-calendar-name').value.trim();
        if (!name) {
            document.getElementById('edit-calendar-name').focus();
            return;
        }

        const color = document.getElementById('edit-calendar-color').value;
        const description = document.getElementById('edit-calendar-description').value.trim();

        try {
            await api.updateCalendar(this.editingCalendarId, { name, color, description });
            this.closeEditCalendarModal();
            await this.loadCalendars();
        } catch (err) {
            console.error('Failed to update calendar:', err);
            alert('Failed to update calendar: ' + err.message);
        }
    },

    // ==========================================
    // TIME PICKER MODAL (for Month/Week drops)
    // ==========================================

    /**
     * Bind events for time picker modal
     */
    bindTimePickerEvents() {
        const modal = document.getElementById('time-picker-modal');
        if (!modal) return;

        // Cancel button just closes - no scheduling
        document.getElementById('time-picker-cancel')?.addEventListener('click', () => this.closeTimePicker());
        document.getElementById('time-picker-confirm')?.addEventListener('click', () => this.confirmTimePicker());

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeTimePicker();
        });

        // All-day zone click
        document.getElementById('time-picker-all-day-zone')?.addEventListener('click', () => {
            this.onTimePickerAllDayClick();
        });
    },

    /**
     * Open time picker modal for selecting a time range
     */
    openTimePicker(taskId, date, taskTitle = '') {
        const modal = document.getElementById('time-picker-modal');
        const hoursContainer = document.getElementById('time-picker-hours');
        const allDayZone = document.getElementById('time-picker-all-day-zone');

        if (!modal || !hoursContainer) return;

        this.timePickerState = {
            taskId,
            date,
            startMinutes: null,
            endMinutes: null,
            isAllDay: false,
            isDragging: false
        };

        // Reset all-day zone
        if (allDayZone) {
            allDayZone.classList.remove('selected');
            allDayZone.textContent = 'Click to schedule as all-day';
        }

        // Render hour rows (mini day view style)
        let html = '';
        for (let hour = 0; hour < 24; hour++) {
            html += `
                <div class="time-picker-hour-row" data-hour="${hour}">
                    <div class="time-picker-hour-label">${this.formatHour(hour)}</div>
                    <div class="time-picker-hour-slot"></div>
                </div>
            `;
        }
        hoursContainer.innerHTML = html;

        // Bind drag-to-select events
        this.bindTimePickerDragEvents(hoursContainer);

        modal.classList.add('open');

        // Scroll to a reasonable starting point (8 AM)
        const scrollContainer = hoursContainer.closest('.time-picker-hours-scroll');
        if (scrollContainer) {
            scrollContainer.scrollTop = 8 * 60; // 8 hours * 60px per hour
        }

        // Show current time indicator in the time picker
        this.updateTimePickerIndicator();
    },

    /**
     * Bind drag-to-select events for time picker (15-minute increments)
     */
    bindTimePickerDragEvents(container) {
        // Mouse down on container starts drag
        const onMouseDown = (e) => {
            if (e.target.closest('.time-picker-hour-row')) {
                e.preventDefault();

                // Clear all-day selection
                const allDayZone = document.getElementById('time-picker-all-day-zone');
                if (allDayZone) {
                    allDayZone.classList.remove('selected');
                    allDayZone.textContent = 'Click to schedule as all-day';
                }

                // Calculate minutes from Y position (1px = 1 minute in the rows)
                const containerRect = container.getBoundingClientRect();
                const relativeY = e.clientY - containerRect.top;
                const rawMinutes = Math.max(0, Math.min(24 * 60 - 1, relativeY));
                const snappedMinutes = this.snapToQuarterHour(rawMinutes);

                this.timePickerState.isAllDay = false;
                this.timePickerState.isDragging = true;
                this.timePickerState.startMinutes = snappedMinutes;
                this.timePickerState.endMinutes = snappedMinutes + 15; // Minimum 15-min block

                this.updateTimePickerSelection();
            }
        };

        // Mouse move during drag extends selection
        const onMouseMove = (e) => {
            if (!this.timePickerState.isDragging) return;

            const containerRect = container.getBoundingClientRect();
            const relativeY = e.clientY - containerRect.top;
            const rawMinutes = Math.max(0, Math.min(24 * 60, relativeY));
            const snappedMinutes = this.snapToQuarterHour(rawMinutes);

            this.timePickerState.endMinutes = snappedMinutes + 15;
            this.updateTimePickerSelection();
        };

        // Mouse up ends drag
        const onMouseUp = () => {
            if (this.timePickerState.isDragging) {
                this.timePickerState.isDragging = false;
            }
        };

        container.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        // Touch equivalents for time picker
        const onTouchStart = (e) => {
            const touch = e.touches[0];
            onMouseDown({ target: document.elementFromPoint(touch.clientX, touch.clientY), clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {} });
            if (this.timePickerState.isDragging) e.preventDefault();
        };
        const onTouchMove = (e) => {
            if (!this.timePickerState.isDragging) return;
            e.preventDefault();
            const touch = e.touches[0];
            onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
        };
        const onTouchEnd = () => onMouseUp();

        container.addEventListener('touchstart', onTouchStart, { passive: false });
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);

        // Store cleanup function (called when modal closes)
        this._timePickerCleanup = () => {
            container.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            container.removeEventListener('touchstart', onTouchStart);
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
        };
    },

    /**
     * Update visual selection in time picker (15-minute increments using overlay)
     */
    updateTimePickerSelection() {
        const container = document.getElementById('time-picker-hours');
        if (!container) return;

        const state = this.timePickerState;
        let startMins = state.startMinutes;
        let endMins = state.endMinutes;

        // If no selection, clear everything
        if (startMins === null || endMins === null) {
            container.querySelectorAll('.time-picker-hour-row').forEach(row => {
                row.classList.remove('selected', 'in-range', 'drag-start', 'drag-end');
            });
            // Remove selection overlay
            const overlay = container.querySelector('.time-picker-selection');
            if (overlay) overlay.remove();
            return;
        }

        // Swap if dragging upward
        if (startMins > endMins - 15) {
            startMins = endMins - 15;
            endMins = state.startMinutes + 15;
        }

        // Clamp to boundaries
        startMins = Math.max(0, startMins);
        endMins = Math.min(24 * 60, endMins);

        // Update or create selection overlay
        let overlay = container.querySelector('.time-picker-selection');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'time-picker-selection';
            container.style.position = 'relative';
            container.appendChild(overlay);
        }

        overlay.style.top = `${startMins}px`;
        overlay.style.height = `${Math.max(15, endMins - startMins)}px`;

        // Clear row-based classes (no longer used for visual, but keep for semantics)
        container.querySelectorAll('.time-picker-hour-row').forEach(row => {
            row.classList.remove('selected', 'in-range', 'drag-start', 'drag-end');
        });
    },

    /**
     * Handle click on all-day zone
     */
    onTimePickerAllDayClick() {
        const state = this.timePickerState;
        const allDayZone = document.getElementById('time-picker-all-day-zone');
        const container = document.getElementById('time-picker-hours');

        // Toggle all-day selection
        state.isAllDay = !state.isAllDay;

        if (state.isAllDay) {
            // Clear time selection
            state.startMinutes = null;
            state.endMinutes = null;

            if (container) {
                container.querySelectorAll('.time-picker-hour-row').forEach(row => {
                    row.classList.remove('selected', 'in-range', 'drag-start', 'drag-end');
                });
            }

            if (allDayZone) {
                allDayZone.classList.add('selected');
                allDayZone.textContent = 'All-day event selected';
            }
        } else {
            if (allDayZone) {
                allDayZone.classList.remove('selected');
                allDayZone.textContent = 'Click to schedule as all-day';
            }
        }
    },

    /**
     * Confirm time picker selection (schedule with time or all-day, 15-minute increments)
     */
    async confirmTimePicker() {
        const state = this.timePickerState;

        if (!state.taskId || !state.date) {
            this.closeTimePicker();
            return;
        }

        // If all-day is selected, schedule as all-day
        if (state.isAllDay) {
            try {
                await this.scheduleTaskOnDate(state.taskId, state.date, null, null, true);
                this.closeTimePicker();
            } catch (err) {
                console.error('Failed to schedule task:', err);
            }
            return;
        }

        // Calculate proper start/end from drag state
        let startMins = state.startMinutes;
        let endMins = state.endMinutes;

        // Swap if dragged upward
        if (startMins !== null && endMins !== null && startMins > endMins - 15) {
            startMins = endMins - 15;
            endMins = state.startMinutes + 15;
        }

        const startTime = startMins !== null
            ? this.formatMinutesAsTimeString(startMins)
            : null;
        const endTime = endMins !== null
            ? this.formatMinutesAsTimeString(endMins)
            : null;

        try {
            await this.scheduleTaskOnDate(state.taskId, state.date, startTime, endTime, false);
            this.closeTimePicker();
        } catch (err) {
            console.error('Failed to schedule task:', err);
        }
    },

    /**
     * Close time picker modal
     */
    closeTimePicker() {
        const modal = document.getElementById('time-picker-modal');
        if (modal) {
            modal.classList.remove('open');
        }

        // Cleanup event listeners
        if (this._timePickerCleanup) {
            this._timePickerCleanup();
            this._timePickerCleanup = null;
        }

        this.timePickerState = { taskId: null, date: null, startMinutes: null, endMinutes: null, isAllDay: false, isDragging: false };
    },

    // ==========================================
    // TIME BLOCK POPUP (click-drag creation)
    // ==========================================

    /**
     * Bind events for time block popup
     */
    bindTimeBlockPopupEvents() {
        const popup = document.getElementById('time-block-popup');
        if (!popup) return;

        popup.querySelector('.time-block-popup-close')?.addEventListener('click', () => this.closeTimeBlockPopup());
        document.getElementById('time-block-create')?.addEventListener('click', () => this.createTimeBlockTask());

        // Type toggle buttons (Task / Event)
        popup.querySelectorAll('.time-block-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                popup.querySelectorAll('.time-block-type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const type = btn.dataset.type;
                const body = popup.querySelector('.time-block-popup-body');
                const footer = popup.querySelector('.time-block-popup-footer');
                if (type === 'event') {
                    // Switch to event: hide task UI, open event modal with time range
                    const state = this.timeBlockPopupState;
                    if (state) {
                        const startTime = this.formatMinutesAsTimeString(state.startMinutes);
                        const endTime = this.formatMinutesAsTimeString(state.endMinutes);
                        this.closeTimeBlockPopup();
                        if (typeof eventModal !== 'undefined') {
                            eventModal.open({ date: state.dateStr, startTime, endTime });
                        }
                    }
                } else {
                    // Reset to task mode
                    if (body) body.style.display = '';
                    if (footer) footer.style.display = '';
                }
            });
        });

        // Quick input - enter to create
        document.getElementById('time-block-quick-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.createTimeBlockTask();
            }
        });

        // Filter task list on input
        document.getElementById('time-block-quick-input')?.addEventListener('input', (e) => {
            this.filterTimeBlockTaskList(e.target.value);
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (popup.classList.contains('open') && !popup.contains(e.target)) {
                // Check if click was on the calendar area
                const calendarContent = document.querySelector('.calendar-content');
                if (calendarContent && !calendarContent.contains(e.target)) {
                    this.closeTimeBlockPopup();
                }
            }
        });
    },

    /**
     * Bind drag events to sidebar for unscheduling tasks
     */
    bindSidebarUnscheduleEvents() {
        const sidebar = document.querySelector('.calendar-sidebar');
        if (!sidebar) return;

        sidebar.addEventListener('dragenter', (e) => {
            e.preventDefault();
            sidebar.classList.add('unschedule-drop-zone');
        });

        sidebar.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            sidebar.classList.add('unschedule-drop-zone');
        });

        sidebar.addEventListener('dragleave', (e) => {
            // Only remove if leaving the sidebar entirely
            if (!sidebar.contains(e.relatedTarget)) {
                sidebar.classList.remove('unschedule-drop-zone');
            }
        });

        sidebar.addEventListener('drop', async (e) => {
            e.preventDefault();
            sidebar.classList.remove('unschedule-drop-zone');

            const taskId = e.dataTransfer.getData('text/plain');
            if (taskId) {
                await this.unscheduleTask(taskId);
            }
        });
    },

    /**
     * Unschedule a task (remove date/time)
     */
    async unscheduleTask(taskId) {
        try {
            await api.unscheduleTaskItem(taskId);
            // Refresh calendar data
            await this.load();
        } catch (err) {
            console.error('Failed to unschedule task:', err);
        }
    },

    /**
     * Open time block popup at a specific position (uses minutes since midnight)
     */
    openTimeBlockPopup(dateStr, startMinutes, endMinutes, x, y) {
        const popup = document.getElementById('time-block-popup');
        const timeDisplay = document.getElementById('time-block-popup-time');
        const input = document.getElementById('time-block-quick-input');

        if (!popup) return;

        // Store state for later use (now using minutes)
        this.timeBlockPopupState = { dateStr, startMinutes, endMinutes };

        // Update time display
        const startTime = this.formatMinutesForDisplay(startMinutes);
        const endTime = this.formatMinutesForDisplay(endMinutes);
        timeDisplay.textContent = `${startTime} - ${endTime}`;

        // Position popup near click/drag end point
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const popupWidth = 320;
        const popupHeight = 350;

        // Mobile: bottom-sheet style
        if (viewportWidth <= 768) {
            popup.style.left = '0';
            popup.style.right = '0';
            popup.style.bottom = '0';
            popup.style.top = 'auto';
        } else {
            let left = x + 10;
            let top = y + 10;

            // Keep within viewport
            if (left + popupWidth > viewportWidth) {
                left = x - popupWidth - 10;
            }
            if (top + popupHeight > viewportHeight) {
                top = viewportHeight - popupHeight - 20;
            }
            if (left < 10) left = 10;
            if (top < 10) top = 10;

            popup.style.left = `${left}px`;
            popup.style.top = `${top}px`;
            popup.style.right = '';
            popup.style.bottom = '';
        }

        // Clear and reset input
        input.value = '';

        // Reset type toggle to Task
        popup.querySelectorAll('.time-block-type-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.type === 'task');
        });
        const body = popup.querySelector('.time-block-popup-body');
        const footer = popup.querySelector('.time-block-popup-footer');
        if (body) body.style.display = '';
        if (footer) footer.style.display = '';

        // Render unscheduled task list
        this.renderTimeBlockTaskList();

        popup.classList.add('open');
        input.focus();
    },

    /**
     * Render the task list in time block popup
     */
    renderTimeBlockTaskList() {
        const list = document.getElementById('time-block-task-list');
        if (!list) return;

        if (this.unscheduledTasks.length === 0) {
            list.innerHTML = '<div class="time-block-task-empty">No unscheduled tasks</div>';
            return;
        }

        list.innerHTML = this.unscheduledTasks.map(task => `
            <div class="time-block-task-option${task.important ? ' important' : ''}" data-id="${task.id}">
                <span class="task-bullet"></span>
                <span class="time-block-task-option-title">${this.escapeHtml(task.title)}</span>
            </div>
        `).join('');

        // Bind click events
        list.querySelectorAll('.time-block-task-option').forEach(option => {
            option.addEventListener('click', () => {
                // Toggle selection
                list.querySelectorAll('.time-block-task-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
            });
        });
    },

    /**
     * Filter task list by search text
     */
    filterTimeBlockTaskList(searchText) {
        const list = document.getElementById('time-block-task-list');
        if (!list) return;

        const search = searchText.toLowerCase().trim();
        const filteredTasks = search
            ? this.unscheduledTasks.filter(t => t.title.toLowerCase().includes(search))
            : this.unscheduledTasks;

        if (filteredTasks.length === 0) {
            list.innerHTML = search
                ? '<div class="time-block-task-empty">No matching tasks</div>'
                : '<div class="time-block-task-empty">No unscheduled tasks</div>';
            return;
        }

        list.innerHTML = filteredTasks.map(task => `
            <div class="time-block-task-option${task.important ? ' important' : ''}" data-id="${task.id}">
                <span class="task-bullet"></span>
                <span class="time-block-task-option-title">${this.escapeHtml(task.title)}</span>
            </div>
        `).join('');

        // Bind click events
        list.querySelectorAll('.time-block-task-option').forEach(option => {
            option.addEventListener('click', () => {
                list.querySelectorAll('.time-block-task-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
            });
        });
    },

    /**
     * Create/schedule task from time block popup
     */
    async createTimeBlockTask() {
        const input = document.getElementById('time-block-quick-input');
        const list = document.getElementById('time-block-task-list');
        const selectedOption = list?.querySelector('.time-block-task-option.selected');
        const state = this.timeBlockPopupState;

        if (!state) return;

        const { dateStr, startMinutes, endMinutes } = state;
        const startTime = this.formatMinutesAsTimeString(startMinutes);
        const endTime = this.formatMinutesAsTimeString(endMinutes);

        try {
            if (selectedOption) {
                // Schedule existing task
                const taskId = selectedOption.dataset.id;
                await this.scheduleTaskOnDate(taskId, dateStr, startTime, endTime, false);
            } else if (input.value.trim()) {
                // Create new task and schedule it
                const response = await api.createTaskItem({
                    title: input.value.trim(),
                    due_date: dateStr,
                    due_time: startTime
                });
                // Update the due_time_end
                if (response.item) {
                    await api.scheduleTaskItem(response.item.id, {
                        due_date: dateStr,
                        due_time: startTime,
                        due_time_end: endTime
                    });
                }
                await this.load();

                // Refresh Tasks tab if available
                if (typeof taskManager !== 'undefined' && taskManager.loadTasks) {
                    taskManager.loadTasks();
                    taskManager.loadCounts();
                }
            }

            this.closeTimeBlockPopup();
        } catch (err) {
            console.error('Failed to create/schedule task:', err);
            alert('Failed to create task: ' + err.message);
        }
    },

    /**
     * Close time block popup
     */
    closeTimeBlockPopup() {
        const popup = document.getElementById('time-block-popup');
        if (popup) {
            popup.classList.remove('open');
        }
        this.timeBlockPopupState = null;
        this.clearClickDragState();
    },

    // ==========================================
    // CLICK-DRAG SELECTION (on empty hour grid)
    // ==========================================

    /**
     * Start click-drag selection on an hour grid (15-minute increments)
     */
    startClickDrag(e, containerEl, dateStr, hour, yOffset) {
        // Don't start if clicking on an existing time block
        if (e.target.closest('.time-block') || e.target.closest('.all-day-event')) {
            return;
        }

        // Calculate minutes from Y position within the container (1px = 1 minute)
        const containerRect = containerEl.getBoundingClientRect();
        const relativeY = e.clientY - containerRect.top;
        const rawMinutes = Math.max(0, Math.min(24 * 60 - 1, relativeY));
        const snappedMinutes = this.snapToQuarterHour(rawMinutes);

        this.clickDragState = {
            active: true,
            startMinutes: snappedMinutes,
            currentMinutes: snappedMinutes,
            dateStr,
            previewEl: null,
            containerEl
        };

        this.createClickDragPreview(containerEl, snappedMinutes);

        // Add global listeners
        document.addEventListener('mousemove', this.onClickDragMove);
        document.addEventListener('mouseup', this.onClickDragEnd);
        document.addEventListener('touchmove', this.onClickDragTouchMove, { passive: false });
        document.addEventListener('touchend', this.onClickDragTouchEnd);
    },

    /**
     * Handle mouse move during click-drag
     */
    onClickDragMove: null, // Will be bound in init

    /**
     * Handle mouse up to end click-drag
     */
    onClickDragEnd: null, // Will be bound in init

    /**
     * Create visual preview for click-drag selection (15-minute minimum)
     */
    createClickDragPreview(containerEl, startMinutes) {
        this.removeClickDragPreview();

        const preview = document.createElement('div');
        preview.className = 'time-selection';
        preview.id = 'click-drag-preview';

        preview.style.top = `${startMinutes}px`; // 1px per minute
        preview.style.height = '15px'; // Start with 15 min block

        containerEl.style.position = 'relative';
        containerEl.appendChild(preview);
        this.clickDragState.previewEl = preview;
    },

    /**
     * Update click-drag preview during drag (15-minute increments)
     */
    updateClickDragPreview() {
        const state = this.clickDragState;
        if (!state.previewEl || !state.active) return;

        let startMins = state.startMinutes;
        let endMins = state.currentMinutes + 15; // Minimum 15-minute block

        // Swap if dragging upward
        if (startMins > state.currentMinutes) {
            startMins = state.currentMinutes;
            endMins = state.startMinutes + 15;
        }

        // Clamp to day boundaries
        startMins = Math.max(0, startMins);
        endMins = Math.min(24 * 60, endMins);

        const top = startMins; // 1px per minute
        const height = Math.max(15, endMins - startMins);

        state.previewEl.style.top = `${top}px`;
        state.previewEl.style.height = `${height}px`;
    },

    /**
     * Remove click-drag preview
     */
    removeClickDragPreview() {
        const existing = document.getElementById('click-drag-preview');
        if (existing) {
            existing.remove();
        }
        if (this.clickDragState.previewEl) {
            this.clickDragState.previewEl = null;
        }
    },

    /**
     * Clear click-drag state
     */
    clearClickDragState() {
        this.removeClickDragPreview();
        this.clickDragState = {
            active: false,
            startMinutes: null,
            currentMinutes: null,
            dateStr: null,
            previewEl: null,
            containerEl: null
        };
    },

    /**
     * Complete click-drag selection and show popup (15-minute increments)
     */
    completeClickDrag(e) {
        const state = this.clickDragState;
        if (!state.active || !state.dateStr) {
            this.clearClickDragState();
            return;
        }

        let startMins = state.startMinutes;
        let endMins = state.currentMinutes + 15;

        // Swap if dragging upward
        if (startMins > state.currentMinutes) {
            startMins = state.currentMinutes;
            endMins = state.startMinutes + 15;
        }

        // Ensure valid range
        startMins = Math.max(0, startMins);
        endMins = Math.min(24 * 60, endMins);

        // Open popup at mouse position (now using minutes)
        this.openTimeBlockPopup(state.dateStr, startMins, endMins, e.clientX, e.clientY);
    },

    /**
     * Mouse move handler for click-drag (bound in init, 15-minute increments)
     */
    _onClickDragMove(e) {
        const state = this.clickDragState;
        if (!state.active || !state.containerEl) return;

        // Calculate minutes from mouse Y position relative to container (1px = 1 minute)
        const containerRect = state.containerEl.getBoundingClientRect();
        const relativeY = e.clientY - containerRect.top;
        const rawMinutes = Math.max(0, Math.min(24 * 60 - 1, relativeY));

        // Snap to 15-minute increments
        state.currentMinutes = this.snapToQuarterHour(rawMinutes);
        this.updateClickDragPreview();
    },

    /**
     * Mouse up handler for click-drag (bound in init)
     */
    _onClickDragEnd(e) {
        // Remove global listeners
        document.removeEventListener('mousemove', this.onClickDragMove);
        document.removeEventListener('mouseup', this.onClickDragEnd);
        document.removeEventListener('touchmove', this.onClickDragTouchMove);
        document.removeEventListener('touchend', this.onClickDragTouchEnd);

        // Complete the selection
        this.completeClickDrag(e);
    },

    /**
     * Update total tasks count in sidebar header
     */
    updateTotalTasksCount() {
        const totalCount = document.getElementById('tasks-total-count');
        if (totalCount) {
            totalCount.textContent = this.scheduledTasks.length + this.unscheduledTasks.length;
        }
    },

    /**
     * Load scheduled tasks (task items with due_date)
     * Always loads ALL tasks - filtering by calendar is done in the calendar view only
     */
    async loadScheduledTasks() {
        try {
            // Always load all scheduled tasks for sidebar (no calendar filter)
            const response = await api.getScheduledTaskItems(null);
            this.scheduledTasks = (response.items || []).map(t => ({ ...t, _type: 'task' }));
            this.updateSidebarScheduled();
        } catch (err) {
            console.error('Failed to load scheduled tasks:', err);
        }
    },

    /**
     * Load unscheduled tasks (task items without due_date)
     * Always loads ALL tasks - filtering by calendar is done in the calendar view only
     */
    async loadUnscheduledTasks() {
        try {
            // Always load all unscheduled tasks for sidebar (no calendar filter)
            const response = await api.getUnscheduledTaskItems(null);
            this.unscheduledTasks = (response.items || []).map(t => ({ ...t, _type: 'task' }));
            this.updateSidebarUnscheduled();
        } catch (err) {
            console.error('Failed to load unscheduled tasks:', err);
        }
    },

    /**
     * Load calendar events for the currently visible date range
     */
    async loadCalendarEvents() {
        try {
            const { start, end } = this.getVisibleDateRange();
            const response = await api.getCalendarEvents(start, end);
            this.calendarEvents = (response.events || []).map(ev => ({ ...ev, _type: 'event' }));
        } catch (err) {
            console.error('Failed to load calendar events:', err);
        }
    },

    /**
     * Get the visible date range for the current view
     * @returns {{ start: string, end: string }} ISO date strings
     */
    getVisibleDateRange() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        let start, end;

        switch (this.currentView) {
            case 'month': {
                // Month view shows up to 6 weeks (prev month days through next month days)
                const firstDay = new Date(year, month, 1);
                const startDay = firstDay.getDay(); // 0 = Sunday
                start = new Date(year, month, 1 - startDay);
                end = new Date(start);
                end.setDate(end.getDate() + 42); // 6 weeks
                break;
            }
            case 'week': {
                start = this.getWeekStart(7);
                end = new Date(start);
                end.setDate(end.getDate() + 7);
                break;
            }
            case '3day': {
                start = this.getWeekStart(3);
                end = new Date(start);
                end.setDate(end.getDate() + 3);
                break;
            }
            case 'day': {
                start = new Date(this.currentDate);
                end = new Date(this.currentDate);
                end.setDate(end.getDate() + 1);
                break;
            }
            default: {
                start = new Date(year, month, 1);
                end = new Date(year, month + 1, 0);
            }
        }

        return {
            start: this.formatDateISO(start),
            end: this.formatDateISO(end)
        };
    },

    /**
     * Update sidebar scheduled tasks list (includes calendar events)
     */
    updateSidebarScheduled() {
        const container = document.getElementById('scheduled-tasks-list');
        const count = document.getElementById('scheduled-count');

        // Merge scheduled tasks and calendar events for sidebar
        const allScheduled = [...this.scheduledTasks, ...this.calendarEvents];
        // Sort by date then time
        allScheduled.sort((a, b) => {
            const dateA = a.due_date || a.event_date || '';
            const dateB = b.due_date || b.event_date || '';
            if (dateA !== dateB) return dateA.localeCompare(dateB);
            const timeA = a.due_time || a.start_time || '';
            const timeB = b.due_time || b.start_time || '';
            return timeA.localeCompare(timeB);
        });

        if (count) count.textContent = allScheduled.length;
        if (!container) return;

        if (allScheduled.length === 0) {
            container.innerHTML = '<div class="calendar-task-empty">No scheduled items</div>';
            return;
        }

        container.innerHTML = allScheduled.map(task => this.renderSidebarTask(task, true)).join('');
        this.bindSidebarTaskEvents(container);
    },

    /**
     * Update sidebar unscheduled tasks list
     */
    updateSidebarUnscheduled() {
        const container = document.getElementById('unscheduled-tasks-list');
        const count = document.getElementById('unscheduled-count');

        if (count) count.textContent = this.unscheduledTasks.length;
        if (!container) return;

        if (this.unscheduledTasks.length === 0) {
            container.innerHTML = '<div class="calendar-task-empty">No unscheduled tasks</div>';
            return;
        }

        container.innerHTML = this.unscheduledTasks.map(task => this.renderSidebarTask(task, false)).join('');
        this.bindSidebarTaskEvents(container);
    },

    /**
     * Render a sidebar task item
     */
    renderSidebarTask(task, isScheduled) {
        // Task items use 'important' flag instead of priority
        const isImportant = task.important;
        let timeDisplay = '';

        // Support both task fields (due_date/due_time) and event fields (event_date/start_time)
        const itemDate = task.due_date || task.event_date;
        const itemTime = task.due_time || task.start_time;
        const itemTimeEnd = task.due_time_end || task.end_time;

        if (isScheduled && itemDate) {
            const date = new Date(itemDate + 'T00:00:00');
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            if (itemTime) {
                const timeStr = itemTimeEnd
                    ? `${this.formatTime(itemTime)} - ${this.formatTime(itemTimeEnd)}`
                    : this.formatTime(itemTime);
                timeDisplay = `${dateStr} ${timeStr}`;
            } else {
                timeDisplay = dateStr;
            }
        }

        const isEvent = task._type === 'event';
        const color = this.getItemColor(task);
        let indicator;
        if (isImportant) {
            indicator = '<span class="important-star">★</span>';
        } else if (isEvent) {
            indicator = `<span class="sidebar-event-dot" style="background:${color}"></span>`;
        } else {
            indicator = '<span class="sidebar-task-checkbox">☐</span>';
        }

        return `
            <div class="calendar-task-item${isImportant ? ' important' : ''}${isEvent ? ' event-type' : ''}" data-id="${task.id}" draggable="true">
                ${indicator}
                <div class="calendar-task-info">
                    <div class="calendar-task-title">${this.escapeHtml(task.title)}</div>
                    ${timeDisplay ? `<div class="calendar-task-time">${timeDisplay}</div>` : ''}
                </div>
            </div>
        `;
    },

    /**
     * Bind events to sidebar task items
     */
    bindSidebarTaskEvents(container) {
        container.querySelectorAll('.calendar-task-item').forEach(item => {
            // Click to open task item modal
            item.addEventListener('click', () => {
                const taskId = item.dataset.id;
                const task = this.findTask(taskId);
                if (task) {
                    calendar.openItemModal(task);
                }
            });

            // Drag start
            item.addEventListener('dragstart', (e) => {
                item.classList.add('dragging');
                e.dataTransfer.setData('text/plain', item.dataset.id);
                e.dataTransfer.effectAllowed = 'move';
            });

            // Drag end
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });
        });
    },

    /**
     * Find a task or event by ID from any list
     */
    findTask(id) {
        return this.scheduledTasks.find(t => t.id === id) ||
               this.unscheduledTasks.find(t => t.id === id) ||
               this.calendarEvents.find(t => t.id === id);
    },

    /**
     * Switch to a different view
     */
    switchView(viewName) {
        this.currentView = viewName;

        // Update active button
        document.querySelectorAll('.calendar-view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });

        // Update active view container
        document.querySelectorAll('.calendar-view').forEach(view => {
            view.classList.toggle('active', view.dataset.view === viewName);
        });

        this.render();
    },

    /**
     * Navigate forward/backward
     */
    navigate(direction) {
        switch (this.currentView) {
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() + direction);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() + (7 * direction));
                break;
            case '3day':
                this.currentDate.setDate(this.currentDate.getDate() + (3 * direction));
                break;
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() + direction);
                break;
        }
        this.render();
    },

    /**
     * Go to today
     */
    goToToday() {
        this.currentDate = new Date();
        this.render();
    },

    /**
     * Main render function
     */
    render() {
        this.updateTitle();

        // Reload calendar events for new visible date range
        this.loadCalendarEvents();

        switch (this.currentView) {
            case 'month':
                this.renderMonthView();
                break;
            case 'week':
                this.renderWeekView();
                break;
            case '3day':
                this.renderThreeDayView();
                break;
            case 'day':
                this.renderDayView();
                break;
        }

        // Update current time indicator after rendering
        this.updateTimeIndicator();

        // Auto-scroll to current time on time-based views
        if (['day', 'week', '3day'].includes(this.currentView)) {
            this.scrollToCurrentTime();
        }
    },

    /**
     * Update the calendar title
     */
    updateTitle() {
        const titleEl = document.getElementById('calendar-title');
        if (!titleEl) return;

        const options = { year: 'numeric' };

        switch (this.currentView) {
            case 'month':
                options.month = 'long';
                titleEl.textContent = this.currentDate.toLocaleDateString('en-US', options);
                break;
            case 'week':
            case '3day':
                const start = this.getWeekStart(this.currentView === '3day' ? 3 : 7);
                const end = new Date(start);
                end.setDate(end.getDate() + (this.currentView === '3day' ? 2 : 6));

                if (start.getMonth() === end.getMonth()) {
                    titleEl.textContent = `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${end.getDate()}, ${start.getFullYear()}`;
                } else {
                    titleEl.textContent = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                }
                break;
            case 'day':
                titleEl.textContent = this.currentDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                });
                break;
        }
    },

    /**
     * Render Month View
     */
    renderMonthView() {
        const grid = document.getElementById('month-grid');
        if (!grid) return;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const today = new Date();

        // Get first day of month and total days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = firstDay.getDay(); // 0 = Sunday
        const totalDays = lastDay.getDate();

        // Get last days of previous month
        const prevMonthLastDay = new Date(year, month, 0).getDate();

        // Build grid cells
        let cells = [];

        // Previous month days
        for (let i = startDay - 1; i >= 0; i--) {
            const day = prevMonthLastDay - i;
            const date = new Date(year, month - 1, day);
            cells.push(this.renderMonthCell(date, true));
        }

        // Current month days
        for (let day = 1; day <= totalDays; day++) {
            const date = new Date(year, month, day);
            const isToday = date.toDateString() === today.toDateString();
            cells.push(this.renderMonthCell(date, false, isToday));
        }

        // Next month days (fill remaining)
        const remaining = 42 - cells.length;
        for (let day = 1; day <= remaining; day++) {
            const date = new Date(year, month + 1, day);
            cells.push(this.renderMonthCell(date, true));
        }

        grid.innerHTML = cells.join('');
        this.bindMonthCellEvents(grid);
    },

    /**
     * Render a single month cell
     */
    renderMonthCell(date, isOtherMonth, isToday = false) {
        const dateStr = this.formatDateISO(date);
        const dayTasks = this.getTasksForDate(dateStr);

        let classes = 'month-cell';
        if (isOtherMonth) classes += ' other-month';
        if (isToday) classes += ' today';

        const eventsHtml = dayTasks.slice(0, 3).map(task => {
            const importantClass = task.important ? ' important' : '';
            const isEvent = task._type === 'event';
            const typeClass = isEvent ? ' event-type' : ' task-type';
            const color = this.getItemColor(task);
            const indicator = isEvent
                ? `<span class="month-event-dot" style="background:${color}"></span>`
                : `<span class="month-task-checkbox">☐</span>`;
            const borderStyle = isEvent
                ? `border-left-color:${color};background:${this.hexToRgba(color, 0.15)}`
                : `border-left-color:${color};border-left-style:dashed;background:${this.hexToRgba(color, 0.1)}`;
            return `<div class="month-event${importantClass}${typeClass}" data-id="${task.id}" title="${this.escapeHtml(task.title)}" draggable="true" style="${borderStyle}">${indicator}${this.escapeHtml(task.title)}</div>`;
        }).join('');

        const moreCount = dayTasks.length - 3;
        const moreHtml = moreCount > 0 ? `<div class="month-more">+${moreCount} more</div>` : '';

        return `
            <div class="${classes}" data-date="${dateStr}">
                <div class="month-date">${date.getDate()}</div>
                <div class="month-events">
                    ${eventsHtml}
                    ${moreHtml}
                </div>
            </div>
        `;
    },

    /**
     * Bind events to month cells
     */
    bindMonthCellEvents(grid) {
        // Drop zone for scheduling
        grid.querySelectorAll('.month-cell').forEach(cell => {
            cell.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                cell.classList.add('calendar-drop-target');
            });

            cell.addEventListener('dragleave', () => {
                cell.classList.remove('calendar-drop-target');
            });

            cell.addEventListener('drop', async (e) => {
                e.preventDefault();
                cell.classList.remove('calendar-drop-target');

                const taskId = e.dataTransfer.getData('text/plain');
                const date = cell.dataset.date;

                if (taskId && date) {
                    // Open time picker to let user select a specific time
                    const task = this.findTask(taskId);
                    const taskTitle = task ? task.title : '';
                    this.openTimePicker(taskId, date, taskTitle);
                }
            });

            // Click on cell — open day detail modal for empty area
            cell.addEventListener('click', (e) => {
                if (e.target.classList.contains('month-event') || e.target.closest('.month-event')) {
                    return; // Handled by month-event click handler
                }
                // Clicked empty area of cell → open day detail timeline modal
                const date = cell.dataset.date;
                if (date) {
                    this.openDayDetailModal(date);
                }
            });
        });

        // Click and drag on events
        grid.querySelectorAll('.month-event').forEach(event => {
            event.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = event.dataset.id;
                const task = this.findTask(taskId);
                if (task) {
                    calendar.openItemModal(task);
                }
            });

            // Drag to reschedule
            event.addEventListener('dragstart', (e) => {
                e.stopPropagation();
                event.classList.add('dragging');
                e.dataTransfer.setData('text/plain', event.dataset.id);
                e.dataTransfer.effectAllowed = 'move';
            });

            event.addEventListener('dragend', () => {
                event.classList.remove('dragging');
            });
        });
    },

    /**
     * Schedule a task on a specific date
     */
    async scheduleTaskOnDate(taskId, date, startTime = null, endTime = null, isAllDay = true) {
        try {
            const scheduleData = {
                due_date: date
            };

            if (startTime && !isAllDay) {
                scheduleData.due_time = startTime;
                if (endTime) {
                    scheduleData.due_time_end = endTime;
                }
            }

            await api.scheduleTaskItem(taskId, scheduleData);
            await this.load(); // Reload calendar data

            // Also refresh the Tasks section so it shows updated times
            if (typeof taskManager !== 'undefined' && taskManager.loadTasks) {
                taskManager.loadTasks();
                taskManager.loadCounts();
            }
        } catch (err) {
            console.error('Failed to schedule task:', err);
            alert('Failed to schedule task: ' + err.message);
        }
    },

    /**
     * Render Week View
     */
    renderWeekView() {
        this.renderMultiDayView(7, 'week');
    },

    /**
     * Render 3-Day View
     */
    renderThreeDayView() {
        this.renderMultiDayView(3, 'three-day');
    },

    /**
     * Render multi-day view (Week or 3-Day)
     */
    renderMultiDayView(numDays, prefix) {
        const headerEl = document.getElementById(`${prefix}-header`);
        const columnsEl = document.getElementById(`${prefix}-columns`);
        const gutterEl = document.getElementById(`${prefix}-time-gutter`);
        const allDayCellsEl = document.getElementById(`${prefix}-all-day-cells`);

        if (!headerEl || !columnsEl || !gutterEl) return;

        const startDate = this.getWeekStart(numDays);
        const today = new Date();

        // Render header
        let headerHtml = '<div class="week-header-cell"></div>'; // Empty cell for gutter alignment
        for (let i = 0; i < numDays; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const isToday = date.toDateString() === today.toDateString();

            headerHtml += `
                <div class="week-header-cell${isToday ? ' today' : ''}" data-date="${this.formatDateISO(date)}">
                    <div class="week-header-day">${date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div class="week-header-date">${date.getDate()}</div>
                </div>
            `;
        }
        headerEl.innerHTML = headerHtml;

        // Render all-day cells (frozen row)
        if (allDayCellsEl) {
            let allDayCellsHtml = '';
            for (let i = 0; i < numDays; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateStr = this.formatDateISO(date);
                allDayCellsHtml += `<div class="week-all-day-cell" data-date="${dateStr}"></div>`;
            }
            allDayCellsEl.innerHTML = allDayCellsHtml;
        }

        // Render time gutter
        let gutterHtml = '';
        for (let hour = 0; hour < 24; hour++) {
            gutterHtml += `<div class="time-slot-label">${this.formatHour(hour)}</div>`;
        }
        gutterEl.innerHTML = gutterHtml;

        // Render columns (hour slots only - no all-day section inside)
        let columnsHtml = '';
        for (let i = 0; i < numDays; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const dateStr = this.formatDateISO(date);

            let slotsHtml = '';
            for (let hour = 0; hour < 24; hour++) {
                slotsHtml += `<div class="week-hour-slot" data-hour="${hour}" data-date="${dateStr}"></div>`;
            }

            columnsHtml += `
                <div class="week-column" data-date="${dateStr}">
                    ${slotsHtml}
                </div>
            `;
        }
        columnsEl.innerHTML = columnsHtml;

        // Place tasks on the grid (both all-day row and hour columns)
        this.placeTasksOnMultiDayView(columnsEl, allDayCellsEl, startDate, numDays);
        this.bindMultiDayViewEvents(columnsEl, allDayCellsEl);
    },

    /**
     * Place tasks on multi-day view grid
     */
    placeTasksOnMultiDayView(columnsEl, allDayCellsEl, startDate, numDays) {
        for (let i = 0; i < numDays; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const dateStr = this.formatDateISO(date);
            const dayTasks = this.getTasksForDate(dateStr);

            const column = columnsEl.querySelector(`.week-column[data-date="${dateStr}"]`);
            const allDayCell = allDayCellsEl?.querySelector(`.week-all-day-cell[data-date="${dateStr}"]`);

            const timedItems = [];

            dayTasks.forEach(task => {
                if (!task.due_time) {
                    if (allDayCell) {
                        const isEvent = task._type === 'event';
                        const color = this.getItemColor(task);
                        const el = document.createElement('div');
                        el.className = `all-day-event${task.important ? ' important' : ''}${isEvent ? ' event-type' : ' task-type'}`;
                        el.dataset.id = task.id;
                        el.draggable = true;
                        el.style.borderLeftColor = color;
                        el.style.background = this.hexToRgba(color, 0.15);
                        if (!isEvent) el.style.borderLeftStyle = 'dashed';
                        el.textContent = task.title;
                        el.title = task.title;
                        allDayCell.appendChild(el);
                    }
                } else {
                    timedItems.push(task);
                }
            });

            // Compute overlap and place timed items
            if (column && timedItems.length > 0) {
                const overlapData = this.computeOverlapColumns(timedItems);
                for (const entry of overlapData) {
                    this.placeTimedTask(column, entry.item, { col: entry.col, totalCols: entry.totalCols });
                }
            }
        }
    },

    /**
     * Place a timed task on a column (with overlap info)
     * @param {object} overlapInfo - { col, totalCols } from computeOverlapColumns (optional)
     */
    placeTimedTask(column, task, overlapInfo) {
        if (!task.due_time) return;

        const [startHour, startMin] = task.due_time.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;

        let endMinutes = startMinutes + 60;
        if (task.due_time_end) {
            const [endHour, endMin] = task.due_time_end.split(':').map(Number);
            endMinutes = endHour * 60 + endMin;
        }

        const top = (startMinutes / 60) * 60;
        const height = Math.max(((endMinutes - startMinutes) / 60) * 60, 20);

        const timeDisplay = task.due_time_end
            ? `${this.formatTime(task.due_time)} - ${this.formatTime(task.due_time_end)}`
            : this.formatTime(task.due_time);

        const isEvent = task._type === 'event';
        const typeClass = isEvent ? ' event-type' : ' task-type';
        const color = this.getItemColor(task);

        const block = document.createElement('div');
        block.className = `time-block${task.important ? ' important' : ''}${typeClass}`;
        block.dataset.id = task.id;
        block.draggable = true;
        block.style.top = `${top}px`;
        block.style.height = `${height}px`;
        block.style.borderLeftColor = color;
        block.style.background = this.hexToRgba(color, isEvent ? 0.15 : 0.1);

        if (!isEvent) {
            block.style.borderLeftStyle = 'dashed';
        }

        // Overlap positioning
        if (overlapInfo && overlapInfo.totalCols > 1) {
            const widthPct = 100 / overlapInfo.totalCols;
            const leftPct = widthPct * overlapInfo.col;
            block.style.left = `calc(${leftPct}% + 2px)`;
            block.style.right = 'auto';
            block.style.width = `calc(${widthPct}% - 4px)`;
        }

        const checkboxHtml = !isEvent ? '<span class="time-block-checkbox">☐</span> ' : '';

        block.innerHTML = `
            <div class="time-block-title">${checkboxHtml}${this.escapeHtml(task.title)}</div>
            <div class="time-block-time">${timeDisplay}</div>
        `;

        column.style.position = 'relative';
        column.appendChild(block);
    },

    /**
     * Bind events to multi-day view
     */
    bindMultiDayViewEvents(columnsEl, allDayCellsEl) {
        // Click and drag on time blocks in columns
        columnsEl.querySelectorAll('.time-block').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = el.dataset.id;
                const task = this.findTask(taskId);
                if (task) {
                    calendar.openItemModal(task);
                }
            });

            // Drag to reschedule
            el.addEventListener('dragstart', (e) => {
                e.stopPropagation();
                el.classList.add('dragging');
                e.dataTransfer.setData('text/plain', el.dataset.id);
                e.dataTransfer.effectAllowed = 'move';
            });

            el.addEventListener('dragend', () => {
                el.classList.remove('dragging');
            });
        });

        // Click and drag on all-day events in frozen row
        if (allDayCellsEl) {
            allDayCellsEl.querySelectorAll('.all-day-event').forEach(el => {
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const taskId = el.dataset.id;
                    const task = this.findTask(taskId);
                    if (task) {
                        calendar.openItemModal(task);
                    }
                });

                // Drag to reschedule
                el.addEventListener('dragstart', (e) => {
                    e.stopPropagation();
                    el.classList.add('dragging');
                    e.dataTransfer.setData('text/plain', el.dataset.id);
                    e.dataTransfer.effectAllowed = 'move';
                });

                el.addEventListener('dragend', () => {
                    el.classList.remove('dragging');
                });
            });
        }

        // Click-drag to create time blocks on empty hour slots
        columnsEl.querySelectorAll('.week-hour-slot').forEach(slot => {
            const handleSlotDrag = (e) => {
                const column = slot.closest('.week-column');
                const dateStr = slot.dataset.date || column.dataset.date;
                const hour = parseInt(slot.dataset.hour, 10);
                this.startClickDrag(e, column, dateStr, hour, 0);
            };
            slot.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                handleSlotDrag(e);
            });
            slot.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                handleSlotDrag({ clientX: touch.clientX, clientY: touch.clientY, target: e.target });
            }, { passive: false });
        });

        // Drag-and-drop scheduling for tasks from sidebar
        columnsEl.querySelectorAll('.week-hour-slot').forEach(slot => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                // Add hover feedback
                slot.classList.add('drag-hover');
            });

            slot.addEventListener('dragleave', () => {
                slot.classList.remove('drag-hover');
            });

            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('drag-hover');

                const taskId = e.dataTransfer.getData('text/plain');
                const column = slot.closest('.week-column');
                const date = column.dataset.date;
                const dropHour = parseInt(slot.dataset.hour, 10);

                // Clear any old drag preview
                this.clearDragState();

                if (taskId && date) {
                    // Create pending block at drop position for user to adjust
                    this.createPendingBlock(taskId, date, dropHour, column);
                }
            });
        });

        // Clear drag state when leaving the column area
        columnsEl.addEventListener('dragleave', (e) => {
            // Only clear if leaving the entire columns area
            if (!columnsEl.contains(e.relatedTarget)) {
                this.clearDragState();
            }
        });

        // Drop zones on all-day cells (frozen row)
        if (allDayCellsEl) {
            allDayCellsEl.querySelectorAll('.week-all-day-cell').forEach(cell => {
                cell.addEventListener('dragenter', () => {
                    this.clearDragState(); // Clear time selection when entering all-day
                });

                cell.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    cell.classList.add('calendar-drop-target');
                });

                cell.addEventListener('dragleave', () => {
                    cell.classList.remove('calendar-drop-target');
                });

                cell.addEventListener('drop', async (e) => {
                    e.preventDefault();
                    cell.classList.remove('calendar-drop-target');
                    this.clearDragState();

                    const taskId = e.dataTransfer.getData('text/plain');
                    const date = cell.dataset.date;

                    if (taskId && date) {
                        await this.scheduleTaskOnDate(taskId, date, null, null, true);
                    }
                });
            });
        }
    },

    /**
     * Create drag preview element
     */
    createDragPreview(column, startHour) {
        this.removeDragPreview();

        const preview = document.createElement('div');
        preview.className = 'time-selection';
        preview.id = 'drag-time-preview';

        const top = startHour * 60; // 60px per hour, no offset (all-day is outside columns)
        preview.style.top = `${top}px`;
        preview.style.height = '60px';

        column.style.position = 'relative';
        column.appendChild(preview);
        this.dragState.previewEl = preview;
    },

    /**
     * Update drag preview to show time range
     */
    updateDragPreview(column) {
        if (!this.dragState.previewEl || this.dragState.startHour === null) return;

        let startHour = this.dragState.startHour;
        let endHour = this.dragState.currentHour;

        // Swap if dragging upward
        if (startHour > endHour) {
            [startHour, endHour] = [endHour, startHour];
        }

        const top = startHour * 60; // No offset
        const height = (endHour - startHour + 1) * 60;

        this.dragState.previewEl.style.top = `${top}px`;
        this.dragState.previewEl.style.height = `${height}px`;
    },

    /**
     * Remove drag preview element
     */
    removeDragPreview() {
        const existing = document.getElementById('drag-time-preview');
        if (existing) {
            existing.remove();
        }
        this.dragState.previewEl = null;
    },

    /**
     * Clear all drag state
     */
    clearDragState() {
        this.removeDragPreview();
        this.dragState.taskId = null;
        this.dragState.startHour = null;
        this.dragState.currentHour = null;
        this.dragState.dateStr = null;
    },

    /**
     * Render Day View
     */
    renderDayView() {
        const headerEl = document.getElementById('day-header');
        const gutterEl = document.getElementById('day-time-gutter');
        const hourGridEl = document.getElementById('day-hour-grid');
        const allDayEventsEl = document.getElementById('day-all-day-events');

        if (!headerEl || !hourGridEl) return;

        const today = new Date();
        const isToday = this.currentDate.toDateString() === today.toDateString();
        const dateStr = this.formatDateISO(this.currentDate);

        // Render header
        headerEl.className = `day-header${isToday ? ' today' : ''}`;
        headerEl.innerHTML = `
            <div class="day-header-day">${this.currentDate.toLocaleDateString('en-US', { weekday: 'long' })}</div>
            <div class="day-header-date">${this.currentDate.getDate()}</div>
        `;

        // Render hour grid
        let hourGridHtml = '';
        for (let hour = 0; hour < 24; hour++) {
            hourGridHtml += `
                <div class="hour-row">
                    <div class="hour-label">${this.formatHour(hour)}</div>
                    <div class="hour-content" data-hour="${hour}" data-date="${dateStr}"></div>
                </div>
            `;
        }
        hourGridEl.innerHTML = hourGridHtml;

        // Clear all-day events
        if (allDayEventsEl) {
            allDayEventsEl.innerHTML = '';
        }

        // Place tasks
        const dayTasks = this.getTasksForDate(dateStr);
        const timedItems = [];
        dayTasks.forEach(task => {
            if (!task.due_time) {
                if (allDayEventsEl) {
                    const isEvent = task._type === 'event';
                    const color = this.getItemColor(task);
                    const el = document.createElement('div');
                    el.className = `all-day-event${task.important ? ' important' : ''}${isEvent ? ' event-type' : ' task-type'}`;
                    el.dataset.id = task.id;
                    el.draggable = true;
                    el.style.borderLeftColor = color;
                    el.style.background = this.hexToRgba(color, 0.15);
                    if (!isEvent) el.style.borderLeftStyle = 'dashed';
                    el.textContent = task.title;
                    allDayEventsEl.appendChild(el);
                }
            } else {
                timedItems.push(task);
            }
        });

        // Compute overlap and place timed items
        if (timedItems.length > 0) {
            const overlapData = this.computeOverlapColumns(timedItems);
            for (const entry of overlapData) {
                this.placeTimedTaskOnDayView(hourGridEl, entry.item, { col: entry.col, totalCols: entry.totalCols });
            }
        }

        this.bindDayViewEvents(hourGridEl, allDayEventsEl);
    },

    /**
     * Place a timed task on day view (with overlap info)
     */
    placeTimedTaskOnDayView(hourGridEl, task, overlapInfo) {
        if (!task.due_time) return;

        const [startHour, startMin] = task.due_time.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;

        let endMinutes = startMinutes + 60;
        if (task.due_time_end) {
            const [endHour, endMin] = task.due_time_end.split(':').map(Number);
            endMinutes = endHour * 60 + endMin;
        }

        const top = (startMinutes / 60) * 60;
        const height = Math.max(((endMinutes - startMinutes) / 60) * 60, 20);

        const timeDisplay = task.due_time_end
            ? `${this.formatTime(task.due_time)} - ${this.formatTime(task.due_time_end)}`
            : this.formatTime(task.due_time);

        const isEvent = task._type === 'event';
        const typeClass = isEvent ? ' event-type' : ' task-type';
        const color = this.getItemColor(task);

        const block = document.createElement('div');
        block.className = `time-block${task.important ? ' important' : ''}${typeClass}`;
        block.dataset.id = task.id;
        block.draggable = true;
        block.style.top = `${top}px`;
        block.style.height = `${height}px`;
        block.style.borderLeftColor = color;
        block.style.background = this.hexToRgba(color, isEvent ? 0.15 : 0.1);

        if (!isEvent) {
            block.style.borderLeftStyle = 'dashed';
        }

        // Day view overlap: positioned within the hour-content area (after 60px label)
        if (overlapInfo && overlapInfo.totalCols > 1) {
            const contentWidth = 100; // percentage of hour-content
            const widthPct = contentWidth / overlapInfo.totalCols;
            const leftPct = widthPct * overlapInfo.col;
            block.style.left = `calc(60px + ${leftPct}% - ${leftPct * 0.6}px + 2px)`;
            block.style.right = 'auto';
            block.style.width = `calc(${widthPct}% - ${widthPct * 0.6}px - 4px)`;
        }

        const checkboxHtml = !isEvent ? '<span class="time-block-checkbox">☐</span> ' : '';

        block.innerHTML = `
            <div class="time-block-title">${checkboxHtml}${this.escapeHtml(task.title)}</div>
            <div class="time-block-time">${timeDisplay}</div>
        `;

        hourGridEl.style.position = 'relative';
        hourGridEl.appendChild(block);
    },

    /**
     * Bind events to day view
     */
    bindDayViewEvents(hourGridEl, allDayEventsEl) {
        // Click and drag on time blocks
        hourGridEl.querySelectorAll('.time-block').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = el.dataset.id;
                const task = this.findTask(taskId);
                if (task) {
                    calendar.openItemModal(task);
                }
            });

            // Drag to reschedule
            el.addEventListener('dragstart', (e) => {
                e.stopPropagation();
                el.classList.add('dragging');
                e.dataTransfer.setData('text/plain', el.dataset.id);
                e.dataTransfer.effectAllowed = 'move';
            });

            el.addEventListener('dragend', () => {
                el.classList.remove('dragging');
            });
        });

        if (allDayEventsEl) {
            allDayEventsEl.querySelectorAll('.all-day-event').forEach(el => {
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const taskId = el.dataset.id;
                    const task = this.findTask(taskId);
                    if (task) {
                        calendar.openItemModal(task);
                    }
                });

                // Drag to reschedule
                el.addEventListener('dragstart', (e) => {
                    e.stopPropagation();
                    el.classList.add('dragging');
                    e.dataTransfer.setData('text/plain', el.dataset.id);
                    e.dataTransfer.effectAllowed = 'move';
                });

                el.addEventListener('dragend', () => {
                    el.classList.remove('dragging');
                });
            });

            // Drop zone for all-day
            const allDaySection = allDayEventsEl.closest('.all-day-section');
            if (allDaySection) {
                allDaySection.addEventListener('dragenter', () => {
                    this.clearDragState();
                });

                allDaySection.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    allDaySection.classList.add('calendar-drop-target');
                });

                allDaySection.addEventListener('dragleave', () => {
                    allDaySection.classList.remove('calendar-drop-target');
                });

                allDaySection.addEventListener('drop', async (e) => {
                    e.preventDefault();
                    allDaySection.classList.remove('calendar-drop-target');
                    this.clearDragState();

                    const taskId = e.dataTransfer.getData('text/plain');
                    const dateStr = this.formatDateISO(this.currentDate);

                    if (taskId) {
                        await this.scheduleTaskOnDate(taskId, dateStr, null, null, true);
                    }
                });
            }
        }

        // Click-drag to create time blocks on empty hour content
        hourGridEl.querySelectorAll('.hour-content').forEach(hourContent => {
            const handleHourDrag = (e) => {
                const hour = parseInt(hourContent.dataset.hour, 10);
                const dateStr = hourContent.dataset.date;
                this.startClickDrag(e, hourGridEl, dateStr, hour, 0);
            };
            hourContent.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                handleHourDrag(e);
            });
            hourContent.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                handleHourDrag({ clientX: touch.clientX, clientY: touch.clientY, target: e.target });
            }, { passive: false });
        });

        // Drag-and-drop scheduling for tasks from sidebar (Day view)
        hourGridEl.querySelectorAll('.hour-content').forEach(hourContent => {
            hourContent.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                hourContent.classList.add('drag-hover');
            });

            hourContent.addEventListener('dragleave', () => {
                hourContent.classList.remove('drag-hover');
            });

            hourContent.addEventListener('drop', (e) => {
                e.preventDefault();
                hourContent.classList.remove('drag-hover');

                const taskId = e.dataTransfer.getData('text/plain');
                const date = hourContent.dataset.date;
                const dropHour = parseInt(hourContent.dataset.hour, 10);

                // Clear any old drag state
                this.clearDragState();

                if (taskId && date) {
                    // Create pending block at drop position for user to adjust
                    this.createPendingBlock(taskId, date, dropHour, hourGridEl);
                }
            });
        });
    },

    /**
     * Create drag preview for day view
     */
    createDayDragPreview(hourGridEl, startHour) {
        this.removeDragPreview();

        const preview = document.createElement('div');
        preview.className = 'time-selection';
        preview.id = 'drag-time-preview';

        // Position relative to the hour grid
        const hourRow = hourGridEl.querySelector(`.hour-content[data-hour="${startHour}"]`);
        if (!hourRow) return;

        const hourRowParent = hourRow.closest('.hour-row');
        if (!hourRowParent) return;

        // Get offset from top of hour grid
        const gridRect = hourGridEl.getBoundingClientRect();
        const rowRect = hourRowParent.getBoundingClientRect();
        const top = rowRect.top - gridRect.top;

        preview.style.top = `${top}px`;
        preview.style.height = '60px';
        preview.style.left = '60px'; // After time label
        preview.style.right = '0';

        hourGridEl.style.position = 'relative';
        hourGridEl.appendChild(preview);
        this.dragState.previewEl = preview;
    },

    /**
     * Update drag preview for day view
     */
    updateDayDragPreview(hourGridEl) {
        if (!this.dragState.previewEl || this.dragState.startHour === null) return;

        let startHour = this.dragState.startHour;
        let endHour = this.dragState.currentHour;

        // Swap if dragging upward
        if (startHour > endHour) {
            [startHour, endHour] = [endHour, startHour];
        }

        // Calculate position
        const startRow = hourGridEl.querySelector(`.hour-content[data-hour="${startHour}"]`)?.closest('.hour-row');
        if (!startRow) return;

        const gridRect = hourGridEl.getBoundingClientRect();
        const rowRect = startRow.getBoundingClientRect();
        const top = rowRect.top - gridRect.top;
        const height = (endHour - startHour + 1) * 60;

        this.dragState.previewEl.style.top = `${top}px`;
        this.dragState.previewEl.style.height = `${height}px`;
    },

    // ==========================================
    // PENDING BLOCK (drop-then-resize workflow)
    // ==========================================

    /**
     * Create a pending time block after dropping a task
     * @param {string} taskId - The task being scheduled
     * @param {string} dateStr - The date (YYYY-MM-DD)
     * @param {number} dropHour - The hour slot where the task was dropped
     * @param {HTMLElement} containerEl - The column/grid element to place the block in
     */
    createPendingBlock(taskId, dateStr, dropHour, containerEl) {
        // Cancel any existing pending block
        this.cancelPendingBlock();

        const task = this.findTask(taskId);
        const taskTitle = task ? task.title : 'Task';

        // Convert hour to minutes and default to 1-hour (60 min) duration
        const startMinutes = dropHour * 60;
        const endMinutes = Math.min(startMinutes + 60, 24 * 60);

        // Detect if this is Day view (hour-grid) or Week view (week-column)
        const isDayView = containerEl.classList.contains('hour-grid');

        // Create the pending block element
        const block = document.createElement('div');
        block.className = 'pending-block';
        block.id = 'pending-time-block';

        // Position the block (1px per minute)
        block.style.top = `${startMinutes}px`;
        block.style.height = `${endMinutes - startMinutes}px`;

        // For Day view, offset for the time label column
        if (isDayView) {
            block.style.left = '64px';  // After the 60px hour-label + a bit of padding
            block.style.right = '4px';
        }

        block.innerHTML = `
            <div class="pending-block-handle top" data-edge="top"></div>
            <div class="pending-block-content">
                <div class="pending-block-title">${this.escapeHtml(taskTitle)}</div>
                <div class="pending-block-time">${this.formatMinutesForDisplay(startMinutes)} - ${this.formatMinutesForDisplay(endMinutes)}</div>
                <div class="pending-block-hint">Click to confirm • ESC to cancel</div>
            </div>
            <div class="pending-block-handle bottom" data-edge="bottom"></div>
        `;

        containerEl.style.position = 'relative';
        containerEl.appendChild(block);

        // Store state including view type (using minutes)
        this.pendingBlockState = {
            active: true,
            taskId,
            taskTitle,
            dateStr,
            startMinutes,
            endMinutes,
            element: block,
            containerEl,
            resizing: null,
            isDayView
        };

        // Bind events
        this.bindPendingBlockEvents(block, containerEl);
    },

    /**
     * Bind events to the pending block
     */
    bindPendingBlockEvents(block, containerEl) {
        // Handle resize on handles
        const handles = block.querySelectorAll('.pending-block-handle');
        handles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const edge = handle.dataset.edge;
                this.startPendingBlockResize(edge, containerEl);
            });
            handle.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const edge = handle.dataset.edge;
                this.startPendingBlockResize(edge, containerEl);
            }, { passive: false });
        });

        // Click on content area confirms (not on handles)
        const content = block.querySelector('.pending-block-content');
        if (content) {
            content.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!this.pendingBlockState.resizing) {
                    this.confirmPendingBlock();
                }
            });
        }
    },

    /**
     * Start resizing the pending block
     */
    startPendingBlockResize(edge, containerEl) {
        if (!this.pendingBlockState.active) return;

        this.pendingBlockState.resizing = edge;
        if (this.pendingBlockState.element) {
            this.pendingBlockState.element.classList.add('resizing');
        }

        // Bound handlers
        const onMouseMove = (e) => this.onPendingBlockResize(e, containerEl);
        const onMouseUp = () => {
            this.endPendingBlockResize();
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
        };
        const onTouchMove = (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.onPendingBlockResize({ clientX: touch.clientX, clientY: touch.clientY }, containerEl);
        };
        const onTouchEnd = () => onMouseUp();

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
    },

    /**
     * Handle mouse move during pending block resize (15-minute increments)
     */
    onPendingBlockResize(e, containerEl) {
        const state = this.pendingBlockState;
        if (!state.active || !state.resizing || !containerEl) return;

        // Calculate minutes from mouse Y position (1px = 1 minute)
        const containerRect = containerEl.getBoundingClientRect();
        const relativeY = e.clientY - containerRect.top;
        const rawMinutes = Math.max(0, Math.min(24 * 60, relativeY));
        const snappedMinutes = this.snapToQuarterHour(rawMinutes);

        if (state.resizing === 'top') {
            // Resizing start time - can't go past end (minimum 15 min block)
            const newStart = Math.min(snappedMinutes, state.endMinutes - 15);
            state.startMinutes = Math.max(0, newStart);
        } else if (state.resizing === 'bottom') {
            // Resizing end time - can't go before start (minimum 15 min block)
            const newEnd = Math.max(snappedMinutes, state.startMinutes + 15);
            state.endMinutes = Math.min(newEnd, 24 * 60);
        }

        this.updatePendingBlockDisplay();
    },

    /**
     * End pending block resize
     */
    endPendingBlockResize() {
        if (this.pendingBlockState.element) {
            this.pendingBlockState.element.classList.remove('resizing');
        }
        this.pendingBlockState.resizing = null;
    },

    /**
     * Update the pending block's visual display (using minutes)
     */
    updatePendingBlockDisplay() {
        const state = this.pendingBlockState;
        if (!state.active || !state.element) return;

        const top = state.startMinutes; // 1px per minute
        const height = state.endMinutes - state.startMinutes;

        state.element.style.top = `${top}px`;
        state.element.style.height = `${height}px`;

        // Update time display
        const timeEl = state.element.querySelector('.pending-block-time');
        if (timeEl) {
            timeEl.textContent = `${this.formatMinutesForDisplay(state.startMinutes)} - ${this.formatMinutesForDisplay(state.endMinutes)}`;
        }
    },

    /**
     * Confirm the pending block and schedule the task (using minutes)
     */
    async confirmPendingBlock() {
        const state = this.pendingBlockState;
        if (!state.active || !state.taskId || !state.dateStr) {
            this.cancelPendingBlock();
            return;
        }

        const startTime = this.formatMinutesAsTimeString(state.startMinutes);
        const endTime = this.formatMinutesAsTimeString(state.endMinutes);

        // Remove the pending block element
        if (state.element) {
            state.element.remove();
        }

        // Clear state before async call
        this.clearPendingBlockState();

        // Schedule the task
        await this.scheduleTaskOnDate(state.taskId, state.dateStr, startTime, endTime, false);
    },

    /**
     * Cancel the pending block without scheduling
     */
    cancelPendingBlock() {
        const state = this.pendingBlockState;
        if (state.element) {
            state.element.remove();
        }
        this.clearPendingBlockState();
    },

    /**
     * Clear the pending block state
     */
    clearPendingBlockState() {
        this.pendingBlockState = {
            active: false,
            taskId: null,
            taskTitle: null,
            dateStr: null,
            startMinutes: null,
            endMinutes: null,
            element: null,
            containerEl: null,
            resizing: null,
            isDayView: false
        };
    },

    // ==========================================
    // CURRENT TIME INDICATOR
    // ==========================================

    // Timer for updating the time indicator
    timeIndicatorTimer: null,

    /**
     * Start the time indicator update timer
     */
    startTimeIndicatorTimer() {
        // Clear any existing timer
        this.stopTimeIndicatorTimer();

        // Update every minute
        this.timeIndicatorTimer = setInterval(() => {
            this.updateTimeIndicator();
        }, 60000);
    },

    /**
     * Stop the time indicator timer
     */
    stopTimeIndicatorTimer() {
        if (this.timeIndicatorTimer) {
            clearInterval(this.timeIndicatorTimer);
            this.timeIndicatorTimer = null;
        }
    },

    /**
     * Update the current time indicator position
     */
    updateTimeIndicator() {
        // Only show for day, week, and 3day views
        if (!['day', 'week', '3day'].includes(this.currentView)) {
            this.removeTimeIndicator();
            return;
        }

        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const totalMinutes = hours * 60 + minutes;
        const topPosition = totalMinutes; // 1px per minute = 60px per hour

        if (this.currentView === 'day') {
            this.renderDayTimeIndicator(topPosition);
        } else {
            // Week or 3-Day view
            this.renderMultiDayTimeIndicator(topPosition);
        }
    },

    /**
     * Render time indicator for Day view
     */
    renderDayTimeIndicator(topPosition) {
        const hourGrid = document.getElementById('day-hour-grid');
        if (!hourGrid) return;

        // Check if today is being displayed
        const today = new Date();
        if (this.currentDate.toDateString() !== today.toDateString()) {
            this.removeTimeIndicator();
            return;
        }

        let indicator = document.getElementById('current-time-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'current-time-indicator';
            indicator.className = 'current-time-indicator';
            hourGrid.style.position = 'relative';
            hourGrid.appendChild(indicator);
        }

        indicator.style.top = `${topPosition}px`;
    },

    /**
     * Render time indicator for Week/3-Day views
     */
    renderMultiDayTimeIndicator(topPosition) {
        const prefix = this.currentView === '3day' ? 'three-day' : 'week';
        const columnsEl = document.getElementById(`${prefix}-columns`);
        if (!columnsEl) return;

        // Find today's column
        const today = new Date();
        const todayStr = this.formatDateISO(today);
        const todayColumn = columnsEl.querySelector(`.week-column[data-date="${todayStr}"]`);

        if (!todayColumn) {
            // Today is not visible in this view
            this.removeTimeIndicator();
            return;
        }

        let indicator = document.getElementById('current-time-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'current-time-indicator';
            indicator.className = 'current-time-indicator';
        }

        // Position within today's column
        todayColumn.style.position = 'relative';
        if (indicator.parentNode !== todayColumn) {
            todayColumn.appendChild(indicator);
        }

        indicator.style.top = `${topPosition}px`;
    },

    /**
     * Remove the time indicator
     */
    removeTimeIndicator() {
        const indicator = document.getElementById('current-time-indicator');
        if (indicator) {
            indicator.remove();
        }
    },

    /**
     * Auto-scroll the view so current time is visible
     */
    scrollToCurrentTime() {
        const now = new Date();
        const totalMinutes = now.getHours() * 60 + now.getMinutes();
        // Scroll so current time is roughly 1/3 from top
        const scrollTarget = Math.max(0, totalMinutes - 200);

        let scrollContainer = null;
        if (this.currentView === 'day') {
            scrollContainer = document.querySelector('.calendar-view[data-view="day"] .day-body');
        } else {
            const viewKey = this.currentView === '3day' ? '3day' : 'week';
            scrollContainer = document.querySelector(`.calendar-view[data-view="${viewKey}"] .week-body`);
        }

        if (scrollContainer) {
            scrollContainer.scrollTop = scrollTarget;
        }
    },

    /**
     * Update time indicator in the time picker modal
     */
    updateTimePickerIndicator() {
        const hoursContainer = document.getElementById('time-picker-hours');
        if (!hoursContainer) return;

        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const topPosition = hours * 60 + minutes;

        let indicator = document.getElementById('time-picker-time-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'time-picker-time-indicator';
            indicator.className = 'current-time-indicator';
            hoursContainer.style.position = 'relative';
            hoursContainer.appendChild(indicator);
        }

        indicator.style.top = `${topPosition}px`;
    },

    // ==================
    // OVERLAP ALGORITHM
    // ==================

    /**
     * Compute overlap columns for a list of timed items.
     * Returns array of { item, col, totalCols } objects.
     */
    computeOverlapColumns(items) {
        if (!items.length) return [];

        // Parse start/end minutes for each item
        const parsed = items.map(item => {
            const [sh, sm] = item.due_time.split(':').map(Number);
            const startMin = sh * 60 + sm;
            let endMin = startMin + 60;
            if (item.due_time_end) {
                const [eh, em] = item.due_time_end.split(':').map(Number);
                endMin = eh * 60 + em;
            }
            return { item, startMin, endMin, col: 0 };
        });

        // Sort by start time, then by longer duration first
        parsed.sort((a, b) => a.startMin - b.startMin || (b.endMin - b.startMin) - (a.endMin - a.startMin));

        // Greedy column assignment
        // columns[i] = end time of the last item placed in column i
        const columns = [];
        for (const p of parsed) {
            let placed = false;
            for (let c = 0; c < columns.length; c++) {
                if (columns[c] <= p.startMin) {
                    p.col = c;
                    columns[c] = p.endMin;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                p.col = columns.length;
                columns.push(p.endMin);
            }
        }

        // Now determine the max overlapping columns for each connected group
        // Two items are in the same group if they overlap transitively
        const totalCols = columns.length;

        // Simple approach: for each item, totalCols = columns.length (max concurrent)
        // More accurate: find connected components. Let's do the simple version.
        // Actually let's do connected components for correctness.
        const groups = []; // array of arrays of parsed items
        const visited = new Set();

        for (let i = 0; i < parsed.length; i++) {
            if (visited.has(i)) continue;
            const group = [i];
            visited.add(i);
            const queue = [i];
            while (queue.length) {
                const curr = queue.shift();
                for (let j = 0; j < parsed.length; j++) {
                    if (visited.has(j)) continue;
                    // Check overlap between curr and j
                    if (parsed[curr].startMin < parsed[j].endMin && parsed[j].startMin < parsed[curr].endMin) {
                        visited.add(j);
                        group.push(j);
                        queue.push(j);
                    }
                }
            }
            groups.push(group);
        }

        // For each group, find max col + 1
        for (const group of groups) {
            const maxCol = Math.max(...group.map(i => parsed[i].col)) + 1;
            for (const i of group) {
                parsed[i].totalCols = maxCol;
            }
        }

        return parsed;
    },

    /**
     * Get the display color for an item (event or task)
     */
    getItemColor(item) {
        return item.calendar_color || getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#FF8C00';
    },

    // ==================
    // HELPER FUNCTIONS
    // ==================

    /**
     * Check if a task belongs to any of the selected calendars
     */
    taskMatchesSelectedCalendars(task) {
        // If no calendars are selected, show nothing on the calendar view
        if (this.selectedCalendarIds.length === 0) {
            return false;
        }
        // If task has no calendar associations, show it (legacy tasks)
        // This ensures tasks created before calendar feature still appear
        if (!task.calendar_ids || task.calendar_ids.length === 0) {
            return true;
        }
        // Check if any of the task's calendars are selected
        return task.calendar_ids.some(calId => this.selectedCalendarIds.includes(calId));
    },

    // ==========================================
    // DAY DETAIL MODAL (month cell tap → timeline)
    // ==========================================

    /**
     * Open the day detail modal showing a full timeline for a date
     */
    openDayDetailModal(dateStr) {
        const modal = document.getElementById('day-detail-modal');
        if (!modal) return;

        const date = new Date(dateStr + 'T00:00:00');
        const titleEl = document.getElementById('day-detail-title');
        if (titleEl) {
            titleEl.textContent = date.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
            });
        }

        const dayTasks = this.getTasksForDate(dateStr);

        // Separate all-day (no time) vs time-blocked items
        const allDayItems = dayTasks.filter(t => {
            const time = t.due_time || t.start_time;
            return !time;
        });
        const timedItems = dayTasks.filter(t => {
            const time = t.due_time || t.start_time;
            return !!time;
        });

        // Render all-day section
        const allDayContainer = document.getElementById('day-detail-all-day');
        const allDayItemsEl = document.getElementById('day-detail-all-day-items');
        if (allDayItems.length === 0) {
            allDayContainer.style.display = 'none';
        } else {
            allDayContainer.style.display = '';
            allDayItemsEl.innerHTML = allDayItems.map(item => {
                const color = this.getItemColor(item);
                const isEvent = item._type === 'event';
                const typeClass = isEvent ? 'event-type' : 'task-type';
                return `<div class="day-detail-all-day-item ${typeClass}" data-id="${item.id}" style="border-left-color:${color};background:${this.hexToRgba(color, 0.15)};color:var(--text-primary)">${this.escapeHtml(item.title)}</div>`;
            }).join('');

            // Bind click events on all-day items
            allDayItemsEl.querySelectorAll('.day-detail-all-day-item').forEach(el => {
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const task = this.findTask(el.dataset.id);
                    if (task) this.openItemModal(task);
                });
            });
        }

        // Render hour grid + time blocks
        const timeline = document.getElementById('day-detail-timeline');
        let html = '';

        // Hour rows
        for (let hour = 0; hour < 24; hour++) {
            html += `<div class="day-detail-hour-row" style="top:${hour * 60}px">
                <div class="day-detail-hour-label">${this.formatHour(hour)}</div>
                <div class="day-detail-hour-slot"></div>
            </div>`;
        }

        // Time blocks
        timedItems.forEach(item => {
            const startTime = item.due_time || item.start_time;
            const endTime = item.due_time_end || item.end_time;
            const [sh, sm] = startTime.split(':').map(Number);
            const startMins = sh * 60 + sm;

            let endMins;
            if (endTime) {
                const [eh, em] = endTime.split(':').map(Number);
                endMins = eh * 60 + em;
            } else {
                endMins = startMins + 60; // Default 1 hour
            }

            const top = startMins; // 1px per minute
            const height = Math.max(20, endMins - startMins);
            const color = this.getItemColor(item);
            const isEvent = item._type === 'event';
            const typeClass = isEvent ? 'event-type' : 'task-type';
            const timeStr = endTime
                ? `${this.formatTime(startTime)} – ${this.formatTime(endTime)}`
                : this.formatTime(startTime);

            html += `<div class="day-detail-time-block ${typeClass}" data-id="${item.id}" style="top:${top}px;height:${height}px;border-left-color:${color};background:${this.hexToRgba(color, 0.2)}">
                <div class="day-detail-block-title">${this.escapeHtml(item.title)}</div>
                <div class="day-detail-block-time">${timeStr}</div>
            </div>`;
        });

        // Current time indicator if viewing today
        const today = this.formatDateISO(new Date());
        if (dateStr === today) {
            const now = new Date();
            const nowMins = now.getHours() * 60 + now.getMinutes();
            html += `<div class="day-detail-now-line" style="top:${nowMins}px"></div>`;
        }

        timeline.innerHTML = html;

        // Bind click on time blocks
        timeline.querySelectorAll('.day-detail-time-block').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const task = this.findTask(el.dataset.id);
                if (task) this.openItemModal(task);
            });
        });

        // Open modal
        modal.classList.add('open');

        // Close handlers
        document.getElementById('day-detail-close').onclick = () => this.closeDayDetailModal();
        modal.querySelector('.day-detail-backdrop').onclick = () => this.closeDayDetailModal();

        // Scroll to ~7 AM or current time
        const scrollEl = document.getElementById('day-detail-scroll');
        if (scrollEl) {
            if (dateStr === today) {
                const now = new Date();
                const nowMins = now.getHours() * 60 + now.getMinutes();
                scrollEl.scrollTop = Math.max(0, nowMins - 60);
            } else {
                scrollEl.scrollTop = 7 * 60; // 7 AM
            }
        }
    },

    /**
     * Close the day detail modal
     */
    closeDayDetailModal() {
        const modal = document.getElementById('day-detail-modal');
        if (modal) modal.classList.remove('open');
    },

    /**
     * Get tasks and events for a specific date (filtered by selected calendars)
     */
    getTasksForDate(dateStr) {
        const tasks = this.scheduledTasks.filter(task =>
            task.due_date === dateStr && this.taskMatchesSelectedCalendars(task)
        );

        // Include calendar events for this date
        const events = this.calendarEvents.filter(ev => {
            // Match events by event_date (or start_date depending on schema)
            const evDate = ev.event_date || ev.start_date;
            return evDate === dateStr;
        });

        return [...tasks, ...events];
    },

    /**
     * Get the start date for week/3-day view
     */
    getWeekStart(numDays) {
        const date = new Date(this.currentDate);
        if (numDays === 7) {
            // Week starts on Sunday
            const day = date.getDay();
            date.setDate(date.getDate() - day);
        }
        // For 3-day, use current date as start
        return date;
    },

    /**
     * Format date as ISO string (YYYY-MM-DD)
     */
    formatDateISO(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * Format hour for display (e.g., "9 AM")
     */
    formatHour(hour) {
        if (hour === 0) return '12 AM';
        if (hour === 12) return '12 PM';
        if (hour < 12) return `${hour} AM`;
        return `${hour - 12} PM`;
    },

    /**
     * Format time string (HH:MM) for display
     */
    formatTime(timeStr) {
        if (!timeStr) return '';
        const [hour, min] = timeStr.split(':').map(Number);
        const suffix = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return min === 0 ? `${displayHour} ${suffix}` : `${displayHour}:${min.toString().padStart(2, '0')} ${suffix}`;
    },

    /**
     * Snap minutes to nearest 15-minute increment
     */
    snapToQuarterHour(minutes) {
        return Math.round(minutes / 15) * 15;
    },

    /**
     * Format total minutes (since midnight) as "HH:MM" for API
     */
    formatMinutesAsTimeString(totalMinutes) {
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    },

    /**
     * Format total minutes (since midnight) for display (e.g., "2:30 PM")
     */
    formatMinutesForDisplay(totalMinutes) {
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        const suffix = hours >= 12 ? 'PM' : 'AM';
        const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        return mins === 0 ? `${displayHour} ${suffix}` : `${displayHour}:${mins.toString().padStart(2, '0')} ${suffix}`;
    },

    /**
     * Convert hex color to rgba string
     */
    hexToRgba(hex, alpha) {
        // Handle shorthand and full hex
        let r = 0, g = 0, b = 0;
        if (hex.startsWith('#')) hex = hex.slice(1);
        if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length === 6) {
            r = parseInt(hex.slice(0, 2), 16);
            g = parseInt(hex.slice(2, 4), 16);
            b = parseInt(hex.slice(4, 6), 16);
        } else {
            return `rgba(255, 140, 0, ${alpha})`; // fallback orange
        }
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },

    /**
     * Open the appropriate modal for a task or event item
     */
    openItemModal(item) {
        if (!item) return;
        if (item._type === 'event' && typeof eventModal !== 'undefined') {
            eventModal.open({ event: item });
        } else if (typeof taskModal !== 'undefined') {
            taskModal.openTask(item);
        }
    },

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => calendar.init());

// Make available globally
window.calendar = calendar;
