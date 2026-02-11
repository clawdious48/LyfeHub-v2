const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

/**
 * Get all task items for a user
 */
function getAllTaskItems(userId, view = 'all', userDate = null) {
  let sql = `SELECT * FROM task_items WHERE user_id = ?`;
  const params = [userId];
  
  // Use user-provided date if available, otherwise server date
  let today;
  if (userDate && /^\d{4}-\d{2}-\d{2}$/.test(userDate)) {
    today = userDate;
  } else {
    const now = new Date();
    today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  
  console.log(`[getAllTaskItems] view=${view}, userDate=${userDate}, today=${today}, userId=${userId}`);
  
  // Handle list: prefix for custom lists
  if (view.startsWith('list:')) {
    const listId = view.substring(5);
    sql += ` AND list_id = ?`;
    params.push(listId);
  } else {
    switch (view) {
      case 'my-day':
        sql += ` AND due_date = ?`;
        params.push(today);
        break;
      case 'important':
        sql += ` AND important = 1`;
        break;
      case 'scheduled':
        sql += ` AND due_date IS NOT NULL`;
        break;
      case 'recurring':
        sql += ` AND recurring IS NOT NULL AND recurring != ''`;
        break;
      case 'completed':
        sql += ` AND completed = 1`;
        break;
      case 'all':
      default:
        // No additional filter
        break;
    }
  }
  
  sql += ` ORDER BY 
    completed ASC,
    important DESC, 
    CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
    due_date ASC,
    created_at DESC`;
  
  const stmt = db.prepare(sql);
  console.log(`[getAllTaskItems] SQL: ${sql}`);
  console.log(`[getAllTaskItems] Params: ${JSON.stringify(params)}`);
  const items = stmt.all(...params);
  console.log(`[getAllTaskItems] Found ${items.length} items`);

  // Parse JSON fields and add calendar_ids
  return items.map(item => ({
    ...item,
    subtasks: JSON.parse(item.subtasks || '[]'),
    recurring_days: JSON.parse(item.recurring_days || '[]'),
    important: !!item.important,
    completed: !!item.completed,
    my_day: !!item.my_day,
    people_ids: JSON.parse(item.people_ids || '[]'),
    note_ids: JSON.parse(item.note_ids || '[]'),
    calendar_ids: getTaskItemCalendarIds(item.id)
  }));
}

/**
 * Get calendar IDs associated with a task item
 */
function getTaskItemCalendarIds(taskItemId) {
  const stmt = db.prepare(`SELECT calendar_id FROM task_item_calendars WHERE task_item_id = ?`);
  const rows = stmt.all(taskItemId);
  return rows.map(r => r.calendar_id);
}

/**
 * Set calendar associations for a task item
 */
function setTaskItemCalendars(taskItemId, calendarIds, userId) {
  // First verify the task belongs to the user
  const task = db.prepare(`SELECT id FROM task_items WHERE id = ? AND user_id = ?`).get(taskItemId, userId);
  if (!task) return false;

  // Delete existing associations
  db.prepare(`DELETE FROM task_item_calendars WHERE task_item_id = ?`).run(taskItemId);

  // Insert new associations (only for calendars belonging to this user)
  if (calendarIds && calendarIds.length > 0) {
    const insertStmt = db.prepare(`
      INSERT INTO task_item_calendars (task_item_id, calendar_id)
      SELECT ?, id FROM calendars WHERE id = ? AND user_id = ?
    `);
    for (const calendarId of calendarIds) {
      insertStmt.run(taskItemId, calendarId, userId);
    }
  }

  return true;
}

/**
 * Get a single task item by ID
 */
function getTaskItemById(id, userId) {
  const stmt = db.prepare(`SELECT * FROM task_items WHERE id = ? AND user_id = ?`);
  const item = stmt.get(id, userId);

  if (!item) return null;

  return {
    ...item,
    subtasks: JSON.parse(item.subtasks || '[]'),
    recurring_days: JSON.parse(item.recurring_days || '[]'),
    important: !!item.important,
    completed: !!item.completed,
    my_day: !!item.my_day,
    people_ids: JSON.parse(item.people_ids || '[]'),
    note_ids: JSON.parse(item.note_ids || '[]'),
    calendar_ids: getTaskItemCalendarIds(id)
  };
}

/**
 * Create a new task item
 */
function createTaskItem(data, userId) {
  const id = uuidv4();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO task_items (id, title, description, status, my_day, due_date, due_time, due_time_end, snooze_date, priority, energy, location, important, recurring, recurring_days, project_id, list_id, people_ids, note_ids, subtasks, user_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.title,
    data.description || '',
    data.status || 'todo',
    data.my_day ? 1 : 0,
    data.due_date || null,
    data.due_time || null,
    data.due_time_end || null,
    data.snooze_date || null,
    data.priority || null,
    data.energy || null,
    data.location || null,
    data.important ? 1 : 0,
    data.recurring || null,
    JSON.stringify(data.recurring_days || []),
    data.project_id || null,
    data.list_id || null,
    JSON.stringify(data.people_ids || []),
    JSON.stringify(data.note_ids || []),
    JSON.stringify(data.subtasks || []),
    userId,
    now,
    now
  );

  // Set calendar associations if provided
  if (data.calendar_ids && data.calendar_ids.length > 0) {
    setTaskItemCalendars(id, data.calendar_ids, userId);
  }

  return getTaskItemById(id, userId);
}

/**
 * Update a task item
 */
function updateTaskItem(id, data, userId) {
  const existing = getTaskItemById(id, userId);
  if (!existing) return null;

  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE task_items SET
      title = ?,
      description = ?,
      status = ?,
      my_day = ?,
      due_date = ?,
      due_time = ?,
      due_time_end = ?,
      snooze_date = ?,
      priority = ?,
      energy = ?,
      location = ?,
      important = ?,
      completed = ?,
      completed_at = ?,
      recurring = ?,
      recurring_days = ?,
      project_id = ?,
      list_id = ?,
      people_ids = ?,
      note_ids = ?,
      subtasks = ?,
      updated_at = ?
    WHERE id = ? AND user_id = ?
  `);

  const completedAt = data.completed && !existing.completed ? now : (data.completed ? existing.completed_at : null);

  stmt.run(
    data.title ?? existing.title,
    data.description ?? existing.description,
    data.status ?? existing.status ?? 'todo',
    data.my_day !== undefined ? (data.my_day ? 1 : 0) : (existing.my_day ? 1 : 0),
    data.due_date ?? existing.due_date,
    data.due_time ?? existing.due_time,
    data.due_time_end ?? existing.due_time_end,
    data.snooze_date ?? existing.snooze_date,
    data.priority ?? existing.priority,
    data.energy ?? existing.energy,
    data.location ?? existing.location,
    data.important !== undefined ? (data.important ? 1 : 0) : (existing.important ? 1 : 0),
    data.completed !== undefined ? (data.completed ? 1 : 0) : (existing.completed ? 1 : 0),
    completedAt,
    data.recurring ?? existing.recurring,
    JSON.stringify(data.recurring_days ?? existing.recurring_days),
    data.project_id ?? existing.project_id,
    data.list_id ?? existing.list_id,
    JSON.stringify(data.people_ids ?? existing.people_ids ?? []),
    JSON.stringify(data.note_ids ?? existing.note_ids ?? []),
    JSON.stringify(data.subtasks ?? existing.subtasks),
    now,
    id,
    userId
  );

  // Update calendar associations if provided
  if (data.calendar_ids !== undefined) {
    setTaskItemCalendars(id, data.calendar_ids || [], userId);
  }

  return getTaskItemById(id, userId);
}

/**
 * Delete a task item
 */
function deleteTaskItem(id, userId) {
  const stmt = db.prepare(`DELETE FROM task_items WHERE id = ? AND user_id = ?`);
  const result = stmt.run(id, userId);
  return result.changes > 0;
}

/**
 * Toggle task completion
 */
function toggleTaskItemComplete(id, userId) {
  const existing = getTaskItemById(id, userId);
  if (!existing) return null;
  
  const now = new Date().toISOString();
  const newCompleted = !existing.completed;
  
  const stmt = db.prepare(`
    UPDATE task_items SET
      completed = ?,
      completed_at = ?,
      updated_at = ?
    WHERE id = ? AND user_id = ?
  `);
  
  stmt.run(
    newCompleted ? 1 : 0,
    newCompleted ? now : null,
    now,
    id,
    userId
  );
  
  return getTaskItemById(id, userId);
}

/**
 * Get task counts for sidebar
 */
function getTaskItemCounts(userId, userDate = null) {
  let today;
  if (userDate && /^\d{4}-\d{2}-\d{2}$/.test(userDate)) {
    today = userDate;
  } else {
    const now = new Date();
    today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  
  const counts = {
    'my-day': 0,
    'important': 0,
    'scheduled': 0,
    'recurring': 0,
    'all': 0
  };
  
  const stmt = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN due_date = ? THEN 1 ELSE 0 END) as my_day,
      SUM(CASE WHEN important = 1 THEN 1 ELSE 0 END) as important,
      SUM(CASE WHEN due_date IS NOT NULL THEN 1 ELSE 0 END) as scheduled,
      SUM(CASE WHEN recurring IS NOT NULL AND recurring != '' THEN 1 ELSE 0 END) as recurring
    FROM task_items 
    WHERE user_id = ? AND completed = 0
  `);
  
  const result = stmt.get(today, userId);
  
  if (result) {
    counts['my-day'] = result.my_day || 0;
    counts['important'] = result.important || 0;
    counts['scheduled'] = result.scheduled || 0;
    counts['recurring'] = result.recurring || 0;
    counts['all'] = result.total || 0;
  }
  
  return counts;
}

