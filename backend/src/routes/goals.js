const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getAllGoals, getGoalById, createGoal, updateGoal, deleteGoal } = require('../db/goals');
const { requireScope } = require('../middleware/scopeAuth');

router.use(authMiddleware);

router.get('/', requireScope('tasks', 'read'), async (req, res) => {
  try {
    const goals = await getAllGoals(req.user.id);
    res.json({ goals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', requireScope('tasks', 'read'), async (req, res) => {
  try {
    const goal = await getGoalById(req.params.id, req.user.id);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    res.json({ goal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireScope('tasks', 'write'), async (req, res) => {
  try {
    if (!req.body.name || !req.body.name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const goal = await createGoal(req.body, req.user.id);
    res.status(201).json({ goal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', requireScope('tasks', 'write'), async (req, res) => {
  try {
    const goal = await updateGoal(req.params.id, req.body, req.user.id);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    res.json({ goal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireScope('tasks', 'delete'), async (req, res) => {
  try {
    const deleted = await deleteGoal(req.params.id, req.user.id);
    if (!deleted) return res.status(404).json({ error: 'Goal not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
