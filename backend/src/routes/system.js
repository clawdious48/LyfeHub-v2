const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/permissions');
const db = require('../db/pool');

const router = express.Router();
router.use(authMiddleware);

// GET /api/system/stats — developer only
router.get('/stats', requireRole('developer'), async (req, res) => {
  try {
    const stats = await db.getOne(`
      SELECT 
        (SELECT count(*) FROM users) as user_count,
        (SELECT count(*) FROM tasks) as task_count,
        (SELECT count(*) FROM notes) as note_count,
        (SELECT count(*) FROM people) as people_count
    `);

    // Try to get database size
    let dbSize = null;
    try {
      const sizeRow = await db.getOne(`SELECT pg_size_pretty(pg_database_size(current_database())) as size`);
      dbSize = sizeRow ? sizeRow.size : null;
    } catch (e) {
      // Permission may not be available
    }

    res.json({ stats: { ...stats, db_size: dbSize } });
  } catch (err) {
    console.error('Error fetching system stats:', err);
    res.status(500).json({ error: 'Failed to fetch system stats' });
  }
});

// GET /api/system/health — developer only
router.get('/health', requireRole('developer'), async (req, res) => {
  const health = {
    api: { status: 'ok', label: 'API Status' },
    database: { status: 'unknown', label: 'Database' },
    uptime: process.uptime()
  };

  try {
    await db.getOne('SELECT 1 as ok');
    health.database.status = 'ok';
  } catch (e) {
    health.database.status = 'error';
    health.database.error = e.message;
  }

  res.json(health);
});

module.exports = router;