/**
 * Get task items for calendar view (within a date range)
 * @param {string} userId
 * @param {string} startDate
 * @param {string} endDate
 * @param {string[]} calendarIds - Optional: filter by calendar IDs
 */
function getTaskItemsForCalendar(userId, startDate, endDate, calendarIds = null) {
  let sql = `
    SELECT DISTINCT t.* FROM task_items t
  `;

  const params = [userId, startDate, endDate];

  // If filtering by calendars, join with junction table
  if (calendarIds && calendarIds.length > 0) {
    sql += ` INNER JOIN task_item_calendars tc ON t.id = tc.task_item_id
             WHERE t.user_id = ?
             AND t.due_date IS NOT NULL
             AND t.due_date >= ?
             AND t.due_date <= ?
             AND tc.calendar_id IN (${calendarIds.map(() => '?').join(',')})`;
    params.push(...calendarIds);
  } else {
    sql += ` WHERE t.user_id = ?
             AND t.due_date IS NOT NULL
             AND t.due_date >= ?
             AND t.due_date <= ?`;
  }

  sql += ` ORDER BY t.due_date ASC, t.due_time ASC, t.created_at DESC`;

  const stmt = db.prepare(sql);
  const items = stmt.all(...params);

  return items.map(item => ({
    ...item,
    subtasks: JSON.parse(item.subtasks || '[]'),
    recurring_days: JSON.parse(item.recurring_days || '[]'),
    important: !!item.important,
    completed: !!item.completed,
    my_day: !!item.my_day,
    people_ids: JSON.parse(item.people_ids || '[]'),
    note_ids: JSON.parse(item.note_ids || '[]'),
    calendar_ids: getTaskItemCalendarIds(item.id)
  }));
}

