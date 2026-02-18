/**
 * Settings Page Controller
 * 
 * Manages tab navigation, role-based visibility, and hash routing.
 */
(function() {
    'use strict';

    const TABS = ['profile', 'security', 'developer', 'organization', 'admin', 'system'];
    const ROLE_RESTRICTED = {
        admin: ['developer', 'management', 'office_coordinator'],
        system: ['developer']
    };

    let currentTab = null;
    let userRole = null;
    let currentUser = null;
    let initialized = false;

    /**
     * Initialize settings page (idempotent)
     */
    function initSettings() {
        if (initialized) return;
        if (!document.getElementById('section-profile')) return; // DOM not ready
        initialized = true;

        setupTabListeners();
        loadUserAndRoute();
        setupBackButton();
    }

    /**
     * Load user info, check role, then route to initial tab
     */
    async function loadUserAndRoute() {
        try {
            const res = await fetch('/api/users/me', { credentials: 'include' });
            if (!res.ok) {
                return;
            }
            const data = await res.json();
            const u = data.user || data;
            currentUser = u;
            window.currentUser = u;
            userRole = Array.isArray(u.role) ? u.role[0] : (u.role || 'field_tech');
            checkRoleVisibility(userRole);
        } catch (e) {
            console.error('Failed to load user:', e);
            return;
        }

        const tab = 'profile';
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

        currentTab = tabId;

        // Trigger tab-specific initialization
        if (tabId === 'developer' && window.SettingsDeveloper) {
            window.SettingsDeveloper.init();
        }
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

    /**
     * Setup settings back button to return to dashboard
     */
    function setupBackButton() {
        var btn = document.getElementById('settings-back-btn');
        if (btn) {
            btn.addEventListener('click', function() {
                var dashTab = document.querySelector('.tab[data-tab="dashboard"]');
                if (dashTab) dashTab.click();
            });
        }
    }

    // Listen for settings tab activation in SPA
    document.addEventListener('tab:activated', function(e) {
        if (e.detail && e.detail.tab === 'settings') {
            initSettings();
        }
    });

    // Also observe via MutationObserver as fallback
    (function() {
        var settingsContent = document.getElementById('settings-content') || document.querySelector('[data-tab-content="settings"]');
        if (!settingsContent) {
            // Try again after DOM is ready
            var tryObserve = function() {
                settingsContent = document.getElementById('settings-content') || document.querySelector('.tab-content[data-tab="settings"]');
                if (settingsContent) {
                    var obs = new MutationObserver(function() {
                        if (!settingsContent.classList.contains('hidden') && !settingsContent.hidden) {
                            initSettings();
                        }
                    });
                    obs.observe(settingsContent, { attributes: true, attributeFilter: ['class', 'hidden'] });
                }
            };
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', tryObserve);
            } else {
                tryObserve();
            }
        }
    })();

    // Expose API
    window.Settings = {
        init: initSettings,
        switchTab: switchTab,
        checkRoleVisibility: checkRoleVisibility,
        showToast: showToast,
        showConfirmation: showConfirmation
    };
})();
