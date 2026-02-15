(function() {
    'use strict';
    
    async function loadQuickNotes() {
        const container = document.getElementById('quick-notes-content');
        if (!container) return;
        
        try {
            // Notes are in the core bases system
            // First get list of core bases to find the notes base
            const basesRes = await fetch('/api/bases/core/list', { credentials: 'include' });
            let notes = [];
            
            if (basesRes.ok) {
                const basesData = await basesRes.json();
                const allBases = basesData.bases || basesData || [];
                const noteBase = allBases.find(b => 
                    b.name && b.name.toLowerCase().includes('note')
                ) || allBases.find(b =>
                    b.id && b.id.toLowerCase().includes('note')
                );
                
                if (noteBase) {
                    const notesRes = await fetch(`/api/bases/core/${noteBase.id}`, { credentials: 'include' });
                    if (notesRes.ok) {
                        const notesData = await notesRes.json();
                        const allRecords = notesData.records || [];
                        // Sort by updated_at descending, take 4
                        notes = allRecords
                            .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
                            .slice(0, 4);
                    }
                }
            }
            
            if (notes.length === 0) {
                container.innerHTML = '<div class="widget-empty"><p>No notes yet</p><p class="widget-empty-sub">Start capturing your thoughts</p></div>';
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
                            <div class="quick-note-item">
                                <div class="quick-note-title">${escapeHtml(title)}</div>
                                ${preview ? `<div class="quick-note-preview">${escapeHtml(preview)}${content.length > 60 ? '...' : ''}</div>` : ''}
                                <div class="quick-note-meta">${updated}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
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
    
    document.addEventListener('DOMContentLoaded', loadQuickNotes);
    window.QuickNotesWidget = { refresh: loadQuickNotes };
})();