/**
 * Get scheduled task items (have due_date)
 * @param {string} userId
 * @param {string[]} calendarIds - Optional: filter by calendar IDs
 */
function getScheduledTaskItems(userId, calendarIds = null) {
  let sql = `SELECT DISTINCT t.* FROM task_items t`;
  const params = [userId];

  if (calendarIds && calendarIds.length > 0) {
    sql += ` INNER JOIN task_item_calendars tc ON t.id = tc.task_item_id
             WHERE t.user_id = ?
             AND t.due_date IS NOT NULL
             AND t.completed = 0
             AND tc.calendar_id IN (${calendarIds.map(() => '?').join(',')})`;
    params.push(...calendarIds);
  } else {
    sql += ` WHERE t.user_id = ?
             AND t.due_date IS NOT NULL
             AND t.completed = 0`;
  }

  sql += ` ORDER BY t.due_date ASC, t.due_time ASC`;

  const stmt = db.prepare(sql);
  const items = stmt.all(...params);

  return items.map(item => ({
    ...item,
    subtasks: JSON.parse(item.subtasks || '[]'),
    recurring_days: JSON.parse(item.recurring_days || '[]'),
    important: !!item.important,
    completed: !!item.completed,
    my_day: !!item.my_day,
    people_ids: JSON.parse(item.people_ids || '[]'),
    note_ids: JSON.parse(item.note_ids || '[]'),
    calendar_ids: getTaskItemCalendarIds(item.id)
  }));
}

