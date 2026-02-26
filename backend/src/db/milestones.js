const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

async function getAllMilestones(userId, goalId = null) {
  let sql = `SELECT * FROM milestones WHERE user_id = $1`;
  const params = [userId];

  if (goalId) {
    sql += ` AND goal_id = $2`;
    params.push(goalId);
  }

  sql += ` ORDER BY target_deadline ASC NULLS LAST, created_at DESC`;
  return await db.getAll(sql, params);
}

async function getMilestoneById(id, userId) {
  return await db.getOne(
    `SELECT * FROM milestones WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}

async function createMilestone(data, userId) {
  const id = uuidv4();
  const now = new Date().toISOString();

  await db.run(`
    INSERT INTO milestones (id, user_id, goal_id, name, target_deadline, completed_date, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    id, userId,
    data.goal_id || null,
    data.name || 'Untitled Milestone',
    data.target_deadline || null,
    data.completed_date || null,
    now, now
  ]);

  return await getMilestoneById(id, userId);
}

async function updateMilestone(id, data, userId) {
  const existing = await getMilestoneById(id, userId);
  if (!existing) return null;

  const now = new Date().toISOString();

  await db.run(`
    UPDATE milestones SET
      goal_id = $1,
      name = $2,
      target_deadline = $3,
      completed_date = $4,
      updated_at = $5
    WHERE id = $6 AND user_id = $7
  `, [
    data.goal_id !== undefined ? data.goal_id : existing.goal_id,
    data.name ?? existing.name,
    data.target_deadline ?? existing.target_deadline,
    data.completed_date ?? existing.completed_date,
    now,
    id, userId
  ]);

  return await getMilestoneById(id, userId);
}

async function deleteMilestone(id, userId) {
  const result = await db.run(
    `DELETE FROM milestones WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return result.rowCount > 0;
}

module.exports = {
  getAllMilestones,
  getMilestoneById,
  createMilestone,
  updateMilestone,
  deleteMilestone
};
