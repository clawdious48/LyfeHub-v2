# Navigation Redesign — Header-Driven Area Switching

**Date:** 2026-03-02
**Status:** Approved
**Approach:** Route-Based Area Detection (Approach A)

---

## Summary

Replace the sidebar-driven navigation with a persistent header that contains two area buttons (Dashboard / Apex Restoration), module tabs that change per area, and a springboard-style dashboard switcher with swipe gestures. The sidebar becomes purely contextual — only visible on pages that need page-specific content (Calendar, Tasks, Mail, Bases).

---

## Header Layout

Three zones in a single persistent header bar (`h-14`):

### Left Zone — Area Buttons

- **Dashboard** — navigates to `/`, shows Personal tabs
- **Apex Restoration** — navigates to `/apex`, shows Apex tabs
- Active area auto-detected from current route and highlighted with accent color
- Clicking the active area's button while on a module page returns to that area's dashboard

### Center Zone — Module Tabs + Dot Indicators

Tabs change based on active area:

| Personal Area | Apex Area |
|---------------|-----------|
| Calendar | Jobs |
| Tasks | CRM |
| Mail | Inventory |
| Notes | Documents |
| People | Workflows |
| Bases | Accounting |
| | Reports |

- Default display: icon + label per tab
- User preference toggle: icon+label, icon-only, or label-only (stored in user settings)
- Active tab highlighted when on a module page
- When on a dashboard page, no tab is active — dot indicators appear below the tabs

### Right Zone — Actions

- Quick Capture buttons (Note, Task, Contact) — always visible
- Theme toggle (sun/moon)
- User name + logout

---

## Area Detection & Routing

### Route-to-Area Mapping

- **Personal:** `/`, `/calendar`, `/tasks`, `/mail`, `/notes`, `/people`, `/bases`
- **Apex:** `/apex`, `/jobs`, `/apex/crm`, `/apex/inventory`, `/apex/documents`, `/apex/workflows`, `/apex/accounting`, `/apex/reports`

Header reads `useLocation().pathname` and matches against these route sets. Logic lives in `headerConfig.ts`.

### Area Button Behavior

- Click "Dashboard" → `navigate('/')` → Personal dashboard + personal tabs
- Click "Apex Restoration" → `navigate('/apex')` → Apex dashboard + apex tabs
- If already on that area's dashboard, no-op

### Tab Behavior

- Click a tab → navigate to that module → dots disappear, tab highlights
- Active tab determined by route match (exact or prefix)

### New Route

`/apex` is the Apex dashboard page (new). Existing `/jobs` remains as the Jobs module page.

---

## Tab Customization & Reordering

### Edit Mode

Triggered by the same "Edit" button on the dashboard that toggles widget editing.

### Reordering

- Tabs become draggable via @dnd-kit/sortable
- Drag handles appear on each tab in edit mode
- Tab order saved per-area in user settings

### Per-Tab Styling

In edit mode, hovering a tab reveals a gear icon. Clicking opens a popover with:

- **Tab color** — default/resting background
- **Border** — color and thickness
- **Translucency** — opacity slider for glassmorphic effect
- **Selected color** — background when this tab's page is active
- **Hover color** — background on mouse hover

Each property uses a color picker + opacity slider. Defaults inherit from the design system.

### Non-Edit Mode

Tabs display with saved styles. No gear icon, no drag handles.

---

## Dashboard Springboard

### Two Default Dashboards

- **Personal Productivity** (`/`) — existing dashboard with current widgets
- **Apex Restoration** (`/apex`) — new dashboard, same react-grid-layout widget engine, default Apex widget layout

### Navigation Between Dashboards

- **Trackpad:** 2-finger horizontal swipe
- **Keyboard:** Left/Right arrow keys cycle through dashboards
- **Home shortcut:** Up or Down arrow key jumps to designated Home dashboard
- **Area buttons:** clicking switches dashboards
- **Dot indicators:** clickable to jump directly

### Swipe Animation

- Dashboard content slides horizontally with the swipe
- Header tabs crossfade/slide in sync at the same speed
- Dot indicator animates position smoothly
- CSS `scroll-snap-type: x mandatory` for native trackpad feel
- Programmatic `scrollTo` for keyboard/button triggers
- Active area button highlight transitions smoothly

### Home Dashboard

- One dashboard designated as "Home" (default: Personal Productivity)
- User can change via dashboard settings or context menu on dot indicators
- Up/Down arrow always snaps to Home

### Future: Custom Dashboards

- Edit mode would show "+ New Dashboard" (creates additional dots)
- Not built now — architecture supports N dashboards via array of dashboard configs
- Two defaults are finalized first

---

## Sidebar Changes

### New Behavior: Contextual Only

The sidebar only renders when a page has page-specific content.

**Pages WITH sidebar:**

| Route | Sidebar Content |
|-------|----------------|
| `/calendar` | Mini-calendar, calendar list, Google sync (CalendarSidebarContent) |
| `/tasks` | Smart views, my lists, task counts (TasksSidebarContent) |
| `/mail` | Folders, labels (MailSidebarContent) |
| `/bases` | Base groups, base browser (BaseSidebarContent) |

**Pages WITHOUT sidebar (full-width):**

`/`, `/apex`, `/jobs`, `/people`, `/notes`, and all `/apex/*` routes.

### What Moves Out of Sidebar

| From Sidebar | To Header |
|-------------|-----------|
| Dashboard nav link | Area button (left zone) |
| Apex Restoration section | Area button + Apex tabs (left + center zone) |
| Productivity / Resources nav links | Personal tabs (center zone) |
| Quick Capture buttons | Right zone |
| Settings link | Right zone (near user/theme) |

### Sidebar Rendering

`AppLayout.tsx` checks if current route has a sidebar config. If yes, render sidebar + content. If no, give `<Outlet />` full width. Sidebar retains its own collapse toggle when visible.

---

## Data & Persistence

### User Settings (server-side, `users.settings` JSON)

| Setting | Key | Default |
|---------|-----|---------|
| Tab display mode | `header.tabDisplayMode` | `'icon-label'` |
| Personal tab order | `header.personalTabOrder` | `['calendar','tasks','mail','notes','people','bases']` |
| Apex tab order | `header.apexTabOrder` | `['jobs','crm','inventory','documents','workflows','accounting','reports']` |
| Per-tab styles | `header.tabStyles` | `{}` (empty = design system defaults) |
| Home dashboard | `header.homeDashboard` | `'personal'` |
| Apex dashboard layout | `dashboards.apex` | Default Apex widget layout |

### Existing (unchanged)

- Personal dashboard layout → `GET/PUT /api/dashboard/layout`
- Sidebar collapse/section state → sidebar store (only relevant when sidebar visible)

### Backend Extension

Support multiple dashboard layouts — extend existing endpoint with `?dashboard=personal|apex` query param, or store all layouts under `dashboards.personal` and `dashboards.apex` in `users.settings`.

### New Zustand Store

`useHeaderStore` — manages tab display mode preference. Active area is derived from route (not stored). Hydrates from user settings on auth.

---

## Widget Availability

The "Add Widget" dialog in edit mode shows widgets based on the current dashboard:

- **Personal dashboard:** All existing personal widgets (My Day, Week Calendar, Quick Notes, Inbox, Areas, Clock, Sticky Note, Quote, Quick Links, Weather, News Feed, Pomodoro, Habit Tracker, Base View, Quick Capture, Navigation)
- **Apex dashboard:** All personal widgets PLUS Apex-specific widgets (to be built: Active Jobs, Revenue Summary, Drying Status, etc.)

Apex widgets are only available if the user has Apex access.
