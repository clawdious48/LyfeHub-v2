const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getAllMilestones, getMilestoneById, createMilestone, updateMilestone, deleteMilestone } = require('../db/milestones');
const { requireScope } = require('../middleware/scopeAuth');

router.use(authMiddleware);

router.get('/', requireScope('tasks', 'read'), async (req, res) => {
  try {
    const { goal_id } = req.query;
    const milestones = await getAllMilestones(req.user.id, goal_id || null);
    res.json({ milestones });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', requireScope('tasks', 'read'), async (req, res) => {
  try {
    const milestone = await getMilestoneById(req.params.id, req.user.id);
    if (!milestone) return res.status(404).json({ error: 'Milestone not found' });
    res.json({ milestone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireScope('tasks', 'write'), async (req, res) => {
  try {
    if (!req.body.name || !req.body.name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const milestone = await createMilestone(req.body, req.user.id);
    res.status(201).json({ milestone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', requireScope('tasks', 'write'), async (req, res) => {
  try {
    const milestone = await updateMilestone(req.params.id, req.body, req.user.id);
    if (!milestone) return res.status(404).json({ error: 'Milestone not found' });
    res.json({ milestone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireScope('tasks', 'delete'), async (req, res) => {
  try {
    const deleted = await deleteMilestone(req.params.id, req.user.id);
    if (!deleted) return res.status(404).json({ error: 'Milestone not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
