const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/permissions');
const rolesDb = require('../db/roles');
const auditDb = require('../db/audit');
const { requireScope } = require('../middleware/scopeAuth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/roles/defaults — must be before /:name
router.get('/defaults', requireScope('roles', 'read'), requireRole('management', 'developer'), async (req, res) => {
  try {
    const defaults = await rolesDb.getDefaultPermissions();
    res.json({ defaults });
  } catch (err) {
    console.error('Error fetching role defaults:', err);
    res.status(500).json({ error: 'Failed to fetch role defaults' });
  }
});

// POST /api/roles/revert-all — must be before /:name
router.post('/revert-all', requireScope('roles', 'write'), requireRole('management', 'developer'), async (req, res) => {
  try {
    const result = await rolesDb.revertAllRoles();
    await auditDb.logAction(req.user.id, 'role_update', 'role', null, { action: 'revert_all', reverted: result.reverted });
    res.json({ success: true, reverted: result.reverted });
  } catch (err) {
    console.error('Error reverting all roles:', err);
    res.status(500).json({ error: 'Failed to revert all roles' });
  }
});

// GET /api/roles
router.get('/', requireScope('roles', 'read'), requireRole('management', 'developer'), async (req, res) => {
  try {
    const roles = await rolesDb.getAllRoles();
    res.json({ roles });
  } catch (err) {
    console.error('Error listing roles:', err);
    res.status(500).json({ error: 'Failed to list roles' });
  }
});

// GET /api/roles/:name
router.get('/:name', requireScope('roles', 'read'), requireRole('management', 'developer'), async (req, res) => {
  try {
    const role = await rolesDb.getRoleByName(req.params.name);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    if (typeof role.permissions === 'string') role.permissions = JSON.parse(role.permissions);
    res.json({ role });
  } catch (err) {
    console.error('Error fetching role:', err);
    res.status(500).json({ error: 'Failed to fetch role' });
  }
});

// PATCH /api/roles/:name
router.patch('/:name', requireScope('roles', 'write'), requireRole('management', 'developer'), async (req, res) => {
  try {
    const { permissions } = req.body;
    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ error: 'permissions object is required' });
    }
    const existing = await rolesDb.getRoleByName(req.params.name);
    if (!existing) return res.status(404).json({ error: 'Role not found' });

    await rolesDb.updateRolePermissions(req.params.name, permissions);
    await auditDb.logAction(req.user.id, 'role_update', 'role', req.params.name, {
      old_permissions: typeof existing.permissions === 'string' ? JSON.parse(existing.permissions) : existing.permissions,
      new_permissions: permissions,
    });

    const updated = await rolesDb.getRoleByName(req.params.name);
    if (typeof updated.permissions === 'string') updated.permissions = JSON.parse(updated.permissions);
    res.json({ role: updated });
  } catch (err) {
    console.error('Error updating role:', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// POST /api/roles/:name/revert
router.post('/:name/revert', requireScope('roles', 'write'), requireRole('management', 'developer'), async (req, res) => {
  try {
    const existing = await rolesDb.getRoleByName(req.params.name);
    if (!existing) return res.status(404).json({ error: 'Role not found' });

    await rolesDb.revertRole(req.params.name);
    await auditDb.logAction(req.user.id, 'role_update', 'role', req.params.name, { action: 'revert' });

    const updated = await rolesDb.getRoleByName(req.params.name);
    if (typeof updated.permissions === 'string') updated.permissions = JSON.parse(updated.permissions);
    res.json({ role: updated });
  } catch (err) {
    console.error('Error reverting role:', err);
    res.status(500).json({ error: 'Failed to revert role' });
  }
});

module.exports = router;
