# Dashboard Widget System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the dashboard from 5 basic widgets to a 14-widget customizable command center with a 24-column grid, per-widget styling, widget configuration UI, and backend support for weather + RSS feeds.

**Architecture:** Flat widget registry with category/singleton/configurable metadata. 24-column react-grid-layout grid with 8-directional resize. Per-widget config stored in the dashboard layout JSON alongside position data. Backend proxy endpoints for weather (OpenWeatherMap) and RSS feeds (auto-discovery + caching). Habit data stored in default Bases via existing Bases API.

**Tech Stack:** React 19, TypeScript, TanStack Query, Zustand, shadcn/ui, react-grid-layout, Tailwind CSS v4, Node/Express backend, PostgreSQL.

**Design doc:** `docs/plans/2026-03-01-dashboard-widgets-design.md`

---

## Parallelization Map

Tasks are grouped into waves. All tasks within a wave can run in parallel. Each wave depends on the previous wave completing.

```
Wave 0: Foundation (Tasks 1-3)        — registry + grid + config system
Wave 1: Client-Only Widgets (Tasks 4-7)  — clock, sticky note, quick links, quote
Wave 2: Backend Endpoints (Tasks 8-9)    — weather API proxy, RSS feed CRUD
Wave 3: Backend-Dependent Widgets (Tasks 10-11) — weather widget, news feed widget
Wave 4: Productivity Widgets (Tasks 12-14) — pomodoro, habit tracker, base view
Wave 5: Existing Widget Enhancements (Tasks 15-16) — inbox + my day upgrades
Wave 6: Polish (Task 17)               — add widget dialog categories + dashboard settings
```

---

### Task 1: Upgrade Widget Registry & Types

**Files:**
- Modify: `frontend-next/src/widgets/registry.ts`
- Modify: `frontend-next/src/pages/DashboardPage.tsx`
- Modify: `frontend-next/src/api/hooks/useDashboard.ts`

**Step 1: Update WidgetDefinition type in registry.ts**

Replace the existing `WidgetDefinition` interface with the enhanced version:

```ts
import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'

export type WidgetCategory = 'productivity' | 'external' | 'data' | 'utility'

export interface ConfigField {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'toggle' | 'color' | 'url' | 'base-picker' | 'view-picker' | 'links-editor' | 'feeds-editor'
  default?: unknown
  options?: { label: string; value: string }[]  // for select type
  placeholder?: string
  dependsOn?: string  // key of another field this depends on (e.g., view-picker depends on base-picker)
}

export interface WidgetStyle {
  preset: 'default' | 'borderless' | 'transparent'
  accent: string | null
  headerVisible: boolean
}

export interface WidgetDefinition {
  component: ComponentType<{ config?: Record<string, unknown> }>
  label: string
  description: string
  icon: LucideIcon
  category: WidgetCategory
  singleton: boolean
  configurable: boolean
  configSchema?: ConfigField[]
  minW: number
  minH: number
  defaultW: number
  defaultH: number
}
```

**Step 2: Update WidgetItem type and DashboardLayout in useDashboard.ts**

Update the types to include `config` and `style` fields:

```ts
interface WidgetLayout {
  id: string
  type: string
  x: number
  y: number
  w: number
  h: number
  config?: Record<string, unknown>
  style?: {
    preset: 'default' | 'borderless' | 'transparent'
    accent: string | null
    headerVisible: boolean
  }
}

interface DashboardSettings {
  gap: 8 | 16 | 24
  background: string
}

interface DashboardLayout {
  widgets: WidgetLayout[]
  settings?: DashboardSettings
}
```

**Step 3: Update existing widget entries in registry.ts**

Add `description`, `category`, `singleton`, and `configurable` fields to all 5 existing entries. Update their size values to the 24-column grid (double x and w values). Example for `my-day`:

```ts
'my-day': {
  component: MyDayWidget,
  label: 'My Day',
  description: 'Today\'s tasks and calendar events',
  icon: Sun,
  category: 'productivity',
  singleton: true,
  configurable: false,
  minW: 8, minH: 6, defaultW: 12, defaultH: 8,
},
```

All 5 existing widgets: `my-day` (productivity, singleton), `week-cal` (utility, singleton), `quick-notes` (utility, singleton), `inbox` (productivity, singleton), `areas` (data, singleton). None are configurable yet.

