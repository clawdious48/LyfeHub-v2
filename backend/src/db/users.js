const db = require('./schema');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const BCRYPT_ROUNDS = 12;

/**
 * Find user by email
 */
async function findUserByEmail(email) {
  return await db.getOne('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
}

/**
 * Find user by email OR name (for login)
 */
async function findUserByEmailOrName(identifier) {
  return await db.getOne('SELECT * FROM users WHERE email = $1 OR LOWER(name) = $2', [identifier.toLowerCase(), identifier.toLowerCase()]);
}

/**
 * Find user by ID
 */
async function findUserById(id) {
  return await db.getOne('SELECT * FROM users WHERE id = $1', [id]);
}

/**
 * Create a new user
 * @returns {object} User object (without password_hash)
 */
async function createUser({ email, password, name }) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await db.run(`
    INSERT INTO users (id, email, password_hash, name, role, settings, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, '{}', $6, $7)
  `, [id, email.toLowerCase(), passwordHash, name, 'field_tech', now, now]);

  return {
    id,
    email: email.toLowerCase(),
    name,
    settings: {},
    created_at: now,
    updated_at: now
  };
}

/**
 * Verify user password (accepts email or username)
 * @returns {object|null} User object if valid, null if invalid
 */
async function verifyPassword(identifier, password) {
  const user = await findUserByEmailOrName(identifier);
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;

  // Return user without password hash
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

/**
 * Update user profile
 */
async function updateUser(id, data) {
  const now = new Date().toISOString();
  const updates = [];
  const values = [];
  let paramIdx = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIdx++}`);
    values.push(data.name);
  }

  if (data.settings !== undefined) {
    updates.push(`settings = $${paramIdx++}`);
    values.push(JSON.stringify(data.settings));
  }

  if (updates.length === 0) return await findUserById(id);

  updates.push(`updated_at = $${paramIdx++}`);
  values.push(now);
  values.push(id);

  await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIdx}`, values);

  return await findUserById(id);
}

/**
 * Change user password
 */
async function changePassword(id, newPassword) {
  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await db.run('UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3', [passwordHash, now, id]);

  return true;
}

/**
 * Get safe user object (no password hash)
 */
function getSafeUser(user) {
  if (!user) return null;
  const { password_hash, ...safeUser } = user;
  // Parse settings if it's a string
  if (typeof safeUser.settings === 'string') {
    safeUser.settings = JSON.parse(safeUser.settings);
  }
  // Normalize role to a simple string; default to field_tech
  if (!safeUser.role || !VALID_ROLES.includes(safeUser.role)) {
    safeUser.role = 'field_tech';
  }
  return safeUser;
}

const VALID_ROLES = ['developer', 'management', 'office_coordinator', 'project_manager', 'estimator', 'field_tech'];

/**
 * Get all users (without password_hash)
 */
async function getAllUsers() {
  return await db.getAll('SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at ASC');
}

/**
 * Create user (uses bcrypt.hashSync for synchronous-style, but function is async for PG)
 */
async function createUserSync({ email, password, name, role }) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const passwordHash = bcrypt.hashSync(password, BCRYPT_ROUNDS);

  await db.run(`
    INSERT INTO users (id, email, password_hash, name, role, settings, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, '{}', $6, $7)
  `, [id, email.toLowerCase(), passwordHash, name, role || 'field_tech', now, now]);

  return { id, name, email: email.toLowerCase(), role: role || 'field_tech', created_at: now };
}

/**
 * Update a user's role
 */
async function updateUserRole(id, role) {
  const now = new Date().toISOString();
  await db.run('UPDATE users SET role = $1, updated_at = $2 WHERE id = $3', [role, now, id]);
  return await findUserById(id);
}

/**
 * Reset a user's password
 */
async function resetUserPassword(id, newPassword) {
  const now = new Date().toISOString();
  const passwordHash = bcrypt.hashSync(newPassword, BCRYPT_ROUNDS);
  await db.run('UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3', [passwordHash, now, id]);
  return true;
}

/**
 * Delete a user by ID.
 * Nullifies user_id references in owned-data tables and removes the user.
 * Uses a transaction to keep everything consistent.
 */
async function deleteUser(id) {
  return await db.transaction(async (client) => {
    // Nullify ownership references so data isn't lost
    const tables = ['tasks', 'calendars', 'people', 'people_groups',
      'organizations', 'notes', 'projects', 'tags', 'apex_jobs',
      'bases', 'base_records', 'task_lists', 'goals', 'milestones', 'work_sessions'];
    for (const table of tables) {
      try { await client.run(`UPDATE ${table} SET user_id = NULL WHERE user_id = $1`, [id]); } catch (_) {}
    }
    // Delete rows from tables with NOT NULL user_id + ON DELETE CASCADE
    const cascadeTables = ['api_keys'];
    for (const table of cascadeTables) {
      try { await client.run(`DELETE FROM ${table} WHERE user_id = $1`, [id]); } catch (_) {}
    }
    const result = await client.run('DELETE FROM users WHERE id = $1', [id]);
    return result.rowCount > 0;
  });
}

/**
 * Update a user's status (active, suspended)
 */
async function updateUserStatus(id, status) {
  const now = new Date().toISOString();
  await db.run('UPDATE users SET status = $1, updated_at = $2 WHERE id = $3', [status, now, id]);
  return await findUserById(id);
}

module.exports = {
  findUserByEmail,
  findUserByEmailOrName,
  findUserById,
  createUser,
  verifyPassword,
  updateUser,
  changePassword,
  getSafeUser,
  getAllUsers,
  createUserSync,
  updateUserRole,
  resetUserPassword,
  deleteUser,
  updateUserStatus,
  VALID_ROLES
};
