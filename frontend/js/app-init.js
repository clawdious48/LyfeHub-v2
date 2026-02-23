/* app-init.js — Early app initialization (runs before sidebar/bottom-nav)
 * Fetches org membership and permissions so UI can gate features immediately.
 * Also provides the global switchTab() function for unified nav.
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

  // ─── Unified Tab Switching ───
  function switchTab(tabName) {
      // Update nav links (new top-nav <a> elements)
      document.querySelectorAll('.nav-link[data-tab]').forEach(link => {
          link.classList.toggle('active', link.dataset.tab === tabName);
      });

      // Update tab content
      document.querySelectorAll('.tab-content').forEach(content => {
          content.classList.toggle('active', content.dataset.tab === tabName);
      });

      // Lazy-init modules on first visit
      if (tabName === 'tasks' && window.taskModal && !window._tasksLoaded) {
          window._tasksLoaded = true;
          taskModal.loadTasks();
          taskModal.loadCounts();
          if (taskModal.loadLists) taskModal.loadLists();
      }
      if (tabName === 'calendar' && window.calendar && !window._calendarLoaded) {
          window._calendarLoaded = true;
          calendar.load();
      }
      if (tabName === 'apex' && window.apexJobs && !window._apexLoaded) {
          window._apexLoaded = true;
          if (apexJobs.loadJobs) apexJobs.loadJobs();
      }

      // Apex FAB visibility
      document.body.classList.toggle('apex-tab-active', tabName === 'apex');

      // Dispatch events
      document.dispatchEvent(new CustomEvent('tab:activated', { detail: { tab: tabName } }));
  }
  window.switchTab = switchTab;

  // Bind nav link clicks
  document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('.nav-link[data-tab]').forEach(link => {
          link.addEventListener('click', (e) => {
              e.preventDefault();
              switchTab(link.dataset.tab);
          });
      });
  });
})();
