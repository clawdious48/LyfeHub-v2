const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const tasksDb = require('../db/tasks');
const notesDb = require('../db/notes');
const peopleDb = require('../db/people');
const { authMiddleware } = require('../middleware/auth');
const { requireScope } = require('../middleware/scopeAuth');

// Apply auth middleware to all inbox routes
router.use(authMiddleware);

/**
 * Compute human-readable age string from a date
 */
function formatAge(createdAt) {
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const diffMs = now - created;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

/**
 * GET /api/inbox
 * Returns unified inbox items across tasks, notes, and people.
 * Query params: ?limit=10
 */
router.get('/', requireScope('tasks', 'read'), async (req, res) => {
  try {
    const userId = req.user.id;

    const limit = parseInt(req.query.limit) || 10;

    // Query all three sources in parallel
    const [tasks, notes, people] = await Promise.all([
      // Tasks: smart_list = 'inbox' and not completed
      db.getAll(
        `SELECT id, title, 'task' as type, created_at FROM tasks
         WHERE user_id = $1 AND smart_list = 'inbox' AND completed = 0
         ORDER BY created_at ASC`,
        [userId]
      ),

      // Notes: no type, no project, no tags
      db.getAll(
        `SELECT id, name as title, 'note' as type, created_at FROM notes
         WHERE user_id = $1
           AND (type = '' OR type IS NULL)
           AND (project_id IS NULL OR project_id = '')
           AND (tags = '[]' OR tags IS NULL OR tags = '')
         ORDER BY created_at ASC`,
        [userId]
      ),

      // People: only name, no email/phone/company/tags
      db.getAll(
        `SELECT id, name as title, 'person' as type, created_at FROM people
         WHERE user_id = $1
           AND (email = '' OR email IS NULL)
           AND (phone_mobile = '' OR phone_mobile IS NULL)
           AND (company = '' OR company IS NULL)
           AND (tags = '[]' OR tags IS NULL OR tags = '')
         ORDER BY created_at ASC`,
        [userId]
      )
    ]);

    // Merge and sort by created_at ASC (oldest first — FIFO)
    const allItems = [...tasks, ...notes, ...people]
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const totalCount = allItems.length;
    const items = allItems.slice(0, limit).map(item => ({
      id: item.id,
      type: item.type,
      title: item.title,
      created_at: item.created_at,
      age: formatAge(item.created_at)
    }));

    res.json({
      items,
      count: totalCount,
      limit
    });
  } catch (err) {
    console.error('Inbox API error:', err);
    res.status(500).json({ error: 'Failed to fetch inbox items' });
  }
});

/**
 * GET /api/inbox/count
 * Quick count endpoint for badge updates without full data fetch
 */
router.get('/count', requireScope('tasks', 'read'), async (req, res) => {
  try {
    const userId = req.user.id;

    const [taskCount, noteCount, personCount] = await Promise.all([
      db.getOne(
        `SELECT COUNT(*) as cnt FROM tasks WHERE user_id = $1 AND smart_list = 'inbox' AND completed = 0`,
        [userId]
      ),
      db.getOne(
        `SELECT COUNT(*) as cnt FROM notes WHERE user_id = $1
           AND (type = '' OR type IS NULL)
           AND (project_id IS NULL OR project_id = '')
           AND (tags = '[]' OR tags IS NULL OR tags = '')`,
        [userId]
      ),
      db.getOne(
        `SELECT COUNT(*) as cnt FROM people WHERE user_id = $1
           AND (email = '' OR email IS NULL)
           AND (phone_mobile = '' OR phone_mobile IS NULL)
           AND (company = '' OR company IS NULL)
           AND (tags = '[]' OR tags IS NULL OR tags = '')`,
        [userId]
      )
    ]);

    const total = (parseInt(taskCount?.cnt) || 0)
                + (parseInt(noteCount?.cnt) || 0)
                + (parseInt(personCount?.cnt) || 0);

    res.json({
      count: total,
      tasks: parseInt(taskCount?.cnt) || 0,
      notes: parseInt(noteCount?.cnt) || 0,
      people: parseInt(personCount?.cnt) || 0
    });
  } catch (err) {
    console.error('Inbox count error:', err);
    res.status(500).json({ error: 'Failed to fetch inbox count' });
  }
});

/**
 * POST /api/inbox/:id/archive
 * Archive an inbox item (moves it out of inbox without deleting).
 * For tasks: sets smart_list to 'someday'
 * For notes: sets type to 'Reference'
 * For people: sets tags to '["archived"]'
 */
router.post('/:id/archive', requireScope('tasks', 'write'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { type } = req.body; // 'task', 'note', or 'person'

    if (!type) return res.status(400).json({ error: 'type is required' });

    let result;
    if (type === 'task') {
      result = await db.run(
        `UPDATE tasks SET smart_list = 'organized', updated_at = datetime('now') WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
    } else if (type === 'note') {
      result = await db.run(
        `UPDATE notes SET type = 'Reference', updated_at = datetime('now') WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
    } else if (type === 'person') {
      result = await db.run(
        `UPDATE people SET tags = '["archived"]', updated_at = datetime('now') WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }

    res.json({ success: true, archived: true });
  } catch (err) {
    console.error('Inbox archive error:', err);
    res.status(500).json({ error: 'Failed to archive item' });
  }
});

/**
 * POST /api/inbox/capture
 * Quick-capture a new item directly into the inbox.
 * Body: { type: 'note'|'task'|'contact', title: string, due_date?: string }
 */
router.post('/capture', requireScope('tasks', 'write'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, title, due_date } = req.body;

    if (!type || !title || !title.trim()) {
      return res.status(400).json({ error: 'type and title are required' });
    }

    const trimmedTitle = title.trim();
    let id;

    if (type === 'task') {
      const item = await tasksDb.createTask({
        title: trimmedTitle,
        due_date: due_date || null
      }, userId);
      id = item.id;
    } else if (type === 'note') {
      const item = await notesDb.createNote({
        name: trimmedTitle
      }, userId);
      id = item.id;
    } else if (type === 'contact') {
      const item = await peopleDb.createPerson({
        name: trimmedTitle
      }, userId);
      id = item.id;
    } else {
      return res.status(400).json({ error: 'Invalid type. Use: note, task, or contact' });
    }

    res.status(201).json({ success: true, id, type });
  } catch (err) {
    console.error('Inbox capture error:', err);
    res.status(500).json({ error: 'Failed to capture item' });
  }
});

module.exports = router;
