# Sidebar + Dashboard Redesign

Date: 2026-02-26
Status: Approved

## Overview

Rebuild the sidebar and dashboard for the new React frontend (`frontend-next/`). The sidebar becomes persistent across all pages with contextual content, and the dashboard gets a customizable widget grid via react-grid-layout.

## Renames

- "Apex" -> "Jobs" throughout the app
- "Areas of Focus" -> "Areas"
- "TOOLS" sidebar section -> "Productivity", "Tools", "Resources" (three sections)

---

## Sidebar Design

### Structure (top to bottom)

1. **Top buttons** (persistent on all pages)
   - Two icon+label buttons side by side: **Dashboard** (left) | **Jobs** (right)
   - Active state highlights the current section
   - When collapsed: icon-only

2. **Quick Capture** (persistent on all pages, collapsible section)
   - Note button (purple icon)
   - Task button (blue icon)
   - Contact button (green icon)
   - Each opens a modal for quick item creation (posts to `/api/inbox/capture`)

3. **Contextual sections** (change per route)
   - Dashboard page: Productivity, Tools, Resources
   - Other pages: page-specific filters/nav (defined as those pages are built)
   - Fallback: show Dashboard sections if page has no custom config

4. **Bottom bar** (persistent, pinned to bottom)
   - Settings gear button (links to Settings page)
   - User name (links to Profile page — future: Facebook-style social feed)

### Collapsible Behavior

- Toggle button collapses to icon-only mode (~48px wide)
- Collapse state persisted to localStorage
- Smooth CSS transition (300ms)
- Collapsed tooltips on hover (show label)
- Section collapse states also persisted independently

### Dashboard Contextual Sections

- **Productivity** (collapsible): Jobs, Calendar, Tasks — nav links with icons
- **Tools** (collapsible): TBD — header present, empty for now
- **Resources** (collapsible): Notes, People, Bases — nav links with icons

### Technical: Route-Aware Config

```typescript
// src/layouts/sidebarConfig.ts
type SidebarSection = {
  header: string
  icon: LucideIcon
  items: SidebarItem[]
}

type SidebarItem = {
  label: string
  icon: LucideIcon
  to: string
  badge?: number  // optional count badge
}

// Keyed by route path
const sidebarSections: Record<string, SidebarSection[]> = {
  '/': [ /* Dashboard sections */ ],
  '/tasks': [ /* Task-specific filters */ ],
  '/jobs': [ /* Job-specific filters */ ],
  // ... other pages added later
}
```

Sidebar reads `useLocation().pathname` and renders the matching config. Zustand store manages collapsed state + section toggle states.

---

## Dashboard Design

### Layout

- No greeting — jump straight to widget grid
- Edit button (top-right) toggles customization mode
- react-grid-layout with 12-column grid
- Layout saved/loaded via `GET/PUT /api/dashboard/layout`

### Default Widgets (5)

| Widget | Grid Position | Data Source |
|--------|--------------|-------------|
| My Day | x:0, y:0, w:6, h:4 | `GET /api/tasks?smart_list=my_day` + today's calendar events |
| This Week | x:6, y:0, w:6, h:3 | Calendar strip with week navigation |
| Quick Notes | x:0, y:4, w:6, h:3 | `GET /api/notes?limit=5` |
| Inbox | x:6, y:3, w:6, h:4 | `GET /api/inbox` + `GET /api/inbox/count` |
| Areas | x:0, y:7, w:12, h:3 | Tags base filtered by Type="Area" (placeholder for now) |

### Widget Registry

```typescript
// src/widgets/registry.ts
const widgetRegistry: Record<string, WidgetDefinition> = {
  'my-day':      { component: MyDayWidget, label: 'My Day', icon: Sun, minW: 4, minH: 3 },
  'week-cal':    { component: WeekCalWidget, label: 'This Week', icon: Calendar, minW: 4, minH: 2 },
  'quick-notes': { component: QuickNotesWidget, label: 'Quick Notes', icon: FileText, minW: 3, minH: 2 },
  'inbox':       { component: InboxWidget, label: 'Inbox', icon: Inbox, minW: 3, minH: 3 },
  'areas':       { component: AreasWidget, label: 'Areas', icon: Target, minW: 4, minH: 2 },
}
```

### Edit Mode

- Toggle via Edit/Done button
- Widgets get drag handles + resize handles
- Red X button to remove a widget
- "+ Add Widget" button opens picker dialog showing available widgets from registry
- Layout changes auto-saved on Done (PUT /api/dashboard/layout)

### TanStack Query Hooks Needed

- `useDashboardLayout()` — GET /api/dashboard/layout
- `useSaveDashboardLayout()` — PUT mutation
- `useInbox(limit?)` — GET /api/inbox
- `useInboxCount()` — GET /api/inbox/count
- `useTagsBase()` — GET /api/bases/{tags-base-id}/records (filtered by Type=Area)

---

## UX Improvements Over Current App

1. Sidebar persistent across all pages (not Dashboard-only)
2. Dashboard + Jobs always one click away (pinned top buttons)
3. Quick capture always available (no navigating back to Dashboard)
4. No greeting wasting vertical space
5. "Areas of Focus" -> "Areas" (cleaner)
6. "Apex" -> "Jobs" (more intuitive)
7. Views: drag-and-drop column reordering (replace up/down arrows with @dnd-kit/sortable)
8. Collapsible sidebar with smooth React + CSS transitions
9. User profile + settings pinned at sidebar bottom
10. Route-aware contextual sidebar sections per page

---

## Views Improvement (applies to Bases module rebuild)

Current Create/Edit View modal uses up/down arrow buttons for column reordering. Replace with:
- **@dnd-kit/sortable** drag-and-drop for Visible Columns list
- Grab handle on each column item, drag to reorder
- Same drag-and-drop pattern for Filters and Sorts lists
- Smooth animation during drag

---

## Future Features (not this session)

- **User Profile page**: Facebook-style social feed, accessible from sidebar bottom user name
- **Areas widget content**: Populate Tags base with Area records, build full Areas tracking
- **Per-page sidebar configs**: Define contextual sections for Tasks, Jobs, People, Calendar, Bases pages
- **Resources section**: Show Base Views as quick-access links in sidebar

---

## Dependencies

- `react-grid-layout` + `@types/react-grid-layout` (dashboard grid)
- `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` (drag-and-drop)
