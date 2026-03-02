# Navigation Widget + Quick Capture Widget — Design

**Date:** 2026-03-02
**Status:** Approved

## Overview

Two new dashboard widgets:

1. **Navigation Widget** — A fully customizable, user-built nav panel that can replace the sidebar. Users curate which app routes to show, organize them with headers and collapsible groups, and drag to reorder everything. An overflow menu ensures no routes are ever inaccessible.

2. **Quick Capture Widget** — A compact panel of Quick Capture action buttons (Note, Task, Person). User picks which types to include.

---

## Navigation Widget

### Item Types

Four drag-to-reorder item types:

| Type | Behavior |
|------|----------|
| Route link | Icon + label, navigates to an app page. Active route highlighted with accent color. |
| Header | Static text divider (e.g., "WORK"). Uppercase muted text with a line. |
| Toggle header | Collapsible group. Click to expand/collapse. Nested items indent one level. Collapse state persisted per widget instance. |
| Quick Capture button | Action button (Note, Task, Person). Opens the corresponding Quick Capture modal. Rendered with a subtle "+" indicator. |

**Available routes (14):** Dashboard, Jobs, CRM, Inventory, Documents, Workflows, Accounting, Reports, Calendar, Tasks, Mail, Notes, People, Bases

**Available Quick Capture types (3):** Note, Task, Person

### Layout & Orientation

Auto-adapt based on aspect ratio:

- **Aspect ratio > 1.5** (wide) → horizontal layout
- **Aspect ratio < 0.67** (tall) → vertical layout
- **In between** → vertical (safer default)

**Vertical layout:**
- Items stack top-to-bottom, full width
- Icon left, label right (like sidebar items)
- Toggle headers show chevron (right collapsed, down expanded)
- Nested items indent ~16px

**Horizontal layout:**
- Items flow left-to-right in a single row
- Icon left, label right (compact)
- Toggle headers become dropdown triggers — click to show nested items in a popover
- Headers render as vertical divider lines
- Items wrap to second row if they overflow width

**Active route indication:**
- Accent-colored left border (vertical) or bottom border (horizontal)
- Background tint on the active item

### Overflow Menu (Safety Net)

Shows all app routes NOT in the user's curated list. Disappears if user has added all routes.

**Trigger styles** (configurable):

| Style | Visual | Behavior |
|-------|--------|----------|
| Ellipsis (default) | `...` icon | Click to open popover |
| Hamburger | Three-line icon | Click to open popover |
| Directional arrow | `>` `<` `^` `v` (auto-adapts to orientation + position) | Click to open popover |
| Invisible | No visible icon, hover zone at trigger position | Hover to open popover |

**Trigger position** (configurable): Start or End of the nav bar. Default: End.

**Popover contents:** Remaining routes grouped by category (Apex Restoration, Productivity, Resources). Click to navigate.

### Dock & Collapse Behavior

**Edge detection:**
- `x = 0` → docked left
- `x + w = 24` (max columns) → docked right
- `y = 0` → docked top
- Widget is lowest on grid → docked bottom
- Not at any edge → dock unavailable, acts as normal panel

**Collapse behavior:**
- Docked widget shows a collapse trigger (same four style options as overflow, configured separately)
- Collapsing shrinks widget to a thin strip (1 col wide for left/right, 1 row tall for top/bottom)
- Thin strip shows only the expand trigger
- react-grid-layout compaction animates other widgets to fill vacated space
- Expanding restores original dimensions, widgets make room

**Implementation:**
- Collapsed state in widget config (`collapsed: true/false`)
- Collapsed overrides grid dimensions to thin strip
- Expanded restores saved dimensions
- Grid CSS transitions handle reflow animation
- Widget uses CSS transform for slide feel
- Collapse trigger auto-adapts position to the visible strip

### Config Editor

Two-panel layout in the widget settings dialog:

**Left panel — Item picker:**
- "Routes" section: 14 app routes with checkboxes
- "Quick Capture" section: Note, Task, Person with checkboxes
- "Structure" section: "+ Add Header" and "+ Add Toggle Header" buttons