**Step 4: Update DashboardPage.tsx grid constants**

Change the grid to 24 columns:

```ts
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480 }
const COLS = { lg: 24, md: 24, sm: 12, xs: 2 }
const ROW_HEIGHT = 40
```

Update `DEFAULT_WIDGETS` to 24-column positions:

```ts
const DEFAULT_WIDGETS: WidgetItem[] = [
  { id: 'default-my-day',   type: 'my-day',      x: 0,  y: 0, w: 12, h: 8 },
  { id: 'default-calendar', type: 'week-cal',     x: 12, y: 0, w: 12, h: 6 },
  { id: 'default-notes',    type: 'quick-notes',  x: 0,  y: 8, w: 12, h: 6 },
  { id: 'default-inbox',    type: 'inbox',        x: 12, y: 6, w: 12, h: 8 },
  { id: 'default-areas',    type: 'areas',        x: 0,  y: 14, w: 24, h: 6 },
]
```

**Step 5: Enable 8-directional resize handles in DashboardPage.tsx**

Change the `resizeConfig` prop on `ResponsiveGridLayout`:

```ts
resizeConfig={{ enabled: isEditing, handles: ['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne'] }}
```

**Step 6: Update DashboardPage.tsx to pass config and style to widgets**

Update the `WidgetItem` interface in DashboardPage to include `config` and `style`. Pass them through to `WidgetWrapper`:

```tsx
<WidgetWrapper
  type={widget.type}
  config={widget.config}
  style={widget.style}
  isEditing={isEditing}
  onRemove={() => handleRemoveWidget(widget.id)}
  onConfigChange={(newConfig) => handleConfigChange(widget.id, newConfig)}
  onStyleChange={(newStyle) => handleStyleChange(widget.id, newStyle)}
/>
```

Add `handleConfigChange` and `handleStyleChange` callbacks that update the widget's config/style in the `widgets` state array.

**Step 7: Update the backend default layout in dashboard.js**

Update `DEFAULT_LAYOUT` to use 24-column positions matching the frontend defaults.

**Step 8: Commit**

```
feat(dashboard): upgrade registry types and grid to 24-column system
```

---

### Task 2: Widget Wrapper — Styling + Config Gear Icon

**Files:**
- Modify: `frontend-next/src/widgets/WidgetWrapper.tsx`
- Create: `frontend-next/src/widgets/WidgetConfigDialog.tsx`
- Create: `frontend-next/src/widgets/WidgetStylePanel.tsx`

**Step 1: Update WidgetWrapper props and styling**

Add `config`, `style`, `onConfigChange`, `onStyleChange` props. Apply style presets to the Card wrapper:

- `default` — current look: `bg-bg-surface border-border`
- `borderless` — `bg-bg-surface border-transparent shadow-md`
- `transparent` — `bg-transparent border-transparent`

Apply accent color as a `border-t-2` with the neon color class. Handle `headerVisible: false` by hiding the CardHeader entirely (but showing a minimal overlay in edit mode with drag handle + gear + remove).

**Step 2: Add gear icon to widget header**

When `isEditing` is true and the widget's registry entry has `configurable: true`, show a gear icon (`Settings` from lucide-react) next to the remove button. Clicking it opens a state variable `configOpen` that renders `WidgetConfigDialog`.

**Step 3: Create WidgetConfigDialog**

A Dialog component that reads the widget's `configSchema` from the registry and renders form fields for each entry. Field types map to shadcn/ui components:

- `text` → `<Input />`
- `number` → `<Input type="number" />`
- `select` → `<Select />`
- `toggle` → `<Checkbox />`
- `color` → Custom color picker (row of colored circles)
- `url` → `<Input type="url" />`
- `base-picker` → `<Select />` populated from `useBases()` hook
- `view-picker` → `<Select />` populated from views of the selected base
- `links-editor` → Custom component (Task 6)
- `feeds-editor` → Custom component (Task 11)

The dialog also includes a "Style" tab/section with the 3 style options (preset, accent, header visibility). On save, calls `onConfigChange` and `onStyleChange` with the updated values.

**Step 4: Create WidgetStylePanel**

A reusable panel component rendered inside the config dialog that shows:
- Style preset selector (3 options as visual cards)
- Accent color selector (row of colored circles + "none")
- Header visibility toggle

