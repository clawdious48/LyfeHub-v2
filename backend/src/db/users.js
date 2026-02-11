const db = require('./schema');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const BCRYPT_ROUNDS = 12;

/**
 * Find user by email
 */
function findUserByEmail(email) {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email.toLowerCase());
}

/**
 * Find user by email OR name (for login)
 */
function findUserByEmailOrName(identifier) {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ? OR LOWER(name) = ?');
  return stmt.get(identifier.toLowerCase(), identifier.toLowerCase());
}

/**
 * Find user by ID
 */
function findUserById(id) {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id);
}

/**
 * Create a new user
 * @returns {object} User object (without password_hash)
 */
async function createUser({ email, password, name }) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  
  const stmt = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, settings, created_at, updated_at)
    VALUES (?, ?, ?, ?, '{}', ?, ?)
  `);
  
  stmt.run(id, email.toLowerCase(), passwordHash, name, now, now);
  
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
  const user = findUserByEmailOrName(identifier);
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
function updateUser(id, data) {
  const now = new Date().toISOString();
  const updates = [];
  const values = [];
  
  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  
  if (data.settings !== undefined) {
    updates.push('settings = ?');
    values.push(JSON.stringify(data.settings));
  }
  
  if (updates.length === 0) return findUserById(id);
  
  updates.push('updated_at = ?');
  values.push(now);
  values.push(id);
  
  const stmt = db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);
  
  return findUserById(id);
}

/**
 * Change user password
 */
async function changePassword(id, newPassword) {
  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  
  const stmt = db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?');
  stmt.run(passwordHash, now, id);
  
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
  return safeUser;
}

module.exports = {
  findUserByEmail,
  findUserByEmailOrName,
  findUserById,
  createUser,
  verifyPassword,
  updateUser,
  changePassword,
  getSafeUser
};
