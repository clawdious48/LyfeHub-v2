const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/permissions');
const apiKeysDb = require('../db/apiKeys');
const auditDb = require('../db/audit');
const rolesDb = require('../db/roles');

const { SCOPE_GROUPS, ALL_SCOPES } = require('../config/scopes');

const router = express.Router();
router.use(authMiddleware);

router.use((req, res, next) => {
  if (req.authMethod === 'api_key') {
    return res.status(403).json({ error: 'API key management requires browser session', code: 'SESSION_REQUIRED' });
  }
  if (!req.user || !req.user.id) {
    return res.status(403).json({ error: 'Authentication required' });
  }
  next();
});

// GET /api/api-keys/scopes — available scopes filtered by caller's role
router.get('/scopes', async (req, res) => {
  try {
    // Get user's role permissions to filter available scopes
    const userRoles = req.user?.roles || req.user?.role || [];
    const rolesArr = Array.isArray(userRoles) ? userRoles : [userRoles];

    // Developer/management get all scopes
    if (rolesArr.includes('developer') || rolesArr.includes('management')) {
      return res.json({ scopes: ALL_SCOPES, groups: SCOPE_GROUPS });
    }

    // For other roles, filter based on role permissions
    const allowedScopes = [];
    for (const roleName of rolesArr) {
      const role = await rolesDb.getRoleByName(roleName);
      if (!role) continue;
      const perms = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : (role.permissions || {});
      for (const scope of ALL_SCOPES) {
        const [resource] = scope.split(':');
        if (perms[resource] && !allowedScopes.includes(scope)) {
          allowedScopes.push(scope);
        }
      }
    }

    res.json({ scopes: allowedScopes });
  } catch (err) {
    console.error('Error fetching scopes:', err);
    res.status(500).json({ error: 'Failed to fetch scopes' });
  }
});

router.get('/', async (req, res) => {
  try {
    const keys = await apiKeysDb.listApiKeys(req.user.id);
    res.json({ keys, role: req.user.role });
  } catch (err) {
    console.error('Error listing API keys:', err);
    res.status(500).json({ error: 'Failed to list API keys' });
  }
});

// Get full key - management only
router.get('/:id/full', async (req, res) => {
  try {
    if (req.user.role !== 'management') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const fullKey = await apiKeysDb.getFullKey(req.params.id, req.user.id);
    if (!fullKey) {
      return res.status(404).json({ error: 'Key not found or not retrievable' });
    }
    res.json({ key: fullKey });
  } catch (err) {
    console.error('Error retrieving full key:', err);
    res.status(500).json({ error: 'Failed to retrieve key' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, expiresAt, scopes } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Key name is required' });
    }
    if (expiresAt) {
      const expDate = new Date(expiresAt);
      if (isNaN(expDate.getTime())) return res.status(400).json({ error: 'Invalid expiration date' });
      if (expDate < new Date()) return res.status(400).json({ error: 'Expiration date must be in the future' });
    }
    // Validate scopes
    const validatedScopes = [];
    if (scopes && Array.isArray(scopes)) {
      for (const s of scopes) {
        if (!ALL_SCOPES.includes(s) && s !== '*:*') {
          return res.status(400).json({ error: `Invalid scope: ${s}` });
        }
        validatedScopes.push(s);
      }
    }
    const key = await apiKeysDb.createApiKey(req.user.id, name.trim(), expiresAt || null, validatedScopes);
    await auditDb.logAction(req.user.id, 'api_key_create', 'api_key', key.id, { name: name.trim(), scopes: validatedScopes });
    res.status(201).json({ message: 'API key created. Copy it now - it won\'t be shown again!', key });
  } catch (err) {
    console.error('Error creating API key:', err);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { name, expiresAt } = req.body;
    if (expiresAt && isNaN(new Date(expiresAt).getTime())) {
      return res.status(400).json({ error: 'Invalid expiration date' });
    }
    const updated = await apiKeysDb.updateApiKey(req.params.id, req.user.id, { name: name?.trim(), expiresAt });
    if (!updated) return res.status(404).json({ error: 'API key not found' });
    res.json({ message: 'API key updated' });
  } catch (err) {
    console.error('Error updating API key:', err);
    res.status(500).json({ error: 'Failed to update API key' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await apiKeysDb.deleteApiKey(req.params.id, req.user.id);
    if (!deleted) return res.status(404).json({ error: 'API key not found' });
    await auditDb.logAction(req.user.id, 'api_key_revoke', 'api_key', req.params.id, {});
    res.json({ message: 'API key revoked' });
  } catch (err) {
    console.error('Error deleting API key:', err);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

module.exports = router;
