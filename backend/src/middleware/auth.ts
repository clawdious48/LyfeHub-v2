import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request with auth properties
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: string[];
        roles: string[];
      };
      authMethod?: 'jwt' | 'api_key';
      apiKeyId?: string;
      apiKeyName?: string;
      apiKeyScopes?: string[];
      sessionId?: string;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const COOKIE_NAME = 'kanban_session';

function parseRoles(roleStr: string | null | undefined): string[] {
  if (!roleStr) return ['field_tech'];
  try {
    const r = JSON.parse(roleStr);
    return Array.isArray(r) ? r : [r];
  } catch {
    return [roleStr];
  }
}

async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (token.startsWith('lh_live_')) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const apiKeysDb = require('../db/apiKeys');
      const db = require('../db/schema');
      const keyData = await apiKeysDb.validateApiKey(token);
      if (!keyData) {
        res.status(401).json({ error: 'Invalid or expired API key', code: 'INVALID_API_KEY' });
        return;
      }
      const userRow = await db.getOne('SELECT role, status FROM users WHERE id = $1', [keyData.userId]);
      if (userRow?.status === 'suspended') {
        res.status(403).json({ error: 'Account suspended', code: 'ACCOUNT_SUSPENDED' });
        return;
      }
      req.authMethod = 'api_key';
      req.apiKeyId = keyData.keyId;
      req.apiKeyName = keyData.keyName;
      const roles = parseRoles(userRow?.role as string | null);
      req.user = { id: keyData.userId, email: keyData.email, name: keyData.userName, role: roles, roles };
      const scopeRow = await db.getOne('SELECT scopes FROM api_keys WHERE id = $1', [keyData.keyId]);
      try {
        const scopes = scopeRow?.scopes
          ? typeof scopeRow.scopes === 'string'
            ? JSON.parse(scopeRow.scopes)
            : scopeRow.scopes
          : [];
        req.apiKeyScopes = Array.isArray(scopes) ? scopes : [];
      } catch {
        req.apiKeyScopes = [];
      }
      next();
      return;
    }
    res.status(401).json({ error: 'Invalid authorization token', code: 'INVALID_TOKEN' });
    return;
  }

  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
    return;
  }

  try {
    const db = require('../db/schema');
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; sessionId: string };
    const user = await db.getOne('SELECT role, name, status FROM users WHERE id = $1', [decoded.userId]);
    if (!user) {
      res.clearCookie(COOKIE_NAME);
      res.status(401).json({ error: 'User no longer exists', code: 'USER_NOT_FOUND' });
      return;
    }
    if (user.status === 'suspended') {
      res.clearCookie(COOKIE_NAME);
      res.status(403).json({ error: 'Account suspended', code: 'ACCOUNT_SUSPENDED' });
      return;
    }
    req.authMethod = 'jwt';
    req.sessionId = decoded.sessionId;
    const roles = parseRoles(user?.role as string | null);
    req.user = { id: decoded.userId, email: decoded.email, role: roles, roles, name: (user?.name as string) || '' };
    next();
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'TokenExpiredError') {
      res.clearCookie(COOKIE_NAME);
      res.status(401).json({ error: 'Session expired', code: 'SESSION_EXPIRED' });
      return;
    }
    res.status(401).json({ error: 'Invalid session', code: 'INVALID_SESSION' });
  }
}

function generateToken(sessionId: string, userId: string, email: string, rememberMe = true): string {
  return jwt.sign(
    { sessionId, userId, email, iat: Math.floor(Date.now() / 1000) },
    JWT_SECRET,
    { expiresIn: rememberMe ? '30d' : '1d' },
  );
}

function setSessionCookie(res: Response, token: string, rememberMe = true): void {
  const cookieOptions: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax';
    maxAge?: number;
  } = {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
  };
  if (rememberMe) cookieOptions.maxAge = 30 * 24 * 60 * 60 * 1000;
  res.cookie(COOKIE_NAME, token, cookieOptions);
}

function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME);
}

export { authMiddleware, generateToken, setSessionCookie, clearSessionCookie, COOKIE_NAME };

// CommonJS-compatible export for existing .js files that require() this
module.exports = { authMiddleware, generateToken, setSessionCookie, clearSessionCookie, COOKIE_NAME };
