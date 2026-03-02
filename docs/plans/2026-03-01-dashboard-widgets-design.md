# Dashboard Widget System — Design Document

*Date: 2026-03-01*
*Status: Approved*

---

## Vision

The dashboard is the central hub for personal productivity. Users should be able to enter, retrieve, and act on information in under 15 seconds. The widget canvas is fully customizable — users compose their own command center from a catalog of widgets covering quick actions, quick reference, external data, and productivity tools.

---

## Widget System Foundation

### Enhanced Widget Registry

The flat registry pattern (one top-level entry per widget type) with metadata fields for categorization, singleton control, and configuration.

```ts
interface WidgetDefinition {
  component: ComponentType<WidgetComponentProps>
  label: string
  description: string
  icon: LucideIcon
  category: 'productivity' | 'external' | 'data' | 'utility'
  singleton: boolean        // true = max one instance on dashboard
  configurable: boolean     // true = shows gear icon in edit mode
  configSchema?: ConfigField[]  // defines the config form fields per widget type
  minW: number
  minH: number
  defaultW: number
  defaultH: number
}

interface WidgetComponentProps {
  config?: Record<string, unknown>
}
```

### Widget Item (persisted layout)

Each widget instance on the dashboard:

```ts
interface WidgetItem {
  id: string          // UUID
  type: string        // registry key
  x: number
  y: number
  w: number
  h: number
  config?: Record<string, unknown>   // per-instance settings (feeds, base ID, links, etc.)
  style?: {
    preset: 'default' | 'borderless' | 'transparent'
    accent: string | null    // neon color name or null
    headerVisible: boolean
  }
}
```

### Widget Config Editor

When `isEditing` is true and a widget is `configurable`, the WidgetWrapper shows a gear icon in the header. Clicking it opens a `WidgetConfigDialog` that renders form fields based on the widget's `configSchema`. Each widget type defines what config fields it needs (text inputs, selects, URL fields, base pickers, color pickers, etc.).

The config schema is declarative — each field has a type, label, and default value. The dialog renders the appropriate input for each field type. This keeps widget configuration UI consistent across all widget types without each widget building its own settings panel.

### Categorized Add Widget Dialog

The Add Widget dialog groups widgets into 4 sections:

- **Productivity** — My Day, Inbox, Pomodoro, Habit Tracker
- **External** — Clock, Weather, News Feed, Quote
- **Data** — Base View, Areas
- **Utility** — Quick Links, Sticky Note, Quick Notes, This Week

Multi-instance widgets (Base View, News Feed, Quick Links, Sticky Note) show an "Add another" affordance and are never grayed out. Singleton widgets are grayed out when already present on the dashboard.

---

## Grid System

### Upgraded to 24-Column Grid

The grid doubles from 12 to 24 columns for finer positioning and sizing control. This allows up to 8 widgets side-by-side (at 3 columns each).

- **Breakpoints:** `{ lg: 1200, md: 996, sm: 768, xs: 480 }`
- **Columns:** `{ lg: 24, md: 24, sm: 12, xs: 2 }`
- **Row height:** 40px (halved from 80 to maintain proportions with the doubled column count)
- **Resize handles:** All 8 directions — n, s, e, w, ne, nw, se, sw (up from just se)
- **Default gap:** 16px (configurable via dashboard settings)

### Default Widget Positions (24-column grid)

| Widget | x | y | w | h |
|--------|---|---|---|---|
| My Day | 0 | 0 | 12 | 8 |
| This Week | 12 | 0 | 12 | 6 |
| Quick Notes | 0 | 8 | 12 | 6 |
| Inbox | 12 | 6 | 12 | 8 |
| Areas | 0 | 14 | 24 | 6 |

---

## Widget Customization

### Per-Widget Style

Three options available on every widget, accessible via the gear icon settings panel:

**1. Style preset**
- `default` — Glass card with border (current look, `bg-bg-surface border-border backdrop-blur`)
- `borderless` — Glass card, no border, subtle shadow only
- `transparent` — No card background at all, content floats directly on the dashboard canvas

