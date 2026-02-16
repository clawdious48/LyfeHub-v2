const db = require('./pool');

async function logAction(actorId, action, targetType, targetId, details) {
  return db.run(
    `INSERT INTO audit_log (id, actor_id, action, target_type, target_id, details)
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5)`,
    [actorId, action, targetType || null, targetId || null, details ? JSON.stringify(details) : null]
  );
}

async function getAuditLog(options = {}) {
  const { actorId, action, targetType, targetId, limit = 50, offset = 0 } = options;
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (actorId) {
    conditions.push(`actor_id = $${paramIndex++}`);
    params.push(actorId);
  }
  if (action) {
    conditions.push(`action = $${paramIndex++}`);
    params.push(action);
  }
  if (targetType) {
    conditions.push(`target_type = $${paramIndex++}`);
    params.push(targetType);
  }
  if (targetId) {
    conditions.push(`target_id = $${paramIndex++}`);
    params.push(targetId);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT * FROM audit_log ${where} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
  params.push(limit, offset);

  return db.getAll(sql, params);
}

module.exports = {
  logAction,
  getAuditLog,
};
