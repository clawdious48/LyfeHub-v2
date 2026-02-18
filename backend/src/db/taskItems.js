const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

/**
 * Get all task items for a user
 */
async function getAllTaskItems(userId, view = 'all', userDate = null) {
  let sql = `SELECT * FROM task_items WHERE user_id = $1`;
  const params = [userId];
  let paramIdx = 2;

  // Use user-provided date if available, otherwise server date
  let today;
  if (userDate && /^\d{4}-\d{2}-\d{2}$/.test(userDate)) {
    today = userDate;
  } else {
    const now = new Date();
    today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  console.log(`[getAllTaskItems] view=${view}, userDate=${userDate}, today=${today}, userId=${userId}`);

  // Get today's day of week (0=Sun, 1=Mon, ... 6=Sat) for recurring check
  const todayDate = new Date(today + 'T00:00:00');
  const todayDow = todayDate.getDay();

  // Handle list: prefix for custom lists
  if (view.startsWith('list:')) {
    const listId = view.substring(5);
    sql += ` AND list_id = $${paramIdx++}`;
    params.push(listId);
  } else {
    switch (view) {
      case 'my-day':
        // Show: due today, flagged for My Day, recurring today, or overdue — all incomplete
        sql += ` AND completed = 0 AND (
          due_date = $${paramIdx++}
          OR my_day = 1
          OR (recurring IS NOT NULL AND recurring != '' AND recurring_days::jsonb @> $${paramIdx++}::jsonb)
          OR (due_date IS NOT NULL AND due_date < $${paramIdx++})
        )`;
        params.push(today, JSON.stringify([todayDow]), today);
        break;
      case 'important':
        sql += ` AND important = 1 AND completed = 0`;
        break;
      case 'scheduled':
        sql += ` AND due_date IS NOT NULL AND completed = 0`;
        break;
      case 'recurring':
        sql += ` AND recurring IS NOT NULL AND recurring != '' AND completed = 0`;
        break;
      case 'completed':
        sql += ` AND completed = 1`;
        break;
      case 'all':
      default:
        sql += ` AND completed = 0`;
        break;
    }
  }

  sql += ` ORDER BY
    completed ASC,
    important DESC,
    CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
    due_date ASC,
    created_at DESC`;

  console.log(`[getAllTaskItems] SQL: ${sql}`);
  console.log(`[getAllTaskItems] Params: ${JSON.stringify(params)}`);
  const items = await db.getAll(sql, params);
  console.log(`[getAllTaskItems] Found ${items.length} items`);

  // Parse JSON fields and add calendar_ids
  const results = [];
  for (const item of items) {
    results.push({
      ...item,
      subtasks: JSON.parse(item.subtasks || '[]'),
      recurring_days: JSON.parse(item.recurring_days || '[]'),
      important: !!item.important,
      completed: !!item.completed,
      my_day: !!item.my_day,
      people_ids: JSON.parse(item.people_ids || '[]'),
      note_ids: JSON.parse(item.note_ids || '[]'),
      calendar_ids: await getTaskItemCalendarIds(item.id)
    });
  }
  return results;
}

/**
 * Get calendar IDs associated with a task item
 */
async function getTaskItemCalendarIds(taskItemId) {
  const rows = await db.getAll(`SELECT calendar_id FROM task_item_calendars WHERE task_item_id = $1`, [taskItemId]);
  return rows.map(r => r.calendar_id);
}

/**
 * Set calendar associations for a task item
 */
async function setTaskItemCalendars(taskItemId, calendarIds, userId) {
  // First verify the task belongs to the user
  const task = await db.getOne(`SELECT id FROM task_items WHERE id = $1 AND user_id = $2`, [taskItemId, userId]);
  if (!task) return false;

  // Delete existing associations
  await db.run(`DELETE FROM task_item_calendars WHERE task_item_id = $1`, [taskItemId]);

  // Insert new associations (only for calendars belonging to this user)
  if (calendarIds && calendarIds.length > 0) {
    for (const calendarId of calendarIds) {
      await db.run(`
        INSERT INTO task_item_calendars (task_item_id, calendar_id)
        SELECT $1, id FROM calendars WHERE id = $2 AND user_id = $3
      `, [taskItemId, calendarId, userId]);
    }
  }

  return true;
}

/**
 * Get a single task item by ID
 */
async function getTaskItemById(id, userId) {
  const item = await db.getOne(`SELECT * FROM task_items WHERE id = $1 AND user_id = $2`, [id, userId]);

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
    calendar_ids: await getTaskItemCalendarIds(id)
  };
}

/**
 * Create a new task item
 */
