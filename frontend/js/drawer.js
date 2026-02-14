/**
 * Mobile Drawer Controller
 * ========================
 * Manages the slide-out navigation drawer for mobile devices.
 * Listens for drawer:toggle events from the hamburger menu.
 * Dispatches drawer:close events when closed.
 */
(function(global) {
    'use strict';

    // DOM Elements
    let drawer = null;
    let backdrop = null;
    let navLinks = [];

    // State
    let isOpen = false;

    // Tab data for generating navigation
    const TABS = [
        { id: "apex", label: "Apex", icon: "home" },
        { id: 'projects', label: 'Projects', icon: 'layers' },
        { id: 'tasks', label: 'Tasks', icon: 'check-square' },
        { id: 'bases', label: 'Bases', icon: 'database' },
        { id: 'people', label: 'People', icon: 'users' },
        { id: 'calendar', label: 'Calendar', icon: 'calendar' }
    ];

    // SVG icons (matching the header icons)
    const ICONS = {
        home: `<svg class="drawer-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
        layers: `<svg class="drawer-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"/>
            <polyline points="2 17 12 22 22 17"/>
            <polyline points="2 12 12 17 22 12"/>
        </svg>`,
        'check-square': `<svg class="drawer-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 11 12 14 22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>`,
        database: `<svg class="drawer-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"/>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
        </svg>`,
        users: `<svg class="drawer-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>`,
        calendar: `<svg class="drawer-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>`,
        settings: `<svg class="drawer-footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>`,
        logout: `<svg class="drawer-footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>`
    };

    /**
     * Get current user info from the app (if available)
     */
    function getUserInfo() {
        // Try to get user info from global state or API
        if (global.currentUser) {
            return global.currentUser;
        }
        
        // Try localStorage
        try {
            const storedUser = localStorage.getItem('lyfehub_user');
            if (storedUser) {
                return JSON.parse(storedUser);
            }
        } catch (e) {
            // Ignore
        }
        
        // Default placeholder
        return {
            name: 'User',
            email: '',
            initials: 'U'
        };
    }

    /**
     * Get initials from name
     */
    function getInitials(name) {
        if (!name) return 'U';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    /**
     * Get the currently active tab
     */
    function getActiveTab() {
        const activeTab = document.querySelector('.tab.active');
        return activeTab ? activeTab.dataset.tab : 'projects';
    }

    /**
     * Create the drawer HTML structure
     */
    function createDrawerHTML() {
        const user = getUserInfo();
        const activeTab = getActiveTab();
        
        // Create backdrop
        backdrop = document.createElement('div');
        backdrop.className = 'drawer-backdrop';
        backdrop.setAttribute('aria-hidden', 'true');
        
        // Create drawer
        drawer = document.createElement('nav');
        drawer.id = 'mobile-drawer';
        drawer.className = 'mobile-drawer';
        drawer.setAttribute('role', 'navigation');
        drawer.setAttribute('aria-label', 'Main navigation');
        
        // Build HTML
        // Filter out Apex tab if user is not in an org
        const visibleTabs = TABS.filter(tab => {
            if (tab.id === 'apex' && !global.currentOrg) return false;
            return true;
        });

        let navItemsHTML = visibleTabs.map(tab => `
            <li class="drawer-nav-item">
                <button class="drawer-nav-link${tab.id === activeTab ? ' is-active' : ''}" 
                        data-tab="${tab.id}"
                        role="menuitem">
                    ${ICONS[tab.icon]}
                    <span>${tab.label}</span>
                </button>
            </li>
        `).join('');
        
        drawer.innerHTML = `
            <div class="drawer-header">
                <div class="drawer-user">
                    <div class="drawer-avatar">${user.initials || getInitials(user.name)}</div>
                    <div class="drawer-user-info">
                        <div class="drawer-user-name">${user.name || 'User'}</div>
                        ${user.email ? `<div class="drawer-user-email">${user.email}</div>` : ''}
                    </div>
                </div>
            </div>
            
            <div class="drawer-nav">
                <ul class="drawer-nav-list" role="menu">
                    ${navItemsHTML}
                </ul>
            </div>
            
            <div class="drawer-footer">
                <a href="/settings.html" class="drawer-footer-link" role="menuitem">
                    ${ICONS.settings}
                    <span>Settings</span>
                </a>
                <button id="drawer-logout-btn" class="drawer-footer-link drawer-logout-btn" role="menuitem">
                    ${ICONS.logout}
                    <span>Logout</span>
                </button>
            </div>
        `;
        
        // Insert into DOM (after header, before main content)
        document.body.insertBefore(backdrop, document.body.firstChild);
        document.body.insertBefore(drawer, document.body.firstChild);
        
        // Cache nav links
        navLinks = drawer.querySelectorAll('.drawer-nav-link');
    }

    /**
     * Open the drawer
     */
    function open() {
        if (isOpen) return;
        isOpen = true;
        
        // Update active tab state before showing
        updateActiveTab();
        
        drawer.classList.add('is-open');
        backdrop.classList.add('is-visible');
        document.body.classList.add('drawer-open');
        
        // Focus first nav item
        setTimeout(() => {
            const firstLink = drawer.querySelector('.drawer-nav-link');
            if (firstLink) firstLink.focus();
        }, 100);
        
        console.log('[Drawer] Opened');
    }

    /**
     * Close the drawer
     */
    function close() {
        if (!isOpen) return;
        isOpen = false;
        
        drawer.classList.remove('is-open');
        backdrop.classList.remove('is-visible');
        document.body.classList.remove('drawer-open');
        
        // Dispatch close event for hamburger to sync
        document.dispatchEvent(new CustomEvent('drawer:close', { bubbles: true }));
        
        console.log('[Drawer] Closed');
    }

    /**
     * Toggle the drawer
     */
    function toggle() {
        if (isOpen) {
            close();
        } else {
            open();
        }
    }

    /**
     * Update active tab highlight
     */
    function updateActiveTab() {
        const activeTab = getActiveTab();
        navLinks.forEach(link => {
            if (link.dataset.tab === activeTab) {
                link.classList.add('is-active');
            } else {
                link.classList.remove('is-active');
            }
        });
    }

    /**
     * Switch to a tab
     */
    function switchToTab(tabId) {
        // Use the existing tab switching mechanism
        const tabButton = document.querySelector(`.tab[data-tab="${tabId}"]`);
        if (tabButton) {
            tabButton.click();
        }
        
        // Update drawer active state
        navLinks.forEach(link => {
            link.classList.toggle('is-active', link.dataset.tab === tabId);
        });
        
        // Update header title to show current section name
        if (global.DynamicHeader && global.DynamicHeader.update) {
            global.DynamicHeader.update();
        }
        
        // Close the drawer
        close();
    }

    /**
     * Handle nav link click
     */
    function handleNavClick(e) {
        const link = e.target.closest('.drawer-nav-link');
        if (!link) return;
        
        e.preventDefault();
        const tabId = link.dataset.tab;
        if (tabId) {
            switchToTab(tabId);
        }
    }

    /**
     * Handle logout button click
     */
    function handleLogout() {
        // Use the existing logout button if available
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.click();
        } else {
            // Fallback: clear storage and redirect
            localStorage.removeItem('lyfehub_token');
            localStorage.removeItem('lyfehub_user');
            window.location.href = '/login.html';
        }
    }

    /**
     * Handle keyboard navigation
     */
    function handleKeydown(e) {
        if (!isOpen) return;
        
        if (e.key === 'Escape') {
            e.preventDefault();
            close();
            // Return focus to hamburger
            const hamburger = document.getElementById('hamburger-btn');
            if (hamburger) hamburger.focus();
        }
        
        // Arrow key navigation within drawer
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            const focusable = Array.from(drawer.querySelectorAll('.drawer-nav-link, .drawer-footer-link'));
            const current = document.activeElement;
            const currentIndex = focusable.indexOf(current);
            
            if (currentIndex !== -1) {
                e.preventDefault();
                let nextIndex;
                if (e.key === 'ArrowDown') {
                    nextIndex = (currentIndex + 1) % focusable.length;
                } else {
                    nextIndex = (currentIndex - 1 + focusable.length) % focusable.length;
                }
                focusable[nextIndex].focus();
            }
        }
    }

    /**
     * Listen for drawer events
     */
    function listenForEvents() {
        // Hamburger toggle
        document.addEventListener('drawer:toggle', (e) => {
            if (e.detail && typeof e.detail.isOpen === 'boolean') {
                if (e.detail.isOpen) {
                    open();
                } else {
                    close();
                }
            } else {
                toggle();
            }
        });
        
        // External open/close
        document.addEventListener('drawer:open', open);
        // Note: drawer:close is dispatched BY this module, not listened to
    }

    /**
     * Attach event listeners
     */
    function attachEventListeners() {
        // Backdrop click
        backdrop.addEventListener('click', close);
        
        // Nav link clicks
        drawer.addEventListener('click', handleNavClick);
        
        // Logout button
        const logoutBtn = drawer.querySelector('#drawer-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
        
        // Keyboard navigation
        document.addEventListener('keydown', handleKeydown);
        
        // Listen for tab changes (update active state)
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                setTimeout(updateActiveTab, 0);
            });
        });
        
        // Prevent scroll behind drawer on touch devices
        drawer.addEventListener('touchmove', (e) => {
            // Allow scrolling within drawer-nav
            const nav = e.target.closest('.drawer-nav');
            if (!nav) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    /**
     * Initialize the drawer
     */
    function init() {
        // Only initialize on mobile (drawer is hidden on desktop via CSS anyway)
        createDrawerHTML();
        listenForEvents();
        attachEventListeners();
        
        console.log('[Drawer] Initialized');
    }

    // Public API
    global.MobileDrawer = {
        open: open,
        close: close,
        toggle: toggle,
        isOpen: function() { return isOpen; },
        updateActiveTab: updateActiveTab
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(window);
