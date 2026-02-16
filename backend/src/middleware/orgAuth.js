const { getUserOrgRole } = require('../db/apexOrgs');

/**
 * Express middleware — rejects if user is not a member of any organization.
 * On success, sets req.org = { id, role }.
 */
async function requireOrgMember(req, res, next) {
  try {
    const membership = await getUserOrgRole(req.user.id);
    if (!membership) {
      return res.status(403).json({ error: 'Not a member of any organization' });
    }
    req.org = { id: membership.org_id, role: membership.role };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Express middleware factory — rejects unless user's org role is one of the allowed roles.
 * Must be used after requireOrgMember (expects req.org to be set).
 */
function requireOrgRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.org) {
      return res.status(403).json({ error: 'Not a member of any organization' });
    }
    if (!allowedRoles.includes(req.org.role)) {
      return res.status(403).json({ error: 'Insufficient organization permissions' });
    }
    next();
  };
}

module.exports = { requireOrgMember, requireOrgRole };
