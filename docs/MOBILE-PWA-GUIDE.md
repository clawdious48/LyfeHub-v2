# Mobile & PWA Implementation Guide

> Reference document for making LyfeHub v1 mobile-friendly and a great PWA.  
> Created: 2026-02-09

---

## Current State Assessment

### What's Already Working
- ✅ Viewport meta tag: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- ✅ Basic responsive breakpoints in `css/style.css`:
  - 1400px — board columns reduce to 3
  - 900px — board columns reduce to 2
  - 768px — bases grid stacks
  - 600px/640px — single column, header stacks

### What's Missing
- ❌ No PWA manifest
- ❌ No service worker
- ❌ No iOS meta tags for "Add to Home Screen"
- ❌ No hamburger menu for mobile navigation
- ❌ Modals not optimized for mobile fullscreen
- ❌ No offline support

---

## Phase 1: Basic PWA Setup (1-2 hours)

### 1.1 Create Web App Manifest

Create `frontend/manifest.json`:

```json
{
  "name": "LyfeHub",
  "short_name": "LyfeHub",
  "description": "Personal productivity and project management",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1a2e",
  "theme_color": "#bf5af2",
  "orientation": "any",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### 1.2 Add to HTML Head (all pages)

```html
<!-- PWA Manifest -->
<link rel="manifest" href="/manifest.json">

<!-- Theme Color -->
<meta name="theme-color" content="#bf5af2">

<!-- iOS Support -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="LyfeHub">
<link rel="apple-touch-icon" href="/icons/icon-192.png">

<!-- Splash screens for iOS (optional but nice) -->
<link rel="apple-touch-startup-image" href="/icons/splash.png">
```

### 1.3 Create Service Worker

Create `frontend/sw.js`:

```javascript
const CACHE_NAME = 'lyfehub-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/settings.html',
  '/css/style.css',
  '/css/auth.css',
  '/css/apex-jobs.css',
  '/css/calendar.css',
  '/js/api.js',
  '/js/bases.js',
  '/js/tasks.js',
  '/js/kanban.js',
  '/js/calendar.js',
  '/js/people.js',
  '/js/modal.js'
];

// Install - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - network first, fallback to cache
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip API calls (let them fail naturally when offline)
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
```

### 1.4 Register Service Worker

Add to bottom of `<body>` in all HTML files:

```html
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.error('SW registration failed:', err));
  }
</script>
```

### 1.5 Create Icons

Need these in `frontend/icons/`:
- `icon-192.png` (192x192)
- `icon-512.png` (512x512)
- Optional: `favicon.ico`, iOS splash screens

**Tip:** Use https://realfavicongenerator.net/ to generate all icon sizes from one source image.

---

## Phase 2: Mobile Navigation (2-3 hours)

### 2.1 Hamburger Menu for Small Screens

Add to `css/style.css`:

```css
/* Mobile Navigation */
.mobile-menu-toggle {
  display: none;
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
}

@media (max-width: 768px) {
  .mobile-menu-toggle {
    display: block;
  }
  
  .header {
    position: relative;
  }
  
  .tabs {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--surface);
    flex-direction: column;
    padding: 1rem;
    gap: 0.5rem;
    border-top: 1px solid var(--border);
    display: none;
    z-index: 100;
  }
  
  .tabs.open {
    display: flex;
  }
  
  .tabs .tab {
    width: 100%;
    text-align: left;
    padding: 0.75rem 1rem;
  }
}
```

Add hamburger button to header (before tabs):

```html
<button class="mobile-menu-toggle" onclick="document.querySelector('.tabs').classList.toggle('open')">
  ☰
