const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

/**
 * Parse JSON fields from database row
 */
function parseTask(row) {
  if (!row) return null;
  return {
    ...row,
    acceptance_criteria: JSON.parse(row.acceptance_criteria || '[]'),
    context_links: JSON.parse(row.context_links || '[]'),
    activity_log: JSON.parse(row.activity_log || '[]'),
    review_state: JSON.parse(row.review_state || '{}'),
    is_all_day: row.is_all_day === 1 || row.is_all_day === true
  };
}

/**
 * Create an activity log entry
 */
function createLogEntry(type, message, details = {}) {
  return {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    type,
    message,
    details
  };
}

/**
 * Get all tasks for a user, optionally filtered by status
 */
async function getAllTasks(userId, status = null) {
  let sql = 'SELECT * FROM tasks';
  const params = [];
  const conditions = [];
  let paramIndex = 1;
  
  if (userId) {
    conditions.push(`user_id = $${paramIndex++}`);
    params.push(userId);
  }
  
  if (status) {
    conditions.push(`status = $${paramIndex++}`);
    params.push(status);
  }
  
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  
  sql += ' ORDER BY priority ASC, created_at DESC';
  
  const rows = await db.getAll(sql, params);
  return rows.map(parseTask);
}

/**
 * Get a single task by ID
 */
async function getTaskById(id, userId = null) {
  let sql = 'SELECT * FROM tasks WHERE id = $1';
  const params = [id];
  
  if (userId) {
    sql += ' AND user_id = $2';
    params.push(userId);
  }
  
  const row = await db.getOne(sql, params);
  return parseTask(row);
}

/**
 * Create a new task
 */
async function createTask(data, userId = null) {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  const activityLog = [
    createLogEntry('created', 'Task created', {
      title: data.title,
      status: data.status || 'planned',
      priority: data.priority || 3
    })
  ];
  
  await db.run(`
    INSERT INTO tasks (
      id, title, description, acceptance_criteria, status, 
      priority, context_links, notes, activity_log, user_id, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
  `, [
    id,
    data.title,
    data.description || '',
    JSON.stringify(data.acceptance_criteria || []),
    data.status || 'planned',
    data.priority || 3,
    JSON.stringify(data.context_links || []),
    data.notes || '',
    JSON.stringify(activityLog),
    userId,
    now,
    now
  ]);
  
  return await getTaskById(id);
}

/**
 * Update an existing task
 */
async function updateTask(id, data, userId = null) {
  const existing = await getTaskById(id, userId);
  if (!existing) return null;
  
  const now = new Date().toISOString();
  
  let activityLog = existing.activity_log || [];
  
  if (data.status && data.status !== existing.status) {
    const logEntry = createLogEntry('status_change', 
      `Status changed from "${existing.status}" to "${data.status}"`,
      {
        from: existing.status,
        to: data.status,
        reason: data.status_reason || null
      }
    );
    
    if (data.status === 'blocked' && data.status_reason) {
      logEntry.type = 'blocked';
      logEntry.message = `⛔ Blocked: ${data.status_reason}`;
    } else if (data.status === 'review' && data.status_reason) {
      logEntry.type = 'review';
      logEntry.message = `👀 Review: ${data.status_reason}`;
    }
    
    activityLog.push(logEntry);
  }
  
  if (data.log_entry) {
    activityLog.push(createLogEntry(
      data.log_entry.type || 'note',
      data.log_entry.message,
      data.log_entry.details || {}
    ));
  }
  
  const updates = [];
  const values = [];
  let paramIndex = 1;
  
  const allowedFields = [
    'title', 'description', 'status', 'priority', 'notes', 'session_id'
  ];
  
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = $${paramIndex++}`);
      values.push(data[field]);
    }
  }
  
  if (data.acceptance_criteria !== undefined) {
    updates.push(`acceptance_criteria = $${paramIndex++}`);
    values.push(JSON.stringify(data.acceptance_criteria));
  }
  
  if (data.context_links !== undefined) {
    updates.push(`context_links = $${paramIndex++}`);
    values.push(JSON.stringify(data.context_links));
  }
  
  if (data.review_state !== undefined) {
    updates.push(`review_state = $${paramIndex++}`);
    values.push(JSON.stringify(data.review_state));
  }
  
  updates.push(`activity_log = $${paramIndex++}`);
  values.push(JSON.stringify(activityLog));
  
  if (data.completed_at !== undefined) {
    updates.push(`completed_at = $${paramIndex++}`);
    values.push(data.completed_at);
  }
  
  updates.push(`updated_at = $${paramIndex++}`);
  values.push(now);
  
  values.push(id);
  
  await db.run(`UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values);
  
  return await getTaskById(id);
}

