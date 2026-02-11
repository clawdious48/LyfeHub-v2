/**
 * Kanban Mobile Navigation
 * =========================
 * Adds swipe navigation and column indicators for mobile view.
 * 
 * Features:
 * - Touch swipe left/right to change columns
 * - Column indicator with dots
 * - Previous/Next arrow buttons as fallback
 * - Preserves existing drag-drop functionality within visible columns
 */

const kanbanMobile = {
  // Configuration
  SWIPE_THRESHOLD: 50, // Minimum px to trigger swipe
  SWIPE_VELOCITY_THRESHOLD: 0.3, // Minimum velocity (px/ms)
  COLUMNS: ['planned', 'ready', 'in_progress', 'blocked', 'review', 'done'],
  COLUMN_NAMES: {
    planned: 'Planned',
    ready: 'Ready',
    in_progress: 'In Progress',
    blocked: 'Blocked',
    review: 'Review',
    done: 'Done'
  },

  // State
  currentColumnIndex: 0,
  touchStartX: 0,
  touchStartY: 0,
  touchStartTime: 0,
  currentTranslate: 0,
  isDragging: false,
  isInitialized: false,

  // DOM Elements
  board: null,
  boardContainer: null,
  navContainer: null,

  /**
   * Initialize mobile kanban navigation
   */
  init() {
    // Only initialize on mobile
    if (window.innerWidth > 640) {
      this.cleanup();
      return;
    }

    this.board = document.getElementById('board');
    if (!this.board) return;

    this.boardContainer = this.board.closest('.view-container') || this.board.closest('.board-container') || this.board.parentElement;
    
    // Prevent double initialization
    if (this.isInitialized) return;
    this.isInitialized = true;

    this.createNavigationUI();
    this.bindEvents();
    this.updateView();
    
    // Show swipe hint on first visit
    this.showSwipeHint();
  },

  /**
   * Create the navigation UI (indicator + arrows + dots)
   */
  createNavigationUI() {
    // Check if already exists
    if (document.querySelector('.kanban-mobile-nav')) return;

    const nav = document.createElement('div');
    nav.className = 'kanban-mobile-nav';
    nav.innerHTML = `
      <div class="kanban-column-indicator">
        <button class="kanban-nav-btn kanban-prev" aria-label="Previous column">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span class="kanban-column-title">Planned (1 of 6)</span>
        <button class="kanban-nav-btn kanban-next" aria-label="Next column">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
      <div class="kanban-dots">
        ${this.COLUMNS.map((status, i) => 
          `<div class="kanban-dot ${i === 0 ? 'active' : ''}" data-index="${i}" data-status="${status}"></div>`
        ).join('')}
      </div>
    `;

    // Insert before the board container
    this.boardContainer.parentElement.insertBefore(nav, this.boardContainer);
    this.navContainer = nav;
  },

  /**
   * Bind touch and click events
   */
  bindEvents() {
    // Touch events for swipe
    this.board.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    this.board.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.board.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });

    // Navigation button clicks
    const prevBtn = this.navContainer.querySelector('.kanban-prev');
    const nextBtn = this.navContainer.querySelector('.kanban-next');
    
    prevBtn.addEventListener('click', () => this.goToColumn(this.currentColumnIndex - 1));
    nextBtn.addEventListener('click', () => this.goToColumn(this.currentColumnIndex + 1));

    // Dot clicks
    this.navContainer.querySelectorAll('.kanban-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const index = parseInt(dot.dataset.index);
        this.goToColumn(index);
      });
    });

    // Handle resize
    window.addEventListener('resize', this.handleResize.bind(this));
  },

  /**
   * Touch start handler
   */
  handleTouchStart(e) {
    // Ignore if dragging a card
    if (e.target.closest('.task-card[draggable="true"]')) return;
    
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
    this.touchStartTime = Date.now();
    this.isDragging = false;
  },

  /**
   * Touch move handler
   */
  handleTouchMove(e) {
    if (this.touchStartX === 0) return;
    
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const deltaX = touchX - this.touchStartX;
    const deltaY = touchY - this.touchStartY;

    // Determine if horizontal swipe (vs vertical scroll)
    if (!this.isDragging) {
      // If more vertical than horizontal movement, ignore
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        this.touchStartX = 0;
        return;
      }
      
      // Start horizontal drag if threshold met
      if (Math.abs(deltaX) > 10) {
        this.isDragging = true;
        this.board.classList.add('swiping');
      }
    }

    if (this.isDragging) {
      e.preventDefault(); // Prevent scroll during horizontal swipe
      
      // Calculate translate with resistance at edges
      const baseTranslate = -this.currentColumnIndex * 100;
      let dragOffset = (deltaX / this.board.offsetWidth) * 100;
      
      // Add resistance at first and last columns
      if ((this.currentColumnIndex === 0 && deltaX > 0) || 
          (this.currentColumnIndex === this.COLUMNS.length - 1 && deltaX < 0)) {
        dragOffset *= 0.3; // Resistance factor
      }
      
      this.currentTranslate = baseTranslate + dragOffset;
      this.board.style.transform = `translateX(${this.currentTranslate}%)`;
    }
  },

  /**
   * Touch end handler
   */
  handleTouchEnd(e) {
    if (!this.isDragging) {
      this.touchStartX = 0;
      return;
    }

    this.board.classList.remove('swiping');
    
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - this.touchStartX;
    const deltaTime = Date.now() - this.touchStartTime;
    const velocity = Math.abs(deltaX) / deltaTime;

    let newIndex = this.currentColumnIndex;

    // Check if swipe meets threshold (distance or velocity)
    if (Math.abs(deltaX) > this.SWIPE_THRESHOLD || velocity > this.SWIPE_VELOCITY_THRESHOLD) {
      if (deltaX > 0 && this.currentColumnIndex > 0) {
        newIndex = this.currentColumnIndex - 1;
      } else if (deltaX < 0 && this.currentColumnIndex < this.COLUMNS.length - 1) {
        newIndex = this.currentColumnIndex + 1;
      }
    }

    this.goToColumn(newIndex);
    this.touchStartX = 0;
    this.isDragging = false;
  },

  /**
   * Navigate to a specific column
   */
  goToColumn(index) {
    // Clamp index to valid range
    index = Math.max(0, Math.min(index, this.COLUMNS.length - 1));
    
    this.currentColumnIndex = index;
    this.updateView();
  },

  /**
   * Update the visual state
   */
  updateView() {
    // Update board position
    const translateX = -this.currentColumnIndex * 100;
    this.board.style.transform = `translateX(${translateX}%)`;
    this.currentTranslate = translateX;

    const status = this.COLUMNS[this.currentColumnIndex];
    const columnName = this.COLUMN_NAMES[status];
    const taskCount = this.getTaskCount(status);

    // Update title
    const title = this.navContainer.querySelector('.kanban-column-title');
    title.textContent = `${columnName} (${this.currentColumnIndex + 1} of ${this.COLUMNS.length})`;

    // Update dots
    this.navContainer.querySelectorAll('.kanban-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === this.currentColumnIndex);
    });

    // Update arrow buttons
    const prevBtn = this.navContainer.querySelector('.kanban-prev');
    const nextBtn = this.navContainer.querySelector('.kanban-next');
    prevBtn.disabled = this.currentColumnIndex === 0;
    nextBtn.disabled = this.currentColumnIndex === this.COLUMNS.length - 1;
  },

  /**
   * Get task count for a column
   */
  getTaskCount(status) {
    const countEl = document.querySelector(`.task-count[data-count="${status}"]`);
    return countEl ? parseInt(countEl.textContent) || 0 : 0;
  },

  /**
   * Show swipe hint animation on first visit
   */
  showSwipeHint() {
    const hintShown = localStorage.getItem('kanban-swipe-hint-shown');
    if (hintShown) return;

    setTimeout(() => {
      this.board.classList.add('swipe-hint');
      setTimeout(() => {
        this.board.classList.remove('swipe-hint');
      }, 1500);
    }, 500);

    localStorage.setItem('kanban-swipe-hint-shown', 'true');
  },

  /**
   * Handle window resize
   */
  handleResize() {
    if (window.innerWidth > 640) {
      this.cleanup();
    } else if (!this.isInitialized) {
      this.init();
    }
  },

  /**
   * Cleanup for non-mobile views
   */
  cleanup() {
    if (this.navContainer) {
      this.navContainer.remove();
      this.navContainer = null;
    }
    if (this.board) {
      this.board.style.transform = '';
    }
    this.isInitialized = false;
    this.currentColumnIndex = 0;
  },

  /**
   * Go to a specific column by status name
   */
  goToColumnByStatus(status) {
    const index = this.COLUMNS.indexOf(status);
    if (index !== -1) {
      this.goToColumn(index);
    }
  }
};


