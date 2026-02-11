const db = require('./schema');

// ============================================
// PEOPLE GROUPS QUERIES
// ============================================

const getAllGroups = db.prepare('SELECT * FROM people_groups WHERE user_id = ? ORDER BY position ASC');
const getGroupById = db.prepare('SELECT * FROM people_groups WHERE id = ? AND user_id = ?');
const insertGroup = db.prepare(`
  INSERT INTO people_groups (id, name, icon, user_id, position, collapsed)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const updateGroup = db.prepare(`
  UPDATE people_groups SET name = ?, icon = ?, position = ?, collapsed = ?, updated_at = datetime('now')
  WHERE id = ? AND user_id = ?
`);
const deleteGroup = db.prepare('DELETE FROM people_groups WHERE id = ? AND user_id = ?');
const updateGroupCollapsed = db.prepare(`
  UPDATE people_groups SET collapsed = ?, updated_at = datetime('now')
  WHERE id = ? AND user_id = ?
`);
const collapseAllGroups = db.prepare(`
  UPDATE people_groups SET collapsed = 1, updated_at = datetime('now')
  WHERE user_id = ?
`);
const expandAllGroups = db.prepare(`
  UPDATE people_groups SET collapsed = 0, updated_at = datetime('now')
  WHERE user_id = ?
`);

// Update people to set group
const updatePersonGroup = db.prepare(`
  UPDATE people SET group_id = ?, position = ?, updated_at = datetime('now')
  WHERE id = ? AND user_id = ?
`);

module.exports = {
  getAllGroups: (userId) => getAllGroups.all(userId),
  getGroupById: (id, userId) => getGroupById.get(id, userId),
  insertGroup: (id, name, icon, userId, position, collapsed = 0) => insertGroup.run(id, name, icon, userId, position, collapsed),
  updateGroup: (id, name, icon, position, collapsed, userId) => updateGroup.run(name, icon, position, collapsed, id, userId),
  deleteGroup: (id, userId) => deleteGroup.run(id, userId),
  updateGroupCollapsed: (id, collapsed, userId) => updateGroupCollapsed.run(collapsed ? 1 : 0, id, userId),
  collapseAllGroups: (userId) => collapseAllGroups.run(userId),
  expandAllGroups: (userId) => expandAllGroups.run(userId),
  updatePersonGroup: (personId, groupId, position, userId) => updatePersonGroup.run(groupId, position, personId, userId),
  reorderGroups: (updates, userId) => {
    const updateGroupPosition = db.prepare(`
      UPDATE people_groups SET position = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `);
    const transaction = db.transaction((items) => {
      for (const item of items) {
        updateGroupPosition.run(item.position, item.id, userId);
      }
    });
    transaction(updates);
  }
};
