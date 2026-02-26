const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskComplete,
  getTaskCounts,
  getTasksForCalendar,
  getScheduledTasks,
  getUnscheduledTasks,
  scheduleTask,
  unscheduleTask,
  setTaskCalendars
} = require('../db/tasks');
const { ensureTasksCalendar } = require('../db/calendars');
const { requireScope } = require('../middleware/scopeAuth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', requireScope('tasks', 'read'), async (req, res) => {
  try {
    const { view = 'all', today } = req.query;
    const items = await getAllTasks(req.user.id, view, today);
    res.json({ items });
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

router.get('/counts', requireScope('tasks', 'read'), async (req, res) => {
  try {
    const { today } = req.query;
    const counts = await getTaskCounts(req.user.id, today);
    res.json({ counts });
  } catch (err) {
    console.error('Error fetching counts:', err);
    res.status(500).json({ error: 'Failed to fetch counts' });
  }
});

router.get('/calendar', requireScope('tasks', 'read'), async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ error: 'start and end query parameters are required (YYYY-MM-DD format)' });
    }
    const items = await getTasksForCalendar(req.user.id, start, end);
    res.json({ items });
  } catch (err) {
    console.error('Error fetching calendar tasks:', err);
    res.status(500).json({ error: 'Failed to fetch calendar tasks' });
  }
});

router.get('/calendar/scheduled', requireScope('tasks', 'read'), async (req, res) => {
  try {
    const calendarIds = req.query.calendars ? req.query.calendars.split(',') : null;
    const items = await getScheduledTasks(req.user.id, calendarIds);
    res.json({ items });
  } catch (err) {
    console.error('Error fetching scheduled tasks:', err);
    res.status(500).json({ error: 'Failed to fetch scheduled tasks' });
  }
});

router.get('/calendar/unscheduled', requireScope('tasks', 'read'), async (req, res) => {
  try {
    const calendarIds = req.query.calendars ? req.query.calendars.split(',') : null;
    const items = await getUnscheduledTasks(req.user.id, calendarIds);
    res.json({ items });
  } catch (err) {
    console.error('Error fetching unscheduled tasks:', err);
    res.status(500).json({ error: 'Failed to fetch unscheduled tasks' });
  }
});

router.patch('/:id/schedule', requireScope('tasks', 'write'), async (req, res) => {
  try {
    const { due_date, due_time, due_time_end } = req.body;
    if (!due_date) return res.status(400).json({ error: 'due_date is required' });
    const item = await scheduleTask(req.params.id, { due_date, due_time, due_time_end }, req.user.id);
    if (!item) return res.status(404).json({ error: 'Task not found' });
    if (!item.calendar_ids || item.calendar_ids.length === 0) {
      const tasksCalendar = await ensureTasksCalendar(req.user.id);
      await setTaskCalendars(item.id, [tasksCalendar.id], req.user.id);
      item.calendar_ids = [tasksCalendar.id];
    }
    res.json({ item });
  } catch (err) {
    console.error('Error scheduling task:', err);
    res.status(500).json({ error: 'Failed to schedule task' });
  }
});

router.patch('/:id/unschedule', requireScope('tasks', 'write'), async (req, res) => {
  try {
    const item = await unscheduleTask(req.params.id, req.user.id);
    if (!item) return res.status(404).json({ error: 'Task not found' });
    res.json({ item });
  } catch (err) {
    console.error('Error unscheduling task:', err);
    res.status(500).json({ error: 'Failed to unschedule task' });
  }
});

router.get('/:id', requireScope('tasks', 'read'), async (req, res) => {
  try {
    const item = await getTaskById(req.params.id, req.user.id);
    if (!item) return res.status(404).json({ error: 'Task not found' });
    res.json({ item });
  } catch (err) {
    console.error('Error fetching task:', err);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

router.post('/', requireScope('tasks', 'write'), async (req, res) => {
  try {
    const { title, description, status, my_day, due_date, due_time, due_time_end, snooze_date, priority, energy, location, recurring, recurring_days, important, subtasks, project_id, list_id, calendar_ids } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
    const item = await createTask({
      title: title.trim(), description, status, my_day, due_date, due_time, due_time_end, snooze_date, priority, energy, location, recurring, recurring_days, important, subtasks, project_id, list_id
    }, req.user.id);
    let finalCalendarIds = calendar_ids;
    if (!calendar_ids || !Array.isArray(calendar_ids) || calendar_ids.length === 0) {
      const tasksCalendar = await ensureTasksCalendar(req.user.id);
      finalCalendarIds = [tasksCalendar.id];
    }
    await setTaskCalendars(item.id, finalCalendarIds, req.user.id);
    item.calendar_ids = finalCalendarIds;
    res.status(201).json({ item });
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.patch('/:id', requireScope('tasks', 'write'), async (req, res) => {
  try {
    const { calendar_ids, ...updateData } = req.body;
    const item = await updateTask(req.params.id, updateData, req.user.id);
    if (!item) return res.status(404).json({ error: 'Task not found' });
    if (calendar_ids !== undefined) {
      await setTaskCalendars(item.id, calendar_ids || [], req.user.id);
      item.calendar_ids = calendar_ids || [];
    }
    res.json({ item });
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.post('/:id/toggle', requireScope('tasks', 'write'), async (req, res) => {
  try {
    const item = await toggleTaskComplete(req.params.id, req.user.id);
    if (!item) return res.status(404).json({ error: 'Task not found' });
    res.json({ item });
  } catch (err) {
    console.error('Error toggling task:', err);
    res.status(500).json({ error: 'Failed to toggle task' });
  }
});

router.post('/:id/toggle-my-day', requireScope('tasks', 'write'), async (req, res) => {
  try {
    const current = await getTaskById(req.params.id, req.user.id);
    if (!current) return res.status(404).json({ error: 'Task not found' });
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const newDueDate = (current.due_date && current.due_date.substring(0, 10) === todayStr) ? null : todayStr;
    const updated = await updateTask(req.params.id, { due_date: newDueDate }, req.user.id);
    res.json({ item: updated });
  } catch (err) {
    console.error('Toggle my-day error:', err);
    res.status(500).json({ error: 'Failed to toggle my day' });
  }
});

router.delete('/:id', requireScope('tasks', 'delete'), async (req, res) => {
  try {
    const deleted = await deleteTask(req.params.id, req.user.id);
    if (!deleted) return res.status(404).json({ error: 'Task not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
