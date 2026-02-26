# Ultimate Brain 3.0 — Database Audit & LyfeHub Mapping

This document captures the complete database structure from Jake's Notion UB3 setup,
including all properties, types, and relationships. This serves as the blueprint for
understanding what LyfeHub needs to support.

---

## Dashboard Structure (Lyfe OS Main Page)

The main dashboard is a single scrolling page with three zones:

### Zone 1: Action Bar (Top — 3 columns)
| Quick Action | Advanced | Common |
|---|---|---|
| New Note | Process (GTD) | Learning Center |
| New Task | My Day | Quick Capture |
| New Project | My Week | Tasks |
| | My Year | Projects |
| | People | Tags |
| | Books | Notes |
| | Recipes | Goals |
| | | Archive |

**Key insight:** Quick Action = create new stuff. Advanced = workflow views (time-scoped). Common = navigate to full database views.

### Zone 2: PARA Categories (Middle)
- **Resources** — left column, list view grouped by type (Resource 26 items, Entity 5 items)
- **Areas** — right column, collapsible toggle
- **Recurring Tasks** — embedded table view (Name, Recur Unit, Due, Next Due, Project columns)

### Zone 3: Database Toggles (Bottom)
Collapsible sections for:
- **Tasks** (toggle)
- **Projects** (toggle)
- **Notes** (toggle)
- **External Tools** (toggle)

### Footer
- Databases & Components (link to raw databases)
- Dashboard Component Library

---

## Core Databases

### 1. TASKS

**Description:** Primary source database for all tasks. All Task Manager views throughout
UB3 are linked views with unique filters, sorts, and display criteria.

**Views available:** Active, Complete, Calendar, Recurring (Source)

**Complete Property List:**

| # | Property | Type | Notes |
|---|----------|------|-------|
| 1 | Name | Title (text) | Task name |
| 2 | Status | Status | To Do → Doing → Done |
| 3 | Due | Date | Due date |
| 4 | Project | Relation → Projects | Links task to project |
| 5 | Parent Task | Relation → Tasks (self) | For sub-task hierarchy |
| 6 | Next Due | Date | For recurring — next occurrence |
| 7 | Recur Interval | Number | How often (1, 2, 3...) |
| 8 | Recur Unit | Select | Day(s), Week(s), Month(s), Year(s) |
| 9 | Days | Multi-select | Which days (Monday, Tuesday, etc.) |
| 10 | Priority | Select | Low, Medium, High |
| 11 | My Day | Checkbox | Flagged for today |
| 12 | Labels | Multi-select | User-defined tags/labels |
| 13 | Smart List | Formula | Auto-categorizes: Inbox, Today, Overdue, etc. |
| 14 | Due Stamp (Parent) | Rollup | Pulls due date from parent task |
| 15 | Assignee | Person | Notion user assignment |
| 16 | Sub-Tasks | Relation → Tasks (self) | Reverse of Parent Task |
| 17 | Edited | Last edited time | Auto-tracked |
| 18 | Edited By | Last edited by | Auto-tracked |
| 19 | Created | Created time | Auto-tracked |
| 20 | Created By | Created by | Auto-tracked |
| 21 | Description | Text | Task description/notes |
| 22 | Due Timestamp | Formula | Numeric due date for sorting |
| 23 | Edited Stamp (Parent) | Rollup | Edited time from parent |
| 24 | Localization Key | Formula | Internal UB3 helper |
| 25 | Meta Labels | Formula | Shows if recurring / has unfinished sub-tasks |
| 26 | Parent Project | Rollup | Project from parent task |
| 27 | Parent Smart List | Rollup | Smart list from parent |
| 28 | Project Area | Rollup | Area/tag from linked project |
| 29 | Smart List (Formula) | Formula | Duplicate/variant of Smart List |
| 30 | Snooze | Date | Hide until this date |
| 31 | Snooze (Parent) | Rollup | Snooze date from parent |
| 32 | Sub-Task Arrow | Formula | Indents sub-tasks in list views |
| 33 | Sub-Task Sorter | Formula | Ordering helper for sub-tasks |
| 34 | Wait (Parent) | Rollup | Wait date from parent |
| 35 | Wait Date | Date | Blocked/waiting until date |
| 36 | My Day Label | Formula | Display label for My Day |
| 37 | People | Relation → People | Linked contacts |
| 38 | Project Active | Rollup | Whether linked project is active |
| 39 | Completed | Date | When task was completed |
| 40 | Current Session | Relation → Work Sessions | Active time tracking session |
| 41 | End | Date | End date (for date ranges) |
| 42 | Energy | Select | High, Low — energy level needed |
| 43 | Location | Select | Home, Office, Errand, etc. |
| 44 | Occurrences | Number | Recurrence count |
| 45 | P/I | Select | Process vs Immersive task type |
| 46 | Sessions | Relation → Work Sessions | All time tracking sessions |
| 47 | Shopping List | Checkbox | Flagged as shopping item |
| 48 | Start | Date | Start date |
| 49 | Time Tracked | Rollup | Total time from sessions |

