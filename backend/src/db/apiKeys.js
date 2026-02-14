const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('./schema');

// Encryption for storing retrievable keys (management only)
const ENCRYPT_KEY = crypto.createHash('sha256').update(process.env.JWT_SECRET || 'fallback-key').digest();

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPT_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  const [ivHex, encrypted] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPT_KEY, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function generateApiKey() {
  const randomPart = crypto.randomBytes(24).toString('base64url');
  return `lh_live_${randomPart}`;
}

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

async function createApiKey(userId, name, expiresAt = null) {
  const id = uuidv4();
  const key = generateApiKey();
  const keyHash = hashKey(key);
  const keyPrefix = key.substring(0, 12);
  const keyEncrypted = encrypt(key);

  await db.run(
    "INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix, key_encrypted, expires_at, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())",
    [id, userId, name, keyHash, keyPrefix, keyEncrypted, expiresAt]
  );

  return { id, name, key, keyPrefix, expiresAt, createdAt: new Date().toISOString() };
}

async function listApiKeys(userId) {
  const rows = await db.getAll(
    "SELECT id, name, key_prefix, expires_at, last_used_at, created_at FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );

  return rows.map(row => ({
    id: row.id, name: row.name, keyPrefix: row.key_prefix,
    expiresAt: row.expires_at, lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    isExpired: row.expires_at ? new Date(row.expires_at) < new Date() : false
  }));
}

async function getFullKey(keyId, userId) {
  const row = await db.getOne(
    "SELECT key_encrypted FROM api_keys WHERE id = $1 AND user_id = $2",
    [keyId, userId]
  );
  if (!row || !row.key_encrypted) return null;
  try {
    return decrypt(row.key_encrypted);
  } catch (e) {
    return null;
  }
}

async function validateApiKey(key) {
  if (!key || !key.startsWith('lh_live_')) return null;
  const keyHash = hashKey(key);
  const row = await db.getOne(
    "SELECT ak.id, ak.user_id, ak.name, ak.expires_at, u.email, u.name as user_name, u.role FROM api_keys ak JOIN users u ON u.id = ak.user_id WHERE ak.key_hash = $1",
    [keyHash]
  );
  if (!row) return null;
  if (row.expires_at && new Date(row.expires_at) < new Date()) return null;
  await db.run("UPDATE api_keys SET last_used_at = NOW() WHERE id = $1", [row.id]);
  return { keyId: row.id, keyName: row.name, userId: row.user_id, email: row.email, userName: row.user_name, role: row.role };
}

async function deleteApiKey(keyId, userId) {
  const result = await db.run("DELETE FROM api_keys WHERE id = $1 AND user_id = $2", [keyId, userId]);
  return result.rowCount > 0;
}

async function updateApiKey(keyId, userId, updates) {
  const { name, expiresAt } = updates;
  const result = await db.run(
    "UPDATE api_keys SET name = COALESCE($1, name), expires_at = COALESCE($2, expires_at) WHERE id = $3 AND user_id = $4",
    [name, expiresAt, keyId, userId]
  );
  return result.rowCount > 0;
}

module.exports = { generateApiKey, createApiKey, listApiKeys, getFullKey, validateApiKey, deleteApiKey, updateApiKey };
