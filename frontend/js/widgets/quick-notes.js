(function() {
    'use strict';

    let refreshInterval = null;

    async function loadQuickNotes() {
        const container = document.getElementById('quick-notes-content');
        if (!container) return;

        try {
            const basesRes = await fetch('/api/bases/core/list', { credentials: 'include' });
            let notes = [];
            let noteBaseId = null;

            if (basesRes.ok) {
                const basesData = await basesRes.json();
                const allBases = basesData.bases || basesData || [];
                const noteBase = allBases.find(b => b.type === 'notes')
                    || allBases.find(b => b.slug === 'notes')
                    || allBases.find(b => b.name && b.name.toLowerCase().includes('note'))
                    || allBases.find(b => b.id && b.id.toLowerCase().includes('note'));

                if (noteBase) {
                    noteBaseId = noteBase.id;
                    const notesRes = await fetch(`/api/bases/core/${noteBase.id}`, { credentials: 'include' });
                    if (notesRes.ok) {
                        const notesData = await notesRes.json();
                        const allRecords = notesData.records || [];
                        notes = allRecords
                            .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
                            .slice(0, 4);
                    }
                }
            }

            if (notes.length === 0) {
                container.innerHTML = `<div class="widget-empty">
    <p>No notes yet</p>
    <p class="widget-empty-sub">Start capturing your thoughts</p>
    <button class="widget-action-btn" onclick="if(window.QuickAdd) QuickAdd.open('note')">+ New Note</button>
</div>`;
                return;
            }

            container.innerHTML = `
                <div class="quick-notes-list">
                    ${notes.map(note => {
                        const title = note.title || (note.values && note.values.title) || 'Untitled';
                        const content = note.content || (note.values && note.values.content) || '';
                        const preview = content.replace(/[#*_`]/g, '').substring(0, 60);
                        const updated = note.updated_at ? timeAgo(new Date(note.updated_at)) : '';
                        return `
                            <div class="quick-note-item" data-id="${note.id}" data-base-id="${noteBaseId || ''}">
                                <div class="quick-note-title">${escapeHtml(title)}</div>
                                ${preview ? `<div class="quick-note-preview">${escapeHtml(preview)}${content.length > 60 ? '...' : ''}</div>` : ''}
                                <div class="quick-note-meta">${updated}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;

            // Add click handlers
            container.querySelectorAll('.quick-note-item').forEach(item => {
                item.addEventListener('click', () => {
                    const noteId = item.dataset.id;
                    const baseId = item.dataset.baseId;
                    if (window.ContextSheet && typeof ContextSheet.showRecord === 'function') {
                        ContextSheet.showRecord(baseId, noteId);
                    } else {
                        const tabBtn = document.querySelector('.tab[data-tab="bases"]');
                        if (tabBtn) tabBtn.click();
                    }
                });
            });
        } catch (err) {
            container.innerHTML = '<div class="widget-empty"><p>Could not load notes</p></div>';
            console.error('Quick Notes widget error:', err);
        }
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function timeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
        if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
        return date.toLocaleDateString();
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('quick-notes-content')) {
            loadQuickNotes();
            refreshInterval = setInterval(loadQuickNotes, 60000);
        }
    });
    window.QuickNotesWidget = { refresh: loadQuickNotes };
})();
