# Relations Feature Analysis - Bases Module

This document analyzes the current codebase structure to guide implementation of a Relations property type (like Notion/Airtable relations that link records across bases).

---

## 1. Current Property Types

### Supported Types (from `base_properties.type` CHECK constraint)

| Type | Icon | Description | Storage Format |
|------|------|-------------|----------------|
| `text` | T | Plain text | String |
| `number` | # | Numeric values | Number (float) |
| `select` | ▼ | Single select dropdown | String (option value) |
| `multi_select` | ☰ | Multi-select tags | Array of strings |
| `date` | 📅 | Date picker | ISO date string |
| `checkbox` | ☑ | Boolean toggle | Boolean |
| `url` | 🔗 | URL with link | String |

### Frontend Property Type Definition (`frontend/js/bases.js:248`)

```javascript
const propertyTypes = {
  text: { label: 'Text', icon: 'T' },
  number: { label: 'Number', icon: '#' },
  select: { label: 'Select', icon: '▼' },
  multi_select: { label: 'Multi-select', icon: '☰' },
  date: { label: 'Date', icon: '📅' },
  checkbox: { label: 'Checkbox', icon: '☑' },
  url: { label: 'URL', icon: '🔗' }
};
```

### System Columns (read-only, auto-generated)

| Column ID | Name | Type | Description |
|-----------|------|------|-------------|
| `_global_id` | ID | system_id | Auto-incrementing row identifier |
| `_date_added` | Date Added | system_date | Record creation timestamp |
| `_date_modified` | Date Modified | system_date | Last update timestamp |

---

## 2. Database Schema

### `bases` Table
```sql
CREATE TABLE bases (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT '📊',
  user_id TEXT REFERENCES users(id),
  group_id TEXT REFERENCES base_groups(id),  -- For sidebar grouping
  position INTEGER DEFAULT 0,                 -- Order within group
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
)
```

### `base_properties` Table (Columns)
```sql
CREATE TABLE base_properties (
  id TEXT PRIMARY KEY,
  base_id TEXT REFERENCES bases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('text', 'number', 'select', 'multi_select', 'date', 'checkbox', 'url')),
  options TEXT DEFAULT '[]',   -- JSON array for select/multi_select options
  position INTEGER DEFAULT 0,  -- Column order
  width INTEGER DEFAULT 200,   -- Column width in pixels
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
)
```

### `base_records` Table (Rows)
```sql
CREATE TABLE base_records (
  id TEXT PRIMARY KEY,
  base_id TEXT REFERENCES bases(id) ON DELETE CASCADE,
  global_id INTEGER,           -- Auto-incrementing display ID
  data TEXT DEFAULT '{}',      -- JSON object: { propertyId: value, ... }
  position INTEGER DEFAULT 0,  -- Row order
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
)
```

**Key insight**: Record values are stored as JSON in the `data` column, keyed by property ID:
```json
{
  "prop-uuid-1": "Some text",
  "prop-uuid-2": 42,
  "prop-uuid-3": ["tag1", "tag2"],
  "prop-uuid-4": true
}
```

### `base_views` Table (Saved Filters/Visibility)
```sql
CREATE TABLE base_views (
  id TEXT PRIMARY KEY,
  base_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  config TEXT DEFAULT '{}',    -- JSON: { filters, visibleColumns, columnOrder }
  position INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
)
```

### `base_groups` Table (Sidebar Organization)
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
)
```

---

## 3. API Endpoints

### Base Endpoints (`/api/bases`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bases` | List all bases (with record/column counts) |
| GET | `/api/bases/:id` | Get base with properties and records |
| POST | `/api/bases` | Create new base |
| PUT | `/api/bases/:id` | Update base metadata |
| DELETE | `/api/bases/:id` | Delete base (cascades) |

### Property Endpoints (`/api/bases/:id/properties`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bases/:id/properties` | Add property |
| PUT | `/api/bases/:id/properties/:propId` | Update property |
| DELETE | `/api/bases/:id/properties/:propId` | Delete property |
| POST | `/api/bases/:id/properties/reorder` | Reorder columns |

**Property Request Body:**
```json
{
  "name": "Status",
  "type": "select",
  "options": [
    { "value": "active", "label": "Active", "color": "#05ffa1" }
  ]
}
```

