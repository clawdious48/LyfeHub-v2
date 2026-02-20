(function() {
    'use strict';

    let refreshInterval = null;

    async function loadAreas() {
        const container = document.getElementById('areas-overview-content');
        if (!container) return;

        container.innerHTML = '<div class="widget-skeleton"></div>';

        try {
            const res = await fetch('/api/areas', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to load areas');
            const data = await res.json();
            const areas = data.areas || [];

            if (areas.length === 0) {
                container.innerHTML = `
                    <div class="widget-empty">
                        <p>No areas configured</p>
                        <p class="widget-empty-sub">Areas help organize your life by context</p>
                        <button class="widget-action-btn" onclick="/* navigate to settings/areas */">+ Create Area</button>
                    </div>`;
                return;
            }

            container.innerHTML = `
                <div class="areas-grid">
                    ${areas.map(area => `
                        <div class="area-card" data-area-id="${area.id}" style="--area-color: ${area.color || '#FF8C00'}">
                            <span class="area-icon">${area.icon || '📁'}</span>
                            <span class="area-name">${escapeHtml(area.name)}</span>
                        </div>
                    `).join('')}
                </div>`;

            // Bind click handlers
            container.querySelectorAll('.area-card').forEach(card => {
                card.addEventListener('click', () => {
                    const areaId = card.dataset.areaId;
                    if (window.kanban && window.kanban.switchTab) {
                        window.kanban.switchTab('tasks');
                    } else {
                        const tabBtn = document.querySelector('.tab[data-tab="tasks"]');
                        if (tabBtn) tabBtn.click();
                    }
                    setTimeout(() => {
                        document.dispatchEvent(new CustomEvent('area:filter', { detail: { areaId } }));
                    }, 100);
                });
            });
        } catch (err) {
            container.innerHTML = '<div class="widget-empty"><p>Could not load areas</p></div>';
            console.error('Areas widget error:', err);
        }

        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = setInterval(loadAreas, 60000);
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('areas-overview-content')) loadAreas();
        document.addEventListener('sidebar:navigate', (e) => {
            if (e.detail && e.detail.tab === 'dashboard') setTimeout(loadAreas, 100);
        });
    });

    window.AreasWidget = { refresh: loadAreas };
})();