async function createTaskItem(data, userId) {
  const id = uuidv4();
  const now = new Date().toISOString();

  await db.run(`
    INSERT INTO task_items (id, title, description, status, my_day, due_date, due_time, due_time_end, snooze_date, priority, energy, location, important, recurring, recurring_days, project_id, list_id, people_ids, note_ids, subtasks, user_id, area_id, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
  `, [
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
    data.area_id || null,
    now,
    now
  ]);

  // Set calendar associations if provided
  if (data.calendar_ids && data.calendar_ids.length > 0) {
    await setTaskItemCalendars(id, data.calendar_ids, userId);
  }

  return await getTaskItemById(id, userId);
}

/**
 * Update a task item
 */
async function updateTaskItem(id, data, userId) {
  const existing = await getTaskItemById(id, userId);
  if (!existing) return null;

  const now = new Date().toISOString();
  const completedAt = data.completed && !existing.completed ? now : (data.completed ? existing.completed_at : null);

  await db.run(`
    UPDATE task_items SET
      title = $1,
      description = $2,
      status = $3,
      my_day = $4,
      due_date = $5,
      due_time = $6,
      due_time_end = $7,
      snooze_date = $8,
      priority = $9,
      energy = $10,
      location = $11,
      important = $12,
      completed = $13,
      completed_at = $14,
      recurring = $15,
      recurring_days = $16,
      project_id = $17,
      list_id = $18,
      people_ids = $19,
      note_ids = $20,
      subtasks = $21,
      area_id = $22,
      updated_at = $23
    WHERE id = $24 AND user_id = $25
  `, [
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
    data.area_id !== undefined ? data.area_id : (existing.area_id || null),
    now,
    id,
    userId
  ]);

  // Update calendar associations if provided
  if (data.calendar_ids !== undefined) {
    await setTaskItemCalendars(id, data.calendar_ids || [], userId);
  }

  return await getTaskItemById(id, userId);
}

/**
 * Delete a task item
 */
async function deleteTaskItem(id, userId) {
  const result = await db.run(`DELETE FROM task_items WHERE id = $1 AND user_id = $2`, [id, userId]);
  return result.rowCount > 0;
}

/**
 * Toggle task completion
 */
async function toggleTaskItemComplete(id, userId) {
  const existing = await getTaskItemById(id, userId);
  if (!existing) return null;

  const now = new Date().toISOString();
  const newCompleted = !existing.completed;

  await db.run(`
    UPDATE task_items SET
      completed = $1,
      completed_at = $2,
      updated_at = $3
    WHERE id = $4 AND user_id = $5
  `, [
    newCompleted ? 1 : 0,
    newCompleted ? now : null,
    now,
    id,
    userId
  ]);

  return await getTaskItemById(id, userId);
}

/**
 * Get task counts for sidebar
 */