**Key Relationships:**
- Tasks → Projects (many-to-one)
- Tasks → Tasks (self-referential: Parent/Sub-tasks)
- Tasks → People (many-to-many)
- Tasks → Work Sessions (one-to-many)

**Smart List Categories (auto-computed):**
- Inbox (no due date, unprocessed)
- Today (due today)
- Overdue (past due)
- Week (due this week)
- Month (due this month)
- Scheduled (has future due date)
- No Due (no date set)
- Recurring (has recurrence settings)
- Done (completed)

---

### 2. PROJECTS

**Description:** Primary source database for all projects. Linked views used
throughout the Project views in UB3.

**Views available:** Unarchived, Archived, Calendar, List

**Complete Property List:**

| # | Property | Type | Notes |
|---|----------|------|-------|
| 1 | Name | Title (text) | Project name |
| 2 | Status | Status | Planned → Doing → Done (+ Ongoing) |
| 3 | Target Deadline | Date | When project should be done |
| 4 | Progress | Formula | % tasks completed (with progress bar) |
| 5 | Tag | Relation → Tags | Area/category (PARA link) |
| 6 | Goal | Relation → Goals | Parent goal |
| 7 | Archived | Checkbox | Soft archive |
| 8 | Completed | Date | When project was completed |
| 9 | Created | Created time | Auto-tracked |
| 10 | Edited | Last edited time | Auto-tracked |
| 11 | Goal Tag | Rollup | Tag from linked goal |
| 12 | Latest Activity | Formula | Most recent edit timestamp |
| 13 | Meta | Formula | Active/overdue task counts |
| 14 | Notes | Relation → Notes | Linked notes |
| 15 | Pulled Notes | Relation → Notes | Notes that reference this project |
| 16 | Pulled Tags | Rollup | Tags from pulled notes |
| 17 | Quarter | Formula | Which quarter deadline falls in |
| 18 | Review Notes | Text | Project review/retrospective |
| 19 | Tasks | Relation → Tasks | All tasks in this project |
| 20 | This Quarter | Formula | Boolean — deadline in current quarter |
| 21 | This Year | Formula | Boolean — deadline in current year |
| 22 | Localization Key | Formula | Internal UB3 helper |
| 23 | People | Relation → People | Linked contacts |
| 24 | Time Tracked | Rollup | Total time from task sessions |
| 25 | Time Tracked (Mins) | Formula | Total time in minutes |

**Key Relationships:**
- Projects → Tags (many-to-one, PARA categorization)
- Projects → Goals (many-to-one)
- Projects → Tasks (one-to-many)
- Projects → Notes (many-to-many, bidirectional)
- Projects → People (many-to-many)

---

### 3. WORK SESSIONS

**Description:** Time tracking records. Each session is a start/stop timer
linked to a task.

