/**
 * Bottom Navigation Bar - Mobile Only
 * 
 * Renders a bottom navigation for mobile users with:
 * - 5 main items: Apex, Tasks, Calendar, People, More
 * - "More" opens a slide-up menu with additional options
 * - Integrates with existing tab navigation system
 */

(function() {
    'use strict';
    
    // Navigation configuration
    const NAV_ITEMS = [
        {
            id: 'apex',
            label: 'Apex',
            icon: '<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'
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
            id: 'more',
            label: 'More',
            icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>'
        }
    ];
    
    // More menu items
    const MORE_ITEMS = [
        {
            id: 'projects',
            label: 'Projects',
            icon: '<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>'
        },
        {
            id: 'bases',
            label: 'Notes',
            icon: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>'
        },
        {
            id: 'organizations',
            label: 'Orgs',
            icon: '<svg viewBox="0 0 24 24"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01"/><path d="M9 12v.01"/><path d="M9 15v.01"/><path d="M9 18v.01"/></svg>'
        },
        {
            id: 'trade-kb',
            label: 'Trade KB',
            icon: '<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="12" y1="6" x2="12" y2="12"/><line x1="9" y1="9" x2="15" y2="9"/></svg>'
        },
        {
            id: 'settings',
            label: 'Settings',
            icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
        }
    ];
    
    let moreMenuOpen = false;
    
    /**
     * Create the bottom navigation HTML
     */
    function createBottomNav() {
        // Create main nav container
        const nav = document.createElement('nav');
        nav.className = 'bottom-nav';
        nav.setAttribute('role', 'navigation');
        nav.setAttribute('aria-label', 'Main navigation');
        
        // Create items container
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'bottom-nav-items';
        
        // Add nav items
        NAV_ITEMS.forEach(item => {
            const button = document.createElement('button');
            button.className = 'bottom-nav-item';
            button.setAttribute('data-nav', item.id);
            button.setAttribute('aria-label', item.label);
            button.innerHTML = item.icon + '<span>' + item.label + '</span>';
            
            button.addEventListener('click', () => handleNavClick(item.id));
            itemsContainer.appendChild(button);
        });
        
        nav.appendChild(itemsContainer);
        document.body.appendChild(nav);
        
        // Create more menu overlay
        const overlay = document.createElement('div');
        overlay.className = 'bottom-nav-more-overlay';
        overlay.addEventListener('click', closeMoreMenu);
        document.body.appendChild(overlay);
        
        // Create more menu
        const moreMenu = document.createElement('div');
        moreMenu.className = 'bottom-nav-more-menu';
        moreMenu.innerHTML = createMoreMenuHTML();
        document.body.appendChild(moreMenu);
        
        // Add more menu item listeners
        moreMenu.querySelectorAll('.more-menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const tabId = item.getAttribute('data-nav');
                handleNavClick(tabId);
                closeMoreMenu();
            });
        });
        
        // Close button listener
        const closeBtn = moreMenu.querySelector('.more-menu-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeMoreMenu);
        }
        
        // Set initial active state
        updateActiveState();
    }
    
    /**
     * Create the More menu HTML
     */
    function createMoreMenuHTML() {
        let itemsHTML = '';
        MORE_ITEMS.forEach(item => {
            itemsHTML += '<button class="more-menu-item" data-nav="' + item.id + '" aria-label="' + item.label + '">' +
                item.icon +
                '<span>' + item.label + '</span>' +
                '</button>';
        });
        
        return '<div class="more-menu-header">' +
            '<div class="more-menu-handle"></div>' +
            '<button class="more-menu-close" aria-label="Close menu">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<line x1="18" y1="6" x2="6" y2="18"/>' +
            '<line x1="6" y1="6" x2="18" y2="18"/>' +
            '</svg></button>' +
            '</div>' +
            '<div class="more-menu-items">' + itemsHTML + '</div>';
    }
    
    /**
     * Handle navigation item click
     */
    function handleNavClick(tabId) {
        if (tabId === 'more') {
            toggleMoreMenu();
            return;
        }
        
        // Handle settings separately (goes to settings page)
        if (tabId === 'settings') {
            window.location.href = '/settings.html';
            return;
        }
        
        // Handle organizations - this maps to "bases" tab with orgs filter
        if (tabId === 'organizations') {
            tabId = 'bases';
            // Could add org filter logic here if needed
        }
        
        // Handle trade-kb - maps to bases
        if (tabId === 'trade-kb') {
            tabId = 'bases';
            // Could add trade kb filter logic here if needed
        }
        
        // Find and click the corresponding header tab
        const headerTab = document.querySelector('.tabs .tab[data-tab="' + tabId + '"]');
        if (headerTab) {
            headerTab.click();
        }
        
        // Update active state in bottom nav
        updateActiveState(tabId);
    }
    
    /**
     * Update active state on bottom nav items
     */
    function updateActiveState(activeTabId) {
        // If no tab specified, try to get it from active header tab
        if (!activeTabId) {
            const activeHeaderTab = document.querySelector('.tabs .tab.active');
            if (activeHeaderTab) {
                activeTabId = activeHeaderTab.getAttribute('data-tab');
            }
        }
        
        // Remove active from all
        document.querySelectorAll('.bottom-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active to matching item
        const activeNavItem = document.querySelector('.bottom-nav-item[data-nav="' + activeTabId + '"]');
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
    }
    
    /**
     * Toggle the More menu
     */
    function toggleMoreMenu() {
        if (moreMenuOpen) {
            closeMoreMenu();
        } else {
            openMoreMenu();
        }
    }
    
    /**
     * Open the More menu
     */
    function openMoreMenu() {
        moreMenuOpen = true;
        const overlay = document.querySelector('.bottom-nav-more-overlay');
        const menu = document.querySelector('.bottom-nav-more-menu');
        
        if (overlay) overlay.classList.add('visible');
        if (menu) menu.classList.add('visible');
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }
    
    /**
     * Close the More menu
     */
    function closeMoreMenu() {
        moreMenuOpen = false;
        const overlay = document.querySelector('.bottom-nav-more-overlay');
        const menu = document.querySelector('.bottom-nav-more-menu');
        
        if (overlay) overlay.classList.remove('visible');
        if (menu) menu.classList.remove('visible');
        
        // Restore body scroll
        document.body.style.overflow = '';
    }
    
    /**
     * Listen for tab changes from header to sync state
     */
    function setupTabSync() {
        // Watch for clicks on header tabs
        document.querySelectorAll('.tabs .tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.getAttribute('data-tab');
                updateActiveState(tabId);
                closeMoreMenu();
            });
        });
    }
    
    /**
     * Initialize bottom nav when DOM is ready
     */
    function init() {
        // Only initialize on mobile
        if (window.innerWidth >= 1201) {
            // Still create it (hidden by CSS), so resizing works
        }
        
        createBottomNav();
        setupTabSync();
        
        // Handle escape key to close more menu
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && moreMenuOpen) {
                closeMoreMenu();
            }
        });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Expose for external use if needed
    window.bottomNav = {
        updateActiveState,
        openMoreMenu,
        closeMoreMenu
    };
    
})();
