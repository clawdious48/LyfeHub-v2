# Relations Backend Implementation

This document describes the backend implementation of the "Relation" property type for the Bases feature.

## Overview

Relations allow linking records from one base to records in another base. This is similar to foreign key relationships in traditional databases, or relations in Notion/Airtable.

## Schema Changes

### Property Type

Added `relation` to the valid property types in `base_properties` table:

```sql
type TEXT NOT NULL CHECK(type IN (
  'text', 'number', 'select', 'multi_select', 
  'date', 'checkbox', 'url', 'relation'
))
```

A migration handles updating existing databases to support the new type.

### Property Configuration

Relation properties store their config in the `options` JSON field:

```json
{
  "relatedBaseId": "uuid-of-target-base",
  "allowMultiple": true
}
```

- `relatedBaseId` - The UUID of the base that this relation links to
- `allowMultiple` - If `true`, allows linking multiple records (like multi-select). If `false`, only one record can be linked.

### Record Values

Relation values are stored as arrays of record UUIDs in the record's `data` JSON:

```json
{
  "propertyId": ["record-uuid-1", "record-uuid-2"]
}
```

Even single-select relations store as arrays (with max length 1) for consistency.

## API Endpoints

### GET /api/bases/:id?expandRelations=true

Fetches a base with all records. When `expandRelations=true` is passed:

- Each record includes an `_expandedRelations` object
- The expanded data includes display values and global IDs

**Response with expansion:**
```json
{
  "id": "base-uuid",
  "records": [{
    "id": "record-uuid",
    "values": {
      "relation-prop-id": ["linked-record-1", "linked-record-2"]
    },
    "_expandedRelations": {
      "relation-prop-id": [
        {
          "id": "linked-record-1",
          "displayValue": "Alice Johnson",
          "global_id": 1
        },
        {
          "id": "linked-record-2", 
          "displayValue": "Bob Smith",
          "global_id": 2
        }
      ]
    }
  }]
}
```

### GET /api/bases/:id/relation-options

Returns a lightweight list of records from a base, suitable for a relation picker UI.

**Response:**
```json
[
  {
    "id": "record-uuid",
    "displayValue": "Alice Johnson",
    "global_id": 1
  }
]
```

The `displayValue` is determined by:
1. The "Name" property if it exists and has a value
2. Otherwise, the first text property with a value
3. Fallback: "Record #[global_id]"

### POST/PUT Record Endpoints

Creating or updating records with relation values:

```json
{
  "values": {
    "relation-property-id": ["linked-record-uuid-1", "linked-record-uuid-2"]
  }
}
```

**Validation:**
- All linked record IDs must exist in the related base
- Single-select relations (`allowMultiple: false`) reject arrays with more than 1 item
- Invalid IDs return 400 with `invalidIds` array

**Error response:**
```json
{
  "error": "Invalid relation values for property \"Assigned To\"",
  "invalidIds": ["fake-id-12345"]
}
```

### DELETE Record

When deleting a record, any relation references to that record are automatically cleaned up:

1. Find all properties across all bases that relate to the deleted record's base
2. For each record that links to the deleted record, remove the reference
3. Delete the record

This prevents orphaned relation references.

## Helper Functions (bases.js)

### getRecordsByIds(recordIds)
Bulk fetch records by their IDs. Returns a map of `{ recordId: recordData }`.

### getRecordDisplayValue(record, baseId)
Determines the display value for a record (for relation chips/pills).

### validateRelationValues(propertyConfig, values)
Validates that:
- All record IDs exist in the related base
- Single-select relations only have one value

Returns `{ valid: boolean, invalidIds: string[], error?: string }`

### expandRelations(record, properties)
Takes a record and its base's properties, returns an object mapping relation property IDs to their expanded data (display values, global IDs).

### cleanupRelationReferences(deletedRecordId, deletedRecordBaseId)
Called when deleting a record. Removes the deleted record's ID from all relation fields that reference it.

### getRelationPickerOptions(baseId)
Returns a lightweight list of records with display values for the relation picker UI.

## Test Results

All features tested successfully:

1. ✅ Creating relation properties with `relatedBaseId` and `allowMultiple`
2. ✅ Creating records with relation values
3. ✅ Relation picker endpoint returns correct display values
4. ✅ Expand relations returns linked record data
5. ✅ Validation rejects invalid record IDs
6. ✅ Single-select validation enforced
7. ✅ Cascade cleanup removes references when records are deleted

## Commits

- `b44c7c9` - feat(bases): Add Relation property type - frontend implementation (included backend routes)
- `c6f379a` - fix(bases): Handle both parsed and unparsed property options in expandRelations

## Future Considerations

- **Rollups**: Aggregate data from related records (COUNT, SUM, etc.)
- **Backlinks**: Automatically show which records link TO a record
- **Cross-user relations**: Currently only allows relations to own bases
- **Performance**: For bases with many records, consider pagination in relation-options endpoint
