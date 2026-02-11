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
    type,       // 'created', 'status_change', 'update', 'note', 'blocked', 'review'
    message,
    details
  };
}

/**
 * Get all tasks for a user, optionally filtered by status
 * @param {string|null} userId - User ID (null for system access = all tasks)
 * @param {string|null} status - Optional status filter
 */
function getAllTasks(userId, status = null) {
  let sql = 'SELECT * FROM tasks';
  const params = [];
  const conditions = [];
  
  // Filter by user if not system access
  if (userId) {
    conditions.push('user_id = ?');
    params.push(userId);
  }
  
  // Filter by status if provided
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  
  sql += ' ORDER BY priority ASC, created_at DESC';
  
  const stmt = db.prepare(sql);
  return stmt.all(...params).map(parseTask);
}

/**
 * Get a single task by ID
 * @param {string} id - Task ID
 * @param {string|null} userId - User ID for ownership check (null = system access)
 */
function getTaskById(id, userId = null) {
  let sql = 'SELECT * FROM tasks WHERE id = ?';
  const params = [id];
  
  if (userId) {
    sql += ' AND user_id = ?';
    params.push(userId);
  }
  
  const stmt = db.prepare(sql);
  return parseTask(stmt.get(...params));
}

/**
 * Create a new task
 * @param {object} data - Task data
 * @param {string} userId - User ID (required for user-created tasks)
 */
function createTask(data, userId = null) {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  // Initialize activity log with creation entry
  const activityLog = [
    createLogEntry('created', 'Task created', {
      title: data.title,
      status: data.status || 'planned',
      priority: data.priority || 3
    })
  ];
  
  const stmt = db.prepare(`
    INSERT INTO tasks (
      id, title, description, acceptance_criteria, status, 
      priority, context_links, notes, activity_log, user_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
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
  );
  
  return getTaskById(id);
}

/**
 * Update an existing task
 * @param {string} id - Task ID
 * @param {object} data - Update data
 * @param {string|null} userId - User ID for ownership check (null = system access)
 */
function updateTask(id, data, userId = null) {
  const existing = getTaskById(id, userId);
  if (!existing) return null;
  
  const now = new Date().toISOString();
  
  // Get current activity log
  let activityLog = existing.activity_log || [];
  
  // Check for status change and log it
  if (data.status && data.status !== existing.status) {
    const logEntry = createLogEntry('status_change', 
      `Status changed from "${existing.status}" to "${data.status}"`,
      {
        from: existing.status,
        to: data.status,
        reason: data.status_reason || null
      }
    );
    
    // If moving to blocked or review, include the reason in the message
    if (data.status === 'blocked' && data.status_reason) {
      logEntry.type = 'blocked';
      logEntry.message = `⛔ Blocked: ${data.status_reason}`;
    } else if (data.status === 'review' && data.status_reason) {
      logEntry.type = 'review';
      logEntry.message = `👀 Review: ${data.status_reason}`;
    }
    
    activityLog.push(logEntry);
  }
  
  // If there's an explicit log_entry, add it
  if (data.log_entry) {
    activityLog.push(createLogEntry(
      data.log_entry.type || 'note',
      data.log_entry.message,
      data.log_entry.details || {}
    ));
  }
  
  // Build update fields dynamically
  const updates = [];
  const values = [];
  
  const allowedFields = [
    'title', 'description', 'status', 'priority', 'notes', 'session_id'
  ];
  
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(data[field]);
    }
  }
  
  // Handle JSON array fields
  if (data.acceptance_criteria !== undefined) {
    updates.push('acceptance_criteria = ?');
    values.push(JSON.stringify(data.acceptance_criteria));
  }
  
  if (data.context_links !== undefined) {
    updates.push('context_links = ?');
    values.push(JSON.stringify(data.context_links));
  }
  
  if (data.review_state !== undefined) {
    updates.push('review_state = ?');
    values.push(JSON.stringify(data.review_state));
  }
  
  // Always update activity_log
  updates.push('activity_log = ?');
  values.push(JSON.stringify(activityLog));
  
  // Handle completed_at
  if (data.completed_at !== undefined) {
    updates.push('completed_at = ?');
    values.push(data.completed_at);
  }
  
  // Always update updated_at
  updates.push('updated_at = ?');
  values.push(now);
  
  values.push(id);
  
  const stmt = db.prepare(`
    UPDATE tasks SET ${updates.join(', ')} WHERE id = ?
  `);
  
  stmt.run(...values);
  
  return getTaskById(id);
}

/**
 * Add an entry to a task's activity log
 * @param {string} id - Task ID
 * @param {string} type - Log entry type
 * @param {string} message - Log message
 * @param {object} details - Additional details
 * @param {string|null} userId - User ID for ownership check
 */
function addLogEntry(id, type, message, details = {}, userId = null) {
  const task = getTaskById(id, userId);
  if (!task) return null;
  
  const activityLog = task.activity_log || [];
  activityLog.push(createLogEntry(type, message, details));
  
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE tasks SET activity_log = ?, updated_at = ? WHERE id = ?
  `);
  stmt.run(JSON.stringify(activityLog), now, id);
  
  return getTaskById(id);
}