/**
 * Add an entry to a task's activity log
 */
async function addLogEntry(id, type, message, details = {}, userId = null) {
  const task = await getTaskById(id, userId);
  if (!task) return null;
  
  const activityLog = task.activity_log || [];
  activityLog.push(createLogEntry(type, message, details));
  
  const now = new Date().toISOString();
  await db.run('UPDATE tasks SET activity_log = $1, updated_at = $2 WHERE id = $3', [JSON.stringify(activityLog), now, id]);
  
  return await getTaskById(id);
}

/**
 * Delete a task
 */
async function deleteTask(id, userId = null) {
  const existing = await getTaskById(id, userId);
  if (!existing) return false;
  
  await db.run('DELETE FROM tasks WHERE id = $1', [id]);
  return true;
}

/**
 * Pick a task (claim it for work)
 */
async function pickTask(id, sessionId, userId = null) {
  const task = await getTaskById(id, userId);
  if (!task) return { error: 'Task not found', status: 404 };
  
  if (task.status !== 'ready') {
    return { 
      error: `Cannot pick task in '${task.status}' status. Task must be in 'ready' status.`, 
      status: 400 
    };
  }
  
  return {
    task: await updateTask(id, {
      status: 'in_progress',
      session_id: sessionId,
      status_reason: sessionId ? `Picked up by ${sessionId}` : 'Task picked up for work'
    }, userId)
  };
}

/**
 * Complete a task (move to review)
 */
async function completeTask(id, notes, userId = null) {
  const task = await getTaskById(id, userId);
  if (!task) return { error: 'Task not found', status: 404 };
  
  if (task.status !== 'in_progress') {
    return { 
      error: `Cannot complete task in '${task.status}' status. Task must be in 'in_progress' status.`, 
      status: 400 
    };
  }
  
  const updateData = {
    status: 'review',
    status_reason: notes || 'Task completed',
    completed_at: new Date().toISOString()
  };
  
  if (notes) {
    updateData.notes = task.notes 
      ? `${task.notes}\n\n---\n\n${notes}` 
      : notes;
  }
  
  return { task: await updateTask(id, updateData, userId) };
}

/**
 * Submit a review for a task
 */
async function submitReview(id, reviewData, userId = null) {
  const task = await getTaskById(id, userId);
  if (!task) return { error: 'Task not found', status: 404 };
  
  if (task.status !== 'review') {
    return { error: 'Task must be in review status', status: 400 };
  }
  
  const now = new Date().toISOString();
  const activityLog = task.activity_log || [];
  
  const approved = [];
  const needsWork = [];
  
  reviewData.criteria.forEach(c => {
    const criterionText = task.acceptance_criteria[c.index] || `Criterion ${c.index}`;
    if (c.status === 'approved') {
      approved.push(criterionText);
    } else if (c.status === 'needs_work' && c.comment) {
      needsWork.push({ criterion: criterionText, comment: c.comment });
    }
  });
  
  let logMessage = '📋 Review submitted:\n';
  if (approved.length > 0) {
    logMessage += `\n✅ Approved (${approved.length}):\n`;
    approved.forEach(a => logMessage += `  • ${a}\n`);
  }
  if (needsWork.length > 0) {
    logMessage += `\n❌ Needs work (${needsWork.length}):\n`;
    needsWork.forEach(n => logMessage += `  • ${n.criterion}: "${n.comment}"\n`);
  }
  if (reviewData.generalComment) {
    logMessage += `\n💬 Additional comments:\n${reviewData.generalComment}\n`;
  }
  
  activityLog.push(createLogEntry('review_submitted', logMessage.trim(), {
    approved: approved.length,
    needsWork: needsWork.length,
    generalComment: reviewData.generalComment || null,
    details: reviewData.criteria
  }));
  
  const reviewState = {
    lastReviewAt: now,
    criteria: {}
  };
  reviewData.criteria.forEach(c => {
    reviewState.criteria[c.index] = {
      status: c.status,
      comment: c.comment || null,
      reviewedAt: now
    };
  });
  
  const allApproved = reviewData.criteria.length === task.acceptance_criteria.length &&
                      reviewData.criteria.every(c => c.status === 'approved');
  
  if (allApproved) {
    activityLog.push(createLogEntry('status_change', '✅ All criteria approved. Task complete!', {
      from: 'review',
      to: 'done'
    }));
  }
  
  if (allApproved) {
    await db.run(
      'UPDATE tasks SET activity_log = $1, review_state = $2, status = $3, completed_at = $4, updated_at = $5 WHERE id = $6',
      [JSON.stringify(activityLog), JSON.stringify(reviewState), 'done', now, now, id]
    );
  } else {
    await db.run(
      'UPDATE tasks SET activity_log = $1, review_state = $2, updated_at = $3 WHERE id = $4',
      [JSON.stringify(activityLog), JSON.stringify(reviewState), now, id]
    );
  }
  
  return { 
    task: await getTaskById(id),
    allApproved,
    approved: approved.length,
    needsWork: needsWork.length
  };
}

