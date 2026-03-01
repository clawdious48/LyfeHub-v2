# Default Bases & Property Type Expansion — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand property types from 8 to 15 and seed 5 default bases (Tasks, Projects, Notes, Tags, People) as real rows in the bases/base_records tables.

**Architecture:** Backend DB migration expands the CHECK constraint and adds `is_default` columns. A seed function creates default bases on first login. Frontend gets 10 new cell components and updates to the type registry, filter/sort/display logic, and cell dispatch. All changes go through existing code paths — no special handling for default bases.

**Tech Stack:** PostgreSQL, Node/Express, React 19, TypeScript, TanStack Query, Zustand, shadcn/ui, Tailwind CSS v4, Lucide React icons

**Design doc:** `docs/plans/2026-03-01-default-bases-and-property-types-design.md`

---

## Task 1: Backend DB Migration — Expand CHECK Constraint + Add Columns

**Files:**
- Modify: `backend/src/db/init.sql:415-441`

**Step 1: Update the bases table to add is_default column**

At `init.sql:415`, after the `bases` table creation, add a migration block:

```sql
-- Migration: Add is_default to bases
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bases' AND column_name = 'is_default'
  ) THEN
    ALTER TABLE bases ADD COLUMN is_default BOOLEAN DEFAULT FALSE;
  END IF;
END $$;
```

**Step 2: Update the base_properties table to add is_default column**

After the `base_properties` table creation (after line 441), add:

```sql
-- Migration: Add is_default to base_properties
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'base_properties' AND column_name = 'is_default'
  ) THEN
    ALTER TABLE base_properties ADD COLUMN is_default BOOLEAN DEFAULT FALSE;
  END IF;
END $$;
```

**Step 3: Expand the property type CHECK constraint**

After the base_properties migrations, add:

```sql
-- Migration: Expand property type CHECK constraint from 8 to 15 types
DO $$ BEGIN
  ALTER TABLE base_properties DROP CONSTRAINT IF EXISTS base_properties_type_check;
  ALTER TABLE base_properties ADD CONSTRAINT base_properties_type_check
    CHECK(type IN ('text','number','select','multi_select','date','checkbox','url','relation',
                   'email','phone','files','rich_text','status','created_time','last_edited_time'));
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
```

**Step 4: Verify migration**

Run: `docker exec lyfehub-dev node -e "require('./src/db/pool').query(\"SELECT conname, consrc FROM pg_constraint WHERE conname = 'base_properties_type_check'\").then(r => console.log(r.rows)).catch(console.error).finally(() => process.exit())"`

Expected: Shows the updated constraint with all 15 types.

**Step 5: Commit**

```bash
git add backend/src/db/init.sql
git commit -m "feat(db): expand property types to 15, add is_default columns"
```

---

## Task 2: Backend — Default Bases Seed Function

**Files:**
- Create: `backend/src/db/defaultBases.js`

**Step 1: Create the seed config and function**

Create `backend/src/db/defaultBases.js` with the full default base definitions and the `seedDefaultBases(userId)` function. This is a large file — it contains:

1. A `DEFAULT_BASES` array with 5 base definitions, each containing:
   - `name`, `description`, `icon`
   - `properties` array with `{ name, type, options, width }` for each property
   - `relations` array describing cross-base relations to wire up after all bases are created

2. A `seedDefaultBases(userId)` function that:
   - Checks if default bases already exist for this user
   - If not, creates all 5 bases in a transaction
   - Creates all properties for each base
   - Wires up relations (sets `relatedBaseId` in options, creates reverse properties)
   - All IDs generated via `uuid.v4()`

3. A `getDefaultBase(userId, name)` helper that returns a default base by canonical name

