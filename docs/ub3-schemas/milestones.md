# MILESTONES Database Schema

> **Source:** Jake's Ultimate Brain 3.0 (Notion)  
> **Database ID:** `22f49e36-383b-81ac-9fad-e20b2db3d9fc`  
> **Icon:** 📌 (push-pin_red)  
> **Created:** 2025-07-13  
> **Last Edited:** 2025-07-13

## Description

This is the primary/source database for all milestones in Ultimate Brain. All of your milestones are contained in this database; the Milestone views within Goals in Ultimate Brain are linked views of this database with unique sets of filters, sorts, and display criteria that make them more useful.

**You should only ever need to interact with this main database when making changes to it. If you need to make a change, first unlock the database by clicking the "Locked" button above if it exists.**

---

## Properties Overview

| Property | Type | ID | Description |
|----------|------|-----|-------------|
| Name | title | `title` | The milestone name |
| Goal | relation | `~~ZD` | Link to parent goal |
| Target Deadline | date | `nZlX` | Target date to complete |
| Date Completed | date | `qvZ]` | Actual completion date |
| Goal Area | rollup | `SByE` | Area inherited from goal |

**Total Properties:** 5

---

## Property Details

### 📝 Core Identity

#### Name
- **Type:** `title`
- **ID:** `title`
- **Description:** The name of the milestone. It is recommended to be descriptive and ensure the milestone is measurable.

---

### 🔗 Relations

#### Goal
- **Type:** `relation`
- **ID:** `~~ZD`
- **Description:** The goal to which this milestone is related. This Relation property is connected to the Milestones Relation property in the Goals database.
- **Related Database:** Goals
  - **Database ID:** `22f49e36-383b-8149-a94c-f33dd262263b`
  - **Data Source ID:** `22f49e36-383b-81de-974c-000b8ef0299f`
- **Relation Type:** `dual_property` (two-way sync)
  - **Synced Property Name:** Milestones
  - **Synced Property ID:** `^=[s` (URL-encoded: `%5E%3D%5Bs`)

---

### 📅 Dates

#### Target Deadline
- **Type:** `date`
- **ID:** `nZlX`
- **Description:** The date by which you'd like to cross the milestone.
- **Format:** Standard Notion date (supports date only or date+time)

#### Date Completed
- **Type:** `date`
- **ID:** `qvZ]` (URL-encoded: `qvZ%5D`)
- **Description:** The date you passed the milestone.
- **Format:** Standard Notion date (supports date only or date+time)

---

### 📊 Rollups

#### Goal Area
- **Type:** `rollup`
- **ID:** `SByE`
- **Description:** The Area from the Areas/Resources database to which this milestone's goal is related (if there is one).
- **Configuration:**
  - **Relation Property:** Goal (`~~ZD`)
  - **Rollup Property:** Tag
    - **Property ID:** `~VQ{`
  - **Function:** `show_original`
- **Behavior:** Inherits the Area tag from the linked Goal. Uses `show_original` to display the value as-is without aggregation.

---

## Database Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                          MILESTONES                             │
│                   (22f49e36-383b-81ac-...)                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ Goal (many-to-one)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                            GOALS                                 │
│                   (22f49e36-383b-8149-...)                       │
│                                                                  │
│   ◄── Milestones (relation syncs back)                          │
│       Tag → rolled up as "Goal Area"                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ Tag (rollup source)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AREAS / RESOURCES                           │
│              (referenced via Goals.Tag property)                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Model Notes

### Milestone Lifecycle

1. **Created** — Milestone is named and linked to a Goal
2. **Target Deadline Set** — Optional target date assigned
3. **Completed** — Date Completed is filled in when milestone is achieved

### Key Characteristics

- **Simple Structure:** Milestones are lightweight markers within Goals
- **Goal-Centric:** Every milestone should relate to exactly one Goal
- **Area Inheritance:** Goal Area is automatically populated via rollup from the parent Goal
- **Measurable:** Names should be descriptive and measurable (per description guidance)

### Views in Ultimate Brain

The description notes that Milestone views within Goals are **linked views** of this database with unique filters, sorts, and display criteria. The source database (this one) should typically remain locked.

---

## LyfeHub Implementation Notes

For LyfeHub, Milestones would be implemented as:

```typescript
interface Milestone {
  id: string;
  name: string;                    // title property
  goalId: string | null;           // relation to Goals
  targetDeadline: Date | null;     // date field
  dateCompleted: Date | null;      // date field
  
  // Computed/derived (not stored, calculated at query time)
  goalArea?: string;               // from Goal → Area relationship
  isCompleted: boolean;            // derived from dateCompleted !== null
  isOverdue: boolean;              // derived from targetDeadline < now && !isCompleted
}
```

### Database Schema (SQLite)

```sql
CREATE TABLE milestones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
  target_deadline TEXT,  -- ISO date string
  date_completed TEXT,   -- ISO date string
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_milestones_goal ON milestones(goal_id);
CREATE INDEX idx_milestones_target ON milestones(target_deadline);
CREATE INDEX idx_milestones_completed ON milestones(date_completed);
```

---

## API Reference

### Retrieve Database Schema
```bash
curl -s "https://api.notion.com/v1/databases/22f49e36-383b-81ac-9fad-e20b2db3d9fc" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28"
```

### Query Milestones
```bash
curl -s -X POST "https://api.notion.com/v1/databases/22f49e36-383b-81ac-9fad-e20b2db3d9fc/query" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Create Milestone
```bash
curl -s -X POST "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{
    "parent": { "database_id": "22f49e36-383b-81ac-9fad-e20b2db3d9fc" },
    "properties": {
      "Name": {
        "title": [{ "text": { "content": "Complete first prototype" } }]
      },
      "Goal": {
        "relation": [{ "id": "GOAL_PAGE_ID" }]
      },
      "Target Deadline": {
        "date": { "start": "2026-03-01" }
      }
    }
  }'
```

---

*Document generated: 2025-07-13*  
*Schema version: Ultimate Brain 3.0*