**Views available:** All Sessions, Calendar

**Complete Property List:**

| # | Property | Type | Notes |
|---|----------|------|-------|
| 1 | Name | Title (text) | Session name (auto-generated) |
| 2 | Duration | Timer | Built-in Notion timer |
| 3 | Start | Date | Session start time |
| 4 | End | Date | Session end time |
| 5 | Tasks | Relation → Tasks | Which task this session is for |
| 6 | Project | Rollup | Project from linked task |
| 7 | Team Member | Person | Who did the work |
| 8 | Start/End | Date | Date range display |
| 9 | Duration (Mins) | Formula | Duration in minutes |
| 10 | End Session | Button | Stops the timer |

**Key Relationships:**
- Work Sessions → Tasks (many-to-one)

---

### 4. NOTES

**Description:** Primary knowledge base. All notes, journal entries, web clips,
references, etc. The "second brain" storage.

**Views available:** Unarchived, Archived, Review Calendar, Journal Calendar, Meeting Calendar

**Complete Property List:**

| # | Property | Type | Notes |
|---|----------|------|-------|
| 1 | Name | Title (text) | Note title |
| 2 | Favorite | Checkbox | Star/favorite flag |
| 3 | Tag | Relation → Tags | PARA categorization |
| 4 | Project | Relation → Projects | Direct project link |
| 5 | URL | URL | Source URL for web clips |
| 6 | Type | Select | Quote, Reference, Journal, Idea, Voice, etc. |
| 7 | Updated | Last edited time | Auto-tracked |
| 8 | People | Relation → People | Linked contacts |
| 9 | URL Base | Formula | Extracted domain from URL |
| 10 | URL Icon | Formula | Favicon/icon from URL domain |
| 11 | AI Cost | Number | Cost tracking for AI-generated content |
| 12 | Archived | Checkbox | Soft archive |
| 13 | Created | Created time | Auto-tracked |
| 14 | Duration | Timer | For voice notes — recording length |
| 15 | Duration (Seconds) | Number | Duration in seconds |
| 16 | Image | Files & media | Attached image |
| 17 | Project Archived | Rollup | Whether linked project is archived |
| 18 | Project Tag | Rollup | Tag from linked project |
| 19 | Pulls | Relation → Projects | Projects that pull this note |
| 20 | Tag Pulls | Rollup | Tags from pulled projects |
| 21 | Review Date | Date | When to review this note |
| 22 | Root Tag | Rollup | Parent tag of linked tag |
| 23 | Updated (Short) | Formula | Short formatted date |
| 24 | Note Date | Date | Manual date (for journals) |
| 25 | Project People | Rollup | People from linked project |
| 26 | Tag People | Rollup | People from linked tag |

**Key Relationships:**
- Notes → Tags (many-to-one)
- Notes → Projects (many-to-one direct + many-to-many via Pulls)
- Notes → People (many-to-many)

---

### 5. TAGS (PARA System)

**Description:** The organizational backbone. Tags implement PARA — Areas,
Resources, and Entities. Hierarchical via Parent/Sub-Tag relations.

**Views available:** Active, Archived, Calendar, House Areas, Yard Areas

**Complete Property List:**

| # | Property | Type | Notes |
|---|----------|------|-------|
| 1 | Name | Title (text) | Tag/area name |
| 2 | Favorite | Checkbox | Star/favorite |
| 3 | Type | Status | Area, Resource, Entity |
| 4 | Tag Projects | Rollup | Active project count |
| 5 | Latest Note | Rollup | Most recent linked note |
| 6 | Note Count | Rollup | Total linked notes |
| 7 | Parent Tag | Relation → Tags (self) | Hierarchy parent |
| 8 | People | Relation → People | Linked contacts |
| 9 | Latest Activity | Rollup | Most recent edit across linked items |
| 10 | Goals | Relation → Goals | Linked goals |
| 11 | Notes | Relation → Notes | All linked notes |
| 12 | Projects | Relation → Projects | All linked projects |
| 13 | Pulls | Relation → Projects | Projects that pull this tag |
| 14 | Sub-Tags | Relation → Tags (self) | Child tags |
| 15 | Archived | Checkbox | Soft archive |
| 16 | URL | URL | Reference URL |
| 17 | Date | Date | Reference date |

