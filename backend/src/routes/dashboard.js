const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const db = require('../db/schema');
const basesDb = require('../db/bases');

router.use(authMiddleware);

// ============================================
// DASHBOARD WIDGETS TABLE (auto-create)
// ============================================
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS dashboard_widgets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      widget_type TEXT NOT NULL,
      title TEXT NOT NULL,
      config TEXT DEFAULT '{}',
      position INTEGER DEFAULT 0,
      width INTEGER DEFAULT 1,
      height INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_user ON dashboard_widgets(user_id)');
} catch (e) {
  // Table already exists
}

// Prepared statements
const getWidgets = db.prepare('SELECT * FROM dashboard_widgets WHERE user_id = ? ORDER BY position ASC');
const getWidget = db.prepare('SELECT * FROM dashboard_widgets WHERE id = ? AND user_id = ?');
const insertWidget = db.prepare(`
  INSERT INTO dashboard_widgets (id, user_id, widget_type, title, config, position, width, height)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const updateWidget = db.prepare(`
  UPDATE dashboard_widgets SET title = ?, config = ?, position = ?, width = ?, height = ?, updated_at = datetime('now')
  WHERE id = ? AND user_id = ?
`);
const deleteWidget = db.prepare('DELETE FROM dashboard_widgets WHERE id = ? AND user_id = ?');
const reorderWidgets = db.prepare('UPDATE dashboard_widgets SET position = ? WHERE id = ? AND user_id = ?');

// ============================================
// GET /api/dashboard/summary - Aggregated dashboard data
// ============================================
router.get('/summary', (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Today's tasks (my_day or due today)
    const todayTasks = db.prepare(`
      SELECT id, title, description, due_date, due_time, important, completed, status, priority, list_id, subtasks
      FROM task_items
      WHERE user_id = ? AND (my_day = 1 OR due_date = ?) AND completed = 0
      ORDER BY important DESC, created_at ASC
    `).all(userId, today);

    // Parse subtasks
    todayTasks.forEach(t => {
      try { t.subtasks = JSON.parse(t.subtasks || '[]'); } catch { t.subtasks = []; }
    });

    // Overdue tasks
    const overdueTasks = db.prepare(`
      SELECT id, title, due_date, important, list_id
      FROM task_items
      WHERE user_id = ? AND due_date < ? AND completed = 0 AND due_date IS NOT NULL
      ORDER BY due_date ASC
    `).all(userId, today);

    // Upcoming tasks (next 7 days)
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const upcomingTasks = db.prepare(`
      SELECT id, title, due_date, due_time, important, completed, list_id
      FROM task_items
      WHERE user_id = ? AND due_date > ? AND due_date <= ? AND completed = 0
      ORDER BY due_date ASC, due_time ASC
    `).all(userId, today, weekEnd.toISOString().split('T')[0]);

    // Active projects
    const activeProjects = db.prepare(`
      SELECT id, title, status, priority, updated_at
      FROM tasks
      WHERE user_id = ? AND status IN ('in_progress', 'blocked', 'review')
      ORDER BY priority ASC, updated_at DESC
    `).all(userId);

    // Project stats
    const projectStats = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM tasks WHERE user_id = ?
      GROUP BY status
    `).all(userId);

    // Task completion stats
    const completedToday = db.prepare(`
      SELECT COUNT(*) as count FROM task_items
      WHERE user_id = ? AND completed = 1 AND completed_at >= ?
    `).get(userId, today + 'T00:00:00');

    const completedThisWeek = (() => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      return db.prepare(`
        SELECT COUNT(*) as count FROM task_items
        WHERE user_id = ? AND completed = 1 AND completed_at >= ?
      `).get(userId, weekStart.toISOString().split('T')[0] + 'T00:00:00');
    })();

    const totalPending = db.prepare(`
      SELECT COUNT(*) as count FROM task_items
      WHERE user_id = ? AND completed = 0
    `).get(userId);

    res.json({
      today: {
        tasks: todayTasks,
        overdue: overdueTasks,
        upcoming: upcomingTasks
      },
      projects: {
        active: activeProjects,
        stats: projectStats
      },
      stats: {
        tasks_completed_today: completedToday?.count || 0,
        tasks_completed_this_week: completedThisWeek?.count || 0,
        total_pending: totalPending?.count || 0
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

// ============================================
// WIDGETS CRUD
// ============================================

// GET /api/dashboard/widgets
router.get('/widgets', (req, res) => {
  try {
    const widgets = getWidgets.all(req.user.id);
    res.json(widgets.map(w => ({ ...w, config: JSON.parse(w.config || '{}') })));
  } catch (error) {
    console.error('Error fetching widgets:', error);
    res.status(500).json({ error: 'Failed to fetch widgets' });
  }
});

// POST /api/dashboard/widgets
router.post('/widgets', (req, res) => {
  try {
    const { widget_type, title, config = {}, position, width = 1, height = 1 } = req.body;
    if (!widget_type || !title) {
      return res.status(400).json({ error: 'widget_type and title are required' });
    }

    const existing = getWidgets.all(req.user.id);
    const maxPos = existing.reduce((max, w) => Math.max(max, w.position), -1);

    const id = uuidv4();
    insertWidget.run(id, req.user.id, widget_type, title, JSON.stringify(config), position ?? maxPos + 1, width, height);

    const widget = getWidget.get(id, req.user.id);
    res.status(201).json({ ...widget, config: JSON.parse(widget.config || '{}') });
  } catch (error) {
    console.error('Error creating widget:', error);
    res.status(500).json({ error: 'Failed to create widget' });
  }
});

// PUT /api/dashboard/widgets/:id
router.put('/widgets/:id', (req, res) => {
  try {
    const existing = getWidget.get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Widget not found' });

    const { title, config, position, width, height } = req.body;
    const existingConfig = JSON.parse(existing.config || '{}');

    updateWidget.run(
      title ?? existing.title,
      JSON.stringify(config ?? existingConfig),
      position ?? existing.position,
      width ?? existing.width,
      height ?? existing.height,
      req.params.id,
      req.user.id
    );

    const widget = getWidget.get(req.params.id, req.user.id);
    res.json({ ...widget, config: JSON.parse(widget.config || '{}') });
  } catch (error) {
    console.error('Error updating widget:', error);
    res.status(500).json({ error: 'Failed to update widget' });
  }
});

// DELETE /api/dashboard/widgets/:id
router.delete('/widgets/:id', (req, res) => {
  try {
    const existing = getWidget.get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Widget not found' });

    deleteWidget.run(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting widget:', error);
    res.status(500).json({ error: 'Failed to delete widget' });
  }
});

// POST /api/dashboard/widgets/reorder
router.post('/widgets/reorder', (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array' });

    const reorder = db.transaction(() => {
      for (const item of order) {
        reorderWidgets.run(item.position, item.id, req.user.id);
      }
    });
    reorder();

    const widgets = getWidgets.all(req.user.id);
    res.json(widgets.map(w => ({ ...w, config: JSON.parse(w.config || '{}') })));
  } catch (error) {
    console.error('Error reordering widgets:', error);
    res.status(500).json({ error: 'Failed to reorder widgets' });
  }
});

module.exports = router;
