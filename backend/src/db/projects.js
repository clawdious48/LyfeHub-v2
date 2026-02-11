// ============================================
// Projects Database Operations
// ============================================

const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

/**
 * Get all projects for a user
 */
function getAllProjects(userId) {
  const stmt = db.prepare(`
    SELECT * FROM projects
    WHERE user_id = ?
    ORDER BY created_at DESC
  `);
  return stmt.all(userId);
}

/**
 * Get a single project by ID
 */
function getProjectById(id, userId) {
  const stmt = db.prepare(`
    SELECT * FROM projects
    WHERE id = ? AND user_id = ?
  `);
  return stmt.get(id, userId);
}

/**
 * Create a new project
 */
function createProject(data, userId) {
  const id = uuidv4();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO projects (
      id, user_id, name, status, target_deadline, completed_date,
      archived, review_notes, tag_id, goal_id,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?
    )
  `);

  stmt.run(
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
  );

  return getProjectById(id, userId);
}

/**
 * Update a project
 */
function updateProject(id, data, userId) {
  const existing = getProjectById(id, userId);
  if (!existing) return null;

  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE projects SET
      name = ?,
      status = ?,
      target_deadline = ?,
      completed_date = ?,
      archived = ?,
      review_notes = ?,
      tag_id = ?,
      goal_id = ?,
      updated_at = ?
    WHERE id = ? AND user_id = ?
  `);

  stmt.run(
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
  );

  return getProjectById(id, userId);
}

/**
 * Delete a project
 */
function deleteProject(id, userId) {
  const stmt = db.prepare(`
    DELETE FROM projects
    WHERE id = ? AND user_id = ?
  `);
  const result = stmt.run(id, userId);
  return result.changes > 0;
}

/**
 * Get project count for a user
 */
function getProjectCount(userId) {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM projects WHERE user_id = ?');
  const result = stmt.get(userId);
  return result ? result.count : 0;
}

module.exports = {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectCount
};
