const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getAllTags, getTagById, createTag, updateTag, deleteTag, seedDefaultAreas } = require('../db/tags');
const { requireScope } = require('../middleware/scopeAuth');

router.use(authMiddleware);

/**
 * GET /api/tags
 * Query params: ?type=area|resource|entity
 */
router.get('/', requireScope('tasks', 'read'), async (req, res) => {
  try {
    const { type } = req.query;
    let tags = await getAllTags(req.user.id, type || null);

    // Auto-seed default area tags if none exist
    if (type === 'area' && tags.length === 0) {
      await seedDefaultAreas(req.user.id);
      tags = await getAllTags(req.user.id, 'area');
    }

    res.json({ tags });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', requireScope('tasks', 'read'), async (req, res) => {
  try {
    const tag = await getTagById(req.params.id, req.user.id);
    if (!tag) return res.status(404).json({ error: 'Tag not found' });
    res.json({ tag });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireScope('tasks', 'write'), async (req, res) => {
  try {
    const tag = await createTag(req.body, req.user.id);
    res.status(201).json({ tag });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', requireScope('tasks', 'write'), async (req, res) => {
  try {
    const tag = await updateTag(req.params.id, req.body, req.user.id);
    if (!tag) return res.status(404).json({ error: 'Tag not found' });
    res.json({ tag });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireScope('tasks', 'delete'), async (req, res) => {
  try {
    const deleted = await deleteTag(req.params.id, req.user.id);
    if (!deleted) return res.status(404).json({ error: 'Tag not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
