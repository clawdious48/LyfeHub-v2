/**
 * API Client for Kanban Board
 * Handles all HTTP requests with authentication
 */

const api = {
    baseUrl: '/api',

    /**
     * Make an authenticated API request
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;

        const config = {
            ...options,
            credentials: 'include', // Include cookies for JWT
        };

        if (options.body instanceof FormData) {
            // FormData: let browser set Content-Type with multipart boundary
            config.body = options.body;
            config.headers = { ...options.headers };
        } else {
            // JSON: set Content-Type and stringify object bodies
            config.headers = {
                'Content-Type': 'application/json',
                ...options.headers,
            };
            if (options.body && typeof options.body === 'object') {
                config.body = JSON.stringify(options.body);
            }
        }

        const response = await fetch(url, config);

        // Handle auth errors
        if (response.status === 401) {
            // Redirect to login if not authenticated (except on auth pages)
            const authPages = ['/login.html', '/login', '/profile.html', '/profile'];
            if (!authPages.some(p => window.location.pathname.endsWith(p))) {
                window.location.href = '/login.html';
            }
            throw new Error('Unauthorized');
        }

        // Parse response
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            throw new Error(data.error || data.message || `HTTP ${response.status}`);
        }

        return data;
    },

    // ========================================
    // AUTH
    // ========================================

    /**
     * Auth: Sign up with email and password
     */
    async signup(name, email, password) {
        return this.request('/auth/signup', {
            method: 'POST',
            body: { name, email, password },
        });
    },

    /**
     * Auth: Login with email and password
     * @param {boolean} rememberMe - If true, session persists for 30 days; otherwise session-only
     */
    async login(email, password, rememberMe = true) {
        return this.request('/auth/login', {
            method: 'POST',
            body: { email, password, rememberMe },
        });
    },

    /**
     * Auth: Logout
     */
    async logout() {
        return this.request('/auth/logout', {
            method: 'POST',
        });
    },

    /**
     * Auth: Check if currently authenticated
     */
    async checkAuth() {
        return this.request('/auth/check');
    },

    // ========================================
    // USER PROFILE
    // ========================================

    /**
     * Profile: Get current user profile
     */
    async getProfile() {
        return this.request('/users/me');
    },

    /**
     * Profile: Update current user profile
     */
    async updateProfile(data) {
        return this.request('/users/me', {
            method: 'PATCH',
            body: data,
        });
    },

    // Team Assignments
    async getTeamAssignments() {
        return this.request('/users/team-assignments');
    },

    // Employee Management
    async getEmployees() {
        return this.request('/users/employees');
    },
    async createEmployee(data) {
        return this.request('/users/employees', { method: 'POST', body: data });
    },
    async updateEmployee(id, data) {
        return this.request(`/users/employees/${id}`, { method: 'PATCH', body: data });
    },
    async deleteEmployee(id) {
        return this.request(`/users/employees/${id}`, { method: 'DELETE' });
    },
    async bulkDeleteEmployees(ids) {
        return this.request('/users/employees/bulk-delete', { method: 'POST', body: { ids } });
    },

    /**
     * Profile: Change password
     */
    async changePassword(currentPassword, newPassword) {
        return this.request('/users/me/password', {
            method: 'PUT',
            body: { currentPassword, newPassword },
        });
    },

    // ========================================
    // TASKS
    // ========================================

    /**
     * Tasks: Get all tasks
     */
    async getTasks(status = null) {
        const query = status ? `?status=${encodeURIComponent(status)}` : '';
        return this.request(`/tasks${query}`);
    },

    /**
     * Tasks: Get single task by ID
     */
    async getTask(id) {
        return this.request(`/tasks/${id}`);
    },

    /**
     * Tasks: Create new task
     */
    async createTask(task) {
        return this.request('/tasks', {
            method: 'POST',
            body: task,
        });
    },

    /**
     * Tasks: Update existing task
     */
    async updateTask(id, updates) {
        return this.request(`/tasks/${id}`, {
            method: 'PATCH',
            body: updates,
        });
    },

    /**
     * Tasks: Delete task
     */
    async deleteTask(id) {
        return this.request(`/tasks/${id}`, {
            method: 'DELETE',
        });
    },

    /**
     * Tasks: Pick/claim a task (for AI agents)
     */
    async pickTask(id) {
        return this.request(`/tasks/${id}/pick`, {
            method: 'POST',
        });
    },

    /**
     * Tasks: Mark task as complete (moves to review)
     */
    async completeTask(id) {
        return this.request(`/tasks/${id}/complete`, {
            method: 'POST',
        });
    },

    /**
     * Tasks: Submit review for a task
     */
    async submitReview(id, reviewData) {
        return this.request(`/tasks/${id}/review`, {
            method: 'POST',
            body: reviewData,
        });
    },

    /**
     * Tasks: Submit plan review for a task
     */
    async submitPlanReview(id, reviewData) {
        return this.request(`/tasks/${id}/plan-review`, {
            method: 'POST',
            body: reviewData,
        });
    },

    // ========================================
    // CALENDAR
    // ========================================

    /**
     * Calendar: Get tasks scheduled within a date range
     * @param {string} start - Start date (YYYY-MM-DD)
     * @param {string} end - End date (YYYY-MM-DD)
     */
    async getCalendarTasks(start, end) {
        return this.request(`/tasks/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
    },

    /**
     * Calendar: Get all scheduled tasks
     */
    async getScheduledTasks() {
        return this.request('/tasks/scheduled');
    },

    /**
     * Calendar: Get all unscheduled tasks
     */
    async getUnscheduledTasks() {
        return this.request('/tasks/unscheduled');
    },

    /**
     * Calendar: Schedule a task
     * @param {string} id - Task ID
     * @param {object} scheduleData - { scheduled_date, scheduled_start?, scheduled_end?, is_all_day? }
     */
    async scheduleTask(id, scheduleData) {
        return this.request(`/tasks/${id}/schedule`, {
            method: 'PATCH',
            body: scheduleData,
        });
    },

    /**
     * Calendar: Remove task from calendar
     * @param {string} id - Task ID
     */
    async unscheduleTask(id) {
        return this.request(`/tasks/${id}/unschedule`, {
            method: 'PATCH',
        });
    },

    // ========================================
    // TASK ITEMS
    // ========================================

    /**
     * Task Items: Create new task item
     */
    async createTaskItem(data) {
        return this.request('/task-items', {
            method: 'POST',
            body: data,
        });
    },

    /**
     * Task Items Calendar: Get task items scheduled within a date range
     * @param {string} start - Start date (YYYY-MM-DD)
     * @param {string} end - End date (YYYY-MM-DD)
     */
    async getTaskItemsForCalendar(start, end) {
        return this.request(`/task-items/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
    },

    /**
     * Task Items Calendar: Get all scheduled task items
     * @param {string[]} calendarIds - Optional array of calendar IDs to filter by
     */
    async getScheduledTaskItems(calendarIds = null) {
        const query = calendarIds && calendarIds.length > 0
            ? `?calendars=${encodeURIComponent(calendarIds.join(','))}`
            : '';
        return this.request(`/task-items/calendar/scheduled${query}`);
    },

    /**
     * Task Items Calendar: Get all unscheduled task items
     * @param {string[]} calendarIds - Optional array of calendar IDs to filter by
     */
    async getUnscheduledTaskItems(calendarIds = null) {
        const query = calendarIds && calendarIds.length > 0
            ? `?calendars=${encodeURIComponent(calendarIds.join(','))}`
            : '';
        return this.request(`/task-items/calendar/unscheduled${query}`);
    },

    /**
     * Task Items Calendar: Schedule a task item
     * @param {string} id - Task Item ID
     * @param {object} scheduleData - { due_date, due_time?, due_time_end? }
     */
    async scheduleTaskItem(id, scheduleData) {
        return this.request(`/task-items/${id}/schedule`, {
            method: 'PATCH',
            body: scheduleData,
        });
    },

    /**
     * Task Items Calendar: Remove task item from calendar
     * @param {string} id - Task Item ID
     */
    async unscheduleTaskItem(id) {
        return this.request(`/task-items/${id}/unschedule`, {
            method: 'PATCH',
        });
    },

    // ========================================
    // CALENDARS
    // ========================================

    /**
     * Calendars: Get all calendars
     */
    async getCalendars() {
        return this.request('/calendars');
    },

    /**
     * Calendars: Get single calendar by ID
     */
    async getCalendar(id) {
        return this.request(`/calendars/${id}`);
    },

    /**
     * Calendars: Create new calendar
     */
    async createCalendar(data) {
        return this.request('/calendars', {
            method: 'POST',
            body: data,
        });
    },

    /**
     * Calendars: Update existing calendar
     */
    async updateCalendar(id, data) {
        return this.request(`/calendars/${id}`, {
            method: 'PATCH',
            body: data,
        });
    },

    /**
     * Calendars: Delete calendar
     */
    async deleteCalendar(id) {
        return this.request(`/calendars/${id}`, {
            method: 'DELETE',
        });
    },

    // ========================================
    // APEX JOBS
    // ========================================

    /**
     * Apex Jobs: Get all jobs
     */
    async getApexJobs() {
        return this.request('/apex-jobs');
    },

    /**
     * Apex Jobs: Get single job by ID
     */
    async getApexJob(id) {
        return this.request(`/apex-jobs/${id}`);
    },

    /**
     * Apex Jobs: Create new job
     */
    async createApexJob(data) {
        return this.request('/apex-jobs', {
            method: 'POST',
            body: data,
        });
    },

    /**
     * Apex Jobs: Update existing job
     */
    async updateApexJob(id, data) {
        return this.request(`/apex-jobs/${id}`, {
            method: 'PATCH',
            body: data,
        });
    },

    /**
     * Apex Jobs: Update job status
     */
    async updateApexJobStatus(id, status) {
        return this.request(`/apex-jobs/${id}/status`, {
            method: 'PATCH',
            body: { status },
        });
    },

    /**
     * Apex Jobs: Update a phase within a job
     */
    async updateApexJobPhase(jobId, phaseId, data) {
        return this.request(`/apex-jobs/${jobId}/phases/${phaseId}`, {
            method: 'PATCH',
            body: data,
        });
    },

    /**
     * Apex Jobs: Archive (soft delete) a job
     */
    async archiveApexJob(id) {
        return this.request(`/apex-jobs/${id}`, {
            method: 'DELETE',
        });
    },

    // ========================================
    // APEX JOB DETAIL
    // ========================================

    /**
     * Apex Job Detail: Update job dates
     */
    async updateApexJobDates(id, dates) {
        return this.request(`/apex-jobs/${id}/dates`, {
            method: 'PATCH',
            body: dates,
        });
    },

    /**
     * Apex Job Detail: Get all notes for a job
     */
    async getApexJobNotes(id) {
        return this.request(`/apex-jobs/${id}/notes`);
    },

    /**
     * Apex Job Detail: Create a note on a job
     */
    async createApexJobNote(id, data) {
        return this.request(`/apex-jobs/${id}/notes`, {
            method: 'POST',
            body: data,
        });
    },

    /**
     * Apex Job Detail: Delete a note from a job
     */
    async deleteApexJobNote(id, noteId) {
        return this.request(`/apex-jobs/${id}/notes/${noteId}`, {
            method: 'DELETE',
        });
    },

    /**
     * Apex Job Detail: Get all estimates for a job
     */
    async getApexJobEstimates(id) {
        return this.request(`/apex-jobs/${id}/estimates`);
    },

    /**
     * Apex Job Detail: Create an estimate for a job
     */
    async createApexJobEstimate(id, data) {
        return this.request(`/apex-jobs/${id}/estimates`, {
            method: 'POST',
            body: data,
        });
    },

    /**
     * Apex Job Detail: Update an estimate
     */
    async updateApexJobEstimate(id, estId, data) {
        return this.request(`/apex-jobs/${id}/estimates/${estId}`, {
            method: 'PATCH',
            body: data,
        });
    },

    /**
     * Apex Job Detail: Get all payments for a job
     */
    async getApexJobPayments(id) {
        return this.request(`/apex-jobs/${id}/payments`);
    },

    /**
     * Apex Job Detail: Create a payment for a job
     */
    async createApexJobPayment(id, data) {
        return this.request(`/apex-jobs/${id}/payments`, {
            method: 'POST',
            body: data,
        });
    },

    /**
     * Apex Job Detail: Get all labor entries for a job
     */
    async getApexJobLabor(id) {
        return this.request(`/apex-jobs/${id}/labor`);
    },

    /**
     * Apex Job Detail: Create a labor entry for a job
     */
    async createApexJobLabor(id, data) {
        return this.request(`/apex-jobs/${id}/labor`, {
            method: 'POST',
            body: data,
        });
    },

    /**
     * Apex Job Detail: Update a labor entry
     */
    async updateApexJobLabor(id, entryId, data) {
        return this.request(`/apex-jobs/${id}/labor/${entryId}`, {
            method: 'PATCH',
            body: data,
        });
    },

    /**
     * Apex Job Detail: Delete a labor entry
     */
    async deleteApexJobLabor(id, entryId) {
        return this.request(`/apex-jobs/${id}/labor/${entryId}`, {
            method: 'DELETE',
        });
    },

    /**
     * Apex Job Detail: Get all receipts for a job
     */
    async getApexJobReceipts(id) {
        return this.request(`/apex-jobs/${id}/receipts`);
    },

    /**
     * Apex Job Detail: Create a receipt for a job
     */
    async createApexJobReceipt(id, data) {
        return this.request(`/apex-jobs/${id}/receipts`, {
            method: 'POST',
            body: data,
        });
    },

    /**
     * Apex Job Detail: Update a receipt
     */
    async updateApexJobReceipt(id, receiptId, data) {
        return this.request(`/apex-jobs/${id}/receipts/${receiptId}`, {
            method: 'PATCH',
            body: data,
        });
    },

    /**
     * Apex Job Detail: Delete a receipt
     */
    async deleteApexJobReceipt(id, receiptId) {
        return this.request(`/apex-jobs/${id}/receipts/${receiptId}`, {
            method: 'DELETE',
        });
    },

    /**
     * Apex Job Detail: Get all work orders for a job
     */
    async getApexJobWorkOrders(id) {
        return this.request(`/apex-jobs/${id}/work-orders`);
    },

    /**
     * Apex Job Detail: Create a work order for a job
     */
    async createApexJobWorkOrder(id, data) {
        return this.request(`/apex-jobs/${id}/work-orders`, {
            method: 'POST',
            body: data,
        });
    },

    /**
     * Apex Job Detail: Update a work order
     */
    async updateApexJobWorkOrder(id, woId, data) {
        return this.request(`/apex-jobs/${id}/work-orders/${woId}`, {
            method: 'PATCH',
            body: data,
        });
    },

    /**
     * Apex Job Detail: Delete a work order
     */
    async deleteApexJobWorkOrder(id, woId) {
        return this.request(`/apex-jobs/${id}/work-orders/${woId}`, {
            method: 'DELETE',
        });
    },

    /**
     * Apex Job Detail: Get activity log for a job
     */
    async getApexJobActivity(id, params = {}) {
        const query = new URLSearchParams(params).toString();
        const qs = query ? `?${query}` : '';
        return this.request(`/apex-jobs/${id}/activity${qs}`);
    },

    /**
     * Apex Job Detail: Get accounting summary for a job
     */
    async getApexJobAccounting(id) {
        return this.request(`/apex-jobs/${id}/accounting`);
    },

    /**
     * Apex Job Detail: Assign a contact to a job
     */
    async assignApexJobContact(id, data) {
        return this.request(`/apex-jobs/${id}/contacts`, {
            method: 'POST',
            body: data,
        });
    },

    /**
     * Apex Job Detail: Remove a contact from a job
     */
    async removeApexJobContact(id, contactId) {
        return this.request(`/apex-jobs/${id}/contacts/${contactId}`, {
            method: 'DELETE',
        });
    },

    /**
     * Apex Job Detail: Toggle ready-to-invoice flag
     */
    async toggleApexJobInvoice(id, ready) {
        return this.request(`/apex-jobs/${id}/ready-to-invoice`, {
            method: 'PATCH',
            body: { ready },
        });
    },

    // ========================================
    // DRYING LOGS
    // ========================================

    /**
     * Drying: Get drying log for a job
     */
    async getDryingLog(jobId) {
        return this.request(`/apex-jobs/${jobId}/drying/log`);
    },

    /**
     * Drying: Create drying log for a job
     */
    async createDryingLog(jobId) {
        return this.request(`/apex-jobs/${jobId}/drying/log`, {
            method: 'POST',
        });
    },

    /**
     * Drying: Update drying log properties (e.g. setup_complete)
     */
    async updateDryingLog(jobId, data) {
        return this.request(`/apex-jobs/${jobId}/drying/log`, {
            method: 'PATCH',
            body: data,
        });
    },

    /**
     * Drying: Get all chambers for a job's drying log
     */
    async getDryingChambers(jobId) {
        return this.request(`/apex-jobs/${jobId}/drying/chambers`);
    },

    /**
     * Drying: Create a chamber
     */
    async createDryingChamber(jobId, data) {
        return this.request(`/apex-jobs/${jobId}/drying/chambers`, {
            method: 'POST',
            body: data,
        });
    },

    /**
     * Drying: Update a chamber
     */
    async updateDryingChamber(jobId, chamberId, data) {
        return this.request(`/apex-jobs/${jobId}/drying/chambers/${chamberId}`, {
            method: 'PATCH',
            body: data,
        });
    },

    /**
     * Drying: Delete a chamber
     */
    async deleteDryingChamber(jobId, chamberId) {
        return this.request(`/apex-jobs/${jobId}/drying/chambers/${chamberId}`, {
            method: 'DELETE',
        });
    },

    /**
     * Drying: Get all rooms for a job's drying log
     * @param {string} chamberId - Optional chamber ID to filter by
     */
    async getDryingRooms(jobId, chamberId = null) {
        const query = chamberId ? `?chamberId=${chamberId}` : '';
        return this.request(`/apex-jobs/${jobId}/drying/rooms${query}`);
    },

    /**
     * Drying: Create a room
     */
    async createDryingRoom(jobId, data) {
        return this.request(`/apex-jobs/${jobId}/drying/rooms`, {
            method: 'POST',
            body: data,
        });
    },

    /**
     * Drying: Update a room
     */
    async updateDryingRoom(jobId, roomId, data) {
        return this.request(`/apex-jobs/${jobId}/drying/rooms/${roomId}`, {
            method: 'PATCH',
            body: data,
        });
    },

    /**
     * Drying: Delete a room
     */
    async deleteDryingRoom(jobId, roomId) {
        return this.request(`/apex-jobs/${jobId}/drying/rooms/${roomId}`, {
            method: 'DELETE',
        });
    },

    /**
     * Drying: Get all reference points for a job's drying log
     */
    async getDryingRefPoints(jobId) {
        return this.request(`/apex-jobs/${jobId}/drying/ref-points`);
    },

    /**
     * Drying: Add a reference point (server auto-assigns ref_number)
     */
    async createDryingRefPoint(jobId, data) {
        return this.request(`/apex-jobs/${jobId}/drying/ref-points`, {
            method: 'POST',
            body: data,
        });
    },

    /**
     * Drying: Update a reference point
     */
    async updateDryingRefPoint(jobId, rpId, data) {
        return this.request(`/apex-jobs/${jobId}/drying/ref-points/${rpId}`, {
            method: 'PATCH',
            body: data,
        });
    },

    /**
     * Drying: Delete a reference point (during setup, before visits reference it)
     */
    async deleteDryingRefPoint(jobId, rpId) {
        return this.request(`/apex-jobs/${jobId}/drying/ref-points/${rpId}`, {
            method: 'DELETE',
        });
    },

    /**
     * Drying: Demolish a reference point
     */
    async demolishDryingRefPoint(jobId, rpId, visitId) {
        return this.request(`/apex-jobs/${jobId}/drying/ref-points/${rpId}/demolish`, {
            method: 'POST',
            body: { visitId },
        });
    },

    /**
     * Drying: Get all baselines for a job's drying log
     */
    async getDryingBaselines(jobId) {
        return this.request(`/apex-jobs/${jobId}/drying/baselines`);
    },

    /**
     * Drying: Upsert a baseline (create or update by material_code)
     */
    async upsertDryingBaseline(jobId, data) {
        return this.request(`/apex-jobs/${jobId}/drying/baselines`, {
            method: 'PUT',
            body: data,
        });
    },

    /**
     * Drying: Get all visits for a job's drying log
     */
    async getDryingVisits(jobId) {
        return this.request(`/apex-jobs/${jobId}/drying/visits`);
    },

    /**
     * Drying: Create a new visit (server auto-assigns visit_number)
     */
    async createDryingVisit(jobId, data = {}) {
        return this.request(`/apex-jobs/${jobId}/drying/visits`, {
            method: 'POST',
            body: data,
        });
    },

    /**
     * Drying: Get a visit with all child data (atmospheric, moisture, equipment, notes)
     */
    async getDryingVisit(jobId, visitId) {
        return this.request(`/apex-jobs/${jobId}/drying/visits/${visitId}`);
    },

    /**
     * Drying: Bulk save visit data (atmospheric + moisture + equipment in one transaction)
     * @param {object} data - { atmospheric: [...], moisture: [...], equipment: [...] }
     */
    async saveDryingVisit(jobId, visitId, data) {
        return this.request(`/apex-jobs/${jobId}/drying/visits/${visitId}/save`, {
            method: 'POST',
            body: data,
        });
    },

    /**
     * Drying: Delete a visit
     */
    async deleteDryingVisit(jobId, visitId) {
        return this.request(`/apex-jobs/${jobId}/drying/visits/${visitId}`, {
            method: 'DELETE',
        });
    },

    /**
     * Drying: Get notes for a visit
     */
    async getDryingVisitNotes(jobId, visitId) {
        return this.request(`/apex-jobs/${jobId}/drying/visits/${visitId}/notes`);
    },

    /**
     * Drying: Add a note to a visit
     */
    async createDryingVisitNote(jobId, visitId, data) {
        return this.request(`/apex-jobs/${jobId}/drying/visits/${visitId}/notes`, {
            method: 'POST',
            body: data,
        });
    },

    /**
     * Drying: Delete a visit note
     */
    async deleteDryingVisitNote(jobId, visitId, noteId) {
        return this.request(`/apex-jobs/${jobId}/drying/visits/${visitId}/notes/${noteId}`, {
            method: 'DELETE',
        });
    },

    /**
     * Drying: Upload photos (processed server-side with sharp)
     * @param {string} jobId - Job ID
     * @param {FileList|File[]} files - Files to upload
     */
    async uploadDryingPhotos(jobId, files) {
        const formData = new FormData();
        for (const file of files) {
            formData.append('photos', file);
        }
        return this.request(`/apex-jobs/${jobId}/drying/photos`, {
            method: 'POST',
            body: formData,
        });
    },
};

// Make available globally
window.api = api;