**Right panel — Nav builder:**
- Drag-sortable list showing current nav structure
- Each item: icon, label, drag handle, X remove button
- Toggle headers as group containers — drag items into/out of them
- Indented items under toggle headers
- @dnd-kit/sortable for drag-and-drop

**Below the builder:**
- "Overflow Trigger" — Style picker (Ellipsis/Hamburger/Arrow/Invisible) + Position picker (Start/End)
- "Dock Collapse Trigger" — Same style options. Only visible when widget is at a grid edge. Shows detected edge.

**Validation:** Hint "Add some routes to get started" when empty. Overflow menu always ensures all routes reachable.

### Config Schema (stored in widget config)

```ts
interface NavItem {
  id: string
  type: 'route' | 'header' | 'toggle-header' | 'quick-capture'
  route?: string        // for type 'route' — e.g., '/jobs', '/calendar'
  label?: string        // for type 'header' / 'toggle-header' — custom text
  captureType?: string  // for type 'quick-capture' — 'note' | 'task' | 'person'
  children?: NavItem[]  // for type 'toggle-header' — nested items
  collapsed?: boolean   // for type 'toggle-header' — collapse state
}

interface NavWidgetConfig {
  items: NavItem[]
  overflowTrigger: 'ellipsis' | 'hamburger' | 'arrow' | 'invisible'
  overflowPosition: 'start' | 'end'
  dockCollapseTrigger: 'ellipsis' | 'hamburger' | 'arrow' | 'invisible'
  collapsed: boolean
  savedW?: number  // original width before collapse
  savedH?: number  // original height before collapse
}
```

### Registry Entry

```ts
{
  component: NavigationWidget,
  label: 'Navigation',
  description: 'Customizable app navigation with dockable collapse',
  icon: Navigation2,  // Lucide icon
  category: 'utility',
  singleton: false,
  configurable: true,
  configSchema: [/* custom editor, not standard fields */],
  minW: 2, minH: 2, defaultW: 4, defaultH: 12,
}
```

---

## Quick Capture Widget

### Config

Checkboxes for each capture type: Note, Task, Person. No ordering, no headers, no overflow.

### Rendering

Auto-adapts to widget shape:
- **Horizontal:** buttons in a row (icon + label, icon-only if tight)
- **Vertical:** buttons stacked
- Each button opens the corresponding Quick Capture modal
- Subtle outlined buttons with capture type color accent

### Registry Entry

```ts
{
  component: QuickCaptureWidget,
  label: 'Quick Capture',
  description: 'Fast-access buttons for creating notes, tasks, and contacts',
  icon: PlusCircle,
  category: 'productivity',
  singleton: false,
  configurable: true,
  configSchema: [
    { key: 'showNote', label: 'Note', type: 'toggle', default: true },
    { key: 'showTask', label: 'Task', type: 'toggle', default: true },
    { key: 'showPerson', label: 'Person', type: 'toggle', default: true },
  ],
  minW: 3, minH: 2, defaultW: 6, defaultH: 3,
}
```

---

## Route Reference

All navigable routes and their metadata (used by both the item picker and overflow menu):

| Route | Label | Icon | Category |
|-------|-------|------|----------|
| `/` | Dashboard | LayoutDashboard | — |
| `/jobs` | Jobs | Briefcase | Apex Restoration |
| `/apex/crm` | CRM | Contact | Apex Restoration |
| `/apex/inventory` | Inventory | Package | Apex Restoration |
| `/apex/documents` | Documents | FolderOpen | Apex Restoration |
| `/apex/workflows` | Workflows | GitBranch | Apex Restoration |
| `/apex/accounting` | Accounting | DollarSign | Apex Restoration |
| `/apex/reports` | Reports | BarChart3 | Apex Restoration |
| `/calendar` | Calendar | Calendar | Productivity |
| `/tasks` | Tasks | CheckSquare | Productivity |
| `/mail` | Mail | Mail | Productivity |
| `/notes` | Notes | FileText | Resources |
| `/people` | People | Users | Resources |
| `/bases` | Bases | Database | Resources |

This table should be extracted into a shared constant (`navRoutes`) used by the Navigation widget, the overflow popover, and the config editor item picker.
