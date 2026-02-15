const express = require('express');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const { 
  generateToken, 
  setSessionCookie, 
  clearSessionCookie 
} = require('../middleware/auth');
const {
  findUserByEmail,
  createUser,
  verifyPassword,
  getSafeUser
} = require('../db/users');

const router = express.Router();

// Rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { 
    error: 'Too many login attempts, please try again later',
    code: 'RATE_LIMITED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

// Rate limiting for signup (prevent spam accounts)
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 signups per hour per IP
  message: { 
    error: 'Too many accounts created, please try again later',
    code: 'RATE_LIMITED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

/**
 * POST /api/auth/signup
 * Create a new account
 */
router.post('/signup', signupLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: 'Email, password, and name are required',
        code: 'MISSING_FIELDS'
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format',
        code: 'INVALID_EMAIL'
      });
    }
    
    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters',
        code: 'WEAK_PASSWORD'
      });
    }
    
    // Validate name
    if (name.trim().length < 1) {
      return res.status(400).json({ 
        error: 'Name is required',
        code: 'INVALID_NAME'
      });
    }
    
    // Check if email already exists
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ 
        error: 'An account with this email already exists',
        code: 'EMAIL_EXISTS'
      });
    }
    
    // Create user
    const user = await createUser({ email, password, name: name.trim() });
    
    // Generate session
    const sessionId = `ui:${uuidv4()}`;
    const token = generateToken(sessionId, user.id, user.email);
    
    // Set httpOnly cookie
    setSessionCookie(res, token);
    
    res.status(201).json({ 
      success: true,
      message: 'Account created successfully',
      user: await getSafeUser(user)
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ 
      error: 'Failed to create account',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password, rememberMe = true } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required',
        code: 'MISSING_FIELDS'
      });
    }
    
    // Verify credentials
    const user = await verifyPassword(email, password);
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Generate session - longer expiry if rememberMe
    const sessionId = `ui:${uuidv4()}`;
    const token = generateToken(sessionId, user.id, user.email, rememberMe);
    
    // Set httpOnly cookie - persistent or session-only based on rememberMe
    setSessionCookie(res, token, rememberMe);
    
    res.json({ 
      success: true,
      message: 'Logged in successfully',
      user: await getSafeUser(user)
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      error: 'Login failed',
      code: 'INTERNAL_ERROR'
    });
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
  const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
  
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    return res.json({ authenticated: false });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Verify user still exists in DB
    const db = require('../db/schema');
    const user = await db.getOne('SELECT id FROM users WHERE id = $1', [decoded.userId]);
    if (!user) {
      res.clearCookie(COOKIE_NAME);
      return res.json({ authenticated: false });
    }
    res.json({ 
      authenticated: true,
      userId: decoded.userId,
      email: decoded.email
    });
  } catch {
    res.json({ authenticated: false });
  }
});

module.exports = router;
