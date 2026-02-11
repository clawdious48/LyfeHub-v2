const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('./schema');

function generateApiKey() {
  const randomPart = crypto.randomBytes(24).toString('base64url');
  return `lh_live_${randomPart}`;
}

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function createApiKey(userId, name, expiresAt = null) {
  const id = uuidv4();
  const key = generateApiKey();
  const keyHash = hashKey(key);
  const keyPrefix = key.substring(0, 12);

  const stmt = db.prepare(`
    INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  stmt.run(id, userId, name, keyHash, keyPrefix, expiresAt);

  return { id, name, key, keyPrefix, expiresAt, createdAt: new Date().toISOString() };
}

function listApiKeys(userId) {
  const stmt = db.prepare(`
    SELECT id, name, key_prefix, expires_at, last_used_at, created_at
    FROM api_keys WHERE user_id = ? ORDER BY created_at DESC
  `);

  return stmt.all(userId).map(row => ({
    id: row.id, name: row.name, keyPrefix: row.key_prefix,
    expiresAt: row.expires_at, lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    isExpired: row.expires_at ? new Date(row.expires_at) < new Date() : false
  }));
}

function validateApiKey(key) {
  if (!key || !key.startsWith('lh_live_')) return null;
  const keyHash = hashKey(key);
  const stmt = db.prepare(`
    SELECT ak.id, ak.user_id, ak.name, ak.expires_at, u.email, u.name as user_name
    FROM api_keys ak JOIN users u ON u.id = ak.user_id WHERE ak.key_hash = ?
  `);
  const row = stmt.get(keyHash);
  if (!row) return null;
  if (row.expires_at && new Date(row.expires_at) < new Date()) return null;
  db.prepare(`UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?`).run(row.id);
  return { keyId: row.id, keyName: row.name, userId: row.user_id, email: row.email, userName: row.user_name };
}

function deleteApiKey(keyId, userId) {
  const result = db.prepare(`DELETE FROM api_keys WHERE id = ? AND user_id = ?`).run(keyId, userId);
  return result.changes > 0;
}

function updateApiKey(keyId, userId, updates) {
  const { name, expiresAt } = updates;
  const result = db.prepare(`
    UPDATE api_keys SET name = COALESCE(?, name), expires_at = COALESCE(?, expires_at)
    WHERE id = ? AND user_id = ?
  `).run(name, expiresAt, keyId, userId);
  return result.changes > 0;
}

module.exports = { generateApiKey, createApiKey, listApiKeys, validateApiKey, deleteApiKey, updateApiKey };
