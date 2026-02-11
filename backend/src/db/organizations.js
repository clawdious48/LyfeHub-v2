// ============================================
// Organizations Database Operations
// ============================================

const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

/**
 * Get all organizations for a user
 */
function getAllOrganizations(userId) {
  const stmt = db.prepare(`
    SELECT * FROM organizations
    WHERE user_id = ?
    ORDER BY name ASC
  `);
  return stmt.all(userId);
}

/**
 * Get a single organization by ID
 */
function getOrganizationById(id, userId) {
  const stmt = db.prepare(`
    SELECT * FROM organizations
    WHERE id = ? AND user_id = ?
  `);
  return stmt.get(id, userId);
}

/**
 * Create a new organization
 */
function createOrganization(data, userId) {
  const id = uuidv4();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO organizations (
      id, user_id, name, type, industry, description,
      website, linkedin, phone, email,
      address, city, state, country,
      parent_org_id, founded_year, employee_count,
      notes, tags, important,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?
    )
  `);

  stmt.run(
    id, userId,
    data.name || 'Unnamed Organization',
    data.type || '',
    data.industry || '',
    data.description || '',
    data.website || '',
    data.linkedin || '',
    data.phone || '',
    data.email || '',
    data.address || '',
    data.city || '',
    data.state || '',
    data.country || '',
    data.parent_org_id || null,
    data.founded_year || null,
    data.employee_count || null,
    data.notes || '',
    JSON.stringify(data.tags || []),
    data.important ? 1 : 0,
    now, now
  );

  return getOrganizationById(id, userId);
}

/**
 * Update an organization
 */
function updateOrganization(id, data, userId) {
  const existing = getOrganizationById(id, userId);
  if (!existing) return null;

  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE organizations SET
      name = ?,
      type = ?,
      industry = ?,
      description = ?,
      website = ?,
      linkedin = ?,
      phone = ?,
      email = ?,
      address = ?,
      city = ?,
      state = ?,
      country = ?,
      parent_org_id = ?,
      founded_year = ?,
      employee_count = ?,
      notes = ?,
      tags = ?,
      important = ?,
      updated_at = ?
    WHERE id = ? AND user_id = ?
  `);

  const val = (key, isJson = false) => {
    if (data[key] === undefined) {
      return isJson ? existing[key] : existing[key];
    }
    return isJson ? JSON.stringify(data[key]) : data[key];
  };

  stmt.run(
    data.name !== undefined ? data.name : existing.name,
    val('type'),
    val('industry'),
    val('description'),
    val('website'),
    val('linkedin'),
    val('phone'),
    val('email'),
    val('address'),
    val('city'),
    val('state'),
    val('country'),
    data.parent_org_id !== undefined ? data.parent_org_id : existing.parent_org_id,
    data.founded_year !== undefined ? data.founded_year : existing.founded_year,
    data.employee_count !== undefined ? data.employee_count : existing.employee_count,
    val('notes'),
    val('tags', true),
    data.important !== undefined ? (data.important ? 1 : 0) : existing.important,
    now,
    id, userId
  );

  return getOrganizationById(id, userId);
}

/**
 * Delete an organization
 */
function deleteOrganization(id, userId) {
  // First, unlink any people from this org
  const unlinkStmt = db.prepare(`
    UPDATE people SET organization_id = NULL
    WHERE organization_id = ? AND user_id = ?
  `);
  unlinkStmt.run(id, userId);

  const stmt = db.prepare(`
    DELETE FROM organizations
    WHERE id = ? AND user_id = ?
  `);
  const result = stmt.run(id, userId);
  return result.changes > 0;
}

/**
 * Get organization count for a user
 */
function getOrganizationCount(userId) {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM organizations WHERE user_id = ?');
  const result = stmt.get(userId);
  return result ? result.count : 0;
}

/**
 * Get all people belonging to an organization
 */
function getPeopleByOrganization(orgId, userId) {
  const stmt = db.prepare(`
    SELECT id, name, job_title, email, phone_mobile
    FROM people
    WHERE organization_id = ? AND user_id = ?
    ORDER BY name ASC
  `);
  return stmt.all(orgId, userId);
}

/**
 * Search organizations by name or other fields
 */
function searchOrganizations(userId, query) {
  const searchTerm = `%${query}%`;
  const stmt = db.prepare(`
    SELECT * FROM organizations
    WHERE user_id = ?
      AND (name LIKE ? OR industry LIKE ? OR notes LIKE ?)
    ORDER BY name ASC
  `);
  return stmt.all(userId, searchTerm, searchTerm, searchTerm);
}

module.exports = {
  getAllOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationCount,
  getPeopleByOrganization,
  searchOrganizations
};
