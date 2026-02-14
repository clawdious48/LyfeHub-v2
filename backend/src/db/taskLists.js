const db = require('./schema');

function generateId() {
  return 'lst_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

async function getAllLists(userId) {
  return await db.getAll(`
    SELECT l.*,
           (SELECT COUNT(*) FROM task_items WHERE list_id = l.id AND completed = 0) as task_count
    FROM task_lists l
    WHERE l.user_id = $1
    ORDER BY l.name ASC
  `, [userId]);
}

async function getListById(id, userId) {
  return await db.getOne('SELECT * FROM task_lists WHERE id = $1 AND user_id = $2', [id, userId]);
}

async function createList(data, userId) {
  const id = generateId();
  const now = new Date().toISOString();

  await db.run(`
    INSERT INTO task_lists (id, user_id, name, color, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [id, userId, data.name, data.color || '#bf5af2', now, now]);

  return await getListById(id, userId);
}

async function updateList(id, data, userId) {
  const existing = await getListById(id, userId);
  if (!existing) return null;

  const updates = [];
  const params = [];
  let paramIdx = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIdx++}`);
    params.push(data.name);
  }
  if (data.color !== undefined) {
    updates.push(`color = $${paramIdx++}`);
    params.push(data.color);
  }

  if (updates.length === 0) return existing;

  updates.push(`updated_at = $${paramIdx++}`);
  params.push(new Date().toISOString());
  params.push(id);
  params.push(userId);

  await db.run(`UPDATE task_lists SET ${updates.join(', ')} WHERE id = $${paramIdx++} AND user_id = $${paramIdx}`, params);

  return await getListById(id, userId);
}

async function deleteList(id, userId) {
  const existing = await getListById(id, userId);
  if (!existing) return false;

  // Remove list_id from tasks in this list (don't delete tasks)
  await db.run('UPDATE task_items SET list_id = NULL WHERE list_id = $1 AND user_id = $2', [id, userId]);

  const result = await db.run('DELETE FROM task_lists WHERE id = $1 AND user_id = $2', [id, userId]);
  return result.rowCount > 0;
}

module.exports = {
  getAllLists,
  getListById,
  createList,
  updateList,
  deleteList
};
