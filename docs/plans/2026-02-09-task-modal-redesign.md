# Task Modal Redesign — Implementation Plan

> Date: 2026-02-09
> Status: Ready for execution

## Summary

Redesign the task popup modal with a wider layout, add relation support (Projects, People, Notes), add list assignment, and add expandable metadata section.

## Design Decisions (from brainstorm)

1. **Layout**: Full-width panel (~640px) with clean vertical flow
2. **Relations**: Projects + People + Notes — displayed as cyan pills
3. **Relation picker**: Inline search dropdown (not a separate modal)
4. **Metadata**: Hidden by default, expandable via "More details" toggle (priority, energy, location, status)
5. **List assignment**: Dropdown selector in the modal to assign tasks to lists
6. **Test account**: test@lyfehub.dev / TestAccount123! (already created)

## Architecture Notes

- Relations for core bases use direct FK columns (e.g., `project_id` on `task_items`)
- Need to add `people_ids` and `note_ids` columns to `task_items` (stored as JSON arrays)
- Frontend has existing `relationCache` in bases.js — reuse for display name resolution
- Existing `showRelationPicker()` in bases.js is modal-based; we'll build a lighter inline dropdown instead
- `list_id` column already exists on `task_items`; `task_lists` table fully built
- Task modal save() currently does NOT include `list_id`, `project_id`, or any relations

## Tasks

### Task 1: Backend — Add people_ids and note_ids columns to task_items

**Files:** `backend/src/db/schema.js`, `backend/src/db/taskItems.js`, `backend/src/db/coreBases.js`

Steps:
1. In `schema.js`: Add migration to add `people_ids TEXT DEFAULT '[]'` and `note_ids TEXT DEFAULT '[]'` columns to task_items
2. In `taskItems.js` `createTaskItem()`: Add `people_ids` and `note_ids` to INSERT statement (store as JSON string)
3. In `taskItems.js` `updateTaskItem()`: Add `people_ids` and `note_ids` to UPDATE statement
4. In `taskItems.js` `getAllTaskItems()`: Include `people_ids` and `note_ids` in SELECT, parse JSON on return
5. In `taskItems.js` `getTaskItemById()`: Same — include and parse
6. In `coreBases.js` core-tasks schema: Add people_ids and note_ids relation properties
7. In `coreBases.js` `getCoreBaseRecords()`: Include new columns in the core-tasks branch
8. In `coreBases.js` `createCoreBaseRecord()`: Handle new columns in the core-tasks branch
9. In `coreBases.js` `updateCoreBaseRecord()`: Handle new columns in the core-tasks branch

Verification: Restart server, POST a task-item with `people_ids: ["some-id"]` via curl, GET it back and confirm the field is there.

### Task 2: Frontend — Redesign task modal HTML structure (Reader View)

**Files:** `frontend/index.html`

Steps:
1. Widen the modal: change `.modal-task` target width in the HTML structure (CSS handles the actual sizing)
2. Restructure the header:
   - Title gets its own full-width row with complete button (left), title text (center-left, full width), and action buttons (right: edit, star, close)
   - Remove date badges from the header row
3. Add a date/time strip below the header: `div.task-date-strip` containing date, time, recurring badges
4. Add a relations section between date strip and description:
   - `div.task-relations-section` containing:
     - Project row: label "Project" + pill container + "+" add button
     - People row: label "People" + pill container + "+" add button
     - Notes row: label "Notes" + pill container + "+" add button
5. Add list assignment display: `div.task-list-section` showing the list name as a colored badge (if assigned)
6. Keep description and subtasks sections as-is
7. Add expandable "More details" section after subtasks:
   - `div.task-more-details` with a toggle button
   - Contains: priority, energy, location, status as small labeled badges

### Task 3: Frontend — Redesign task modal HTML structure (Edit View)

**Files:** `frontend/index.html`

Steps:
1. Add List selector to edit view:
   - `div.task-item-section` with label "List"
   - Dropdown/select populated from user's lists
2. Add Relations section to edit view:
   - `div.task-item-section` with label "Project"
     - Shows current project pill (if set) with X to remove
     - "+" button to open inline search dropdown
   - Same pattern for "People" (allows multiple) and "Notes" (allows multiple)
3. Add metadata fields to edit view:
   - Priority: select buttons (Low / Medium / High) — same pattern as recurring presets
   - Energy: select buttons (Low / High)
   - Location: select buttons (Home / Office / Errand)
   - Status: select buttons (To Do / Doing / Done)
