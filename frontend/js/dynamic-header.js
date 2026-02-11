/**
 * Dynamic Header Title
 * ====================
 * Updates the mobile header to show the current section name instead of "LyfeHub".
 * On desktop, the title remains "LyfeHub" (or hidden, per CSS).
 * 
 * Listens for:
 *   - Tab clicks (header tab buttons)
 *   - Drawer navigation (drawer:close with tab change)
 *   - Breakpoint changes (restore default on desktop)
 */
(function(global) {
    'use strict';

    // Default title for desktop or fallback
    const DEFAULT_TITLE = 'LyfeHub';

    // Tab ID to display name mapping
    const TAB_NAMES = {
        "apex": "Apex",
        'projects': 'Projects',
        'tasks': 'Tasks',
        'bases': 'Bases',
        'people': 'People',
        'calendar': 'Calendar'
    };

    // DOM reference
    let headerTitleEl = null;

    /**
     * Get the currently active tab ID
     * @returns {string} Tab ID (e.g., 'projects', 'tasks')
     */
    function getActiveTabId() {
        const activeTab = document.querySelector('.tab.active');
        return activeTab ? activeTab.dataset.tab : 'projects';
    }

    /**
     * Get the display name for a tab ID
     * @param {string} tabId 
     * @returns {string} Display name
     */
    function getTabDisplayName(tabId) {
        return TAB_NAMES[tabId] || DEFAULT_TITLE;
    }

    /**
     * Update the header title element
     * @param {string} title - The title to display
     */
    function setHeaderTitle(title) {
        if (headerTitleEl) {
            headerTitleEl.textContent = title;
        }
    }

    /**
     * Update header title based on current state
     * On mobile: shows the active tab name
     * On desktop: shows default title (though typically hidden by CSS)
     */
    function updateHeaderTitle() {
        // Check if MobileUtils is available
        const isMobile = global.MobileUtils && global.MobileUtils.isMobile();

        if (isMobile) {
            const activeTabId = getActiveTabId();
            const displayName = getTabDisplayName(activeTabId);
            setHeaderTitle(displayName);
        } else {
            // On desktop, show default title
            setHeaderTitle(DEFAULT_TITLE);
        }
    }

    /**
     * Handle tab button click
     * @param {Event} e - Click event
     */
    function handleTabClick(e) {
        const tabButton = e.target.closest('.tab');
        if (!tabButton) return;

        const tabId = tabButton.dataset.tab;
        if (tabId && global.MobileUtils && global.MobileUtils.isMobile()) {
            setHeaderTitle(getTabDisplayName(tabId));
        }
    }

    /**
     * Initialize event listeners
     */
    function attachEventListeners() {
        // Listen for header tab clicks
        const tabsContainer = document.querySelector('.header .tabs');
        if (tabsContainer) {
            tabsContainer.addEventListener('click', handleTabClick);
        }

        // Listen for breakpoint changes
        if (global.MobileUtils && global.MobileUtils.onBreakpointChange) {
            global.MobileUtils.onBreakpointChange(function(newBreakpoint, oldBreakpoint) {
                updateHeaderTitle();
            });
        }

        // Listen for drawer navigation (when drawer closes after selecting a tab)
        // The drawer module updates the active tab before closing
        document.addEventListener('drawer:close', function() {
            // Small delay to ensure tab has been updated
            setTimeout(updateHeaderTitle, 10);
        });
    }

    /**
     * Initialize the dynamic header module
     */
    function init() {
        // Cache the header title element
        headerTitleEl = document.getElementById('header-title');
        
        if (!headerTitleEl) {
            console.warn('[DynamicHeader] Header title element #header-title not found');
            return;
        }

        // Attach event listeners
        attachEventListeners();

        // Set initial title based on active tab
        updateHeaderTitle();

        console.log('[DynamicHeader] Initialized');
    }

    // Public API
    global.DynamicHeader = {
        update: updateHeaderTitle,
        setTitle: setHeaderTitle,
        getTabName: getTabDisplayName
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(window);