**Step 5: Commit**

```
feat(dashboard): widget wrapper styling, config dialog, and gear icon
```

---

### Task 3: Add Widget Dialog — Categories + Multi-Instance

**Files:**
- Modify: `frontend-next/src/widgets/AddWidgetDialog.tsx`

**Step 1: Rewrite AddWidgetDialog with category tabs**

Replace the flat grid with a tabbed layout using shadcn Tabs component. Four tabs: Productivity, External, Data, Utility. Each tab shows its widgets as cards with icon + label + description.

**Step 2: Handle singleton vs multi-instance**

Singleton widgets already on the dashboard are grayed out with "(Already added)" text. Multi-instance widgets (`singleton: false`) are always clickable, even if instances already exist. Show a small count badge if instances exist: "2 on dashboard".

**Step 3: Commit**

```
feat(dashboard): categorized add widget dialog with multi-instance support
```

---

### Task 4: Clock Widget

**Files:**
- Create: `frontend-next/src/widgets/ClockWidget.tsx`
- Modify: `frontend-next/src/widgets/registry.ts`

**Step 1: Build ClockWidget component**

Client-side only. Uses `useState` + `useEffect` with `setInterval`. Displays:
- Large digital time (HH:MM, optionally :SS)
- Full date: "Saturday, March 1, 2026"
- Day of week
- Optional greeting line: "Good morning, Jake" (reads user name from `useAuth()`)

Config props:
- `format`: `'12h'` | `'24h'` (default: `'12h'`)
- `showSeconds`: boolean (default: false)
- `showGreeting`: boolean (default: true)

**Step 2: Register in registry.ts**

```ts
'clock': {
  component: ClockWidget,
  label: 'Clock',
  description: 'Current time, date, and optional greeting',
  icon: Clock,
  category: 'external',
  singleton: true,
  configurable: true,
  configSchema: [
    { key: 'format', label: 'Time format', type: 'select', default: '12h', options: [{ label: '12 hour', value: '12h' }, { label: '24 hour', value: '24h' }] },
    { key: 'showSeconds', label: 'Show seconds', type: 'toggle', default: false },
    { key: 'showGreeting', label: 'Show greeting', type: 'toggle', default: true },
  ],
  minW: 6, minH: 3, defaultW: 8, defaultH: 4,
},
```

**Step 3: Commit**

```
feat(dashboard): add clock/date widget with configurable format and greeting
```

---

### Task 5: Sticky Note Widget

**Files:**
- Create: `frontend-next/src/widgets/StickyNoteWidget.tsx`
- Modify: `frontend-next/src/widgets/registry.ts`

**Step 1: Build StickyNoteWidget component**

A `<textarea>` that auto-saves content to `config.content` via debounced `onConfigChange` callback (1-second debounce). Styled with a subtle background tint based on `config.color`.

Color palette: yellow (`bg-yellow-500/10`), blue (`bg-blue-500/10`), green (`bg-green-500/10`), pink (`bg-pink-500/10`), purple (`bg-purple-500/10`).

Config props:
- `content`: string (the note text)
- `color`: `'yellow'` | `'blue'` | `'green'` | `'pink'` | `'purple'` (default: `'yellow'`)
- `title`: string (optional title, shown above textarea)

The widget needs an `onConfigChange` prop passed from WidgetWrapper. When the user types, debounce and call `onConfigChange({ ...config, content: newText })` which triggers a dashboard layout save.

**Step 2: Register in registry.ts**

```ts
'sticky-note': {
  component: StickyNoteWidget,
  label: 'Sticky Note',
  description: 'Freeform text scratchpad that auto-saves',
  icon: StickyNote,
  category: 'utility',
  singleton: false,
  configurable: true,
  configSchema: [
    { key: 'title', label: 'Title', type: 'text', default: '', placeholder: 'Optional title...' },
    { key: 'color', label: 'Color', type: 'color', default: 'yellow' },
  ],
  minW: 4, minH: 3, defaultW: 6, defaultH: 6,
},
```

Note: `content` is NOT in configSchema — it's edited inline in the widget, not in the config dialog.

**Step 3: Commit**

```
feat(dashboard): add sticky note widget with auto-save and color options
```

---

### Task 6: Quick Links Widget

