/**
 * Settings Page Controller
 * 
 * Manages tab navigation, role-based visibility, and hash routing.
 */
(function() {
    'use strict';

    const TABS = ['profile', 'security', 'developer', 'admin', 'system'];
    const ROLE_RESTRICTED = {
        admin: ['admin', 'management'],
        system: ['developer']
    };

    let currentTab = null;
    let userRole = null;

    /**
     * Initialize settings page
     */
    function initSettings() {
        setupTabListeners();
        loadUserAndRoute();
        window.addEventListener('hashchange', function() {
            const tab = getTabFromHash();
            if (tab) switchTab(tab);
        });
    }

    /**
     * Load user info, check role, then route to initial tab
     */
    async function loadUserAndRoute() {
        try {
            const res = await fetch('/api/auth/me', { credentials: 'include' });
            if (!res.ok) {
                window.location.href = '/login.html';
                return;
            }
            const data = await res.json();
            userRole = (data.user && data.user.role) || data.role || 'viewer';
            checkRoleVisibility(userRole);
        } catch (e) {
            console.error('Failed to load user:', e);
        }

        const tab = getTabFromHash() || 'profile';
        switchTab(tab);
    }

    /**
     * Get tab id from URL hash
     */
    function getTabFromHash() {
        const hash = window.location.hash.replace('#', '');
        return TABS.includes(hash) ? hash : null;
    }

    /**
     * Setup click listeners on sidebar tabs
     */
    function setupTabListeners() {
        document.querySelectorAll('.settings-tab[data-tab]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                switchTab(btn.dataset.tab);
            });
        });
    }

    /**
     * Switch to a tab — show its section, update active state, update hash
     */
    function switchTab(tabId) {
        if (!TABS.includes(tabId)) return;

        // Check if tab is visible (role-gated)
        const tabEl = document.querySelector('.settings-tab[data-tab="' + tabId + '"]');
        if (tabEl && tabEl.style.display === 'none') {
            tabId = 'profile';
        }

        // Update tabs
        document.querySelectorAll('.settings-tab').forEach(function(t) {
            t.classList.toggle('active', t.dataset.tab === tabId);
        });

        // Update sections
        document.querySelectorAll('.settings-section').forEach(function(s) {
            s.classList.toggle('active', s.id === 'section-' + tabId);
        });

        // Update hash without scrolling
        if (window.location.hash !== '#' + tabId) {
            history.replaceState(null, '', '#' + tabId);
        }

        currentTab = tabId;
    }

    /**
     * Show/hide tabs based on user role
     */
    function checkRoleVisibility(role) {
        Object.keys(ROLE_RESTRICTED).forEach(function(tabId) {
            const allowed = ROLE_RESTRICTED[tabId];
            const tabEl = document.querySelector('.settings-tab[data-tab="' + tabId + '"]');
            if (tabEl) {
                tabEl.style.display = allowed.includes(role) ? '' : 'none';
            }
        });
    }

    /**
     * Show a toast notification
     */
    function showToast(message, type) {
        type = type || 'success';
        var existing = document.querySelector('.settings-toast');
        if (existing) existing.remove();

        var toast = document.createElement('div');
        toast.className = 'settings-toast ' + type;
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(function() {
            toast.classList.add('visible');
        });

        setTimeout(function() {
            toast.classList.remove('visible');
            setTimeout(function() { toast.remove(); }, 300);
        }, 3000);
    }

    /**
     * Show confirmation modal
     */
    function showConfirmation(title, message, onConfirm) {
        var modal = document.getElementById('confirmation-modal');
        if (!modal) return;
        modal.querySelector('.modal-title').textContent = title;
        modal.querySelector('.modal-message').textContent = message;
        modal.classList.add('visible');

        var confirmBtn = modal.querySelector('.btn-confirm-danger');
        var cancelBtn = modal.querySelector('.btn-cancel');

        function cleanup() {
            modal.classList.remove('visible');
            confirmBtn.removeEventListener('click', onYes);
            cancelBtn.removeEventListener('click', onNo);
        }
        function onYes() { cleanup(); if (onConfirm) onConfirm(); }
        function onNo() { cleanup(); }

        confirmBtn.addEventListener('click', onYes);
        cancelBtn.addEventListener('click', onNo);
    }

    // Expose API
    window.Settings = {
        init: initSettings,
        switchTab: switchTab,
        checkRoleVisibility: checkRoleVisibility,
        showToast: showToast,
        showConfirmation: showConfirmation
    };
})();