/**
 * Delete a task
 * @param {string} id - Task ID
 * @param {string|null} userId - User ID for ownership check (null = system access)
 */
function deleteTask(id, userId = null) {
  const existing = getTaskById(id, userId);
  if (!existing) return false;
  
  const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
  stmt.run(id);
  return true;
}

/**
 * Pick a task (claim it for work)
 * @param {string} id - Task ID
 * @param {string} sessionId - Session identifier
 * @param {string|null} userId - User ID for ownership check
 */
function pickTask(id, sessionId, userId = null) {
  const task = getTaskById(id, userId);
  if (!task) return { error: 'Task not found', status: 404 };
  
  if (task.status !== 'ready') {
    return { 
      error: `Cannot pick task in '${task.status}' status. Task must be in 'ready' status.`, 
      status: 400 
    };
  }
  
  return {
    task: updateTask(id, {
      status: 'in_progress',
      session_id: sessionId,
      status_reason: sessionId ? `Picked up by ${sessionId}` : 'Task picked up for work'
    }, userId)
  };
}

/**
 * Complete a task (move to review)
 * @param {string} id - Task ID
 * @param {string} notes - Completion notes
 * @param {string|null} userId - User ID for ownership check
 */
function completeTask(id, notes, userId = null) {
  const task = getTaskById(id, userId);
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
  
  return { task: updateTask(id, updateData, userId) };
}

/**
 * Submit a review for a task
 * @param {string} id - Task ID
 * @param {object} reviewData - { criteria: [{ index, status, comment }] }
 * @param {string|null} userId - User ID for ownership check
 */
function submitReview(id, reviewData, userId = null) {
  const task = getTaskById(id, userId);
  if (!task) return { error: 'Task not found', status: 404 };
  
  if (task.status !== 'review') {
    return { error: 'Task must be in review status', status: 400 };
  }
  
  const now = new Date().toISOString();
  const activityLog = task.activity_log || [];
  
  // Build review summary
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
  
  // Build log message
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
  
  // Add to activity log
  activityLog.push(createLogEntry('review_submitted', logMessage.trim(), {
    approved: approved.length,
    needsWork: needsWork.length,
    generalComment: reviewData.generalComment || null,
    details: reviewData.criteria
  }));
  
  // Store review state
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
  
  // Determine next status
  const allApproved = reviewData.criteria.length === task.acceptance_criteria.length &&
                      reviewData.criteria.every(c => c.status === 'approved');
  
  if (allApproved) {
    activityLog.push(createLogEntry('status_change', '✅ All criteria approved. Task complete!', {
      from: 'review',
      to: 'done'
    }));
  }
  
  // Update task
  const stmt = db.prepare(`
    UPDATE tasks SET 
      activity_log = ?,
      review_state = ?,
      ${allApproved ? 'status = ?, completed_at = ?,' : ''}
      updated_at = ?
    WHERE id = ?
  `);
  
  if (allApproved) {
    stmt.run(
      JSON.stringify(activityLog),
      JSON.stringify(reviewState),
      'done',
      now,
      now,
      id
    );
  } else {
    stmt.run(
      JSON.stringify(activityLog),
      JSON.stringify(reviewState),
      now,
      id
    );
  }
  
  return { 
    task: getTaskById(id),
    allApproved,
    approved: approved.length,
    needsWork: needsWork.length
  };
}

/**
 * Submit a plan review for a task in 'planned' status
 * @param {string} id - Task ID
 * @param {object} reviewData - { criteria: [{ index, status, comment }] }
 * @param {string|null} userId - User ID for ownership check
 */
function submitPlanReview(id, reviewData, userId = null) {
  const task = getTaskById(id, userId);
  if (!task) return { error: 'Task not found', status: 404 };
  
  if (task.status !== 'planned') {
    return { error: 'Task must be in planned status', status: 400 };
  }
  
  const now = new Date().toISOString();
  const activityLog = task.activity_log || [];
  
  // Build review summary
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
  
  // Build log message
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
  
  // Add to activity log
  activityLog.push(createLogEntry('plan_review_submitted', logMessage.trim(), {
    approved: approved.length,
    needsWork: needsWork.length,
    generalComment: reviewData.generalComment || null,
    details: reviewData.criteria
  }));
  
  // Store review state
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
  
  // Determine next status
  const allApproved = reviewData.criteria.length === task.acceptance_criteria.length &&
                      reviewData.criteria.every(c => c.status === 'approved');
  
  if (allApproved) {
    activityLog.push(createLogEntry('status_change', '✅ Plan approved! Ready for development.', {
      from: 'planned',
      to: 'ready'
    }));
  }
  
  // Update task
  const stmt = db.prepare(`
    UPDATE tasks SET 
      activity_log = ?,
      review_state = ?,
      ${allApproved ? 'status = ?,' : ''}
      updated_at = ?
    WHERE id = ?
  `);
  
  if (allApproved) {
    stmt.run(
      JSON.stringify(activityLog),
      JSON.stringify(reviewState),
      'ready',
      now,
      id
    );
  } else {
    stmt.run(
      JSON.stringify(activityLog),
      JSON.stringify(reviewState),
      now,
      id
    );
  }
  
  return { 
    task: getTaskById(id),
    allApproved,
    approved: approved.length,
    needsWork: needsWork.length
  };
}