### Record Endpoints (`/api/bases/:id/records`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bases/:id/records` | Add record |
| PUT | `/api/bases/:id/records/:recordId` | Update record values |
| DELETE | `/api/bases/:id/records/:recordId` | Delete record |

**Record Request/Response:**
```json
{
  "id": "record-uuid",
  "base_id": "base-uuid",
  "global_id": 42,
  "position": 0,
  "values": {
    "prop-uuid-1": "Text value",
    "prop-uuid-2": 100
  },
  "created_at": "2026-01-17T...",
  "updated_at": "2026-01-17T..."
}
```

### View Endpoints (`/api/bases/:id/views`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bases/:id/views` | List saved views |
| POST | `/api/bases/:id/views` | Create view |
| PUT | `/api/bases/:id/views/:viewId` | Update view |
| DELETE | `/api/bases/:id/views/:viewId` | Delete view |

### Group Endpoints (`/api/bases/groups`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bases/groups/list` | List all groups |
| POST | `/api/bases/groups` | Create group |
| PUT | `/api/bases/groups/:groupId` | Update group |
| PUT | `/api/bases/groups/:groupId/toggle` | Toggle collapse |
| DELETE | `/api/bases/groups/:groupId` | Delete group |
| PUT | `/api/bases/:id/group` | Assign base to group |

---

## 4. Frontend Structure

### State Management (`basesState`)

```javascript
let basesState = {
  bases: [],                 // List of all bases
  groups: [],                // Sidebar groups
  currentBase: null,         // Currently open base with properties & records
  editingCell: null,         // Active cell editor
  displayMode: 'cards',      // 'cards' or 'list' for bases list
  cardSize: 'medium',        // Card size preference
  sortColumn: null,          // Active sort column ID
  sortDirection: 'asc',      // Sort direction
  showGlobalId: true,        // Show ID column
  showDateAdded: true,       // Show Date Added column
  showDateModified: true,    // Show Date Modified column
  views: [],                 // Saved views for current base
  currentViewId: null,       // Active view
  filters: [],               // Active filters
  visibleColumns: null,      // Column visibility (null = all)
  columnOrder: null,         // Column order override
  sidebarCollapsed: false
};
```

### Cell Rendering (`renderCellContent` - line 1539)

Switch statement handles rendering for each property type:

```javascript
function renderCellContent(prop, value) {
  switch (prop.type) {
    case 'checkbox':
      return `<label class="cell-checkbox">...</label>`;
    case 'select':
      // Renders single tag with color
    case 'multi_select':
      // Renders multiple tags
    case 'date':
      return new Date(value).toLocaleDateString();
    case 'number':
      return String(value);
    case 'url':
      return `<a href="..." class="cell-link">...</a>`;
    case 'text':
    default:
      return escapeHtml(value);
  }
}
```

### Cell Editing (`startEditingCell` - line 1634)

Creates different editor UIs per type:
- **text/url**: `<input type="text|url">`
- **number**: `<input type="number">`
- **date**: `<input type="date">`
- **select**: Button list with single selection
- **multi_select**: Button list with toggle selection
- **checkbox**: Handled separately via change event

### Property Type Selector (`showAddPropertyModal`)

Uses `#new-property-type` select element with options from `propertyTypes` object. The `updatePropertyTypeUI()` function shows/hides the options editor for select/multi_select types.

### Filter System

Filter operators are defined per type (`filterOperators` object):
```javascript
const filterOperators = {
  text: ['contains', 'equals', 'starts_with', 'is_empty', 'is_not_empty'],
  number: ['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'is_empty'],
  select: ['is', 'is_not', 'is_empty'],
  multi_select: ['contains', 'does_not_contain', 'is_empty'],
  checkbox: ['is_checked', 'is_not_checked'],
  date: ['is', 'before', 'after', 'is_empty'],
  url: ['contains', 'equals', 'is_empty', 'is_not_empty']
};
```

---

## 5. Recommendations for Relations Feature

### 5.1 Schema Changes

#### Add `relation` to property types

**`backend/src/db/bases.js`** - Update CHECK constraint:
```sql
-- Modify base_properties table
type TEXT NOT NULL CHECK(type IN ('text', 'number', 'select', 'multi_select', 'date', 'checkbox', 'url', 'relation'))
```

#### Property `options` Structure for Relations

