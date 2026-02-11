const db = require('./schema');

// Create task_lists table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS task_lists (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#bf5af2',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// Add list_id column to task_items if not exists
try {
  db.exec(`ALTER TABLE task_items ADD COLUMN list_id TEXT REFERENCES task_lists(id)`);
} catch (e) {
  // Column already exists
}

function generateId() {
  return 'lst_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function getAllLists(userId) {
  const stmt = db.prepare(`
    SELECT l.*, 
           (SELECT COUNT(*) FROM task_items WHERE list_id = l.id AND completed = 0) as task_count
    FROM task_lists l
    WHERE l.user_id = ?
    ORDER BY l.name ASC
  `);
  return stmt.all(userId);
}

function getListById(id, userId) {
  const stmt = db.prepare('SELECT * FROM task_lists WHERE id = ? AND user_id = ?');
  return stmt.get(id, userId);
}

function createList(data, userId) {
  const id = generateId();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO task_lists (id, user_id, name, color, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, userId, data.name, data.color || '#bf5af2', now, now);
  
  return getListById(id, userId);
}

function updateList(id, data, userId) {
  const existing = getListById(id, userId);
  if (!existing) return null;
  
  const updates = [];
  const params = [];
  
  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name);
  }
  if (data.color !== undefined) {
    updates.push('color = ?');
    params.push(data.color);
  }
  
  if (updates.length === 0) return existing;
  
  updates.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);
  params.push(userId);
  
  const stmt = db.prepare(`UPDATE task_lists SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`);
  stmt.run(...params);
  
  return getListById(id, userId);
}

function deleteList(id, userId) {
  const existing = getListById(id, userId);
  if (!existing) return false;
  
  // Remove list_id from tasks in this list (don't delete tasks)
  const updateStmt = db.prepare('UPDATE task_items SET list_id = NULL WHERE list_id = ? AND user_id = ?');
  updateStmt.run(id, userId);
  
  const stmt = db.prepare('DELETE FROM task_lists WHERE id = ? AND user_id = ?');
  const result = stmt.run(id, userId);
  return result.changes > 0;
}

module.exports = {
  getAllLists,
  getListById,
  createList,
  updateList,
  deleteList
};
