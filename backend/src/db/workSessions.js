const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

async function getAllWorkSessions(userId, taskId = null) {
  let sql = `SELECT * FROM work_sessions WHERE user_id = $1`;
  const params = [userId];

  if (taskId) {
    sql += ` AND task_id = $2`;
    params.push(taskId);
  }

  sql += ` ORDER BY start_time DESC`;
  return await db.getAll(sql, params);
}

async function getWorkSessionById(id, userId) {
  return await db.getOne(
    `SELECT * FROM work_sessions WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}

async function createWorkSession(data, userId) {
  const id = uuidv4();
  const now = new Date().toISOString();

  await db.run(`
    INSERT INTO work_sessions (id, user_id, task_id, name, start_time, end_time, duration_seconds, notes, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `, [
    id, userId,
    data.task_id || null,
    data.name || '',
    data.start_time || now,
    data.end_time || null,
    data.duration_seconds || null,
    data.notes || '',
    now, now
  ]);

  return await getWorkSessionById(id, userId);
}

async function startSession(data, userId) {
  return await createWorkSession({
    ...data,
    start_time: new Date().toISOString()
  }, userId);
}

async function endSession(id, userId) {
  const existing = await getWorkSessionById(id, userId);
  if (!existing) return null;

  const now = new Date().toISOString();
  const startTime = new Date(existing.start_time).getTime();
  const endTime = new Date(now).getTime();
  const durationSeconds = Math.floor((endTime - startTime) / 1000);

  await db.run(`
    UPDATE work_sessions SET
      end_time = $1,
      duration_seconds = $2,
      updated_at = $3
    WHERE id = $4 AND user_id = $5
  `, [now, durationSeconds, now, id, userId]);

  return await getWorkSessionById(id, userId);
}

async function updateWorkSession(id, data, userId) {
  const existing = await getWorkSessionById(id, userId);
  if (!existing) return null;

  const now = new Date().toISOString();

  await db.run(`
    UPDATE work_sessions SET
      task_id = $1,
      name = $2,
      start_time = $3,
      end_time = $4,
      duration_seconds = $5,
      notes = $6,
      updated_at = $7
    WHERE id = $8 AND user_id = $9
  `, [
    data.task_id !== undefined ? data.task_id : existing.task_id,
    data.name ?? existing.name,
    data.start_time ?? existing.start_time,
    data.end_time ?? existing.end_time,
    data.duration_seconds ?? existing.duration_seconds,
    data.notes ?? existing.notes,
    now,
    id, userId
  ]);

  return await getWorkSessionById(id, userId);
}

async function deleteWorkSession(id, userId) {
  const result = await db.run(
    `DELETE FROM work_sessions WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return result.rowCount > 0;
}

module.exports = {
  getAllWorkSessions,
  getWorkSessionById,
  createWorkSession,
  startSession,
  endSession,
  updateWorkSession,
  deleteWorkSession
};
