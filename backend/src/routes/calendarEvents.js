const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { requireScope } = require('../middleware/scopeAuth');
const {
  createEvent,
  getEvent,
  updateEvent,
  deleteEvent,
  getEventsForDateRange,
  getUserEvents
} = require('../db/calendarEvents');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/calendar-events
 * List events. Optional ?start=YYYY-MM-DD&end=YYYY-MM-DD for date range filtering.
 */
router.get('/', requireScope('calendar', 'read'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { start, end } = req.query;

    let events;
    if (start && end) {
      events = await getEventsForDateRange(userId, start, end);
    } else {
      events = await getUserEvents(userId);
    }

    res.json({ events });
  } catch (err) {
    console.error('Error fetching calendar events:', err);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

/**
 * GET /api/calendar-events/:id
 * Get a single event
 */
router.get('/:id', requireScope('calendar', 'read'), async (req, res) => {
  try {
    const userId = req.user.id;
    const event = await getEvent(req.params.id, userId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ event });
  } catch (err) {
    console.error('Error fetching calendar event:', err);
    res.status(500).json({ error: 'Failed to fetch calendar event' });
  }
});

/**
 * POST /api/calendar-events
 * Create a new event
 */
router.post('/', requireScope('calendar', 'write'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, start_date } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Event title is required' });
    }

    if (!start_date) {
      return res.status(400).json({ error: 'Event start_date is required' });
    }

    const event = await createEvent(userId, req.body);

    res.status(201).json({ event });
  } catch (err) {
    console.error('Error creating calendar event:', err);
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
});

/**
 * PATCH /api/calendar-events/:id
 * Update an event
 */
router.patch('/:id', requireScope('calendar', 'write'), async (req, res) => {
  try {
    const userId = req.user.id;
    const event = await updateEvent(req.params.id, userId, req.body);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ event });
  } catch (err) {
    console.error('Error updating calendar event:', err);
    res.status(500).json({ error: 'Failed to update calendar event' });
  }
});

/**
 * DELETE /api/calendar-events/:id
 * Delete an event
 */
router.delete('/:id', requireScope('calendar', 'delete'), async (req, res) => {
  try {
    const userId = req.user.id;
    const deleted = await deleteEvent(req.params.id, userId);

    if (!deleted) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting calendar event:', err);
    res.status(500).json({ error: 'Failed to delete calendar event' });
  }
});

module.exports = router;