**2. Accent color**
- Options: `none` | `purple` | `blue` | `cyan` | `pink` | `orange` | `green`
- Renders as a subtle 2px colored stripe on the card's top edge
- `none` uses the default border color

**3. Header visibility**
- `show` — Normal header with icon + title + controls
- `hide` — Header removed entirely, widget content fills the full card space
- In edit mode, hidden headers temporarily show a minimal floating overlay with drag handle + gear + remove button so the widget remains manageable

### Dashboard-Level Settings

Accessible via a "Customize" button in the edit toolbar (next to "Add Widget" and "Done"):

- **Widget gap:** Compact (8px) / Normal (16px) / Spacious (24px)
- **Dashboard background:** Small set of dark-theme-compatible presets (default dark, subtle gradient, subtle pattern). Not arbitrary image uploads.

Dashboard-level settings are stored alongside the widget layout in the dashboard API response:

```ts
interface DashboardLayout {
  widgets: WidgetItem[]
  settings?: {
    gap: 8 | 16 | 24
    background: string   // preset name
  }
}
```

---

## Widget Catalog

### External Widgets

#### Clock / Date Widget
- **Type key:** `clock`
- **Category:** External | **Singleton:** Yes | **Configurable:** Yes
- **Display:** Current time (digital), full date, day of week
- **Config:** 12h/24h format, show seconds toggle, timezone override, greeting on/off
- **Data source:** Client-side `setInterval` (every second with seconds enabled, every minute without)
- **Greeting:** Optional personalized line — "Good morning, Jake" based on time of day
- **Min size:** 6w x 3h | **Default size:** 8w x 4h
- **Backend:** None needed

#### Weather Widget
- **Type key:** `weather`
- **Category:** External | **Singleton:** Yes | **Configurable:** Yes
- **Display:** Current conditions (temp, weather icon, description) + today/tomorrow mini-forecast
- **Config:** City name (text input), temperature unit (F/C)
- **Data source:** OpenWeatherMap API via backend proxy
- **Backend:**
  - New env var: `OPENWEATHER_API_KEY`
  - New endpoint: `GET /api/weather?city=...&units=...`
  - Backend holds the API key, frontend never sees it
  - Backend caches responses for 30 minutes to stay under the free tier (1,000 calls/day)
- **Refresh:** On widget mount + every 30 min interval
- **Fallback:** "Weather not configured — add OPENWEATHER_API_KEY to environment" when API key missing
- **Min size:** 6w x 4h | **Default size:** 8w x 6h

#### News / RSS Feed Widget
- **Type key:** `news-feed`
- **Category:** External | **Singleton:** No (multi-instance) | **Configurable:** Yes
- **Display:** Scrollable list of headlines — source favicon, title, publish time per item. Click opens in new tab.
- **Config:** List of feed URLs managed via the gear icon settings panel
- **Adding feeds:** User pastes any URL. Backend auto-discovers RSS feed via `<link rel="alternate">` tags in the page HTML. Falls back to treating the URL as a direct feed URL. Returns feed title + favicon automatically.
- **Backend:**
  - New DB table: `rss_feeds` (id, user_id, url, feed_url, title, icon_url, created_at)
  - New DB table: `rss_feed_items` (id, feed_id, title, url, published_at, fetched_at) — cached items
  - New endpoints:
    - `POST /api/feeds` — add a feed (accepts any URL, discovers feed, returns metadata)
    - `GET /api/feeds` — list user's feeds
    - `DELETE /api/feeds/:id` — remove a feed
    - `GET /api/feeds/items?feed_ids=...&limit=...` — aggregated items sorted by publish date
  - Backend fetches/caches feed content every 15–30 minutes
- **Widget header:** Shows feed name when single feed configured, "News" when aggregated
- **Min size:** 6w x 4h | **Default size:** 8w x 8h

