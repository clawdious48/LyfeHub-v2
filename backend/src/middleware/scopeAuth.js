/**
 * Scope validation middleware for API key access control.
 * Session-based auth passes through; API key auth checks scopes.
 */
function requireScope(resource, action) {
  return (req, res, next) => {
    // Session users pass through — role-based permissions handle access
    if (req.authMethod !== 'api_key') return next();

    const scopes = req.apiKeyScopes || [];
    const required = `${resource}:${action}`;

    const hasScope = scopes.some(s =>
      s === '*:*' ||
      s === `${resource}:*` ||
      s === `*:${action}` ||
      s === required
    );

    if (!hasScope) {
      return res.status(403).json({ error: 'Insufficient API key scope', required });
    }

    next();
  };
}

module.exports = { requireScope };
