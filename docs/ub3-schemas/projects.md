# PROJECTS Database Schema

> **Source:** Jake's Ultimate Brain 3.0 (Notion)  
> **Database ID:** `22f49e36-383b-8157-a91e-df7acced5d74`  
> **Icon:** 🚀 (rocket_red)  
> **Created:** 2025-07-13  
> **Last Edited:** 2025-08-25

## Description

This is the primary/source database for all projects in Ultimate Brain. All of your projects are contained in this database; the Project views throughout Ultimate Brain are linked views of this database with unique sets of filters, sorts, and display criteria that make them more useful.

**Note:** You should only ever need to interact with this main database when making changes to it. If you need to make a change, first unlock the database by clicking the "Locked" button above if it exists.

---

## Properties Overview

| Property | Type | ID | Purpose |
|----------|------|-----|---------|
| Name | title | `title` | Project name |
| Status | status | `hyXy` | Project lifecycle status |
| Target Deadline | date | `h%3FSv` | Planned completion date |
| Completed | date | `GAhW` | Actual completion date |
| Archived | checkbox | `dvff` | Archive flag |
| Review Notes | rich_text | `{KtC` | Quick notes about project |
| Tasks | relation | `\ceG` | Related tasks |
| Notes | relation | `~ZFD` | Related notes |
| Pulled Notes | relation | `iTJU` | Notes pulled for context |
| Pulled Tags | relation | `G^GJ` | Tags to pull notes from |
| Goal | relation | `Fgt^` | Parent goal |
| Tag | relation | `VeW}` | Area/category tag |
| People | relation | `{A>p` | Related people |
| Goal Tag | rollup | `Kdc]` | Tag from related goal |
| Progress | formula | `~@Q~` | Task completion percentage |
| Meta | formula | `M^rN` | Active/overdue task counts |
| Time Tracked | formula | `BdK}` | Total tracked time (HH:MM:SS) |
| Time Tracked (Mins) | formula | `vvSh` | Total tracked minutes |
| Latest Activity | formula | `RX@[` | Most recent activity date |
| Quarter | formula | `dz;w` | Target deadline quarter |
| This Quarter | formula | `m@m@` | Is deadline this quarter? |
| This Year | formula | `^yWU` | Is deadline this year? |
| Localization Key | formula | `E~rf` | Translation helper |
| Created | created_time | `[TZU` | Page creation timestamp |
| Edited | last_edited_time | `g[WE` | Last edit timestamp |

---

## Core Properties

### Name
- **Type:** `title`
- **ID:** `title`
- **Description:** The name of the project.

### Status
- **Type:** `status`
- **ID:** `hyXy`
- **Description:** The status of the project. For "projects" that contain ongoing/maintenance items, use the Ongoing status.

#### Status Options

| Option | Color | ID | Description |
|--------|-------|-----|-------------|
| Planned | blue | `9cee7978-6383-4cb0-ab69-e853a32576c7` | Projects that you've planned to do, but haven't started yet. |
| On Hold | red | `ETSW` | Projects that have already been started, but are currently paused from active work. |
| Doing | green | `b5557fe0-85ed-4c52-92ec-77e118c6b130` | Projects with a defined end goal that you're currently working on. |
| Ongoing | orange | `Rn]y` | Projects that collect and organize tasks meant to maintain an ongoing standard (e.g. maintenance tasks in an Area within the PARA system). |
| Done | purple | `1f028aa7-0f53-4c7c-af6e-0fd491bb65fb` | Projects that are complete. |

#### Status Groups

| Group | Color | Options |
|-------|-------|---------|
| To-do | gray | Planned, On Hold |
| In progress | blue | Doing, Ongoing |
| Complete | green | Done |

### Target Deadline
- **Type:** `date`
- **ID:** `h%3FSv`
- **Description:** The date on which you plan to complete this project. Useful for planning backwards – if you have a Target Deadline, you can more easily set due dates for any tasks related to the project.

### Completed
- **Type:** `date`
- **ID:** `GAhW`
- **Description:** The date the project was actually completed. Compare with your Target Deadline to see how well you were able to predict the project's timeline.

### Archived
- **Type:** `checkbox`
- **ID:** `dvff`
- **Description:** If checked, this project is Archived. It will be removed from all main views in UB, and show up in the Archived Projects section of the Archive page. This follows the PARA principle - archived items are removed from the main lists and safely tucked out of sight.

### Review Notes
- **Type:** `rich_text`
- **ID:** `{KtC`
- **Description:** Add any quick notes about this project here.

