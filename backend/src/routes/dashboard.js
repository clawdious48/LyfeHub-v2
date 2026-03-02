const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.use(authMiddleware);

/**
 * Default layout for new users — matches the original hardcoded dashboard
 */
const DEFAULT_LAYOUT = {
  widgets: [
    { id: 'default-my-day',   type: 'my-day',      x: 0,  y: 0,  w: 12, h: 8 },
    { id: 'default-calendar', type: 'week-cal',     x: 12, y: 0,  w: 12, h: 6 },
    { id: 'default-notes',    type: 'quick-notes',  x: 0,  y: 8,  w: 12, h: 6 },
    { id: 'default-inbox',    type: 'inbox',         x: 12, y: 6,  w: 12, h: 8 },
    { id: 'default-areas',    type: 'areas',         x: 0,  y: 14, w: 24, h: 6 }
  ]
};

/**
 * Default layout for the Apex Restoration dashboard
 */
const DEFAULT_APEX_LAYOUT = {
  widgets: [
    { id: 'default-apex-nav', type: 'navigation', x: 0, y: 0, w: 4, h: 12 },
  ]
};

/**
 * GET /api/dashboard/layout
 * Returns the user's saved dashboard layout, or the default.
 * Accepts ?dashboard=personal|apex query param (default: 'personal').
 */
router.get('/layout', async (req, res) => {
  try {
    const userId = req.user.id;
    const dashboardId = req.query.dashboard || 'personal';
    const row = await db.getOne(
      'SELECT layout_json FROM dashboard_layouts WHERE user_id = $1 AND dashboard_id = $2',
      [userId, dashboardId]
    );

    if (row && row.layout_json) {
      // layout_json is JSONB so Postgres returns it as an object already
      const layout = typeof row.layout_json === 'string'
        ? JSON.parse(row.layout_json)
        : row.layout_json;
      res.json({ layout, isDefault: false });
    } else {
      const defaultLayout = dashboardId === 'apex' ? DEFAULT_APEX_LAYOUT : DEFAULT_LAYOUT;
      res.json({ layout: defaultLayout, isDefault: true });
    }
  } catch (err) {
    console.error('Dashboard layout GET error:', err);
    res.status(500).json({ error: 'Failed to load layout' });
  }
});

/**
 * PUT /api/dashboard/layout
 * Saves the user's dashboard layout.
 * Accepts ?dashboard=personal|apex query param (default: 'personal').
 */
router.put('/layout', async (req, res) => {
  try {
    const userId = req.user.id;
    const dashboardId = req.query.dashboard || 'personal';
    const { layout } = req.body;

    if (!layout || !layout.widgets || !Array.isArray(layout.widgets)) {
      return res.status(400).json({ error: 'Invalid layout: must have widgets array' });
    }

    // Validate each widget has required fields
    for (const w of layout.widgets) {
      if (!w.id || !w.type || w.x === undefined || w.y === undefined || !w.w || !w.h) {
        return res.status(400).json({ error: 'Invalid widget: requires id, type, x, y, w, h' });
      }
    }

    const now = new Date().toISOString();
    const id = uuidv4();

    // Upsert: insert or update on conflict (compound unique on user_id + dashboard_id)
    await db.run(`
      INSERT INTO dashboard_layouts (id, user_id, dashboard_id, layout_json, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, dashboard_id) DO UPDATE SET
        layout_json = $4,
        updated_at = $6
    `, [id, userId, dashboardId, JSON.stringify(layout), now, now]);

    res.json({ success: true });
  } catch (err) {
    console.error('Dashboard layout PUT error:', err);
    res.status(500).json({ error: 'Failed to save layout' });
  }
});

module.exports = router;
