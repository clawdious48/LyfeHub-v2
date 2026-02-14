const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a new organization
 */
function createOrg(name, slug, createdBy) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO apex_organizations (id, name, slug, created_by)
    VALUES (?, ?, ?, ?)
  `).run(id, name, slug, createdBy);
  return getOrgById(id);
}

/**
 * Get an organization by ID
 */
function getOrgById(id) {
  return db.prepare('SELECT * FROM apex_organizations WHERE id = ?').get(id);
}

/**
 * Get all organizations a user belongs to
 */
function getOrgsByUser(userId) {
  return db.prepare(`
    SELECT o.*, m.role as member_role
    FROM apex_organizations o
    JOIN apex_org_members m ON m.org_id = o.id
    WHERE m.user_id = ?
    ORDER BY o.created_at ASC
  `).all(userId);
}

/**
 * Add a member to an organization
 */
function addMember(orgId, userId, role) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO apex_org_members (id, org_id, user_id, role)
    VALUES (?, ?, ?, ?)
  `).run(id, orgId, userId, role);
  return getMembership(orgId, userId);
}

/**
 * Remove a member from an organization
 */
function removeMember(orgId, userId) {
  const result = db.prepare(
    'DELETE FROM apex_org_members WHERE org_id = ? AND user_id = ?'
  ).run(orgId, userId);
  return result.changes > 0;
}

/**
 * Get all members of an organization (with user info)
 */
function getMembersByOrg(orgId) {
  return db.prepare(`
    SELECT m.*, u.name as user_name, u.email as user_email
    FROM apex_org_members m
    JOIN users u ON m.user_id = u.id
    WHERE m.org_id = ?
    ORDER BY m.created_at ASC
  `).all(orgId);
}

/**
 * Get a single membership record
 */
function getMembership(orgId, userId) {
  return db.prepare(
    'SELECT * FROM apex_org_members WHERE org_id = ? AND user_id = ?'
  ).get(orgId, userId);
}

/**
 * Get a user's org role (assumes single-org; returns first match)
 * Returns { org_id, role } or null
 */
function getUserOrgRole(userId) {
  return db.prepare(`
    SELECT org_id, role FROM apex_org_members WHERE user_id = ? LIMIT 1
  `).get(userId) || null;
}

/**
 * Update a member's role
 */
function updateMemberRole(orgId, userId, newRole) {
  const result = db.prepare(
    'UPDATE apex_org_members SET role = ? WHERE org_id = ? AND user_id = ?'
  ).run(newRole, orgId, userId);
  if (result.changes === 0) return null;
  return getMembership(orgId, userId);
}

module.exports = {
  createOrg,
  getOrgById,
  getOrgsByUser,
  addMember,
  removeMember,
  getMembersByOrg,
  getMembership,
  getUserOrgRole,
  updateMemberRole
};
