/* Core Pages — Projects, People, Notes (IIFE) */
(function() {
    'use strict';

    // ===== UTILITIES =====
    function timeAgo(dateStr) {
        if (!dateStr) return '';
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return mins + 'm ago';
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return hrs + 'h ago';
        const days = Math.floor(hrs / 24);
        if (days < 30) return days + 'd ago';
        return new Date(dateStr).toLocaleDateString();
    }

    function hashColor(str) {
        let hash = 0;
        for (let i = 0; i < (str || '').length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
        const colors = ['#FF8C00','#6366f1','#22c55e','#ef4444','#a855f7','#06b6d4','#ec4899','#eab308'];
        return colors[Math.abs(hash) % colors.length];
    }

    function initials(name) {
        return (name || '?').split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
    }

    function escHtml(s) {
        const d = document.createElement('div');
        d.textContent = s || '';
        return d.innerHTML;
    }

    // ===== TAB ACTIVATION LISTENER =====
    const loaded = { projects: false, people: false, notes: false };

    function onTabSwitch(tab) {
        if (tab === 'projects' && !loaded.projects) { loaded.projects = true; loadProjects(); }
        if (tab === 'people' && !loaded.people) { loaded.people = true; loadPeople(); }
        if (tab === 'notes' && !loaded.notes) { loaded.notes = true; loadNotes(); }
    }

    // Listen for tab clicks
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('[data-tab]');
        if (btn && btn.classList.contains('tab')) {
            onTabSwitch(btn.dataset.tab);
        }
        // Bottom nav
        if (btn && btn.classList.contains('bottom-nav-btn')) {
            onTabSwitch(btn.dataset.tab);
        }
    });

    // Also fire on initial load if tab is already active
    setTimeout(() => {
        const active = document.querySelector('.tab-content.active');
        if (active) onTabSwitch(active.dataset.tab);
    }, 100);

    // ===== PROJECTS =====
    let allProjects = [];
    const projectsContainer = () => document.getElementById('core-projects-container');

    async function loadProjects() {
        const container = projectsContainer();
        if (!container) return;
        try {
            const res = await fetch('/api/projects', { credentials: 'include' });
            const data = await res.json();
            allProjects = Array.isArray(data) ? data : (data.projects || data.records || []);
            renderProjects();
        } catch (e) {
            container.innerHTML = '<div class="core-empty-state">Failed to load projects.</div>';
        }
    }

    function renderProjects(filter, search) {
        const container = projectsContainer();
        if (!container) return;
        let items = allProjects;
        if (filter && filter !== 'all') items = items.filter(p => (p.status || '').toLowerCase() === filter);
        if (search) {
            const q = search.toLowerCase();
            items = items.filter(p => (p.title || p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
        }
        if (!items.length) {
            container.innerHTML = '<div class="core-empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg><p>No projects yet. Create your first project to get started.</p></div>';
            return;
        }
        container.innerHTML = '<div class="projects-grid">' + items.map(p => {
            const status = (p.status || 'active').toLowerCase();
            const badgeClass = status === 'active' ? 'core-badge-green' : status === 'completed' || status === 'done' ? 'core-badge-gray' : status === 'on-hold' || status === 'on_hold' ? 'core-badge-yellow' : 'core-badge-blue';
            const total = p.task_count || p.total_tasks || 0;
            const done = p.completed_tasks || p.tasks_done || 0;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const area = p.area || p.area_name || '';
            const dueDate = p.due_date ? new Date(p.due_date).toLocaleDateString() : '';
            return `<div class="core-card project-card" data-id="${p.id}">
                <div style="display:flex;justify-content:space-between;align-items:start;">
                    <div class="project-card-name">${escHtml(p.title || p.name)}</div>
                    <span class="core-badge ${badgeClass}">${escHtml(status)}</span>
                </div>
                ${p.description ? `<div class="project-card-desc">${escHtml(p.description)}</div>` : ''}
                ${total > 0 ? `<div class="project-progress"><div class="project-progress-bar" style="width:${pct}%"></div></div>` : ''}
                <div class="project-card-meta">
                    ${total > 0 ? `<span>${done}/${total} tasks</span>` : ''}
                    ${dueDate ? `<span>Due ${dueDate}</span>` : ''}
                    ${area ? `<span class="project-area-tag"><span class="project-area-dot" style="background:${hashColor(area)}"></span>${escHtml(area)}</span>` : ''}
                </div>
            </div>`;
        }).join('') + '</div>';
    }

    // ===== PEOPLE =====
    let allPeople = [];
    const peopleContainer = () => document.getElementById('core-people-container');

    async function loadPeople() {
        const container = peopleContainer();
        if (!container) return;
        try {
            const res = await fetch('/api/bases/core/core-people', { credentials: 'include' });
            const data = await res.json();
            allPeople = Array.isArray(data) ? data : (data.records || data || []);
            renderPeople();
        } catch (e) {
            container.innerHTML = '<div class="core-empty-state">Failed to load people.</div>';
        }
    }

    function renderPeople(search) {
        const container = peopleContainer();
        if (!container) return;
        let items = allPeople;
        if (search) {
            const q = search.toLowerCase();
            items = items.filter(p => {
                const v = p.values || p;
                const name = v.name || v.Name || v.full_name || '';
                const email = v.email || v.Email || '';
                const org = v.organization || v.org || '';
                return name.toLowerCase().includes(q) || email.toLowerCase().includes(q) || org.toLowerCase().includes(q);
            });
        }
        if (!items.length) {
            container.innerHTML = '<div class="core-empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><p>No contacts yet.</p></div>';
            return;
        }
        container.innerHTML = '<div class="people-cards-list">' + items.map(p => {
            const v = p.values || p;
            const name = v.name || v.Name || v.full_name || 'Unknown';
            const email = v.email || v.Email || '';
            const phone = v.phone || v.Phone || '';
            const org = v.organization || v.org || v.company || '';
            const tags = v.tags || v.Tags || [];
            const tagArr = Array.isArray(tags) ? tags : (typeof tags === 'string' && tags ? tags.split(',').map(t => t.trim()) : []);
            const contactLine = [email, phone].filter(Boolean).join(' · ');
            return `<div class="core-card person-card" data-id="${p.id}">
                <div class="person-avatar" style="background:${hashColor(name)}">${initials(name)}</div>
                <div class="person-info">
                    <div class="person-info-name">${escHtml(name)}</div>
                    ${contactLine ? `<div class="person-info-detail">${escHtml(contactLine)}</div>` : ''}
                    ${org ? `<div class="person-info-org">${escHtml(org)}</div>` : ''}
                    ${tagArr.length ? `<div class="person-tags">${tagArr.map(t => `<span class="person-tag">${escHtml(t)}</span>`).join('')}</div>` : ''}
                </div>
            </div>`;
        }).join('') + '</div>';
    }

    // ===== NOTES =====
    let allNotes = [];
    const notesContainer = () => document.getElementById('core-notes-container');

    async function loadNotes() {
        const container = notesContainer();
        if (!container) return;
        try {
            const res = await fetch('/api/bases/core/core-notes', { credentials: 'include' });
            const data = await res.json();
            allNotes = Array.isArray(data) ? data : (data.records || []);
            renderNotes();
        } catch (e) {
            container.innerHTML = '<div class="core-empty-state">Failed to load notes.</div>';
        }
    }

    function renderNotes(typeFilter, search) {
        const container = notesContainer();
        if (!container) return;
        let items = allNotes;
        if (typeFilter && typeFilter !== 'all') {
            items = items.filter(n => {
                const v = n.values || n;
                return (v.type || v.Type || '').toLowerCase() === typeFilter;
            });
        }
        if (search) {
            const q = search.toLowerCase();
            items = items.filter(n => {
                const v = n.values || n;
                return (v.title || v.Title || '').toLowerCase().includes(q) || (v.content || v.Content || '').toLowerCase().includes(q);
            });
        }
        if (!items.length) {
            container.innerHTML = '<div class="core-empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><p>No notes yet. Start capturing your thoughts.</p></div>';
            return;
        }
        container.innerHTML = '<div class="notes-grid">' + items.map(n => {
            const v = n.values || n;
            const title = v.title || v.Title || 'Untitled';
            const content = v.content || v.Content || v.body || '';
            const type = v.type || v.Type || 'note';
            const created = n.created_at || v.created_at || '';
            const tags = v.tags || v.Tags || [];
            const tagArr = Array.isArray(tags) ? tags : (typeof tags === 'string' && tags ? tags.split(',').map(t => t.trim()) : []);
            const typeBadge = type === 'definition' ? 'core-badge-blue' : 'core-badge-gray';
            return `<div class="core-card note-card" data-id="${n.id}">
                <div style="display:flex;justify-content:space-between;align-items:start;">
                    <div class="note-card-title">${escHtml(title)}</div>
                    <span class="core-badge ${typeBadge}">${escHtml(type)}</span>
                </div>
                ${content ? `<div class="note-card-preview">${escHtml(content)}</div>` : ''}
                <div class="note-card-meta">
                    ${created ? `<span>${timeAgo(created)}</span>` : ''}
                </div>
                ${tagArr.length ? `<div class="note-card-tags">${tagArr.map(t => `<span class="person-tag">${escHtml(t)}</span>`).join('')}</div>` : ''}
            </div>`;
        }).join('') + '</div>';
    }

    // ===== INJECT PAGE SHELLS =====
    function injectProjectsPage() {
        const tab = document.querySelector('main.tab-content[data-tab="projects"]');
        if (!tab || tab.querySelector('#core-projects-container')) return;
        tab.innerHTML = `
            <div class="core-page-header">
                <h1>Projects</h1>
                <button class="core-page-btn-primary" id="core-new-project-btn">+ New Project</button>
            </div>
            <div class="core-page-filters">
                <select class="core-page-filter-select" id="core-projects-status-filter">
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="on-hold">On Hold</option>
                </select>
                <input type="text" class="core-page-search" id="core-projects-search" placeholder="Search projects…" />
            </div>
            <div id="core-projects-container"></div>`;
        // Filter listeners
        document.getElementById('core-projects-status-filter').addEventListener('change', applyProjectFilters);
        document.getElementById('core-projects-search').addEventListener('input', applyProjectFilters);
        document.getElementById('core-new-project-btn').addEventListener('click', openProjectModal);
    }

    function injectPeoplePage() {
        const tab = document.querySelector('main.tab-content[data-tab="people"]');
        if (!tab || tab.querySelector('#core-people-container')) return;
        tab.innerHTML = `
            <div class="core-page-header">
                <h1>People</h1>
                <button class="core-page-btn-primary" id="core-new-person-btn">+ Add Person</button>
            </div>
            <div class="core-page-filters">
                <input type="text" class="core-page-search" id="core-people-search" placeholder="Search people…" />
            </div>
            <div id="core-people-container"></div>`;
        document.getElementById('core-people-search').addEventListener('input', () => {
            renderPeople(document.getElementById('core-people-search').value);
        });
        document.getElementById('core-new-person-btn').addEventListener('click', openPersonModal);
    }

    function injectNotesPage() {
        let tab = document.querySelector('main.tab-content[data-tab="notes"]');
        if (!tab) return;
        if (tab.querySelector('#core-notes-container')) return;
        tab.innerHTML = `
            <div class="core-page-header">
                <h1>Notes</h1>
                <button class="core-page-btn-primary" id="core-new-note-btn">+ New Note</button>
            </div>
            <div class="core-page-filters">
                <select class="core-page-filter-select" id="core-notes-type-filter">
                    <option value="all">All</option>
                    <option value="note">Notes</option>
                    <option value="definition">Definitions</option>
                </select>
                <input type="text" class="core-page-search" id="core-notes-search" placeholder="Search notes…" />
            </div>
            <div id="core-notes-container"></div>`;
        document.getElementById('core-notes-type-filter').addEventListener('change', applyNoteFilters);
        document.getElementById('core-notes-search').addEventListener('input', applyNoteFilters);
        document.getElementById('core-new-note-btn').addEventListener('click', openNoteModal);
    }

    function applyProjectFilters() {
        const status = document.getElementById('core-projects-status-filter').value;
        const search = document.getElementById('core-projects-search').value;
        renderProjects(status, search);
    }

    function applyNoteFilters() {
        const type = document.getElementById('core-notes-type-filter').value;
        const search = document.getElementById('core-notes-search').value;
        renderNotes(type, search);
    }

    // ===== CREATE MODALS =====
    function createModal(title, fields, onSave) {
        const overlay = document.createElement('div');
        overlay.className = 'core-modal-overlay active';
        const fieldHtml = fields.map(f => {
            if (f.type === 'select') {
                return `<div><label>${f.label}</label><select id="cm-${f.name}">${f.options.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}</select></div>`;
            }
            if (f.type === 'textarea') {
                return `<div><label>${f.label}</label><textarea id="cm-${f.name}" placeholder="${f.placeholder || ''}"></textarea></div>`;
            }
            return `<div><label>${f.label}</label><input type="${f.type || 'text'}" id="cm-${f.name}" placeholder="${f.placeholder || ''}" /></div>`;
        }).join('');
        overlay.innerHTML = `<div class="core-modal">
            <div class="core-modal-header"><h2>${title}</h2><button class="core-modal-close">&times;</button></div>
            <div class="core-modal-body">${fieldHtml}</div>
            <div class="core-modal-footer">
                <button class="core-modal-btn-cancel">Cancel</button>
                <button class="core-modal-btn-save">Save</button>
            </div>
        </div>`;
        document.body.appendChild(overlay);
        const close = () => overlay.remove();
        overlay.querySelector('.core-modal-close').onclick = close;
        overlay.querySelector('.core-modal-btn-cancel').onclick = close;
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
        overlay.querySelector('.core-modal-btn-save').onclick = () => {
            const vals = {};
            fields.forEach(f => { vals[f.name] = document.getElementById('cm-' + f.name).value; });
            onSave(vals, close);
        };
    }

    function openProjectModal() {
        createModal('New Project', [
            { name: 'title', label: 'Name', placeholder: 'Project name' },
            { name: 'description', label: 'Description', type: 'textarea', placeholder: 'What is this project about?' },
            { name: 'status', label: 'Status', type: 'select', options: [
                { value: 'active', label: 'Active' }, { value: 'on-hold', label: 'On Hold' }, { value: 'completed', label: 'Completed' }
            ]},
            { name: 'area', label: 'Area', placeholder: 'e.g. Work, Personal' },
            { name: 'due_date', label: 'Due Date', type: 'date' }
        ], async (vals, close) => {
            try {
                await fetch('/api/projects', {
                    method: 'POST', credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(vals)
                });
                close();
                loaded.projects = false;
                loadProjects();
            } catch (e) { alert('Failed to create project'); }
        });
    }

    function openPersonModal() {
        createModal('Add Person', [
            { name: 'name', label: 'Name', placeholder: 'Full name' },
            { name: 'email', label: 'Email', type: 'email', placeholder: 'email@example.com' },
            { name: 'phone', label: 'Phone', placeholder: '+1 555-0123' },
            { name: 'organization', label: 'Organization', placeholder: 'Company name' },
            { name: 'tags', label: 'Tags', placeholder: 'Comma-separated tags' }
        ], async (vals, close) => {
            try {
                const values = { ...vals };
                if (values.tags) values.tags = values.tags.split(',').map(t => t.trim());
                await fetch('/api/bases/core/core-people/records', {
                    method: 'POST', credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ values })
                });
                close();
                loaded.people = false;
                loadPeople();
            } catch (e) { alert('Failed to add person'); }
        });
    }

    function openNoteModal() {
        createModal('New Note', [
            { name: 'title', label: 'Title', placeholder: 'Note title' },
            { name: 'content', label: 'Content', type: 'textarea', placeholder: 'Write your note…' },
            { name: 'type', label: 'Type', type: 'select', options: [
                { value: 'note', label: 'Note' }, { value: 'definition', label: 'Definition' }
            ]},
            { name: 'tags', label: 'Tags', placeholder: 'Comma-separated tags' }
        ], async (vals, close) => {
            try {
                const values = { ...vals };
                if (values.tags) values.tags = values.tags.split(',').map(t => t.trim());
                await fetch('/api/bases/core/core-notes/records', {
                    method: 'POST', credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ values })
                });
                close();
                loaded.notes = false;
                loadNotes();
            } catch (e) { alert('Failed to create note'); }
        });
    }

    // ===== INIT =====
    function init() {
        injectProjectsPage();
        injectPeoplePage();
        injectNotesPage();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
