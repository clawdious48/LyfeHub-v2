const db = require('./pool');
const { v4: uuidv4 } = require('uuid');

/**
 * Get user's default calendar ID (creates one if needed)
 */
async function getDefaultCalendarId(userId) {
  const cal = await db.getOne(`
    SELECT id FROM calendars WHERE user_id = $1 AND is_default = 1
  `, [userId]);
  if (!cal) throw new Error('No default calendar found for user');
  return cal.id;
}

/**
 * Join helper — base SELECT with calendar name + color
 */
const EVENT_SELECT = `
  SELECT e.*, c.name AS calendar_name, c.color AS calendar_color
  FROM calendar_events e
  LEFT JOIN calendars c ON c.id = e.calendar_id
`;

/**
 * Create a new calendar event
 */
async function createEvent(userId, data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const calendarId = data.calendar_id || await getDefaultCalendarId(userId);

  await db.run(`
    INSERT INTO calendar_events (
      id, calendar_id, user_id, title, description, location,
      start_date, start_time, end_date, end_time,
      is_all_day, timezone, rrule, color, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
  `, [
    id,
    calendarId,
    userId,
    data.title,
    data.description || null,
    data.location || null,
    data.start_date,
    data.start_time || null,
    data.end_date || data.start_date,
    data.end_time || null,
    data.is_all_day ? 1 : 0,
    data.timezone || null,
    data.rrule || null,
    data.color || null,
    now,
    now
  ]);

  return await getEvent(id, userId);
}

/**
 * Get a single event by ID (with calendar info)
 */
async function getEvent(eventId, userId) {
  return await db.getOne(`
    ${EVENT_SELECT}
    WHERE e.id = $1 AND e.user_id = $2
  `, [eventId, userId]);
}

/**
 * Update an event (partial update)
 */
async function updateEvent(eventId, userId, data) {
  const existing = await getEvent(eventId, userId);
  if (!existing) return null;

  const now = new Date().toISOString();

  await db.run(`
    UPDATE calendar_events SET
      title = $1,
      description = $2,
      location = $3,
      calendar_id = $4,
      start_date = $5,
      start_time = $6,
      end_date = $7,
      end_time = $8,
      is_all_day = $9,
      timezone = $10,
      rrule = $11,
      color = $12,
      updated_at = $13
    WHERE id = $14 AND user_id = $15
  `, [
    data.title ?? existing.title,
    data.description ?? existing.description,
    data.location ?? existing.location,
    data.calendar_id ?? existing.calendar_id,
    data.start_date ?? existing.start_date,
    data.start_time ?? existing.start_time,
    data.end_date ?? existing.end_date,
    data.end_time ?? existing.end_time,
    data.is_all_day !== undefined ? (data.is_all_day ? 1 : 0) : existing.is_all_day,
    data.timezone ?? existing.timezone,
    data.rrule ?? existing.rrule,
    data.color ?? existing.color,
    now,
    eventId,
    userId
  ]);

  return await getEvent(eventId, userId);
}

/**
 * Delete an event
 */
async function deleteEvent(eventId, userId) {
  const existing = await getEvent(eventId, userId);
  if (!existing) return false;

  const result = await db.run(`DELETE FROM calendar_events WHERE id = $1 AND user_id = $2`, [eventId, userId]);
  return result.rowCount > 0;
}

/**
 * Get events for a date range (overlap query)
 * Includes events where: start_date <= endDate AND end_date >= startDate
 */
async function getEventsForDateRange(userId, startDate, endDate) {
  return await db.getAll(`
    ${EVENT_SELECT}
    WHERE e.user_id = $1
      AND e.start_date <= $2
      AND e.end_date >= $3
    ORDER BY e.start_date ASC, e.start_time ASC NULLS FIRST
  `, [userId, endDate, startDate]);
}

/**
 * Get events for a single date
 */
async function getEventsForDate(userId, date) {
  return await getEventsForDateRange(userId, date, date);
}

/**
 * Get all events for a user (no date filter)
 */
async function getUserEvents(userId) {
  return await db.getAll(`
    ${EVENT_SELECT}
    WHERE e.user_id = $1
    ORDER BY e.start_date ASC, e.start_time ASC NULLS FIRST
  `, [userId]);
}

/**
 * Get all events for a specific calendar
 */
async function getEventsByCalendar(calendarId, userId) {
  return await db.getAll(`
    ${EVENT_SELECT}
    WHERE e.calendar_id = $1 AND e.user_id = $2
    ORDER BY e.start_date ASC, e.start_time ASC NULLS FIRST
  `, [calendarId, userId]);
}

module.exports = {
  createEvent,
  getEvent,
  updateEvent,
  deleteEvent,
  getEventsForDateRange,
  getEventsForDate,
  getUserEvents,
  getEventsByCalendar
};