#### Quote Widget
- **Type key:** `quote`
- **Category:** External | **Singleton:** Yes | **Configurable:** Yes
- **Display:** Single quote with author attribution. Large quote text, small author line below.
- **Config:** Which Base + View to pull from (defaults to Notes base filtered to `Type = "Quote"`)
- **Data source:** Notes base records where `Type` includes "Quote". Quote text = note name/content, author = a property on the record.
- **Cycling:** New quote on each page load or configurable interval
- **Empty state:** "Add quotes to your Notes base with Type = Quote"
- **Min size:** 6w x 3h | **Default size:** 10w x 4h
- **Backend:** None new — uses existing Bases API

### Productivity Widgets

#### Pomodoro Timer Widget
- **Type key:** `pomodoro`
- **Category:** Productivity | **Singleton:** Yes | **Configurable:** Yes
- **Display:** Visual countdown with circular progress ring or linear bar. Session counter for completed pomodoros today.
- **States:** idle → focus → break → focus → ... → long break (cycle)
- **Controls:** Start/Pause, Skip (jump to next phase), Reset
- **Config:** Focus duration (default 25 min), short break (5 min), long break (15 min), sessions before long break (4)
- **Work Sessions integration:** Completed pomodoro auto-creates a Work Session record via `POST /api/work-sessions` with start/end timestamps. Optional task selector dropdown to link the session to a specific task.
- **Audio:** Browser Notification API or Web Audio chime on timer complete (user permission required)
- **State management:** Zustand store — timer state persists across page navigation within session, resets on tab close
- **Compact mode:** At small sizes, just the timer circle + play/pause. Expanded: full controls + session count + task selector.
- **Min size:** 4w x 4h | **Default size:** 6w x 6h
- **Backend:** Uses existing Work Sessions API. No new endpoints.

#### Habit Tracker Widget
- **Type key:** `habit-tracker`
- **Category:** Productivity | **Singleton:** Yes | **Configurable:** Yes
- **Display:** Today's habits as a checklist with toggle checkboxes. Each habit: name, color dot, checkbox. Streak count shown subtly (no guilt — follows ADHD principle #4, missed days just reset the counter, no red indicators or shame).
- **Data model:** Two default Bases, auto-created on first use:
  - **Habits Base** — Properties: Name (text), Color (select: red/orange/yellow/green/blue/purple), Frequency (select: daily/weekly), Active (checkbox)
  - **Habit Log Base** — Properties: Habit (relation → Habits base), Date (date), Notes (text)
- **Behavior:** Widget reads Habits base (filtered to Active=true), checks Habit Log for today's date to determine completion state. Toggling a checkbox creates (or deletes) a Habit Log record for today.
- **Config:** Which Habits base to use (defaults to the system "Habits" base)
- **"Manage Habits" link** in widget opens the Habits base in the Bases module
- **Compact:** Just checkboxes. **Expanded:** Checkboxes + streak + color dots
- **Min size:** 6w x 4h | **Default size:** 8w x 8h
- **Backend:** Uses existing Bases API for CRUD on both bases. No new endpoints.

#### My Day Widget (existing, enhanced)
- **Type key:** `my-day`
- **Category:** Productivity | **Singleton:** Yes | **Configurable:** No
- **Enhancements:**
  - Today's calendar events interleaved with tasks, sorted by time
  - Visual time markers (morning/afternoon/evening sections)
  - Quick-complete checkbox directly in widget (optimistic update via React Query)
  - "Add to My Day" quick action button
- **Min size:** 8w x 6h | **Default size:** 12w x 8h

#### Inbox Widget (existing, enhanced)
- **Type key:** `inbox`
- **Category:** Productivity | **Singleton:** Yes | **Configurable:** No
- **Enhancements:**
  - Type filter tabs: All / Tasks / Notes / People
  - Click an item to navigate to it (task → Tasks page, note → Bases/Notes, person → People page)
  - Count badge in widget header showing unprocessed total
  - Celebratory empty state: "All clear!" with a subtle check animation
- **Min size:** 6w x 6h | **Default size:** 12w x 8h

