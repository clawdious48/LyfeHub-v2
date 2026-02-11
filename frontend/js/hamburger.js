/**
 * Hamburger Menu Controller
 * =========================
 * Manages the hamburger button state and dispatches drawer:toggle events.
 * Integrates with MobileUtils for breakpoint awareness.
 */
(function(global) {
    'use strict';

    // State
    let isOpen = false;
    let hamburgerBtn = null;

    /**
     * Toggle the drawer open/closed state
     */
    function toggle() {
        isOpen = !isOpen;
        updateButtonState();
        dispatchDrawerEvent();
    }

    /**
     * Set the drawer state explicitly
     * @param {boolean} open - Whether drawer should be open
     */
    function setOpen(open) {
        if (isOpen !== open) {
            isOpen = open;
            updateButtonState();
        }
    }

    /**
     * Update the hamburger button visual state
     */
    function updateButtonState() {
        if (!hamburgerBtn) return;
        
        if (isOpen) {
            hamburgerBtn.classList.add('is-active');
            hamburgerBtn.setAttribute('aria-expanded', 'true');
            hamburgerBtn.setAttribute('aria-label', 'Close menu');
        } else {
            hamburgerBtn.classList.remove('is-active');
            hamburgerBtn.setAttribute('aria-expanded', 'false');
            hamburgerBtn.setAttribute('aria-label', 'Open menu');
        }
    }

    /**
     * Dispatch the drawer:toggle custom event
     */
    function dispatchDrawerEvent() {
        const event = new CustomEvent('drawer:toggle', {
            bubbles: true,
            detail: { isOpen: isOpen }
        });
        document.dispatchEvent(event);
        console.log('[Hamburger] Dispatched drawer:toggle, isOpen:', isOpen);
    }

    /**
     * Handle click on hamburger button
     * @param {Event} e
     */
    function handleClick(e) {
        e.preventDefault();
        e.stopPropagation();
        toggle();
    }

    /**
     * Handle keyboard navigation
     * @param {KeyboardEvent} e
     */
    function handleKeydown(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
        } else if (e.key === 'Escape' && isOpen) {
            e.preventDefault();
            setOpen(false);
            dispatchDrawerEvent();
        }
    }

    /**
     * Listen for external drawer state changes
     * (e.g., drawer closed by clicking overlay)
     */
    function listenForDrawerEvents() {
        document.addEventListener('drawer:close', function() {
            setOpen(false);
        });
        
        document.addEventListener('drawer:open', function() {
            setOpen(true);
        });
    }

    /**
     * Handle breakpoint changes - close drawer on desktop
     */
    function handleBreakpointChange(newBreakpoint, oldBreakpoint) {
        // Close drawer when switching to desktop
        if (newBreakpoint === 'desktop' && isOpen) {
            setOpen(false);
            dispatchDrawerEvent();
        }
    }

    /**
     * Initialize hamburger menu controller
     */
    function init() {
        hamburgerBtn = document.getElementById('hamburger-btn');
        
        if (!hamburgerBtn) {
            console.warn('[Hamburger] Button element not found');
            return;
        }

        // Attach event listeners
        hamburgerBtn.addEventListener('click', handleClick);
        hamburgerBtn.addEventListener('keydown', handleKeydown);
        
        // Listen for external drawer events
        listenForDrawerEvents();
        
        // Set initial ARIA state
        updateButtonState();
        
        // Register for breakpoint changes if MobileUtils exists
        if (global.MobileUtils && global.MobileUtils.onBreakpointChange) {
            global.MobileUtils.onBreakpointChange(handleBreakpointChange);
        }
        
        console.log('[Hamburger] Initialized');
    }

    // Public API
    global.HamburgerMenu = {
        toggle: toggle,
        setOpen: setOpen,
        isOpen: function() { return isOpen; }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(window);