```javascript
const { v4: uuidv4 } = require('uuid');
const db = require('./pool');
const basesDb = require('./bases');

// ============================================
// DEFAULT BASE DEFINITIONS
// ============================================

const DEFAULT_BASES = [
  {
    name: 'Tasks',
    description: 'Personal tasks synced with the Tasks dashboard',
    icon: '✅',
    properties: [
      { name: 'Name', type: 'text', width: 300 },
      { name: 'Description', type: 'rich_text', width: 300 },
      { name: 'Status', type: 'status', width: 140, options: [
        { label: 'To Do', color: 'red', group: 'todo' },
        { label: 'Doing', color: 'blue', group: 'in_progress' },
        { label: 'Done', color: 'green', group: 'complete' },
      ]},
      { name: 'Priority', type: 'status', width: 120, options: [
        { label: 'Low', color: 'blue', group: 'todo' },
        { label: 'Medium', color: 'yellow', group: 'in_progress' },
        { label: 'High', color: 'red', group: 'in_progress' },
      ]},
      { name: 'Due', type: 'date', width: 150 },
      { name: 'Snooze', type: 'date', width: 150 },
      { name: 'Completed', type: 'date', width: 150 },
      { name: 'Wait Date', type: 'date', width: 150 },
      { name: 'Energy', type: 'select', width: 120, options: [
        { label: 'High', color: 'green' },
        { label: 'Low', color: 'yellow' },
      ]},
      { name: 'Location', type: 'select', width: 120, options: [
        { label: 'Home', color: 'blue' },
        { label: 'Office', color: 'blue' },
        { label: 'Errand', color: 'blue' },
      ]},
      { name: 'Labels', type: 'multi_select', width: 200, options: [] },
      { name: 'Smart List', type: 'select', width: 140, options: [
        { label: 'Do Next', color: 'green' },
        { label: 'Delegated', color: 'yellow' },
        { label: 'Someday', color: 'red' },
      ]},
      { name: 'My Day', type: 'checkbox', width: 100 },
      { name: 'Recur Interval', type: 'number', width: 130 },
      { name: 'Recur Unit', type: 'select', width: 140, options: [
        { label: 'Day(s)', color: 'gray' },
        { label: 'Week(s)', color: 'gray' },
        { label: 'Month(s)', color: 'gray' },
        { label: 'Year(s)', color: 'gray' },
      ]},
      { name: 'Days', type: 'multi_select', width: 200, options: [
        { label: 'Mon', color: 'blue' },
        { label: 'Tue', color: 'green' },
        { label: 'Wed', color: 'purple' },
        { label: 'Thu', color: 'red' },
        { label: 'Fri', color: 'yellow' },
        { label: 'Sat', color: 'pink' },
        { label: 'Sun', color: 'orange' },
      ]},
      { name: 'Created', type: 'created_time', width: 180 },
      { name: 'Edited', type: 'last_edited_time', width: 180 },
    ],
    // Relations are wired in a second pass after all bases exist
    relations: [
      { propertyName: 'Project', targetBase: 'Projects', reverseName: 'Tasks', allowMultiple: false },
      { propertyName: 'People', targetBase: 'People', reverseName: 'Tasks', allowMultiple: true },
      { propertyName: 'Parent Task', targetBase: 'Tasks', reverseName: 'Sub-Tasks', allowMultiple: false },
    ],
  },
  {
    name: 'Projects',
    description: 'Track projects with status, deadlines, and goals',
    icon: '🚀',
    properties: [
      { name: 'Name', type: 'text', width: 300 },
      { name: 'Status', type: 'status', width: 140, options: [
        { label: 'Planned', color: 'blue', group: 'todo' },
        { label: 'On Hold', color: 'red', group: 'todo' },
        { label: 'Doing', color: 'green', group: 'in_progress' },
        { label: 'Ongoing', color: 'orange', group: 'in_progress' },
        { label: 'Done', color: 'purple', group: 'complete' },
      ]},
      { name: 'Target Deadline', type: 'date', width: 160 },
      { name: 'Completed', type: 'date', width: 150 },
      { name: 'Archived', type: 'checkbox', width: 100 },
      { name: 'Review Notes', type: 'rich_text', width: 300 },
      { name: 'Created', type: 'created_time', width: 180 },
      { name: 'Edited', type: 'last_edited_time', width: 180 },
    ],
    relations: [
      // Tasks reverse is created by Tasks base
      // Notes reverse is created by Notes base
      { propertyName: 'Tag', targetBase: 'Tags', reverseName: 'Projects', allowMultiple: false },
      { propertyName: 'People', targetBase: 'People', reverseName: 'Projects', allowMultiple: true },
    ],
  },
  {
    name: 'Notes',
    description: 'Capture ideas, meeting notes, web clips, and more',
    icon: '📝',
    properties: [
      { name: 'Name', type: 'text', width: 300 },
      { name: 'Type', type: 'select', width: 140, options: [
        { label: 'Journal', color: 'gray' },
        { label: 'Meeting', color: 'yellow' },
        { label: 'Web Clip', color: 'red' },
        { label: 'Reference', color: 'blue' },
        { label: 'Idea', color: 'orange' },
        { label: 'Plan', color: 'blue' },
        { label: 'Recipe', color: 'yellow' },
        { label: 'Voice Note', color: 'purple' },
        { label: 'Quote', color: 'gray' },
      ]},
      { name: 'Content', type: 'rich_text', width: 400 },
      { name: 'Archived', type: 'checkbox', width: 100 },
      { name: 'Favorite', type: 'checkbox', width: 100 },
      { name: 'Note Date', type: 'date', width: 150 },
      { name: 'Review Date', type: 'date', width: 150 },
      { name: 'URL', type: 'url', width: 250 },
      { name: 'Image', type: 'files', width: 150 },
      { name: 'Created', type: 'created_time', width: 180 },
      { name: 'Updated', type: 'last_edited_time', width: 180 },
    ],
    relations: [
      { propertyName: 'Tag', targetBase: 'Tags', reverseName: 'Notes', allowMultiple: false },
      { propertyName: 'Project', targetBase: 'Projects', reverseName: 'Notes', allowMultiple: false },
      { propertyName: 'People', targetBase: 'People', reverseName: 'Notes', allowMultiple: true },
    ],
  },
  {
    name: 'Tags',
    description: 'Organize with Areas, Resources, and Entities (PARA method)',
    icon: '🏷️',
    properties: [
      { name: 'Name', type: 'text', width: 250 },
      { name: 'Type', type: 'status', width: 140, options: [
        { label: 'Area', color: 'orange', group: 'in_progress' },
        { label: 'Resource', color: 'purple', group: 'in_progress' },
        { label: 'Entity', color: 'green', group: 'in_progress' },
      ]},
      { name: 'Archived', type: 'checkbox', width: 100 },
      { name: 'Favorite', type: 'checkbox', width: 100 },
      { name: 'Date', type: 'date', width: 150 },
      { name: 'URL', type: 'url', width: 250 },
      { name: 'Created', type: 'created_time', width: 180 },
      { name: 'Edited', type: 'last_edited_time', width: 180 },
    ],
    relations: [
      // Notes, Projects reverses are created by those bases
      { propertyName: 'People', targetBase: 'People', reverseName: 'Tags', allowMultiple: true },
      { propertyName: 'Parent Tag', targetBase: 'Tags', reverseName: 'Sub-Tags', allowMultiple: false },
    ],
  },
  {
    name: 'People',
    description: 'Contacts and relationships',
    icon: '👥',
    properties: [
      { name: 'Full Name', type: 'text', width: 250 },
      { name: 'Email', type: 'email', width: 220 },
      { name: 'Secondary Email', type: 'email', width: 220 },
      { name: 'Phone', type: 'phone', width: 180 },
      { name: 'Website', type: 'url', width: 250 },
      { name: 'LinkedIn', type: 'url', width: 220 },
      { name: 'Twitter/X', type: 'url', width: 220 },
      { name: 'Instagram', type: 'url', width: 220 },
      { name: 'Location', type: 'text', width: 200 },
      { name: 'Company', type: 'multi_select', width: 200, options: [] },
      { name: 'Title', type: 'text', width: 200 },
      { name: 'Industry', type: 'select', width: 160, options: [
        { label: 'Insurance', color: 'yellow' },
        { label: 'HVAC', color: 'blue' },
        { label: 'Plumbing', color: 'blue' },
        { label: 'Electrical', color: 'orange' },
        { label: 'Automotive', color: 'gray' },
        { label: 'Construction', color: 'red' },
        { label: 'Technology', color: 'purple' },
        { label: 'Healthcare', color: 'green' },
        { label: 'Education', color: 'cyan' },
        { label: 'Other', color: 'gray' },
      ]},
      { name: 'Relationship', type: 'multi_select', width: 200, options: [
        { label: 'Friend', color: 'pink' },
        { label: 'Family', color: 'yellow' },
        { label: 'Colleague', color: 'blue' },
        { label: 'Client', color: 'orange' },
        { label: 'Vendor', color: 'green' },
        { label: 'Customer', color: 'purple' },
      ]},
      { name: 'Interests', type: 'multi_select', width: 200, options: [] },
      { name: 'How Met', type: 'rich_text', width: 300 },
      { name: 'Birthday', type: 'date', width: 150 },
      { name: 'Last Check-In', type: 'date', width: 160 },
      { name: 'Next Check-In', type: 'date', width: 160 },
      { name: 'Pipeline Status', type: 'status', width: 160, options: [
        { label: 'Prospect', color: 'gray', group: 'todo' },
        { label: 'Contacted', color: 'blue', group: 'in_progress' },
        { label: 'Negotiating', color: 'yellow', group: 'in_progress' },
        { label: 'Closed', color: 'green', group: 'complete' },
        { label: 'Rejected', color: 'red', group: 'complete' },
      ]},
      { name: 'Created', type: 'created_time', width: 180 },
      { name: 'Edited', type: 'last_edited_time', width: 180 },
    ],
    relations: [
      // All People relations (Tags, Notes, Tasks, Projects) are created as reverses by other bases
    ],
  },
];

// ============================================
// SEED FUNCTION
// ============================================

async function seedDefaultBases(userId) {
  // Check if already seeded
  const existing = await db.getAll(
    'SELECT id, name FROM bases WHERE user_id = $1 AND is_default = TRUE',
    [userId]
  );
  const existingNames = new Set(existing.map(b => b.name));

  const basesToSeed = DEFAULT_BASES.filter(b => !existingNames.has(b.name));
  if (basesToSeed.length === 0) return existing;

  const result = await db.transaction(async (client) => {
    const createdBases = {};

    // Pass 1: Create bases and non-relation properties
    for (const baseDef of DEFAULT_BASES) {
      if (existingNames.has(baseDef.name)) {
        // Already exists — look up its ID for relation wiring
        const ex = existing.find(e => e.name === baseDef.name);
        createdBases[baseDef.name] = ex.id;
        continue;
      }

      const baseId = uuidv4();
      const maxPos = await client.getOne(
        'SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM bases WHERE user_id = $1',
        [userId]
      );

      await client.run(
        `INSERT INTO bases (id, name, description, icon, user_id, position, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
        [baseId, baseDef.name, baseDef.description, baseDef.icon, userId, maxPos.next_pos]
      );

      // Create non-relation properties
      for (let i = 0; i < baseDef.properties.length; i++) {
        const prop = baseDef.properties[i];
        const propId = uuidv4();
        const options = prop.options ? JSON.stringify(prop.options) : '[]';
        await client.run(
          `INSERT INTO base_properties (id, base_id, name, type, options, position, width, is_default)
           VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)`,
          [propId, baseId, prop.name, prop.type, options, i, prop.width || 200]
        );
      }

      createdBases[baseDef.name] = baseId;
    }

    // Pass 2: Create relation properties (need all bases to exist first)
    for (const baseDef of DEFAULT_BASES) {
      if (!baseDef.relations || baseDef.relations.length === 0) continue;

      const sourceBaseId = createdBases[baseDef.name];
      if (!sourceBaseId) continue;
      // Skip if this base already existed (relations already wired)
      if (existingNames.has(baseDef.name)) continue;

      for (const rel of baseDef.relations) {
        const targetBaseId = createdBases[rel.targetBase];
        if (!targetBaseId) continue;

        // Get next position for source base
        const sourceMaxPos = await client.getOne(
          'SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM base_properties WHERE base_id = $1',
          [sourceBaseId]
        );

        // Create the source relation property
        const sourcePropId = uuidv4();
        const reversePropId = uuidv4();

        const sourceOptions = JSON.stringify({
          relatedBaseId: targetBaseId,
          reversePropertyId: reversePropId,
          allowMultiple: rel.allowMultiple !== false,
        });

        await client.run(
          `INSERT INTO base_properties (id, base_id, name, type, options, position, width, is_default)
           VALUES ($1, $2, $3, 'relation', $4, $5, 200, TRUE)`,
          [sourcePropId, sourceBaseId, rel.propertyName, sourceOptions, sourceMaxPos.next_pos]
        );

        // Create the reverse relation property on target base
        const targetMaxPos = await client.getOne(
          'SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM base_properties WHERE base_id = $1',
          [targetBaseId]
        );

        const reverseOptions = JSON.stringify({
          relatedBaseId: sourceBaseId,
          reversePropertyId: sourcePropId,
          allowMultiple: true,
        });

        await client.run(
          `INSERT INTO base_properties (id, base_id, name, type, options, position, width, is_default)
           VALUES ($1, $2, $3, 'relation', $4, $5, 200, TRUE)`,
          [reversePropId, targetBaseId, rel.reverseName, reverseOptions, targetMaxPos.next_pos]
        );
      }
    }

    return createdBases;
  });

  return result;
}

