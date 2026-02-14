const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const {
  getAllLists,
  getListById,
  createList,
  updateList,
  deleteList
} = require('../db/taskLists');

const router = express.Router();

router.use(authMiddleware);

/**
 * GET /api/task-lists
 * Get all lists for current user
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const lists = await getAllLists(userId);
    res.json({ lists });
  } catch (err) {
    console.error('Error fetching lists:', err);
    res.status(500).json({ error: 'Failed to fetch lists' });
  }
});

/**
 * GET /api/task-lists/:id
 * Get a single list
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const list = await getListById(req.params.id, userId);
    
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }
    
    res.json({ list });
  } catch (err) {
    console.error('Error fetching list:', err);
    res.status(500).json({ error: 'Failed to fetch list' });
  }
});

/**
 * POST /api/task-lists
 * Create a new list
 */
router.post('/', async (req, res) => {
  try {
    console.log('[task-lists POST] body:', req.body);
    console.log('[task-lists POST] user:', req.user);
    const userId = req.user.id;
    const { name, color } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    console.log('[task-lists POST] creating list:', name, 'for user:', userId);
    const list = await createList({ name: name.trim(), color }, userId);
    console.log('[task-lists POST] created:', list);
    res.status(201).json({ list });
  } catch (err) {
    console.error('Error creating list:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: 'Failed to create list' });
  }
});

/**
 * PATCH /api/task-lists/:id
 * Update a list
 */
router.patch('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const list = await updateList(req.params.id, req.body, userId);
    
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }
    
    res.json({ list });
  } catch (err) {
    console.error('Error updating list:', err);
    res.status(500).json({ error: 'Failed to update list' });
  }
});

/**
 * DELETE /api/task-lists/:id
 * Delete a list
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const deleted = await deleteList(req.params.id, userId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'List not found' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting list:', err);
    res.status(500).json({ error: 'Failed to delete list' });
  }
});

module.exports = router;
