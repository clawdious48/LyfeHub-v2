# Goals Database Schema

> **Source:** Jake's Ultimate Brain 3.0 Notion Workspace  
> **Database ID:** `22f49e36-383b-8149-a94c-f33dd262263b`  
> **Icon:** 🏆 (trophy_red)  
> **Last Updated:** 2025-07-21

## Description

This is the primary/source database for all goals in Ultimate Brain. All of your goals are contained in this database; the Goal views throughout Ultimate Brain are linked views of this database with unique sets of filters, sorts, and display criteria that make them more useful.

You should only ever need to interact with this main database when making changes to it.

---

## Properties Overview

| Property | Type | ID | Purpose |
|----------|------|-----|---------|
| Name | title | `title` | The goal name |
| Status | status | `<\`SU` | Current goal status |
| Archived | checkbox | `@xMC` | Archive flag |
| Goal Set | date | `w>y~` | When the goal was created |
| Target Deadline | date | `m}_>` | Target completion date |
| Achieved | date | `~kct` | Actual completion date |
| Updated | last_edited_time | `W~^A` | Last modification timestamp |
| Tag | relation | `~VQ{` | Links to Tags database |
| Projects | relation | `F<lI` | Links to Projects database |
| Milestones | relation | `^=[s` | Links to Milestones database |
| Progress | formula | `q{x\|` | Milestone completion percentage |
| This Quarter | formula | `]G>A` | Is deadline in current quarter |
| This Year | formula | `yYKb` | Is deadline in current year |
| Latest Activity | formula | `xcgS` | Most recent activity date |

---

## Core Properties

### Name
- **Type:** `title`
- **ID:** `title`
- **Description:** The name of the goal. It is recommended to be descriptive and choose a name with a measurable outcome.

### Status
- **Type:** `status`
- **ID:** `<\`SU` (URL-encoded: `%3C%60SU`)
- **Description:** The status of the goal.

#### Status Options

| Status | Color | Group | Description |
|--------|-------|-------|-------------|
| **Dream** | 🟡 yellow | To-do | You've set this goal, but it's still just a dream. You're not actively working towards it yet. |
| **Active** | 🔵 blue | In progress | You're now actively working towards this goal. You've set a Target Deadline, you have metrics and checkpoints in mind, and you've got Projects set up to help make and track progress. |
| **Achieved** | 🟢 green | Complete | You did it! |

#### Status Groups

| Group | Color | Contains |
|-------|-------|----------|
| To-do | gray | Dream |
| In progress | blue | Active |
| Complete | green | Achieved |

### Archived
- **Type:** `checkbox`
- **ID:** `@xMC` (URL-encoded: `%40xMC`)
- **Description:** Check this checkbox if you'd like to archive this goal. Archived goals disappear from the Goals dashboard and show up in the Archived Goals section of the Archive page. It is recommended only to archive goals you don't intend on achieving and are no longer interested in.

---

## Date Properties

### Goal Set
- **Type:** `date`
- **ID:** `w>y~` (URL-encoded: `w%3Ey~`)
- **Description:** The date you set the goal.

### Target Deadline
- **Type:** `date`
- **ID:** `m}_>` (URL-encoded: `m%7D_%3E`)
- **Description:** The date by which you hope to achieve the goal. Note that goals differ from projects in that it's not always clear if you'll be able to meet the target deadline. What is important is that you work diligently toward it and make progress.

### Achieved
- **Type:** `date`
- **ID:** `~kct`
- **Description:** The date you achieved the goal and crossed off all milestones.

### Updated
- **Type:** `last_edited_time`
- **ID:** `W~^A` (URL-encoded: `W~%5EA`)
- **Description:** The date and time this goal was last updated. Auto-populated by Notion.

---

## Relation Properties

### Tag
- **Type:** `relation`
- **ID:** `~VQ{` (URL-encoded: `~VQ%7B`)
- **Related Database:** Tags (`22f49e36-383b-81f8-b720-f0b0c0bf32a9`)
- **Relation Type:** Dual property (two-way sync)
- **Synced Property:** "Goals" (`{CKx`) in Tags database
- **Description:** The Tag that this Goal is a part of. This Relation property is connected to the Goals Relation property in the Tags database. It's best to associate Goals with Tag pages that have the Area type (and that have the Area database template applied).

### Projects
- **Type:** `relation`
- **ID:** `F<lI` (URL-encoded: `F%3ClI`)
- **Related Database:** Projects (`22f49e36-383b-8157-a91e-df7acced5d74`)
- **Relation Type:** Dual property (two-way sync)
- **Synced Property:** "Goal" (`Fgt^`) in Projects database
- **Description:** Projects that are related to this Goal. This Relation property connects to the Goal Relation property in the Projects database.

### Milestones
- **Type:** `relation`
- **ID:** `^=[s` (URL-encoded: `%5E%3D%5Bs`)
- **Related Database:** Milestones (`22f49e36-383b-81ac-9fad-e20b2db3d9fc`)
- **Relation Type:** Dual property (two-way sync)
- **Synced Property:** "Goal" (`~~ZD`) in Milestones database
- **Description:** Milestones that are related to this Goal. This Relation property connects to the Goal Relation property in the Milestones database.