**Files:**
- Create: `frontend-next/src/widgets/QuickLinksWidget.tsx`
- Create: `frontend-next/src/widgets/config/LinksEditor.tsx`
- Modify: `frontend-next/src/widgets/registry.ts`

**Step 1: Build QuickLinksWidget component**

Renders a grid of link tiles. Each tile shows a favicon (from `https://www.google.com/s2/favicons?domain=DOMAIN&sz=32`) + link name. Clicking opens the URL in a new tab (`window.open(url, '_blank')`).

An "Add Link" button is always visible at the end of the grid (not gated behind edit mode). Clicking it opens a small inline form: name + URL fields + save button.

Config props:
- `links`: `Array<{ name: string; url: string; color?: string }>`

**Step 2: Build LinksEditor component**

A config form component for the `links-editor` field type. Shows the current list of links with edit/delete buttons, plus an "Add Link" form at the bottom. Each link has: name (text input), URL (url input), color (optional color picker).

This component is used inside WidgetConfigDialog when a field has `type: 'links-editor'`.

**Step 3: Register in registry.ts**

```ts
'quick-links': {
  component: QuickLinksWidget,
  label: 'Quick Links',
  description: 'Shortcuts to your frequently visited sites',
  icon: ExternalLink,
  category: 'utility',
  singleton: false,
  configurable: true,
  configSchema: [
    { key: 'links', label: 'Links', type: 'links-editor', default: [] },
  ],
  minW: 4, minH: 3, defaultW: 8, defaultH: 6,
},
```

**Step 4: Commit**

```
feat(dashboard): add quick links widget with favicon grid and inline add
```

---

### Task 7: Quote Widget

**Files:**
- Create: `frontend-next/src/widgets/QuoteWidget.tsx`
- Modify: `frontend-next/src/widgets/registry.ts`

**Step 1: Build QuoteWidget component**

Reads from a configured Base + View (defaults to Notes base filtered to Type=Quote). Uses `useBases()` to find the base, `useBase(baseId)` to get records. Picks a random quote on mount (or cycles on interval if configured).

Display: Large italic quote text, small author line below. Minimal, centered layout.

If no records match: shows "Add quotes to your Notes base with Type = Quote" with a link to the Bases page.

Config props:
- `baseId`: string (default: auto-detect Notes base)
- `viewId`: string (default: none — shows all records from the base filtered client-side)
- `authorProperty`: string (default: `'Author'` — which property holds the author name)
- `interval`: number (default: 0 — 0 means change on page load only, positive number = minutes between rotations)

**Step 2: Register in registry.ts**

Category: external, singleton: true, configurable: true.

**Step 3: Commit**

```
feat(dashboard): add quote widget displaying notes from bases
```

---

### Task 8: Weather Backend — API Proxy Endpoint

**Files:**
- Create: `backend/src/routes/weather.js`
- Modify: `backend/src/index.ts` (mount route)

**Step 1: Create weather.js route**

```js
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// In-memory cache: { key: { data, fetchedAt } }
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

router.get('/', async (req, res) => {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'Weather not configured — add OPENWEATHER_API_KEY to environment' });
    }

    const { city, units = 'imperial' } = req.query;
    if (!city) return res.status(400).json({ error: 'city parameter is required' });

    const cacheKey = `${city}:${units}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      return res.json(cached.data);
    }

    // Fetch current weather + forecast in parallel
    const [currentRes, forecastRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=${units}&appid=${apiKey}`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=${units}&cnt=8&appid=${apiKey}`),
    ]);

    if (!currentRes.ok) {
      const err = await currentRes.json();
      return res.status(currentRes.status).json({ error: err.message || 'Weather API error' });
    }

    const current = await currentRes.json();
    const forecast = forecastRes.ok ? await forecastRes.json() : null;

    const data = {
      current: {
        temp: Math.round(current.main.temp),
        feels_like: Math.round(current.main.feels_like),
        description: current.weather[0]?.description,
        icon: current.weather[0]?.icon,
        humidity: current.main.humidity,
        wind_speed: Math.round(current.wind?.speed || 0),
        city: current.name,
      },
      forecast: forecast?.list?.map(f => ({
        dt: f.dt,
        temp: Math.round(f.main.temp),
        icon: f.weather[0]?.icon,
        description: f.weather[0]?.description,
      })) || [],
    };

    cache.set(cacheKey, { data, fetchedAt: Date.now() });
    res.json(data);
  } catch (err) {
    console.error('Weather API error:', err);
    res.status(500).json({ error: 'Failed to fetch weather' });
  }
});