async function getTaskItemCounts(userId, userDate = null) {
  let today;
  if (userDate && /^\d{4}-\d{2}-\d{2}$/.test(userDate)) {
    today = userDate;
  } else {
    const now = new Date();
    today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  // Get today's day of week for recurring check
  const todayDate = new Date(today + 'T00:00:00');
  const todayDow = todayDate.getDay();

  const counts = {
    'my-day': 0,
    'important': 0,
    'scheduled': 0,
    'recurring': 0,
    'all': 0
  };

  const result = await db.getOne(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN (
        due_date = $1
        OR my_day = 1
        OR (recurring IS NOT NULL AND recurring != '' AND recurring_days::jsonb @> $3::jsonb)
        OR (due_date IS NOT NULL AND due_date < $1)
      ) THEN 1 ELSE 0 END) as my_day,
      SUM(CASE WHEN important = 1 THEN 1 ELSE 0 END) as important,
      SUM(CASE WHEN due_date IS NOT NULL THEN 1 ELSE 0 END) as scheduled,
      SUM(CASE WHEN recurring IS NOT NULL AND recurring != '' THEN 1 ELSE 0 END) as recurring
    FROM task_items
    WHERE user_id = $2 AND completed = 0
  `, [today, userId, JSON.stringify([todayDow])]);

  if (result) {
    counts['my-day'] = parseInt(result.my_day) || 0;
    counts['important'] = parseInt(result.important) || 0;
    counts['scheduled'] = parseInt(result.scheduled) || 0;
    counts['recurring'] = parseInt(result.recurring) || 0;
    counts['all'] = parseInt(result.total) || 0;
  }

  return counts;
}

/**
 * Get task items for calendar view (within a date range)
 */
async function getTaskItemsForCalendar(userId, startDate, endDate, calendarIds = null) {
  let sql = `SELECT DISTINCT t.* FROM task_items t`;
  const params = [userId, startDate, endDate];
  let paramIdx = 4;

  if (calendarIds && calendarIds.length > 0) {
    const placeholders = calendarIds.map(() => `$${paramIdx++}`).join(',');
    sql += ` INNER JOIN task_item_calendars tc ON t.id = tc.task_item_id
             WHERE t.user_id = $1
             AND t.due_date IS NOT NULL
             AND t.due_date >= $2
             AND t.due_date <= $3
             AND tc.calendar_id IN (${placeholders})`;
    params.push(...calendarIds);
  } else {
    sql += ` WHERE t.user_id = $1
             AND t.due_date IS NOT NULL
             AND t.due_date >= $2
             AND t.due_date <= $3`;
  }

  sql += ` ORDER BY t.due_date ASC, t.due_time ASC, t.created_at DESC`;

  const items = await db.getAll(sql, params);

  const results = [];
  for (const item of items) {
    results.push({
      ...item,
      subtasks: JSON.parse(item.subtasks || '[]'),
      recurring_days: JSON.parse(item.recurring_days || '[]'),
      important: !!item.important,
      completed: !!item.completed,
      my_day: !!item.my_day,
      people_ids: JSON.parse(item.people_ids || '[]'),
      note_ids: JSON.parse(item.note_ids || '[]'),
      calendar_ids: await getTaskItemCalendarIds(item.id)
    });
  }
  return results;
}

/**
 * Get scheduled task items (have due_date)
 */
async function getScheduledTaskItems(userId, calendarIds = null) {
  let sql = `SELECT DISTINCT t.* FROM task_items t`;
  const params = [userId];
  let paramIdx = 2;

  if (calendarIds && calendarIds.length > 0) {
    const placeholders = calendarIds.map(() => `$${paramIdx++}`).join(',');
    sql += ` INNER JOIN task_item_calendars tc ON t.id = tc.task_item_id
             WHERE t.user_id = $1
             AND t.due_date IS NOT NULL
             AND t.completed = 0
             AND tc.calendar_id IN (${placeholders})`;
    params.push(...calendarIds);
  } else {
    sql += ` WHERE t.user_id = $1
             AND t.due_date IS NOT NULL
             AND t.completed = 0`;
  }

  sql += ` ORDER BY t.due_date ASC, t.due_time ASC`;

  const items = await db.getAll(sql, params);

  const results = [];
  for (const item of items) {
    results.push({
      ...item,
      subtasks: JSON.parse(item.subtasks || '[]'),
      recurring_days: JSON.parse(item.recurring_days || '[]'),
      important: !!item.important,
      completed: !!item.completed,
      my_day: !!item.my_day,
      people_ids: JSON.parse(item.people_ids || '[]'),
      note_ids: JSON.parse(item.note_ids || '[]'),
      calendar_ids: await getTaskItemCalendarIds(item.id)
    });
  }
  return results;
}

/**
 * Get unscheduled task items (no due_date)
 */
async function getUnscheduledTaskItems(userId, calendarIds = null) {
  let sql = `SELECT DISTINCT t.* FROM task_items t`;
  const params = [userId];
  let paramIdx = 2;

  if (calendarIds && calendarIds.length > 0) {
    const placeholders = calendarIds.map(() => `$${paramIdx++}`).join(',');
    sql += ` INNER JOIN task_item_calendars tc ON t.id = tc.task_item_id
             WHERE t.user_id = $1
             AND t.due_date IS NULL
             AND t.completed = 0
             AND tc.calendar_id IN (${placeholders})`;
    params.push(...calendarIds);
  } else {
    sql += ` WHERE t.user_id = $1
             AND t.due_date IS NULL
             AND t.completed = 0`;
  }

  sql += ` ORDER BY t.important DESC, t.created_at DESC`;

  const items = await db.getAll(sql, params);

  const results = [];
  for (const item of items) {
    results.push({
      ...item,
      subtasks: JSON.parse(item.subtasks || '[]'),
      recurring_days: JSON.parse(item.recurring_days || '[]'),
      important: !!item.important,
      completed: !!item.completed,
      my_day: !!item.my_day,
      people_ids: JSON.parse(item.people_ids || '[]'),
      note_ids: JSON.parse(item.note_ids || '[]'),
      calendar_ids: await getTaskItemCalendarIds(item.id)
    });
  }
  return results;
}

/**
 * Schedule a task item (set due_date/due_time/due_time_end)
 */
async function scheduleTaskItem(id, scheduleData, userId) {
  const existing = await getTaskItemById(id, userId);
  if (!existing) return null;

  const now = new Date().toISOString();

  await db.run(`
    UPDATE task_items SET
      due_date = $1,
      due_time = $2,
      due_time_end = $3,
      updated_at = $4
    WHERE id = $5 AND user_id = $6
  `, [
    scheduleData.due_date,
    scheduleData.due_time || null,
    scheduleData.due_time_end || null,
    now,
    id,
    userId
  ]);

  return await getTaskItemById(id, userId);
}

/**
 * Unschedule a task item (clear due_date/due_time)
 */
async function unscheduleTaskItem(id, userId) {
  const existing = await getTaskItemById(id, userId);
  if (!existing) return null;

  const now = new Date().toISOString();

  await db.run(`
    UPDATE task_items SET
      due_date = NULL,
      due_time = NULL,
      updated_at = $1
    WHERE id = $2 AND user_id = $3
  `, [now, id, userId]);

  return await getTaskItemById(id, userId);
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