---

## Formula Properties

### Progress
- **Type:** `formula`
- **ID:** `q{x|` (URL-encoded: `q%7Bx%7C`)
- **Description:** Shows the percentage of milestones related to this goal that are complete, displayed as a progress bar.

**Logic:**
- Returns empty/0 if no milestones are linked
- Calculates: (completed milestones count / total milestones count)
- Filters milestones by their completion status property
- Rounds to 3 decimal places (e.g., 0.667 for 2/3 complete)

**Formula Expression:**
```
if(
  Milestones.empty(),
  "".toNumber(),
  (Milestones
    .filter(current.Complete)
    .length()
  / Milestones.length()
  * 1000)
  .round()
  / 1000
)
```

### This Quarter
- **Type:** `formula`
- **ID:** `]G>A` (URL-encoded: `%5DG%3EA`)
- **Description:** Returns true if this goal's Target Deadline is in the current quarter number (e.g., 1 for Jan-Mar). In the Year Planner page, this property is used along with This Year to determine which goals have a Target Deadline in the current quarter.

**Logic:**
- Returns `false` if Target Deadline is empty
- Compares the quarter+year of Target Deadline with current quarter+year
- Uses format "QY" (e.g., "Q32025" for Q3 2025)

**Formula Expression:**
```
if(
  empty(Target Deadline),
  false,
  Target Deadline.formatDate("QY") == now().formatDate("QY")
)
```

### This Year
- **Type:** `formula`
- **ID:** `yYKb`
- **Description:** Returns true if this goal's Target Deadline is in the current year. In the Year Planner page, this property is used along with This Quarter to determine which goals have a Target Deadline in the current quarter.

**Logic:**
- Returns `false` if Target Deadline is empty
- Compares the year of Target Deadline with current year
- Uses format "Y" (e.g., "2025")

**Formula Expression:**
```
if(
  empty(Target Deadline),
  false,
  Target Deadline.formatDate("Y") == now().formatDate("Y")
)
```

### Latest Activity
- **Type:** `formula`
- **ID:** `xcgS`
- **Description:** Returns the date and time of the latest activity in the Goal – including edits to it directly as well as changes to projects and milestones. Used for allowing Goals to be sorted by Latest Activity in certain views.

**Logic:**
1. Collects `last_edited_time` from all related Projects
2. Collects `last_edited_time` from all related Milestones
3. Includes the Goal's own `last_edited_time`
4. Concatenates all timestamps, sorts descending, returns the most recent

**Formula Expression:**
```
lets(
  projectActivity,
  Projects.map(current.Updated).sort().reverse(),
  milestoneActivity,
  Milestones.map(current.last_edited_time).sort().reverse(),
  editedList,
  [last_edited_time],
  concat(projectActivity, milestoneActivity, editedList).sort().reverse().first()
)
```

---

## Database Relationships Diagram

```
                    ┌─────────────┐
                    │    Tags     │
                    │  (Areas)    │
                    └──────┬──────┘
                           │
                           │ Tag ↔ Goals
                           │
                    ┌──────▼──────┐
         ┌──────────│    GOALS    │──────────┐
         │          └──────┬──────┘          │
         │                 │                 │
         │ Projects ↔ Goal │                 │ Milestones ↔ Goal
         │                 │                 │
   ┌─────▼─────┐           │          ┌──────▼──────┐
   │  Projects │           │          │  Milestones │
   └───────────┘           │          └─────────────┘
                           │
                    (Progress is calculated
                     from Milestones)
```

---

## Related Database IDs

| Database | ID |
|----------|-----|
| Goals (this) | `22f49e36-383b-8149-a94c-f33dd262263b` |
| Tags | `22f49e36-383b-81f8-b720-f0b0c0bf32a9` |
| Projects | `22f49e36-383b-8157-a91e-df7acced5d74` |
| Milestones | `22f49e36-383b-81ac-9fad-e20b2db3d9fc` |

---

## LyfeHub Implementation Notes

### Core Fields to Implement
1. **Name** - Text field, required
2. **Status** - Status/select field with Dream → Active → Achieved progression
3. **Archived** - Boolean for soft-delete functionality

### Date Tracking
- **Goal Set** - When user creates the goal
- **Target Deadline** - User-defined target date
- **Achieved** - Set when status changes to "Achieved"
- **Updated** - Auto-track via `updated_at` timestamp

### Relations to Build
1. **Tag/Area** - Many-to-one (a goal belongs to one area)
2. **Projects** - One-to-many (a goal can have multiple projects)
3. **Milestones** - One-to-many (a goal can have multiple milestones)

### Computed Fields
- **Progress** - Calculate from milestone completion (requires Milestones base)
- **This Quarter / This Year** - Server-side filter helpers for views
- **Latest Activity** - Aggregate latest edit from goal + related records

### Suggested Enhancements for LyfeHub
- Add `created_at` timestamp (Notion uses `Goal Set` manually)
- Consider adding `priority` field
- Add `notes` rich text field for goal description
- Consider `parent_goal` for goal hierarchies
