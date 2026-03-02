# Tasks Adapter PropMap Fix — Design

## Problem

The Tasks adapter (`useTasksAdapter.ts`) reads/writes values using semantic string keys (`title`, `my_day`) but the Tasks base stores values keyed by property UUIDs. Records are created but unreadable in both the Tasks page and the Bases table view.

## Solution

A **PropMap** — `Map<string, string>` of property name → property UUID — built dynamically from the properties returned by `useDefaultBase('Tasks')`.

### Field Mapping (TaskRecord → Base Property)

| TaskRecord field | Base property name | Type |
|---|---|---|
| title | Name | text |
| description | Description | rich_text |
| status | Status | status |
| priority | Priority | status |
| due_date | Due | date |
| due_time | Due Time | text (NEW) |
| due_time_end | Due Time End | text (NEW) |
| snooze_date | Snooze | date |
| completed_at | Completed | date |
| completed | *(derived)* | `completed_at != null` |
| my_day | My Day | checkbox |
| important | Important | checkbox (NEW) |
| energy | Energy | select |
| location | Location | select |
| list_id | Smart List | select |
| recurring | Recur Unit | select |
| recurring_days | Days | multi_select |
| project_id | Project | relation |
| people_ids | People | relation |

### New Properties to Add

| Property | Type | Reason |
|---|---|---|
| Important | checkbox | Star toggle in Tasks UI |
| Due Time | text | Time component of scheduling |
| Due Time End | text | End time for time ranges |

### Fields Removed from TaskRecord

- `subtasks` → use Sub-Tasks relation
- `note_ids` → use base relations
- `recurring_interval` → keep as `recurring` mapping to Recur Unit

### How PropMap Works

```typescript
const FIELD_TO_PROP: Record<string, string> = {
  title: 'Name', description: 'Description', status: 'Status',
  priority: 'Priority', due_date: 'Due', due_time: 'Due Time',
  due_time_end: 'Due Time End', snooze_date: 'Snooze',
  completed_at: 'Completed', my_day: 'My Day', important: 'Important',
  energy: 'Energy', location: 'Location', list_id: 'Smart List',
  recurring: 'Recur Unit', recurring_days: 'Days',
  project_id: 'Project', people_ids: 'People',
}

function buildPropMap(properties: BaseProperty[]): PropMap {
  const map = new Map<string, string>()
  for (const p of properties) map.set(p.name, p.id)
  return map
}

// Read: record.values[propMap.get('Name')] → task.title
// Write: { [propMap.get('Name')]: value } → sent to API
```

### Existing Bad Records

The 2 existing records have semantic keys. Migration script updates them to use property UUIDs.
