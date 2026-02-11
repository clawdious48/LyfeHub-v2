// ============================================
// Tags Database Operations
// ============================================

const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

/**
 * Get all tags for a user
 */
function getAllTags(userId) {
  const stmt = db.prepare(`
    SELECT * FROM tags
    WHERE user_id = ?
    ORDER BY created_at DESC
  `);
  return stmt.all(userId);
}

/**
 * Get a single tag by ID
 */
function getTagById(id, userId) {
  const stmt = db.prepare(`
    SELECT * FROM tags
    WHERE id = ? AND user_id = ?
  `);
  return stmt.get(id, userId);
}

/**
 * Create a new tag
 */
function createTag(data, userId) {
  const id = uuidv4();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO tags (
      id, user_id, name, type, archived, favorite,
      parent_tag_id, url, description,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?
    )
  `);

  stmt.run(
    id, userId,
    data.name || 'Untitled Tag',
    data.type || 'resource',
    data.archived ? 1 : 0,
    data.favorite ? 1 : 0,
    data.parent_tag_id || null,
    data.url || '',
    data.description || '',
    now, now
  );

  return getTagById(id, userId);
}

/**
 * Update a tag
 */
function updateTag(id, data, userId) {
  const existing = getTagById(id, userId);
  if (!existing) return null;

  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE tags SET
      name = ?,
      type = ?,
      archived = ?,
      favorite = ?,
      parent_tag_id = ?,
      url = ?,
      description = ?,
      updated_at = ?
    WHERE id = ? AND user_id = ?
  `);

  stmt.run(
    data.name !== undefined ? data.name : existing.name,
    data.type !== undefined ? data.type : existing.type,
    data.archived !== undefined ? (data.archived ? 1 : 0) : existing.archived,
    data.favorite !== undefined ? (data.favorite ? 1 : 0) : existing.favorite,
    data.parent_tag_id !== undefined ? data.parent_tag_id : existing.parent_tag_id,
    data.url !== undefined ? data.url : existing.url,
    data.description !== undefined ? data.description : existing.description,
    now,
    id, userId
  );

  return getTagById(id, userId);
}

/**
 * Delete a tag
 */
function deleteTag(id, userId) {
  const stmt = db.prepare(`
    DELETE FROM tags
    WHERE id = ? AND user_id = ?
  `);
  const result = stmt.run(id, userId);
  return result.changes > 0;
}

/**
 * Get tag count for a user
 */
function getTagCount(userId) {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM tags WHERE user_id = ?');
  const result = stmt.get(userId);
  return result ? result.count : 0;
}

module.exports = {
  getAllTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
  getTagCount
};
