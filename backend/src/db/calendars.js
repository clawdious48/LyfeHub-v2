const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

/**
 * Get all calendars for a user
 */
function getAllCalendars(userId) {
  const stmt = db.prepare(`
    SELECT * FROM calendars
    WHERE user_id = ?
    ORDER BY is_default DESC, name ASC
  `);
  return stmt.all(userId);
}

/**
 * Get a single calendar by ID
 */
function getCalendarById(id, userId) {
  const stmt = db.prepare(`SELECT * FROM calendars WHERE id = ? AND user_id = ?`);
  return stmt.get(id, userId);
}

/**
 * Create a new calendar
 */
function createCalendar(data, userId) {
  const id = uuidv4();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO calendars (id, name, description, color, user_id, is_default, system_type, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.name,
    data.description || '',
    data.color || '#00aaff',
    userId,
    data.is_default ? 1 : 0,
    data.system_type || null,
    now,
    now
  );

  return getCalendarById(id, userId);
}

/**
 * Update a calendar
 */
function updateCalendar(id, data, userId) {
  const existing = getCalendarById(id, userId);
  if (!existing) return null;

  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE calendars SET
      name = ?,
      description = ?,
      color = ?,
      updated_at = ?
    WHERE id = ? AND user_id = ?
  `);

  stmt.run(
    data.name ?? existing.name,
    data.description ?? existing.description,
    data.color ?? existing.color,
    now,
    id,
    userId
  );

  return getCalendarById(id, userId);
}

/**
 * Delete a calendar
 */
function deleteCalendar(id, userId) {
  // Don't allow deleting default or system calendars
  const calendar = getCalendarById(id, userId);
  if (!calendar || calendar.is_default || calendar.system_type) return false;

  const stmt = db.prepare(`DELETE FROM calendars WHERE id = ? AND user_id = ?`);
  const result = stmt.run(id, userId);
  return result.changes > 0;
}

/**
 * Ensure user has a default calendar, create one if not
 */
function ensureDefaultCalendar(userId) {
  const existing = db.prepare(`
    SELECT * FROM calendars WHERE user_id = ? AND is_default = 1
  `).get(userId);

  if (existing) return existing;

  // Create default calendar
  return createCalendar({
    name: 'My Calendar',
    description: 'Default calendar',
    color: '#00aaff',
    is_default: true
  }, userId);
}

/**
 * Ensure user has a Tasks calendar, create one if not
 */
function ensureTasksCalendar(userId) {
  const existing = db.prepare(`
    SELECT * FROM calendars WHERE user_id = ? AND system_type = 'tasks'
  `).get(userId);

  if (existing) return existing;

  // Create Tasks calendar with a distinct color
  return createCalendar({
    name: 'Tasks',
    description: 'All tasks are linked to this calendar by default',
    color: '#a855f7', // Purple
    is_default: false,
    system_type: 'tasks'
  }, userId);
}

/**
 * Get the Tasks calendar for a user
 */
function getTasksCalendar(userId) {
  return db.prepare(`
    SELECT * FROM calendars WHERE user_id = ? AND system_type = 'tasks'
  `).get(userId);
}

/**
 * Ensure all system calendars exist for a user
 */
function ensureSystemCalendars(userId) {
  ensureDefaultCalendar(userId);
  ensureTasksCalendar(userId);
}

module.exports = {
  getAllCalendars,
  getCalendarById,
  createCalendar,
  updateCalendar,
  deleteCalendar,
  ensureDefaultCalendar,
  ensureTasksCalendar,
  getTasksCalendar,
  ensureSystemCalendars
};
