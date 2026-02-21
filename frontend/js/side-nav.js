/**
 * Side Navigation — iPad Landscape
 * Vertical icon nav on the left edge. Mirrors bottom-nav items
 * but calls functions directly (no daisy-chaining).
 */
(function() {
    'use strict';

    var NAV_ITEMS = [
        {
            id: 'dashboard',
            label: 'Home',
            icon: '<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'
        },
        {
            id: 'capture',
            label: '',
            icon: '<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
        },
        {
            id: 'tasks',
            label: 'Tasks',
            icon: '<svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'
        },
        {
            id: 'calendar',
            label: 'Calendar',
            icon: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
        },
        {
            id: 'people',
            label: 'People',
            icon: '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
        },
        {
            id: 'bases',
            label: 'Bases',
            icon: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>'
        },
        {
            id: 'apex',
            label: 'Apex',
            icon: '<svg viewBox="0 0 24 24"><path d="M2 20h20"/><path d="M5 20V8l7-5 7 5v12"/><path d="M9 20v-6h6v6"/><path d="M9 12h6"/></svg>',
            roleRequired: true
        }
    ];

    function createSideNav() {
        var nav = document.createElement('nav');
        nav.className = 'side-nav';
        nav.id = 'side-nav';
        nav.setAttribute('role', 'navigation');
        nav.setAttribute('aria-label', 'Main navigation');

        var visibleItems = NAV_ITEMS.filter(function(item) {
            if (item.roleRequired && !window.currentOrg) return false;
            return true;
        });

        visibleItems.forEach(function(item) {
            var button = document.createElement('button');
            button.className = 'side-nav-item';
            if (item.id === 'capture') button.className += ' side-nav-capture';
            button.setAttribute('data-nav', item.id);
            button.setAttribute('aria-label', item.label || 'Quick capture');

            if (item.id === 'capture') {
                button.innerHTML = item.icon;
            } else {
                button.innerHTML = item.icon + '<span>' + item.label + '</span>';
            }

            button.addEventListener('click', function() {
                handleClick(item.id);
            });

            nav.appendChild(button);
        });

        document.body.appendChild(nav);
        updateActiveState();
    }

    function handleClick(tabId) {
        if (tabId === 'capture') {
            // Open quick task modal (same as bottom nav capture tap)
            var modal = document.getElementById('capture-modal-task');
            if (modal) {
                modal.classList.add('visible');
                document.body.style.overflow = 'hidden';
                setTimeout(function() {
                    var input = modal.querySelector('input[type="text"], textarea');
                    if (input) input.focus();
                }, 100);
            }
            return;
        }

        // Navigate directly via kanban.switchTab
        if (window.kanban && kanban.switchTab) {
            kanban.switchTab(tabId);
        }

        updateActiveState(tabId);

        // Sync bottom nav state too
        if (window.bottomNav) window.bottomNav.updateActiveState(tabId);
    }

    function updateActiveState(activeTabId) {
        if (!activeTabId) {
            var activeTab = document.querySelector('.tabs .tab.active');
            if (activeTab) activeTabId = activeTab.getAttribute('data-tab');
        }

        document.querySelectorAll('.side-nav-item').forEach(function(item) {
            if (item.getAttribute('data-nav') !== 'capture') {
                item.classList.toggle('active', item.getAttribute('data-nav') === activeTabId);
            }
        });
    }

    // Sync when tabs change from other sources
    function setupSync() {
        document.querySelectorAll('.tabs .tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                updateActiveState(tab.getAttribute('data-tab'));
            });
        });

        document.addEventListener('sidebar:navigate', function(e) {
            if (e.detail && e.detail.tab) updateActiveState(e.detail.tab);
        });
    }

    async function init() {
        if (window.__appInitReady) {
            try { await window.__appInitReady; } catch(e) {}
        }
        createSideNav();
        setupSync();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.sideNav = {
        updateActiveState: updateActiveState
    };
})();
