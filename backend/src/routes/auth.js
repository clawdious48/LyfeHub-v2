const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const {
  generateToken,
  setSessionCookie,
  clearSessionCookie
} = require('../middleware/auth');
const {
  findOrCreateByGoogle,
  getSafeUser
} = require('../db/users');

const router = express.Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * POST /api/auth/google
 * Authenticate with Google OAuth credential (ID token from GSI)
 */
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Missing credential' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    // Domain restriction
    const allowedDomain = 'apexrestoration.pro';
    if (!payload.email.endsWith(`@${allowedDomain}`)) {
      return res.status(403).json({
        error: `Access restricted to @${allowedDomain} accounts`,
        code: 'DOMAIN_RESTRICTED',
      });
    }

    const user = await findOrCreateByGoogle({
      googleId: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      avatarUrl: payload.picture || null,
    });

    const sessionId = `google:${user.id}:${Date.now()}`;
    const token = generateToken(sessionId, user.id, user.email, true);
    setSessionCookie(res, token, true);

    res.json({ user });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(401).json({ error: 'Google authentication failed' });
  }
});

/**
 * POST /api/auth/logout
 * Clear session cookie
 */
router.post('/logout', async (req, res) => {
  clearSessionCookie(res);
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * GET /api/auth/check
 * Check if current session is valid
 */
router.get('/check', async (req, res) => {
  const jwt = require('jsonwebtoken');
  const { COOKIE_NAME } = require('../middleware/auth');
  const { findUserById } = require('../db/users');
  const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    return res.json({ authenticated: false });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await findUserById(decoded.userId);
    if (!user) {
      res.clearCookie(COOKIE_NAME);
      return res.json({ authenticated: false });
    }
    res.json({
      authenticated: true,
      user: getSafeUser(user),
    });
  } catch {
    res.json({ authenticated: false });
  }
});

module.exports = router;
