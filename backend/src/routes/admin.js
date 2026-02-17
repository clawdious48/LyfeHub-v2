const express = require('express');
const router = express.Router();
const db = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/permissions');

router.use(authMiddleware);

// GET /api/admin/drying-event-logs — all jobs with event logs
router.get('/drying-event-logs', requireRole('developer', 'management'), async (req, res) => {
    try {
        const rows = await db.getAll(`
            SELECT 
                del.job_id,
                aj.client_name,
                COUNT(DISTINCT del.session_id) as session_count,
                MAX(del.created_at) as latest_timestamp
            FROM drying_event_logs del
            JOIN apex_jobs aj ON aj.id = del.job_id
            GROUP BY del.job_id, aj.client_name
            ORDER BY MAX(del.created_at) DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error('Error getting admin event logs:', err);
        res.status(500).json({ error: 'Failed to get event logs' });
    }
});

module.exports = router;
