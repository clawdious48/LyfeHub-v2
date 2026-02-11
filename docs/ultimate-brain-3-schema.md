# Ultimate Brain 3.0 - Database Schema Reference

*Extracted from Jake's Notion workspace on 2026-02-09*

---

## Core Databases

### 1. TASKS (Main productivity hub)

**Key Properties:**
| Property | Type | Purpose |
|----------|------|---------|
| Name | title | Task name |
| Status | status | To Do → Doing → Done |
| Priority | status | Low / Medium / High |
| Due | date | Due date |
| My Day | checkbox | Flag for today's focus |
| Snooze | date | Hide until this date |
| Wait Date | date | Waiting on someone/something |
| Completed | date | When marked done |
| Description | rich_text | Task details |

**Categorization:**
| Property | Type | Options |
|----------|------|---------|
| Energy | select | High, Low |
| Location | select | Home, Office, Errand |
| P/I | select | Process, Immersive |
| Labels | multi_select | Custom tags |
| Days | multi_select | For day-specific recurring |

**Recurring Tasks:**
| Property | Type | Purpose |
|----------|------|---------|
| Recur Unit | select | Day(s), Week(s), Month(s), Year(s), + special patterns |
| Recur Interval | number | Every N units |
| Occurrences | relation | Links to generated instances |
| Parent Task | relation | Points to canonical recurring task |
| Next Due | formula | Calculates next occurrence |

**Relations:**
| Property | Type | Links to |
|----------|------|----------|
| Project | relation | Projects database |
| Sub-Tasks | relation | Self-referential for subtasks |
| People | relation | People database |
| Sessions | relation | Work Sessions (time tracking) |

**Time Tracking:**
| Property | Type | Purpose |
|----------|------|---------|
| Start | button | Start time tracking |
| End | button | Stop time tracking |
| Time Tracked | formula | Formatted duration |
| Time Tracked (Mins) | formula | Raw minutes |
| Current Session | formula | Active session indicator |

**Computed/Formula Fields:**
- Smart List (Formula) - Auto-categorizes: Inbox, Calendar, Snoozed, etc.
- Due Timestamp - For sorting
- Project Active - Inherited from project status
- Meta Labels - Visual indicators (🔁 for recurring)

---

### 2. PROJECTS

**Key Properties:**
| Property | Type | Purpose |
|----------|------|---------|
| Name | title | Project name |
| Status | status | Planned → Doing → Done (+ On Hold, Ongoing) |
| Target Deadline | date | Goal completion date |
| Completed | date | Actual completion |
| Archived | checkbox | Hide from active views |
| Review Notes | rich_text | Periodic review content |

**Relations:**
| Property | Type | Links to |
|----------|------|----------|
| Tasks | relation | All project tasks |
| Notes | relation | Related notes |
| Goal | relation | Parent goal |
| Tag | relation | Category tags |
| People | relation | Collaborators |
| Pulled Tags | relation | Tags from notes |
| Pulled Notes | relation | Notes via tags |

**Computed:**
- Progress - % of tasks complete
- Time Tracked (Mins) - Sum from tasks
- Latest Activity - Most recent update
- This Quarter / This Year - Date filters

---

### 3. NOTES (Knowledge base / PKM)

**Key Properties:**
| Property | Type | Purpose |
|----------|------|---------|
| Name | title | Note title |
| Type | select | Note classification |
| Note Date | date | When created/relevant |
| Review Date | date | For spaced review |
| URL | url | Source link |
| Image | files | Cover/thumbnail |
| Favorite | checkbox | Pin important notes |
| Archived | checkbox | Hide from views |

**Relations:**
| Property | Type | Links to |
|----------|------|----------|
| Project | relation | Related project |
| Tag | relation | Topic tags |
| People | relation | People mentioned |
| Pulls | relation | Linked/referenced notes |

**Computed:**
- URL Base / URL Icon - Extract domain info
- Duration (Seconds/formatted) - For audio/video notes
- Root Tag - Top-level category via rollup

---

### 4. PEOPLE (CRM / Contacts)

**Key Properties:**
| Property | Type | Purpose |
|----------|------|---------|
| Full Name | title | Display name |
| Surname | rich_text | For sorting (Last, First) |
| Email | email | Primary email |
| Main/Claims Email | email | Secondary/work email |
| Phone | phone_number | Contact number |
| Title | rich_text | Job title |
| Company | multi_select | Organizations |
| Industry | select | Work sector |
| Location | rich_text | City/region |
| Birthday | date | For reminders |

**Social:**
- Website, LinkedIn, Twitter/X, Instagram (all url type)

**Relationship Tracking:**
| Property | Type | Purpose |
|----------|------|---------|
| Relationship | multi_select | Friend, Colleague, Client, etc. |
| How Met | rich_text | Origin story |
| Last Check-In | date | Previous contact |
| Check-In | date | Next scheduled |
| Interests | multi_select | Topics they care about |
| Pipeline Status | status | For sales/networking |

**Relations:**
- Tags, Notes, Tasks, Projects (all relation type)

---

