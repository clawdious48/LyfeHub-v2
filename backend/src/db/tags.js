// ============================================
// Tags Database Operations
// ============================================

const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

/**
 * Get all tags for a user, optionally filtered by type
 */
async function getAllTags(userId, type = null) {
  let sql = `SELECT * FROM tags WHERE user_id = $1`;
  const params = [userId];

  if (type) {
    sql += ` AND type = $2`;
    params.push(type);
  }

  sql += type === 'area' ? ` ORDER BY sort_order ASC, name ASC` : ` ORDER BY created_at DESC`;

  return await db.getAll(sql, params);
}

/**
 * Seed default area tags for a new user
 */
async function seedDefaultAreas(userId) {
  const defaults = [
    { name: 'Work', color: '#FF8C00', icon: '💼', sort_order: 0 },
    { name: 'Family', color: '#E91E63', icon: '👨‍👩‍👧‍👦', sort_order: 1 },
    { name: 'Health', color: '#4CAF50', icon: '💪', sort_order: 2 },
    { name: 'Finances', color: '#2196F3', icon: '💰', sort_order: 3 },
  ];
  for (const area of defaults) {
    await db.run(
      `INSERT INTO tags (id, user_id, name, type, color, icon, sort_order, created_at, updated_at)
       VALUES (gen_random_uuid()::text, $1, $2, 'area', $3, $4, $5, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [userId, area.name, area.color, area.icon, area.sort_order]
    );
  }
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
      color, icon, sort_order,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9,
      $10, $11, $12,
      $13, $14
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
    data.color || '',
    data.icon || '',
    data.sort_order || 0,
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
      color = $8,
      icon = $9,
      sort_order = $10,
      updated_at = $11
    WHERE id = $12 AND user_id = $13
  `, [
    data.name !== undefined ? data.name : existing.name,
    data.type !== undefined ? data.type : existing.type,
    data.archived !== undefined ? (data.archived ? 1 : 0) : existing.archived,
    data.favorite !== undefined ? (data.favorite ? 1 : 0) : existing.favorite,
    data.parent_tag_id !== undefined ? data.parent_tag_id : existing.parent_tag_id,
    data.url !== undefined ? data.url : existing.url,
    data.description !== undefined ? data.description : existing.description,
    data.color !== undefined ? data.color : (existing.color || ''),
    data.icon !== undefined ? data.icon : (existing.icon || ''),
    data.sort_order !== undefined ? data.sort_order : (existing.sort_order || 0),
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
  getTagCount,
  seedDefaultAreas
};
