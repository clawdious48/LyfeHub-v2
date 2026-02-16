/**
 * Settings Profile Section
 * Handles avatar, name editing, theme, and date format.
 */
(function() {
    'use strict';

    let userData = null;

    document.addEventListener('DOMContentLoaded', initProfile);

    async function initProfile() {
        await loadProfile();
        setupNameEditing();
        setupThemeSelector();
        setupDateFormat();
    }

    async function loadProfile() {
        try {
            const res = await fetch('/api/auth/me', { credentials: 'include' });
            if (!res.ok) return;
            const data = await res.json();
            userData = data.user || data;

            // Avatar initials
            const name = userData.name || userData.email || '?';
            const parts = name.trim().split(/\s+/);
            const initials = parts.length > 1
                ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                : name.substring(0, 2).toUpperCase();
            document.getElementById('avatar-initials').textContent = initials;

            // Name
            document.getElementById('profile-name').textContent = userData.name || 'Unnamed';

            // Email
            document.getElementById('profile-email').textContent = userData.email || '';

            // Role badge
            const role = userData.role || 'viewer';
            const badge = document.getElementById('profile-role-badge');
            badge.textContent = role;

        } catch (e) {
            console.error('Failed to load profile:', e);
        }
    }

    function setupNameEditing() {
        const nameEl = document.getElementById('profile-name');
        const inputEl = document.getElementById('profile-name-input');

        nameEl.addEventListener('click', startEdit);
        nameEl.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') startEdit();
        });

        function startEdit() {
            inputEl.value = nameEl.textContent;
            nameEl.style.display = 'none';
            inputEl.style.display = '';
            inputEl.focus();
            inputEl.select();
        }

        function finishEdit() {
            const newName = inputEl.value.trim();
            inputEl.style.display = 'none';
            nameEl.style.display = '';

            if (!newName || newName === (userData && userData.name)) return;

            nameEl.textContent = newName;
            // Update initials
            const parts = newName.split(/\s+/);
            const initials = parts.length > 1
                ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                : newName.substring(0, 2).toUpperCase();
            document.getElementById('avatar-initials').textContent = initials;

            saveName(newName);
        }

        inputEl.addEventListener('blur', finishEdit);
        inputEl.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); inputEl.blur(); }
            if (e.key === 'Escape') {
                inputEl.value = userData ? userData.name : '';
                inputEl.blur();
            }
        });
    }

    async function saveName(name) {
        try {
            await fetch('/api/users/me', {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name })
            });
            if (userData) userData.name = name;
            Settings.showToast('Name updated', 'success');
        } catch (e) {
            Settings.showToast('Failed to update name', 'error');
        }
    }

    function setupThemeSelector() {
        const selector = document.getElementById('theme-selector');
        const buttons = selector.querySelectorAll('.theme-option');

        // Determine current theme
        const saved = localStorage.getItem('theme') || 'system';
        buttons.forEach(function(btn) {
            btn.classList.toggle('active', btn.dataset.theme === saved);
        });

        buttons.forEach(function(btn) {
            btn.addEventListener('click', function() {
                const theme = btn.dataset.theme;
                buttons.forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                applyTheme(theme);
                localStorage.setItem('theme', theme);
            });
        });
    }

    function applyTheme(theme) {
        if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
    }

    function setupDateFormat() {
        const select = document.getElementById('date-format-select');
        const saved = localStorage.getItem('dateFormat') || 'MM/DD/YYYY';
        select.value = saved;

        select.addEventListener('change', function() {
            localStorage.setItem('dateFormat', select.value);
            Settings.showToast('Date format updated', 'success');
        });
    }

})();
