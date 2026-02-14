// ============================================
// Tags Database Operations
// ============================================

const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

/**
 * Get all tags for a user
 */
async function getAllTags(userId) {
  return await db.getAll(`
    SELECT * FROM tags
    WHERE user_id = $1
    ORDER BY created_at DESC
  `, [userId]);
}

/**
 * Get a single tag by ID
 */
async function getTagById(id, userId) {
  return await db.getOne(`
    SELECT * FROM tags
    WHERE id = $1 AND user_id = $2
  `, [id, userId]);
}

/**
 * Create a new tag
 */
async function createTag(data, userId) {
  const id = uuidv4();
  const now = new Date().toISOString();

  await db.run(`
    INSERT INTO tags (
      id, user_id, name, type, archived, favorite,
      parent_tag_id, url, description,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9,
      $10, $11
    )
  `, [
    id, userId,
    data.name || 'Untitled Tag',
    data.type || 'resource',
    data.archived ? 1 : 0,
    data.favorite ? 1 : 0,
    data.parent_tag_id || null,
    data.url || '',
    data.description || '',
    now, now
  ]);

  return await getTagById(id, userId);
}

/**
 * Update a tag
 */
async function updateTag(id, data, userId) {
  const existing = await getTagById(id, userId);
  if (!existing) return null;

  const now = new Date().toISOString();

  await db.run(`
    UPDATE tags SET
      name = $1,
      type = $2,
      archived = $3,
      favorite = $4,
      parent_tag_id = $5,
      url = $6,
      description = $7,
      updated_at = $8
    WHERE id = $9 AND user_id = $10
  `, [
    data.name !== undefined ? data.name : existing.name,
    data.type !== undefined ? data.type : existing.type,
    data.archived !== undefined ? (data.archived ? 1 : 0) : existing.archived,
    data.favorite !== undefined ? (data.favorite ? 1 : 0) : existing.favorite,
    data.parent_tag_id !== undefined ? data.parent_tag_id : existing.parent_tag_id,
    data.url !== undefined ? data.url : existing.url,
    data.description !== undefined ? data.description : existing.description,
    now,
    id, userId
  ]);

  return await getTagById(id, userId);
}

/**
 * Delete a tag
 */
async function deleteTag(id, userId) {
  const result = await db.run(`
    DELETE FROM tags
    WHERE id = $1 AND user_id = $2
  `, [id, userId]);
  return result.rowCount > 0;
}

/**
 * Get tag count for a user
 */
async function getTagCount(userId) {
  const result = await db.getOne('SELECT COUNT(*) as count FROM tags WHERE user_id = $1', [userId]);
  return result ? parseInt(result.count) : 0;
}

module.exports = {
  getAllTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
  getTagCount
};