/**
 * Get unscheduled task items (no due_date)
 * @param {string} userId
 * @param {string[]} calendarIds - Optional: filter by calendar IDs
 */
function getUnscheduledTaskItems(userId, calendarIds = null) {
  let sql = `SELECT DISTINCT t.* FROM task_items t`;
  const params = [userId];

  if (calendarIds && calendarIds.length > 0) {
    sql += ` INNER JOIN task_item_calendars tc ON t.id = tc.task_item_id
             WHERE t.user_id = ?
             AND t.due_date IS NULL
             AND t.completed = 0
             AND tc.calendar_id IN (${calendarIds.map(() => '?').join(',')})`;
    params.push(...calendarIds);
  } else {
    sql += ` WHERE t.user_id = ?
             AND t.due_date IS NULL
             AND t.completed = 0`;
  }

  sql += ` ORDER BY t.important DESC, t.created_at DESC`;

  const stmt = db.prepare(sql);
  const items = stmt.all(...params);

  return items.map(item => ({
    ...item,
    subtasks: JSON.parse(item.subtasks || '[]'),
    recurring_days: JSON.parse(item.recurring_days || '[]'),
    important: !!item.important,
    completed: !!item.completed,
    my_day: !!item.my_day,
    people_ids: JSON.parse(item.people_ids || '[]'),
    note_ids: JSON.parse(item.note_ids || '[]'),
    calendar_ids: getTaskItemCalendarIds(item.id)
  }));
}

/**
 * Schedule a task item (set due_date/due_time/due_time_end)
 */
function scheduleTaskItem(id, scheduleData, userId) {
  const existing = getTaskItemById(id, userId);
  if (!existing) return null;

  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE task_items SET
      due_date = ?,
      due_time = ?,
      due_time_end = ?,
      updated_at = ?
    WHERE id = ? AND user_id = ?
  `);

  stmt.run(
    scheduleData.due_date,
    scheduleData.due_time || null,
    scheduleData.due_time_end || null,
    now,
    id,
    userId
  );

  return getTaskItemById(id, userId);
}

/**
 * Unschedule a task item (clear due_date/due_time)
 */
function unscheduleTaskItem(id, userId) {
  const existing = getTaskItemById(id, userId);
  if (!existing) return null;

  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE task_items SET
      due_date = NULL,
      due_time = NULL,
      updated_at = ?
    WHERE id = ? AND user_id = ?
  `);

  stmt.run(now, id, userId);

  return getTaskItemById(id, userId);
}

module.exports = {
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
  // Calendar association functions
  getTaskItemCalendarIds,
  setTaskItemCalendars
};