/**
 * Submit a plan review for a task in 'planned' status
 */
async function submitPlanReview(id, reviewData, userId = null) {
  const task = await getTaskById(id, userId);
  if (!task) return { error: 'Task not found', status: 404 };
  
  if (task.status !== 'planned') {
    return { error: 'Task must be in planned status', status: 400 };
  }
  
  const now = new Date().toISOString();
  const activityLog = task.activity_log || [];
  
  const approved = [];
  const needsWork = [];
  
  reviewData.criteria.forEach(c => {
    const criterionText = task.acceptance_criteria[c.index] || `Plan item ${c.index}`;
    if (c.status === 'approved') {
      approved.push(criterionText);
    } else if (c.status === 'needs_work' && c.comment) {
      needsWork.push({ criterion: criterionText, comment: c.comment });
    }
  });
  
  let logMessage = '📝 Plan review submitted:\n';
  if (approved.length > 0) {
    logMessage += `\n✅ Approved (${approved.length}):\n`;
    approved.forEach(a => logMessage += `  • ${a}\n`);
  }
  if (needsWork.length > 0) {
    logMessage += `\n❌ Needs work (${needsWork.length}):\n`;
    needsWork.forEach(n => logMessage += `  • ${n.criterion}: "${n.comment}"\n`);
  }
  if (reviewData.generalComment) {
    logMessage += `\n💬 Additional comments:\n${reviewData.generalComment}\n`;
  }
  
  activityLog.push(createLogEntry('plan_review_submitted', logMessage.trim(), {
    approved: approved.length,
    needsWork: needsWork.length,
    generalComment: reviewData.generalComment || null,
    details: reviewData.criteria
  }));
  
  const reviewState = {
    lastReviewAt: now,
    reviewType: 'plan',
    criteria: {}
  };
  reviewData.criteria.forEach(c => {
    reviewState.criteria[c.index] = {
      status: c.status,
      comment: c.comment || null,
      reviewedAt: now
    };
  });
  
  const allApproved = reviewData.criteria.length === task.acceptance_criteria.length &&
                      reviewData.criteria.every(c => c.status === 'approved');
  
  if (allApproved) {
    activityLog.push(createLogEntry('status_change', '✅ Plan approved! Ready for development.', {
      from: 'planned',
      to: 'ready'
    }));
  }
  
  if (allApproved) {
    await db.run(
      'UPDATE tasks SET activity_log = $1, review_state = $2, status = $3, updated_at = $4 WHERE id = $5',
      [JSON.stringify(activityLog), JSON.stringify(reviewState), 'ready', now, id]
    );
  } else {
    await db.run(
      'UPDATE tasks SET activity_log = $1, review_state = $2, updated_at = $3 WHERE id = $4',
      [JSON.stringify(activityLog), JSON.stringify(reviewState), now, id]
    );
  }
  
  return { 
    task: await getTaskById(id),
    allApproved,
    approved: approved.length,
    needsWork: needsWork.length
  };
}

