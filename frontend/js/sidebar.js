/* sidebar.js — LyfeHub v2 Sidebar Controller */
(function () {
  'use strict';

  const STORAGE_KEY = 'sidebar-sections';
  const COLLAPSE_KEY = 'sidebar-collapsed';

  /* --- SVG Icons --- */
  const SVG = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

  const ICONS = {
    // Quick Actions
    'add-note': SVG('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>'),
    'add-task': SVG('<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>'),
    'add-contact': SVG('<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>'),
    // Resources
    'notes': SVG('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>'),
    'people': SVG('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
    'trade-kb': SVG('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'),
    'documents': SVG('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'),
    // Tools
    'tasks': SVG('<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'),
    'calendar': SVG('<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
    'quick-capture': SVG('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'),
    // Footer
    'settings': SVG('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
    'logout': SVG('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>'),
    // Extra sections
    'favorites': SVG('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'),
    'recent': SVG('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
    // Collapse toggle
    'chevron-left': SVG('<polyline points="15 18 9 12 15 6"/>'),
    'chevron-right': SVG('<polyline points="9 18 15 12 9 6"/>'),
  };

  // Default section config — Quick Actions FIRST
  const SECTIONS = [
    {
      id: 'quick-actions',
      label: 'Quick Actions',
      defaultOpen: true,
      items: [
        { id: 'add-note', text: 'Add Note', icon: 'add-note', action: 'add-note' },
        { id: 'add-task', text: 'Add Task', icon: 'add-task', action: 'add-task' },
        { id: 'add-contact', text: 'Add Contact', icon: 'add-contact', action: 'add-contact' },
      ],
    },
    {
      id: 'areas',
      label: 'Areas',
      defaultOpen: true,
      items: [
        { id: 'apex', text: 'Apex', dot: '#FF8C00' },
        { id: 'family', text: 'Family', dot: '#E91E63' },
        { id: 'health', text: 'Health', dot: '#4CAF50' },
        { id: 'finances', text: 'Finances', dot: '#2196F3' },
        { id: 'vehicles', text: 'Vehicles', dot: '#9E9E9E' },
      ],
    },
    {
      id: 'resources',
      label: 'Resources',
      defaultOpen: true,
      items: [
        { id: 'notes', text: 'Notes', icon: 'notes' },
        { id: 'people', text: 'People', icon: 'people' },
        { id: 'trade-kb', text: 'Trade KB', icon: 'trade-kb' },
        { id: 'documents', text: 'Documents', icon: 'documents' },
      ],
    },
    {
      id: 'tools',
      label: 'Tools',
      defaultOpen: true,
      items: [
        { id: 'tasks', text: 'Tasks', icon: 'tasks' },
        { id: 'calendar', text: 'Calendar', icon: 'calendar' },
        { id: 'quick-capture', text: 'Quick Capture', icon: 'quick-capture' },
      ],
    },
  ];

  const EXTRA_SECTIONS = [
    {
      id: 'favorites',
      label: 'Favorites',
      labelIcon: 'favorites',
      defaultOpen: false,
      placeholder: 'Pin your favorites here',
    },
    {
      id: 'recent',
      label: 'Recent',
      labelIcon: 'recent',
      defaultOpen: false,
      placeholder: 'Recent items appear here',
    },
  ];

  /* --- State --- */
  function loadSectionState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveSectionState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function isCollapsed() {
    return localStorage.getItem(COLLAPSE_KEY) === 'true';
  }

  function setCollapsed(val) {
    localStorage.setItem(COLLAPSE_KEY, val ? 'true' : 'false');
  }

  /* --- DOM helpers --- */
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'className') node.className = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
      else node.setAttribute(k, v);
    });
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(c => {
        if (typeof c === 'string') node.appendChild(document.createTextNode(c));
        else if (c) node.appendChild(c);
      });
    }
    return node;
  }

  function iconEl(iconKey, className) {
    const span = document.createElement('span');
    span.className = className || 'sidebar-nav-icon';
    span.innerHTML = ICONS[iconKey] || '';
    return span;
  }

  /* --- Build sidebar --- */
  function buildProfile(user) {
    const initials = user.name
      ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2)
      : '?';
    return el('div', { className: 'sidebar-profile' }, [
      el('div', { className: 'sidebar-avatar' }, initials),
      el('div', { className: 'sidebar-user-info' }, [
        el('div', { className: 'sidebar-user-name' }, user.name || 'User'),
        el('div', { className: 'sidebar-user-email' }, user.email || ''),
      ]),
    ]);
  }

  function buildCollapseToggle(sidebar) {
    const btn = el('button', { className: 'sidebar-collapse-btn', title: 'Toggle sidebar' });
    btn.innerHTML = isCollapsed() ? ICONS['chevron-right'] : ICONS['chevron-left'];
    btn.addEventListener('click', () => {
      const collapsed = !sidebar.classList.contains('sidebar-collapsed');
      sidebar.classList.toggle('sidebar-collapsed', collapsed);
      document.body.classList.toggle('sidebar-is-collapsed', collapsed);
      setCollapsed(collapsed);
      btn.innerHTML = collapsed ? ICONS['chevron-right'] : ICONS['chevron-left'];
    });
    return btn;
  }

  function buildNavItem(item) {
    const indicator = item.dot
      ? el('span', { className: 'sidebar-nav-dot', style: `background:${item.dot}` })
      : iconEl(item.icon, 'sidebar-nav-icon');
    const textSpan = el('span', { className: 'sidebar-nav-text' }, item.text);
    const row = el('div', { className: 'sidebar-nav-item', 'data-nav': item.id, title: item.text }, [
      indicator,
      textSpan,
    ]);
    row.addEventListener('click', () => {
      if (item.action) {
        document.dispatchEvent(new CustomEvent('sidebar:action', { detail: { action: item.action } }));
        return;
      }
      setActiveItem(item.id);
      document.dispatchEvent(new CustomEvent('sidebar:navigate', { detail: { tab: item.id } }));
    });
    return row;
  }

  function setActiveItem(id) {
    document.querySelectorAll('.sidebar-nav-item.active').forEach(n => n.classList.remove('active'));
    const target = document.querySelector(`.sidebar-nav-item[data-nav="${id}"]`);
    if (target) target.classList.add('active');
  }

  function buildSection(sec, state) {
    const isOpen = state[sec.id] !== undefined ? state[sec.id] : sec.defaultOpen;
    const section = el('div', { className: 'sidebar-section' + (isOpen ? '' : ' collapsed'), 'data-section': sec.id });

    const chevron = el('span', { className: 'sidebar-section-chevron' }, '▾');
    const header = el('div', { className: 'sidebar-section-header' }, [
      el('span', { className: 'sidebar-section-label' }, sec.label),
      chevron,
    ]);

    const content = el('div', { className: 'sidebar-section-content' });

    if (sec.items) {
      sec.items.forEach(item => content.appendChild(buildNavItem(item)));
    }
    if (sec.placeholder) {
      content.appendChild(el('div', { className: 'sidebar-placeholder' }, sec.placeholder));
    }

    header.addEventListener('click', () => {
      section.classList.toggle('collapsed');
      const st = loadSectionState();
      st[sec.id] = !section.classList.contains('collapsed');
      saveSectionState(st);
      if (!section.classList.contains('collapsed')) {
        content.style.maxHeight = content.scrollHeight + 'px';
      }
    });

    section.appendChild(header);
    section.appendChild(content);
    return section;
  }

  function buildFooter() {
    const footer = el('div', { className: 'sidebar-footer' });
    const settingsLink = el('a', { className: 'sidebar-footer-item', href: '/settings.html', title: 'Settings' }, [
      iconEl('settings', 'sidebar-footer-icon'),
      el('span', { className: 'sidebar-footer-text' }, 'Settings'),
    ]);
    const logoutBtn = el('button', { className: 'sidebar-footer-item', title: 'Logout' }, [
      iconEl('logout', 'sidebar-footer-icon'),
      el('span', { className: 'sidebar-footer-text' }, 'Logout'),
    ]);
    logoutBtn.addEventListener('click', () => {
      const existing = document.getElementById('logout-btn');
      if (existing) existing.click();
    });
    footer.appendChild(settingsLink);
    footer.appendChild(logoutBtn);
    return footer;
  }

  /* --- Init --- */
  function initSidebar() {
    const container = document.getElementById('app-sidebar');
    if (!container) return;

    container.innerHTML = '';

    const state = loadSectionState();
    const user = { name: 'Loading...', email: '' };

    // Apply collapsed state
    if (isCollapsed()) {
      container.classList.add('sidebar-collapsed');
      document.body.classList.add('sidebar-is-collapsed');
    }

    // Collapse toggle
    container.appendChild(buildCollapseToggle(container));

    // Profile
    const profile = buildProfile(user);
    container.appendChild(profile);

    // Main sections (excluding resources — pinned to bottom)
    const sectionsWrap = el('div', { className: 'sidebar-sections' });
    SECTIONS.filter(sec => sec.id !== 'resources').forEach(sec => sectionsWrap.appendChild(buildSection(sec, state)));

    // Divider
    sectionsWrap.appendChild(el('div', { className: 'sidebar-divider' }));

    // Extra sections
    EXTRA_SECTIONS.forEach(sec => sectionsWrap.appendChild(buildSection(sec, state)));

    container.appendChild(sectionsWrap);

    // Tables (Resources) — fixed at bottom above footer
    const tablesWrap = el('div', { className: 'sidebar-tables' });
    const resourcesSec = SECTIONS.find(sec => sec.id === 'resources');
    if (resourcesSec) {
      const resSection = buildSection({ ...resourcesSec, label: 'Tables' }, state);
      tablesWrap.appendChild(resSection);
    }
    container.appendChild(tablesWrap);

    // Footer
    container.appendChild(buildFooter());

    // Set initial max-heights
    requestAnimationFrame(() => {
      container.querySelectorAll('.sidebar-section:not(.collapsed) .sidebar-section-content').forEach(c => {
        c.style.maxHeight = c.scrollHeight + 'px';
      });
    });

    // Load user profile
    loadUserProfile(container);

    // Listen for tab changes from other sources (bottom nav, header tabs)
    document.addEventListener('tab:changed', (e) => {
      if (e.detail && e.detail.tab) setActiveItem(e.detail.tab);
    });
    document.addEventListener('bottomnav:navigate', (e) => {
      if (e.detail && e.detail.tab) setActiveItem(e.detail.tab);
    });
  }

  async function loadUserProfile(container) {
    try {
      const resp = await fetch('/api/users/me', {
        headers: { Authorization: 'Bearer ' + (localStorage.getItem('token') || '') },
      });
      if (!resp.ok) return;
      const data = await resp.json();
      const user = data.user || data;
      const profileEl = container.querySelector('.sidebar-profile');
      if (profileEl) {
        const name = user.name || user.username || 'User';
        const email = user.email || '';
        const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        profileEl.querySelector('.sidebar-avatar').textContent = initials;
        profileEl.querySelector('.sidebar-user-name').textContent = name;
        profileEl.querySelector('.sidebar-user-email').textContent = email;
      }
    } catch {
      // silently fail
    }
  }

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebar);
  } else {
    initSidebar();
  }

  window.initSidebar = initSidebar;
})();
