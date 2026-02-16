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

    const hasScope = scopes.some(s => {
      if (s === '*:*') return true;
      if (s === required) return true;
      // Wildcard action: jobs:* matches jobs:read
      if (s === `${resource}:*`) return true;
      // Wildcard resource: *:read matches anything:read
      if (s === `*:${action}`) return true;
      // Parent scope: jobs:read grants jobs.estimates:read
      const parentResource = resource.split('.')[0];
      if (parentResource !== resource && s === `${parentResource}:${action}`) return true;
      if (parentResource !== resource && s === `${parentResource}:*`) return true;
      return false;
    });

    if (!hasScope) {
      return res.status(403).json({ error: 'Insufficient API key scope', required });
    }

    next();
  };
}

module.exports = { requireScope };
