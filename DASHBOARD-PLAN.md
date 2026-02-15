# Dashboard Implementation Plan — Concept 5A (Apex Colors)

> **Reference Image:** `media/dashboard-concepts/desktop/apex-5a-toggle-sidebar.png`
> **Branch:** `feature/ui-revamp` (worktree: `/root/lyfehub-v2/worktrees/ui-revamp/`)
> **Target:** Desktop-first, then mobile adaptation later

---

## Design Spec

### Color Palette (Apex Restoration)
- **Primary Accent:** `#FF8C00` (orange) — buttons, active states, highlights, checkboxes
- **Dark/Headers:** `#111111` — sidebar section headers, page headings
- **Text Primary:** `#282D30` — body text
- **Text Secondary:** `#666666` — subtitles, timestamps
- **Background:** `#FFFFFF` — main content area
- **Card Background:** `rgba(255, 255, 255, 0.7)` with `backdrop-filter: blur(12px)` — glassmorphism
- **Card Border:** `rgba(0, 0, 0, 0.08)`
- **Sidebar Background:** `#FAFAFA` — light gray sidebar
- **Active Item:** `#FF8C00` background pill with white text

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ [Sidebar 260px]  │  [Main Content - fluid]              │
│                  │                                       │
│ 👤 Jake Rogers   │  Home > Dashboard                     │
│                  │  Good morning, Jake — Feb 15, 2026    │
│ ▾ AREAS          │                                       │
│   ● Apex         │  ┌─────────────┬──────────────┐      │
│   ● Family       │  │  MY DAY     │  THIS WEEK   │      │
│   ● Health       │  │  (kanban)   │  (calendar)  │      │
│   ● Finances     │  │  To Do | In │              │      │
│   ● Vehicles     │  │  Progress | │              │      │
│                  │  │  Done       │              │      │
│ ▾ RESOURCES      │  ├─────────────┼──────────────┤      │
│   📝 Notes       │  │ QUICK NOTES │ AREAS AT A   │      │
│   👥 People      │  │             │ GLANCE       │      │
│   📚 Trade KB    │  │             │              │      │
│   📄 Documents   │  └─────────────┴──────────────┘      │
│                  │                                       │
│ ▾ TOOLS          │  [Quick Capture Bar - full width]     │
│   ✅ Tasks       │                                       │
│   📅 Calendar    │                                       │
│   ⚡ Capture     │                                       │
│                  │                                       │
│ ─────────────── │                                       │
│ ⭐ Favorites     │                                       │
│ 🕐 Recent        │                                       │
│                  │                                       │
│ ⚙️ Settings      │                                       │
└─────────────────────────────────────────────────────────┘
```

---

## Task List

### Phase 1: Foundation (Color System + Layout Shell)

**Task 1.1: Update CSS Variables — Apex Color Palette**
- Replace teal palette with orange/black Apex palette in `:root`
- Update `--neon-*` mapped variables
- Update `--glass-*` variables for white glassmorphism
- Files: `style.css`, `apex-theme.css`
- **Eval:** All CSS variables defined. No references to teal (`#14b8a6`) remain in `:root`. Orange (`#FF8C00`) is primary accent.

**Task 1.2: Create Sidebar Component (HTML + CSS)**
- New `<aside class="sidebar">` element in `index.html`
- Three collapsible sections: Areas, Resources, Tools
- User profile section at top (avatar + name)
- Favorites + Recent sections (collapsed by default)
- Settings link at bottom
- Files: new `css/sidebar.css`, modify `index.html`
- **Eval:** Sidebar renders at 260px width on left. All 3 sections toggle open/close. Active item shows orange highlight. Sidebar is scrollable if content overflows.

**Task 1.3: Create Sidebar JavaScript Controller**
- Toggle section collapse/expand with animation
- Active item tracking (highlight current page/area)
- Sidebar collapse to icon-only mode (optional, for later)
- Persist section open/closed state in localStorage
- Files: new `js/sidebar.js`
- **Eval:** Clicking section headers toggles content. State persists across page reload. Active item highlighted correctly.

