const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const {
  getAllTaskItems,
  getTaskItemById,
  createTaskItem,
  updateTaskItem,
  deleteTaskItem,
  toggleTaskItemComplete,
  getTaskItemCounts,
  // Calendar functions
  getTaskItemsForCalendar,
  getScheduledTaskItems,
  getUnscheduledTaskItems,
  scheduleTaskItem,
  unscheduleTaskItem,
  setTaskItemCalendars
} = require('../db/taskItems');
const { ensureTasksCalendar } = require('../db/calendars');
const { requireScope } = require('../middleware/scopeAuth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/task-items
 * List all task items for current user
 * Query params: ?view=my-day|important|scheduled|recurring|all
 */
router.get('/', requireScope('tasks', 'read'), async (req, res) => {
  try {
    const { view = 'all', today } = req.query;
    const userId = req.user.id;
    
    console.log(`[task-items] view=${view}, today=${today}, userId=${userId}`);
    
    const items = await getAllTaskItems(userId, view, today);
    res.json({ items });
  } catch (err) {
    console.error('Error fetching task items:', err);
    res.status(500).json({ error: 'Failed to fetch task items' });
  }
});

/**
 * GET /api/task-items/counts
 * Get counts for sidebar badges
 */
router.get('/counts', requireScope('tasks', 'read'), async (req, res) => {
  try {
    const { today } = req.query;
    const userId = req.user.id;
    const counts = await getTaskItemCounts(userId, today);
    res.json({ counts });
  } catch (err) {
    console.error('Error fetching counts:', err);
    res.status(500).json({ error: 'Failed to fetch counts' });
  }
});

// ========================================
// CALENDAR ENDPOINTS
// ========================================

/**
 * GET /api/task-items/calendar
 * Get task items scheduled within a date range
 * Query params: ?start=YYYY-MM-DD&end=YYYY-MM-DD
 */
router.get('/calendar', requireScope('tasks', 'read'), async (req, res) => {
  try {
    const { start, end } = req.query;
    const userId = req.user.id;

    if (!start || !end) {
      return res.status(400).json({
        error: 'start and end query parameters are required (YYYY-MM-DD format)'
      });
    }

    const items = await getTaskItemsForCalendar(userId, start, end);
    res.json({ items });
  } catch (err) {
    console.error('Error fetching calendar task items:', err);
    res.status(500).json({ error: 'Failed to fetch calendar task items' });
  }
});

/**
 * GET /api/task-items/calendar/scheduled
 * Get all scheduled task items (have due_date)
 * Query params: ?calendars=id1,id2,id3 (optional filter)
 */
router.get('/calendar/scheduled', requireScope('tasks', 'read'), async (req, res) => {
  try {
    const userId = req.user.id;
    const calendarIds = req.query.calendars ? req.query.calendars.split(',') : null;
    const items = await getScheduledTaskItems(userId, calendarIds);
    res.json({ items });
  } catch (err) {
    console.error('Error fetching scheduled task items:', err);
    res.status(500).json({ error: 'Failed to fetch scheduled task items' });
  }
});

/**
 * GET /api/task-items/calendar/unscheduled
 * Get all unscheduled task items (no due_date)
 * Query params: ?calendars=id1,id2,id3 (optional filter)
 */
router.get('/calendar/unscheduled', requireScope('tasks', 'read'), async (req, res) => {
  try {
    const userId = req.user.id;
    const calendarIds = req.query.calendars ? req.query.calendars.split(',') : null;
    const items = await getUnscheduledTaskItems(userId, calendarIds);
    res.json({ items });
  } catch (err) {
    console.error('Error fetching unscheduled task items:', err);
    res.status(500).json({ error: 'Failed to fetch unscheduled task items' });
  }
});

/**
 * PATCH /api/task-items/:id/schedule
 * Schedule a task item on the calendar
 * Body: { due_date: "YYYY-MM-DD", due_time?: "HH:MM", due_time_end?: "HH:MM" }
 */
router.patch('/:id/schedule', requireScope('tasks', 'write'), async (req, res) => {
  try {
    const { due_date, due_time, due_time_end } = req.body;
    const userId = req.user.id;

    if (!due_date) {
      return res.status(400).json({ error: 'due_date is required (YYYY-MM-DD format)' });
    }

    const item = await scheduleTaskItem(req.params.id, { due_date, due_time, due_time_end }, userId);

    if (!item) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // If task has no calendar associations, auto-link to Tasks calendar
    if (!item.calendar_ids || item.calendar_ids.length === 0) {
      const tasksCalendar = await ensureTasksCalendar(userId);
      await setTaskItemCalendars(item.id, [tasksCalendar.id], userId);
      item.calendar_ids = [tasksCalendar.id];
    }

    res.json({ item });
  } catch (err) {
    console.error('Error scheduling task item:', err);
    res.status(500).json({ error: 'Failed to schedule task item' });
  }
});

/**
 * PATCH /api/task-items/:id/unschedule
 * Remove a task item from the calendar
 */
router.patch('/:id/unschedule', requireScope('tasks', 'write'), async (req, res) => {
  try {
    const userId = req.user.id;
    const item = await unscheduleTaskItem(req.params.id, userId);

    if (!item) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ item });
  } catch (err) {
    console.error('Error unscheduling task item:', err);
    res.status(500).json({ error: 'Failed to unschedule task item' });
  }
});

