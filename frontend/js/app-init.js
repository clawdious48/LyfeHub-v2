/* app-init.js — Early app initialization (runs before sidebar/bottom-nav)
 * Fetches org membership and permissions so UI can gate features immediately.
 */
(function () {
  'use strict';

  // Promise that resolves when org + permissions are loaded
  window.__appInitReady = (async function () {
    // 1. Fetch org membership
    try {
      const orgResp = await fetch('/api/apex-orgs/mine', { credentials: 'include' });
      if (orgResp.ok) {
        const orgData = await orgResp.json();
        window.currentOrg = orgData.org || null;
      } else {
        window.currentOrg = null;
      }
    } catch (e) {
      window.currentOrg = null;
    }

    // 2. Fetch permissions for the current user's role
    try {
      const permResp = await fetch('/api/users/me/permissions', { credentials: 'include' });
      if (permResp.ok) {
        const permData = await permResp.json();
        window.currentPermissions = permData.permissions || {};
      } else {
        window.currentPermissions = {};
      }
    } catch (e) {
      window.currentPermissions = {};
    }
  })();

  // Global permission helper
  window.hasPermission = function(resource, action) {
      const perms = window.currentPermissions || {};
      if (perms['*'] && (perms['*'].includes('*') || perms['*'].includes(action))) return true;
      if (!perms[resource]) return false;
      return perms[resource].includes('*') || perms[resource].includes(action);
  };
})();
