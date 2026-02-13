/**
 * Floating Action Button (FAB) - Mobile Only
 * Single tap: Quick Add Task
 * Long press: Expand to show menu (Task, Note, Job)
 */

const fab = {
    container: null,
    btn: null,
    menu: null,
    backdrop: null,
    longPressTimer: null,
    longPressDuration: 500,
    isExpanded: false,
    pressStartTime: 0,

    init() {
        // Only initialize on mobile
        if (window.innerWidth >= 1201) return;

        this.createElements();
        this.bindEvents();
    },

    createElements() {
        // Create FAB container
        this.container = document.createElement('div');
        this.container.className = 'fab-container';
        this.container.innerHTML = `
            <div class="fab-backdrop"></div>
            <div class="fab-menu">
                <button class="fab-menu-item" data-action="task">
                    <span class="menu-icon">
                        <svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                    </span>
                    <span class="menu-label">Add Task</span>
                </button>
                <button class="fab-menu-item" data-action="note">
                    <span class="menu-icon">
                        <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
                    </span>
                    <span class="menu-label">Add Note</span>
                </button>
                <button class="fab-menu-item" data-action="job">
                    <span class="menu-icon">
                        <svg viewBox="0 0 24 24"><path d="M20 7h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 4h4v3h-4V4z"/></svg>
                    </span>
                    <span class="menu-label">Add Job</span>
                </button>
            </div>
            <button class="fab-btn" aria-label="Quick add">
                <span class="fab-icon"></span>
            </button>
        `;

        document.body.appendChild(this.container);

        this.btn = this.container.querySelector('.fab-btn');
        this.menu = this.container.querySelector('.fab-menu');
        this.backdrop = this.container.querySelector('.fab-backdrop');
    },

    bindEvents() {
        // Touch events for long press detection
        this.btn.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
        this.btn.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        this.btn.addEventListener('touchcancel', () => this.cancelLongPress());

        // Mouse events fallback
        this.btn.addEventListener('mousedown', (e) => this.handleTouchStart(e));
        this.btn.addEventListener('mouseup', (e) => this.handleTouchEnd(e));
        this.btn.addEventListener('mouseleave', () => this.cancelLongPress());

        // Menu item clicks
        this.menu.querySelectorAll('.fab-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleMenuAction(item.dataset.action);
            });
        });

        // Backdrop click to close
        this.backdrop.addEventListener('click', () => this.collapse());

        // Close on scroll
        window.addEventListener('scroll', () => {
            if (this.isExpanded) this.collapse();
        }, { passive: true });

        // Handle resize
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 1201) {
                this.container.style.display = 'none';
            } else {
                this.container.style.display = '';
            }
        });
    },

    handleTouchStart(e) {
        this.pressStartTime = Date.now();
        this.btn.classList.add('pressing');

        this.longPressTimer = setTimeout(() => {
            this.expand();
            // Haptic feedback if available
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }, this.longPressDuration);
    },

    handleTouchEnd(e) {
        const pressDuration = Date.now() - this.pressStartTime;
        this.cancelLongPress();

        // If not expanded and was a short tap, open quick add
        if (!this.isExpanded && pressDuration < this.longPressDuration) {
            e.preventDefault();
            quickAdd.open('task');
        }
    },

    cancelLongPress() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        this.btn.classList.remove('pressing');
    },

    expand() {
        this.isExpanded = true;
        this.container.classList.add('expanded');
    },

    collapse() {
        this.isExpanded = false;
        this.container.classList.remove('expanded');
    },

    handleMenuAction(action) {
        this.collapse();

        switch (action) {
            case 'task':
                quickAdd.open('task');
                break;
            case 'note':
                quickAdd.open('note');
                break;
            case 'job':
                quickAdd.open('job');
                break;
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => fab.init());
