const db = require('../db/schema');

/**
 * Express middleware factory — rejects requests unless user has one of the allowed roles.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const userRoles = req.user?.roles || req.user?.role || [];
    const rolesArr = Array.isArray(userRoles) ? userRoles : [userRoles];
    if (!rolesArr.some(r => allowedRoles.includes(r))) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

/**
 * Returns true if the user may edit the given entry:
 *  - management role can always edit
 *  - otherwise, author_id must match and entry must be < 5 minutes old
 */
function canEditEntry(req, entry) {
  const roles = req.user?.roles || req.user?.role || [];
  const rolesArr = Array.isArray(roles) ? roles : [roles];
  if (rolesArr.includes('management') || rolesArr.includes('office_coordinator')) return true;
  if (entry.author_id === req.user?.id) {
    const created = new Date(entry.created_at + 'Z');
    const now = new Date();
    const fiveMinutes = 5 * 60 * 1000;
    return (now - created) < fiveMinutes;
  }
  return false;
}

const checkPhaseAssignment = db.prepare(
  'SELECT 1 FROM phase_assignments WHERE phase_id = ? AND user_id = ?'
);

/**
 * Returns true if the user may access the given phase:
 *  - management and office_coordinator bypass
 *  - otherwise checks phase_assignments table
 */
function requirePhaseAccess(req, phaseId) {
  const roles2 = req.user?.roles || req.user?.role || [];
  const rolesArr2 = Array.isArray(roles2) ? roles2 : [roles2];
  if (rolesArr2.includes('management') || rolesArr2.includes('office_coordinator')) return true;
  return !!checkPhaseAssignment.get(phaseId, req.user?.id);
}

module.exports = { requireRole, canEditEntry, requirePhaseAccess };