---

## Relation Properties

### Tasks
- **Type:** `relation`
- **ID:** `\ceG`
- **Linked Database:** Tasks (`22f49e36-383b-814f-a8d0-e553c1923507`)
- **Synced Property:** `Project` (ID: `mvxY`)
- **Description:** Tasks that are part of this Project. This Relation property connects to the Project Relation property in the Tasks database.

### Notes
- **Type:** `relation`
- **ID:** `~ZFD`
- **Linked Database:** Notes (`22f49e36-383b-81b6-9e3b-cb6b898f014f`)
- **Synced Property:** `Project` (ID: `mgGA`)
- **Description:** Notes that are directly related to this Project. This Relation property connects to the Project Relation property in the Notes database.

### Pulled Notes
- **Type:** `relation`
- **ID:** `iTJU`
- **Linked Database:** Notes (`22f49e36-383b-81b6-9e3b-cb6b898f014f`)
- **Synced Property:** `Pulls` (ID: `fnZJ`)
- **Description:** This Relation property allows you to "pull" existing notes into the Pulled Notes view within this Project's page body. Pulled Notes are notes that aren't directly related to the project (not created as part of the project), but that may provide useful context to the project.

### Pulled Tags
- **Type:** `relation`
- **ID:** `G^GJ`
- **Linked Database:** Tags (`22f49e36-383b-81f8-b720-f0b0c0bf32a9`)
- **Synced Property:** `Pulls` (ID: `M=:^`)
- **Description:** This Relation property allows you to "pull" ALL of the Notes from a specific Tag page in the Tags database into the Pulled Notes view within this Project's page body. See the Pulled Notes property description/reference for more info on this property's function.

### Goal
- **Type:** `relation`
- **ID:** `Fgt^`
- **Linked Database:** Goals (`22f49e36-383b-8149-a94c-f33dd262263b`)
- **Synced Property:** `Projects` (ID: `F<lI`)
- **Description:** A goal this project is a part of. This Relation property connected to the Projects Relation property in the Goals database.

### Tag
- **Type:** `relation`
- **ID:** `VeW}`
- **Linked Database:** Tags (`22f49e36-383b-81f8-b720-f0b0c0bf32a9`)
- **Synced Property:** `Projects` (ID: `E{Sh`)
- **Description:** The Tag with which this Project is associated. This Relation property connects to the Projects Relation property in the Tags database. It's typically best to associate Projects with Tags that have a type of Area (and have the Area database template applied).

### People
- **Type:** `relation`
- **ID:** `{A>p`
- **Linked Database:** People (`22f49e36-383b-81ce-9f7d-fa0bdf7d7caa`)
- **Synced Property:** `Projects` (ID: `v?~H`)
- **Description:** This property shows any people related to this project (e.g. a client or partner). This relation property connects to the Projects relation property in the People database.

---

## Rollup Properties

### Goal Tag
- **Type:** `rollup`
- **ID:** `Kdc]`
- **Relation:** Goal (`Fgt^`)
- **Rollup Property:** Tag (`~VQ{`)
- **Function:** `show_original`
- **Description:** If this project is related to a goal, this Rollup property shows the Tag (if any) to which the goal is related.

---

## Formula Properties

### Progress
- **Type:** `formula`
- **ID:** `~@Q~`
- **Description:** Shows the progress of the project by calculating the percentage of completed tasks related to it.
- **Logic:** 
  - Returns empty number if no tasks exist
  - Calculates: (count of Done tasks / total tasks) × 100
  - Rounds to 3 decimal places
  - Considers both "Done" status and the localized "Done" equivalent

### Meta
- **Type:** `formula`
- **ID:** `M^rN`
- **Description:** Displays the number of active (e.g. unfinished) tasks related to the project, as well as the number of overdue tasks.
- **Logic:**
  - Counts active tasks (not Done)
  - Counts overdue tasks (not Done AND due date is in the past)
  - Returns styled text:
    - "No Tasks Created" (blue) if no tasks
    - "All Tasks Done" (green) if all complete
    - "X Active" (blue) if no overdue
    - "X Active - Y Overdue" (blue/red) if overdue exist

### Time Tracked
- **Type:** `formula`
- **ID:** `BdK}`
- **Description:** The total time tracked across all tasks related to this project, formatted in HH:MM:SS (Seconds will always be "00"). Uses the Time Tracked (Mins) property, which contains the total number of tracked minutes as a numeric value.
- **Logic:**
  - Sums all tracked minutes from related tasks
  - Converts to hours and remaining minutes
  - Formats as HH:MM:00 with zero-padding