### 5. GOALS

**Properties:**
| Property | Type | Purpose |
|----------|------|---------|
| Name | title | Goal statement |
| Status | status | Progress state |
| Goal Set | date | When defined |
| Target Deadline | date | Aim to achieve by |
| Achieved | date | Actual completion |
| Archived | checkbox | Hide completed |

**Relations:**
- Milestones - Breakdown into steps
- Projects - Supporting projects
- Tag - Category

**Computed:**
- Progress - % complete via milestones
- This Quarter / This Year - Filters

---

### 6. MILESTONES

Simple breakdown of goals:
- Name (title)
- Goal (relation)
- Target Deadline (date)
- Date Completed (date)
- Goal Area (rollup from Goal)

---

### 7. TAGS (Hierarchical categorization)

**Properties:**
| Property | Type | Purpose |
|----------|------|---------|
| Name | title | Tag name |
| Type | status | Category type |
| Parent Tag | relation | For hierarchy |
| Sub-Tags | relation | Children |
| URL | url | Reference link |
| Date | date | For time-based tags |
| Favorite | checkbox | Quick access |
| Archived | checkbox | Hide inactive |

**Relations:**
- Notes, Projects, Goals, People, Pulls (all relation)

**Computed:**
- Note Count, Latest Note, Latest Activity, Tag Projects

---

### 8. WORK SESSIONS (Time Tracking)

**Properties:**
| Property | Type | Purpose |
|----------|------|---------|
| Name | title | Session label |
| Start | date | Begin timestamp |
| End | date | End timestamp |
| Tasks | relation | What was worked on |
| Team Member | people | Who logged it |
| End Session | button | Stop tracking |

**Computed:**
- Duration (Mins) / Duration (formatted)
- Start/End - Display format
- Project - Via task rollup

---

## Lifestyle Databases

### 9. BOOKS

| Property | Type | Purpose |
|----------|------|---------|
| Title | title | Book name |
| Author | rich_text | Writer |
| Status | status | Reading progress |
| Pages | number | Total pages |
| Date Started / Finished | date | Reading dates |
| Rating | select | Your rating |
| Description | rich_text | Summary/notes |
| Genres | relation | Categories |
| Logs | relation | Reading sessions |
| Read Next | checkbox | Priority queue |
| Owned Formats | multi_select | Physical, Kindle, etc. |
| Image | files | Cover |

### 10. READING LOG

Session tracking for books:
- Book (relation), Log Date, Start/End Page
- Pages Read (formula), Details (rich_text)

### 11. GENRES

Book categorization with relation to Books.

### 12. MEAL PLANNER

| Property | Type | Purpose |
|----------|------|---------|
| Name | title | Meal label |
| Date | date | When planned |
| Meal | status | Breakfast/Lunch/Dinner |
| Recipes | relation | What to cook |
| Time Est. | formula | Cooking time |
| Favorite | checkbox | Repeat meals |

### 13. RECIPES

| Property | Type | Purpose |
|----------|------|---------|
| Name | title | Recipe name |
| Prep Time / Cook Time | number | In minutes |
| Servings | number | Portions |
| URL | url | Source |
| Tags | relation | Categories |
| Meal Time | multi_select | Breakfast/Lunch/Dinner |
| Favorite | checkbox | Go-to recipes |
| Inbox | checkbox | To try |
| Chef Name | rich_text | Attribution |

### 14. RECIPE TAGS

Categorization for recipes.

---

## Key Design Patterns

### 1. **Recurring Task Pattern**
- Canonical task has `Recur Unit` + `Recur Interval`
- System generates instances linked via `Occurrences` / `Parent Task`
- Each instance gets its own Due date, can be completed independently
- `Next Due` formula calculates upcoming occurrence

### 2. **Smart Lists (Task Views)**
Tasks auto-sort into views based on formulas:
- **Inbox** - No due date, not snoozed
- **Calendar** - Has due date
- **Snoozed** - Hidden until snooze date
- **My Day** - Flagged for today

### 3. **Time Tracking**
- Work Sessions link to Tasks
- Button properties trigger automations
- Durations roll up to Projects

### 4. **Hierarchical Tags**
- Parent/Sub-Tag relations create tree structure
- Notes and Projects share tags
- Rollups pull related content across databases

### 5. **Project-Centric Workflow**
Projects are the hub connecting:
- Tasks (what to do)
- Notes (knowledge)
- Goals (why it matters)
- People (who's involved)
- Tags (categorization)

### 6. **Two-Date Pattern for Tasks**
- `Due` - When it's due
- `Snooze` - When to start showing it
- `Wait Date` - Blocked on external dependency
- `Completed` - When finished (not just a checkbox)

---

## Formulas Worth Noting

- **Next Due** - Complex recurring date calculation
- **Smart List (Formula)** - Auto-categorization logic
- **Progress** - Task completion percentage
- **Meta Labels** - Emoji indicators (🔁 for recurring)
- **Time Tracked** - HH:MM:SS formatting

---

*This schema powers Jake's productivity system and informs LyfeHub development.*
