const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const apiKeysDb = require('../db/apiKeys');

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
    const { name, expiresAt } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Key name is required' });
    }
    if (expiresAt) {
      const expDate = new Date(expiresAt);
      if (isNaN(expDate.getTime())) return res.status(400).json({ error: 'Invalid expiration date' });
      if (expDate < new Date()) return res.status(400).json({ error: 'Expiration date must be in the future' });
    }
    const key = await apiKeysDb.createApiKey(req.user.id, name.trim(), expiresAt || null);
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
    res.json({ message: 'API key revoked' });
  } catch (err) {
    console.error('Error deleting API key:', err);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

module.exports = router;