async function getDefaultBase(userId, name) {
  return await db.getOne(
    'SELECT * FROM bases WHERE user_id = $1 AND name = $2 AND is_default = TRUE',
    [userId, name]
  );
}

async function hasDefaultBases(userId) {
  const result = await db.getOne(
    'SELECT COUNT(*)::int as count FROM bases WHERE user_id = $1 AND is_default = TRUE',
    [userId]
  );
  return result.count > 0;
}

module.exports = {
  DEFAULT_BASES,
  seedDefaultBases,
  getDefaultBase,
  hasDefaultBases,
};
```

**Step 2: Verify the file loads without errors**

Run: `docker exec lyfehub-dev node -e "const d = require('./src/db/defaultBases'); console.log(d.DEFAULT_BASES.length + ' bases defined'); console.log(Object.keys(d))"`

Expected: `5 bases defined` and exported function names.

**Step 3: Commit**

```bash
git add backend/src/db/defaultBases.js
git commit -m "feat(db): add default bases seed config and function"
```

---

## Task 3: Backend — Wire Seed into Routes + Protection + Convenience Endpoint

**Files:**
- Modify: `backend/src/routes/bases.js:1-50` (add imports and seed trigger)
- Modify: `backend/src/routes/bases.js` (add protection on delete endpoints, add convenience route)

**Step 1: Add seed trigger to GET /api/bases**

At the top of `bases.js`, add the import:

```javascript
const { seedDefaultBases, hasDefaultBases, getDefaultBase } = require('../db/defaultBases');
```

In the `GET /api/bases` handler (line 25), add seed check at the start of the try block:

```javascript
// Seed default bases on first access
const hasDefaults = await hasDefaultBases(req.user.id);
if (!hasDefaults) {
  await seedDefaultBases(req.user.id);
}
```

**Step 2: Add convenience endpoint GET /api/bases/default/:name**

Add BEFORE the `/:id` route (to avoid conflict):

```javascript
// GET /api/bases/default/:name - Get a default base by canonical name
router.get('/default/:name', requireScope('bases', 'read'), async (req, res) => {
  try {
    const base = await getDefaultBase(req.user.id, req.params.name);
    if (!base) {
      return res.status(404).json({ error: 'Default base not found' });
    }
    const properties = await basesDb.getPropertiesByBase(base.id);
    const records = await basesDb.getRecordsByBase(base.id);
    // Inject created_time/last_edited_time values into records
    const enrichedRecords = injectTimestampValues(records, properties);
    res.json({ ...base, properties, records: enrichedRecords });
  } catch (error) {
    console.error('Error fetching default base:', error);
    res.status(500).json({ error: 'Failed to fetch default base' });
  }
});
```

**Step 3: Add timestamp injection helper**

Add this helper function at the top of the file (after imports):

```javascript
function injectTimestampValues(records, properties) {
  const createdTimePropIds = properties.filter(p => p.type === 'created_time').map(p => p.id);
  const editedTimePropIds = properties.filter(p => p.type === 'last_edited_time').map(p => p.id);

  if (createdTimePropIds.length === 0 && editedTimePropIds.length === 0) return records;

  return records.map(record => {
    const values = { ...record.values };
    for (const propId of createdTimePropIds) {
      values[propId] = record.created_at;
    }
    for (const propId of editedTimePropIds) {
      values[propId] = record.updated_at;
    }
    return { ...record, values };
  });
}
```

**Step 4: Add the same injection to GET /api/bases/:id**

In the existing `GET /api/bases/:id` handler, find where records are returned and wrap with `injectTimestampValues(records, properties)`.

**Step 5: Add protection to DELETE endpoints**

Find the DELETE base handler and add at the start:

```javascript
const base = await basesDb.getBaseById(req.params.id);
if (base && base.is_default) {
  return res.status(403).json({ error: 'Default bases cannot be deleted' });
}
```

Find the DELETE property handler and add:

```javascript
const property = await basesDb.getPropertyById(req.params.propId);
if (property && property.is_default) {
  return res.status(403).json({ error: 'Default properties cannot be deleted' });
}
```

**Step 6: Commit**

```bash
git add backend/src/routes/bases.js
git commit -m "feat(api): wire default bases seed, protection, and convenience endpoint"
```

---

## Task 4: Frontend Types — Expand BasePropertyType Union

**Files:**
- Modify: `frontend-next/src/types/base.ts:3-11`

**Step 1: Expand the type union**

Replace lines 3-11:

```typescript
export type BasePropertyType =
  | 'text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'checkbox'
  | 'url'
  | 'relation'
  | 'email'
  | 'phone'
  | 'files'
  | 'rich_text'
  | 'status'
  | 'created_time'
  | 'last_edited_time'
