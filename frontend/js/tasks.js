/**
 * Tasks Modal functionality
 * Handles the task item modal for creating/editing tasks
 */

const taskModal = {
    el: null,
    currentTask: null,
    subtasks: [],
    isImportant: false,
    selectedDays: [], // 0=Sun, 1=Mon, ... 6=Sat
    currentView: 'my-day',
    currentListId: null,
    tasks: [],
    lists: [],
    calendars: [], // Available calendars for selection
    selectedCalendarIds: [], // Selected calendar IDs for current task
    isEditMode: true,

    // Relation state
    selectedProjectId: null,
    selectedPeopleIds: [],
    selectedNoteIds: [],
    relationDisplayNames: {}, // { recordId: displayName }

    // List state
    selectedListId: null,

    // Metadata state
    selectedPriority: '',
    selectedEnergy: '',
    selectedLocation: '',

    displayMode: 'list', // 'list' or 'cards'
    cardSize: 'medium', // 'small', 'medium', 'large'
    sortMode: 'due', // 'due', 'created', 'custom'
    sortDirection: 'asc', // 'asc' or 'desc'
    customOrder: {}, // { viewKey: [taskId1, taskId2, ...] }

    init() {
        this.el = document.getElementById('task-item-modal');
        if (!this.el) return;
        
        this.bindEvents();
        this.bindViewSwitching();
        this.bindListEvents();
        this.bindDisplayToggle();
        this.initPanelSwipe();
        
        // More details toggle
        const moreDetailsToggle = document.getElementById('task-more-details-toggle');
        if (moreDetailsToggle) {
            moreDetailsToggle.addEventListener('click', () => this.toggleMoreDetails());
        }

        // Metadata preset buttons
        this.el.querySelectorAll('.task-metadata-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                const field = btn.dataset.field;
                const value = btn.dataset.value;
                if (field === 'priority') this.selectedPriority = value;
                else if (field === 'energy') this.selectedEnergy = value;
                else if (field === 'location') this.selectedLocation = value;
                this.updateMetadataPresets();
            });
        });

        // List selector
        const listSelector = document.getElementById('task-list-selector');
        if (listSelector) {
            listSelector.addEventListener('change', (e) => {
                this.selectedListId = e.target.value || null;
            });
        }

        // Relation add buttons
        this.el.querySelectorAll('.task-relation-add-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const type = btn.dataset.relationType;
                this.showRelationDropdown(type, btn);
            });
        });

        // Only load tasks if Tasks tab is active
        const tasksTab = document.querySelector('.tab-content[data-tab="tasks"]');
        if (tasksTab && tasksTab.classList.contains('active')) {
            this.loadTasks();
            this.loadCounts();
            this.loadLists();
        }
    },
    
    bindDisplayToggle() {
        document.querySelectorAll('.tasks-display-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const display = btn.dataset.display;
                this.switchDisplay(display);
            });
        });
        
        // Card size buttons
        document.querySelectorAll('.card-size-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const size = btn.dataset.size;
                this.switchCardSize(size);
            });
        });
        
        // Sort buttons
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const sort = btn.dataset.sort;
                this.handleSortClick(sort, btn);
            });
        });
        
        // Load custom order from localStorage
        this.loadCustomOrder();
    },
    
    loadCustomOrder() {
        try {
            const saved = localStorage.getItem('taskCustomOrder');
            this.customOrder = saved ? JSON.parse(saved) : {};
        } catch (e) {
            this.customOrder = {};
        }
    },
    
    saveCustomOrder() {
        localStorage.setItem('taskCustomOrder', JSON.stringify(this.customOrder));
    },
    
    getOrderKey() {
        // Create a unique key for the current view
        return `${this.currentView}_${this.currentListId || 'none'}`;
    },
    
    handleSortClick(sort, btn) {
        if (sort === 'custom') {
            // Custom doesn't have direction
            this.sortMode = sort;
            this.sortDirection = 'asc';
        } else if (this.sortMode === sort) {
            // Same sort clicked - toggle direction
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            // Different sort - switch to it with asc
            this.sortMode = sort;
            this.sortDirection = 'asc';
        }
        
        // Update button states
        document.querySelectorAll('.sort-btn').forEach(b => {
            b.classList.remove('active', 'desc');
            if (b.dataset.sort === this.sortMode) {
                b.classList.add('active');
                if (this.sortDirection === 'desc') {
                    b.classList.add('desc');
                }
            }
        });
        
        this.switchSort(this.sortMode);
    },
    
    switchSort(mode) {
        this.sortMode = mode;
        
        const listContainer = document.getElementById('tasks-list');
        const cardsContainer = document.getElementById('tasks-cards');
        
        // Toggle custom-sort class for drag cursor
        if (mode === 'custom') {
            listContainer?.classList.add('custom-sort');
            cardsContainer?.classList.add('custom-sort');
        } else {
            listContainer?.classList.remove('custom-sort');
            cardsContainer?.classList.remove('custom-sort');
        }
        
        this.renderTasks();
    },
    
    sortTasks(tasks) {
        const dir = this.sortDirection === 'desc' ? -1 : 1;
        
        if (this.sortMode === 'custom') {
            const orderKey = this.getOrderKey();
            const order = this.customOrder[orderKey] || [];
            
            if (order.length > 0) {
                // Sort by custom order
                return [...tasks].sort((a, b) => {
                    const aIdx = order.indexOf(a.id);
                    const bIdx = order.indexOf(b.id);
                    if (aIdx === -1 && bIdx === -1) return 0;
                    if (aIdx === -1) return 1;
                    if (bIdx === -1) return -1;
                    return aIdx - bIdx;
                });
            }
            return tasks;
        } else if (this.sortMode === 'created') {
            return [...tasks].sort((a, b) => {
                // Completed at bottom
                if (a.completed !== b.completed) return a.completed ? 1 : -1;
                // Then by created date
                const dateCompare = new Date(a.created_at) - new Date(b.created_at);
                return dateCompare * dir;
            });
        } else {
            // Default: due date (pure date sorting)
            return [...tasks].sort((a, b) => {
                // Completed at bottom
                if (a.completed !== b.completed) return a.completed ? 1 : -1;
                // Sort by due date
                if (!a.due_date && !b.due_date) return 0;
                if (!a.due_date) return 1; // No due date goes to bottom
                if (!b.due_date) return -1;
                // Compare dates, then times if dates are equal
                const dateCompare = a.due_date.localeCompare(b.due_date);
                if (dateCompare !== 0) return dateCompare * dir;
                // Same date - compare times
                if (a.due_time && b.due_time) return a.due_time.localeCompare(b.due_time) * dir;
                if (a.due_time) return -1 * dir; // Has time comes before no time
                if (b.due_time) return 1 * dir;
                return 0;
            });
        }
    },
    
    setupDragSort(container, itemSelector) {
        if (this.sortMode !== 'custom') return;
        
        let draggedItem = null;
        
        container.querySelectorAll(itemSelector).forEach(item => {
            item.setAttribute('draggable', 'true');
            
            item.addEventListener('dragstart', (e) => {
                draggedItem = item;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                container.querySelectorAll(itemSelector).forEach(i => i.classList.remove('drag-over'));
                draggedItem = null;
            });
            
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (draggedItem && draggedItem !== item) {
                    item.classList.add('drag-over');
                }
            });
            
            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over');
            });
            
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.classList.remove('drag-over');
                
                if (draggedItem && draggedItem !== item) {
                    // Reorder in DOM
                    const items = [...container.querySelectorAll(itemSelector)];
                    const draggedIdx = items.indexOf(draggedItem);
                    const targetIdx = items.indexOf(item);
                    
                    if (draggedIdx < targetIdx) {
                        item.after(draggedItem);
                    } else {
                        item.before(draggedItem);
                    }
                    
                    // Save new order
                    const newOrder = [...container.querySelectorAll(itemSelector)].map(i => i.dataset.id);
                    const orderKey = this.getOrderKey();
                    this.customOrder[orderKey] = newOrder;
                    this.saveCustomOrder();
                }
            });
        });
    },
    
    switchDisplay(display) {
        this.displayMode = display;
        
        // Update buttons
        document.querySelectorAll('.tasks-display-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.display === display);
        });
        
        // Update containers
        document.querySelectorAll('.tasks-display').forEach(container => {
            container.classList.toggle('active', container.dataset.display === display);
        });
        
        // Show/hide card size control
        const sizeControl = document.getElementById('card-size-control');
        if (sizeControl) {
            sizeControl.style.display = display === 'cards' ? 'flex' : 'none';
        }
        
        // Re-render tasks for the new display
        this.renderTasks();
    },
    
    switchCardSize(size) {
        this.cardSize = size;
        
        // Update buttons
        document.querySelectorAll('.card-size-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.size === size);
        });
        
        // Update cards container class
        const cardsContainer = document.getElementById('tasks-cards');
        if (cardsContainer) {
            cardsContainer.classList.remove('size-small', 'size-medium', 'size-large');
            cardsContainer.classList.add('size-' + size);
        }
        
        // Re-render to show appropriate content
        this.renderTasks();
    },

    bindEvents() {
        // Close modal
        this.el.querySelector('.modal-backdrop').addEventListener('click', () => this.close());
        this.el.querySelector('.modal-close').addEventListener('click', () => this.close());
        
        // Add Task button (in view controls bar)
        const addTaskBtn = document.getElementById('add-task-btn-tasks');
        if (addTaskBtn) {
            addTaskBtn.addEventListener('click', () => this.openNew());
        }
        
        // Quick add input
        const quickAddInput = document.getElementById('quick-add-task');
        if (quickAddInput) {
            quickAddInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                    this.openNew(e.target.value.trim());
                    e.target.value = '';
                }
            });
        }
        
        // Important toggle
        const importantBtn = document.getElementById('task-important-btn');
        if (importantBtn) {
            importantBtn.addEventListener('click', () => this.toggleImportant());
        }
        
        // Edit mode toggle
        const editModeBtn = document.getElementById('task-edit-mode-btn');
        if (editModeBtn) {
            editModeBtn.addEventListener('click', () => this.toggleEditMode());
        }
        
        // Complete toggle
        const completeBtn = document.getElementById('task-complete-btn');
        if (completeBtn) {
            completeBtn.addEventListener('click', () => this.currentTask && this.toggleComplete(this.currentTask.id));
        }
        
        // Save button
        const saveBtn = document.getElementById('save-task-item');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.save());
        }
        
        // Delete button
        const deleteBtn = document.getElementById('delete-task-item');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.delete());
        }
        
        // Date/time display sync
        const dueInput = document.getElementById('task-item-due');
        const timeInput = document.getElementById('task-item-time');
        if (dueInput) {
            dueInput.addEventListener('change', () => this.updateDateDisplay());
        }
        if (timeInput) {
            timeInput.addEventListener('change', () => this.updateTimeDisplay());
        }
        
        // Subtask input
        const subtaskInput = document.getElementById('subtask-input');
        if (subtaskInput) {
            subtaskInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                    this.addSubtask(e.target.value.trim());
                    e.target.value = '';
                }
            });
        }
        
        // Markdown toolbar
        this.el.querySelectorAll('.markdown-toolbar button[data-md]').forEach(btn => {
            btn.addEventListener('click', () => this.insertMarkdown(btn.dataset.md));
        });
        this.el.querySelectorAll('.md-dropdown-menu button[data-md]').forEach(btn => {
            btn.addEventListener('click', () => this.insertMarkdown(btn.dataset.md));
        });
        
        // Recurring presets
        this.el.querySelectorAll('.task-recurring-preset').forEach(btn => {
            btn.addEventListener('click', () => this.selectRecurringPreset(btn));
        });
        
        // Day of week buttons
        this.el.querySelectorAll('.task-day-btn').forEach(btn => {
            btn.addEventListener('click', () => this.toggleDay(btn));
        });
        
        // Keyboard shortcut to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.el.classList.contains('open')) {
                this.close();
            }
        });
        
        // Event delegation for task list interactions (checkbox, star, content click)
        const listContainer = document.getElementById('tasks-list');
        const cardsContainer = document.getElementById('tasks-cards');
        
        const handleTaskClick = (e) => { console.log("[DELEGATION] Click received:", e.target.tagName, e.target.className);
            const target = e.target;
            
            // Check if checkbox was clicked (or its SVG child)
            console.log("[DELEGATION] Looking for checkbox..."); const checkbox = target.closest('.task-item-checkbox, .task-card-checkbox');
            console.log("[DELEGATION] checkbox found:", checkbox); if (checkbox) {
                e.stopPropagation();
                const taskItem = checkbox.closest('.task-item, .task-card');
                const taskId = taskItem?.dataset?.id;
                console.log("[DELEGATION] taskItem:", taskItem, "taskId:", taskId); if (taskId) { console.log("[DELEGATION] calling toggleComplete with", taskId);
                    this.toggleComplete(taskId);
                }
                return;
            }
            
            // Check if sun/myday was clicked (or its SVG child)
            const myday = target.closest('.task-item-myday, .task-card-myday');
            if (myday) {
                e.stopPropagation();
                const taskItem = myday.closest('.task-item, .task-card');
                const taskId = taskItem?.dataset?.id;
                if (taskId) {
                    // Optimistic toggle
                    myday.classList.toggle('active');
                    const svg = myday.querySelector('svg');
                    if (svg) {
                        svg.setAttribute('fill', myday.classList.contains('active') ? 'currentColor' : 'none');
                    }
                    fetch(`/api/tasks/${taskId}/toggle-my-day`, {
                        method: 'POST',
                        credentials: 'include'
                    }).then(() => {
                        if (window.taskManager) taskManager.loadTasks();
                    }).catch(err => {
                        console.error('Failed to toggle my day:', err);
                        myday.classList.toggle('active');
                    });
                }
                return;
            }

            // Check if star was clicked (or its SVG child)
            const star = target.closest('.task-item-star, .task-card-star');
            if (star) {
                e.stopPropagation();
                const taskItem = star.closest('.task-item, .task-card');
                const taskId = taskItem?.dataset?.id;
                console.log("[DELEGATION] taskItem:", taskItem, "taskId:", taskId); if (taskId) { console.log("[DELEGATION] calling toggleComplete with", taskId);
                    this.toggleImportantTask(taskId);
                }
                return;
            }
            
            // Check if card subtask was clicked
            const cardSubtask = target.closest('.task-card-subtask');
            if (cardSubtask) {
                e.stopPropagation();
                const taskCard = cardSubtask.closest('.task-card');
                const taskId = taskCard?.dataset?.id;
                const idx = parseInt(cardSubtask.dataset.index, 10);
                if (taskId && !isNaN(idx)) {
                    this.toggleCardSubtask(taskId, idx);
                }
                return;
            }
            
            // Ignore clicks inside subtask list container (prevent opening edit modal)
            if (target.closest('.task-card-subtasks-list')) {
                e.stopPropagation();
                return;
            }
            
            // Check if task content/card was clicked (open edit modal)
            const taskContent = target.closest('.task-item-content');
            const taskCard = target.closest('.task-card');
            if (taskContent || taskCard) {
                const taskItem = target.closest('.task-item, .task-card');
                const taskId = taskItem?.dataset?.id;
                console.log("[DELEGATION] taskItem:", taskItem, "taskId:", taskId); if (taskId) { console.log("[DELEGATION] calling toggleComplete with", taskId);
                    const task = this.tasks.find(t => t.id === taskId);
                    if (task) {
                        this.openEdit(task);
                    }
                }
            }
        };
        
        console.log("[INIT] Attaching listeners - listContainer:", listContainer, "cardsContainer:", cardsContainer); if (listContainer) {
            listContainer.addEventListener('click', handleTaskClick);
        }
        if (cardsContainer) {
            cardsContainer.addEventListener('click', handleTaskClick);
        }
    },

    bindViewSwitching() {
        // Bind to the horizontal view toggle buttons in view-controls
        document.querySelectorAll('.tasks-view-toggle .view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                this.switchView(view);
            });
        });
    },

    switchView(view) {
        this.currentView = view;
        
        // Update active button in view toggle
        document.querySelectorAll('.tasks-view-toggle .view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        this.loadTasks();
    },

    async loadTasks() {
        try {
            // Send user's local date for My Day filtering
            const now = new Date();
            const userToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            
            const response = await fetch(`/api/tasks?view=${this.currentView}&today=${userToday}`, {
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Failed to load tasks');
            
            const data = await response.json();
            console.log('[loadTasks] received data:', data);
            this.tasks = data.items || [];
            console.log('[loadTasks] tasks set to:', this.tasks);
            this.renderTasks();
        } catch (err) {
            console.error('Error loading tasks:', err);
        }
    },

    async loadCounts() {
        try {
            const now = new Date();
            const userToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            
            const response = await fetch(`/api/tasks/counts?today=${userToday}`, {
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Failed to load counts');
            
            const data = await response.json();
            const counts = data.counts || {};
            
            // Update sidebar counts
            Object.keys(counts).forEach(view => {
                const countEl = document.querySelector(`.tasks-count[data-count="${view}"]`);
                if (countEl) {
                    countEl.textContent = counts[view] || 0;
                }
            });
        } catch (err) {
            console.error('Error loading counts:', err);
        }
    },

    // ===== LIST MANAGEMENT =====
    
    selectedListColor: '#bf5af2',
    pinnedLists: [],
    
    bindListEvents() {
        // New List button in dropdown
        const addListBtn = document.getElementById('add-list-btn');
        if (addListBtn) {
            addListBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openNewListModal();
            });
        }
        
        // New List modal
        const newListModal = document.getElementById('new-list-modal');
        if (newListModal) {
            newListModal.querySelector('.modal-backdrop').addEventListener('click', () => this.closeNewListModal());
            newListModal.querySelector('.modal-close').addEventListener('click', () => this.closeNewListModal());
            newListModal.querySelector('.modal-cancel').addEventListener('click', () => this.closeNewListModal());
            
            const createBtn = document.getElementById('create-list-btn');
            if (createBtn) {
                createBtn.addEventListener('click', () => this.createList());
            }
            
            // Enter key in input
            const nameInput = document.getElementById('new-list-name');
            if (nameInput) {
                nameInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.createList();
                    }
                });
            }
            
            // Color picker
            const colorPicker = document.getElementById('list-color-picker');
            if (colorPicker) {
                colorPicker.querySelectorAll('.color-swatch').forEach(swatch => {
                    swatch.addEventListener('click', () => {
                        colorPicker.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                        swatch.classList.add('active');
                        this.selectedListColor = swatch.dataset.color;
                    });
                });
            }
        }
        
        // Setup drag and drop for view bar
        this.setupDragAndDrop();
        
        // Load pinned lists from localStorage
        this.loadPinnedLists();
    },
    
    setupDragAndDrop() {
        const viewToggle = document.querySelector('.tasks-view-toggle');
        const pinnedContainer = document.getElementById('pinned-lists-container');
        
        if (viewToggle) {
            viewToggle.addEventListener('dragover', (e) => {
                e.preventDefault();
                viewToggle.classList.add('drag-over');
            });
            
            viewToggle.addEventListener('dragleave', () => {
                viewToggle.classList.remove('drag-over');
            });
            
            viewToggle.addEventListener('drop', (e) => {
                e.preventDefault();
                viewToggle.classList.remove('drag-over');
                const listId = e.dataTransfer.getData('text/plain');
                if (listId) {
                    this.pinList(listId);
                }
            });
        }
        
        if (pinnedContainer) {
            pinnedContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
            });
            
            pinnedContainer.addEventListener('drop', (e) => {
                e.preventDefault();
                const listId = e.dataTransfer.getData('text/plain');
                if (listId) {
                    this.pinList(listId);
                }
            });
        }
    },
    
    loadPinnedLists() {
        try {
            const saved = localStorage.getItem('pinnedTaskLists');
            this.pinnedLists = saved ? JSON.parse(saved) : [];
        } catch (e) {
            this.pinnedLists = [];
        }
    },
    
    savePinnedLists() {
        localStorage.setItem('pinnedTaskLists', JSON.stringify(this.pinnedLists));
    },
    
    pinList(listId) {
        if (!this.pinnedLists.includes(listId)) {
            this.pinnedLists.push(listId);
            this.savePinnedLists();
            this.renderPinnedLists();
        }
    },
    
    unpinList(listId) {
        this.pinnedLists = this.pinnedLists.filter(id => id !== listId);
        this.savePinnedLists();
        this.renderPinnedLists();
    },
    
    renderPinnedLists() {
        const container = document.getElementById('pinned-lists-container');
        if (!container) return;
        
        const pinnedListData = this.pinnedLists
            .map(id => this.lists.find(l => l.id === id))
            .filter(Boolean);
        
        if (pinnedListData.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        container.innerHTML = `
            <div class="pinned-separator"></div>
            ${pinnedListData.map(list => `
                <button class="pinned-list-btn ${this.currentListId === list.id ? 'active' : ''}" 
                        data-list-id="${list.id}"
                        style="--list-color: ${list.color || '#bf5af2'}"
                        onclick="taskModal.switchToList('${list.id}')"
                        oncontextmenu="event.preventDefault(); taskModal.unpinList('${list.id}');"
                        title="Right-click to unpin">
                    <span class="list-icon"></span>
                    <span class="list-name">${this.escapeHtml(list.name)}</span>
                </button>
            `).join('')}
        `;
    },

    async loadLists() {
        try {
            const response = await fetch('/api/task-lists', {
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Failed to load lists');
            
            const data = await response.json();
            this.lists = data.lists || [];
            this.renderListsDropdown();
            this.renderPinnedLists();
        } catch (err) {
            console.error('Error loading lists:', err);
        }
    },

    renderListsDropdown() {
        const container = document.getElementById('my-lists-items');
        if (!container) return;
        
        if (this.lists.length === 0) {
            container.innerHTML = '<div class="my-lists-empty">No lists yet</div>';
            return;
        }
        
        container.innerHTML = this.lists.map(list => `
            <div class="my-lists-item ${this.currentListId === list.id ? 'active' : ''}" 
                 data-list-id="${list.id}" 
                 draggable="true"
                 onclick="taskModal.switchToList('${list.id}')"
                 ondragstart="event.dataTransfer.setData('text/plain', '${list.id}'); this.classList.add('dragging');"
                 ondragend="this.classList.remove('dragging');">
                <span class="list-icon" style="background: ${list.color || '#bf5af2'}; --list-color: ${list.color || '#bf5af2'}"></span>
                <span class="list-name">${this.escapeHtml(list.name)}</span>
                <span class="list-count">${list.task_count || 0}</span>
            </div>
        `).join('');
    },

    switchToList(listId) {
        this.currentListId = listId;
        this.currentView = 'list:' + listId;
        
        // Update view toggle buttons (deselect all smart views)
        document.querySelectorAll('.tasks-view-toggle .view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Update list dropdown items
        document.querySelectorAll('.my-lists-item').forEach(item => {
            item.classList.toggle('active', item.dataset.listId === listId);
        });
        
        this.loadTasks();
    },

    openNewListModal() {
        const modal = document.getElementById('new-list-modal');
        if (!modal) return;
        
        document.getElementById('new-list-name').value = '';
        
        // Reset color picker to default (purple)
        this.selectedListColor = '#bf5af2';
        const colorPicker = document.getElementById('list-color-picker');
        if (colorPicker) {
            colorPicker.querySelectorAll('.color-swatch').forEach(s => {
                s.classList.toggle('active', s.dataset.color === '#bf5af2');
            });
        }
        
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
        
        setTimeout(() => {
            document.getElementById('new-list-name').focus();
        }, 100);
    },

    closeNewListModal() {
        const modal = document.getElementById('new-list-modal');
        if (modal) {
            modal.classList.remove('open');
            document.body.style.overflow = '';
        }
    },

    async createList() {
        const nameInput = document.getElementById('new-list-name');
        const name = nameInput.value.trim();
        
        if (!name) {
            nameInput.focus();
            return;
        }
        
        try {
            const response = await fetch('/api/task-lists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name, color: this.selectedListColor })
            });
            
            if (!response.ok) throw new Error('Failed to create list');
            
            const data = await response.json();
            this.closeNewListModal();
            this.loadLists();
            this.showToast(`List "${name}" created!`);
            
            // Optionally switch to the new list
            this.switchToList(data.list.id);
        } catch (err) {
            console.error('Error creating list:', err);
            this.showToast('Error creating list');
        }
    },

    renderTasks() {
        console.log('[renderTasks] called, tasks:', this.tasks);
        const listContainer = document.getElementById('tasks-list');
        const cardsContainer = document.getElementById('tasks-cards');
        const emptyEl = document.getElementById('tasks-empty');
        
        if (!this.tasks.length) {
            listContainer.innerHTML = '';
            cardsContainer.innerHTML = '';
            emptyEl.style.display = '';
            return;
        }
        
        emptyEl.style.display = 'none';
        
        // Sort tasks based on current sort mode
        const sortedTasks = this.sortTasks(this.tasks);
        
        // Helper to render a single task item
        const renderTaskItem = (task) => {
            const _today = new Date();
            const _todayStr = `${_today.getFullYear()}-${String(_today.getMonth() + 1).padStart(2, '0')}-${String(_today.getDate()).padStart(2, '0')}`;
            const isDueToday = task.due_date && task.due_date.substring(0, 10) === _todayStr;
            const dueClass = task.due_date ? this.getDueClass(task.due_date) : '';
            const dueText = task.due_date ? this.formatDueDate(task.due_date) : '';
            const timeText = task.due_time
                ? (task.due_time_end ? `${this.formatTime(task.due_time)} - ${this.formatTime(task.due_time_end)}` : this.formatTime(task.due_time))
                : '';
            const hasDue = task.due_date || task.due_time;
            const isToday = dueClass === 'today';
            
            return `
            <div class="task-item ${task.completed ? 'completed' : ''} ${isToday ? 'due-today' : ''}" data-id="${task.id}">
                <button type="button" class="task-item-checkbox">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                </button>
                ${hasDue ? `<span class="task-item-due ${dueClass}">${dueText}${timeText ? ' ' + timeText : ''}</span>` : ''}
                <div class="task-item-content">
                    <span class="task-item-title">${this.escapeHtml(task.title)}</span>
                    ${task.recurring ? `<span class="task-item-recurring">🔄</span>` : ''}
                </div>
                <button type="button" class="task-item-myday ${isDueToday ? 'active' : ''}" title="Add to My Day">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="${isDueToday ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                    </svg>
                </button>
                <button type="button" class="task-item-star ${task.important ? 'active' : ''}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="${task.important ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                </button>
            </div>
        `};
        
        // Render List View - special handling for My Day (recurring first)
        if (this.currentView === 'my-day') {
            const recurringTasks = sortedTasks.filter(t => t.recurring);
            const otherTasks = sortedTasks.filter(t => !t.recurring);
            
            let html = recurringTasks.map(renderTaskItem).join('');
            if (recurringTasks.length > 0 && otherTasks.length > 0) {
                html += '<div class="task-section-separator"></div>';
            }
            html += otherTasks.map(renderTaskItem).join('');
            listContainer.innerHTML = html;
        } else {
            listContainer.innerHTML = sortedTasks.map(renderTaskItem).join('');
        }
        
        // Render Cards View
        // Apply size class
        cardsContainer.classList.remove('size-small', 'size-medium', 'size-large');
        cardsContainer.classList.add('size-' + this.cardSize);
        
        cardsContainer.innerHTML = sortedTasks.map(task => {
            const _today2 = new Date();
            const _todayStr2 = `${_today2.getFullYear()}-${String(_today2.getMonth() + 1).padStart(2, '0')}-${String(_today2.getDate()).padStart(2, '0')}`;
            const isDueToday = task.due_date && task.due_date.substring(0, 10) === _todayStr2;
            const subtasks = task.subtasks || [];
            const subtaskCount = subtasks.length;
            const subtasksDone = subtasks.filter(s => s.completed).length;
            
            // Description - show more for larger sizes
            let descLength = this.cardSize === 'small' ? 50 : (this.cardSize === 'large' ? 300 : 150);
            let descHtml = '';
            if (task.description) {
                const truncated = task.description.substring(0, descLength);
                descHtml = `<div class="task-card-description">${this.escapeHtml(truncated)}${task.description.length > descLength ? '...' : ''}</div>`;
            }
            
            // Subtasks list - only for large size
            let subtasksListHtml = '';
            if (this.cardSize === 'large' && subtaskCount > 0) {
                const maxShow = 4;
                const showSubtasks = subtasks.slice(0, maxShow);
                subtasksListHtml = `
                    <div class="task-card-subtasks-list">
                        ${showSubtasks.map((st, idx) => `
                            <div class="task-card-subtask ${st.completed ? 'completed' : ''}" data-index="${idx}">
                                <span class="task-card-subtask-check">
                                    ${st.completed ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
                                </span>
                                <span>${this.escapeHtml(st.title)}</span>
                            </div>
                        `).join('')}
                        ${subtaskCount > maxShow ? `<div class="task-card-subtask" style="color: var(--text-muted); cursor: default;">+${subtaskCount - maxShow} more...</div>` : ''}
                    </div>
                `;
            }
            
            // Date/time header
            let dateTimeHtml = '';
            if (task.due_date || task.recurring) {
                const dateStr = task.due_date ? this.formatDueDate(task.due_date) : '';
                const timeStr = task.due_time
                    ? (task.due_time_end ? `${this.formatTime(task.due_time)} - ${this.formatTime(task.due_time_end)}` : this.formatTime(task.due_time))
                    : '';
                const recurStr = task.recurring ? '🔄' : '';
                dateTimeHtml = `
                    <div class="task-card-datetime ${task.due_date ? this.getDueClass(task.due_date) : ''}">
                        ${task.due_date ? `<span class="task-card-date">📅 ${dateStr}</span>` : ''}
                        ${timeStr ? `<span class="task-card-time">🕐 ${timeStr}</span>` : ''}
                        ${recurStr}
                    </div>
                `;
            }
            
            return `
            <div class="task-card ${task.completed ? 'completed' : ''}" data-id="${task.id}">
                ${dateTimeHtml}
                <div class="task-card-header">
                    <button class="task-card-checkbox">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </button>
                    <span class="task-card-title">${this.escapeHtml(task.title)}</span>
                    <button class="task-card-myday task-item-myday ${isDueToday ? 'active' : ''}" title="Add to My Day">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="${isDueToday ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                        </svg>
                    </button>
                    <button class="task-card-star ${task.important ? 'active' : ''}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="${task.important ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                    </button>
                </div>
                ${descHtml}
                <div class="task-card-meta">
                    ${subtaskCount > 0 && this.cardSize !== 'large' ? `<span class="task-card-subtasks">☑️ ${subtasksDone}/${subtaskCount}</span>` : ''}
                </div>
                ${subtasksListHtml}
            </div>
        `}).join('');
        
        // Setup drag-drop for custom sorting
        if (this.sortMode === 'custom') {
            this.setupDragSort(listContainer, '.task-item');
            this.setupDragSort(cardsContainer, '.task-card');
        }
    },

    getDueClass(dueDate) {
        const today = new Date().toISOString().split('T')[0];
        const dueMs = new Date(dueDate + 'T00:00:00').getTime();
        const todayMs = new Date(today + 'T00:00:00').getTime();
        const daysDiff = Math.floor((dueMs - todayMs) / (1000 * 60 * 60 * 24));
        
        // Overdue (past due)
        if (daysDiff < 0) {
            const daysOverdue = Math.abs(daysDiff);
            if (daysOverdue >= 5) return 'overdue overdue-red';
            if (daysOverdue >= 3) return 'overdue overdue-orange';
            return 'overdue overdue-yellow';
        }
        
        // Today
        if (daysDiff === 0) return 'today';
        
        // Upcoming
        if (daysDiff === 1) return 'upcoming upcoming-green';
        if (daysDiff <= 3) return 'upcoming upcoming-blue';
        
        return '';
    },

    formatDueDate(dueDate) {
        const today = new Date().toISOString().split('T')[0];
        if (dueDate === today) return 'Today';
        
        const date = new Date(dueDate + 'T00:00:00');
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    },

    async toggleComplete(id) {
        try {
            const response = await fetch(`/api/tasks/${id}/toggle`, {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Failed to toggle task');

            this.loadTasks();
            this.loadCounts();
        } catch (err) {
            console.error('Error toggling task:', err);
        }
    },

    async toggleImportantTask(id) {
        try {
            const task = this.tasks.find(t => t.id === id);
            if (!task) return;
            
            const response = await fetch(`/api/tasks/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ important: !task.important })
            });
            
            if (!response.ok) throw new Error('Failed to update task');
            
            this.loadTasks();
            this.loadCounts();
        } catch (err) {
            console.error('Error updating task:', err);
        }
    },

    async toggleCardSubtask(taskId, subtaskIndex) {
        try {
            const task = this.tasks.find(t => t.id === taskId);
            if (!task || !task.subtasks) return;
            
            // Toggle the subtask
            const subtasks = [...task.subtasks];
            subtasks[subtaskIndex].completed = !subtasks[subtaskIndex].completed;
            
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ subtasks })
            });
            
            if (!response.ok) throw new Error('Failed to update subtask');
            
            // Update local state and re-render
            task.subtasks = subtasks;
            this.renderTasks();
        } catch (err) {
            console.error('Error toggling subtask:', err);
        }
    },

    // ========== Two-Panel Swipe (mobile only) ==========
    initPanelSwipe() {
        const track = this.el.querySelector('.task-panels-track');
        const moreBtn = this.el.querySelector('.task-panel-more-btn');
        if (!track) return;

        this._panelIndex = 0;

        // "More options" button
        if (moreBtn) {
            moreBtn.addEventListener('click', () => this.goToPanel(1));
        }

        // Touch swipe
        let startX = 0, startY = 0, tracking = false;
        track.addEventListener('touchstart', (e) => {
            if (window.innerWidth > 640) return;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            tracking = true;
        }, { passive: true });

        track.addEventListener('touchmove', (e) => {
            if (!tracking || window.innerWidth > 640) return;
            const dx = e.touches[0].clientX - startX;
            const dy = e.touches[0].clientY - startY;
            // If mostly vertical, let it scroll
            if (Math.abs(dy) > Math.abs(dx)) { tracking = false; return; }
            // Prevent vertical scroll while swiping horizontally
            if (Math.abs(dx) > 10) e.preventDefault();
        }, { passive: false });

        track.addEventListener('touchend', (e) => {
            if (!tracking || window.innerWidth > 640) return;
            tracking = false;
            const dx = e.changedTouches[0].clientX - startX;
            if (dx < -50 && this._panelIndex === 0) this.goToPanel(1);
            else if (dx > 50 && this._panelIndex === 1) this.goToPanel(0);
        }, { passive: true });
    },

    goToPanel(index) {
        this._panelIndex = index;
        const track = this.el.querySelector('.task-panels-track');
        if (track && window.innerWidth <= 640) {
            track.style.transform = `translateX(${index * -50}%)`;
        }
        // Update dots
        const dots = this.el.querySelectorAll('.task-panel-dot');
        dots.forEach((d, i) => d.classList.toggle('active', i === index));
        // Toggle "More" button
        const more = this.el.querySelector('.task-panel-more');
        if (more) more.classList.toggle('hidden', index === 1);
    },

    resetPanels() {
        this._panelIndex = 0;
        const track = this.el.querySelector('.task-panels-track');
        if (track) track.style.transform = '';
        const dots = this.el.querySelectorAll('.task-panel-dot');
        dots.forEach((d, i) => d.classList.toggle('active', i === 0));
        const more = this.el.querySelector('.task-panel-more');
        if (more) more.classList.remove('hidden');
    },

    openNew(title = '') {
        this.resetPanels();
        this.currentTask = null;
        this.subtasks = [];
        this.isImportant = false;
        this.selectedCalendarIds = [];
        this.isEditMode = true;

        // Reset form
        document.getElementById('task-item-title').value = title;
        document.getElementById('task-item-description').value = '';
        document.getElementById('task-item-due').value = '';
        document.getElementById('task-item-time').value = '';
        this.updateDateDisplay();
        this.updateTimeDisplay();
        // Reset recurring
        this.selectedDays = [];
        this.updateDayButtons();
        this.el.querySelectorAll('.task-recurring-preset').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === '');
        });
        document.getElementById('subtasks-list').innerHTML = '';

        // Reset important button
        this.updateImportantButton();

        // Reset complete button
        const completeBtn = document.getElementById('task-complete-btn');
        completeBtn.classList.remove('completed');

        // Hide delete and edit buttons for new tasks
        document.getElementById('delete-task-item').style.display = 'none';

        // Hide header datetime for new tasks
        const headerDatetime = document.getElementById('task-header-datetime');
        if (headerDatetime) headerDatetime.style.display = 'none';
        document.getElementById('task-edit-mode-btn').style.display = 'none';

        // Clear created date
        document.getElementById('task-item-created').textContent = '';

        // Reset relations
        this.selectedProjectId = null;
        this.selectedPeopleIds = [];
        this.selectedNoteIds = [];
        this.relationDisplayNames = {};
        document.getElementById('task-edit-project-pills').innerHTML = '';
        document.getElementById('task-edit-people-pills').innerHTML = '';
        document.getElementById('task-edit-notes-pills').innerHTML = '';

        // Reset list
        this.selectedListId = null;
        const listSelector = document.getElementById('task-list-selector');
        if (listSelector) listSelector.value = '';

        // Reset metadata
        this.selectedPriority = '';
        this.selectedEnergy = '';
        this.selectedLocation = '';
        this.updateMetadataPresets();

        // Load lists for dropdown
        this.loadListsForModal();

        // Load and render calendars
        this.loadCalendarsForModal();

        // Always edit mode for new tasks
        this.updateViewMode();

        // Show modal
        this.el.classList.add('open');
        document.body.style.overflow = 'hidden';

        // Focus title
        setTimeout(() => {
            document.getElementById('task-item-title').focus();
        }, 100);
    },

    openEdit(task) {
        this.resetPanels();
        this.currentTask = task;
        this.subtasks = task.subtasks || [];
        this.isImportant = task.important || false;
        this.selectedCalendarIds = task.calendar_ids || [];
        
        // Populate form
        document.getElementById('task-item-title').value = task.title || '';
        document.getElementById('task-item-description').value = task.description || '';
        document.getElementById('task-item-due').value = task.due_date || '';
        document.getElementById('task-item-time').value = task.due_time || '';
        this.updateDateDisplay();
        this.updateTimeDisplay();
        // Set recurring
        this.selectedDays = task.recurring_days || [];
        this.updateDayButtons();
        const recurringValue = task.recurring || '';
        this.el.querySelectorAll('.task-recurring-preset').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === recurringValue);
        });
        
        // Render subtasks
        this.renderSubtasks();
        
        // Update important button
        this.updateImportantButton();
        
        // Update complete button
        const completeBtn = document.getElementById('task-complete-btn');
        if (task.completed) {
            completeBtn.classList.add('completed');
        } else {
            completeBtn.classList.remove('completed');
        }
        
        // Show delete button, hide edit toggle (always in edit mode now)
        document.getElementById('delete-task-item').style.display = '';
        document.getElementById('task-edit-mode-btn').style.display = 'none';
        
        // Show created date
        if (task.created_at) {
            const date = new Date(task.created_at);
            document.getElementById('task-item-created').textContent = `Created ${date.toLocaleDateString()}`;
        }

        // Load relations
        this.selectedProjectId = task.project_id || null;
        this.selectedPeopleIds = task.people_ids || [];
        this.selectedNoteIds = task.note_ids || [];
        this.relationDisplayNames = {};
        this.loadRelationDisplayNames();

        // Load list
        this.selectedListId = task.list_id || null;
        this.loadListsForModal();

        // Load metadata
        this.selectedPriority = task.priority || '';
        this.selectedEnergy = task.energy || '';
        this.selectedLocation = task.location || '';
        this.updateMetadataPresets();

        // Load and render calendars
        this.loadCalendarsForModal();

        // Always open in edit mode
        this.isEditMode = true;
        this.updateViewMode();

        // Show modal
        this.el.classList.add('open');
        document.body.style.overflow = 'hidden';
    },

    // Alias for calendar.js compatibility — opens task in edit/reader modal
    openTask(task) {
        this.openEdit(task);
    },

    close() {
        this.el.classList.remove('open');
        document.body.style.overflow = '';
        this.currentTask = null;
    },

    toggleImportant() {
        this.isImportant = !this.isImportant;
        this.updateImportantButton();
    },

    updateImportantButton() {
        const btn = document.getElementById('task-important-btn');
        if (this.isImportant) {
            btn.classList.add('open');
            btn.querySelector('svg').style.fill = 'var(--neon-yellow, #ffd700)';
        } else {
            btn.classList.remove('open');
            btn.querySelector('svg').style.fill = 'none';
        }
    },

    toggleCompleteButton() {
        const btn = document.getElementById('task-complete-btn');
        btn.classList.toggle('completed');
    },

    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        this.updateViewMode();
    },

    updateViewMode() {
        const readerView = document.getElementById('task-reader-view');
        const editView = document.getElementById('task-edit-view');
        const editBtn = document.getElementById('task-edit-mode-btn');
        const titleInput = document.getElementById('task-item-title');
        const titleReader = document.getElementById('task-reader-title');
        const completeBtn = document.getElementById('task-complete-btn');
        const headerDatetime = document.getElementById('task-header-datetime');
        
        if (this.isEditMode) {
            readerView.style.display = 'none';
            editView.style.display = '';
            titleInput.style.display = '';
            titleReader.style.display = 'none';
            completeBtn.style.display = 'none'; // Hide in edit mode
            if (headerDatetime) headerDatetime.style.display = 'none'; // Hide datetime header in edit
            editBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                </svg>`;
            editBtn.title = 'View task';
        } else {
            this.populateReaderView();
            readerView.style.display = '';
            editView.style.display = 'none';
            titleInput.style.display = 'none';
            titleReader.style.display = '';
            completeBtn.style.display = ''; // Show in reader mode
            editBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>`;
            editBtn.title = 'Edit task';
        }
    },

    populateReaderView() {
        const task = this.currentTask;
        if (!task) return;
        
        // Title
        document.getElementById('task-reader-title').textContent = task.title;
        
        // Header datetime (above title)
        const headerDatetime = document.getElementById('task-header-datetime');
        const headerDate = document.getElementById('task-header-date');
        const headerTime = document.getElementById('task-header-time');
        const headerRecurring = document.getElementById('task-header-recurring');
        
        if (task.due_date || task.recurring) {
            headerDatetime.style.display = 'flex';
            headerDatetime.className = `task-header-datetime ${task.due_date ? this.getDueClass(task.due_date) : ''}`;
            
            if (task.due_date) {
                headerDate.innerHTML = `📅 ${this.formatDueDate(task.due_date)}`;
                headerDate.style.display = '';
            } else {
                headerDate.style.display = 'none';
            }
            
            if (task.due_time) {
                headerTime.innerHTML = `🕐 ${this.formatTime(task.due_time)}`;
                headerTime.style.display = '';
            } else {
                headerTime.style.display = 'none';
            }
            
            if (task.recurring) {
                const labels = { daily: 'Daily', weekly: 'Weekly', weekdays: 'Weekdays', biweekly: 'Every 2 weeks', monthly: 'Monthly', yearly: 'Yearly' };
                headerRecurring.innerHTML = `🔄 ${labels[task.recurring] || task.recurring}`;
                headerRecurring.style.display = '';
            } else {
                headerRecurring.style.display = 'none';
            }
        } else {
            headerDatetime.style.display = 'none';
        }
        
        // Hide the old due date/recurring in body (keep for backwards compat but hide)
        const dueEl = document.getElementById('task-reader-due');
        const recurringEl = document.getElementById('task-reader-recurring');
        dueEl.style.display = 'none';
        recurringEl.style.display = 'none';
        
        // Description
        const descSection = document.getElementById('task-reader-description-section');
        const descEl = document.getElementById('task-reader-description');
        if (task.description && task.description.trim()) {
            descEl.innerHTML = marked.parse(task.description);
            descSection.style.display = '';
        } else {
            descSection.style.display = 'none';
        }
        
        // Subtasks
        const subtasksSection = document.getElementById('task-reader-subtasks-section');
        const subtasksEl = document.getElementById('task-reader-subtasks');
        if (task.subtasks && task.subtasks.length > 0) {
            subtasksEl.innerHTML = `<ul class="task-reader-subtasks-list">
                ${task.subtasks.map((st, idx) => `
                    <li class="task-reader-subtask ${st.completed ? 'completed' : ''}" data-index="${idx}" onclick="taskModal.toggleReaderSubtask(${idx})">
                        <span class="subtask-checkbox"></span>
                        <span class="subtask-text">${this.escapeHtml(st.title)}</span>
                    </li>
                `).join('')}
            </ul>`;
            subtasksSection.style.display = '';
        } else {
            subtasksSection.style.display = 'none';
        }

        // List badge
        const listSection = document.getElementById('task-reader-list-section');
        const listBadge = document.getElementById('task-reader-list-badge');
        if (task.list_id && this.lists) {
            const list = this.lists.find(l => l.id === task.list_id);
            if (list) {
                listBadge.innerHTML = `<span class="list-color-dot" style="background: ${list.color || '#bf5af2'}"></span>${this.escapeHtml(list.name)}`;
                listSection.style.display = '';
            } else {
                listSection.style.display = 'none';
            }
        } else {
            listSection.style.display = 'none';
        }

        // Relations
        const relationsSection = document.getElementById('task-reader-relations');
        let hasRelations = false;

        // Project
        const projectRow = document.getElementById('task-reader-project-row');
        const projectPills = document.getElementById('task-reader-project-pills');
        if (task.project_id) {
            const name = this.relationDisplayNames[task.project_id] || 'Loading...';
            projectPills.innerHTML = `<span class="task-relation-pill">${this.escapeHtml(name)}</span>`;
            projectRow.style.display = '';
            hasRelations = true;
        } else {
            projectRow.style.display = 'none';
        }

        // People
        const peopleRow = document.getElementById('task-reader-people-row');
        const peoplePills = document.getElementById('task-reader-people-pills');
        const peopleIds = task.people_ids || [];
        if (peopleIds.length > 0) {
            peoplePills.innerHTML = peopleIds.map(id => {
                const name = this.relationDisplayNames[id] || 'Loading...';
                return `<span class="task-relation-pill">${this.escapeHtml(name)}</span>`;
            }).join('');
            peopleRow.style.display = '';
            hasRelations = true;
        } else {
            peopleRow.style.display = 'none';
        }

        // Notes
        const notesRow = document.getElementById('task-reader-notes-row');
        const notesPills = document.getElementById('task-reader-notes-pills');
        const noteIds = task.note_ids || [];
        if (noteIds.length > 0) {
            notesPills.innerHTML = noteIds.map(id => {
                const name = this.relationDisplayNames[id] || 'Loading...';
                return `<span class="task-relation-pill">${this.escapeHtml(name)}</span>`;
            }).join('');
            notesRow.style.display = '';
            hasRelations = true;
        } else {
            notesRow.style.display = 'none';
        }

        relationsSection.style.display = hasRelations ? '' : 'none';

        // Metadata (More details)
        const priorityItem = document.getElementById('task-reader-priority');
        const priorityValue = document.getElementById('task-reader-priority-value');
        if (task.priority) {
            priorityValue.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
            priorityValue.className = `task-metadata-value priority-${task.priority}`;
            priorityItem.style.display = '';
        } else {
            priorityItem.style.display = 'none';
        }

        const energyItem = document.getElementById('task-reader-energy');
        const energyValue = document.getElementById('task-reader-energy-value');
        if (task.energy) {
            energyValue.textContent = task.energy.charAt(0).toUpperCase() + task.energy.slice(1);
            energyValue.className = `task-metadata-value energy-${task.energy}`;
            energyItem.style.display = '';
        } else {
            energyItem.style.display = 'none';
        }

        const locationItem = document.getElementById('task-reader-location');
        const locationValue = document.getElementById('task-reader-location-value');
        if (task.location) {
            locationValue.textContent = task.location.charAt(0).toUpperCase() + task.location.slice(1);
            locationValue.className = 'task-metadata-value';
            locationItem.style.display = '';
        } else {
            locationItem.style.display = 'none';
        }

        const statusItem = document.getElementById('task-reader-status');
        const statusValue = document.getElementById('task-reader-status-value');
        if (task.status && task.status !== 'todo') {
            const statusLabels = { todo: 'To Do', doing: 'Doing', done: 'Done' };
            statusValue.textContent = statusLabels[task.status] || task.status;
            statusValue.className = 'task-metadata-value';
            statusItem.style.display = '';
        } else {
            statusItem.style.display = 'none';
        }

        // Show/hide "More details" based on whether there's any metadata
        const hasMetadata = task.priority || task.energy || task.location || (task.status && task.status !== 'todo');
        const moreDetails = document.getElementById('task-reader-more-details');
        if (moreDetails) {
            moreDetails.style.display = hasMetadata ? '' : 'none';
        }
    },

    async toggleReaderSubtask(index) {
        if (!this.currentTask) return;
        
        // Toggle the subtask
        const subtasks = [...this.currentTask.subtasks];
        subtasks[index].completed = !subtasks[index].completed;
        
        try {
            const response = await fetch(`/api/tasks/${this.currentTask.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ subtasks })
            });
            
            if (!response.ok) throw new Error('Failed to update subtask');
            
            const data = await response.json();
            this.currentTask = data.item;
            this.populateReaderView();
            this.loadTasks();
        } catch (err) {
            console.error('Error updating subtask:', err);
        }
    },

    formatTime(timeStr) {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    },

    selectRecurringPreset(btn) {
        // Update active state
        this.el.querySelectorAll('.task-recurring-preset').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const value = btn.dataset.value;
        
        // Update day buttons based on preset
        this.selectedDays = [];
        if (value === 'daily') {
            this.selectedDays = [0, 1, 2, 3, 4, 5, 6];
        } else if (value === 'weekdays') {
            this.selectedDays = [1, 2, 3, 4, 5];
        } else if (value === 'weekly') {
            // Keep current day selection or default to today
            const today = new Date().getDay();
            this.selectedDays = [today];
        }
        
        this.updateDayButtons();
    },

    toggleDay(btn) {
        const day = parseInt(btn.dataset.day);
        const index = this.selectedDays.indexOf(day);
        
        if (index > -1) {
            this.selectedDays.splice(index, 1);
        } else {
            this.selectedDays.push(day);
        }
        
        this.selectedDays.sort((a, b) => a - b);
        this.updateDayButtons();
        this.updateRecurringPreset();
    },

    updateDayButtons() {
        this.el.querySelectorAll('.task-day-btn').forEach(btn => {
            const day = parseInt(btn.dataset.day);
            btn.classList.toggle('active', this.selectedDays.includes(day));
        });
    },

    updateDateDisplay() {
        const input = document.getElementById('task-item-due');
        const display = document.getElementById('task-due-display');
        const clearBtn = document.getElementById('clear-date-btn');
        if (input.value) {
            const date = new Date(input.value + 'T00:00:00');
            display.textContent = date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
            display.classList.add('has-value');
            if (clearBtn) clearBtn.classList.add('visible');
        } else {
            display.textContent = 'Select date';
            display.classList.remove('has-value');
            if (clearBtn) clearBtn.classList.remove('visible');
        }
    },

    updateTimeDisplay() {
        const input = document.getElementById('task-item-time');
        const display = document.getElementById('task-time-display');
        const clearBtn = document.getElementById('clear-time-btn');
        if (input.value) {
            const [hours, minutes] = input.value.split(':');
            const date = new Date();
            date.setHours(parseInt(hours), parseInt(minutes));
            display.textContent = date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
            display.classList.add('has-value');
            if (clearBtn) clearBtn.classList.add('visible');
        } else {
            display.textContent = 'Select time';
            display.classList.remove('has-value');
            if (clearBtn) clearBtn.classList.remove('visible');
        }
    },

    clearDate() {
        const input = document.getElementById('task-item-due');
        if (input) {
            input.value = '';
            this.updateDateDisplay();
        }
    },

    clearTime() {
        const input = document.getElementById('task-item-time');
        if (input) {
            input.value = '';
            this.updateTimeDisplay();
        }
    },

    updateRecurringPreset() {
        // Auto-select preset based on days
        let preset = '';
        
        if (this.selectedDays.length === 7) {
            preset = 'daily';
        } else if (this.selectedDays.length === 5 && 
                   JSON.stringify(this.selectedDays) === JSON.stringify([1, 2, 3, 4, 5])) {
            preset = 'weekdays';
        } else if (this.selectedDays.length === 0) {
            preset = '';
        } else {
            preset = 'custom';
        }
        
        // Update preset buttons
        this.el.querySelectorAll('.task-recurring-preset').forEach(btn => {
            if (preset === 'custom') {
                btn.classList.remove('active');
            } else {
                btn.classList.toggle('active', btn.dataset.value === preset);
            }
        });
    },

    addSubtask(title) {
        this.subtasks.push({
            id: Date.now().toString(),
            title: title,
            completed: false
        });
        this.renderSubtasks();
    },

    renderSubtasks() {
        const container = document.getElementById('subtasks-list');
        container.innerHTML = this.subtasks.map((subtask, index) => `
            <div class="subtask-item ${subtask.completed ? 'completed' : ''}" data-index="${index}">
                <button type="button" class="subtask-check" onclick="taskModal.toggleSubtask(${index})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        ${subtask.completed 
                            ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
                            : '<circle cx="12" cy="12" r="10"/>'}
                    </svg>
                </button>
                <span class="subtask-title">${this.escapeHtml(subtask.title)}</span>
                <button type="button" class="subtask-delete" onclick="taskModal.deleteSubtask(${index})">×</button>
            </div>
        `).join('');
    },

    toggleSubtask(index) {
        this.subtasks[index].completed = !this.subtasks[index].completed;
        this.renderSubtasks();
    },

    deleteSubtask(index) {
        this.subtasks.splice(index, 1);
        this.renderSubtasks();
    },

    insertMarkdown(type) {
        const textarea = document.getElementById('task-item-description');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selected = text.substring(start, end);
        
        let before = '';
        let after = '';
        let cursorOffset = 0;
        
        switch (type) {
            case 'bold':
                before = '**';
                after = '**';
                break;
            case 'italic':
                before = '*';
                after = '*';
                break;
            case 'h1':
                before = '# ';
                after = '';
                break;
            case 'h2':
                before = '## ';
                after = '';
                break;
            case 'h3':
                before = '### ';
                after = '';
                break;
            case 'h4':
                before = '#### ';
                after = '';
                break;
            case 'link':
                before = '[';
                after = '](url)';
                break;
            case 'list':
                before = '\n- ';
                after = '';
                break;
            case 'code':
                before = '`';
                after = '`';
                break;
            case 'hr':
                before = '\n\n---\n\n';
                after = '';
                break;
        }
        
        const insertion = before + selected + after;
        textarea.value = text.substring(0, start) + insertion + text.substring(end);
        textarea.focus();
        
        // Position cursor: if text was selected, select the wrapped text; otherwise put cursor between markers
        if (selected) {
            textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
        } else {
            textarea.setSelectionRange(start + before.length, start + before.length);
        }
    },

    /**
     * Load calendars for the task modal
     */
    async loadCalendarsForModal() {
        try {
            const response = await api.getCalendars();
            this.calendars = response.calendars || [];

            // For new tasks, pre-select the Tasks calendar
            if (!this.currentTask && this.selectedCalendarIds.length === 0) {
                const tasksCalendar = this.calendars.find(c => c.system_type === 'tasks');
                if (tasksCalendar) {
                    this.selectedCalendarIds = [tasksCalendar.id];
                }
            }

            this.renderCalendarsInModal();
        } catch (err) {
            console.error('Failed to load calendars:', err);
            this.calendars = [];
            this.renderCalendarsInModal();
        }
    },

    /**
     * Render calendar chips in the task modal
     */
    renderCalendarsInModal() {
        const container = document.getElementById('task-calendars-list');
        if (!container) return;

        if (this.calendars.length === 0) {
            container.innerHTML = '<span class="text-muted">No calendars available</span>';
            return;
        }

        container.innerHTML = this.calendars.map(cal => {
            const isSelected = this.selectedCalendarIds.includes(cal.id);
            return `
                <div class="task-calendar-chip${isSelected ? ' selected' : ''}" data-calendar-id="${cal.id}">
                    <span class="calendar-dot" style="background: ${cal.color};"></span>
                    <span>${this.escapeHtml(cal.name)}</span>
                </div>
            `;
        }).join('');

        // Bind click events
        container.querySelectorAll('.task-calendar-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const calId = chip.dataset.calendarId;
                this.toggleCalendarInModal(calId);
            });
        });
    },

    /**
     * Toggle calendar selection in modal
     */
    toggleCalendarInModal(calendarId) {
        const index = this.selectedCalendarIds.indexOf(calendarId);
        if (index > -1) {
            this.selectedCalendarIds.splice(index, 1);
        } else {
            this.selectedCalendarIds.push(calendarId);
        }
        this.renderCalendarsInModal();
    },

    async save() {
        const title = document.getElementById('task-item-title').value.trim();
        if (!title) {
            document.getElementById('task-item-title').focus();
            return;
        }
        
        const completeBtn = document.getElementById('task-complete-btn');
        
        // Auto-detect recurring: if days are selected but no preset, default to 'weekly'
        let recurringValue = this.el.querySelector('.task-recurring-preset.active')?.dataset.value || null;
        if (!recurringValue && this.selectedDays && this.selectedDays.length > 0) {
            recurringValue = 'weekly';
        }
        
        const taskData = {
            title: title,
            description: document.getElementById('task-item-description').value,
            due_date: document.getElementById('task-item-due').value || null,
            due_time: document.getElementById('task-item-time').value || null,
            recurring: recurringValue,
            recurring_days: this.selectedDays,
            subtasks: this.subtasks,
            important: this.isImportant,
            completed: completeBtn.classList.contains('completed'),
            calendar_ids: this.selectedCalendarIds,
            project_id: this.selectedProjectId,
            people_ids: this.selectedPeopleIds,
            note_ids: this.selectedNoteIds,
            list_id: this.selectedListId,
            priority: this.selectedPriority || null,
            energy: this.selectedEnergy || null,
            location: this.selectedLocation || null
        };
        
        try {
            let response;
            if (this.currentTask) {
                // Update existing
                response = await fetch(`/api/tasks/${this.currentTask.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(taskData)
                });
            } else {
                // Create new
                response = await fetch('/api/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(taskData)
                });
            }
            
            if (!response.ok) throw new Error('Failed to save task');

            this.close();
            this.loadTasks();
            this.loadCounts();
            // Also refresh calendar if it exists
            if (typeof calendar !== 'undefined' && calendar.load) {
                calendar.load();
            }
            this.showToast(this.currentTask ? 'Task updated!' : 'Task created!');
        } catch (err) {
            console.error('Error saving task:', err);
            this.showToast('Error saving task');
        }
    },

    async delete() {
        if (!this.currentTask) return;
        
        if (confirm('Delete this task?')) {
            try {
                const response = await fetch(`/api/tasks/${this.currentTask.id}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                
                if (!response.ok) throw new Error('Failed to delete task');

                this.close();
                this.loadTasks();
                this.loadCounts();
                // Also refresh calendar if it exists
                if (typeof calendar !== 'undefined' && calendar.load) {
                    calendar.load();
                }
                this.showToast('Task deleted!');
            } catch (err) {
                console.error('Error deleting task:', err);
                this.showToast('Error deleting task');
            }
        }
    },

    showToast(message) {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 2rem;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(191, 90, 242, 0.9);
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            z-index: 10000;
            animation: fadeInUp 0.3s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },

    async loadRelationDisplayNames() {
        const allIds = [];
        const idToBase = {};

        if (this.selectedProjectId) {
            allIds.push(this.selectedProjectId);
            idToBase[this.selectedProjectId] = 'core-projects';
        }
        this.selectedPeopleIds.forEach(id => {
            allIds.push(id);
            idToBase[id] = 'core-people';
        });
        this.selectedNoteIds.forEach(id => {
            allIds.push(id);
            idToBase[id] = 'core-notes';
        });

        if (allIds.length === 0) return;

        // Group by base
        const byBase = {};
        for (const [id, baseId] of Object.entries(idToBase)) {
            if (!byBase[baseId]) byBase[baseId] = [];
            byBase[baseId].push(id);
        }

        // Fetch each base's records
        for (const [baseId, ids] of Object.entries(byBase)) {
            try {
                const resp = await fetch(`/api/bases/core/${baseId}/records`, { credentials: 'include' });
                if (!resp.ok) continue;
                const data = await resp.json();
                const records = data.records || [];
                records.forEach(r => {
                    if (ids.includes(r.id)) {
                        // Use 'name' or 'title' as display field
                        this.relationDisplayNames[r.id] = r.values?.name || r.values?.title || `Record`;
                    }
                });
            } catch (e) {
                console.error(`Failed to load display names for ${baseId}:`, e);
            }
        }

        // Re-render reader view if we're in reader mode
        if (!this.isEditMode && this.currentTask) {
            this.populateReaderView();
        }

        // Update edit view pills
        this.renderEditRelationPills();
    },

    renderEditRelationPills() {
        // Project
        const projectPills = document.getElementById('task-edit-project-pills');
        if (projectPills) {
            if (this.selectedProjectId) {
                const name = this.relationDisplayNames[this.selectedProjectId] || 'Loading...';
                projectPills.innerHTML = `<span class="task-relation-pill">${this.escapeHtml(name)}<span class="pill-remove" onclick="taskModal.removeRelation('project', '${this.selectedProjectId}')">&times;</span></span>`;
            } else {
                projectPills.innerHTML = '';
            }
        }

        // People
        const peoplePills = document.getElementById('task-edit-people-pills');
        if (peoplePills) {
            peoplePills.innerHTML = this.selectedPeopleIds.map(id => {
                const name = this.relationDisplayNames[id] || 'Loading...';
                return `<span class="task-relation-pill">${this.escapeHtml(name)}<span class="pill-remove" onclick="taskModal.removeRelation('people', '${id}')">&times;</span></span>`;
            }).join('');
        }

        // Notes
        const notesPills = document.getElementById('task-edit-notes-pills');
        if (notesPills) {
            notesPills.innerHTML = this.selectedNoteIds.map(id => {
                const name = this.relationDisplayNames[id] || 'Loading...';
                return `<span class="task-relation-pill">${this.escapeHtml(name)}<span class="pill-remove" onclick="taskModal.removeRelation('notes', '${id}')">&times;</span></span>`;
            }).join('');
        }
    },

    removeRelation(type, recordId) {
        if (type === 'project') {
            this.selectedProjectId = null;
        } else if (type === 'people') {
            this.selectedPeopleIds = this.selectedPeopleIds.filter(id => id !== recordId);
        } else if (type === 'notes') {
            this.selectedNoteIds = this.selectedNoteIds.filter(id => id !== recordId);
        }
        this.renderEditRelationPills();
    },

    updateMetadataPresets() {
        // Update active state for all metadata preset buttons
        document.querySelectorAll('.task-metadata-preset').forEach(btn => {
            const field = btn.dataset.field;
            const value = btn.dataset.value;
            let currentValue = '';
            if (field === 'priority') currentValue = this.selectedPriority;
            else if (field === 'energy') currentValue = this.selectedEnergy;
            else if (field === 'location') currentValue = this.selectedLocation;
            btn.classList.toggle('active', value === currentValue);
        });
    },

    toggleMoreDetails() {
        const content = document.getElementById('task-more-details-content');
        const toggle = document.getElementById('task-more-details-toggle');
        if (!content || !toggle) return;

        const isExpanded = content.style.display !== 'none';
        content.style.display = isExpanded ? 'none' : '';
        toggle.classList.toggle('expanded', !isExpanded);
    },

    async loadListsForModal() {
        try {
            const resp = await fetch('/api/task-lists', { credentials: 'include' });
            if (!resp.ok) return;
            const data = await resp.json();
            this.lists = data.lists || [];

            // Populate the dropdown
            const selector = document.getElementById('task-list-selector');
            if (selector) {
                selector.innerHTML = '<option value="">No list</option>' +
                    this.lists.map(l => `<option value="${l.id}" ${l.id === this.selectedListId ? 'selected' : ''}>${this.escapeHtml(l.name)}</option>`).join('');
            }
        } catch (e) {
            console.error('Failed to load lists:', e);
        }
    },

    async showRelationDropdown(type, anchorEl) {
        // Close any existing dropdown
        this.closeRelationDropdown();

        // Determine which base to query
        const baseMap = {
            project: 'core-projects',
            people: 'core-people',
            notes: 'core-notes'
        };
        const baseId = baseMap[type];
        if (!baseId) return;

        // Fetch records
        let records = [];
        try {
            const resp = await fetch(`/api/bases/core/${baseId}/records`, { credentials: 'include' });
            if (resp.ok) {
                const data = await resp.json();
                records = (data.records || []).map(r => ({
                    id: r.id,
                    name: r.values?.name || r.values?.title || `Record #${r.global_id}`,
                    globalId: r.global_id
                }));
            }
        } catch (e) {
            console.error('Failed to fetch records for dropdown:', e);
        }

        // Get currently selected IDs for this type
        const getSelectedIds = () => {
            if (type === 'project') return this.selectedProjectId ? [this.selectedProjectId] : [];
            if (type === 'people') return [...this.selectedPeopleIds];
            if (type === 'notes') return [...this.selectedNoteIds];
            return [];
        };

        // Create dropdown element
        const dropdown = document.createElement('div');
        dropdown.className = 'task-relation-dropdown';
        dropdown.id = 'active-relation-dropdown';

        const isMulti = type !== 'project';
        const labels = { project: 'projects', people: 'people', notes: 'notes' };

        const renderList = (filter = '') => {
            const selectedIds = getSelectedIds();
            const filtered = filter
                ? records.filter(r => r.name.toLowerCase().includes(filter.toLowerCase()))
                : records;

            const listEl = dropdown.querySelector('.task-relation-dropdown-list');
            if (!listEl) return;

            if (filtered.length === 0) {
                listEl.innerHTML = `<div class="task-relation-dropdown-empty">No ${labels[type]} found</div>`;
                return;
            }

            listEl.innerHTML = filtered.map(r => {
                const isSelected = selectedIds.includes(r.id);
                return `<div class="task-relation-dropdown-item ${isSelected ? 'selected' : ''}" data-record-id="${r.id}">
                    <span class="dropdown-check">${isSelected ? '✓' : ''}</span>
                    <span>${this.escapeHtml(r.name)}</span>
                </div>`;
            }).join('');

            // Attach click handlers
            listEl.querySelectorAll('.task-relation-dropdown-item').forEach(item => {
                item.addEventListener('click', () => {
                    const recordId = item.dataset.recordId;
                    const record = records.find(r => r.id === recordId);
                    if (!record) return;

                    if (type === 'project') {
                        // Single select - toggle
                        if (this.selectedProjectId === recordId) {
                            this.selectedProjectId = null;
                            delete this.relationDisplayNames[recordId];
                        } else {
                            // Clear old
                            if (this.selectedProjectId) delete this.relationDisplayNames[this.selectedProjectId];
                            this.selectedProjectId = recordId;
                            this.relationDisplayNames[recordId] = record.name;
                        }
                    } else if (type === 'people') {
                        const idx = this.selectedPeopleIds.indexOf(recordId);
                        if (idx > -1) {
                            this.selectedPeopleIds.splice(idx, 1);
                            delete this.relationDisplayNames[recordId];
                        } else {
                            this.selectedPeopleIds.push(recordId);
                            this.relationDisplayNames[recordId] = record.name;
                        }
                    } else if (type === 'notes') {
                        const idx = this.selectedNoteIds.indexOf(recordId);
                        if (idx > -1) {
                            this.selectedNoteIds.splice(idx, 1);
                            delete this.relationDisplayNames[recordId];
                        } else {
                            this.selectedNoteIds.push(recordId);
                            this.relationDisplayNames[recordId] = record.name;
                        }
                    }

                    // Re-render
                    this.renderEditRelationPills();
                    renderList(dropdown.querySelector('.task-relation-dropdown-search input')?.value || '');

                    // For single-select, close after selection
                    if (!isMulti) {
                        this.closeRelationDropdown();
                    }
                });
            });
        };

        dropdown.innerHTML = `
            <div class="task-relation-dropdown-search">
                <input type="text" placeholder="Search ${labels[type]}..." autocomplete="off" />
            </div>
            <div class="task-relation-dropdown-list"></div>
        `;

        // Position dropdown near the anchor button
        const rect = anchorEl.getBoundingClientRect();
        const modalContent = this.el.querySelector('.modal-content');
        const modalRect = modalContent.getBoundingClientRect();

        dropdown.style.position = 'absolute';
        dropdown.style.top = (rect.bottom - modalRect.top + 4) + 'px';
        dropdown.style.left = Math.min(rect.left - modalRect.left, modalRect.width - 290) + 'px';

        modalContent.style.position = 'relative';
        modalContent.appendChild(dropdown);

        // Render initial list
        renderList();

        // Search input handler
        const searchInput = dropdown.querySelector('input');
        searchInput.addEventListener('input', (e) => {
            renderList(e.target.value);
        });
        searchInput.focus();

        // Close on click outside
        setTimeout(() => {
            this._dropdownClickOutside = (e) => {
                if (!dropdown.contains(e.target) && !anchorEl.contains(e.target)) {
                    this.closeRelationDropdown();
                }
            };
            document.addEventListener('click', this._dropdownClickOutside);
        }, 10);

        // Close on Escape
        this._dropdownEscape = (e) => {
            if (e.key === 'Escape') {
                this.closeRelationDropdown();
            }
        };
        document.addEventListener('keydown', this._dropdownEscape);
    },

    closeRelationDropdown() {
        const existing = document.getElementById('active-relation-dropdown');
        if (existing) existing.remove();
        if (this._dropdownClickOutside) {
            document.removeEventListener('click', this._dropdownClickOutside);
            this._dropdownClickOutside = null;
        }
        if (this._dropdownEscape) {
            document.removeEventListener('keydown', this._dropdownEscape);
            this._dropdownEscape = null;
        }
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Expose globally for inline onclick handlers
window.taskModal = taskModal;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    taskModal.init();
});
