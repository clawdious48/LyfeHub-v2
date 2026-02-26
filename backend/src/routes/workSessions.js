const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getAllWorkSessions, getWorkSessionById, createWorkSession, startSession, endSession, updateWorkSession, deleteWorkSession } = require('../db/workSessions');
const { requireScope } = require('../middleware/scopeAuth');

router.use(authMiddleware);

router.get('/', requireScope('tasks', 'read'), async (req, res) => {
  try {
    const { task_id } = req.query;
    const sessions = await getAllWorkSessions(req.user.id, task_id || null);
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', requireScope('tasks', 'read'), async (req, res) => {
  try {
    const session = await getWorkSessionById(req.params.id, req.user.id);
    if (!session) return res.status(404).json({ error: 'Work session not found' });
    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireScope('tasks', 'write'), async (req, res) => {
  try {
    const session = await createWorkSession(req.body, req.user.id);
    res.status(201).json({ session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/start', requireScope('tasks', 'write'), async (req, res) => {
  try {
    const session = await startSession(req.body, req.user.id);
    res.status(201).json({ session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/end', requireScope('tasks', 'write'), async (req, res) => {
  try {
    const session = await endSession(req.params.id, req.user.id);
    if (!session) return res.status(404).json({ error: 'Work session not found' });
    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', requireScope('tasks', 'write'), async (req, res) => {
  try {
    const session = await updateWorkSession(req.params.id, req.body, req.user.id);
    if (!session) return res.status(404).json({ error: 'Work session not found' });
    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireScope('tasks', 'delete'), async (req, res) => {
  try {
    const deleted = await deleteWorkSession(req.params.id, req.user.id);
    if (!deleted) return res.status(404).json({ error: 'Work session not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
