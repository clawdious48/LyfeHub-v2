# Ultimate Brain 3.0 — Tasks Database Schema

**Database ID:** `22f49e36-383b-814f-a8d0-e553c1923507`  
**Last Updated:** 2025-12-12  
**Icon:** ✓ (red checkmark)

## Description

> This is the primary/source database for all tasks in Ultimate Brain. All of your tasks are contained in this database; the Task Manager views throughout Ultimate Brain are linked views of this database with unique sets of filters, sorts, and display criteria that make them more useful.

---

## Core Fields

### Name
| Property | Value |
|----------|-------|
| **ID** | `title` |
| **Type** | `title` |
| **Description** | The name of the task. |

### Description
| Property | Value |
|----------|-------|
| **ID** | `R{z=` |
| **Type** | `rich_text` |
| **Description** | A simple text property for adding a note about this task. If you've added the Notion AI add-on to your workspace, you can turn AI Autofill on to generate a summary of the task's details (provided there's a full description in the task's page body). |

### Status
| Property | Value |
|----------|-------|
| **ID** | `mO?c` |
| **Type** | `status` |
| **Description** | Tracks the status of the task. Most views in Ultimate Brain show this property as a checkbox. Checking the checkbox will alternate Status between "To Do" and "Done". ⌥/Alt + Click the checkbox in order to access all options, including "Doing". |

**Options:**

| Name | Color | Group | Group Color | Description |
|------|-------|-------|-------------|-------------|
| To Do | red | To-do | gray | Tasks that you need to do. |
| Doing | blue | In progress | blue | Tasks you're currently doing. |
| Done | green | Complete | green | Tasks that are done. |

---

## Date Fields

### Due
| Property | Value |
|----------|-------|
| **ID** | `scmA` |
| **Type** | `date` |
| **Description** | The due date for the task. Note that most filters in Ultimate Brain filter against the End Date of Due. This doesn't affect pages with a single date, but does come into play if you set a start and end date. |

### Snooze
| Property | Value |
|----------|-------|
| **ID** | `UAOD` |
| **Type** | `date` |
| **Description** | Used in the Process and Process → Deferred pages for practicing GTD in Notion. Adding a Snooze date moves a task to the Deferred list/page. Note that only tasks without a Due date will show there. Due (Calendar) has higher priority than Snooze (Deferred). |

### Completed
| Property | Value |
|----------|-------|
| **ID** | `YSF]` |
| **Type** | `date` |
| **Description** | The date on which this task was completed. |

### Wait Date
| Property | Value |
|----------|-------|
| **ID** | `vE;N` |
| **Type** | `date` |
| **Description** | Used to note the date you delegated a task to someone else. This is most useful in Process → Delegated, which functions as the Delegated list for practicing GTD in Notion. |

### Created
| Property | Value |
|----------|-------|
| **ID** | `wnds` |
| **Type** | `created_time` |
| **Description** | The date and time the task was created. |

### Edited
| Property | Value |
|----------|-------|
| **ID** | `N]DG` |
| **Type** | `last_edited_time` |
| **Description** | The date and time the task was last edited. |

---

## Prioritization & Categorization

### Priority
| Property | Value |
|----------|-------|
| **ID** | `y>HY` |
| **Type** | `status` |
| **Description** | Priority level for your task. By default, this value only matters in the special Priority View. Priority doesn't affect task sorting or visibility in other views – but you can add Priority filters or grouping to them if you want. |

**Options:**

| Name | Color | Group | Group Color | Description |
|------|-------|-------|-------------|-------------|
| Low | blue | In progress | blue | For low-priority tasks. |
| Medium | green | In progress | blue | For medium-priority tasks. |
| High | red | In progress | blue | For high-priority tasks. |

*Note: Priority uses the status type with all options in the "In progress" group, making it function like a select field with visual indicators.*

### Energy
| Property | Value |
|----------|-------|
| **ID** | `[h^f` |
| **Type** | `select` |
| **Description** | Set an energy level required for completing this task. This can be used when prioritizing tasks during the day. |

**Options:**

| Name | Color |
|------|-------|
| High | green |
| Low | yellow |

