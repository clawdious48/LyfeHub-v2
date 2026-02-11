const express = require('express');
const bcrypt = require('bcrypt');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/permissions');
const {
  findUserById,
  findUserByEmail,
  updateUser,
  changePassword,
  getSafeUser,
  verifyPassword,
  getAllUsers,
  createUserSync,
  updateUserRole,
  resetUserPassword,
  deleteUser,
  VALID_ROLES
} = require('../db/users');

const { getAssignmentCounts } = require('../db/apexJobs');

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

/**
 * GET /api/users/team-assignments
 * Returns all employees with per-role active job assignment counts
 */
router.get('/team-assignments', requireRole('management', 'office_coordinator'), (req, res) => {
  try {
    const users = getAllUsers();
    const counts = getAssignmentCounts();

    const result = users.map(u => {
      const key = (u.name || '').toLowerCase().trim();
      const assignments = counts[key] || {
        mitigation_pm: 0, reconstruction_pm: 0, estimator: 0,
        project_coordinator: 0, mitigation_techs: 0, total: 0
      };
      return { id: u.id, name: u.name, role: u.role, assignments };
    });

    res.json(result);
  } catch (err) {
    console.error('Error fetching team assignments:', err);
    res.status(500).json({ error: 'Failed to fetch team assignments', code: 'INTERNAL_ERROR' });
  }
});

// ============================================
// EMPLOYEE MANAGEMENT (management role only)
// ============================================

/**
 * GET /api/users/employees
 * List all users
 */
router.get('/employees', requireRole('management'), (req, res) => {
  try {
    const users = getAllUsers();
    res.json(users);
  } catch (err) {
    console.error('Error listing employees:', err);
    res.status(500).json({ error: 'Failed to list employees', code: 'INTERNAL_ERROR' });
  }
});

/**
 * POST /api/users/employees
 * Create a new employee account
 */
router.post('/employees', requireRole('management'), (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required', code: 'MISSING_FIELDS' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters', code: 'WEAK_PASSWORD' });
    }

    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`, code: 'INVALID_ROLE' });
    }

    const existing = findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists', code: 'EMAIL_EXISTS' });
    }

    const user = createUserSync({ name, email, password, role: role || 'field_tech' });
    res.status(201).json(user);
  } catch (err) {
    console.error('Error creating employee:', err);
    res.status(500).json({ error: 'Failed to create employee', code: 'INTERNAL_ERROR' });
  }
});

/**
 * PATCH /api/users/employees/:id
 * Update employee role or reset password
 */
router.patch('/employees/:id', requireRole('management'), (req, res) => {
  try {
    const { role, password } = req.body;
    const targetUser = findUserById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    if (role) {
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`, code: 'INVALID_ROLE' });
      }
      updateUserRole(req.params.id, role);
    }

    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters', code: 'WEAK_PASSWORD' });
      }
      resetUserPassword(req.params.id, password);
    }

    const updated = findUserById(req.params.id);
    res.json({ id: updated.id, name: updated.name, email: updated.email, role: updated.role, created_at: updated.created_at });
  } catch (err) {
    console.error('Error updating employee:', err);
    res.status(500).json({ error: 'Failed to update employee', code: 'INTERNAL_ERROR' });
  }
});

/**
 * DELETE /api/users/employees/:id
 * Delete an employee account (prevent self-deletion)
 */
router.delete('/employees/:id', requireRole('management'), (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account', code: 'SELF_DELETE' });
    }

    const targetUser = findUserById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    deleteUser(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting employee:', err);
    res.status(500).json({ error: 'Failed to delete employee', code: 'INTERNAL_ERROR' });
  }
});

/**
 * POST /api/users/employees/bulk-delete
 * Delete multiple employee accounts at once
 */
router.post('/employees/bulk-delete', requireRole('management'), (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required', code: 'MISSING_IDS' });
    }

    const results = { deleted: [], skipped: [] };
    for (const id of ids) {
      if (id === req.user.id) {
        results.skipped.push({ id, reason: 'Cannot delete your own account' });
        continue;
      }
      const user = findUserById(id);
      if (!user) {
        results.skipped.push({ id, reason: 'User not found' });
        continue;
      }
      deleteUser(id);
      results.deleted.push(id);
    }

    res.json(results);
  } catch (err) {
    console.error('Error bulk deleting employees:', err);
    res.status(500).json({ error: 'Failed to delete employees', code: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