The existing `options` JSON field can store relation configuration:
```json
{
  "targetBaseId": "uuid-of-related-base",
  "displayProperty": "prop-uuid",  // Which property to show (default: first text prop)
  "allowMultiple": true            // true = many-to-many, false = many-to-one
}
```

#### Record Data Storage for Relations

Store related record IDs in the `data` JSON:
```json
{
  "relation-prop-id": ["record-uuid-1", "record-uuid-2"]  // Array of related record IDs
}
```

### 5.2 API Changes

#### New Endpoint: Get Records for Relation Picker
```
GET /api/bases/:id/records/search?q=searchTerm&limit=20
```
Returns lightweight record list for the relation picker dropdown.

#### Modify GET `/api/bases/:id`
Include resolved relation data:
```json
{
  "records": [{
    "id": "...",
    "values": {
      "relation-prop": ["rec-1", "rec-2"]
    },
    "_resolved": {
      "relation-prop": [
        { "id": "rec-1", "display": "Project Alpha" },
        { "id": "rec-2", "display": "Project Beta" }
      ]
    }
  }]
}
```

### 5.3 Frontend Changes

#### Add to `propertyTypes`
```javascript
const propertyTypes = {
  // ... existing types
  relation: { label: 'Relation', icon: '🔗' }
};
```

#### Add to `filterOperators`
```javascript
relation: [
  { value: 'contains', label: 'contains' },
  { value: 'does_not_contain', label: 'does not contain' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' }
]
```

#### New Cell Renderer
```javascript
case 'relation':
  const relatedRecords = record._resolved?.[prop.id] || [];
  if (relatedRecords.length === 0) {
    return `<span class="cell-placeholder">Link records...</span>`;
  }
  return relatedRecords.map(r => 
    `<span class="cell-relation-tag" data-record-id="${r.id}">${escapeHtml(r.display)}</span>`
  ).join('');
```

#### New Cell Editor (Relation Picker)
- Search input with typeahead
- Dropdown showing matching records from target base
- Selected records shown as removable chips
- Click on chip opens related record in new modal/panel

#### Property Configuration Modal
When type is `relation`, show additional config:
- Target base selector (dropdown of user's bases)
- Display property selector (properties from target base)
- Allow multiple toggle (checkbox)

### 5.4 Key Files to Modify

| File | Changes |
|------|---------|
| `backend/src/db/bases.js` | Add relation to CHECK constraint, add record search query |
| `backend/src/routes/bases.js` | Add search endpoint, resolve relations in GET |
| `frontend/js/bases.js` | Add relation to propertyTypes, filterOperators, renderCellContent, startEditingCell, add relation picker UI |
| `frontend/css/style.css` | Add .cell-relation-tag styles, relation picker dropdown styles |

### 5.5 Implementation Order

1. **Phase 1: Schema & Backend**
   - Update property type constraint
   - Add record search endpoint
   - Add relation resolution to GET base endpoint

2. **Phase 2: Basic Frontend**
   - Add relation type to propertyTypes
   - Add cell renderer for relations
   - Add basic property creation for relations

3. **Phase 3: Relation Picker**
   - Build searchable dropdown component
   - Implement link/unlink functionality
   - Add chip display with remove buttons

4. **Phase 4: Polish**
   - Click-to-open related record
   - Filter operators for relations
   - Two-way relation sync (optional advanced feature)

---

## 6. Example User Flow

1. User creates base "Projects" with Name (text), Status (select)
2. User creates base "Tasks" with Name (text), Assignee (text)
3. User adds "Project" property to Tasks, type = **relation**, target = Projects
4. When editing a task's Project cell:
   - Dropdown appears showing Projects records
   - User searches "Alpha", selects "Project Alpha"
   - Cell shows "Project Alpha" as a clickable chip
5. Clicking the chip opens Project Alpha in a modal/sidebar

---

## 7. Data Integrity Considerations

- **Cascading deletes**: When a record is deleted, references in other bases become orphaned. Options:
  1. Leave orphaned IDs (simple, show "Deleted record" placeholder)
  2. Clean up references on delete (complex, requires scanning all bases)
  3. Soft-delete records (keeps references valid)

- **Base deletion**: When target base is deleted, relation properties become invalid. Show warning and convert to text or delete property.

- **Circular relations**: Allow A→B and B→A relations (no technical issue, just UI consideration).

---

*Generated by codebase analysis subagent - 2026-01-17*