### Location
| Property | Value |
|----------|-------|
| **ID** | `\yCP` |
| **Type** | `select` |
| **Description** | Sets the location at which the task needs to be completed. This can be used when prioritizing tasks during the day. |

**Options:**

| Name | Color |
|------|-------|
| Home | blue |
| Office | blue |
| Errand | blue |

### P/I (Process/Immersive)
| Property | Value |
|----------|-------|
| **ID** | `f|ps` |
| **Type** | `select` |
| **Description** | Label this task as either Process or Immersive. Process tasks require initial input to get a process started – e.g. delegating a task or replying to an email. Immersive tasks require your focus and energy for their entire duration. |

**Options:**

| Name | Color |
|------|-------|
| Process | blue |
| Immersive | blue |

### Labels
| Property | Value |
|----------|-------|
| **ID** | `:pw~` |
| **Type** | `multi_select` |
| **Description** | Allows you to add labels to tasks, which will allow you to create label-based Board views in Projects. Useful if you want to organize tasks in a project by type – e.g. Dev, Marketing, etc. Unlock the Tasks db to add options. (Known as Kanban - Tag in previous versions of UB.) |

**Options:** *User-defined (empty by default)*

### Smart List
| Property | Value |
|----------|-------|
| **ID** | `Mt_P` |
| **Type** | `select` |
| **Description** | Allows you to send tasks to specific lists in the Process page, which allows you to practice GTD (Getting Things Done) in Notion. The Due and Snooze properties also factor into these lists; tasks with a Due date go to the Calendar, and tasks with a Snooze date go to Deferred. |

**Options:**

| Name | Color |
|------|-------|
| Do Next | green |
| Delegated | yellow |
| Someday | red |

---

## My Day & Special Lists

### My Day
| Property | Value |
|----------|-------|
| **ID** | `obeX` |
| **Type** | `checkbox` |
| **Description** | If checked, this task will show up in the Execute view of the My Day page. Use this property to plan out the tasks you're going to do today (regardless of their due date). |

### Shopping List
| Property | Value |
|----------|-------|
| **ID** | `{XH:` |
| **Type** | `checkbox` |
| **Description** | This task will show up in the Shopping list within the Recipe w/ Shopping List template in the Recipes database. |

---

## Recurring Task Settings

