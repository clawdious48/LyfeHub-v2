const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/permissions');
const auditDb = require('../db/audit');
const { requireScope } = require('../middleware/scopeAuth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/audit — developer only, paginated
router.get('/', requireScope('audit', 'read'), requireRole('developer'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const entries = await auditDb.getAuditLog({
      action: req.query.action || undefined,
      targetType: req.query.target_type || undefined,
      actorId: req.query.actor_id || undefined,
      targetId: req.query.target_id || undefined,
      limit,
      offset,
    });

    res.json({ entries, page, limit });
  } catch (err) {
    console.error('Error fetching audit log:', err);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

module.exports = router;
