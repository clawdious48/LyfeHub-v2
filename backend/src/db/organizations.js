// ============================================
// Organizations Database Operations
// ============================================

const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

/**
 * Get all organizations for a user
 */
async function getAllOrganizations(userId) {
  return await db.getAll(`
    SELECT * FROM organizations
    WHERE user_id = $1
    ORDER BY name ASC
  `, [userId]);
}

/**
 * Get a single organization by ID
 */
async function getOrganizationById(id, userId) {
  return await db.getOne(`
    SELECT * FROM organizations
    WHERE id = $1 AND user_id = $2
  `, [id, userId]);
}

/**
 * Create a new organization
 */
async function createOrganization(data, userId) {
  const id = uuidv4();
  const now = new Date().toISOString();

  await db.run(`
    INSERT INTO organizations (
      id, user_id, name, type, industry, description,
      website, linkedin, phone, email,
      address, city, state, country,
      parent_org_id, founded_year, employee_count,
      notes, tags, important,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10,
      $11, $12, $13, $14,
      $15, $16, $17,
      $18, $19, $20,
      $21, $22
    )
  `, [
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
  ]);

  return await getOrganizationById(id, userId);
}

/**
 * Update an organization
 */
async function updateOrganization(id, data, userId) {
  const existing = await getOrganizationById(id, userId);
  if (!existing) return null;

  const now = new Date().toISOString();

  const val = (key, isJson = false) => {
    if (data[key] === undefined) {
      return isJson ? existing[key] : existing[key];
    }
    return isJson ? JSON.stringify(data[key]) : data[key];
  };

  await db.run(`
    UPDATE organizations SET
      name = $1,
      type = $2,
      industry = $3,
      description = $4,
      website = $5,
      linkedin = $6,
      phone = $7,
      email = $8,
      address = $9,
      city = $10,
      state = $11,
      country = $12,
      parent_org_id = $13,
      founded_year = $14,
      employee_count = $15,
      notes = $16,
      tags = $17,
      important = $18,
      updated_at = $19
    WHERE id = $20 AND user_id = $21
  `, [
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
  ]);

  return await getOrganizationById(id, userId);
}

/**
 * Delete an organization
 */
async function deleteOrganization(id, userId) {
  // First, unlink any people from this org
  await db.run(`
    UPDATE people SET organization_id = NULL
    WHERE organization_id = $1 AND user_id = $2
  `, [id, userId]);

  const result = await db.run(`
    DELETE FROM organizations
    WHERE id = $1 AND user_id = $2
  `, [id, userId]);
  return result.rowCount > 0;
}

/**
 * Get organization count for a user
 */
async function getOrganizationCount(userId) {
  const result = await db.getOne('SELECT COUNT(*) as count FROM organizations WHERE user_id = $1', [userId]);
  return result ? parseInt(result.count) : 0;
}

/**
 * Get all people belonging to an organization
 */
async function getPeopleByOrganization(orgId, userId) {
  return await db.getAll(`
    SELECT id, name, job_title, email, phone_mobile
    FROM people
    WHERE organization_id = $1 AND user_id = $2
    ORDER BY name ASC
  `, [orgId, userId]);
}

/**
 * Search organizations by name or other fields
 */
async function searchOrganizations(userId, query) {
  const searchTerm = `%${query}%`;
  return await db.getAll(`
    SELECT * FROM organizations
    WHERE user_id = $1
      AND (name ILIKE $2 OR industry ILIKE $3 OR notes ILIKE $4)
    ORDER BY name ASC
  `, [userId, searchTerm, searchTerm, searchTerm]);
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