**Task 1.4: Create Dashboard Layout Shell (HTML + CSS)**
- New `<main class="tab-content" data-tab="dashboard">` section
- Grid layout: 2x2 widget grid + full-width quick capture bar
- Widget card base styles (glassmorphism)
- Dashboard as the new default active tab
- Files: modify `index.html`, new `css/dashboard.css`
- **Eval:** Dashboard tab loads as default. 2x2 grid visible. Empty widget cards render with glassmorphism effect. Quick capture bar at bottom.

### Phase 2: Dashboard Widgets

**Task 2.1: My Day Widget (Tasks Due Today)**
- Fetch tasks due today from existing `/api/tasks` endpoint
- Mini kanban with 3 columns: To Do, In Progress, Done
- Tappable task cards with orange checkboxes
- Area color dots on each task
- Files: new `js/dashboard.js` (or `js/widgets/my-day.js`), update `css/dashboard.css`
- **Eval:** Widget loads tasks due today. Tasks show in correct columns. Checking a task moves it to Done. Empty state shows "No tasks today" message.

**Task 2.2: This Week Calendar Widget**
- Fetch events from existing `/api/calendars` endpoint for current week
- 7-day strip view with day names and dates
- Event dots/blocks on days with events
- Today highlighted with orange indicator
- Files: new `js/widgets/week-calendar.js`, update `css/dashboard.css`
- **Eval:** Widget shows 7 days starting Monday. Today is highlighted. Events appear as colored blocks. Clicking a day navigates to full calendar view for that date.

**Task 2.3: Quick Notes Widget**
- Fetch 4 most recent notes from existing notes/bases API
- Note title + preview snippet + timestamp
- Click to navigate to full note
- Files: new `js/widgets/quick-notes.js`, update `css/dashboard.css`
- **Eval:** Widget shows 4 recent notes with titles and timestamps. Clicking a note navigates to the notes tab. Empty state shows "No notes yet".

**Task 2.4: Areas at a Glance Widget**
- Display each Area with icon, name, active task count, progress bar
- Horizontal bars with orange fill based on completion percentage
- Click an area to filter dashboard by that area
- Files: new `js/widgets/areas-overview.js`, update `css/dashboard.css`
- **Eval:** All user areas display. Each shows task count and progress bar. Click filters correctly. Progress bar fills proportionally.

**Task 2.5: Quick Capture Bar**
- Full-width text input at bottom of dashboard
- Submit creates a new task in inbox/default list
- Keyboard shortcut (Ctrl+K or /) to focus
- Files: update `js/dashboard.js`, update `css/dashboard.css`
- **Eval:** Typing text and pressing Enter creates a task. Input clears after submit. Keyboard shortcut focuses input. Success toast appears.

### Phase 3: Areas Data Model

**Task 3.1: Areas Database Schema**
- New `areas` table: `id`, `user_id`, `name`, `color`, `icon`, `sort_order`, `created_at`, `updated_at`
- Default areas seeded on user creation: Work, Family, Health, Finances
- Migration script
- Files: update `backend/src/db/schema.js`, new `backend/src/db/areas.js`
- **Eval:** Table created on app start. Default areas exist for existing users. CRUD operations work.

**Task 3.2: Areas API Routes**
- `GET /api/areas` — list user's areas
- `POST /api/areas` — create area
- `PATCH /api/areas/:id` — update area (name, color, icon, order)
- `DELETE /api/areas/:id` — delete area
- Files: new `backend/src/routes/areas.js`, register in app
- **Eval:** All CRUD endpoints return correct data. Auth required. User can only see own areas.

**Task 3.3: Area Tagging on Tasks**
- Add `area_id` column to tasks table (nullable FK to areas)
- Update task creation/edit to accept `area_id`
- Update task API responses to include area info
- Files: update `backend/src/db/schema.js`, update `backend/src/routes/tasks.js`
- **Eval:** Tasks can be created with an area. Area info included in task responses. Filtering tasks by area works.

### Phase 4: Navigation Overhaul

**Task 4.1: Replace Header Tabs with Sidebar Navigation**
- Remove old `<nav class="tabs">` from header
- Header becomes minimal: logo + search (future) + user avatar
- All navigation moves to sidebar
- Update tab switching logic to work with sidebar clicks
- Files: modify `index.html`, modify `js/kanban.js` (tab logic), update `css/style.css`
- **Eval:** No tabs in header. Clicking sidebar items switches content. Header shows logo and minimal controls. All existing pages still accessible.