</button>
```

### 2.2 Bottom Navigation Alternative

For app-like feel, consider bottom nav on mobile:

```css
@media (max-width: 768px) {
  .tabs {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    top: auto;
    flex-direction: row;
    justify-content: space-around;
    background: var(--surface);
    border-top: 1px solid var(--border);
    padding: 0.5rem 0;
    z-index: 100;
  }
  
  .tabs .tab {
    flex-direction: column;
    font-size: 0.7rem;
    padding: 0.5rem;
    gap: 0.25rem;
  }
  
  /* Add icons above text */
  .tabs .tab::before {
    font-size: 1.25rem;
  }
  
  body {
    padding-bottom: 70px; /* Space for fixed nav */
  }
}
```

---

## Phase 3: Mobile Modal Optimization (1-2 hours)

### 3.1 Fullscreen Modals on Mobile

```css
@media (max-width: 768px) {
  .modal-overlay {
    align-items: flex-end; /* Slide up from bottom */
  }
  
  .modal {
    width: 100%;
    max-width: 100%;
    height: 90vh;
    max-height: 90vh;
    border-radius: 1rem 1rem 0 0;
    margin: 0;
  }
  
  .modal-content {
    max-height: calc(90vh - 60px);
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .modal-header {
    position: sticky;
    top: 0;
    background: var(--surface);
    z-index: 1;
  }
}
```

### 3.2 Touch-Friendly Form Inputs

```css
@media (max-width: 768px) {
  input, select, textarea, button {
    font-size: 16px; /* Prevents iOS zoom on focus */
    min-height: 44px; /* Apple's recommended touch target */
  }
  
  .btn {
    padding: 0.75rem 1.5rem;
  }
}
```

---

## Phase 4: Touch & Gesture Polish (2-4 hours)

### 4.1 Disable Unwanted Touch Behaviors

```css
/* Prevent text selection on UI elements */
.tabs, .btn, .card, .column-header {
  -webkit-user-select: none;
  user-select: none;
}

/* Prevent pull-to-refresh in standalone mode */
body {
  overscroll-behavior-y: contain;
}

/* Smooth scrolling */
.board-container, .modal-content, .list-view {
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
}
```

### 4.2 Touch Feedback

```css
@media (hover: none) {
  .btn:active,
  .tab:active,
  .task-card:active {
    transform: scale(0.98);
    opacity: 0.9;
  }
}
```

### 4.3 Safe Area Insets (for notched phones)

```css
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* If using fixed bottom nav */
.tabs {
  padding-bottom: calc(0.5rem + env(safe-area-inset-bottom));
}
```

---

## Phase 5: Offline Support (4-8 hours)

### 5.1 Cache API Responses

Update service worker to cache API data:

```javascript
// In sw.js fetch handler, add API caching:
if (event.request.url.includes('/api/')) {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open('lyfehub-api-v1').then(cache => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
  return;
}
```

### 5.2 Offline Indicator

```javascript
// Add to main JS
window.addEventListener('online', () => {
  document.body.classList.remove('offline');
});

window.addEventListener('offline', () => {
  document.body.classList.add('offline');
});
```

```css
.offline-banner {
  display: none;
  background: var(--warning);
  color: white;
  text-align: center;
  padding: 0.5rem;
}

body.offline .offline-banner {
  display: block;
}
```

### 5.3 Background Sync (Advanced)

For offline mutations (creating/updating tasks), use Background Sync API:

```javascript
// Queue failed mutations
async function queueOfflineAction(action) {
  const queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
  queue.push(action);
  localStorage.setItem('offlineQueue', JSON.stringify(queue));
  
  if ('serviceWorker' in navigator && 'sync' in registration) {
    await registration.sync.register('sync-actions');
  }
}
```

---

## Testing Checklist

### Device Testing
- [ ] iPhone SE (small screen)
- [ ] iPhone 14/15 (notch/dynamic island)
- [ ] iPad (tablet layout)
- [ ] Android phone (Chrome)
- [ ] Android tablet

### PWA Testing
- [ ] Lighthouse PWA audit passes
- [ ] "Add to Home Screen" works on iOS
- [ ] "Install" prompt appears on Android
- [ ] App opens in standalone mode
- [ ] Offline mode shows cached content
- [ ] Icons display correctly

### Interaction Testing
- [ ] All buttons have 44px+ touch targets
- [ ] No horizontal scroll on any page
- [ ] Modals are dismissible on mobile
- [ ] Forms don't trigger unwanted zoom
- [ ] Navigation is accessible with thumb

---

## Quick Wins (Do These First)

1. **Add manifest.json** — makes it installable
2. **Add service worker** — enables offline + caching
3. **iOS meta tags** — proper "Add to Home Screen"
4. **16px font on inputs** — prevents iOS zoom
5. **44px touch targets** — minimum for buttons

---

## Resources

- [PWA Builder](https://www.pwabuilder.com/) — Generate manifest and icons
- [Workbox](https://developer.chrome.com/docs/workbox/) — Google's service worker library
- [web.dev PWA Guide](https://web.dev/progressive-web-apps/)
- [Safari Web Content Guide](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/)
