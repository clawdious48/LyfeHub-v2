/**
 * Bottom Navigation Bar - Mobile Only
 * 
 * Renders a bottom navigation for mobile users with:
 * - Quick Capture (+) button with tap and long-press modes
 * - 5 nav items: Home, Tasks, Calendar, People, Notes
 */

(function() {
    'use strict';
    
    // Navigation configuration
    const NAV_ITEMS = [
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
            id: 'dashboard',
            label: 'Home',
            icon: '<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'
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
            id: 'apex',
            label: 'Apex',
            icon: '<svg viewBox="0 0 24 24"><path d="M2 20h20"/><path d="M5 20V8l7-5 7 5v12"/><path d="M9 20v-6h6v6"/><path d="M9 12h6"/></svg>',
            roleRequired: ['developer', 'management', 'office_coordinator', 'project_manager', 'estimator', 'field_tech']
        },
    ];
    
    // Tap-again tracking
    var currentActiveTab = null;
    var tabActivatedAt = 0;
    var TAP_AGAIN_DELAY = 300; // ms before tap-again triggers sheet

    // Capture state
    let longPressTimer = null;
    let bubblesVisible = false;
    let activeBubble = null;
    let defaultListId = null;
    
    // Bubble definitions
    const BUBBLES = [
        { id: 'task', emoji: '📝', label: 'Task', dx: 0, dy: -120 },
        { id: 'note', emoji: '📓', label: 'Note', dx: 70, dy: -100 },
        { id: 'photo', emoji: '📸', label: 'Photo', dx: 120, dy: -50 }
    ];
    
    /**
     * Get default task list (inbox or first)
     */
    async function getDefaultList() {
        if (defaultListId) return defaultListId;
        try {
            const res = await fetch('/api/task-lists', { credentials: 'include' });
            if (!res.ok) return null;
            const data = await res.json();
            const lists = data.lists || data || [];
            const inbox = lists.find(function(l) { return l.name && l.name.toLowerCase() === 'inbox'; });
            defaultListId = inbox ? inbox.id : (lists[0] ? lists[0].id : null);
            return defaultListId;
        } catch (e) {
            return null;
        }
    }
    
    /**
     * Create the bottom navigation HTML
     */
    function createBottomNav() {
        var nav = document.createElement('nav');
        nav.className = 'bottom-nav';
        nav.setAttribute('role', 'navigation');
        nav.setAttribute('aria-label', 'Main navigation');
        
        var itemsContainer = document.createElement('div');
        itemsContainer.className = 'bottom-nav-items';
        
        NAV_ITEMS.forEach(function(item) {
            var button = document.createElement('button');
            button.className = 'bottom-nav-item';
            if (item.id === 'capture') button.className += ' bottom-nav-capture';
            button.setAttribute('data-nav', item.id);
            button.setAttribute('aria-label', item.label || 'Quick capture');
            
            if (item.id === 'capture') {
                button.innerHTML = '<div class="capture-btn-circle">' + item.icon + '</div>';
            } else {
                button.innerHTML = item.icon + '<span>' + item.label + '</span>';
            }
            
            if (item.id === 'capture') {
                setupCaptureButton(button);
            } else {
                setupNavButton(button, item.id);
            }
            
            itemsContainer.appendChild(button);
        });
        
        nav.appendChild(itemsContainer);
        document.body.appendChild(nav);
        
        // Create bubble container
        var bubbleContainer = document.createElement('div');
        bubbleContainer.className = 'capture-bubbles';
        bubbleContainer.id = 'capture-bubbles';
        document.body.appendChild(bubbleContainer);
        
        // Create modals
        createModals();
        
        updateActiveState();
    }
    
    /**
     * Nested section registry
     * Maps parent nav items to sections that live in their sheet and have their own side panels.
     * When a nested section is the active view, the parent's drag-up gesture opens the nested section's context sheet.
     */
    var NESTED_SECTIONS = {
        // parent nav id → array of nested section ids that have side panels
        'dashboard': ['bases']
    };

    /**
     * Get the currently active nested section for a parent, if any.
     * Returns the nested section id or null.
     */
    function getActiveNestedSection(parentId) {
        var nested = NESTED_SECTIONS[parentId];
        if (!nested) return null;
        // Check if the current active header tab matches a nested section
        var activeTab = document.querySelector('.tabs .tab.active');
        var activeTabId = activeTab ? activeTab.getAttribute('data-tab') : null;
        for (var i = 0; i < nested.length; i++) {
            if (activeTabId === nested[i]) return nested[i];
        }
        return null;
    }

    /**
     * Setup nav button with tap + drag-up gesture for nested section panels
     */
    function setupNavButton(button, navId) {
        var touchStartY = 0;
        var touchStartX = 0;
        var dragTimer = null;
        var dragActive = false;
        var hasMoved = false;

        button.addEventListener('touchstart', function(e) {
            touchStartY = e.touches[0].clientY;
            touchStartX = e.touches[0].clientX;
            dragActive = false;
            hasMoved = false;

            // Start 135ms timer for drag-up activation
            dragTimer = setTimeout(function() {
                dragActive = true;
            }, 135);
        }, { passive: true });

        button.addEventListener('touchmove', function(e) {
            if (!dragActive) {
                // Check if finger moved significantly before timer — cancel drag, allow scroll
                var dx = Math.abs(e.touches[0].clientX - touchStartX);
                var dy = Math.abs(e.touches[0].clientY - touchStartY);
                if (dx > 10 || dy > 10) {
                    clearTimeout(dragTimer);
                    hasMoved = true;
                }
                return;
            }

            var dy = touchStartY - e.touches[0].clientY; // positive = dragging up
            if (dy > 20) {
                hasMoved = true;
                // Check if there's a nested section with a panel to show
                var nestedSection = getActiveNestedSection(navId);
                if (nestedSection && window.contextSheet && !window.contextSheet.isOpen()) {
                    if (navigator.vibrate) navigator.vibrate(30);
                    window.contextSheet.show(nestedSection);
                    dragActive = false; // prevent repeated triggers
                }
            }
        }, { passive: true });

        button.addEventListener('touchend', function(e) {
            clearTimeout(dragTimer);
            if (!hasMoved && !dragActive) {
                // Simple tap — normal navigation
                handleNavClick(navId);
            } else if (!hasMoved && dragActive) {
                // Long press without move — treat as tap
                handleNavClick(navId);
            }
            dragActive = false;
            hasMoved = false;
        }, { passive: true });

        button.addEventListener('touchcancel', function() {
            clearTimeout(dragTimer);
            dragActive = false;
            hasMoved = false;
        }, { passive: true });

        // Mouse fallback (desktop)
        button.addEventListener('click', function(e) {
            if ('ontouchstart' in window) return; // skip on touch devices, handled above
            handleNavClick(navId);
        });
    }

    /**
     * Setup capture button with tap and long-press
     */
    function setupCaptureButton(button) {
        var startTime = 0;
        var longPressed = false;
        
        button.addEventListener('touchstart', function(e) {
            e.preventDefault();
            startTime = Date.now();
            longPressed = false;
            
            longPressTimer = setTimeout(function() {
                longPressed = true;
                if (navigator.vibrate) navigator.vibrate(50);
                showBubbles(button);
            }, 135);
        }, { passive: false });
        
        button.addEventListener('touchmove', function(e) {
            if (!bubblesVisible) return;
            e.preventDefault();
            var touch = e.touches[0];
            checkBubbleHover(touch.clientX, touch.clientY);
        }, { passive: false });
        
        button.addEventListener('touchend', function(e) {
            clearTimeout(longPressTimer);
            
            if (bubblesVisible) {
                if (activeBubble) {
                    var bubbleId = activeBubble;
                    hideBubbles();
                    openModalForType(bubbleId);
                } else {
                    hideBubbles();
                }
            } else if (!longPressed) {
                // Simple tap
                openModalForType('task');
            }
        });
        
        button.addEventListener('touchcancel', function() {
            clearTimeout(longPressTimer);
            hideBubbles();
        });
        
        // Mouse fallback
        button.addEventListener('click', function(e) {
            // Only for non-touch
            if ('ontouchstart' in window) return;
            openModalForType('task');
        });
    }
    
    /**
     * Show radial bubbles above capture button
     */
    function showBubbles(button) {
        bubblesVisible = true;
        activeBubble = null;
        
        var rect = button.getBoundingClientRect();
        var centerX = rect.left + rect.width / 2;
        var centerY = rect.top + rect.height / 2;
        
        var container = document.getElementById('capture-bubbles');
        container.innerHTML = '';
        container.classList.add('visible');
        
        BUBBLES.forEach(function(bubble, i) {
            var el = document.createElement('div');
            el.className = 'capture-bubble';
            el.setAttribute('data-bubble', bubble.id);
            el.style.left = (centerX + bubble.dx - 28) + 'px';
            el.style.top = (centerY + bubble.dy - 28) + 'px';
            el.style.animationDelay = (i * 50) + 'ms';
            el.innerHTML = '<span class="capture-bubble-emoji">' + bubble.emoji + '</span>' +
                '<span class="capture-bubble-label">' + bubble.label + '</span>';
            container.appendChild(el);
        });
    }
    
    /**
     * Check if touch is hovering over a bubble
     */
    function checkBubbleHover(x, y) {
        activeBubble = null;
        var bubbles = document.querySelectorAll('.capture-bubble');
        bubbles.forEach(function(el) {
            var rect = el.getBoundingClientRect();
            var cx = rect.left + rect.width / 2;
            var cy = rect.top + rect.height / 2;
            var dist = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
            
            if (dist < 48) {
                el.classList.add('active');
                activeBubble = el.getAttribute('data-bubble');
            } else {
                el.classList.remove('active');
            }
        });
    }
    
    /**
     * Hide bubbles
     */
    function hideBubbles() {
        bubblesVisible = false;
        activeBubble = null;
        var container = document.getElementById('capture-bubbles');
        container.classList.remove('visible');
        container.innerHTML = '';
    }
    
    /**
     * Open the appropriate modal
     */
    function openModalForType(type) {
        var modal = document.getElementById('capture-modal-' + type);
        if (!modal) return;
        modal.classList.add('visible');
        document.body.style.overflow = 'hidden';
        
        // Auto-focus first input
        setTimeout(function() {
            var input = modal.querySelector('input[type="text"], textarea');
            if (input) input.focus();
        }, 100);
    }
    
    /**
     * Close a modal
     */
    function closeModal(modal) {
        modal.classList.remove('visible');
        document.body.style.overflow = '';
        // Reset form
        modal.querySelectorAll('input[type="text"], textarea').forEach(function(input) {
            input.value = '';
        });
        var toggle = modal.querySelector('.capture-toggle input');
        if (toggle) toggle.checked = true;
    }
    
    /**
     * Create all capture modals
     */
    function createModals() {
        // Task Modal
        createModal('task', 'Quick Task', [
            '<input type="text" class="capture-input" id="capture-task-title" placeholder="What needs to be done?" autocomplete="off">',
            '<label class="capture-toggle"><input type="checkbox" checked> Add to My Day</label>'
        ], submitTask);
        
        // Note Modal
        createModal('note', 'Quick Note', [
            '<input type="text" class="capture-input" id="capture-note-title" placeholder="Note title" autocomplete="off">',
            '<textarea class="capture-input capture-textarea" id="capture-note-content" placeholder="Content..." rows="3"></textarea>'
        ], submitNote);
        
        // Photo Modal
        createModal('photo', 'Quick Photo', [
            '<button type="button" class="capture-photo-btn" id="capture-photo-trigger">📸 Take Photo</button>',
            '<input type="file" accept="image/*" capture="environment" id="capture-photo-input" style="display:none">',
            '<div class="capture-photo-preview" id="capture-photo-preview"></div>',
            '<input type="text" class="capture-input" id="capture-photo-caption" placeholder="Caption (optional)" autocomplete="off">'
        ], submitPhoto);
    }
    
    /**
     * Create a single modal
     */
    function createModal(type, title, fieldsHtml, onSubmit) {
        var modal = document.createElement('div');
        modal.className = 'capture-modal-overlay';
        modal.id = 'capture-modal-' + type;
        
        modal.innerHTML = '<div class="capture-modal-backdrop"></div>' +
            '<div class="capture-modal">' +
            '<div class="capture-modal-header">' +
            '<h3>' + title + '</h3>' +
            '<button class="capture-modal-close" aria-label="Close">&times;</button>' +
            '</div>' +
            '<div class="capture-modal-body">' +
            fieldsHtml.join('') +
            '</div>' +
            '<div class="capture-modal-footer">' +
            '<button class="capture-submit-btn">Add</button>' +
            '</div>' +
            '</div>';
        
        document.body.appendChild(modal);
        
        // Close handlers
        modal.querySelector('.capture-modal-backdrop').addEventListener('click', function() {
            closeModal(modal);
        });
        modal.querySelector('.capture-modal-close').addEventListener('click', function() {
            closeModal(modal);
        });
        
        // Submit handler
        modal.querySelector('.capture-submit-btn').addEventListener('click', function() {
            onSubmit(modal);
        });
        
        // Enter key submit for task/note
        if (type === 'task') {
            modal.querySelector('#capture-task-title').addEventListener('keydown', function(e) {
                if (e.key === 'Enter') onSubmit(modal);
            });
        }
        
        // Photo button wiring
        if (type === 'photo') {
            var trigger = modal.querySelector('#capture-photo-trigger');
            var fileInput = modal.querySelector('#capture-photo-input');
            trigger.addEventListener('click', function() { fileInput.click(); });
            fileInput.addEventListener('change', function() {
                var preview = modal.querySelector('#capture-photo-preview');
                if (fileInput.files && fileInput.files[0]) {
                    var reader = new FileReader();
                    reader.onload = function(e) {
                        preview.innerHTML = '<img src="' + e.target.result + '" style="max-width:100%;border-radius:12px;margin-top:8px;">';
                    };
                    reader.readAsDataURL(fileInput.files[0]);
                }
            });
        }
    }
    
    /**
     * Submit task
     */
    async function submitTask(modal) {
        var title = modal.querySelector('#capture-task-title').value.trim();
        if (!title) return;
        
        var myDay = modal.querySelector('.capture-toggle input').checked;
        var btn = modal.querySelector('.capture-submit-btn');
        btn.disabled = true;
        btn.textContent = '...';
        
        try {
            var listId = await getDefaultList();
            var today = new Date().toISOString().split('T')[0];
            
            var res = await fetch('/api/task-items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    title: title,
                    due_date: myDay ? today : undefined,
                    my_day: myDay,
                    list_id: listId || undefined
                })
            });
            
            if (!res.ok) throw new Error('Failed');
            closeModal(modal);
        } catch (e) {
            console.error('Task capture failed:', e);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Add';
        }
    }
    
    /**
     * Submit note
     */
    async function submitNote(modal) {
        var title = modal.querySelector('#capture-note-title').value.trim();
        if (!title) return;
        
        var content = modal.querySelector('#capture-note-content').value.trim();
        var btn = modal.querySelector('.capture-submit-btn');
        btn.disabled = true;
        btn.textContent = '...';
        
        try {
            var res = await fetch('/api/bases/core/core-notes/records', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    values: { title: title, content: content, type: 'note' }
                })
            });
            
            if (!res.ok) throw new Error('Failed');
            closeModal(modal);
        } catch (e) {
            console.error('Note capture failed:', e);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Add';
        }
    }
    
    /**
     * Submit photo (as note with caption)
     */
    async function submitPhoto(modal) {
        var caption = modal.querySelector('#capture-photo-caption').value.trim();
        var fileInput = modal.querySelector('#capture-photo-input');
        
        if (!fileInput.files || !fileInput.files[0]) {
            // No photo taken
            return;
        }
        
        var btn = modal.querySelector('.capture-submit-btn');
        btn.disabled = true;
        btn.textContent = '...';
        
        try {
            var res = await fetch('/api/bases/core/core-notes/records', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    values: {
                        title: caption || 'Photo capture',
                        content: caption || 'Photo captured (upload pending)',
                        type: 'note'
                    }
                })
            });
            
            if (!res.ok) throw new Error('Failed');
            closeModal(modal);
            // Reset photo preview
            modal.querySelector('#capture-photo-preview').innerHTML = '';
        } catch (e) {
            console.error('Photo capture failed:', e);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Add';
        }
    }
    
    /**
     * Handle navigation item click
     */
    function handleNavClick(tabId) {
        if (tabId === 'capture') return;
        
        // Tap-again: if tapping already-active tab, toggle context sheet
        if (tabId === currentActiveTab) {
            var elapsed = Date.now() - tabActivatedAt;
            if (elapsed >= TAP_AGAIN_DELAY && window.contextSheet) {
                window.contextSheet.toggle(tabId);
            }
            return; // Don't re-navigate to already active tab
        }
        
        // Close sheet if open when switching tabs
        if (window.contextSheet && window.contextSheet.isOpen()) {
            window.contextSheet.hide();
        }
        
        // Normal navigation
        var headerTab = document.querySelector('.tabs .tab[data-tab="' + tabId + '"]');
        if (headerTab) {
            headerTab.click();
        }
        
        currentActiveTab = tabId;
        tabActivatedAt = Date.now();
        updateActiveState(tabId);
    }
    
    /**
     * Update active state on bottom nav items
     */
    function updateActiveState(activeTabId) {
        if (!activeTabId) {
            var activeHeaderTab = document.querySelector('.tabs .tab.active');
            if (activeHeaderTab) {
                activeTabId = activeHeaderTab.getAttribute('data-tab');
            }
        }
        
        // Remove active and chevron from all
        document.querySelectorAll('.bottom-nav-item').forEach(function(item) {
            if (item.getAttribute('data-nav') !== 'capture') {
                item.classList.remove('active');
            }
            // Remove existing chevron
            var existingChevron = item.querySelector('.nav-chevron');
            if (existingChevron) existingChevron.remove();
        });
        
        var activeNavItem = document.querySelector('.bottom-nav-item[data-nav="' + activeTabId + '"]');
        if (activeNavItem) {
            activeNavItem.classList.add('active');
            
            // Add chevron if this tab has a context sheet (not capture, not settings)
            if (activeTabId !== 'capture' && activeTabId !== 'settings') {
                var chevron = document.createElement('span');
                chevron.className = 'nav-chevron';
                chevron.textContent = '\u02C4';
                activeNavItem.appendChild(chevron);
            }
        }
        
        // Update tracking
        currentActiveTab = activeTabId;
        tabActivatedAt = Date.now();
    }
    
    /**
     * Listen for tab changes from header to sync state
     */
    function setupTabSync() {
        document.querySelectorAll('.tabs .tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                var tabId = tab.getAttribute('data-tab');
                updateActiveState(tabId);
            });
        });
    }
    
    /**
     * Initialize bottom nav when DOM is ready
     */
    function init() {
        createBottomNav();
        setupTabSync();
        
        // Handle ?tab= URL parameter (from cross-page navigation)
        var urlParams = new URLSearchParams(window.location.search);
        var tabParam = urlParams.get('tab');
        if (tabParam) {
            // Clean up URL
            window.history.replaceState({}, '', window.location.pathname);
            // Navigate to requested tab
            setTimeout(function() { handleNavClick(tabParam); }, 200);
        }
        
        // Sync bottom nav when sidebar navigates
        document.addEventListener('sidebar:navigate', function(e) {
            var tab = e.detail && e.detail.tab;
            if (tab) {
                updateActiveState(tab);
            }
        });

        // Hide chevron when sheet opens, show when it closes
        document.addEventListener('context-sheet:opened', function() {
            var chevrons = document.querySelectorAll('.nav-chevron');
            chevrons.forEach(function(c) { c.style.display = 'none'; });
        });

        document.addEventListener('context-sheet:closed', function() {
            var chevrons = document.querySelectorAll('.nav-chevron');
            chevrons.forEach(function(c) { c.style.display = ''; });
        });

        // Escape key closes modals
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                document.querySelectorAll('.capture-modal-overlay.visible').forEach(function(modal) {
                    closeModal(modal);
                });
            }
        });
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    window.bottomNav = {
        updateActiveState: updateActiveState
    };
    
})();