/**
 * Get tasks scheduled within a date range (for calendar view)
 * @param {string|null} userId - User ID (null for system access = all tasks)
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 */
function getTasksForCalendar(userId, startDate, endDate) {
  let sql = `SELECT * FROM tasks WHERE scheduled_date IS NOT NULL
             AND scheduled_date >= ? AND scheduled_date <= ?`;
  const params = [startDate, endDate];

  if (userId) {
    sql += ' AND user_id = ?';
    params.push(userId);
  }

  sql += ' ORDER BY scheduled_date ASC, scheduled_start ASC, priority ASC';

  const stmt = db.prepare(sql);
  return stmt.all(...params).map(parseTask);
}

/**
 * Get all scheduled tasks for a user (tasks with a scheduled_date)
 * @param {string|null} userId - User ID (null for system access)
 */
function getScheduledTasks(userId) {
  let sql = 'SELECT * FROM tasks WHERE scheduled_date IS NOT NULL';
  const params = [];

  if (userId) {
    sql += ' AND user_id = ?';
    params.push(userId);
  }

  sql += ' ORDER BY scheduled_date ASC, scheduled_start ASC';

  const stmt = db.prepare(sql);
  return stmt.all(...params).map(parseTask);
}

/**
 * Get all unscheduled tasks for a user (tasks without a scheduled_date)
 * @param {string|null} userId - User ID (null for system access)
 */
function getUnscheduledTasks(userId) {
  let sql = 'SELECT * FROM tasks WHERE scheduled_date IS NULL';
  const params = [];

  if (userId) {
    sql += ' AND user_id = ?';
    params.push(userId);
  }

  // Exclude done tasks from unscheduled list
  sql += " AND status != 'done'";
  sql += ' ORDER BY priority ASC, created_at DESC';

  const stmt = db.prepare(sql);
  return stmt.all(...params).map(parseTask);
}

/**
 * Schedule a task (set date/time)
 * @param {string} id - Task ID
 * @param {object} scheduleData - { scheduled_date, scheduled_start, scheduled_end, is_all_day }
 * @param {string|null} userId - User ID for ownership check
 */
function scheduleTask(id, scheduleData, userId = null) {
  const task = getTaskById(id, userId);
  if (!task) return null;

  const now = new Date().toISOString();
  const activityLog = task.activity_log || [];

  // Log the scheduling
  const scheduleInfo = scheduleData.is_all_day
    ? `${scheduleData.scheduled_date} (all day)`
    : `${scheduleData.scheduled_date} ${scheduleData.scheduled_start || ''}-${scheduleData.scheduled_end || ''}`;

  activityLog.push(createLogEntry('scheduled', `Task scheduled for ${scheduleInfo}`, {
    scheduled_date: scheduleData.scheduled_date,
    scheduled_start: scheduleData.scheduled_start || null,
    scheduled_end: scheduleData.scheduled_end || null,
    is_all_day: scheduleData.is_all_day || false
  }));

  const stmt = db.prepare(`
    UPDATE tasks SET
      scheduled_date = ?,
      scheduled_start = ?,
      scheduled_end = ?,
      is_all_day = ?,
      activity_log = ?,
      updated_at = ?
    WHERE id = ?
  `);

  stmt.run(
    scheduleData.scheduled_date,
    scheduleData.scheduled_start || null,
    scheduleData.scheduled_end || null,
    scheduleData.is_all_day ? 1 : 0,
    JSON.stringify(activityLog),
    now,
    id
  );

  return getTaskById(id);
}

/**
 * Unschedule a task (clear date/time)
 * @param {string} id - Task ID
 * @param {string|null} userId - User ID for ownership check
 */
function unscheduleTask(id, userId = null) {
  const task = getTaskById(id, userId);
  if (!task) return null;

  const now = new Date().toISOString();
  const activityLog = task.activity_log || [];

  activityLog.push(createLogEntry('unscheduled', 'Task removed from calendar', {
    previous_date: task.scheduled_date,
    previous_start: task.scheduled_start,
    previous_end: task.scheduled_end
  }));

  const stmt = db.prepare(`
    UPDATE tasks SET
      scheduled_date = NULL,
      scheduled_start = NULL,
      scheduled_end = NULL,
      is_all_day = 0,
      activity_log = ?,
      updated_at = ?
    WHERE id = ?
  `);

  stmt.run(JSON.stringify(activityLog), now, id);

  return getTaskById(id);
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