/**
 * Get tasks scheduled within a date range (for calendar view)
 */
async function getTasksForCalendar(userId, startDate, endDate) {
  let sql = `SELECT * FROM tasks WHERE scheduled_date IS NOT NULL
             AND scheduled_date >= $1 AND scheduled_date <= $2`;
  const params = [startDate, endDate];
  let paramIndex = 3;

  if (userId) {
    sql += ` AND user_id = $${paramIndex++}`;
    params.push(userId);
  }

  sql += ' ORDER BY scheduled_date ASC, scheduled_start ASC, priority ASC';

  const rows = await db.getAll(sql, params);
  return rows.map(parseTask);
}

/**
 * Get all scheduled tasks for a user
 */
async function getScheduledTasks(userId) {
  let sql = 'SELECT * FROM tasks WHERE scheduled_date IS NOT NULL';
  const params = [];
  let paramIndex = 1;

  if (userId) {
    sql += ` AND user_id = $${paramIndex++}`;
    params.push(userId);
  }

  sql += ' ORDER BY scheduled_date ASC, scheduled_start ASC';

  const rows = await db.getAll(sql, params);
  return rows.map(parseTask);
}

/**
 * Get all unscheduled tasks for a user
 */
async function getUnscheduledTasks(userId) {
  let sql = 'SELECT * FROM tasks WHERE scheduled_date IS NULL';
  const params = [];
  let paramIndex = 1;

  if (userId) {
    sql += ` AND user_id = $${paramIndex++}`;
    params.push(userId);
  }

  sql += " AND status != 'done'";
  sql += ' ORDER BY priority ASC, created_at DESC';

  const rows = await db.getAll(sql, params);
  return rows.map(parseTask);
}

/**
 * Schedule a task (set date/time)
 */
async function scheduleTask(id, scheduleData, userId = null) {
  const task = await getTaskById(id, userId);
  if (!task) return null;

  const now = new Date().toISOString();
  const activityLog = task.activity_log || [];

  const scheduleInfo = scheduleData.is_all_day
    ? `${scheduleData.scheduled_date} (all day)`
    : `${scheduleData.scheduled_date} ${scheduleData.scheduled_start || ''}-${scheduleData.scheduled_end || ''}`;

  activityLog.push(createLogEntry('scheduled', `Task scheduled for ${scheduleInfo}`, {
    scheduled_date: scheduleData.scheduled_date,
    scheduled_start: scheduleData.scheduled_start || null,
    scheduled_end: scheduleData.scheduled_end || null,
    is_all_day: scheduleData.is_all_day || false
  }));

  await db.run(`
    UPDATE tasks SET
      scheduled_date = $1,
      scheduled_start = $2,
      scheduled_end = $3,
      is_all_day = $4,
      activity_log = $5,
      updated_at = $6
    WHERE id = $7
  `, [
    scheduleData.scheduled_date,
    scheduleData.scheduled_start || null,
    scheduleData.scheduled_end || null,
    scheduleData.is_all_day ? 1 : 0,
    JSON.stringify(activityLog),
    now,
    id
  ]);

  return await getTaskById(id);
}

/**
 * Unschedule a task (clear date/time)
 */
async function unscheduleTask(id, userId = null) {
  const task = await getTaskById(id, userId);
  if (!task) return null;

  const now = new Date().toISOString();
  const activityLog = task.activity_log || [];

  activityLog.push(createLogEntry('unscheduled', 'Task removed from calendar', {
    previous_date: task.scheduled_date,
    previous_start: task.scheduled_start,
    previous_end: task.scheduled_end
  }));

  await db.run(`
    UPDATE tasks SET
      scheduled_date = NULL,
      scheduled_start = NULL,
      scheduled_end = NULL,
      is_all_day = 0,
      activity_log = $1,
      updated_at = $2
    WHERE id = $3
  `, [JSON.stringify(activityLog), now, id]);

  return await getTaskById(id);
}

module.exports = {
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
};