module.exports = router;
```

**Step 2: Mount in index.ts**

Add `app.use('/api/weather', require('./routes/weather'));` after the dashboard route.

**Step 3: Commit**

```
feat(api): add weather proxy endpoint with 30-min cache
```

---

### Task 9: RSS Feed Backend — CRUD + Item Fetching

**Files:**
- Create: `backend/src/db/feeds.js` (schema + queries)
- Create: `backend/src/routes/feeds.js`
- Modify: `backend/src/index.ts` (mount route)

**Step 1: Create feeds.js schema/queries**

Schema migration (using existing `IF NOT EXISTS` pattern):

```sql
CREATE TABLE IF NOT EXISTS rss_feeds (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  url TEXT NOT NULL,
  feed_url TEXT NOT NULL,
  title TEXT DEFAULT '',
  icon_url TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rss_feed_items (
  id UUID PRIMARY KEY,
  feed_id UUID NOT NULL REFERENCES rss_feeds(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT DEFAULT '',
  published_at TIMESTAMP,
  fetched_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rss_feeds_user ON rss_feeds(user_id);
CREATE INDEX IF NOT EXISTS idx_rss_feed_items_feed ON rss_feed_items(feed_id);
```

Run this migration in the `initFeeds()` function exported from the module.

Export query helpers: `getUserFeeds(userId)`, `createFeed(userId, data)`, `deleteFeed(id, userId)`, `upsertFeedItems(feedId, items)`, `getFeedItems(feedIds, limit)`.

**Step 2: Create feeds.js route**

Endpoints:

- `POST /api/feeds` — accepts `{ url }`. Uses `fetch` to load the URL, parses HTML to find `<link rel="alternate" type="application/rss+xml">`, extracts the feed URL. Falls back to treating the input URL as a direct feed URL. Fetches the feed, parses it (use a lightweight XML parser or regex for RSS/Atom), saves feed metadata + initial items. Returns feed object.

- `GET /api/feeds` — returns user's feeds list.

- `DELETE /api/feeds/:id` — deletes feed and cascades to items.

- `GET /api/feeds/items` — params: `feed_ids` (comma-separated), `limit` (default 20). Returns items sorted by `published_at` DESC.

For RSS parsing, use a simple approach: fetch the feed URL, parse XML to extract `<item>` or `<entry>` elements with `<title>`, `<link>`, and `<pubDate>` or `<published>`. No heavy library needed — a simple regex/string parser or the built-in DOMParser equivalent (`xml2js` or similar lightweight package).

**Step 3: Mount in index.ts**

Add `app.use('/api/feeds', require('./routes/feeds'));`

Call `initFeeds()` from the server startup.

**Step 4: Commit**

```
feat(api): add RSS feed CRUD endpoints with auto-discovery and item caching
```

---

### Task 10: Weather Widget (Frontend)

**Files:**
- Create: `frontend-next/src/widgets/WeatherWidget.tsx`
- Create: `frontend-next/src/api/hooks/useWeather.ts`
- Modify: `frontend-next/src/api/hooks/index.ts`
- Modify: `frontend-next/src/widgets/registry.ts`

**Step 1: Create useWeather.ts hook**

```ts
export const weatherKeys = {
  all: ['weather'] as const,
  current: (city: string, units: string) => [...weatherKeys.all, city, units] as const,
}

export function useWeather(city: string, units: string = 'imperial') {
  return useQuery({
    queryKey: weatherKeys.current(city, units),
    queryFn: () => apiClient.get<WeatherResponse>(`/weather?city=${encodeURIComponent(city)}&units=${units}`),
    enabled: !!city,
    staleTime: 30 * 60 * 1000, // 30 min
    refetchInterval: 30 * 60 * 1000,
  })
}
```

**Step 2: Build WeatherWidget component**

Reads `config.city` and `config.units` from props. Calls `useWeather(city, units)`. Displays:
- Weather icon (OpenWeatherMap icon URL: `https://openweathermap.org/img/wn/${icon}@2x.png`)
- Temperature (large)
- Description ("partly cloudy")
- Feels like, humidity, wind speed (smaller details)
- Mini forecast strip showing next 3-4 periods

If no city configured: show a friendly "Set your city in widget settings" message.

**Step 3: Register in registry.ts**

Category: external, singleton: true, configurable: true. Config schema: city (text), units (select: imperial/metric).

**Step 4: Export from hooks index.ts**

**Step 5: Commit**

```
feat(dashboard): add weather widget with OpenWeatherMap integration
```

---

### Task 11: News Feed Widget (Frontend)

**Files:**
- Create: `frontend-next/src/widgets/NewsFeedWidget.tsx`
- Create: `frontend-next/src/widgets/config/FeedsEditor.tsx`
- Create: `frontend-next/src/api/hooks/useFeeds.ts`
- Modify: `frontend-next/src/api/hooks/index.ts`
- Modify: `frontend-next/src/widgets/registry.ts`

**Step 1: Create useFeeds.ts hooks**

Hooks: `useFeeds()`, `useAddFeed()`, `useDeleteFeed()`, `useFeedItems(feedIds, limit)`. Follow existing query key factory pattern.

**Step 2: Build FeedsEditor component**

Config form component for the `feeds-editor` field type. Shows current feeds with delete buttons. Has an "Add feed" input where the user pastes any URL + clicks "Add". The add action calls `useAddFeed()` which hits `POST /api/feeds` with auto-discovery.

**Step 3: Build NewsFeedWidget component**

Reads `config.feedIds` (array of feed IDs). Calls `useFeedItems(feedIds, 15)`. Renders a scrollable list of headlines: favicon + title + time ago. Click opens URL in new tab.

Widget header shows first feed title if single feed, "News" if multiple.

If no feeds configured: "Add your first feed in widget settings" message.

**Step 4: Register in registry.ts**

Category: external, singleton: false, configurable: true. Config schema: feedIds (feeds-editor).

**Step 5: Commit**

```
feat(dashboard): add news feed widget with RSS auto-discovery
```

---

### Task 12: Pomodoro Timer Widget

**Files:**
- Create: `frontend-next/src/widgets/PomodoroWidget.tsx`
- Create: `frontend-next/src/stores/pomodoroStore.ts`
- Create: `frontend-next/src/api/hooks/useWorkSessions.ts`
- Modify: `frontend-next/src/api/hooks/index.ts`
- Modify: `frontend-next/src/widgets/registry.ts`

**Step 1: Create pomodoroStore.ts**

Zustand store (NOT persisted — resets on tab close):

```ts
interface PomodoroState {
  status: 'idle' | 'focus' | 'break' | 'long_break'
  timeRemaining: number  // seconds
  sessionsCompleted: number
  linkedTaskId: string | null
  startedAt: string | null  // ISO timestamp for work session logging
  // actions
  start: (focusDuration: number) => void
  pause: () => void
  resume: () => void
  skip: () => void
  reset: () => void
  tick: () => void
  setLinkedTask: (taskId: string | null) => void
}
```

**Step 2: Create useWorkSessions.ts hook**

```ts
export function useCreateWorkSession() {
  return useMutation({
    mutationFn: (data: { name: string; start: string; end: string; task_id?: string }) =>
      apiClient.post('/work-sessions', data),
  })
}
```

The backend Work Sessions API already exists at `/api/work-sessions` with `POST /` accepting `{ name, start, end, task_id }`.

**Step 3: Build PomodoroWidget component**

Reads config for durations. Uses `pomodoroStore` for state. Renders:
- Circular progress indicator (SVG circle with `stroke-dasharray`/`stroke-dashoffset`)
- Time display (MM:SS)
- Status label ("Focus", "Break", "Long Break")
- Start/Pause button, Skip button, Reset button
- Session counter: "3 of 4" pomodoros
- Optional task selector dropdown (reads from `useTasks()` hook)

Timer ticks via `useEffect` with `setInterval(store.tick, 1000)` when running.

When a focus session completes, auto-creates a Work Session via `useCreateWorkSession()`.

Audio notification: use Web Audio API to play a short tone. Wrap in try/catch for browsers that block autoplay.

At compact sizes (minW), show only the timer circle + play/pause. At larger sizes, show full controls + task selector.

**Step 4: Register in registry.ts**

Category: productivity, singleton: true, configurable: true. Config schema: focusDuration (number, default 25), breakDuration (number, default 5), longBreakDuration (number, default 15), sessionsBeforeLongBreak (number, default 4).

**Step 5: Commit**

```
feat(dashboard): add pomodoro timer widget with work session logging
```

---

### Task 13: Habit Tracker Widget

**Files:**
- Create: `frontend-next/src/widgets/HabitTrackerWidget.tsx`
- Modify: `frontend-next/src/widgets/registry.ts`

**Step 1: Build HabitTrackerWidget component**

This widget is backed by two Bases: "Habits" and "Habit Log". On first render, it:
1. Calls `useBases()` to find existing "Habits" and "Habit Log" bases
2. If they don't exist, shows a "Set up Habit Tracker" button that creates both bases via `useCreateBase()` with the correct properties (Name, Color, Frequency, Active for Habits; Habit, Date, Notes for Habit Log)
3. Once bases exist, reads active habits from the Habits base
4. Reads today's Habit Log records to determine which habits are completed

Display:
- Each habit as a row: colored dot + name + checkbox
- Streak count (calculated client-side from Habit Log records for this habit, counting consecutive days backward from today). Show as small gray text, no red/shame styling.
- Toggling a checkbox creates or deletes a Habit Log record for today

Use `useBase(habitsBaseId)` and `useBase(habitLogBaseId)` to read data. Use `useCreateBaseRecord()` and `useDeleteBaseRecord()` for toggling.

"Manage Habits" link at bottom navigates to `/bases/{habitsBaseId}`.

**Step 2: Register in registry.ts**

Category: productivity, singleton: true, configurable: true. Config schema: habitsBaseId (base-picker, auto-populated on setup).

**Step 3: Commit**

```
feat(dashboard): add habit tracker widget backed by Bases data model
```

---

### Task 14: Base View Widget

**Files:**
- Create: `frontend-next/src/widgets/BaseViewWidget.tsx`
- Modify: `frontend-next/src/widgets/registry.ts`

**Step 1: Build BaseViewWidget component**

The most versatile widget. Config: `baseId` and `viewId`.

Reads base data via `useBase(baseId)`. Filters/sorts records client-side according to the selected view's config (filters, sorts, visible columns).

Display modes:
- **Table mode** (default for wider widgets): Compact table with visible columns from the view. Truncated cells. Horizontal scroll if needed.
- **List mode** (for narrower widgets): Card list showing record name + 1-2 property values.

Auto-select display mode based on widget width (measure via a `ResizeObserver` or the widget's `w` value from layout).

Widget header shows "{Base Name} — {View Name}" instead of "Base View". If no view selected, shows base name only.

Features:
- Click a record → placeholder: log to console for now, connect to Pages feature later
- "Open in Bases" link in header → `navigate('/bases')` and set the active base (or just navigate to `/bases` for now)
- Row limit based on widget height, "+N more" overflow text
- If base/view deleted: "This view no longer exists — reconfigure" message with gear icon prompt

**Step 2: Register in registry.ts**

Category: data, singleton: false, configurable: true. Config schema: baseId (base-picker), viewId (view-picker, depends on baseId).

**Step 3: Commit**

```
feat(dashboard): add base view widget for displaying any base + view
```

---

### Task 15: Enhanced Inbox Widget

**Files:**
- Modify: `frontend-next/src/widgets/InboxWidget.tsx`

**Step 1: Add type filter tabs**

Add a local state `filter: 'all' | 'task' | 'note' | 'person'`. Render small tab buttons at the top: All / Tasks / Notes / People. Filter the `items` array client-side by `item.type`.

**Step 2: Add click-to-navigate**

Wrap each item in a clickable element. On click, use `useNavigate()` from react-router to go to the appropriate page:
- task → `/tasks` (future: `/tasks/${id}`)
- note → `/bases` (future: open in bases with note record)
- person → `/people` (future: `/people/${id}`)

**Step 3: Add count badge to widget header**

Pass the inbox count up to WidgetWrapper via a custom mechanism, or use `useInboxCount()` directly in the widget and render a Badge next to the widget title inside the widget body.

**Step 4: Celebratory empty state**

Replace the current empty state with "All clear!" and a checkmark icon. Add a subtle CSS animation (scale-in or opacity fade) using Tailwind `animate-` utilities.

**Step 5: Commit**

```
feat(dashboard): enhance inbox widget with type filters and navigation
```

---

### Task 16: Enhanced My Day Widget

**Files:**
- Modify: `frontend-next/src/widgets/MyDayWidget.tsx`

**Step 1: Add calendar events**

Import `useCalendarEvents` hook. Fetch today's events. Merge tasks and events into a unified list, sorted by time (events by start_time, tasks by due_time, items without times at the bottom).

**Step 2: Visual time sections**

Group items into Morning (before 12pm), Afternoon (12pm-5pm), Evening (after 5pm), and Unscheduled. Show subtle section headers only when the section has items.

**Step 3: Quick-complete checkbox**

Add a clickable checkbox next to each task. Use `useUpdateTask()` for optimistic completion toggle. Events don't get checkboxes.

Distinguish events from tasks visually: events get a colored dot (from their calendar color), tasks get a checkbox.

**Step 4: Commit**

```
feat(dashboard): enhance my day widget with events, time sections, quick-complete
```

---

### Task 17: Dashboard Settings + Polish

**Files:**
- Create: `frontend-next/src/widgets/DashboardSettingsDialog.tsx`
- Modify: `frontend-next/src/pages/DashboardPage.tsx`

**Step 1: Create DashboardSettingsDialog**

A Dialog with two options:
- **Widget gap:** Three visual options (Compact/Normal/Spacious) as selectable cards
- **Dashboard background:** A few preset options as selectable swatches (default dark, subtle gradient, subtle pattern)

Reads from / writes to `dashboardSettings` state in DashboardPage.

**Step 2: Add "Customize" button to edit toolbar**

When in edit mode, add a "Customize" button next to "Add Widget" that opens DashboardSettingsDialog.

**Step 3: Apply settings to grid**

Use `settings.gap` as the `margin` prop on ResponsiveGridLayout: `margin={[gap, gap]}`. Apply `settings.background` as a CSS class on the dashboard container.

**Step 4: Persist settings**

Include `settings` in the layout save payload. The backend already stores the entire layout JSON blob, so no backend changes needed — `settings` just becomes another field in the JSON.

**Step 5: Commit**

```
feat(dashboard): add dashboard settings dialog with gap and background options
```

---

## Summary of All Files

### New Files (Frontend)
- `frontend-next/src/widgets/ClockWidget.tsx`
- `frontend-next/src/widgets/WeatherWidget.tsx`
- `frontend-next/src/widgets/NewsFeedWidget.tsx`
- `frontend-next/src/widgets/QuoteWidget.tsx`
- `frontend-next/src/widgets/PomodoroWidget.tsx`
- `frontend-next/src/widgets/HabitTrackerWidget.tsx`
- `frontend-next/src/widgets/BaseViewWidget.tsx`
- `frontend-next/src/widgets/StickyNoteWidget.tsx`
- `frontend-next/src/widgets/QuickLinksWidget.tsx`
- `frontend-next/src/widgets/WidgetConfigDialog.tsx`
- `frontend-next/src/widgets/WidgetStylePanel.tsx`
- `frontend-next/src/widgets/DashboardSettingsDialog.tsx`
- `frontend-next/src/widgets/config/LinksEditor.tsx`
- `frontend-next/src/widgets/config/FeedsEditor.tsx`
- `frontend-next/src/stores/pomodoroStore.ts`
- `frontend-next/src/api/hooks/useWeather.ts`
- `frontend-next/src/api/hooks/useFeeds.ts`
- `frontend-next/src/api/hooks/useWorkSessions.ts`

### New Files (Backend)
- `backend/src/routes/weather.js`
- `backend/src/routes/feeds.js`
- `backend/src/db/feeds.js`

### Modified Files
- `frontend-next/src/widgets/registry.ts`
- `frontend-next/src/widgets/WidgetWrapper.tsx`
- `frontend-next/src/widgets/AddWidgetDialog.tsx`
- `frontend-next/src/widgets/InboxWidget.tsx`
- `frontend-next/src/widgets/MyDayWidget.tsx`
- `frontend-next/src/pages/DashboardPage.tsx`
- `frontend-next/src/api/hooks/useDashboard.ts`
- `frontend-next/src/api/hooks/index.ts`
- `backend/src/index.ts`
- `backend/src/routes/dashboard.js`
