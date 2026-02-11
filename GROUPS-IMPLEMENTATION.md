# Base Groups Implementation

## Summary

Implemented full group/folder functionality for organizing bases in the Bases tab sidebar.

## Features Implemented

### 1. "+ New Group" Button
- **Location:** Sidebar header (`#add-group-btn`)
- **Behavior:** Opens a modal to create a new group
- **Fields:**
  - Group name (required)
  - Icon/emoji (default: 📁)
  - Optional: Select existing ungrouped bases to add to the new group via checkboxes

### 2. Groups in Sidebar
- Groups appear as collapsible sections in the left sidebar
- Each group shows:
  - Collapse/expand toggle (▼)
  - Icon (customizable emoji)
  - Group name
  - Count badge showing number of bases
  - Edit/delete buttons on hover
- Empty groups show "Drop bases here" placeholder
- Ungrouped bases appear in a separate "Ungrouped" section at the bottom

### 3. Assign Bases to Groups (Three Methods)

#### Method A: Drag & Drop
- Sidebar base items have a drag handle (⋮⋮) visible on hover
- Drag any base into a group section to assign it
- Drag to "Ungrouped" section or empty sidebar area to remove from group
- Visual feedback: Dashed purple outline on drop targets

#### Method B: On Group Creation
- When creating a new group, checkboxes show all currently ungrouped bases
- Select multiple bases to add them to the new group immediately

#### Method C: Edit Base Modal
- "Group" dropdown added to the Edit Base modal
- Select any existing group or "No group (ungrouped)"
- Changes saved when clicking "Save Changes"

### 4. Group Management

#### Edit Group
- Click ✏️ button on group header (shows on hover)
- Can change name and icon
- Changes apply immediately

#### Delete Group
- Click × button on group header (shows on hover)
- Confirmation prompt before deletion
- Bases in deleted group become ungrouped (not deleted)

#### Collapse/Expand
- Click group header to toggle collapse state
- State persists in database (per-user)
- Toggle-all button in sidebar header expands/collapses all groups

## Backend Support

### Database Schema
```sql
CREATE TABLE base_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📁',
  user_id TEXT REFERENCES users(id),
  position INTEGER DEFAULT 0,
  collapsed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Added to bases table:
ALTER TABLE bases ADD COLUMN group_id TEXT REFERENCES base_groups(id);
ALTER TABLE bases ADD COLUMN position INTEGER DEFAULT 0;
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bases/groups/list` | List all groups for user |
| POST | `/api/bases/groups` | Create new group |
| PUT | `/api/bases/groups/:id` | Update group |
| DELETE | `/api/bases/groups/:id` | Delete group (ungroups bases) |
| PUT | `/api/bases/groups/:id/toggle` | Toggle collapsed state |
| POST | `/api/bases/groups/collapse-all` | Collapse all groups |
| POST | `/api/bases/groups/expand-all` | Expand all groups |
| PUT | `/api/bases/:id/group` | Assign base to group |

## Files Modified

### Backend
- `backend/src/db/bases.js` - Group queries (already existed)
- `backend/src/routes/bases.js` - Group API routes (already existed)

### Frontend
- `frontend/index.html` - Added group dropdown to Edit Base modal
- `frontend/js/bases.js` - Implemented group UI, drag-drop, modals
- `frontend/css/style.css` - Added styles for drag-drop, checkboxes, empty states

## UI/UX Details

### Visual Hierarchy
- Groups use folder icon (📁 by default) with slightly muted styling
- Bases inside groups are indented with drag handle
- Active base highlighted with purple border
- Ungrouped section has subtle separator line

### Drag & Drop Feedback
- Dragged item becomes semi-transparent
- Drop targets get dashed purple outline
- Smooth transitions on state changes

### Responsive Considerations
- Sidebar has fixed 240px width
- Group items overflow with ellipsis
- Max-height on base checkboxes list with scroll

## Testing Checklist

- [x] Create group with name and icon
- [x] Create group with pre-selected bases
- [x] Edit group name/icon
- [x] Delete group (verify bases become ungrouped)
- [x] Collapse/expand individual groups
- [x] Collapse/expand all groups
- [x] Drag base into group
- [x] Drag base to ungrouped section
- [x] Edit base and change group via dropdown
- [x] Empty groups show placeholder
- [x] Count badges update correctly
- [x] Sidebar reflects changes immediately
