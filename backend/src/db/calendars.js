const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

/**
 * Get all calendars for a user
 */
async function getAllCalendars(userId) {
  return await db.getAll(`
    SELECT * FROM calendars
    WHERE user_id = $1
    ORDER BY is_default DESC, name ASC
  `, [userId]);
}

/**
 * Get a single calendar by ID
 */
async function getCalendarById(id, userId) {
  return await db.getOne(`SELECT * FROM calendars WHERE id = $1 AND user_id = $2`, [id, userId]);
}

/**
 * Create a new calendar
 */
async function createCalendar(data, userId) {
  const id = uuidv4();
  const now = new Date().toISOString();

  await db.run(`
    INSERT INTO calendars (id, name, description, color, user_id, is_default, system_type, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `, [
    id,
    data.name,
    data.description || '',
    data.color || '#00aaff',
    userId,
    data.is_default ? 1 : 0,
    data.system_type || null,
    now,
    now
  ]);

  return await getCalendarById(id, userId);
}

/**
 * Update a calendar
 */
async function updateCalendar(id, data, userId) {
  const existing = await getCalendarById(id, userId);
  if (!existing) return null;

  const now = new Date().toISOString();

  await db.run(`
    UPDATE calendars SET
      name = $1,
      description = $2,
      color = $3,
      updated_at = $4
    WHERE id = $5 AND user_id = $6
  `, [
    data.name ?? existing.name,
    data.description ?? existing.description,
    data.color ?? existing.color,
    now,
    id,
    userId
  ]);

  return await getCalendarById(id, userId);
}

/**
 * Delete a calendar
 */
async function deleteCalendar(id, userId) {
  // Don't allow deleting default or system calendars
  const calendar = await getCalendarById(id, userId);
  if (!calendar || calendar.is_default || calendar.system_type) return false;

  const result = await db.run(`DELETE FROM calendars WHERE id = $1 AND user_id = $2`, [id, userId]);
  return result.rowCount > 0;
}

/**
 * Ensure user has a default calendar, create one if not
 */
async function ensureDefaultCalendar(userId) {
  const existing = await db.getOne(`
    SELECT * FROM calendars WHERE user_id = $1 AND is_default = 1
  `, [userId]);

  if (existing) return existing;

  return await createCalendar({
    name: 'My Calendar',
    description: 'Default calendar',
    color: '#00aaff',
    is_default: true
  }, userId);
}

/**
 * Ensure user has a Tasks calendar, create one if not
 */
async function ensureTasksCalendar(userId) {
  const existing = await db.getOne(`
    SELECT * FROM calendars WHERE user_id = $1 AND system_type = 'tasks'
  `, [userId]);

  if (existing) return existing;

  return await createCalendar({
    name: 'Tasks',
    description: 'All tasks are linked to this calendar by default',
    color: '#a855f7',
    is_default: false,
    system_type: 'tasks'
  }, userId);
}

/**
 * Get the Tasks calendar for a user
 */
async function getTasksCalendar(userId) {
  return await db.getOne(`
    SELECT * FROM calendars WHERE user_id = $1 AND system_type = 'tasks'
  `, [userId]);
}

/**
 * Ensure all system calendars exist for a user
 */
async function ensureSystemCalendars(userId) {
  await ensureDefaultCalendar(userId);
  await ensureTasksCalendar(userId);
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
