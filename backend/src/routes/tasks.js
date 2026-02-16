const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { requireScope } = require('../middleware/scopeAuth');
const {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  pickTask,
  completeTask,
  addLogEntry,
  submitReview,
  submitPlanReview,
  // Calendar functions
  getTasksForCalendar,
  getScheduledTasks,
  getUnscheduledTasks,
  scheduleTask,
  unscheduleTask
} = require('../db/queries');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * Get userId from request (null for system users = access all)
 */
function getUserId(req) {
  return req.isSystemUser ? null : req.user?.id;
}

/**
 * GET /api/tasks
 * List all tasks for current user, optionally filtered by status
 * Query params: ?status=ready
 */
router.get('/', requireScope('tasks', 'read'), async (req, res) => {
  try {
    const { status } = req.query;
    const userId = getUserId(req);
    
    // Validate status if provided
    const validStatuses = ['planned', 'ready', 'in_progress', 'blocked', 'review', 'done'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        code: 'INVALID_STATUS'
      });
    }
    
    const tasks = await getAllTasks(userId, status);
    res.json({ tasks });
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ 
      error: 'Failed to fetch tasks',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/tasks
 * Create a new task for current user
 */
router.post('/', requireScope('tasks', 'write'), async (req, res) => {
  try {
    const { title, description, acceptance_criteria, status, priority, context_links, notes } = req.body;
    const userId = getUserId(req);
    
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({
        error: 'Title is required',
        code: 'TITLE_REQUIRED'
      });
    }
    
    // Validate status if provided
    const validStatuses = ['planned', 'ready', 'in_progress', 'blocked', 'review', 'done'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        code: 'INVALID_STATUS'
      });
    }
    
    // Validate priority if provided
    if (priority !== undefined && (typeof priority !== 'number' || priority < 1 || priority > 5)) {
      return res.status(400).json({
        error: 'Priority must be a number between 1 and 5',
        code: 'INVALID_PRIORITY'
      });
    }
    
    // Validate arrays
    if (acceptance_criteria && !Array.isArray(acceptance_criteria)) {
      return res.status(400).json({
        error: 'acceptance_criteria must be an array',
        code: 'INVALID_ACCEPTANCE_CRITERIA'
      });
    }
    
    if (context_links && !Array.isArray(context_links)) {
      return res.status(400).json({
        error: 'context_links must be an array',
        code: 'INVALID_CONTEXT_LINKS'
      });
    }
    
    const task = await createTask({
      title: title.trim(),
      description,
      acceptance_criteria,
      status,
      priority,
      context_links,
      notes
    }, userId);
    
    res.status(201).json({ task });
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ 
      error: 'Failed to create task',
      code: 'INTERNAL_ERROR'
    });
  }
});

// ========================================
// CALENDAR ENDPOINTS
// ========================================

/**
 * GET /api/tasks/calendar
 * Get tasks scheduled within a date range
 * Query params: ?start=YYYY-MM-DD&end=YYYY-MM-DD
 */
