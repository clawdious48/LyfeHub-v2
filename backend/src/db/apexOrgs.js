const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a new organization
 */
async function createOrg(name, slug, createdBy) {
  const id = uuidv4();
  await db.run(`
    INSERT INTO apex_organizations (id, name, slug, created_by)
    VALUES ($1, $2, $3, $4)
  `, [id, name, slug, createdBy]);
  return getOrgById(id);
}

/**
 * Get an organization by ID
 */
async function getOrgById(id) {
  return await db.getOne('SELECT * FROM apex_organizations WHERE id = $1', [id]);
}

/**
 * Get all organizations a user belongs to
 */
async function getOrgsByUser(userId) {
  return await db.getAll(`
    SELECT o.*, m.role as member_role
    FROM apex_organizations o
    JOIN apex_org_members m ON m.org_id = o.id
    WHERE m.user_id = $1
    ORDER BY o.created_at ASC
  `, [userId]);
}

/**
 * Add a member to an organization
 */
async function addMember(orgId, userId, role) {
  const id = uuidv4();
  await db.run(`
    INSERT INTO apex_org_members (id, org_id, user_id, role)
    VALUES ($1, $2, $3, $4)
  `, [id, orgId, userId, role]);
  return getMembership(orgId, userId);
}

/**
 * Remove a member from an organization
 */
async function removeMember(orgId, userId) {
  const result = await db.run(
    'DELETE FROM apex_org_members WHERE org_id = $1 AND user_id = $2',
    [orgId, userId]
  );
  return result.rowCount > 0;
}

/**
 * Get all members of an organization (with user info)
 */
async function getMembersByOrg(orgId) {
  return await db.getAll(`
    SELECT m.*, u.name as user_name, u.email as user_email
    FROM apex_org_members m
    JOIN users u ON m.user_id = u.id
    WHERE m.org_id = $1
    ORDER BY m.created_at ASC
  `, [orgId]);
}

/**
 * Get a single membership record
 */
async function getMembership(orgId, userId) {
  return await db.getOne(
    'SELECT * FROM apex_org_members WHERE org_id = $1 AND user_id = $2',
    [orgId, userId]
  );
}

/**
 * Get a user's org role (assumes single-org; returns first match)
 * Returns { org_id, role } or null
 */
async function getUserOrgRole(userId) {
  return await db.getOne(`
    SELECT org_id, role FROM apex_org_members WHERE user_id = $1 LIMIT 1
  `, [userId]) || null;
}

/**
 * Update a member's role
 */
async function updateMemberRole(orgId, userId, newRole) {
  const result = await db.run(
    'UPDATE apex_org_members SET role = $1 WHERE org_id = $2 AND user_id = $3',
    [newRole, orgId, userId]
  );
  if (result.rowCount === 0) return null;
  return getMembership(orgId, userId);
}

/**
 * Look up a user by email (case-insensitive)
 */
async function getUserByEmail(email) {
  return await db.getOne('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
}

module.exports = {
  createOrg,
  getOrgById,
  getOrgsByUser,
  addMember,
  removeMember,
  getMembersByOrg,
  getOrgMembers: getMembersByOrg,
  getMembership,
  getUserOrgRole,
  updateMemberRole,
  getUserByEmail
};
