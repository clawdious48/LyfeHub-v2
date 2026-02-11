const express = require('express');
const bcrypt = require('bcrypt');
const { authMiddleware } = require('../middleware/auth');
const {
  findUserById,
  updateUser,
  changePassword,
  getSafeUser,
  verifyPassword
} = require('../db/users');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/users/me
 * Get current user profile
 */
router.get('/me', (req, res) => {
  try {
    // System users (API key) don't have a profile
    if (req.isSystemUser) {
      return res.status(400).json({
        error: 'System users do not have a profile',
        code: 'SYSTEM_USER'
      });
    }
    
    const user = findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    res.json({ user: getSafeUser(user) });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ 
      error: 'Failed to fetch profile',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * PATCH /api/users/me
 * Update current user profile (name, settings)
 */
router.patch('/me', (req, res) => {
  try {
    if (req.isSystemUser) {
      return res.status(400).json({
        error: 'System users do not have a profile',
        code: 'SYSTEM_USER'
      });
    }
    
    const { name, settings } = req.body;
    
    // Validate name if provided
    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 1)) {
      return res.status(400).json({
        error: 'Name cannot be empty',
        code: 'INVALID_NAME'
      });
    }
    
    const user = updateUser(req.user.id, {
      name: name?.trim(),
      settings
    });
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    res.json({ user: getSafeUser(user) });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ 
      error: 'Failed to update profile',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * PUT /api/users/me/password
 * Change current user password
 */
router.put('/me/password', async (req, res) => {
  try {
    if (req.isSystemUser) {
      return res.status(400).json({
        error: 'System users do not have a password',
        code: 'SYSTEM_USER'
      });
    }
    
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password are required',
        code: 'MISSING_FIELDS'
      });
    }
    
    // Validate new password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'New password must be at least 8 characters',
        code: 'WEAK_PASSWORD'
      });
    }
    
    // Verify current password
    const user = await verifyPassword(req.user.email, currentPassword);
    if (!user) {
      return res.status(401).json({
        error: 'Current password is incorrect',
        code: 'INVALID_PASSWORD'
      });
    }
    
    // Change password
    await changePassword(req.user.id, newPassword);
    
    res.json({ 
      success: true,
      message: 'Password changed successfully'
    });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ 
      error: 'Failed to change password',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;