```

**Step 2: Add StatusOption interface**

After the `SelectOption` interface (after line 17), add:

```typescript
export interface StatusOption {
  label: string
  color: string
  group: 'todo' | 'in_progress' | 'complete'
}
```

**Step 3: Update BasePropertyOptions union**

Update to include StatusOption[]:

```typescript
export type BasePropertyOptions =
  | SelectOption[]
  | StatusOption[]
  | RelationOptions
  | unknown[]
  | Record<string, unknown>
```

**Step 4: Add is_default to Base and BaseProperty interfaces**

In `BaseProperty` (line 33), add: `is_default?: boolean`
In `Base` (line 105), add: `is_default?: boolean`

**Step 5: Commit**

```bash
git add frontend-next/src/types/base.ts
git commit -m "feat(types): expand BasePropertyType to 15 types, add StatusOption"
```

---

## Task 5: Frontend Constants — Register New Property Types

**Files:**
- Modify: `frontend-next/src/pages/bases/utils/baseConstants.ts`

**Step 1: Add new icon imports**

Update the lucide-react import (line 1-4):

```typescript
import {
  Type, Hash, ChevronDown, Tags, Calendar, CheckSquare, Link,
  ArrowLeftRight, Mail, Phone, Paperclip, FileText, CircleDot,
  Clock, History,
} from 'lucide-react'
```

**Step 2: Add new entries to PROPERTY_TYPES array**

After the existing 8 entries (after line 23), add:

```typescript
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'phone', label: 'Phone', icon: Phone },
  { value: 'files', label: 'Files', icon: Paperclip },
  { value: 'rich_text', label: 'Rich Text', icon: FileText },
  { value: 'status', label: 'Status', icon: CircleDot },
  { value: 'created_time', label: 'Created Time', icon: Clock },
  { value: 'last_edited_time', label: 'Last Edited', icon: History },