### Time Tracked (Mins)
- **Type:** `formula`
- **ID:** `vvSh`
- **Description:** The total number of minutes tracked on tasks related to this project.
- **Logic:** Maps through all related tasks, extracts their tracked time, and sums the values.

### Latest Activity
- **Type:** `formula`
- **ID:** `RX@[`
- **Description:** Returns the date and time of the latest activity in the project – including the project itself, along with any tasks or notes directly related to it. Used for allowing projects to be sorted by Latest Activity in certain views.
- **Logic:**
  - Collects last edited times from all related tasks
  - Collects last edited times from all related notes
  - Includes the project's own edited time
  - Returns the most recent datetime from all sources

### Quarter
- **Type:** `formula`
- **ID:** `dz;w`
- **Description:** Returns the quarter of the year for the project's Target Deadline. Used in the Plan page to filter projects into each quarter of the year.
- **Logic:** `formatDate("Q")` on Target Deadline

### This Quarter
- **Type:** `formula`
- **ID:** `m@m@`
- **Description:** Returns true (checked) if this project's Target Deadline falls within the current quarter of the year.
- **Logic:** Compares Target Deadline's "QY" format (e.g., "Q12025") with current date's "QY"

### This Year
- **Type:** `formula`
- **ID:** `^yWU`
- **Description:** Returns true (checked) if this project's Target Deadline falls within the current year. Used in the Plan page to filter projects into the correct timeframes.
- **Logic:** Compares Target Deadline's year with current year

### Localization Key
- **Type:** `formula`
- **ID:** `E~rf`
- **Description:** This property allows you to define translated names for the Project database's key Status options – Planned, On Hold, Doing, Ongoing, and Done. These are important for filters in certain views within My Day and Task Manager.
- **Logic:**
  - Defines variables for each status name (can be translated)
  - Returns a multi-dimensional array:
    - Index 0: To-do statuses [Planned, On Hold]
    - Index 1: Active statuses [Doing, Ongoing, ...additionalActiveStatusOptions]
    - Index 2: Complete statuses [Done]
  - Allows adding custom active status options

---

## Metadata Properties

### Created
- **Type:** `created_time`
- **ID:** `[TZU`
- **Description:** The date and time this project page was created.

### Edited
- **Type:** `last_edited_time`
- **ID:** `g[WE`
- **Description:** The date and time this project was last edited.

---

## Related Databases Reference

| Database | ID | Relation Properties |
|----------|-----|---------------------|
| **Tasks** | `22f49e36-383b-814f-a8d0-e553c1923507` | Tasks ↔ Project |
| **Notes** | `22f49e36-383b-81b6-9e3b-cb6b898f014f` | Notes ↔ Project, Pulled Notes ↔ Pulls |
| **Goals** | `22f49e36-383b-8149-a94c-f33dd262263b` | Goal ↔ Projects |
| **Tags** | `22f49e36-383b-81f8-b720-f0b0c0bf32a9` | Tag ↔ Projects, Pulled Tags ↔ Pulls |
| **People** | `22f49e36-383b-81ce-9f7d-fa0bdf7d7caa` | People ↔ Projects |

---

## LyfeHub Implementation Notes

### Core Fields to Implement
1. **Name** (title) - Required
2. **Status** (status with groups) - Critical for workflow
3. **Target Deadline** (date) - Planning
4. **Completed** (date) - Tracking actual completion
5. **Archived** (checkbox) - PARA methodology

### Relations to Build
- Tasks (many-to-one from Tasks)
- Notes (many-to-one from Notes)  
- Goal (many-to-one to Goals)
- Tag/Area (many-to-one to Tags)
- People (many-to-many)

### Computed Fields Needed
- **Progress** - % of tasks complete
- **Meta** - Active/overdue task counts
- **Latest Activity** - Most recent edit across project + tasks + notes

### Status Workflow
```
Planned → Doing → Done
     ↘           ↗
      On Hold ─→┘
      
Ongoing (perpetual/maintenance projects)
```

### Key Behaviors
1. **Archived projects** are hidden from main views but preserved
2. **Ongoing** status is for maintenance/recurring task containers
3. **Progress** only calculates if tasks exist
4. **Latest Activity** aggregates from project, tasks, AND notes
5. **Pulled Notes** allows referencing notes without direct relation