**Task 4.2: Update Bottom Nav for Mobile**
- Replace current bottom nav items: Home, Tasks, Calendar, People, Notes
- Remove "More" menu entirely
- Home = Dashboard
- Files: update `js/bottom-nav.js`, update `css/bottom-nav.css`
- **Eval:** Bottom nav shows 5 items. No "More" menu. Home goes to dashboard. All items navigate correctly.

**Task 4.3: Move Bases to Settings**
- Remove Bases from main navigation
- Add "Bases" section/link in settings.html
- Or: accessible via sidebar under a hidden/admin section
- Files: update `settings.html`, update sidebar config
- **Eval:** Bases not visible in main nav. Accessible from settings page. All base functionality still works.

### Phase 5: Polish & Integration

**Task 5.1: Glassmorphism Card Styles**
- Apply consistent glassmorphism to ALL widget cards
- Subtle shadows, frosted glass effect, rounded corners (12px)
- Hover states with slight elevation
- Files: `css/dashboard.css`, `css/style.css`
- **Eval:** All cards have frosted glass effect. Hover produces elevation. Consistent border-radius. Looks polished on white background.

**Task 5.2: Sidebar ↔ Dashboard Interaction**
- Clicking an Area in sidebar filters dashboard widgets to that area
- "All" / "Home" in sidebar shows unfiltered dashboard
- Active area highlighted in sidebar
- Files: update `js/sidebar.js`, update `js/dashboard.js`
- **Eval:** Clicking "Apex" area shows only Apex tasks/events. Clicking "Home" resets. Active area visually highlighted.

**Task 5.3: Empty States & Loading States**
- Skeleton loaders for each widget while data loads
- Meaningful empty states (not just "no data")
- Error states with retry
- Files: update all widget JS files, `css/dashboard.css`
- **Eval:** Skeleton animation shows during load. Empty states display helpful messages. Error shows retry button.

**Task 5.4: Desktop QA + Visual Polish**
- Full desktop QA at 1280px, 1440px, 1920px widths
- Verify all interactions work
- Screenshots at each breakpoint
- Fix any visual issues found
- **Eval:** No visual bugs at any desktop width. All interactions functional. Screenshots captured and verified.

---

## Execution Order

```
Phase 1 (Foundation) → can be parallelized:
  - Task 1.1 (CSS vars) — independent
  - Task 1.2 + 1.3 (Sidebar HTML/CSS/JS) — dependent on each other
  - Task 1.4 (Dashboard shell) — independent of sidebar

Phase 2 (Widgets) → after Phase 1 complete:
  - Task 2.1 (My Day) — independent
  - Task 2.2 (Week Calendar) — independent  
  - Task 2.3 (Quick Notes) — independent
  - Task 2.4 (Areas Overview) — depends on Phase 3.1-3.2
  - Task 2.5 (Quick Capture) — independent

Phase 3 (Areas) → can start in parallel with Phase 2:
  - Task 3.1 → 3.2 → 3.3 (sequential)

Phase 4 (Navigation) → after Phase 1 + 2:
  - Task 4.1 (Header) — after sidebar works
  - Task 4.2 (Bottom nav) — independent
  - Task 4.3 (Bases to settings) — independent

Phase 5 (Polish) → after all above:
  - All tasks sequential, final QA last
```

---

## Sub-Agent Assignment Plan

### Wave 1 (Parallel — Foundation)
- **Agent A:** Task 1.1 (CSS Variables) + Task 1.4 (Dashboard Shell)
- **Agent B:** Task 1.2 + 1.3 (Sidebar Component)

### Wave 2 (Parallel — Backend + Widgets)
- **Agent C:** Task 3.1 + 3.2 + 3.3 (Areas Backend — sequential)
- **Agent D:** Task 2.1 (My Day Widget)
- **Agent E:** Task 2.2 + 2.3 (Week Calendar + Quick Notes)
- **Agent F:** Task 2.5 (Quick Capture Bar)

### Wave 3 (After Wave 1+2)
- **Agent G:** Task 2.4 (Areas Overview Widget — needs Areas API)
- **Agent H:** Task 4.1 + 4.2 + 4.3 (Navigation Overhaul)

### Wave 4 (Polish)
- **Agent I:** Task 5.1 + 5.2 + 5.3 (Polish + Integration)
- **Agent J:** Task 5.4 (Desktop QA — browser-based verification)