router.get('/calendar', async (req, res) => {
  try {
    const { start, end } = req.query;
    const userId = getUserId(req);

    if (!start || !end) {
      return res.status(400).json({
        error: 'start and end query parameters are required (YYYY-MM-DD format)',
        code: 'MISSING_DATE_RANGE'
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start) || !dateRegex.test(end)) {
      return res.status(400).json({
        error: 'Dates must be in YYYY-MM-DD format',
        code: 'INVALID_DATE_FORMAT'
      });
    }

    const tasks = await getTasksForCalendar(userId, start, end);
    res.json({ tasks });
  } catch (err) {
    console.error('Error fetching calendar tasks:', err);
    res.status(500).json({
      error: 'Failed to fetch calendar tasks',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/tasks/scheduled
 * Get all scheduled tasks (tasks with a scheduled_date)
 */
router.get('/scheduled', async (req, res) => {
  try {
    const userId = getUserId(req);
    const tasks = await getScheduledTasks(userId);
    res.json({ tasks });
  } catch (err) {
    console.error('Error fetching scheduled tasks:', err);
    res.status(500).json({
      error: 'Failed to fetch scheduled tasks',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/tasks/unscheduled
 * Get all unscheduled tasks (tasks without a scheduled_date)
 */
router.get('/unscheduled', async (req, res) => {
  try {
    const userId = getUserId(req);
    const tasks = await getUnscheduledTasks(userId);
    res.json({ tasks });
  } catch (err) {
    console.error('Error fetching unscheduled tasks:', err);
    res.status(500).json({
      error: 'Failed to fetch unscheduled tasks',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/tasks/:id
 * Get a single task by ID (must belong to current user)
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    const task = await getTaskById(req.params.id, userId);
    
    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }
    
    res.json({ task });
  } catch (err) {
    console.error('Error fetching task:', err);
    res.status(500).json({ 
      error: 'Failed to fetch task',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * PATCH /api/tasks/:id
 * Update a task (must belong to current user)
 * Body can include status_reason for logging status changes
 */
router.patch('/:id', async (req, res) => {
  try {
    const { title, description, acceptance_criteria, status, priority, context_links, notes, session_id, status_reason, log_entry } = req.body;
    const userId = getUserId(req);
    
    // Validate title if provided
    if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
      return res.status(400).json({
        error: 'Title cannot be empty',
        code: 'INVALID_TITLE'
      });
    }
    
    // Validate status if provided
    const validStatuses = ['planned', 'ready', 'in_progress', 'blocked', 'review', 'done'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        code: 'INVALID_STATUS'
      });
    }
    
    // Validate priority if provided
    if (priority !== undefined && (typeof priority !== 'number' || priority < 1 || priority > 5)) {
      return res.status(400).json({
        error: 'Priority must be a number between 1 and 5',
        code: 'INVALID_PRIORITY'
      });
    }
    
    const task = await updateTask(req.params.id, {
      title: title?.trim(),
      description,
      acceptance_criteria,
      status,
      priority,
      context_links,
      notes,
      session_id,
      status_reason,
      log_entry
    }, userId);
    
    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }
    
    res.json({ task });
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ 
      error: 'Failed to update task',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/tasks/:id/log
 * Add an entry to the task's activity log
 * Body: { type: "note", message: "Did something", details: {} }
 */
router.post('/:id/log', async (req, res) => {
  try {
    const { type, message, details } = req.body;
    const userId = getUserId(req);
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Message is required',
        code: 'MESSAGE_REQUIRED'
      });
    }
    
    const task = await addLogEntry(req.params.id, type || 'note', message, details || {}, userId);
    
    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }
    
    res.json({ task });
  } catch (err) {
    console.error('Error adding log entry:', err);
    res.status(500).json({ 
      error: 'Failed to add log entry',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * DELETE /api/tasks/:id
 * Delete a task (must belong to current user)
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    const deleted = await deleteTask(req.params.id, userId);
    
    if (!deleted) {
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }
    
    res.json({ 
      success: true,
      message: 'Task deleted'
    });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ 
      error: 'Failed to delete task',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/tasks/:id/pick
 * Claim a task for work (sets status to in_progress)
 * Body: { session_id: "optional session identifier" }
 */
router.post('/:id/pick', async (req, res) => {
  try {
    const sessionId = req.body.session_id || req.sessionId;
    const userId = getUserId(req);
    const result = await pickTask(req.params.id, sessionId, userId);
    
    if (result.error) {
      return res.status(result.status).json({
        error: result.error,
        code: result.status === 404 ? 'TASK_NOT_FOUND' : 'INVALID_STATE'
      });
    }
    
    res.json({ task: result.task });
  } catch (err) {
    console.error('Error picking task:', err);
    res.status(500).json({ 
      error: 'Failed to pick task',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/tasks/:id/complete
 * Mark a task as complete (sets status to review)
 * Body: { notes: "optional completion notes" }
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const { notes } = req.body;
    const userId = getUserId(req);
    const result = await completeTask(req.params.id, notes, userId);
    
    if (result.error) {
      return res.status(result.status).json({
        error: result.error,
        code: result.status === 404 ? 'TASK_NOT_FOUND' : 'INVALID_STATE'
      });
    }
    
    res.json({ task: result.task });
  } catch (err) {
    console.error('Error completing task:', err);
    res.status(500).json({ 
      error: 'Failed to complete task',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/tasks/:id/review
 * Submit a review with criteria feedback
 * Body: { criteria: [{ index: 0, status: "approved"|"needs_work", comment: "..." }] }
 */
router.post('/:id/review', async (req, res) => {
  try {
    const { criteria, generalComment } = req.body;
    const userId = getUserId(req);
    
    if (!criteria || !Array.isArray(criteria)) {
      return res.status(400).json({
        error: 'Criteria array is required',
        code: 'CRITERIA_REQUIRED'
      });
    }
    
    // Validate criteria entries
    for (const c of criteria) {
      if (typeof c.index !== 'number' || !['approved', 'needs_work'].includes(c.status)) {
        return res.status(400).json({
          error: 'Each criterion must have index (number) and status (approved|needs_work)',
          code: 'INVALID_CRITERIA'
        });
      }
    }
    
    const result = await submitReview(req.params.id, { criteria, generalComment }, userId);
    
    if (result.error) {
      return res.status(result.status).json({
        error: result.error,
        code: result.status === 404 ? 'TASK_NOT_FOUND' : 'INVALID_STATE'
      });
    }
    
    res.json({
      task: result.task,
      allApproved: result.allApproved,
      approved: result.approved,
      needsWork: result.needsWork
    });
  } catch (err) {
    console.error('Error submitting review:', err);
    res.status(500).json({ 
      error: 'Failed to submit review',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * PATCH /api/tasks/:id/schedule
 * Schedule a task on the calendar
 * Body: { scheduled_date: "YYYY-MM-DD", scheduled_start?: "HH:MM", scheduled_end?: "HH:MM", is_all_day?: boolean }
 */
router.patch('/:id/schedule', async (req, res) => {
  try {
    const { scheduled_date, scheduled_start, scheduled_end, is_all_day } = req.body;
    const userId = getUserId(req);

    if (!scheduled_date) {
      return res.status(400).json({
        error: 'scheduled_date is required (YYYY-MM-DD format)',
        code: 'MISSING_DATE'
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(scheduled_date)) {
      return res.status(400).json({
        error: 'scheduled_date must be in YYYY-MM-DD format',
        code: 'INVALID_DATE_FORMAT'
      });
    }

    // Validate time format if provided
    const timeRegex = /^\d{2}:\d{2}$/;
    if (scheduled_start && !timeRegex.test(scheduled_start)) {
      return res.status(400).json({
        error: 'scheduled_start must be in HH:MM format',
        code: 'INVALID_TIME_FORMAT'
      });
    }
    if (scheduled_end && !timeRegex.test(scheduled_end)) {
      return res.status(400).json({
        error: 'scheduled_end must be in HH:MM format',
        code: 'INVALID_TIME_FORMAT'
      });
    }

    const task = await scheduleTask(req.params.id, {
      scheduled_date,
      scheduled_start,
      scheduled_end,
      is_all_day: is_all_day || false
    }, userId);

    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    res.json({ task });
  } catch (err) {
    console.error('Error scheduling task:', err);
    res.status(500).json({
      error: 'Failed to schedule task',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * PATCH /api/tasks/:id/unschedule
 * Remove a task from the calendar
 */
router.patch('/:id/unschedule', async (req, res) => {
  try {
    const userId = getUserId(req);
    const task = await unscheduleTask(req.params.id, userId);

    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    res.json({ task });
  } catch (err) {
    console.error('Error unscheduling task:', err);
    res.status(500).json({
      error: 'Failed to unschedule task',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/tasks/:id/plan-review
 * Submit a plan review with criteria feedback (for tasks in 'planned' status)
 * Body: { criteria: [{ index: 0, status: "approved"|"needs_work", comment: "..." }] }
 */
router.post('/:id/plan-review', async (req, res) => {
  try {
    const { criteria, generalComment } = req.body;
    const userId = getUserId(req);
    
    if (!criteria || !Array.isArray(criteria)) {
      return res.status(400).json({
        error: 'Criteria array is required',
        code: 'CRITERIA_REQUIRED'
      });
    }
    
    // Validate criteria entries
    for (const c of criteria) {
      if (typeof c.index !== 'number' || !['approved', 'needs_work'].includes(c.status)) {
        return res.status(400).json({
          error: 'Each criterion must have index (number) and status (approved|needs_work)',
          code: 'INVALID_CRITERIA'
        });
      }
    }
    
    const result = await submitPlanReview(req.params.id, { criteria, generalComment }, userId);
    
    if (result.error) {
      return res.status(result.status).json({
        error: result.error,
        code: result.status === 404 ? 'TASK_NOT_FOUND' : 'INVALID_STATE'
      });
    }
    
    res.json({
      task: result.task,
      allApproved: result.allApproved,
      approved: result.approved,
      needsWork: result.needsWork
    });
  } catch (err) {
    console.error('Error submitting plan review:', err);
    res.status(500).json({ 
      error: 'Failed to submit plan review',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;
