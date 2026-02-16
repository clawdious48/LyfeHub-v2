// Theme Manager — handles light/dark mode
(function() {
  const STORAGE_KEY = 'theme';
  
  // Get saved theme or detect system preference
  function getPreferredTheme() {
    // Check both keys for backward compat
    const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('lyfehub-theme');
    if (saved) return saved;
    return 'system';
  }
  
  // Resolve theme value (handle 'system')
  function resolveTheme(theme) {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  }
  
  // Apply theme to document
  function applyTheme(theme) {
    const resolved = resolveTheme(theme);
    document.documentElement.setAttribute('data-theme', resolved);
    localStorage.setItem(STORAGE_KEY, theme);
    // Clean up old key
    localStorage.removeItem('lyfehub-theme');
    
    // Update any toggle buttons
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      const icon = btn.querySelector('.theme-icon');
      if (icon) {
        icon.textContent = theme === 'dark' ? '☀️' : '🌙';
      }
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    });
  }
  
  // Toggle between light and dark
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }
  
  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved || saved === 'system') {
      applyTheme('system');
    }
  });
  
  // Apply immediately (before DOM loads to prevent flash)
  applyTheme(getPreferredTheme());
  
  // Expose globally
  window.LyfeHubTheme = { apply: applyTheme, toggle: toggleTheme, get: getPreferredTheme };
})();