// ============================================================================
// Apex Jobs Board - Similar Implementation
// ============================================================================

const apexKanbanMobile = {
  COLUMNS: ['active', 'pending_insurance', 'complete'],
  COLUMN_NAMES: {
    active: 'Active',
    pending_insurance: 'Pending Insurance',
    complete: 'Complete'
  },
  currentColumnIndex: 0,
  touchStartX: 0,
  touchStartY: 0,
  touchStartTime: 0,
  isDragging: false,
  isInitialized: false,
  board: null,
  navContainer: null,
  SWIPE_THRESHOLD: 50,
  SWIPE_VELOCITY_THRESHOLD: 0.3,

  init() {
    if (window.innerWidth > 640) {
      this.cleanup();
      return;
    }

    this.board = document.querySelector('.apex-board');
    if (!this.board) return;

    if (this.isInitialized) return;
    this.isInitialized = true;

    this.createNavigationUI();
    this.bindEvents();
    this.updateView();
  },

  createNavigationUI() {
    if (document.querySelector('.apex-kanban-mobile-nav')) return;

    const nav = document.createElement('div');
    nav.className = 'apex-kanban-mobile-nav kanban-mobile-nav';
    nav.innerHTML = `
      <div class="kanban-column-indicator">
        <button class="kanban-nav-btn kanban-prev" aria-label="Previous column">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span class="kanban-column-title">Active (1 of 3)</span>
        <button class="kanban-nav-btn kanban-next" aria-label="Next column">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
      <div class="kanban-dots">
        ${this.COLUMNS.map((status, i) => 
          `<div class="kanban-dot ${i === 0 ? 'active' : ''}" data-index="${i}" data-status="${status}"></div>`
        ).join('')}
      </div>
    `;

    const container = this.board.closest('.apex-view-container') || this.board.closest('.apex-board-container') || this.board.parentElement;
    container.insertBefore(nav, this.board);
    this.navContainer = nav;
  },

  bindEvents() {
    this.board.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    this.board.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.board.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });

    const prevBtn = this.navContainer.querySelector('.kanban-prev');
    const nextBtn = this.navContainer.querySelector('.kanban-next');
    
    prevBtn.addEventListener('click', () => this.goToColumn(this.currentColumnIndex - 1));
    nextBtn.addEventListener('click', () => this.goToColumn(this.currentColumnIndex + 1));

    this.navContainer.querySelectorAll('.kanban-dot').forEach(dot => {
      dot.addEventListener('click', () => this.goToColumn(parseInt(dot.dataset.index)));
    });

    window.addEventListener('resize', this.handleResize.bind(this));
  },

  handleTouchStart(e) {
    if (e.target.closest('.apex-job-card[draggable="true"]')) return;
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
    this.touchStartTime = Date.now();
    this.isDragging = false;
  },

  handleTouchMove(e) {
    if (this.touchStartX === 0) return;
    
    const deltaX = e.touches[0].clientX - this.touchStartX;
    const deltaY = e.touches[0].clientY - this.touchStartY;

    if (!this.isDragging) {
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        this.touchStartX = 0;
        return;
      }
      if (Math.abs(deltaX) > 10) {
        this.isDragging = true;
        this.board.classList.add('swiping');
      }
    }

    if (this.isDragging) {
      e.preventDefault();
      const baseTranslate = -this.currentColumnIndex * 100;
      let dragOffset = (deltaX / this.board.offsetWidth) * 100;
      
      if ((this.currentColumnIndex === 0 && deltaX > 0) || 
          (this.currentColumnIndex === this.COLUMNS.length - 1 && deltaX < 0)) {
        dragOffset *= 0.3;
      }
      
      this.board.style.transform = `translateX(${baseTranslate + dragOffset}%)`;
    }
  },

  handleTouchEnd(e) {
    if (!this.isDragging) {
      this.touchStartX = 0;
      return;
    }

    this.board.classList.remove('swiping');
    
    const deltaX = e.changedTouches[0].clientX - this.touchStartX;
    const deltaTime = Date.now() - this.touchStartTime;
    const velocity = Math.abs(deltaX) / deltaTime;

    let newIndex = this.currentColumnIndex;

    if (Math.abs(deltaX) > this.SWIPE_THRESHOLD || velocity > this.SWIPE_VELOCITY_THRESHOLD) {
      if (deltaX > 0 && this.currentColumnIndex > 0) {
        newIndex--;
      } else if (deltaX < 0 && this.currentColumnIndex < this.COLUMNS.length - 1) {
        newIndex++;
      }
    }

    this.goToColumn(newIndex);
    this.touchStartX = 0;
    this.isDragging = false;
  },

  goToColumn(index) {
    index = Math.max(0, Math.min(index, this.COLUMNS.length - 1));
    this.currentColumnIndex = index;
    this.updateView();
  },

  updateView() {
    this.board.style.transform = `translateX(${-this.currentColumnIndex * 100}%)`;

    const status = this.COLUMNS[this.currentColumnIndex];
    const title = this.navContainer.querySelector('.kanban-column-title');
    title.textContent = `${this.COLUMN_NAMES[status]} (${this.currentColumnIndex + 1} of ${this.COLUMNS.length})`;

    this.navContainer.querySelectorAll('.kanban-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === this.currentColumnIndex);
    });

    const prevBtn = this.navContainer.querySelector('.kanban-prev');
    const nextBtn = this.navContainer.querySelector('.kanban-next');
    prevBtn.disabled = this.currentColumnIndex === 0;
    nextBtn.disabled = this.currentColumnIndex === this.COLUMNS.length - 1;
  },

  handleResize() {
    if (window.innerWidth > 640) {
      this.cleanup();
    } else if (!this.isInitialized) {
      this.init();
    }
  },

  cleanup() {
    if (this.navContainer) {
      this.navContainer.remove();
      this.navContainer = null;
    }
    if (this.board) {
      this.board.style.transform = '';
    }
    this.isInitialized = false;
    this.currentColumnIndex = 0;
  }
};


// ============================================================================
// Initialize on DOM ready
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  kanbanMobile.init();
  apexKanbanMobile.init();
});

// Re-initialize when switching tabs (if board becomes visible)
document.addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (tab) {
    setTimeout(() => {
      if (tab.dataset.tab === 'projects') {
        kanbanMobile.init();
        apexKanbanMobile.init();
      }
    }, 100);
  }
});

// Export for global access
window.kanbanMobile = kanbanMobile;
window.apexKanbanMobile = apexKanbanMobile;
