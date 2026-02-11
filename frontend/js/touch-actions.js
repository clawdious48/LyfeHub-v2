/**
 * Touch Actions - Swipe-to-reveal and Long-press context menu
 * Mobile-friendly row actions for LyfeHub tables and lists
 * 
 * Only active on touch devices (uses body.touch-device class from MobileUtils)
 */
(function(global) {
    'use strict';

    // Configuration
    const CONFIG = {
        longPressDelay: 500,      // ms to trigger long-press
        swipeThreshold: 60,       // px minimum swipe distance
        swipeVelocity: 0.3,       // px/ms minimum velocity
        maxVerticalDrift: 30,     // px max vertical movement during swipe
        actionButtonWidth: 70,    // px width per action button
    };

    // State
    let activeSwipeRow = null;
    let activeContextMenu = null;
    let touchState = {
        startX: 0,
        startY: 0,
        startTime: 0,
        currentX: 0,
        currentY: 0,
        isTracking: false,
        longPressTimer: null,
        targetRow: null,
        hasMoved: false
    };

    /**
     * Get action configuration for a row element
     * Returns { element, actions: [{icon, label, action, className}], deleteCallback, editCallback }
     */
    function getRowConfig(rowEl) {
        // Base table rows (.base-row in table)
        if (rowEl.classList.contains('base-row') && !rowEl.classList.contains('add-row')) {
            const recordId = rowEl.dataset.recordId;
            if (!recordId) return null;
            
            return {
                element: rowEl,
                type: 'base-row',
                recordId: recordId,
                actions: [
                    {
                        icon: '✏️',
                        label: 'Edit',
                        className: 'touch-action-edit',
                        action: () => {
                            // Focus first editable cell
                            const firstCell = rowEl.querySelector('.base-cell[data-property-id]');
                            if (firstCell) firstCell.click();
                        }
                    },
                    {
                        icon: '🗑️',
                        label: 'Delete',
                        className: 'touch-action-delete',
                        action: () => {
                            const deleteBtn = rowEl.querySelector('.row-delete-btn');
                            if (deleteBtn) deleteBtn.click();
                        }
                    }
                ]
            };
        }
        
        // Base list row (in list display mode)
        if (rowEl.classList.contains('base-list-row')) {
            const baseId = rowEl.dataset.baseId;
            if (!baseId) return null;
            
            return {
                element: rowEl,
                type: 'base-list-row',
                baseId: baseId,
                actions: [
                    {
                        icon: '✏️',
                        label: 'Edit',
                        className: 'touch-action-edit',
                        action: () => {
                            const editBtn = rowEl.querySelector('.base-row-edit');
                            if (editBtn) editBtn.click();
                        }
                    },
                    {
                        icon: '🗑️',
                        label: 'Delete',
                        className: 'touch-action-delete',
                        action: () => {
                            const deleteBtn = rowEl.querySelector('.base-row-delete');
                            if (deleteBtn) deleteBtn.click();
                        }
                    }
                ]
            };
        }
        
        // Task items (.task-item in list view)
        if (rowEl.classList.contains('task-item')) {
            const taskId = rowEl.dataset.id;
            if (!taskId) return null;
            
            return {
                element: rowEl,
                type: 'task-item',
                taskId: taskId,
                actions: [
                    {
                        icon: '⭐',
                        label: 'Important',
                        className: 'touch-action-star',
                        action: () => {
                            const starBtn = rowEl.querySelector('.task-item-star');
                            if (starBtn) starBtn.click();
                        }
                    },
                    {
                        icon: '✏️',
                        label: 'Edit',
                        className: 'touch-action-edit',
                        action: () => {
                            const content = rowEl.querySelector('.task-item-content');
                            if (content) content.click();
                        }
                    }
                ]
            };
        }
        
        // Task cards (.task-card)
        if (rowEl.classList.contains('task-card')) {
            const taskId = rowEl.dataset.id;
            if (!taskId) return null;
            
            return {
                element: rowEl,
                type: 'task-card',
                taskId: taskId,
                actions: [
                    {
                        icon: '⭐',
                        label: 'Important',
                        className: 'touch-action-star',
                        action: () => {
                            const starBtn = rowEl.querySelector('.task-card-star');
                            if (starBtn) starBtn.click();
                        }
                    },
                    {
                        icon: '✏️',
                        label: 'Edit',
                        className: 'touch-action-edit',
                        action: () => {
                            const title = rowEl.querySelector('.task-card-title');
                            if (title) title.click();
                        }
                    }
                ]
            };
        }
        
        // People list rows
        if (rowEl.classList.contains('people-list-row') || rowEl.classList.contains('person-card')) {
            const personId = rowEl.dataset.personId || rowEl.dataset.id;
            if (!personId) return null;
            
            return {
                element: rowEl,
                type: 'person-row',
                personId: personId,
                actions: [
                    {
                        icon: '👁️',
                        label: 'View',
                        className: 'touch-action-view',
                        action: () => rowEl.click()
                    },
                    {
                        icon: '✏️',
                        label: 'Edit',
                        className: 'touch-action-edit',
                        action: () => rowEl.click()
                    }
                ]
            };
        }

        // Project cards in kanban
        if (rowEl.classList.contains('project-card')) {
            const projectId = rowEl.dataset.id;
            if (!projectId) return null;
            
            return {
                element: rowEl,
                type: 'project-card',
                projectId: projectId,
                actions: [
                    {
                        icon: '✏️',
                        label: 'Edit',
                        className: 'touch-action-edit',
                        action: () => rowEl.click()
                    }
                ]
            };
        }

        return null;
    }

    /**
     * Find the actionable row element from a touch target
     */
    function findActionableRow(target) {
        // Ordered by specificity
        const selectors = [
            '.base-row:not(.add-row)',
            '.base-list-row',
            '.task-item',
            '.task-card',
            '.people-list-row',
            '.person-card',
            '.project-card'
        ];
        
        for (const selector of selectors) {
            const row = target.closest(selector);
            if (row) return row;
        }
        return null;
    }

    // =====================================================
    // Swipe-to-Reveal Actions
    // =====================================================

    function createSwipeActions(config) {
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'touch-swipe-actions';
        actionsContainer.style.width = `${config.actions.length * CONFIG.actionButtonWidth}px`;
        
        config.actions.forEach(action => {
            const btn = document.createElement('button');
            btn.className = `touch-swipe-action-btn ${action.className || ''}`;
            btn.innerHTML = `
                <span class="touch-action-icon">${action.icon}</span>
                <span class="touch-action-label">${action.label}</span>
            `;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeSwipeActions();
                action.action();
            });
            actionsContainer.appendChild(btn);
        });
        
        return actionsContainer;
    }

    function showSwipeActions(rowEl, config) {
        // Close any existing swipe actions
        closeSwipeActions();
        
        // Add swipe container class
        rowEl.classList.add('touch-swiped');
        
        // Create actions if not already present
        let actionsEl = rowEl.querySelector('.touch-swipe-actions');
        if (!actionsEl) {
            actionsEl = createSwipeActions(config);
            rowEl.appendChild(actionsEl);
        }
        
        // Calculate and apply transform
        const actionsWidth = config.actions.length * CONFIG.actionButtonWidth;
        rowEl.style.setProperty('--swipe-offset', `-${actionsWidth}px`);
        
        activeSwipeRow = rowEl;
    }

    function closeSwipeActions() {
        if (activeSwipeRow) {
            activeSwipeRow.classList.remove('touch-swiped');
            activeSwipeRow.style.removeProperty('--swipe-offset');
            
            // Remove actions element after transition
            const actionsEl = activeSwipeRow.querySelector('.touch-swipe-actions');
            if (actionsEl) {
                setTimeout(() => actionsEl.remove(), 200);
            }
            
            activeSwipeRow = null;
        }
    }

    // =====================================================
    // Long-Press Context Menu
    // =====================================================

    function createContextMenu(config, x, y) {
        const menu = document.createElement('div');
        menu.className = 'touch-context-menu';
        
        config.actions.forEach(action => {
            const item = document.createElement('button');
            item.className = `touch-context-item ${action.className || ''}`;
            item.innerHTML = `
                <span class="touch-context-icon">${action.icon}</span>
                <span class="touch-context-label">${action.label}</span>
            `;
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                closeContextMenu();
                action.action();
            });
            menu.appendChild(item);
        });
        
        document.body.appendChild(menu);
        
        // Position menu near touch point
        const rect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Adjust X to keep menu on screen
        let finalX = x - rect.width / 2;
        if (finalX < 10) finalX = 10;
        if (finalX + rect.width > viewportWidth - 10) {
            finalX = viewportWidth - rect.width - 10;
        }
        
        // Adjust Y - prefer below touch, but flip if needed
        let finalY = y + 10;
        if (finalY + rect.height > viewportHeight - 10) {
            finalY = y - rect.height - 10;
        }
        if (finalY < 10) finalY = 10;
        
        menu.style.left = `${finalX}px`;
        menu.style.top = `${finalY}px`;
        
        // Animate in
        requestAnimationFrame(() => menu.classList.add('visible'));
        
        return menu;
    }

    function closeContextMenu() {
        if (activeContextMenu) {
            activeContextMenu.classList.remove('visible');
            setTimeout(() => {
                if (activeContextMenu && activeContextMenu.parentNode) {
                    activeContextMenu.parentNode.removeChild(activeContextMenu);
                }
                activeContextMenu = null;
            }, 150);
        }
    }

    function showContextMenu(config, x, y) {
        closeContextMenu();
        closeSwipeActions();
        
        activeContextMenu = createContextMenu(config, x, y);
        
        // Highlight the source row
        config.element.classList.add('touch-context-active');
    }

    // =====================================================
    // Touch Event Handlers
    // =====================================================

    function handleTouchStart(e) {
        // Don't interfere with form elements
        if (e.target.closest('input, textarea, select, button, a')) {
            return;
        }
        
        const row = findActionableRow(e.target);
        if (!row) return;
        
        const config = getRowConfig(row);
        if (!config) return;
        
        // If there's an active swiped row that's different, close it
        if (activeSwipeRow && activeSwipeRow !== row) {
            closeSwipeActions();
        }
        
        const touch = e.touches[0];
        touchState = {
            startX: touch.clientX,
            startY: touch.clientY,
            startTime: Date.now(),
            currentX: touch.clientX,
            currentY: touch.clientY,
            isTracking: true,
            longPressTimer: null,
            targetRow: row,
            targetConfig: config,
            hasMoved: false
        };
        
        // Start long-press timer
        touchState.longPressTimer = setTimeout(() => {
            if (touchState.isTracking && !touchState.hasMoved) {
                // Trigger long-press
                showContextMenu(config, touch.clientX, touch.clientY);
                touchState.isTracking = false;
                
                // Haptic feedback if available
                if (navigator.vibrate) {
                    navigator.vibrate(30);
                }
            }
        }, CONFIG.longPressDelay);
    }

    function handleTouchMove(e) {
        if (!touchState.isTracking) return;
        
        const touch = e.touches[0];
        touchState.currentX = touch.clientX;
        touchState.currentY = touch.clientY;
        
        const deltaX = touchState.currentX - touchState.startX;
        const deltaY = touchState.currentY - touchState.startY;
        
        // Check if we've moved enough to cancel long-press
        if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
            touchState.hasMoved = true;
            clearTimeout(touchState.longPressTimer);
        }
        
        // Check if this is a valid horizontal swipe
        if (Math.abs(deltaY) > CONFIG.maxVerticalDrift) {
            // Too much vertical movement, this is a scroll
            touchState.isTracking = false;
            return;
        }
        
        // Apply visual feedback during swipe left
        if (deltaX < -20 && touchState.targetRow) {
            const row = touchState.targetRow;
            const config = touchState.targetConfig;
            const maxSwipe = config.actions.length * CONFIG.actionButtonWidth;
            const translateX = Math.max(deltaX, -maxSwipe);
            
            // Create actions container if needed
            if (!row.querySelector('.touch-swipe-actions')) {
                const actionsEl = createSwipeActions(config);
                row.appendChild(actionsEl);
            }
            
            row.classList.add('touch-swiping');
            row.style.setProperty('--swipe-translate', `${translateX}px`);
            
            e.preventDefault();
        }
    }

    function handleTouchEnd(e) {
        clearTimeout(touchState.longPressTimer);
        
        if (!touchState.isTracking && !touchState.hasMoved) {
            touchState = { isTracking: false };
            return;
        }
        
        const row = touchState.targetRow;
        const config = touchState.targetConfig;
        
        if (!row || !config) {
            touchState = { isTracking: false };
            return;
        }
        
        const deltaX = touchState.currentX - touchState.startX;
        const deltaTime = Date.now() - touchState.startTime;
        const velocity = Math.abs(deltaX) / deltaTime;
        
        row.classList.remove('touch-swiping');
        row.style.removeProperty('--swipe-translate');
        
        // Check if swipe was sufficient
        if (deltaX < -CONFIG.swipeThreshold || (deltaX < -30 && velocity > CONFIG.swipeVelocity)) {
            // Swipe left detected - show actions
            showSwipeActions(row, config);
        } else if (deltaX > CONFIG.swipeThreshold / 2) {
            // Swipe right - close actions if open
            closeSwipeActions();
        }
        
        touchState = { isTracking: false };
    }

    function handleTouchCancel() {
        clearTimeout(touchState.longPressTimer);
        
        if (touchState.targetRow) {
            touchState.targetRow.classList.remove('touch-swiping');
            touchState.targetRow.style.removeProperty('--swipe-translate');
        }
        
        touchState = { isTracking: false };
    }

    // =====================================================
    // Document-level handlers for closing menus
    // =====================================================

    function handleDocumentTouch(e) {
        // Close context menu when tapping outside
        if (activeContextMenu && !activeContextMenu.contains(e.target)) {
            closeContextMenu();
            
            // Remove highlight from row
            document.querySelectorAll('.touch-context-active').forEach(el => {
                el.classList.remove('touch-context-active');
            });
        }
        
        // Close swipe actions when tapping elsewhere
        if (activeSwipeRow) {
            const isActionButton = e.target.closest('.touch-swipe-action-btn');
            const isSameRow = e.target.closest('.touch-swiped') === activeSwipeRow;
            
            if (!isActionButton && !isSameRow) {
                closeSwipeActions();
            }
        }
    }

    // =====================================================
    // Initialization
    // =====================================================

    function init() {
        // Only initialize on touch devices
        if (!document.body.classList.contains('touch-device')) {
            // Listen for class being added later (in case MobileUtils runs after us)
            const observer = new MutationObserver((mutations) => {
                if (document.body.classList.contains('touch-device')) {
                    observer.disconnect();
                    attachEventListeners();
                    console.log('[TouchActions] Initialized (deferred)');
                }
            });
            observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
            return;
        }
        
        attachEventListeners();
        console.log('[TouchActions] Initialized');
    }

    function attachEventListeners() {
        // Use capture to intercept before scroll handlers
        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });
        document.addEventListener('touchcancel', handleTouchCancel, { passive: true });
        
        // Document-level touch for closing menus
        document.addEventListener('touchstart', handleDocumentTouch, { passive: true });
        
        // Also close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeContextMenu();
                closeSwipeActions();
            }
        });
    }

    // Public API
    global.TouchActions = {
        closeSwipeActions,
        closeContextMenu,
        CONFIG
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(window);