```

**Step 3: Add filter operators for new types**

Add to the FILTER_OPERATORS object:

```typescript
  email: [
    { value: 'contains', label: 'Contains' },
    { value: 'is', label: 'Is' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
  phone: [
    { value: 'contains', label: 'Contains' },
    { value: 'is', label: 'Is' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
  files: [
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
  rich_text: [
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does not contain' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
  status: [
    { value: 'is', label: 'Is' },
    { value: 'is_not', label: 'Is not' },
    { value: 'is_empty', label: 'Is empty' },
  ],
  created_time: [
    { value: 'is', label: 'Is' },
    { value: 'before', label: 'Before' },
    { value: 'after', label: 'After' },
  ],
  last_edited_time: [
    { value: 'is', label: 'Is' },
    { value: 'before', label: 'Before' },
    { value: 'after', label: 'After' },
  ],
```

**Step 4: Add STATUS_GROUPS constant**

After TAG_COLORS:

```typescript
export const STATUS_GROUPS = [
  { value: 'todo', label: 'To-do', color: 'gray' },
  { value: 'in_progress', label: 'In Progress', color: 'blue' },
  { value: 'complete', label: 'Complete', color: 'green' },
] as const

export type StatusGroup = (typeof STATUS_GROUPS)[number]['value']
```

**Step 5: Add READ_ONLY_TYPES constant**

```typescript
export const READ_ONLY_TYPES: BasePropertyType[] = ['created_time', 'last_edited_time']
```

**Step 6: Commit**

```bash
git add frontend-next/src/pages/bases/utils/baseConstants.ts
git commit -m "feat(bases): register 7 new property types with icons, filters, and constants"
```

---

## Task 6: Frontend Helpers — Add Filter/Sort/Display Logic for New Types

**Files:**
- Modify: `frontend-next/src/pages/bases/utils/baseHelpers.ts`

**Step 1: Update evaluateFilter switch statement**

Add cases in the switch at line 26:

```typescript
    case 'email':
    case 'phone':
    case 'rich_text': {
      switch (operator) {
        case 'contains': return strValue.includes(filterLower)
        case 'not_contains': return !strValue.includes(filterLower)
        case 'is': return strValue === filterLower
        case 'is_not': return strValue !== filterLower
        default: return true
      }
    }

    case 'status': {
      switch (operator) {
        case 'is': return strValue === filterLower
        case 'is_not': return strValue !== filterLower
        default: return true
      }
    }

    case 'created_time':
    case 'last_edited_time': {
      switch (operator) {
        case 'is': return strValue.startsWith(filterLower)
        case 'before': return strValue < filterLower
        case 'after': return strValue > filterLower
        default: return true
      }
    }

    case 'files': {
      // Files can only be filtered by empty/not_empty (handled above)
      return true
    }
```

**Step 2: Update getCellValueForSort switch**

Add cases:

```typescript
    case 'email':
    case 'phone':
    case 'rich_text':
    case 'status':
      return String(raw)
    case 'created_time':
    case 'last_edited_time':
      return String(raw) // ISO timestamps sort lexicographically
    case 'files':
      return Array.isArray(raw) ? raw.length : 0
```

**Step 3: Update getDisplayValue switch**

Add cases:

```typescript
    case 'email':
    case 'phone':
    case 'rich_text':
      return String(raw)

    case 'status': {
      const statusOptions = parsePropertyOptions(property.options) as StatusOption[]
      if (Array.isArray(statusOptions)) {
        const opt = statusOptions.find(o => o.label === raw)
        return opt?.label ?? String(raw)
      }
      return String(raw)
    }

    case 'created_time':
    case 'last_edited_time':
      return formatSystemDate(String(raw))

    case 'files': {
      const filesArr = Array.isArray(raw) ? raw : []
      return filesArr.length === 0 ? '' : `${filesArr.length} file${filesArr.length === 1 ? '' : 's'}`
    }
```

Add `StatusOption` to the import from `@/types/index.js`.

**Step 4: Commit**

```bash
git add frontend-next/src/pages/bases/utils/baseHelpers.ts
git commit -m "feat(bases): add filter/sort/display logic for 7 new property types"
```

---

## Task 7: Frontend — New Cell Renderer Components

**Files:**
- Create: `frontend-next/src/pages/bases/components/detail/cells/CellEmail.tsx`
- Create: `frontend-next/src/pages/bases/components/detail/cells/CellPhone.tsx`
- Create: `frontend-next/src/pages/bases/components/detail/cells/CellRichText.tsx`
- Create: `frontend-next/src/pages/bases/components/detail/cells/CellStatus.tsx`
- Create: `frontend-next/src/pages/bases/components/detail/cells/CellCreatedTime.tsx`
- Create: `frontend-next/src/pages/bases/components/detail/cells/CellLastEditedTime.tsx`

**Step 1: Create CellEmail.tsx**

```tsx
import { Mail } from 'lucide-react'

interface CellEmailProps {
  value: unknown
}

export function CellEmail({ value }: CellEmailProps) {
  if (value == null || value === '') {
    return <span className="text-sm text-text-muted">&mdash;</span>
  }

  const email = String(value)

  return (
    <a
      href={`mailto:${email}`}
      className="text-sm text-accent hover:underline inline-flex items-center gap-1 max-w-full"
      onClick={(e) => e.stopPropagation()}
    >
      <Mail className="w-3 h-3 shrink-0" />
      <span className="truncate">{email}</span>
    </a>
  )
}
```

**Step 2: Create CellPhone.tsx**

```tsx
import { Phone } from 'lucide-react'

interface CellPhoneProps {
  value: unknown
}

export function CellPhone({ value }: CellPhoneProps) {
  if (value == null || value === '') {
    return <span className="text-sm text-text-muted">&mdash;</span>
  }

  const phone = String(value)

  return (
    <a
      href={`tel:${phone}`}
      className="text-sm text-accent hover:underline inline-flex items-center gap-1 max-w-full"
      onClick={(e) => e.stopPropagation()}
    >
      <Phone className="w-3 h-3 shrink-0" />
      <span className="truncate">{phone}</span>
    </a>
  )
}
```

**Step 3: Create CellRichText.tsx**

```tsx
interface CellRichTextProps {
  value: unknown
}

export function CellRichText({ value }: CellRichTextProps) {
  const str = value != null ? String(value) : ''

  if (!str) {
    return <span className="text-sm text-text-muted">&mdash;</span>
  }

  return (
    <span className="text-sm text-text-primary truncate max-w-full block" title={str}>
      {str.length > 80 ? str.slice(0, 80) + '\u2026' : str}
    </span>
  )
}
```

**Step 4: Create CellStatus.tsx**

```tsx
import type { StatusOption } from '@/types/index.js'
import { getTagColor } from '@/pages/bases/utils/baseConstants.js'
import { cn } from '@/lib/utils.js'

interface CellStatusProps {
  value: unknown
  options: StatusOption[]
}

export function CellStatus({ value, options }: CellStatusProps) {
  if (value == null || value === '') {
    return <span className="text-sm text-text-muted">&mdash;</span>
  }

  const strValue = String(value)
  const option = options.find(o => o.label === strValue)

  if (!option) {
    return <span className="text-sm text-text-muted">&mdash;</span>
  }

  const tagColor = getTagColor(option.color)

  return (
    <span
      className={cn(
        tagColor.bg,
        tagColor.text,
        tagColor.border,
        'px-2 py-0.5 rounded-md text-xs border inline-flex items-center gap-1.5'
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', tagColor.dot)} />
      {option.label}
    </span>
  )
}
```

**Step 5: Create CellCreatedTime.tsx**

```tsx
import { formatRelativeDate } from '@/pages/bases/utils/baseHelpers.js'

interface CellCreatedTimeProps {
  value: unknown
}

export function CellCreatedTime({ value }: CellCreatedTimeProps) {
  if (value == null || value === '') {
    return <span className="text-sm text-text-muted">&mdash;</span>
  }

  const dateStr = String(value)
  const formatted = formatRelativeDate(dateStr)
  const full = new Date(dateStr).toLocaleString()

  return (
    <span className="text-sm text-text-secondary" title={full}>
      {formatted}
    </span>
  )
}
```

**Step 6: Create CellLastEditedTime.tsx**

```tsx
import { formatRelativeDate } from '@/pages/bases/utils/baseHelpers.js'

interface CellLastEditedTimeProps {
  value: unknown
}

export function CellLastEditedTime({ value }: CellLastEditedTimeProps) {
  if (value == null || value === '') {
    return <span className="text-sm text-text-muted">&mdash;</span>
  }

  const dateStr = String(value)
  const formatted = formatRelativeDate(dateStr)
  const full = new Date(dateStr).toLocaleString()

  return (
    <span className="text-sm text-text-secondary" title={full}>
      {formatted}
    </span>
  )
}
```

**Step 7: Commit**

```bash
git add frontend-next/src/pages/bases/components/detail/cells/CellEmail.tsx \
        frontend-next/src/pages/bases/components/detail/cells/CellPhone.tsx \
        frontend-next/src/pages/bases/components/detail/cells/CellRichText.tsx \
        frontend-next/src/pages/bases/components/detail/cells/CellStatus.tsx \
        frontend-next/src/pages/bases/components/detail/cells/CellCreatedTime.tsx \
        frontend-next/src/pages/bases/components/detail/cells/CellLastEditedTime.tsx
git commit -m "feat(bases): add 6 new cell renderer components"
```

---

## Task 8: Frontend — New Cell Editor Components

**Files:**
- Create: `frontend-next/src/pages/bases/components/detail/cells/CellEmailEditor.tsx`
- Create: `frontend-next/src/pages/bases/components/detail/cells/CellPhoneEditor.tsx`
- Create: `frontend-next/src/pages/bases/components/detail/cells/CellRichTextEditor.tsx`
- Create: `frontend-next/src/pages/bases/components/detail/cells/CellStatusEditor.tsx`

**Step 1: Create CellEmailEditor.tsx**

Same pattern as CellTextEditor but with email input type:

```tsx
import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input.js'

interface CellEmailEditorProps {
  value: string
  onSave: (val: string) => void
  onCancel: () => void
}

export function CellEmailEditor({ value, onSave, onCancel }: CellEmailEditorProps) {
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      onSave(editValue)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  return (
    <Input
      ref={inputRef}
      type="email"
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onSave(editValue)}
      className="w-full border-accent h-8 text-sm"
      placeholder="email@example.com"
    />
  )
}
```

**Step 2: Create CellPhoneEditor.tsx**

```tsx
import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input.js'

interface CellPhoneEditorProps {
  value: string
  onSave: (val: string) => void
  onCancel: () => void
}

export function CellPhoneEditor({ value, onSave, onCancel }: CellPhoneEditorProps) {
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      onSave(editValue)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  return (
    <Input
      ref={inputRef}
      type="tel"
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onSave(editValue)}
      className="w-full border-accent h-8 text-sm"
      placeholder="(555) 123-4567"
    />
  )
}
```

**Step 3: Create CellRichTextEditor.tsx**

```tsx
import { useState, useRef, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea.js'

interface CellRichTextEditorProps {
  value: string
  onSave: (val: string) => void
  onCancel: () => void
}

export function CellRichTextEditor({ value, onSave, onCancel }: CellRichTextEditorProps) {
  const [editValue, setEditValue] = useState(value)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      onSave(editValue)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  return (
    <Textarea
      ref={textareaRef}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onSave(editValue)}
      className="w-full border-accent text-sm min-h-[80px] resize-y"
      placeholder="Enter text... (Ctrl+Enter to save)"
    />
  )
}
```

**Step 4: Create CellStatusEditor.tsx**

Like CellSelectEditor but with grouped sections:

```tsx
import { useRef, useEffect } from 'react'
import type { StatusOption } from '@/types/index.js'
import { getTagColor, STATUS_GROUPS } from '@/pages/bases/utils/baseConstants.js'
import { cn } from '@/lib/utils.js'

interface CellStatusEditorProps {
  value: string
  options: StatusOption[]
  onSave: (val: string) => void
  onCancel: () => void
}

export function CellStatusEditor({ value, options, onSave, onCancel }: CellStatusEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onCancel()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onCancel])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  // Group options by their group field
  const grouped = STATUS_GROUPS.map(group => ({
    ...group,
    options: options.filter(o => o.group === group.value),
  })).filter(g => g.options.length > 0)

  return (
    <div ref={containerRef} className="relative">
      <div className="absolute z-50 bg-bg-elevated border border-border rounded-md shadow-lg mt-1 min-w-[160px] max-h-[250px] overflow-y-auto">
        {grouped.map((group) => (
          <div key={group.value}>
            <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-text-muted font-medium">
              {group.label}
            </div>
            {group.options.map((option) => {
              const tagColor = getTagColor(option.color)
              const isSelected = option.label === value
              return (
                <div
                  key={option.label}
                  className={cn(
                    'px-3 py-1.5 hover:bg-bg-hover cursor-pointer text-sm flex items-center gap-2',
                    isSelected && 'bg-bg-hover'
                  )}
                  onClick={() => onSave(option.label)}
                >
                  <span className={cn('w-2.5 h-2.5 rounded-full border flex-shrink-0', tagColor.bg, tagColor.border)} />
                  <span className="text-text-primary">{option.label}</span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 5: Commit**

```bash
git add frontend-next/src/pages/bases/components/detail/cells/CellEmailEditor.tsx \
        frontend-next/src/pages/bases/components/detail/cells/CellPhoneEditor.tsx \
        frontend-next/src/pages/bases/components/detail/cells/CellRichTextEditor.tsx \
        frontend-next/src/pages/bases/components/detail/cells/CellStatusEditor.tsx
git commit -m "feat(bases): add 4 new cell editor components"
```

---

## Task 9: Frontend — Wire New Types into BaseCell Dispatch + Cells Index

**Files:**
- Modify: `frontend-next/src/pages/bases/components/detail/cells/index.ts`
- Modify: `frontend-next/src/pages/bases/components/detail/BaseCell.tsx`

**Step 1: Update cells/index.ts barrel export**

Add new exports:

```typescript
export { CellEmail } from './CellEmail.js'
export { CellPhone } from './CellPhone.js'
export { CellRichText } from './CellRichText.js'
export { CellStatus } from './CellStatus.js'
export { CellCreatedTime } from './CellCreatedTime.js'
export { CellLastEditedTime } from './CellLastEditedTime.js'
export { CellFiles } from './CellFiles.js'
```

**Step 2: Update BaseCell.tsx imports**

Add to the import from cells/index.js:

```typescript
import {
  CellText, CellNumber, CellCheckbox, CellSelect, CellMultiSelect,
  CellDate, CellUrl, CellRelation, CellEmail, CellPhone, CellRichText,
  CellStatus, CellCreatedTime, CellLastEditedTime, CellFiles,
} from '@/pages/bases/components/detail/cells/index.js'
```

Add new editor imports:

```typescript
import { CellEmailEditor } from './cells/CellEmailEditor.js'
import { CellPhoneEditor } from './cells/CellPhoneEditor.js'
import { CellRichTextEditor } from './cells/CellRichTextEditor.js'
import { CellStatusEditor } from './cells/CellStatusEditor.js'
```

Add type imports:

```typescript
import type { BaseRecord, BaseProperty, SelectOption, StatusOption } from '@/types/index.js'
import { READ_ONLY_TYPES } from '@/pages/bases/utils/baseConstants.js'
```

**Step 3: Update handleClick to skip read-only types**

Change line 64:

```typescript
  function handleClick() {
    if (property.type !== 'checkbox' && property.type !== 'relation' && property.type !== 'files' && !READ_ONLY_TYPES.includes(property.type)) {
      setEditingCell({ recordId: record.id, propertyId: property.id })
    }
  }
```

**Step 4: Update renderEditor switch**

Add cases:

```typescript
      case 'email':
        return <CellEmailEditor value={String(value ?? '')} onSave={handleSave} onCancel={handleCancel} />
      case 'phone':
        return <CellPhoneEditor value={String(value ?? '')} onSave={handleSave} onCancel={handleCancel} />
      case 'rich_text':
        return <CellRichTextEditor value={String(value ?? '')} onSave={handleSave} onCancel={handleCancel} />
      case 'status':
        return (
          <CellStatusEditor
            value={String(value ?? '')}
            options={(property.options as StatusOption[]) ?? []}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )
```

**Step 5: Update renderCell switch**

Add cases:

```typescript
      case 'email':
        return <CellEmail value={value} />
      case 'phone':
        return <CellPhone value={value} />
      case 'rich_text':
        return <CellRichText value={value} />
      case 'status':
        return <CellStatus value={value} options={property.options as StatusOption[]} />
      case 'created_time':
        return <CellCreatedTime value={value} />
      case 'last_edited_time':
        return <CellLastEditedTime value={value} />
      case 'files':
        return <CellFiles value={value} baseId={baseId} property={property} recordId={record.id} />
```

**Step 6: Commit**

```bash
git add frontend-next/src/pages/bases/components/detail/cells/index.ts \
        frontend-next/src/pages/bases/components/detail/BaseCell.tsx
git commit -m "feat(bases): wire 7 new types into cell dispatch"
```

---

## Task 10: Frontend — Update Property Modals for Status Type

**Files:**
- Modify: `frontend-next/src/pages/bases/components/modals/AddPropertyModal.tsx`
- Modify: `frontend-next/src/pages/bases/components/modals/EditPropertyModal.tsx`
- Modify: `frontend-next/src/pages/bases/components/modals/EditOptionsModal.tsx`

**Step 1: Update AddPropertyModal**

In the config step, add a condition for `status` type alongside `select`/`multi_select` so that the options editor is shown. The `status` type uses the same `SelectOptionsEditor` component but with an extra `group` field dropdown per option.

When `selectedType === 'status'`, show the same options editor, but each option gets a group selector (todo/in_progress/complete). Implementation: add a `statusGroupSelector` prop to the existing options editor, or handle it by adding a group dropdown next to each option's color picker.

Simplest approach: treat `status` identically to `select` in the modal, but ensure the options include the `group` field. The `StatusOption` objects are stored in `options` JSON.

Add `status` to the condition that shows the options editor:

```typescript
{(selectedType === 'select' || selectedType === 'multi_select' || selectedType === 'status') && (
  // show SelectOptionsEditor
)}
```

**Step 2: Update EditOptionsModal similarly**

Add `status` to the type check that shows the options editor.

**Step 3: Hide "add property" for created_time/last_edited_time on default bases**

In `PropertyTypeSelect.tsx`, optionally filter out `created_time` and `last_edited_time` from the selectable types when creating a new property (these are auto-populated and users shouldn't add them manually to non-default bases — or we can allow it, since they just show timestamps).

Decision: Allow them. Users can add these to any base. They're always read-only.

**Step 4: Commit**

```bash
git add frontend-next/src/pages/bases/components/modals/AddPropertyModal.tsx \
        frontend-next/src/pages/bases/components/modals/EditPropertyModal.tsx \
        frontend-next/src/pages/bases/components/modals/EditOptionsModal.tsx
git commit -m "feat(bases): support status type in property modals"
```

---

## Task 11: Frontend — Add useDefaultBase Hook

**Files:**
- Modify: `frontend-next/src/api/hooks/useBases.ts`

**Step 1: Add useDefaultBase hook**

After the existing hooks, add:

```typescript
export function useDefaultBase(name: string) {
  return useQuery({
    queryKey: [...baseKeys.all, 'default', name],
    queryFn: async () => {
      const res = await apiClient.get(`/bases/default/${encodeURIComponent(name)}`)
      return res as Base & { properties: BaseProperty[]; records: BaseRecord[] }
    },
    enabled: !!name,
  })
}
```

**Step 2: Commit**

```bash
git add frontend-next/src/api/hooks/useBases.ts
git commit -m "feat(hooks): add useDefaultBase hook for module pages"
```

---

## Task 12: Restart Backend + Verify End-to-End

**Step 1: Restart the backend container to pick up schema changes**

Run: `docker restart lyfehub-dev`

Wait 5 seconds, then verify:

Run: `docker logs lyfehub-dev --tail 20`

Expected: Server starts without errors, schema migrations run.

**Step 2: Start the Vite dev server**

Run: `cd frontend-next && npm run dev`

**Step 3: Test in browser**

1. Open the app, go to Bases section
2. Verify the 5 default bases appear (Tasks, Projects, Notes, Tags, People)
3. Open the Tasks base — verify all 22 properties show up with correct types
4. Add a record to the Tasks base — verify status dropdown works with grouped options
5. Check that created_time and last_edited_time show timestamps
6. Open People base — verify email/phone columns render correctly
7. Try adding a new custom property (any type) — verify it works alongside default properties

**Step 4: Verify protection**

Try deleting a default base — should get 403.
Try deleting a default property — should get 403.

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address integration issues from end-to-end testing"
```

---

## Task 13: Type Check + Final Commit

**Step 1: Run TypeScript check**

Run: `cd frontend-next && npx tsc --noEmit`

Fix any type errors.

**Step 2: Final commit**

```bash
git add -A
git commit -m "chore: fix type errors from property type expansion"
```

---

## Summary of All Tasks

| # | Task | Files | Commits |
|---|------|-------|---------|
| 1 | DB migration (CHECK + is_default) | init.sql | 1 |
| 2 | Default bases seed function | defaultBases.js (new) | 1 |
| 3 | Wire seed into routes + protection | routes/bases.js | 1 |
| 4 | Expand TypeScript types | types/base.ts | 1 |
| 5 | Register new property types | baseConstants.ts | 1 |
| 6 | Filter/sort/display helpers | baseHelpers.ts | 1 |
| 7 | New cell renderers (6 files) | cells/*.tsx (new) | 1 |
| 8 | New cell editors (4 files) | cells/*Editor.tsx (new) | 1 |
| 9 | Wire into BaseCell dispatch | BaseCell.tsx, index.ts | 1 |
| 10 | Update property modals | modals/*.tsx | 1 |
| 11 | useDefaultBase hook | useBases.ts | 1 |
| 12 | Integration testing | various | 1 |
| 13 | Type check + cleanup | various | 1 |

**Total: ~20 new/modified files, 13 commits**
