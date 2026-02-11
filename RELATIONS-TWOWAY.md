# Two-Way (Bidirectional) Relations

## Overview
This feature adds opt-in bidirectional relations to the Bases feature. When creating a relation property, users can choose to automatically create a reverse relation on the target base. Changes to either side are automatically synced.

## Implementation Date
2026-02-02

## Files Modified

### Backend
- **`backend/src/db/bases.js`**
  - Added `syncReverseRelation()` - Syncs added/removed links to target records' reverse relation
  - Added `updateRecordWithSync()` - Updates record and triggers reverse relation sync
  - Added `unlinkReverseProperty()` - Unlinks paired properties when one is deleted
  - Added `createReverseRelationProperty()` - Creates reverse property and links both

- **`backend/src/routes/bases.js`**
  - Property creation (`POST /:id/properties`) now accepts `createReverse` and `reverseName` params
  - Record update (`PUT /:id/records/:recordId`) uses `updateRecordWithSync` for two-way sync
  - Record creation (`POST /:id/records`) syncs reverse relations for initial values
  - Record deletion (`DELETE /:id/records/:recordId`) cleans up reverse relations
  - Property deletion (`DELETE /:id/properties/:propId`) unlinks reverse property

### Frontend
- **`frontend/index.html`**
  - Added reverse relation checkbox and name input to Add Property modal

- **`frontend/js/bases.js`**
  - `showAddPropertyModal()` - Resets reverse relation UI state
  - `populateRelationBaseDropdown()` - Adds change listener for dynamic label
  - `updateReverseRelationLabel()` - Updates checkbox label with target base name
  - `addProperty()` - Sends `createReverse` and `reverseName` to API

- **`frontend/css/style.css`**
  - Added `.relation-reverse-group` styles
  - Added `#relation-reverse-name` input styles

## API Changes

### Create Property (POST /api/bases/:id/properties)
New optional parameters for relation type:
```json
{
  "name": "Related Contacts",
  "type": "relation",
  "options": {
    "relatedBaseId": "uuid-of-contacts-base",
    "allowMultiple": true
  },
  "createReverse": true,
  "reverseName": "Related Notes"
}
```

Response includes `reverseProperty` if created:
```json
{
  "id": "uuid",
  "name": "Related Contacts",
  "type": "relation",
  "options": {
    "relatedBaseId": "...",
    "allowMultiple": true,
    "reversePropertyId": "reverse-uuid"
  },
  "reverseProperty": {
    "id": "reverse-uuid",
    "name": "Related Notes",
    "options": {
      "relatedBaseId": "...",
      "allowMultiple": true,
      "reversePropertyId": "source-uuid"
    }
  }
}
```

## Data Model

### Property Options
Paired relation properties store each other's ID:
```json
{
  "relatedBaseId": "target-base-id",
  "allowMultiple": true,
  "reversePropertyId": "paired-property-id"  // Only if two-way
}
```

## Sync Behavior

### Linking
When Record A links to Record B via a two-way relation:
1. Record A's relation field is updated with B's ID
2. Record B's reverse relation field is updated with A's ID

### Unlinking  
When Record A unlinks from Record B:
1. B's ID is removed from A's relation field
2. A's ID is removed from B's reverse relation field

### Record Deletion
When a record is deleted:
1. Its ID is removed from all reverse relations that reference it
2. Its ID is removed from all other relations (existing cleanup)

### Property Deletion
When a two-way relation property is deleted:
1. The reverse property is **unlinked** (reversePropertyId set to null)
2. The reverse property is **not deleted** (safer - user can manually delete)
3. Existing relation data in the reverse property remains

## UI Flow

1. User opens Add Property modal
2. Selects "Relation" type
3. Selects target base from dropdown
4. **Optionally** checks "Create reverse relation on {TargetBaseName}"
5. If checked, can customize reverse property name (defaults to "Related {SourceBaseName}")
6. On create:
   - Source property is created
   - Reverse property is created on target base (if enabled)
   - Both are linked via reversePropertyId

## Testing

Verified functionality:
- ✅ Creating relation with reverse creates both properties
- ✅ Both properties link to each other via reversePropertyId
- ✅ Linking Note→Contact updates Contact's "Related Notes"
- ✅ Unlinking Note→Contact clears Contact's "Related Notes"
- ✅ Deleting relation property unlinks (doesn't delete) reverse
- ✅ Reverse property still works as one-way after unlinking
