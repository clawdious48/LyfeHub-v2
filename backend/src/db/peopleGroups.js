const db = require('./schema');

// ============================================
// PEOPLE GROUPS QUERIES (async for PostgreSQL)
// ============================================

module.exports = {
  getAllGroups: async (userId) => await db.getAll('SELECT * FROM people_groups WHERE user_id = $1 ORDER BY position ASC', [userId]),

  getGroupById: async (id, userId) => await db.getOne('SELECT * FROM people_groups WHERE id = $1 AND user_id = $2', [id, userId]),

  insertGroup: async (id, name, icon, userId, position, collapsed = 0) => await db.run(`
    INSERT INTO people_groups (id, name, icon, user_id, position, collapsed)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [id, name, icon, userId, position, collapsed]),

  updateGroup: async (id, name, icon, position, collapsed, userId) => await db.run(`
    UPDATE people_groups SET name = $1, icon = $2, position = $3, collapsed = $4, updated_at = NOW()
    WHERE id = $5 AND user_id = $6
  `, [name, icon, position, collapsed, id, userId]),

  deleteGroup: async (id, userId) => await db.run('DELETE FROM people_groups WHERE id = $1 AND user_id = $2', [id, userId]),

  updateGroupCollapsed: async (id, collapsed, userId) => await db.run(`
    UPDATE people_groups SET collapsed = $1, updated_at = NOW()
    WHERE id = $2 AND user_id = $3
  `, [collapsed ? 1 : 0, id, userId]),

  collapseAllGroups: async (userId) => await db.run(`
    UPDATE people_groups SET collapsed = 1, updated_at = NOW()
    WHERE user_id = $1
  `, [userId]),

  expandAllGroups: async (userId) => await db.run(`
    UPDATE people_groups SET collapsed = 0, updated_at = NOW()
    WHERE user_id = $1
  `, [userId]),

  updatePersonGroup: async (personId, groupId, position, userId) => await db.run(`
    UPDATE people SET group_id = $1, position = $2, updated_at = NOW()
    WHERE id = $3 AND user_id = $4
  `, [groupId, position, personId, userId]),

  reorderGroups: async (updates, userId) => {
    await db.transaction(async (client) => {
      for (const item of updates) {
        await client.run(`
          UPDATE people_groups SET position = $1, updated_at = NOW()
          WHERE id = $2 AND user_id = $3
        `, [item.position, item.id, userId]);
      }
    });
  }
};
