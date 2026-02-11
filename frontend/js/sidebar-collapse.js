/**
 * SidebarCollapse - Responsive sidebar management for LyfeHub
 * ============================================================
 * Handles both .bases-sidebar and .people-sidebar with unified logic.
 * 
 * Dependencies: MobileUtils (mobile-utils.js)
 * 
 * Behaviors:
 *   Mobile (≤768px)  - Hidden by default, edge swipe + pull tab to show
 *   Tablet (769-1024px) - Collapsed to icon rail, expand on hover or click
 *   Desktop (>1024px) - Full width, always visible
 */
(function(global) {
    'use strict';

    // Configuration for each sidebar
    const SIDEBAR_CONFIG = {
        bases: {
            sidebarId: 'bases-sidebar',
            layoutClass: 'bases-layout',
            pullTabId: 'bases-sidebar-pull-tab',
            backdropId: 'bases-sidebar-backdrop'
        },
        people: {
            sidebarId: 'people-sidebar',
            layoutClass: 'people-layout',
            pullTabId: 'people-sidebar-pull-tab',
            backdropId: 'people-sidebar-backdrop'
        },
        calendar: {
            sidebarId: 'calendar-sidebar',
            layoutClass: 'calendar-layout',
            pullTabId: 'calendar-sidebar-pull-tab',
            backdropId: 'calendar-sidebar-backdrop'
        }
    };

    // Swipe gesture configuration
    const SWIPE_CONFIG = {
        edgeThreshold: 30,      // Distance from left edge to start swipe
        minSwipeDistance: 50,   // Minimum distance to trigger open
        closeSwipeDistance: 50  // Minimum distance to trigger close
    };

    // LocalStorage key for persisting collapsed state
    const STORAGE_KEY = 'lyfehub-sidebar-collapsed';

    // State tracking
    const state = {
        bases: { isOpen: false, isExpanded: false },
        people: { isOpen: false, isExpanded: false },
        calendar: { isOpen: false, isExpanded: false }
    };

    // Touch tracking for swipe gestures
    let touchState = {
        startX: 0,
        startY: 0,
        currentX: 0,
        isEdgeSwipe: false,
        isSidebarSwipe: false,
        activeSidebarType: null
    };

    /**
     * Load collapsed state from localStorage
     */
    function loadState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.bases !== undefined) state.bases.isExpanded = !parsed.bases;
                if (parsed.people !== undefined) state.people.isExpanded = !parsed.people;
                if (parsed.calendar !== undefined) state.calendar.isExpanded = !parsed.calendar;
                console.log('[SidebarCollapse] Loaded state from localStorage:', parsed);
            }
        } catch (e) {
            console.warn('[SidebarCollapse] Failed to load state:', e);
        }
    }

    /**
     * Save collapsed state to localStorage
     */
    function saveState() {
        try {
            const toSave = {
                bases: !state.bases.isExpanded,
                people: !state.people.isExpanded,
                calendar: !state.calendar.isExpanded
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        } catch (e) {
            console.warn('[SidebarCollapse] Failed to save state:', e);
        }
    }

    /**
     * Create and inject pull tab indicator for mobile
     */
    function createPullTab(config) {
        const existing = document.getElementById(config.pullTabId);
        if (existing) return existing;

        const tab = document.createElement('div');
        tab.id = config.pullTabId;
        tab.className = 'sidebar-pull-tab';
        tab.setAttribute('aria-label', 'Swipe to open sidebar');
        tab.setAttribute('role', 'button');
        
        // Inner element for the glow effect
        tab.innerHTML = '<div class="pull-tab-inner"></div>';

        // Insert into the layout container
        const layout = document.querySelector('.' + config.layoutClass);
        if (layout) {
            layout.appendChild(tab);
        }

        return tab;
    }

    /**
     * Create and inject backdrop for mobile overlay
     */
    function createBackdrop(config) {
        const existing = document.getElementById(config.backdropId);
        if (existing) return existing;

        const backdrop = document.createElement('div');
        backdrop.id = config.backdropId;
        backdrop.className = 'sidebar-backdrop';

        // Insert into the layout container
        const layout = document.querySelector('.' + config.layoutClass);
        if (layout) {
            layout.appendChild(backdrop);
        }

        return backdrop;
    }

    /**
     * Open sidebar (mobile)
     */
    function openSidebar(type) {
        const config = SIDEBAR_CONFIG[type];
        const layout = document.querySelector('.' + config.layoutClass);
        const backdrop = document.getElementById(config.backdropId);
        const pullTab = document.getElementById(config.pullTabId);

        if (layout) {
            layout.classList.add('sidebar-open');
            state[type].isOpen = true;
        }

        if (backdrop) {
            backdrop.classList.add('visible');
        }

        // Hide pull tab when sidebar is open
        if (pullTab) {
            pullTab.classList.add('hidden');
        }

        // Prevent body scroll when sidebar is open
        document.body.style.overflow = 'hidden';

        console.log(`[SidebarCollapse] ${type} sidebar opened`);
    }

    /**
     * Close sidebar (mobile)
     */
    function closeSidebar(type) {
        const config = SIDEBAR_CONFIG[type];
        const layout = document.querySelector('.' + config.layoutClass);
        const backdrop = document.getElementById(config.backdropId);
        const pullTab = document.getElementById(config.pullTabId);

        if (layout) {
            layout.classList.remove('sidebar-open');
            state[type].isOpen = false;
        }

        if (backdrop) {
            backdrop.classList.remove('visible');
        }

        // Show pull tab when sidebar is closed (on mobile)
        if (pullTab && global.MobileUtils && MobileUtils.getBreakpoint() === 'mobile') {
            pullTab.classList.remove('hidden');
        }

        // Restore body scroll
        document.body.style.overflow = '';

        console.log(`[SidebarCollapse] ${type} sidebar closed`);
    }

    /**
     * Toggle sidebar (mobile)
     */
    function toggleSidebar(type) {
        if (state[type].isOpen) {
            closeSidebar(type);
        } else {
            openSidebar(type);
        }
    }

    /**
     * Expand sidebar (tablet - icon rail to full)
     */
    function expandSidebar(type) {
        const config = SIDEBAR_CONFIG[type];
        const sidebar = document.getElementById(config.sidebarId);

        if (sidebar) {
            sidebar.classList.add('sidebar-expanded');
            state[type].isExpanded = true;
            saveState();
        }
    }

    /**
     * Collapse sidebar (tablet - full to icon rail)
     */
    function collapseSidebar(type) {
        const config = SIDEBAR_CONFIG[type];
        const sidebar = document.getElementById(config.sidebarId);

        if (sidebar) {
            sidebar.classList.remove('sidebar-expanded');
            state[type].isExpanded = false;
            saveState();
        }
    }

    /**
     * Set up event listeners for a sidebar
     */
    function setupSidebarEvents(type) {
        const config = SIDEBAR_CONFIG[type];

        // Create pull tab and backdrop for mobile
        const pullTab = createPullTab(config);
        const backdrop = createBackdrop(config);

        // Pull tab touch to open
        if (pullTab) {
            pullTab.addEventListener('touchstart', function(e) {
                e.preventDefault();
                openSidebar(type);
            }, { passive: false });
            
            // Also handle click for accessibility
            pullTab.addEventListener('click', function(e) {
                e.stopPropagation();
                openSidebar(type);
            });
        }

        // Backdrop click to close
        if (backdrop) {
            backdrop.addEventListener('click', function() {
                closeSidebar(type);
            });
        }

        // Close on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && state[type].isOpen) {
                closeSidebar(type);
            }
        });

        // Handle clicks outside sidebar on mobile
        const sidebar = document.getElementById(config.sidebarId);
        if (sidebar) {
            // Prevent clicks inside sidebar from closing it
            sidebar.addEventListener('click', function(e) {
                e.stopPropagation();
            });
        }
    }

    /**
     * Detect which sidebar type is active on the current page
     */
    function getActiveSidebarType() {
        for (const type in SIDEBAR_CONFIG) {
            const config = SIDEBAR_CONFIG[type];
            if (document.querySelector('.' + config.layoutClass)) {
                return type;
            }
        }
        return null;
    }

    /**
     * Set up global touch event listeners for edge swipe gestures
     */
    function setupSwipeGestures() {
        // Only set up swipe gestures on mobile
        if (!global.MobileUtils || MobileUtils.getBreakpoint() !== 'mobile') {
            return;
        }

        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    /**
     * Handle touch start event
     */
    function handleTouchStart(e) {
        // Only handle on mobile
        if (!global.MobileUtils || MobileUtils.getBreakpoint() !== 'mobile') {
            return;
        }

        const touch = e.touches[0];
        touchState.startX = touch.clientX;
        touchState.startY = touch.clientY;
        touchState.currentX = touch.clientX;
        touchState.isEdgeSwipe = false;
        touchState.isSidebarSwipe = false;
        touchState.activeSidebarType = getActiveSidebarType();

        // Check if touch started near left edge (for opening)
        if (touch.clientX <= SWIPE_CONFIG.edgeThreshold) {
            touchState.isEdgeSwipe = true;
        }

        // Check if touch started on an open sidebar (for closing)
        if (touchState.activeSidebarType && state[touchState.activeSidebarType].isOpen) {
            const config = SIDEBAR_CONFIG[touchState.activeSidebarType];
            const sidebar = document.getElementById(config.sidebarId);
            if (sidebar && sidebar.contains(e.target)) {
                touchState.isSidebarSwipe = true;
            }
        }
    }

    /**
     * Handle touch move event
     */
    function handleTouchMove(e) {
        if (!touchState.isEdgeSwipe && !touchState.isSidebarSwipe) {
            return;
        }

        const touch = e.touches[0];
        touchState.currentX = touch.clientX;

        // Calculate horizontal movement
        const deltaX = touchState.currentX - touchState.startX;
        const deltaY = Math.abs(touch.clientY - touchState.startY);

        // If vertical movement is greater than horizontal, abort swipe detection
        if (deltaY > Math.abs(deltaX)) {
            touchState.isEdgeSwipe = false;
            touchState.isSidebarSwipe = false;
            return;
        }

        // Prevent scrolling when swiping horizontally
        if (Math.abs(deltaX) > 10) {
            e.preventDefault();
        }
    }

    /**
     * Handle touch end event
     */
    function handleTouchEnd(e) {
        if (!touchState.activeSidebarType) {
            return;
        }

        const deltaX = touchState.currentX - touchState.startX;

        // Edge swipe to open (swipe right from left edge)
        if (touchState.isEdgeSwipe && deltaX >= SWIPE_CONFIG.minSwipeDistance) {
            if (!state[touchState.activeSidebarType].isOpen) {
                openSidebar(touchState.activeSidebarType);
            }
        }

        // Sidebar swipe to close (swipe left on sidebar)
        if (touchState.isSidebarSwipe && deltaX <= -SWIPE_CONFIG.closeSwipeDistance) {
            if (state[touchState.activeSidebarType].isOpen) {
                closeSidebar(touchState.activeSidebarType);
            }
        }

        // Reset touch state
        touchState.isEdgeSwipe = false;
        touchState.isSidebarSwipe = false;
    }

    /**
     * Check if device is in landscape orientation
     */
    function isLandscape() {
        return window.matchMedia('(orientation: landscape)').matches;
    }

    /**
     * Handle orientation changes for tablet mode
     */
    function handleOrientationChange() {
        if (!global.MobileUtils || !global.MobileUtils.isTablet()) return;

        const landscape = isLandscape();
        console.log('[SidebarCollapse] Orientation changed, landscape:', landscape);

        Object.keys(SIDEBAR_CONFIG).forEach(function(type) {
            const sidebar = document.getElementById(SIDEBAR_CONFIG[type].sidebarId);
            if (!sidebar) return;

            if (landscape) {
                // Landscape tablet: auto-expand
                sidebar.classList.add('sidebar-expanded');
                state[type].isExpanded = true;
            } else {
                // Portrait tablet: collapse to icon rail
                sidebar.classList.remove('sidebar-expanded');
                state[type].isExpanded = false;
            }
        });
    }

    /**
     * Handle breakpoint changes
     */
    function handleBreakpointChange(newBreakpoint, oldBreakpoint) {
        console.log(`[SidebarCollapse] Breakpoint changed: ${oldBreakpoint} → ${newBreakpoint}`);

        Object.keys(SIDEBAR_CONFIG).forEach(function(type) {
            const config = SIDEBAR_CONFIG[type];
            const layout = document.querySelector('.' + config.layoutClass);
            const sidebar = document.getElementById(config.sidebarId);
            const pullTab = document.getElementById(config.pullTabId);

            if (newBreakpoint === 'desktop') {
                // Desktop: ensure sidebar is visible and not in mobile state
                if (layout) layout.classList.remove('sidebar-open');
                if (sidebar) sidebar.classList.remove('sidebar-expanded');
                if (pullTab) pullTab.style.display = 'none';
                state[type].isOpen = false;
                state[type].isExpanded = false;
                document.body.style.overflow = '';
            } else if (newBreakpoint === 'tablet') {
                // Tablet: handle based on orientation
                if (layout) layout.classList.remove('sidebar-open');
                if (pullTab) pullTab.style.display = 'none';
                state[type].isOpen = false;
                document.body.style.overflow = '';
                
                // Apply orientation-based expansion
                if (isLandscape()) {
                    if (sidebar) sidebar.classList.add('sidebar-expanded');
                    state[type].isExpanded = true;
                } else {
                    if (sidebar) sidebar.classList.remove('sidebar-expanded');
                    state[type].isExpanded = false;
                }
            } else if (newBreakpoint === 'mobile') {
                // Mobile: hidden by default, show pull tab
                if (layout) layout.classList.remove('sidebar-open');
                if (sidebar) sidebar.classList.remove('sidebar-expanded');
                if (pullTab) pullTab.style.display = 'flex';
                state[type].isOpen = false;
                state[type].isExpanded = false;
            }
        });

        // Re-setup swipe gestures when entering mobile mode
        if (newBreakpoint === 'mobile' && oldBreakpoint !== 'mobile') {
            setupSwipeGestures();
        }
    }

    /**
     * Initialize the sidebar collapse system
     */
    function init() {
        // Check for MobileUtils dependency
        if (!global.MobileUtils) {
            console.error('[SidebarCollapse] MobileUtils is required but not found');
            return;
        }

        // Load saved state from localStorage
        loadState();

        // Set up each sidebar
        Object.keys(SIDEBAR_CONFIG).forEach(function(type) {
            const config = SIDEBAR_CONFIG[type];
            const sidebar = document.getElementById(config.sidebarId);
            
            if (sidebar) {
                setupSidebarEvents(type);
                
                // Apply saved expanded state for tablet mode
                if (state[type].isExpanded) {
                    sidebar.classList.add('sidebar-expanded');
                }
                
                console.log(`[SidebarCollapse] Initialized ${type} sidebar`);
            }
        });

        // Register for breakpoint changes
        MobileUtils.onBreakpointChange(handleBreakpointChange);

        // Register for orientation changes (for tablet landscape/portrait behavior)
        window.matchMedia('(orientation: portrait)').addEventListener('change', handleOrientationChange);

        // Apply initial state based on current breakpoint
        const currentBreakpoint = MobileUtils.getBreakpoint();
        handleBreakpointChange(currentBreakpoint, null);

        // Set up swipe gestures for mobile
        setupSwipeGestures();

        console.log('[SidebarCollapse] Initialized | Breakpoint:', currentBreakpoint, '| Landscape:', isLandscape());
    }

    // Public API
    global.SidebarCollapse = {
        open: openSidebar,
        close: closeSidebar,
        toggle: toggleSidebar,
        expand: expandSidebar,
        collapse: collapseSidebar,
        getState: function(type) { return state[type]; }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(window);