### Recur Interval
| Property | Value |
|----------|-------|
| **ID** | `EQ=^` |
| **Type** | `number` |
| **Format** | `number` |
| **Description** | How often to make a recurring task recur. By default, this interval is a number of days - e.g an interval of 2 makes Next Due two days from Due (or today's date). You can set a Recur Unit to adjust this. |

### Recur Unit
| Property | Value |
|----------|-------|
| **ID** | `Buni` |
| **Type** | `select` |
| **Description** | Sets the unit of time that will be used by Recur Interval to set Next Due. E.g. if you set Week(s) here, then a Recur Interval of 2 will set a task to recur every 2 weeks. |

**Options:**

| Name | Color | Description |
|------|-------|-------------|
| Day(s) | blue | Recur by days. Example: If Recur Interval is 3, the task recurs every 3 days. If you want a task to recur on specific days of the week, set Recur Interval to 1, then choose specific days in the Days property. |
| Week(s) | green | Recur by weeks. Example: If Recur Interval is 3, the task recurs every 3 weeks. If you want a task to recur during a specific week of each month, use the "Nth Weekday of Month" option instead. |
| Month(s) | purple | Recur by months. Example: If Recur Interval is 2, the task recurs every other month. Tip: Use a Recur Interval of 3 to create a "Quarterly" recur schedule. |
| Month(s) on the First Weekday | blue | Recur by months, always on the first weekday of the month (Mon, Tues, Weds, Thurs, or Fri). |
| Month(s) on the Last Weekday | blue | Recur by months, always on the last weekday of the month (Mon, Tues, Weds, Thurs, or Fri). |
| Month(s) on the Last Day | blue | Recur by months, always on the last day of the month. Example: If Recur Interval is 2, and Due is December 31, Next Due will be February 28 (or 29 on a leap year). |
| Year(s) | blue | Recur by years. Example: If Recur Interval is 2, the task recurs every 2 years. |
| Nth Weekday of Month | blue | E.g. "3rd Thurs of the Month". (Weekend days work too). This option only works if Days property is set, and only when Days has a SINGLE value. For the example above, Recur Interval = 3, Days = Thursday. Set Recur Interval to 1 for first week of month, 5 for last week of month. |

### Days
| Property | Value |
|----------|-------|
| **ID** | `oP=@` |
| **Type** | `multi_select` |
| **Description** | Allows you to pick specific days of the week – e.g. M/W/F. Works in 2 scenarios: (1) Recur Unit = Day(s) and Recur Interval = 1. Allows for schedules like "M/W/F". (2) Recur Unit = Nth Weekday of Month and Days has ONE value. Allows for schedules like "Every 3rd Monday of the month". |

**Options:**

| Name | Color |
|------|-------|
| Monday | blue |
| Tuesday | blue |
| Wednesday | blue |
| Thursday | blue |
| Friday | blue |
| Saturday | purple |
| Sunday | purple |

---

## Relation Fields

### Project
| Property | Value |
|----------|-------|
| **ID** | `mvxY` |
| **Type** | `relation` |
| **Linked Database** | Projects (`22f49e36-383b-8157-a91e-df7acced5d74`) |
| **Synced Property** | Tasks (in Projects) |
| **Synced Property ID** | `\ceG` |
| **Description** | This Relation connects to the Projects database, allowing you to associate a project with your tasks. |

### People
| Property | Value |
|----------|-------|
| **ID** | `[TFr` |
| **Type** | `relation` |
| **Linked Database** | People (`22f49e36-383b-81ce-9f7d-fa0bdf7d7caa`) |
| **Synced Property** | Tasks (in People) |
| **Synced Property ID** | `mAzR` |
| **Description** | This relation property connects to the People database. You can use it to associate tasks with other people. For example, in the Delegated view of the Process dashboard, you can use this relation to note the person to whom you've delegated a task. |

### Sessions
| Property | Value |
|----------|-------|
| **ID** | `MKFa` |
| **Type** | `relation` |
| **Linked Database** | Work Sessions (`22f49e36-383b-81b7-8b8b-cb12da7b83f0`) |
| **Synced Property** | Tasks (in Work Sessions) |
| **Synced Property ID** | `;tfM` |
| **Description** | Work Sessions related to this Task. This Relation property connects to the Task Relation property in the Work Sessions database. |

### Parent Task
| Property | Value |
|----------|-------|
| **ID** | `~YD;` |
| **Type** | `relation` (self-referential) |
| **Linked Database** | Tasks (`22f49e36-383b-814f-a8d0-e553c1923507`) |
| **Synced Property** | Sub-Tasks |
| **Synced Property ID** | `\iwM` |
| **Description** | If the current page is a sub-task, its parent task page will be shown here. This property is a Relation which connects to another property inside this same All Tasks database. |

### Sub-Tasks
| Property | Value |
|----------|-------|
| **ID** | `\iwM` |
| **Type** | `relation` (self-referential) |
| **Linked Database** | Tasks (`22f49e36-383b-814f-a8d0-e553c1923507`) |
| **Synced Property** | Parent Task |
| **Synced Property ID** | `~YD;` |
| **Description** | If the current task page is a Parent Task, all of its sub-tasks will be shown here. This is a Relation property, which is connected to the Parent Task Relation property in this same All Tasks database. |

### Occurrences
| Property | Value |
|----------|-------|
| **ID** | `bxUe` |
| **Type** | `relation` (single property, one-way) |
| **Linked Database** | Tasks (`22f49e36-383b-814f-a8d0-e553c1923507`) |
| **Description** | Past, finished occurrences of a recurring task. This is part of Task History for recurring tasks. To enable it, unlock your Tasks database. Click the ⚡️ to access Automations, then de-activate Recurring Tasks (Simple), and activate Recurring Tasks (Advanced). |

---

## Rollup Fields

### Project Area
| Property | Value |
|----------|-------|
| **ID** | `G=Cx` |
| **Type** | `rollup` |
| **Source Relation** | Project (`mvxY`) |
| **Source Property** | Tag (`VeW}` in Projects) |
| **Function** | `show_original` |
| **Description** | If this task is related to a Project, this Rollup property shows the Project's Area (if it has one). |

### Parent Smart List
| Property | Value |
|----------|-------|
| **ID** | `OCkb` |
| **Type** | `rollup` |
| **Source Relation** | Parent Task (`~YD;`) |
| **Source Property** | Smart List (Formula) (`tsOC`) |
| **Function** | `show_original` |
| **Description** | If this task is a sub-task, this Rollup property gets the calculated Smart List from its parent task. |

### Parent Project
| Property | Value |
|----------|-------|
| **ID** | `` `iOL `` |
| **Type** | `rollup` |
| **Source Relation** | Parent Task (`~YD;`) |
| **Source Property** | Project (`mvxY`) |
| **Function** | `show_original` |
| **Description** | If this page is a sub-task, this Rollup property shows the Project of its parent task (if it has one). |

---

## Formula Fields

### Smart List (Formula)
| Property | Value |
|----------|-------|
| **ID** | `tsOC` |
| **Type** | `formula` |
| **Description** | This formula determines which Smart List (aka GTD list) a task is currently on. Used in the Process page. It takes into account the following properties: Due, Snooze, and Smart List. |

**Output:** One of: `Calendar`, `Do Next`, `Delegated`, `Snoozed`, `Someday`, `Inbox`

**Logic:**
1. If Due is set → `Calendar`
2. If Smart List is "Do Next" or "Delegated" → return that value
3. If Snooze is set → `Snoozed`
4. If Smart List is "Someday" → `Someday`
5. Else → `Inbox`

### Next Due
| Property | Value |
|----------|-------|
| **ID** | `|e_a` |
| **Type** | `formula` |
| **Description** | The "next due" date for the task if it is recurring. A date will show here once you have values set in the Due and Recur Interval properties. The date is calculated from the Due date, today's date, and the values in Recur Interval, Recur Unit, and Days. |

**Output:** Date (or empty if not recurring)

**Logic:** Complex calculation that handles all Recur Unit types, supports date ranges, and calculates the next occurrence based on current date vs. due date. Version 2.2.1.

### Due Timestamp
| Property | Value |
|----------|-------|
| **ID** | `tw_[` |
| **Type** | `formula` |
| **Description** | Used to aid in correctly sorting tasks and sub-tasks within Projects. If the task doesn't have a Due date set, this timestamp will be 100 years in the future. This simply keeps tasks/sub-tasks without a due date below tasks that have one. |

**Output:** Number (Unix timestamp)

### Due Stamp (Parent)
| Property | Value |
|----------|-------|
| **ID** | `QPD}` |
| **Type** | `formula` |
| **Description** | If a task is sub-task, this returns the Due Timestamp value of its parent task. Otherwise, it simply returns this task's own Due Timestamp value. This property is the highest-priority sorting criteria for Task views within Projects. It keeps sub-tasks beneath their parent tasks. |

**Output:** Number (Unix timestamp)

### Snooze (Parent)
| Property | Value |
|----------|-------|
| **ID** | `uwnM` |
| **Type** | `formula` |
| **Description** | If this task is a sub-task of a parent task that is Snoozed, this returns that parent task's Snooze date as a timestamp. Otherwise, it returns this task's own Snooze date as a timestamp. Aids in sorting sub-tasks beneath their parent tasks in Process → Snoozed. |

**Output:** Number (Unix timestamp)

### Wait (Parent)
| Property | Value |
|----------|-------|
| **ID** | `PcJ`` |
| **Type** | `formula` |
| **Description** | If this task is a sub-task of a parent task that has a Wait Date, this returns that parent task's Wait Date as a timestamp. Otherwise, it returns this task's own Wait Date as a timestamp. Aids in sorting sub-tasks beneath their parent tasks in Process → Delegated. |

**Output:** Number (Unix timestamp)

### Edited Stamp (Parent)
| Property | Value |
|----------|-------|
| **ID** | `^V[t` |
| **Type** | `formula` |
| **Description** | Used for sorting sub-tasks underneath their parent tasks in the Process → Task Intake view. If the task is a sub-task, this returns the last edited time of its parent as a timestamp. Otherwise, it returns this task's own last edited time as a timestamp. |

**Output:** Number (Unix timestamp)

### Sub-Task Sorter
| Property | Value |
|----------|-------|
| **ID** | `;wUV` |
| **Type** | `formula` |
| **Description** | Used in Projects, alongside Due Stamp (Parent), to ensure that sub-tasks are sorted correctly beneath their parent tasks. |

**Output:** String (format: `{taskStatus} - {subSeedName} - {subSeed}`)

**Logic:** Combines task status (1 for active, 2 for done), parent/task name (lowercased), and sub-task indicator (1 for parent, 2 for sub-task).

### Sub-Task Arrow
| Property | Value |
|----------|-------|
| **ID** | `_lRJ` |
| **Type** | `formula` |
| **Description** | Indents sub-tasks in List views. This template does not use Notion's native sub-items feature, as it can cause unexpected results and user confusion in this template's Projects database template. |

**Output:** `→` if has Parent Task, empty otherwise

### Project Active
| Property | Value |
|----------|-------|
| **ID** | `MIhc` |
| **Type** | `formula` |
| **Description** | This property shows whether this task's project is active (either Doing or Ongoing). Used for views that only show tasks within projects that are active – helpful for filtering out tasks in projects that are planned, but not yet in progress. |

**Output:** Boolean (`true`/`false`)

**Logic:** Checks if the task's project (directly or via parent) has status "Doing" or "Ongoing".

### My Day Label
| Property | Value |
|----------|-------|
| **ID** | `UJtW` |
| **Type** | `formula` |
| **Description** | This simple property just displays the text "My Day". It is used on the My Day page to label the My Day checkbox, making it visually distinct from the Status checkbox that is always shown to the left of task names. |

**Output:** `My Day` (constant string)

### Meta Labels
| Property | Value |
|----------|-------|
| **ID** | `eCzl` |
| **Type** | `formula` |
| **Description** | Used in List views to show if a task is recurring, and/or if it has unfinished sub-tasks. |

**Output:** String with emoji indicators:
- `🔁` — Task is recurring (has Next Due)
- `⏱️` — Currently being time-tracked

### Localization Key
| Property | Value |
|----------|-------|
| **ID** | `L@F{` |
| **Type** | `formula` |
| **Description** | This property allows you to localize your template. If you want to translate the option names in the Days, Recur Unit, and Status properties, you can do so and then change the arrays in this formula to the same values. This will allow formulas to keep working. |

**Output:** Array of arrays containing:
1. Weekday names: `["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]`
2. Recur unit names: `["Day(s)", "Week(s)", "Month(s)", "Year(s)", "Month(s) on the Last Day", "Month(s) on the First Weekday", "Month(s) on the Last Weekday", "Nth Weekday of Month"]`
3. Status names: `["To Do", "Doing", "Done"]`

---

## Time Tracking Fields

### Time Tracked (Mins)
| Property | Value |
|----------|-------|
| **ID** | `:TYL` |
| **Type** | `formula` |
| **Description** | The total number of minutes tracked on this task, across all Work Sessions related to it. |

**Output:** Number (sum of minutes from all related Sessions)

### Time Tracked
| Property | Value |
|----------|-------|
| **ID** | `DPTf` |
| **Type** | `formula` |
| **Description** | The total amount of time tracked on this task, formatted in HH:MM:SS as a string (seconds will always be zero). Uses the Time Tracked (Mins) property for the underlying number of minutes tracked. |

**Output:** String (format: `HH:MM:00`)

### Time Tracking Status
| Property | Value |
|----------|-------|
| **ID** | `;Rhr` |
| **Type** | `formula` |
| **Description** | The current time-tracking status of this task. Can be "Active Now", "Not Tracking", or "Done". Used to group tasks in the Time view within the Execute section of My Day. |

**Output:** One of: `Active Now`, `Not Tracking`, `Done`

**Logic:**
1. If Status is "Done" → `Done`
2. If any related Session has no end time → `Active Now`
3. Else → `Not Tracking`

### Current Session
| Property | Value |
|----------|-------|
| **ID** | `}A~s` |
| **Type** | `formula` |
| **Description** | The current active Work Session related to this task (if it is currently active and being tracked). |

**Output:** Relation (filtered list of Sessions with no end time)

---

## System & Metadata Fields

### Assignee
| Property | Value |
|----------|-------|
| **ID** | `mlUP` |
| **Type** | `people` |
| **Description** | Use this property to set assignees for each task. Note that Ultimate Brain is set up for individual use by default; to make this property useful, you'll want to create filtered views that only show tasks assigned to specific people. |

### Created By
| Property | Value |
|----------|-------|
| **ID** | `;xMN` |
| **Type** | `created_by` |
| **Description** | The user (or integration) who created the task. |

### Edited By
| Property | Value |
|----------|-------|
| **ID** | `wCjz` |
| **Type** | `last_edited_by` |
| **Description** | The user (or integration) who last edited the task. |

---

## Button Fields

### Start
| Property | Value |
|----------|-------|
| **ID** | `EdOH` |
| **Type** | `button` |
| **Description** | Starts a new Work Session for this task. Also ends any currently-active Work Session that is being tracked for you. |

### End
| Property | Value |
|----------|-------|
| **ID** | `Zg<s` |
| **Type** | `button` |
| **Description** | Ends the current Work Session related to this task, if one is active. |

---

## Related Databases

| Database | ID | Relation Property |
|----------|-------|-------------------|
| Projects | `22f49e36-383b-8157-a91e-df7acced5d74` | Project |
| People | `22f49e36-383b-81ce-9f7d-fa0bdf7d7caa` | People |
| Work Sessions | `22f49e36-383b-81b7-8b8b-cb12da7b83f0` | Sessions |
| Tasks (self) | `22f49e36-383b-814f-a8d0-e553c1923507` | Parent Task, Sub-Tasks, Occurrences |

---

## GTD (Getting Things Done) Integration

The Tasks database implements GTD methodology through the **Smart List** system:

| List | Trigger | Description |
|------|---------|-------------|
| **Calendar** | Due date is set | Tasks with specific due dates |
| **Do Next** | Smart List = "Do Next" | Next actions to work on |
| **Delegated** | Smart List = "Delegated" | Tasks waiting on others |
| **Snoozed** | Snooze date is set (no Due) | Deferred tasks |
| **Someday** | Smart List = "Someday" | Maybe/someday tasks |
| **Inbox** | No other condition met | Uncategorized tasks to process |

---

## Property ID Quick Reference

| Property | ID |
|----------|-----|
| Name | `title` |
| Description | `R{z=` |
| Status | `mO?c` |
| Priority | `y>HY` |
| Due | `scmA` |
| Snooze | `UAOD` |
| Completed | `YSF]` |
| Wait Date | `vE;N` |
| My Day | `obeX` |
| Smart List | `Mt_P` |
| Energy | `[h^f` |
| Location | `\yCP` |
| P/I | `f|ps` |
| Labels | `:pw~` |
| Days | `oP=@` |
| Recur Interval | `EQ=^` |
| Recur Unit | `Buni` |
| Project | `mvxY` |
| People | `[TFr` |
| Sessions | `MKFa` |
| Parent Task | `~YD;` |
| Sub-Tasks | `\iwM` |
| Occurrences | `bxUe` |
| Assignee | `mlUP` |
| Created | `wnds` |
| Edited | `N]DG` |
| Created By | `;xMN` |
| Edited By | `wCjz` |
| Shopping List | `{XH:` |
| Start (button) | `EdOH` |
| End (button) | `Zg<s` |

---

## Notes for LyfeHub Implementation

1. **Sub-task system** is relation-based (Parent Task ↔ Sub-Tasks), not native Notion sub-items
2. **Smart List is a formula**, not stored directly — calculate at query time
3. **Time tracking** uses a separate Work Sessions database with Start/End buttons
4. **Recurring tasks** have sophisticated logic in Next Due formula (v2.2.1)
5. **Localization** is built-in via Localization Key formula arrays
6. **Project Active** checks parent task's project if task is a sub-task
7. **Sorting formulas** (Due Stamp Parent, Sub-Task Sorter, etc.) are critical for proper view ordering
