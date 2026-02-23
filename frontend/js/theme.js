/* Theme Controller — Light/Dark + Font Preference */
(function() {
    'use strict';

    const THEME_KEY = 'lyfehub-theme';
    const FONT_KEY = 'lyfehub-font';

    function getPreferred() {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved) return saved;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function apply(theme) {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        localStorage.setItem(THEME_KEY, theme);
    }

    function toggle() {
        const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        apply(current === 'dark' ? 'light' : 'dark');
    }

    function getFont() {
        return localStorage.getItem(FONT_KEY) || 'serif';
    }

    function setFont(font) {
        if (font === 'mono') {
            document.documentElement.setAttribute('data-font', 'mono');
        } else {
            document.documentElement.removeAttribute('data-font');
        }
        localStorage.setItem(FONT_KEY, font);
    }

    // Apply on load (immediately, before DOM ready)
    apply(getPreferred());
    setFont(getFont());

    // Bind toggle button after DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('theme-toggle-btn');
        if (btn) btn.addEventListener('click', toggle);
    });

    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(THEME_KEY)) {
            apply(e.matches ? 'dark' : 'light');
        }
    });

    // Expose globally
    window.LyfeHubTheme = { toggle, apply, getPreferred, setFont, getFont };
})();