**Key Relationships:**
- Tags → Tags (self-referential: Parent/Sub-Tags)
- Tags → Projects (one-to-many)
- Tags → Notes (one-to-many)
- Tags → Goals (one-to-many)
- Tags → People (many-to-many)

**PARA Mapping:**
- Type = "Area" → ongoing responsibility (Home, Work, Health, Jake, etc.)
- Type = "Resource" → topic/interest (AI Agents, Insurance, Gaming, etc.)
- Type = "Entity" → meta-collection (Cheats, Xactimate, YouTube Music playlists)

---

### 6. GOALS

**Description:** Long-term aspirations that break down into projects and milestones.

**Views available:** Unarchived, Archived, Calendar

**Complete Property List:**

| # | Property | Type | Notes |
|---|----------|------|-------|
| 1 | Name | Title (text) | Goal name |
| 2 | Progress | Formula | % milestones completed |
| 3 | Target Deadline | Date | When to achieve by |
| 4 | Goal Set | Date | When goal was created |
| 5 | Achieved | Date | When goal was achieved |
| 6 | Tag | Relation → Tags | PARA area categorization |
| 7 | Archived | Checkbox | Soft archive |
| 8 | Milestones | Relation → Milestones | Breakdown steps |
| 9 | Projects | Relation → Projects | Linked projects |
| 10 | This Quarter | Formula | Boolean — deadline in current quarter |
| 11 | This Year | Formula | Boolean — deadline in current year |
| 12 | Updated | Last edited time | Auto-tracked |
| 13 | Latest Activity | Formula | Most recent activity |
| 14 | Status | Status | Dream → Active → Achieved |

**Key Relationships:**
- Goals → Tags (many-to-one)
- Goals → Milestones (one-to-many)
- Goals → Projects (one-to-many)

---

### 7. MILESTONES

**Description:** Simple stepping stones toward goals. Lightweight — just name,
goal link, and dates.

**Views available:** Uncompleted, Completed, Calendar

**Complete Property List:**

| # | Property | Type | Notes |
|---|----------|------|-------|
| 1 | Name | Title (text) | Milestone name |
| 2 | Goal | Relation → Goals | Parent goal |
| 3 | Date Completed | Date | When milestone was reached |
| 4 | Target Deadline | Date | When to complete by |
| 5 | Goal Area | Rollup | Area tag from linked goal |

**Key Relationships:**
- Milestones → Goals (many-to-one)

---

### 8. PEOPLE

**Description:** Personal CRM / contacts database. Tracks relationships,
contact info, social profiles, and interaction history.

**Views available:** All Contacts, Birthdays, Upcoming Check-Ins, Last Check-In

**Complete Property List:**

| # | Property | Type | Notes |
|---|----------|------|-------|
| 1 | Full Name | Title (text) | Contact name |
| 2 | Relationship | Multi-select | Family, Friend, Teacher, Client, Business Partner, Organization, School, etc. |
| 3 | Email | Email | Contact email |
| 4 | Phone | Phone | Contact phone |
| 5 | Location | Text | Address/city |
| 6 | LinkedIn | URL | LinkedIn profile |
| 7 | Instagram | URL | Instagram profile |
| 8 | Twitter/X | URL | Twitter/X profile |
| 9 | Website | URL | Personal/company website |
| 10 | Company | Text | Company/organization name |
| 11 | Industry | Text | Industry/field |
| 12 | Main/Claims Email | Email | Secondary email (insurance claims) |
| 13 | Title | Text | Job title |
| 14 | Birthday | Date | Birthday |
| 15 | Check-In | Date | Next scheduled check-in |
| 16 | Last Check-In | Date | Last contact date |
| 17 | Interests | Text | Hobbies, interests |
| 18 | Next Birthday | Formula | Upcoming birthday calculation |
| 19 | Pipeline Status | Status | For sales/networking pipeline |
| 20 | Surname | Text | Last name (separate field) |
| 21 | Tags | Relation → Tags | Area/category links |
| 22 | Name (Last, First) | Formula | Formatted name for sorting |
| 23 | Edited | Last edited time | Auto-tracked |
| 24 | Created | Created time | Auto-tracked |
| 25 | Notes | Relation → Notes | Linked notes |
| 26 | Projects | Relation → Projects | Linked projects |
| 27 | Tasks | Relation → Tasks | Delegated/assigned tasks |
| 28 | How Met | Text | How you met this person |