/**
 * GET /api/task-items/:id
 * Get a single task item
 */
router.get('/:id', requireScope('tasks', 'read'), async (req, res) => {
  try {
    const userId = req.user.id;
    const item = await getTaskItemById(req.params.id, userId);
    
    if (!item) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ item });
  } catch (err) {
    console.error('Error fetching task item:', err);
    res.status(500).json({ error: 'Failed to fetch task item' });
  }
});

/**
 * POST /api/task-items
 * Create a new task item
 */
router.post('/', requireScope('tasks', 'write'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, status, my_day, due_date, due_time, due_time_end, snooze_date, priority, energy, location, recurring, recurring_days, important, subtasks, project_id, list_id, calendar_ids } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const item = await createTaskItem({
      title: title.trim(),
      description,
      status,
      my_day,
      due_date,
      due_time,
      due_time_end,
      snooze_date,
      priority,
      energy,
      location,
      recurring,
      recurring_days,
      important,
      subtasks,
      project_id,
      list_id
    }, userId);

    // Set calendar associations - default to Tasks calendar if none provided
    let finalCalendarIds = calendar_ids;
    if (!calendar_ids || !Array.isArray(calendar_ids) || calendar_ids.length === 0) {
      // Auto-link to the Tasks calendar
      const tasksCalendar = await ensureTasksCalendar(userId);
      finalCalendarIds = [tasksCalendar.id];
    }
    await setTaskItemCalendars(item.id, finalCalendarIds, userId);
    item.calendar_ids = finalCalendarIds;

    res.status(201).json({ item });
  } catch (err) {
    console.error('Error creating task item:', err);
    res.status(500).json({ error: 'Failed to create task item' });
  }
});

/**
 * PATCH /api/task-items/:id
 * Update a task item
 */
router.patch('/:id', requireScope('tasks', 'write'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { calendar_ids, ...updateData } = req.body;
    const item = await updateTaskItem(req.params.id, updateData, userId);

    if (!item) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Update calendar associations if provided
    if (calendar_ids !== undefined) {
      await setTaskItemCalendars(item.id, calendar_ids || [], userId);
      item.calendar_ids = calendar_ids || [];
    }

    res.json({ item });
  } catch (err) {
    console.error('Error updating task item:', err);
    res.status(500).json({ error: 'Failed to update task item' });
  }
});

/**
 * POST /api/task-items/:id/toggle
 * Toggle task completion
 */
router.post('/:id/toggle', requireScope('tasks', 'write'), async (req, res) => {
  try {
    const userId = req.user.id;
    const item = await toggleTaskItemComplete(req.params.id, userId);
    
    if (!item) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ item });
  } catch (err) {
    console.error('Error toggling task:', err);
    res.status(500).json({ error: 'Failed to toggle task' });
  }
});

/**
 * DELETE /api/task-items/:id
 * Delete a task item
 */
router.delete('/:id', requireScope('tasks', 'delete'), async (req, res) => {
  try {
    const userId = req.user.id;
    const deleted = await deleteTaskItem(req.params.id, userId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting task item:', err);
    res.status(500).json({ error: 'Failed to delete task item' });
  }
});

module.exports = router;
