/**
 * Dashboard Sidebar
 * Handles sidebar toggle, section collapsing, quick-capture modals, and tool navigation.
 */
(function() {
    'use strict';

    const STORAGE_KEY = 'dashboard-sidebar-collapsed';
    const SECTIONS_KEY = 'dashboard-sidebar-sections';

    let sidebar = null;
    let toastTimer = null;

    // ── Sidebar Toggle ──

    function isCollapsed() {
        return sidebar && sidebar.classList.contains('collapsed');
    }

    function collapse() {
        if (!sidebar) return;
        sidebar.classList.add('collapsed');
        localStorage.setItem(STORAGE_KEY, '1');
        triggerResize();
    }

    function expand() {
        if (!sidebar) return;
        sidebar.classList.remove('collapsed');
        localStorage.setItem(STORAGE_KEY, '0');
        triggerResize();
    }

    function toggle() {
        if (isCollapsed()) {
            expand();
        } else {
            collapse();
        }
    }

    function triggerResize() {
        // After CSS transition completes, tell GridStack to recalculate
        setTimeout(function() {
            window.dispatchEvent(new Event('resize'));
        }, 350);
    }

    // ── Section Toggles ──

    function getSectionStates() {
        try {
            return JSON.parse(localStorage.getItem(SECTIONS_KEY)) || {};
        } catch (e) {
            return {};
        }
    }

    function saveSectionState(name, collapsed) {
        var states = getSectionStates();
        states[name] = collapsed;
        localStorage.setItem(SECTIONS_KEY, JSON.stringify(states));
    }

    function initSections() {
        var states = getSectionStates();
        document.querySelectorAll('.sidebar-section').forEach(function(section) {
            var name = section.dataset.section;
            if (name && states[name]) {
                section.classList.add('collapsed');
            }

            var header = section.querySelector('.sidebar-section-header');
            if (header) {
                header.addEventListener('click', function() {
                    section.classList.toggle('collapsed');
                    saveSectionState(name, section.classList.contains('collapsed'));
                });
            }
        });
    }

    // ── Capture Modals ──

    function openCaptureModal(type) {
        var config = {
            note: { label: 'New Note', icon: '📝', iconClass: 'icon-note', placeholder: "What's on your mind?", showDate: false },
            task: { label: 'New Task', icon: '✓', iconClass: 'icon-task', placeholder: 'What needs to be done?', showDate: true },
            contact: { label: 'New Contact', icon: '👤', iconClass: 'icon-contact', placeholder: 'Contact name', showDate: false }
        };

        var c = config[type];
        if (!c) return;

        // Build modal HTML
        var overlay = document.createElement('div');
        overlay.className = 'capture-overlay';
        overlay.innerHTML =
            '<div class="capture-modal">' +
                '<div class="capture-modal-header">' +
                    '<div class="capture-modal-title">' +
                        '<span class="capture-icon ' + c.iconClass + '">' + c.icon + '</span>' +
                        '<span>' + c.label + '</span>' +
                    '</div>' +
                    '<button class="capture-modal-close">&times;</button>' +
                '</div>' +
                '<div class="capture-modal-body">' +
                    '<div class="capture-field">' +
                        '<label>Title</label>' +
                        '<input type="text" id="capture-title" placeholder="' + c.placeholder + '" autocomplete="off">' +
                    '</div>' +
                    (c.showDate
                        ? '<div class="capture-field">' +
                            '<label>Due Date (optional)</label>' +
                            '<input type="date" id="capture-due-date">' +
                          '</div>'
                        : '') +
                '</div>' +
                '<div class="capture-modal-actions">' +
                    '<button class="capture-btn capture-btn-secondary" id="capture-cancel">Cancel</button>' +
                    '<button class="capture-btn capture-btn-primary" id="capture-save">Save</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(overlay);

        // Show with animation
        requestAnimationFrame(function() {
            overlay.classList.add('visible');
            var titleInput = document.getElementById('capture-title');
            if (titleInput) titleInput.focus();
        });

        // Close handlers
        function close() {
            overlay.classList.remove('visible');
            setTimeout(function() {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 250);
        }

        overlay.querySelector('.capture-modal-close').addEventListener('click', close);
        document.getElementById('capture-cancel').addEventListener('click', close);
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) close();
        });

        // Save handler
        document.getElementById('capture-save').addEventListener('click', function() {
            submitCapture(type, close);
        });

        // Enter key on title
        var titleInput = document.getElementById('capture-title');
        if (titleInput) {
            titleInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    submitCapture(type, close);
                }
            });
        }
    }

    async function submitCapture(type, closeFn) {
        var titleInput = document.getElementById('capture-title');
        var title = titleInput ? titleInput.value.trim() : '';
        if (!title) {
            titleInput.focus();
            return;
        }

        var saveBtn = document.getElementById('capture-save');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
        }

        var body = { type: type, title: title };
        var dueDateInput = document.getElementById('capture-due-date');
        if (dueDateInput && dueDateInput.value) {
            body.due_date = dueDateInput.value;
        }

        try {
            var res = await fetch('/api/inbox/capture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(body)
            });

            if (!res.ok) throw new Error('Capture failed');

            closeFn();
            showToast(type === 'contact' ? 'Contact added to inbox' : (type.charAt(0).toUpperCase() + type.slice(1)) + ' added to inbox');

            // Refresh inbox widget
            if (window.InboxWidget && window.InboxWidget.refresh) {
                window.InboxWidget.refresh();
            }
        } catch (err) {
            console.error('Capture error:', err);
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save';
            }
            showToast('Failed to save. Try again.');
        }
    }

    // ── Toast ──

    function showToast(message) {
        // Remove existing
        var existing = document.querySelector('.capture-toast');
        if (existing) existing.parentNode.removeChild(existing);

        var toast = document.createElement('div');
        toast.className = 'capture-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(function() {
            toast.classList.add('visible');
        });

        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(function() {
            toast.classList.remove('visible');
            setTimeout(function() {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, 2500);
    }

    // ── Tool Navigation ──

    function initNavLinks() {
        document.querySelectorAll('.sidebar-nav-link[data-tab]').forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                var tab = link.dataset.tab;
                if (window.switchTab) {
                    window.switchTab(tab);
                }
            });
        });
    }

    // ── Init ──

    function init() {
        sidebar = document.getElementById('dashboard-sidebar');
        if (!sidebar) return;

        // Restore collapsed state
        if (localStorage.getItem(STORAGE_KEY) === '1') {
            sidebar.classList.add('collapsed');
        }

        // Toggle button
        var toggleBtn = document.getElementById('sidebar-toggle-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggle);
        }

        // Capture buttons
        document.querySelectorAll('.sidebar-capture-btn[data-capture]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                openCaptureModal(btn.dataset.capture);
            });
        });

        // Sections
        initSections();

        // Nav links
        initNavLinks();
    }

    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(init, 50);
    });

    // Expose API
    window.DashboardSidebar = {
        toggle: toggle,
        collapse: collapse,
        expand: expand,
        isCollapsed: isCollapsed
    };
})();
