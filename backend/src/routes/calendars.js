const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const {
  getAllCalendars,
  getCalendarById,
  createCalendar,
  updateCalendar,
  deleteCalendar,
  ensureSystemCalendars
} = require('../db/calendars');
const { requireScope } = require('../middleware/scopeAuth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/calendars
 * List all calendars for current user
 */
router.get('/', requireScope('calendar', 'read'), async (req, res) => {
  try {
    const userId = req.user.id;

    // Ensure user has system calendars (My Calendar + Tasks)
    await ensureSystemCalendars(userId);

    const calendars = await getAllCalendars(userId);
    res.json({ calendars });
  } catch (err) {
    console.error('Error fetching calendars:', err);
    res.status(500).json({ error: 'Failed to fetch calendars' });
  }
});

/**
 * GET /api/calendars/:id
 * Get a single calendar
 */
router.get('/:id', requireScope('calendar', 'read'), async (req, res) => {
  try {
    const userId = req.user.id;
    const calendar = await getCalendarById(req.params.id, userId);

    if (!calendar) {
      return res.status(404).json({ error: 'Calendar not found' });
    }

    res.json({ calendar });
  } catch (err) {
    console.error('Error fetching calendar:', err);
    res.status(500).json({ error: 'Failed to fetch calendar' });
  }
});

/**
 * POST /api/calendars
 * Create a new calendar
 */
router.post('/', requireScope('calendar', 'write'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Calendar name is required' });
    }

    const calendar = await createCalendar({
      name: name.trim(),
      description,
      color
    }, userId);

    res.status(201).json({ calendar });
  } catch (err) {
    console.error('Error creating calendar:', err);
    res.status(500).json({ error: 'Failed to create calendar' });
  }
});

/**
 * PATCH /api/calendars/:id
 * Update a calendar
 */
router.patch('/:id', requireScope('calendar', 'write'), async (req, res) => {
  try {
    const userId = req.user.id;
    const calendar = await updateCalendar(req.params.id, req.body, userId);

    if (!calendar) {
      return res.status(404).json({ error: 'Calendar not found' });
    }

    res.json({ calendar });
  } catch (err) {
    console.error('Error updating calendar:', err);
    res.status(500).json({ error: 'Failed to update calendar' });
  }
});

/**
 * DELETE /api/calendars/:id
 * Delete a calendar
 */
router.delete('/:id', requireScope('calendar', 'delete'), async (req, res) => {
  try {
    const userId = req.user.id;
    const deleted = await deleteCalendar(req.params.id, userId);

    if (!deleted) {
      return res.status(400).json({ error: 'Cannot delete calendar (may be default or not found)' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting calendar:', err);
    res.status(500).json({ error: 'Failed to delete calendar' });
  }
});

module.exports = router;
