const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

async function getAllGoals(userId) {
  return await db.getAll(
    `SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
}

async function getGoalById(id, userId) {
  return await db.getOne(
    `SELECT * FROM goals WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}

async function createGoal(data, userId) {
  const id = uuidv4();
  const now = new Date().toISOString();

  await db.run(`
    INSERT INTO goals (id, user_id, name, status, target_deadline, goal_set, achieved_date, tag_id, archived, review_notes, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
  `, [
    id, userId,
    data.name || 'Untitled Goal',
    data.status || 'dream',
    data.target_deadline || null,
    data.goal_set || null,
    data.achieved_date || null,
    data.tag_id || null,
    data.archived ? 1 : 0,
    data.review_notes || '',
    now, now
  ]);

  return await getGoalById(id, userId);
}

async function updateGoal(id, data, userId) {
  const existing = await getGoalById(id, userId);
  if (!existing) return null;

  const now = new Date().toISOString();

  await db.run(`
    UPDATE goals SET
      name = $1,
      status = $2,
      target_deadline = $3,
      goal_set = $4,
      achieved_date = $5,
      tag_id = $6,
      archived = $7,
      review_notes = $8,
      updated_at = $9
    WHERE id = $10 AND user_id = $11
  `, [
    data.name ?? existing.name,
    data.status ?? existing.status,
    data.target_deadline ?? existing.target_deadline,
    data.goal_set ?? existing.goal_set,
    data.achieved_date ?? existing.achieved_date,
    data.tag_id !== undefined ? data.tag_id : existing.tag_id,
    data.archived !== undefined ? (data.archived ? 1 : 0) : existing.archived,
    data.review_notes ?? existing.review_notes,
    now,
    id, userId
  ]);

  return await getGoalById(id, userId);
}

async function deleteGoal(id, userId) {
  const result = await db.run(
    `DELETE FROM goals WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return result.rowCount > 0;
}

module.exports = {
  getAllGoals,
  getGoalById,
  createGoal,
  updateGoal,
  deleteGoal
};