4. Keep existing When/Repeat/Calendars/Description/Subtasks sections

### Task 4: Frontend — CSS for new task modal layout

**Files:** `frontend/css/style.css`

Steps:
1. Widen `.modal-task` to max-width ~640px
2. Style `.task-date-strip`: horizontal flex, gap, small text, badges matching current neon aesthetic
3. Style `.task-relations-section`: each relation row is a flex row with label (fixed width), pills area (flex-grow), and add button
4. Style `.task-relation-pill` in modal context (reuse existing `.cell-relation-pill` styling)
5. Style `.task-list-badge`: small colored pill showing list name and color dot
6. Style `.task-more-details`: collapsible section with smooth expand/collapse animation
7. Style `.task-metadata-grid`: 2-column grid for priority/energy/location/status badges
8. Style inline search dropdown: `.task-relation-dropdown` — positioned below the "+" button, with search input and scrollable list
9. Style list selector dropdown
10. Ensure responsive behavior at narrow viewports (stack vertically)

### Task 5: Frontend JS — Task modal save/load with relations, list, and metadata

**Files:** `frontend/js/tasks.js`

Steps:
1. Update `openNew()`:
   - Reset relation state (project, people, notes = empty)
   - Reset list selector
   - Reset metadata fields (priority, energy, location, status)
2. Update `openEdit(task)`:
   - Load and display project relation (resolve display name via API)
   - Load and display people relations (resolve display names)
   - Load and display note relations (resolve display names)
   - Set list selector to task's current list_id
   - Set metadata field values
3. Update `populateReaderView()`:
   - Render date/time strip below title
   - Render relation pills (project, people, notes) with resolved display names
   - Render list badge (if assigned)
   - Render "More details" section with metadata
4. Update `save()`:
   - Include `project_id`, `people_ids`, `note_ids` in taskData
   - Include `list_id` in taskData
   - Include `priority`, `energy`, `location`, `status` in taskData
5. Add new methods:
   - `loadRelationDisplayNames()` — fetches display names for all relation IDs
   - `toggleMoreDetails()` — expand/collapse metadata section

### Task 6: Frontend JS — Inline relation search dropdown

**Files:** `frontend/js/tasks.js`

Steps:
1. Add `showRelationDropdown(type, anchorEl)` method:
   - `type` is 'project', 'people', or 'notes'
   - Creates a dropdown element positioned below `anchorEl`
   - Fetches records from the related core base via API
   - Renders searchable list with checkboxes (multi) or radio (single for project)
   - On select: adds pill to the relation section, updates internal state
   - On click outside: closes dropdown
2. Add `removeRelation(type, recordId)` method:
   - Removes the pill from DOM
   - Updates internal state
3. Add `renderRelationPills(type, ids)` method:
   - For each ID, render a pill with display name (async resolve)
   - In edit mode: pills have X button to remove
   - In reader mode: pills are clickable (future: navigate to record)
4. Wire up "+" buttons to `showRelationDropdown()`
5. Wire up pill X buttons to `removeRelation()`

### Task 7: Frontend JS — List selector in modal

**Files:** `frontend/js/tasks.js`

Steps:
1. Add `loadListsForModal()` method:
   - Fetches user's lists from `/api/task-lists`
   - Populates the list dropdown in the edit view
   - Shows "No list" as default option
2. Add `renderListBadge()` method:
   - In reader view: shows colored badge with list name
   - If no list assigned: shows nothing (clean)
3. Wire up list dropdown change to update internal `selectedListId` state
4. Include `list_id: this.selectedListId` in save()

### Task 8: Verification — Playwright end-to-end test

**Files:** `playwright-task-screenshot.js`

Steps:
1. Update Playwright script to:
   - Log in with test account
   - Create a task with ALL fields filled (including relations and list)
   - Open the task in reader view → screenshot
   - Toggle "More details" → screenshot
   - Switch to edit view → screenshot
   - Screenshot the inline relation dropdown
2. Run and capture all screenshots
3. Delete test data

## Execution Order

Tasks 1-3 can be partially parallelized:
- **Wave 1**: Task 1 (backend) + Task 2 (reader HTML) + Task 3 (edit HTML)
- **Wave 2**: Task 4 (CSS) + Task 5 (JS save/load)
- **Wave 3**: Task 6 (relation dropdown) + Task 7 (list selector)
- **Wave 4**: Task 8 (verification)
