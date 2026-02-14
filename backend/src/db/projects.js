// ============================================
// Projects Database Operations
// ============================================

const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

/**
 * Get all projects for a user
 */
async function getAllProjects(userId) {
  return await db.getAll(`
    SELECT * FROM projects
    WHERE user_id = $1
    ORDER BY created_at DESC
  `, [userId]);
}

/**
 * Get a single project by ID
 */
async function getProjectById(id, userId) {
  return await db.getOne(`
    SELECT * FROM projects
    WHERE id = $1 AND user_id = $2
  `, [id, userId]);
}

/**
 * Create a new project
 */
async function createProject(data, userId) {
  const id = uuidv4();
  const now = new Date().toISOString();

  await db.run(`
    INSERT INTO projects (
      id, user_id, name, status, target_deadline, completed_date,
      archived, review_notes, tag_id, goal_id,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10,
      $11, $12
    )
  `, [
    id, userId,
    data.name || 'Untitled Project',
    data.status || 'planned',
    data.target_deadline || null,
    data.completed_date || null,
    data.archived ? 1 : 0,
    data.review_notes || '',
    data.tag_id || null,
    data.goal_id || null,
    now, now
  ]);

  return await getProjectById(id, userId);
}

/**
 * Update a project
 */
async function updateProject(id, data, userId) {
  const existing = await getProjectById(id, userId);
  if (!existing) return null;

  const now = new Date().toISOString();

  await db.run(`
    UPDATE projects SET
      name = $1,
      status = $2,
      target_deadline = $3,
      completed_date = $4,
      archived = $5,
      review_notes = $6,
      tag_id = $7,
      goal_id = $8,
      updated_at = $9
    WHERE id = $10 AND user_id = $11
  `, [
    data.name !== undefined ? data.name : existing.name,
    data.status !== undefined ? data.status : existing.status,
    data.target_deadline !== undefined ? data.target_deadline : existing.target_deadline,
    data.completed_date !== undefined ? data.completed_date : existing.completed_date,
    data.archived !== undefined ? (data.archived ? 1 : 0) : existing.archived,
    data.review_notes !== undefined ? data.review_notes : existing.review_notes,
    data.tag_id !== undefined ? data.tag_id : existing.tag_id,
    data.goal_id !== undefined ? data.goal_id : existing.goal_id,
    now,
    id, userId
  ]);

  return await getProjectById(id, userId);
}

/**
 * Delete a project
 */
async function deleteProject(id, userId) {
  const result = await db.run(`
    DELETE FROM projects
    WHERE id = $1 AND user_id = $2
  `, [id, userId]);
  return result.rowCount > 0;
}

/**
 * Get project count for a user
 */
async function getProjectCount(userId) {
  const result = await db.getOne('SELECT COUNT(*) as count FROM projects WHERE user_id = $1', [userId]);
  return result ? parseInt(result.count) : 0;
}

module.exports = {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectCount
};
