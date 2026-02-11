/**
 * MobileUtils - Mobile detection and responsive utilities for LyfeHub
 * Uses matchMedia for efficient breakpoint detection
 */
(function(global) {
    'use strict';

    // Breakpoint definitions
    const BREAKPOINTS = {
        mobile: 768,   // ≤768px
        tablet: 1024   // 769px-1024px
        // desktop: >1024px
    };

    // MediaQueryLists for efficient detection
    const mediaQueries = {
        mobile: window.matchMedia(`(max-width: ${BREAKPOINTS.mobile}px)`),
        tablet: window.matchMedia(`(min-width: ${BREAKPOINTS.mobile + 1}px) and (max-width: ${BREAKPOINTS.tablet}px)`),
        desktop: window.matchMedia(`(min-width: ${BREAKPOINTS.tablet + 1}px)`)
    };

    // Track current breakpoint for change detection
    let currentBreakpoint = null;

    // Registered callbacks for breakpoint changes
    const breakpointCallbacks = [];

    /**
     * Get the current breakpoint name
     * @returns {'mobile'|'tablet'|'desktop'}
     */
    function getBreakpoint() {
        if (mediaQueries.mobile.matches) return 'mobile';
        if (mediaQueries.tablet.matches) return 'tablet';
        return 'desktop';
    }

    /**
     * Check if viewport is mobile (≤768px)
     * @returns {boolean}
     */
    function isMobile() {
        return mediaQueries.mobile.matches;
    }

    /**
     * Check if viewport is tablet (769px-1024px)
     * @returns {boolean}
     */
    function isTablet() {
        return mediaQueries.tablet.matches;
    }

    /**
     * Check if viewport is desktop (>1024px)
     * @returns {boolean}
     */
    function isDesktop() {
        return mediaQueries.desktop.matches;
    }

    /**
     * Check if device supports touch
     * @returns {boolean}
     */
    function isTouch() {
        return (
            'ontouchstart' in window ||
            navigator.maxTouchPoints > 0 ||
            navigator.msMaxTouchPoints > 0 ||
            (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
        );
    }

    /**
     * Register a callback for breakpoint changes
     * @param {function} callback - Called with (newBreakpoint, oldBreakpoint) when crossing breakpoints
     * @returns {function} Unsubscribe function
     */
    function onBreakpointChange(callback) {
        if (typeof callback !== 'function') {
            console.error('[MobileUtils] onBreakpointChange requires a function callback');
            return () => {};
        }
        
        breakpointCallbacks.push(callback);
        
        // Return unsubscribe function
        return function unsubscribe() {
            const index = breakpointCallbacks.indexOf(callback);
            if (index > -1) {
                breakpointCallbacks.splice(index, 1);
            }
        };
    }

    /**
     * Handle breakpoint change events
     */
    function handleBreakpointChange() {
        const newBreakpoint = getBreakpoint();
        
        if (newBreakpoint !== currentBreakpoint) {
            const oldBreakpoint = currentBreakpoint;
            currentBreakpoint = newBreakpoint;
            
            // Notify all registered callbacks
            breakpointCallbacks.forEach(function(callback) {
                try {
                    callback(newBreakpoint, oldBreakpoint);
                } catch (e) {
                    console.error('[MobileUtils] Error in breakpoint callback:', e);
                }
            });
        }
    }

    /**
     * Setup header scroll shadow detection
     * Adds .is-scrolled class to header when page is scrolled
     */
    function setupHeaderScrollShadow() {
        const header = document.querySelector('.header');
        if (!header) return;

        let lastScrollY = 0;
        let ticking = false;
        const SCROLL_THRESHOLD = 10; // Pixels before shadow appears

        function updateHeaderState() {
            const scrollY = window.scrollY || window.pageYOffset;
            
            if (scrollY > SCROLL_THRESHOLD) {
                header.classList.add('is-scrolled');
            } else {
                header.classList.remove('is-scrolled');
            }
            
            lastScrollY = scrollY;
            ticking = false;
        }

        function onScroll() {
            if (!ticking) {
                window.requestAnimationFrame(updateHeaderState);
                ticking = true;
            }
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        
        // Check initial state
        updateHeaderState();
    }

    /**
     * Setup virtual keyboard detection
     * Adds .keyboard-open class to body when keyboard is visible
     * Uses visualViewport API for accurate detection on mobile
     */
    function setupKeyboardDetection() {
        // Only needed on mobile/touch devices
        if (!isTouch()) return;

        const visualViewport = window.visualViewport;
        
        if (visualViewport) {
            // Modern approach: use visualViewport API
            let initialHeight = visualViewport.height;
            const KEYBOARD_THRESHOLD = 150; // Min height difference to consider keyboard open

            function handleViewportResize() {
                const currentHeight = visualViewport.height;
                const heightDiff = initialHeight - currentHeight;
                
                if (heightDiff > KEYBOARD_THRESHOLD) {
                    document.body.classList.add('keyboard-open');
                } else {
                    document.body.classList.remove('keyboard-open');
                }
            }

            visualViewport.addEventListener('resize', handleViewportResize);
            
            // Update initial height on orientation change
            window.addEventListener('orientationchange', function() {
                setTimeout(function() {
                    initialHeight = visualViewport.height;
                }, 100);
            });
        } else {
            // Fallback: detect focus on input elements
            let keyboardVisible = false;

            document.addEventListener('focusin', function(e) {
                const target = e.target;
                if (target.tagName === 'INPUT' || 
                    target.tagName === 'TEXTAREA' || 
                    target.isContentEditable) {
                    document.body.classList.add('keyboard-open');
                    keyboardVisible = true;
                }
            });

            document.addEventListener('focusout', function(e) {
                if (keyboardVisible) {
                    // Small delay to handle focus moving between inputs
                    setTimeout(function() {
                        const activeEl = document.activeElement;
                        if (activeEl.tagName !== 'INPUT' && 
                            activeEl.tagName !== 'TEXTAREA' && 
                            !activeEl.isContentEditable) {
                            document.body.classList.remove('keyboard-open');
                            keyboardVisible = false;
                        }
                    }, 100);
                }
            });
        }
    }

    /**
     * Initialize the utility
     */
    function init() {
        // Set initial breakpoint
        currentBreakpoint = getBreakpoint();

        // Listen for changes on all media queries
        Object.values(mediaQueries).forEach(function(mq) {
            // Use addEventListener if available (modern browsers), otherwise addListener (legacy)
            if (mq.addEventListener) {
                mq.addEventListener('change', handleBreakpointChange);
            } else if (mq.addListener) {
                mq.addListener(handleBreakpointChange);
            }
        });

        // Add touch-device class to body for CSS targeting
        if (isTouch()) {
            document.body.classList.add('touch-device');
        }

        // Also add breakpoint class to body
        document.body.classList.add('breakpoint-' + currentBreakpoint);

        // Update breakpoint class on changes
        onBreakpointChange(function(newBreakpoint, oldBreakpoint) {
            if (oldBreakpoint) {
                document.body.classList.remove('breakpoint-' + oldBreakpoint);
            }
            document.body.classList.add('breakpoint-' + newBreakpoint);
        });

        // Setup header scroll shadow detection
        setupHeaderScrollShadow();
        
        // Setup virtual keyboard detection
        setupKeyboardDetection();

        // Self-test: log current breakpoint on load
        console.log('[MobileUtils] Initialized | Breakpoint:', currentBreakpoint, 
                    '| Touch:', isTouch(),
                    '| Viewport:', window.innerWidth + 'x' + window.innerHeight);
    }

    // Public API
    global.MobileUtils = {
        isMobile: isMobile,
        isTablet: isTablet,
        isDesktop: isDesktop,
        isTouch: isTouch,
        getBreakpoint: getBreakpoint,
        onBreakpointChange: onBreakpointChange,
        
        // Expose breakpoints for reference
        BREAKPOINTS: Object.freeze(BREAKPOINTS)
    };

    // Initialize when DOM is ready, or immediately if already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(window);