**Key Relationships:**
- People → Tags (many-to-many)
- People → Notes (many-to-many)
- People → Projects (many-to-many)
- People → Tasks (many-to-many)

---

## Secondary Databases

### Book Tracker
- Books
- Reading Log
- Genres

### Recipes
- Recipes
- Recipe Tags
- Meal Planner

---

## Key UB3 Patterns

### Everything is a database view
The "Tasks" page, "My Day" page, "Notes" page — they're all just different
filtered/sorted views of the same underlying databases. The databases are the
foundation; everything else is presentation.

### Dashboard = hub of embedded views
The main dashboard pulls compact views from multiple databases onto one page.
It's not a separate data store — it's a composition layer.

### PARA organizes via Tags
Tags aren't just labels — they ARE the PARA system:
- Areas = tags of type "Area"
- Resources = tags of type "Resource"
- Entities = tags of type "Entity"
Projects and Archive are handled by their own databases/status fields.

### Relationships connect everything
Tasks → Projects → Goals (hierarchy)
Tasks → People (delegation)
Tasks → Work Sessions (time tracking)
Notes → Projects, People, Tags (knowledge linking)
Everything cross-references.

### Formulas power smart categorization
Smart Lists, Meta Labels, Sub-Task handling — all computed properties that
auto-categorize data so the user doesn't have to manually sort.

---

## Record Creation Experience ("New" Button Flows)

This section documents how each database handles creating a new record. The UX
pattern is consistent but the content varies per database.

### Universal Pattern
- Clicking "New" opens a **right-side panel** (~40% width), NOT a centered modal
- Panel shows: Title → Quick Properties → Relations → Comments → Templates/Body
- Only 3-5 "hero" properties are surfaced on creation — the rest hidden behind "..."
- Templates offer pre-configured page layouts for common record types
- The record is created instantly (auto-saved) — no "Submit" button
- Panel can be expanded to full-page view via expand icon

### TASKS — New Entry
**Quick properties shown:** Status (To Do), Project, Due, My Day
**Relations:** Add Sub-Tasks, Add Parent Task, Add People
**Templates:**
- Task with Sub-Tasks
- Packing List
- Recurring Task w/ History
- Time-Tracked Task
- Empty

**Key insight:** Only 4 of 49 properties shown at creation. This is the "capture
in 15 seconds" philosophy — type a name, maybe set a project, and you're done.
Everything else can be set later.

---

### PROJECTS — New Entry
**Quick properties shown:** Status (Planned), Target Deadline, Progress, Tag
**Relations:** Add People, Add Goal
**Templates:** No template picker — goes straight to a workspace page
**Page body contains:**
- Nav links (Nav | Projects | Dashboard)
- **Embedded Tasks view** — List/Board/Calendar tabs, grouped by status, with "New" to create tasks inline
- **Embedded Notes view** — filtered to this project, with "New page" to create notes inline

**Key insight:** A Project isn't a form — it's a **workspace hub**. You can create
the project AND immediately start adding tasks and notes to it. The embedded views
make the project page the central workspace for that effort.

---