### Data Widgets

#### Base View Widget
- **Type key:** `base-view`
- **Category:** Data | **Singleton:** No (multi-instance) | **Configurable:** Yes
- **Display:** Mini-table or list showing records from any Base + View
- **Config:** Base ID (picker from user's bases), View ID (picker from that base's saved views, defaults to default view)
- **Display modes** (auto-selected based on widget size, or user-configurable):
  - **Table** — Compact rows with visible columns from the selected view, horizontal scroll if needed
  - **List** — Single-column card list showing record name + 1-2 key property values
- **Behavior:**
  - Respects the view's filters, sorts, and visible columns
  - Widget header auto-updates label to "{Base Name} — {View Name}"
  - Click a record → opens a record detail modal (placeholder, connects to Pages feature later)
  - "Open in Bases" link in header navigates to the full Base + View
  - Row limit based on widget height, with "+N more" overflow indicator
  - If configured base/view is deleted: "This view no longer exists — reconfigure" message
- **Min size:** 6w x 4h | **Default size:** 12w x 8h
- **Backend:** Uses existing Bases API. No new endpoints.

#### Areas Widget (existing, rewired)
- **Type key:** `areas`
- **Category:** Data | **Singleton:** Yes | **Configurable:** No
- Wire up as a pre-configured Base View Widget instance pointing at the Tags base filtered to `Type = "Area"`
- If no Areas exist: "Create your first Area in the Tags base" with a link
- **Min size:** 8w x 4h | **Default size:** 24w x 6h

### Utility Widgets

#### Quick Links Widget
- **Type key:** `quick-links`
- **Category:** Utility | **Singleton:** No (multi-instance) | **Configurable:** Yes
- **Display:** Grid of clickable link tiles. Each: name, URL, auto-fetched favicon, optional color.
- **Config:** List of links managed via gear icon settings panel (add/edit/remove)
- **Storage:** Links stored in `config.links` array in the widget config. No separate backend table.
  ```ts
  config.links: Array<{ name: string; url: string; color?: string }>
  ```
- **Favicon:** Auto-fetched from `https://www.google.com/s2/favicons?domain=DOMAIN&sz=32`
- **Display:** Icon grid at small sizes, icon + label list at larger sizes
- **Click:** Opens URL in new browser tab
- **"Add Link" button** always visible at the end of the grid (no edit mode needed for adding links)
- **Min size:** 4w x 3h | **Default size:** 8w x 6h
- **Backend:** None — purely client-side config storage

#### Sticky Note Widget
- **Type key:** `sticky-note`
- **Category:** Utility | **Singleton:** No (multi-instance) | **Configurable:** Yes
- **Display:** Freeform text area that auto-saves
- **Config:** Background color (select from palette: yellow, blue, green, pink, purple), title (optional text)
- **Storage:** Content saved in `config.content` field via dashboard layout API. No separate backend table.
- **Auto-save:** Debounced — 1 second after last keystroke, saves to dashboard layout
- **Format:** Plain text for v1 (no markdown rendering)
- **Min size:** 4w x 3h | **Default size:** 6w x 6h
- **Backend:** None — uses existing dashboard layout API

#### Quick Notes Widget (existing, unchanged)
- **Type key:** `quick-notes`
- **Category:** Utility | **Singleton:** Yes | **Configurable:** No
- Stays as-is — recent notes list
- **Min size:** 6w x 4h | **Default size:** 12w x 6h

#### This Week Widget (existing, unchanged)
- **Type key:** `week-cal`
- **Category:** Utility | **Singleton:** Yes | **Configurable:** No
- Stays as-is — week calendar strip
- **Min size:** 8w x 4h | **Default size:** 12w x 6h

---

## Backend Changes Required

### New Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/weather` | GET | Proxy to OpenWeatherMap. Params: `city`, `units`. Caches 30 min. |
| `/api/feeds` | POST | Add RSS feed. Accepts any URL, auto-discovers feed. Returns metadata. |
| `/api/feeds` | GET | List user's RSS feeds. |
| `/api/feeds/:id` | DELETE | Remove a feed. |
| `/api/feeds/items` | GET | Aggregated feed items. Params: `feed_ids`, `limit`. |

