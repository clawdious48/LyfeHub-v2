(function() {
    'use strict';

    const TYPE_ICONS = {
        task: '✓',
        note: '📝',
        person: '👤'
    };

    const TYPE_CLASSES = {
        task: 'type-task',
        note: 'type-note',
        person: 'type-person'
    };

    let refreshInterval = null;
    const SWIPE_THRESHOLD = 80;
    const SWIPE_MAX = 120;

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function renderItem(item) {
        const staleClass = item.age && (item.age.includes('d ago') || item.age.includes('w ago') || item.age.includes('mo ago')) ? ' stale' : '';

        return `
            <div class="inbox-item-wrapper" data-id="${item.id}" data-type="${item.type}">
                <div class="inbox-swipe-bg inbox-swipe-archive">
                    <span class="inbox-swipe-icon">📦</span>
                    <span class="inbox-swipe-label">Archive</span>
                </div>
                <div class="inbox-swipe-bg inbox-swipe-process">
                    <span class="inbox-swipe-icon">✅</span>
                    <span class="inbox-swipe-label">Process</span>
                </div>
                <div class="inbox-item">
                    <div class="inbox-item-icon ${TYPE_CLASSES[item.type] || ''}">
                        ${TYPE_ICONS[item.type] || '📥'}
                    </div>
                    <div class="inbox-item-info">
                        <div class="inbox-item-title">${escapeHtml(item.title)}</div>
                        <div class="inbox-item-age${staleClass}">${escapeHtml(item.age)}</div>
                    </div>
                </div>
            </div>`;
    }

    function renderEmpty() {
        return `
            <div class="inbox-empty">
                <div class="inbox-empty-icon">🧘</div>
                <p class="inbox-empty-text">All clear — nothing to process</p>
                <p class="inbox-empty-sub">Items will appear here when captured</p>
            </div>`;
    }

    function bindSwipe(wrapper) {
        const item = wrapper.querySelector('.inbox-item');
        let startX = 0;
        let currentX = 0;
        let isDragging = false;
        let startTime = 0;

        function onStart(e) {
            const touch = e.touches ? e.touches[0] : e;
            startX = touch.clientX;
            currentX = 0;
            isDragging = true;
            startTime = Date.now();
            item.style.transition = 'none';
        }

        function onMove(e) {
            if (!isDragging) return;
            const touch = e.touches ? e.touches[0] : e;
            currentX = touch.clientX - startX;

            // Clamp
            currentX = Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, currentX));

            item.style.transform = `translateX(${currentX}px)`;

            // Show appropriate background
            const archiveBg = wrapper.querySelector('.inbox-swipe-archive');
            const processBg = wrapper.querySelector('.inbox-swipe-process');

            if (currentX < -20) {
                archiveBg.classList.add('visible');
                processBg.classList.remove('visible');
                archiveBg.classList.toggle('triggered', currentX <= -SWIPE_THRESHOLD);
            } else if (currentX > 20) {
                processBg.classList.add('visible');
                archiveBg.classList.remove('visible');
                processBg.classList.toggle('triggered', currentX >= SWIPE_THRESHOLD);
            } else {
                archiveBg.classList.remove('visible', 'triggered');
                processBg.classList.remove('visible', 'triggered');
            }

            if (Math.abs(currentX) > 10) {
                e.preventDefault();
            }
        }

        function onEnd() {
            if (!isDragging) return;
            isDragging = false;

            const id = wrapper.dataset.id;
            const type = wrapper.dataset.type;
            const elapsed = Date.now() - startTime;

            item.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

            if (currentX <= -SWIPE_THRESHOLD) {
                // Swipe left → Archive
                item.style.transform = `translateX(-${wrapper.offsetWidth}px)`;
                wrapper.style.transition = 'max-height 0.3s, opacity 0.3s, margin 0.3s';
                setTimeout(() => {
                    wrapper.style.maxHeight = '0';
                    wrapper.style.opacity = '0';
                    wrapper.style.marginBottom = '0';
                    archiveItem(id, type);
                }, 200);
            } else if (currentX >= SWIPE_THRESHOLD) {
                // Swipe right → Process
                item.style.transform = 'translateX(0)';
                resetBgs();
                openItem(id, type);
            } else if (Math.abs(currentX) < 5 && elapsed < 300) {
                // Tap → Process (same as before)
                item.style.transform = 'translateX(0)';
                resetBgs();
                openItem(id, type);
            } else {
                // Snap back
                item.style.transform = 'translateX(0)';
                resetBgs();
            }
        }

        function resetBgs() {
            wrapper.querySelector('.inbox-swipe-archive').classList.remove('visible', 'triggered');
            wrapper.querySelector('.inbox-swipe-process').classList.remove('visible', 'triggered');
        }

        // Touch events
        item.addEventListener('touchstart', onStart, { passive: true });
        item.addEventListener('touchmove', onMove, { passive: false });
        item.addEventListener('touchend', onEnd);

        // Mouse events (for desktop testing)
        item.addEventListener('mousedown', onStart);
        document.addEventListener('mousemove', (e) => {
            if (isDragging) onMove(e);
        });
        document.addEventListener('mouseup', () => {
            if (isDragging) onEnd();
        });
    }

    async function openItem(id, type) {
        if (type === 'task' && window.taskModal) {
            // Open the REAL task modal — same one used in the Tasks section
            try {
                const res = await fetch(`/api/task-items/${id}`, { credentials: 'include' });
                if (!res.ok) throw new Error('Failed to fetch task');
                const data = await res.json();
                const task = data.item || data;
                window.taskModal.openEdit(task);
            } catch (err) {
                console.error('Failed to open task:', err);
            }
        } else if (window.InboxProcessor) {
            // Notes and people use InboxProcessor (no full modal exists for them)
            window.InboxProcessor.open(id, type);
        }
    }

    async function archiveItem(id, type) {
        try {
            await fetch(`/api/inbox/${id}/archive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ type })
            });
            document.dispatchEvent(new CustomEvent('inbox:processed'));
            // Refresh after animation
            setTimeout(loadInbox, 400);
        } catch (err) {
            console.error('Archive failed:', err);
            loadInbox(); // Refresh to restore state
        }
    }

    async function loadInbox() {
        const container = document.getElementById('inbox-content');
        const badge = document.getElementById('inbox-badge');
        if (!container) return;

        if (!container.children.length || container.querySelector('.widget-skeleton')) {
            container.innerHTML = '<div class="widget-skeleton"></div>';
        }

        try {
            const response = await fetch('/api/inbox?limit=10', {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to load inbox');
            const data = await response.json();

            if (badge) {
                badge.textContent = data.count;
                badge.className = 'inbox-badge' + (data.count === 0 ? ' empty' : '');
            }

            if (data.items.length === 0) {
                container.innerHTML = renderEmpty();
            } else {
                container.innerHTML = `
                    <div class="inbox-list">
                        ${data.items.map(renderItem).join('')}
                    </div>
                    ${data.count > data.items.length ? `<div class="inbox-more">${data.count - data.items.length} more items...</div>` : ''}
                `;

                // Bind swipe gestures
                container.querySelectorAll('.inbox-item-wrapper').forEach(bindSwipe);
            }

            if (refreshInterval) clearInterval(refreshInterval);
            refreshInterval = setInterval(loadInbox, 30000);

        } catch (err) {
            container.innerHTML = '<div class="widget-empty"><p>Could not load inbox</p></div>';
            console.error('Inbox widget error:', err);
        }
    }

    document.addEventListener('inbox:processed', () => { /* handled via loadInbox calls */ });
    document.addEventListener('inbox:deleted', loadInbox);

    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('inbox-content')) {
            loadInbox();
        }
        document.addEventListener('sidebar:navigate', (e) => {
            if (e.detail && e.detail.tab === 'dashboard') setTimeout(loadInbox, 100);
        });
    });

    window.InboxWidget = { refresh: loadInbox };
})();
