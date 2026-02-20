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

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function renderItem(item) {
        const staleClass = item.age && (item.age.includes('d ago') || item.age.includes('w ago') || item.age.includes('mo ago')) ? ' stale' : '';

        return `
            <div class="inbox-item" data-id="${item.id}" data-type="${item.type}">
                <div class="inbox-item-icon ${TYPE_CLASSES[item.type] || ''}">
                    ${TYPE_ICONS[item.type] || '📥'}
                </div>
                <div class="inbox-item-info">
                    <div class="inbox-item-title">${escapeHtml(item.title)}</div>
                    <div class="inbox-item-age${staleClass}">${escapeHtml(item.age)}</div>
                </div>
            </div>`;
    }

    function renderEmpty() {
        return `
            <div class="inbox-empty">
                <div class="inbox-empty-icon">🧘</div>
                <p class="inbox-empty-text">All clear — nothing to process</p>
                <p class="inbox-empty-sub">Quick capture something or add items via the API</p>
                <button class="widget-action-btn" onclick="if(window.QuickAdd) QuickAdd.open()">+ Quick Capture</button>
            </div>`;
    }

    async function loadInbox() {
        const container = document.getElementById('inbox-content');
        const badge = document.getElementById('inbox-badge');
        if (!container) return;

        // Show loading skeleton if container is empty (first load)
        if (!container.children.length || container.querySelector('.widget-skeleton')) {
            container.innerHTML = '<div class="widget-skeleton"></div>';
        }

        try {
            const response = await fetch('/api/inbox?limit=10', {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to load inbox');
            const data = await response.json();

            // Update badge
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

                // Bind click handlers
                container.querySelectorAll('.inbox-item').forEach(el => {
                    el.addEventListener('click', () => {
                        const id = el.dataset.id;
                        const type = el.dataset.type;
                        if (window.InboxProcessor) {
                            window.InboxProcessor.open(id, type);
                        }
                    });
                });
            }

            // Set up auto-refresh every 30s
            if (refreshInterval) clearInterval(refreshInterval);
            refreshInterval = setInterval(loadInbox, 30000);

        } catch (err) {
            container.innerHTML = '<div class="widget-empty"><p>Could not load inbox</p></div>';
            console.error('Inbox widget error:', err);
        }
    }

    // Listen for processing/deletion events to sync badge
    document.addEventListener('inbox:processed', loadInbox);
    document.addEventListener('inbox:deleted', loadInbox);

    // Initialize — only auto-load if #inbox-content exists in DOM already
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('inbox-content')) {
            loadInbox();
        }
        document.addEventListener('sidebar:navigate', (e) => {
            if (e.detail && e.detail.tab === 'dashboard') setTimeout(loadInbox, 100);
        });
    });

    // Expose for external refresh
    window.InboxWidget = { refresh: loadInbox };
})();