### New Database Tables

**`rss_feeds`**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| user_id | UUID | FK → users |
| url | TEXT | Original URL user pasted |
| feed_url | TEXT | Discovered RSS feed URL |
| title | TEXT | Feed title |
| icon_url | TEXT | Favicon URL |
| created_at | TIMESTAMP | |

**`rss_feed_items`**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| feed_id | UUID | FK → rss_feeds |
| title | TEXT | Item headline |
| url | TEXT | Item link |
| published_at | TIMESTAMP | From the feed |
| fetched_at | TIMESTAMP | When we cached it |

### New Environment Variables

| Variable | Purpose |
|----------|---------|
| `OPENWEATHER_API_KEY` | OpenWeatherMap free tier API key |

### Default Bases (auto-created)

The Habit Tracker widget requires two default bases. These are created automatically on first widget use (not on app install):

**Habits Base**
- Name: "Habits"
- Properties: Name (text), Color (select), Frequency (select: daily/weekly), Active (checkbox)
- Default view: all records, sorted by name

**Habit Log Base**
- Name: "Habit Log"
- Properties: Habit (relation → Habits), Date (date), Notes (text)
- Default view: all records, sorted by date descending

---

## Widget Catalog Summary

| Widget | Type Key | Category | Singleton | Configurable | Data Source |
|--------|----------|----------|-----------|-------------|-------------|
| Clock | `clock` | External | Yes | Yes | Client-side |
| Weather | `weather` | External | Yes | Yes | OpenWeatherMap via backend proxy |
| News Feed | `news-feed` | External | No | Yes | RSS feeds via backend |
| Quote | `quote` | External | Yes | Yes | Notes base (Type=Quote) |
| Pomodoro | `pomodoro` | Productivity | Yes | Yes | Work Sessions API |
| Habit Tracker | `habit-tracker` | Productivity | Yes | Yes | Habits + Habit Log bases |
| My Day | `my-day` | Productivity | Yes | No | Tasks + Calendar Events APIs |
| Inbox | `inbox` | Productivity | Yes | No | Inbox API |
| Base View | `base-view` | Data | No | Yes | Any Base + View |
| Areas | `areas` | Data | Yes | No | Tags base (Type=Area) |
| Quick Links | `quick-links` | Utility | No | Yes | Widget config |
| Sticky Note | `sticky-note` | Utility | No | Yes | Widget config |
| Quick Notes | `quick-notes` | Utility | Yes | No | Notes API |
| This Week | `week-cal` | Utility | Yes | No | Calendar Events API |

14 widgets total. 9 new, 5 existing (3 enhanced, 2 unchanged).

---

## Pages Feature (Future — Reference Only)

The Base View Widget and other data widgets will eventually support clicking a record to open a rich "Page" view. Pages are view-scoped layouts that display a record's content and properties in a polished, customizable format. This is a separate design effort that will be specced independently. For now, clicking a record in a Base View Widget opens a simple record detail modal showing all properties.

---

## ADHD Design Compliance

All widgets follow the app-wide ADHD design principles:

1. **Default to Today** — My Day, Inbox, and Habit Tracker all show what matters NOW
2. **Progressive disclosure** — Widget configs start with defaults, expand for customization
3. **Calm colors** — Neon palette is blue/green/purple dominant. No red unless truly urgent.
4. **No guilt mechanics** — Habit streaks reset silently, no shame indicators. Inbox empty state is celebratory.
5. **Quick capture under 15 seconds** — Sidebar capture buttons + Inbox widget = fast in, fast process
6. **"Reschedule / Drop it"** — Overdue tasks in My Day get gentle nudge buttons
7. **Celebration on completion** — Inbox "All clear!" animation, task completion feedback
8. **Capacity awareness** — Widgets show limited rows with "+N more", never overwhelming lists
