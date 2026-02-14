const jwt = require('jsonwebtoken');
const db = require('../db/schema');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const COOKIE_NAME = 'kanban_session';

function parseRoles(roleStr) {
  if (!roleStr) return ['field_tech'];
  try { const r = JSON.parse(roleStr); return Array.isArray(r) ? r : [r]; } catch { return [roleStr]; }
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (token.startsWith('lh_live_')) {
      const apiKeysDb = require('../db/apiKeys');
      const keyData = await apiKeysDb.validateApiKey(token);
      if (!keyData) {
        return res.status(401).json({ error: 'Invalid or expired API key', code: 'INVALID_API_KEY' });
      }
      const userRow = await db.getOne('SELECT role FROM users WHERE id = $1', [keyData.userId]);
      req.authMethod = 'api_key';
      req.apiKeyId = keyData.keyId;
      req.apiKeyName = keyData.keyName;
      const roles = parseRoles(userRow?.role);
      req.user = { id: keyData.userId, email: keyData.email, name: keyData.userName, role: roles, roles };
      return next();
    }
    return res.status(401).json({ error: 'Invalid authorization token', code: 'INVALID_TOKEN' });
  }
  
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.getOne('SELECT role, name FROM users WHERE id = $1', [decoded.userId]);
    req.authMethod = 'jwt';
    req.sessionId = decoded.sessionId;
    const roles = parseRoles(user?.role);
    req.user = { id: decoded.userId, email: decoded.email, role: roles, roles, name: user?.name || '' };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      res.clearCookie(COOKIE_NAME);
      return res.status(401).json({ error: 'Session expired', code: 'SESSION_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid session', code: 'INVALID_SESSION' });
  }
}

function generateToken(sessionId, userId, email, rememberMe = true) {
  return jwt.sign({ sessionId, userId, email, iat: Math.floor(Date.now() / 1000) }, JWT_SECRET, { expiresIn: rememberMe ? '30d' : '1d' });
}

function setSessionCookie(res, token, rememberMe = true) {
  const cookieOptions = { httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: 'lax' };
  if (rememberMe) cookieOptions.maxAge = 30 * 24 * 60 * 60 * 1000;
  res.cookie(COOKIE_NAME, token, cookieOptions);
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

module.exports = { authMiddleware, generateToken, setSessionCookie, clearSessionCookie, COOKIE_NAME };
