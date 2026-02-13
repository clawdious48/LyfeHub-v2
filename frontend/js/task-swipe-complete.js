/**
 * Task Swipe-to-Complete
 * Swipe right on task items to mark them complete (mobile only)
 * 
 * Works independently of touch-actions.js (which handles swipe-left)
 */
(function(global) {
    'use strict';

    const CONFIG = {
        completeThreshold: 100,     // px to trigger complete
        maxVerticalDrift: 40,       // px max vertical movement
        velocityThreshold: 0.4,     // px/ms for fast swipe
        animationDuration: 300,     // ms for completion animation
    };

    let touchState = {
        startX: 0,
        startY: 0,
        startTime: 0,
        currentX: 0,
        isTracking: false,
        targetTask: null,
        initialCompleted: false
    };

    /**
     * Find task item from touch target
     */
    function findTaskItem(target) {
        return target.closest('.task-item, .task-card');
    }

    /**
     * Create the complete action background
     */
    function createCompleteBackground(taskEl) {
        let bg = taskEl.querySelector('.swipe-complete-bg');
        if (!bg) {
            bg = document.createElement('div');
            bg.className = 'swipe-complete-bg';
            bg.innerHTML = `
                <div class="swipe-complete-content">
                    <svg class="swipe-complete-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span class="swipe-complete-text">Complete</span>
                </div>
            `;
            taskEl.insertBefore(bg, taskEl.firstChild);
        }
        return bg;
    }

    /**
     * Remove the complete background
     */
    function removeCompleteBackground(taskEl) {
        const bg = taskEl.querySelector('.swipe-complete-bg');
        if (bg) {
            bg.remove();
        }
    }

    /**
     * Handle touch start
     */
    function handleTouchStart(e) {
        // Don't interfere with form elements or buttons
        if (e.target.closest('input, textarea, select, button, a, .task-item-checkbox, .task-card-checkbox, .task-item-star, .task-card-star')) {
            return;
        }

        const taskEl = findTaskItem(e.target);
        if (!taskEl) return;

        const taskId = taskEl.dataset.id;
        if (!taskId) return;

        // Don't allow swipe on already completed tasks
        if (taskEl.classList.contains('completed')) {
            return;
        }

        const touch = e.touches[0];
        touchState = {
            startX: touch.clientX,
            startY: touch.clientY,
            startTime: Date.now(),
            currentX: touch.clientX,
            isTracking: true,
            targetTask: taskEl,
            taskId: taskId,
            initialCompleted: taskEl.classList.contains('completed')
        };
    }

    /**
     * Handle touch move
     */
    function handleTouchMove(e) {
        if (!touchState.isTracking || !touchState.targetTask) return;

        const touch = e.touches[0];
        const deltaX = touch.clientX - touchState.startX;
        const deltaY = touch.clientY - touchState.startY;

        // Check for excessive vertical movement (scrolling)
        if (Math.abs(deltaY) > CONFIG.maxVerticalDrift) {
            cancelSwipe();
            return;
        }

        // Only track swipe right (positive deltaX)
        if (deltaX < 10) {
            // Hide any visible background
            touchState.targetTask.classList.remove('swipe-completing');
            touchState.targetTask.style.removeProperty('--swipe-complete-x');
            return;
        }

        // Prevent scroll while swiping right
        e.preventDefault();

        touchState.currentX = touch.clientX;
        const taskEl = touchState.targetTask;

        // Create background if needed
        createCompleteBackground(taskEl);

        // Apply transform with resistance after threshold
        const cappedDelta = deltaX < CONFIG.completeThreshold 
            ? deltaX 
            : CONFIG.completeThreshold + (deltaX - CONFIG.completeThreshold) * 0.3;

        taskEl.classList.add('swipe-completing');
        taskEl.style.setProperty('--swipe-complete-x', `${cappedDelta}px`);

        // Visual feedback when past threshold
        if (deltaX >= CONFIG.completeThreshold) {
            taskEl.classList.add('swipe-complete-ready');
        } else {
            taskEl.classList.remove('swipe-complete-ready');
        }
    }

    /**
     * Handle touch end
     */
    function handleTouchEnd(e) {
        if (!touchState.isTracking || !touchState.targetTask) {
            touchState = { isTracking: false };
            return;
        }

        const taskEl = touchState.targetTask;
        const taskId = touchState.taskId;
        const deltaX = touchState.currentX - touchState.startX;
        const deltaTime = Date.now() - touchState.startTime;
        const velocity = deltaX / deltaTime;

        // Check if swipe meets completion criteria
        const shouldComplete = deltaX >= CONFIG.completeThreshold || 
                              (deltaX > 50 && velocity > CONFIG.velocityThreshold);

        if (shouldComplete) {
            // Animate completion
            completeTask(taskEl, taskId);
        } else {
            // Snap back
            cancelSwipe();
        }

        touchState = { isTracking: false };
    }

    /**
     * Handle touch cancel
     */
    function handleTouchCancel() {
        cancelSwipe();
        touchState = { isTracking: false };
    }

    /**
     * Cancel swipe and reset state
     */
    function cancelSwipe() {
        if (touchState.targetTask) {
            const taskEl = touchState.targetTask;
            taskEl.classList.remove('swipe-completing', 'swipe-complete-ready');
            taskEl.style.removeProperty('--swipe-complete-x');
            
            // Remove background after animation
            setTimeout(() => {
                removeCompleteBackground(taskEl);
            }, 200);
        }
    }

    /**
     * Complete the task with animation
     */
    function completeTask(taskEl, taskId) {
        // Haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate([15, 50, 15]);
        }

        // Add completion animation class
        taskEl.classList.add('swipe-complete-animating');
        taskEl.style.setProperty('--swipe-complete-x', '100%');

        // Wait for animation, then trigger actual completion
        setTimeout(() => {
            // Call the existing toggle complete function
            if (typeof taskModal !== 'undefined' && taskModal.toggleComplete) {
                taskModal.toggleComplete(taskId);
            }

            // Clean up classes
            taskEl.classList.remove('swipe-completing', 'swipe-complete-ready', 'swipe-complete-animating');
            taskEl.style.removeProperty('--swipe-complete-x');
            removeCompleteBackground(taskEl);
        }, CONFIG.animationDuration);
    }

    /**
     * Initialize event listeners
     */
    function init() {
        // Only initialize on touch devices
        if (!document.body.classList.contains('touch-device')) {
            // Watch for touch-device class being added
            const observer = new MutationObserver((mutations) => {
                if (document.body.classList.contains('touch-device')) {
                    observer.disconnect();
                    attachListeners();
                    console.log('[TaskSwipeComplete] Initialized (deferred)');
                }
            });
            observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
            return;
        }

        attachListeners();
        console.log('[TaskSwipeComplete] Initialized');
    }

    function attachListeners() {
        // Target the task containers specifically
        const tasksContainer = document.getElementById('tasks-list');
        const cardsContainer = document.getElementById('tasks-cards');

        const containers = [tasksContainer, cardsContainer].filter(Boolean);

        containers.forEach(container => {
            container.addEventListener('touchstart', handleTouchStart, { passive: true });
            container.addEventListener('touchmove', handleTouchMove, { passive: false });
            container.addEventListener('touchend', handleTouchEnd, { passive: true });
            container.addEventListener('touchcancel', handleTouchCancel, { passive: true });
        });

        // Also handle dynamically added containers
        document.addEventListener('DOMContentLoaded', () => {
            const newTasksList = document.getElementById('tasks-list');
            const newCardsContainer = document.getElementById('tasks-cards');
            
            [newTasksList, newCardsContainer].filter(Boolean).forEach(container => {
                if (!container.dataset.swipeCompleteAttached) {
                    container.dataset.swipeCompleteAttached = 'true';
                    container.addEventListener('touchstart', handleTouchStart, { passive: true });
                    container.addEventListener('touchmove', handleTouchMove, { passive: false });
                    container.addEventListener('touchend', handleTouchEnd, { passive: true });
                    container.addEventListener('touchcancel', handleTouchCancel, { passive: true });
                }
            });
        });
    }

    // Public API
    global.TaskSwipeComplete = {
        CONFIG
    };

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(window);