### NOTES — New Entry
**Quick properties shown:** Tag, URL, Favorite, Type
**Relations:** Add Project, Add People
**Templates:**
- Journal: [Date]
- Week Journal: [Date]
- Meeting: [Date]
- Note with Tasks
- Empty

**Key insight:** Templates are the differentiator here. A "Journal" template
probably sets Type=Journal and inserts a date-stamped heading. "Meeting" probably
has attendee fields and action items. "Note with Tasks" embeds a task view.
The template system lets one database serve many content types.

---

### TAGS (PARA) — New Entry
**Quick properties shown:** Type (Resource/Area/Entity), Favorite, Note Count
**Relations:** Add Sub-Tags, Add Projects, Add Goals, Add People
**Templates:**
- Area
- Resource
- Entity
- Empty

**Key insight:** Templates map 1:1 to PARA types. Choosing "Area" vs "Resource"
sets the Type property and likely pre-configures the page layout with relevant
embedded views (e.g., Area template might embed Projects and Notes; Resource
template might focus on Notes only).

---

### GOALS — New Entry
**Quick properties shown:** Status (Dream), Tag, Progress
**Relations:** (none surfaced separately — embedded in page body)
**Page body contains:**
- Nav links (Nav | Goals | Dashboard)
- Goal Overview callout with "Additional Details" toggle
- **Embedded Milestones table** — Name, Target Deadline, Date Completed
- Journal section (collapsible)
- **Embedded Goal Projects view** — Active/Board tabs

**Key insight:** Like Projects, Goals are workspace hubs. You create a goal and
immediately start adding milestones and linking projects. The Goal Overview
callout is a structured prompt — it guides you to think about what the goal
means before you start breaking it down.

---

### MILESTONES — New Entry
**Quick properties shown:** Goal (relation), Date Completed, Target Deadline, Goal Area (rollup)
**No templates** — simple record, no page body
**Key insight:** Milestones are the simplest entity. Just a name, a goal link,
and dates. They exist to be checked off, not to be hubs.

---

### PEOPLE — New Entry
**Quick properties shown:** NONE in property bar — instead shows "View details" link
**Relations:** Add Projects, Add Notes, Add Tasks, Add Tags
**Page body contains:**
- **Tabbed embedded views** — Projects, Tasks, Notes, Meetings, +1 more
- Quick Notes section (free-form)
- Gift Ideas section (free-form)

**Key insight:** People is the most "CRM-like" creation flow. No property bar
at all on the side panel — instead it's all about the relationship hub. The
"View details" link presumably opens the full contact form with phone, email,
social profiles etc. But the default creation experience is about connections
first, contact info second. And the human-touch sections (Quick Notes, Gift
Ideas) make this feel personal, not corporate.

---

## Creation UX Patterns for LyfeHub

### What UB3 gets right
1. **Minimal friction on create** — 3-5 properties max, not 20-field forms
2. **Templates for common patterns** — don't make the user build from scratch every time
3. **Hub pages for container entities** — Projects, Goals, People aren't just records, they're workspaces with embedded views
4. **Instant creation** — record exists the moment you click New, no Submit button
5. **Side panel by default** — doesn't navigate you away from the table view, you can see your data while creating
6. **Relations as first-class citizens** — "Add Sub-Tasks", "Add People" etc. are prominent, not buried in a property list

### What LyfeHub can do better
1. **Smart defaults** — pre-fill based on context (if you're on the "Evening Routine" project, new tasks should auto-link)
2. **Keyboard-first capture** — type a task name and hit Enter, it's done. No mouse required.
3. **Quick capture vs. full create** — two modes: lightning-fast "just get it down" and "I want to fill in details now"
4. **Mobile-optimized creation** — Notion's side panel doesn't work on mobile. LyfeHub needs a bottom sheet or full-screen modal
5. **Consistent property bar layout** — same position, same pattern, every entity type. Muscle memory matters for ADHD.
6. **No orphans** — prompt to categorize uncategorized items, but don't block creation on it
