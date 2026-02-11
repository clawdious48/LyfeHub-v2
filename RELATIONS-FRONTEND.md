# Relations Frontend Implementation

**Date:** 2026-01-17  
**Status:** Implemented  
**Related:** `RELATIONS-ANALYSIS.md` (codebase analysis)

---

## Overview

This document describes the frontend implementation of the "Relation" property type for the Bases feature. Relations allow linking records from one base to records in another base, similar to Notion or Airtable relations.

---

## Files Modified

| File | Changes |
|------|---------|
| `frontend/js/bases.js` | Added relation type support, cache, cell rendering, picker modal |
| `frontend/css/style.css` | Added styles for relation pills and picker modal |
| `frontend/index.html` | Added relation option to property type dropdown, relation config UI |

---

## Implementation Details

### 1. Property Type Definition

Added `relation` to the `propertyTypes` object:

```javascript
const propertyTypes = {
  // ... existing types
  relation: { label: 'Relation', icon: '↗' }
};
```

### 2. Relation Cache

Created `relationCache` object to efficiently store and retrieve related record display names:

```javascript
const relationCache = {
  records: {},    // { baseId: { recordId: displayName } }
  bases: null,    // Array of all bases for dropdown
  
  async getRecordDisplay(baseId, recordId) { ... },
  async loadBaseRecords(baseId) { ... },
  async getAllBases() { ... },
  invalidateBase(baseId) { ... },
  invalidateAll() { ... }
};
```

### 3. Cell Display

Relation values are displayed as cyan-colored pills/tags:

```javascript
case 'relation':
  const relatedIds = Array.isArray(value) ? value : (value ? [value] : []);
  if (relatedIds.length === 0) return `<span class="cell-placeholder">Link records...</span>`;
  // Returns pills with data attributes for async name loading
  return relatedIds.map(recordId => 
    `<span class="cell-relation-pill" data-record-id="${recordId}" ...>...</span>`
  ).join('');
```

The pill names are populated asynchronously after table render via `populateRelationPills()`.

### 4. Cell Editor (Relation Picker)

When a user clicks a relation cell, a modal picker appears:

- **Search bar** - Filter records by name
- **Record list** - Shows records from the related base with checkmarks for selected items
- **Single-select mode** - Clicking a record saves and closes
- **Multi-select mode** - Toggle selections, click "Done" to save
- **Clear button** - Remove all linked records

### 5. Property Configuration

When creating a relation property, users configure:

1. **Related Base** - Dropdown to select which base to link to
2. **Allow Multiple** - Checkbox to enable multi-select

Configuration is stored in the property's `options` field:
```json
{
  "relatedBaseId": "uuid-of-target-base",
  "allowMultiple": true
}
```

### 6. Pill Interaction

Clicking a relation pill highlights it briefly with a glowing effect (2-second animation). This provides visual feedback without navigating away.

### 7. Filter Support

Added filter operators for relation type:
```javascript
relation: [
  { value: 'contains', label: 'contains' },
  { value: 'does_not_contain', label: 'does not contain' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' }
]
```

### 8. Sort Support

Relations sort by the count of linked records (more links = higher in ascending order).

---

## CSS Classes

| Class | Purpose |
|-------|---------|
| `.cell-relation-pill` | Cyan-colored pill for related record names |
| `.cell-relation-pill.highlighted` | Glowing effect when clicked |
| `.cell-relation-pill.deleted` | Red styling for orphaned relations |
| `.relation-picker-modal` | The record picker modal |
| `.relation-search-bar` | Search input container |
| `.relation-records-list` | Scrollable list of records |
| `.relation-record-item` | Individual record row in picker |
| `.relation-record-item.selected` | Selected state with checkmark |
| `.relation-record-check` | Checkbox indicator |
| `.relation-record-name` | Record display name |
| `.relation-record-id` | Global ID badge |

---

## Backend Integration

The frontend integrates with backend relation support:

- **Property creation** - Sends `type: 'relation'` with `options` containing config
- **Record values** - Stores arrays of record UUIDs: `["uuid1", "uuid2"]`
- **Validation** - Backend validates that linked records exist
- **Expansion** - Backend can expand relations with `?expandRelations=true` query param

---

## Known Limitations

1. **No cross-base navigation** - Clicking a pill just highlights it; doesn't open the related record
2. **Basic display** - Uses first text property as display name
3. **No two-way sync** - Linking A→B doesn't automatically create B→A

---

## Future Enhancements

1. **Click to open** - Open related record in modal or navigate to its base
2. **Rollup properties** - Aggregate data from related records (count, sum, etc.)
3. **Two-way relations** - Automatically create inverse relation
4. **Display property config** - Let users choose which property to show
5. **Inline creation** - Create new record in target base from picker

---

## Testing Checklist

- [ ] Create a relation property pointing to another base
- [ ] Create a relation property pointing to same base (self-referential)
- [ ] Add single relation to a cell
- [ ] Add multiple relations to a cell (with Allow Multiple enabled)
- [ ] Remove a relation from a cell
- [ ] Clear all relations from a cell
- [ ] Search/filter in the picker modal
- [ ] Filter records by relation (contains, is_empty, etc.)
- [ ] Sort by relation column
- [ ] Delete a related record and see "[Deleted]" placeholder
- [ ] Delete the target base and verify graceful handling

---

*Implementation completed by Relations Frontend subagent*
