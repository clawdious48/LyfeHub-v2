# Personal Productivity App - Feature Roadmap

> Working document for brainstorming and planning features.
> Last updated: 2026-01-27

---

## 🎯 Vision

**What this is becoming:** A full personal productivity app - not just a kanban board.

**Core pillars (in order of focus):**
1. Projects
2. Tasks
3. Calendar
4. PKM (Personal Knowledge Management)

**Design principles:**
- **Maintain the aesthetic** - Neon glassmorphic styling across ALL features
- **Manual-first** - Everything works without AI. No hand-holding. Pure human input.
- **Seamless & intuitive** - Should feel good to use, zero friction
- **Simplicity above all** - If it's not simple, it's wrong

**The goal:** Build something that feels fucking seamless. Someone picks it up and just *uses* it. No tutorials, no AI assistance required - just intuitive design.

---

## 💡 Ideas / Brainstorm

*Dump ideas here as they come - we'll organize them later.*

### Tasks Feature

**Core concept:** Tasks ≠ Projects. Tasks are individual action items. Styled like Microsoft To Do but with our neon glassmorphic aesthetic.

**Layout:**
- Left sidebar navigation
- Main content area showing list view

**Left Sidebar Structure:**
```
┌─────────────────────┐
│ 🌟 My Day           │  ← Default view
│ ⭐ Important        │
│ 📅 Scheduled        │
│ 📋 Agenda           │  ← Date range picker
├─────────────────────┤  ← Separator line
│ + New List          │
│ 📁 Custom List 1    │
│ 📁 Custom List 2    │
│ ...                 │
└─────────────────────┘
```

**Smart Views (top section):**
All smart views are **automatic filtered views** - not manual curation.

- **My Day** - Tasks due TODAY (auto-populates based on due date)
- **Important** - Tasks flagged as important/starred
- **Scheduled** - All tasks that have a due date set
- **Agenda** - Select date range → filtered list of tasks in that range

**Custom Lists (below separator):**
- User-created task lists
- Can add/rename/delete lists

**Task structure:**
- Title
- Description (markdown, read/edit toggle)
- Subtasks (simple checklist, one level deep)
- Due date
- Important flag (star)
- List assignment

**Modal behavior:**
- Same popup design as Projects
- Markdown description with read/edit toggle
- Subtasks as checklist section

### Bases (Custom Databases) = PKM Foundation

**Inspired by:** Notion databases / Airtable

**Concept:** Flexible database system. Ships with useful pre-built bases, plus ability to create custom ones.

**Pre-built Bases (ship by default):**
- 👥 People / Contacts
- 📝 Notes
- 📚 Books
- 🍳 Recipes
- (more TBD — useful stuff that immediately impacts life)

**Custom Bases:**
- Create your own databases
- Add as many columns as needed
- Choose property type for each column:
  - Text
  - Number
  - Date
  - Boolean (checkbox)
  - Select / Multi-select
  - **Relation** (link to other bases/tables)
  - URL
  - etc.
- **Relation type** is critical — links rows to other tables

**Views:**
- Default table view showing all data
- Create custom views:
  - Pick which columns to show/hide
  - Custom sort order
  - Custom column order
  - Saved filters
- Visual search across the base

**UI:** Same aesthetic as rest of app. Clean table interface for viewing/editing data.

---

## 🎯 Prioritized Features

### High Priority (Now)
1. **Tasks** — Left sidebar, smart views (My Day, Important, Scheduled, Agenda), custom lists, subtasks
2. **Calendar** — Fully standalone, no external integrations

### Calendar Feature

**Philosophy:**
- **Standalone first** — fully functional without any external services
- Integrations may come later, but the foundation never depends on them
- **Data sovereignty** — your data stays yours
- Should work as a complete replacement for big tech calendars

**Core Features (Table Stakes):**

Everything users expect from a modern calendar — no exceptions.

**Views:**
- Day view
- **3-day view**
- Week view
- Month view
- Mini month calendar for quick navigation

**Events:**
- Create events with full details (title, description, location, time, duration)
- All-day events (distinguished from timed events)
- Recurring events (daily, weekly, monthly, yearly, custom patterns)
- Color coding / categories
- Event editing via modal/panel

**Interaction:**
- Quick event creation (click on time slot → instant event)
- Drag to reschedule (move events to different time/day)
- Drag to resize (change duration by pulling edges)
- Reminders / notifications (configurable: 5min, 15min, 1hr, 1 day before)

**Organization:**
- Multiple calendars (personal, work, etc.) with visibility toggles
- Search events by title, description, or metadata
- Week starts on Sunday or Monday (user preference)

**Task Integration (our differentiator):**
- Calendar shows scheduled tasks inline
- Sidebar/panel shows unscheduled tasks
- **Drag & drop** unscheduled tasks onto calendar to schedule them
- Visual time blocking — drag tasks to specific time slots

### Medium Priority (Next)
3. **Cross-linking infrastructure** — Generic links table, UI for linking
4. **Bases / PKM** — Custom databases ARE the PKM system. Flexible schemas for knowledge management.

### Low Priority (Later)
5. **Contacts** — People management (or part of pre-built Bases)

### Future (Way Later)
*Foundation must be solid first. Don't even think about these until everything else is done.*

- **Anthropic Agent SDK** — AI integration
- **Calendar sync** — Connect external providers (Google, Outlook)
- **Email integration** — Connect Gmail, Outlook, etc.

---

## 🚧 In Progress

*Features currently being worked on.*

| Feature | Branch | Status | Notes |
|---------|--------|--------|-------|
| User authentication | `feature/user-auth` | ✅ Complete | Login, signup, profile, settings |

---

## ✅ Completed

*Shipped features for reference.*

- **Multi-user support** - Each user sees only their own tasks
- **Login/Signup** - Email or username + password
- **Profile page** - About Me + Settings (gear icon)
- **API key access** - For AI agents (Sarah, etc.)

---

## 📝 Notes

*General thoughts, constraints, technical decisions.*

### Hosting & Stack
- Hosted on Jake's VPS (82.180.136.224)
- SQLite database - simple, self-contained
- No external auth providers (Google, etc.) - keeping it simple
- Docker deployment

### Data Architecture

**One table per feature:**
- `tasks` - task items
- `projects` - project items (current "tasks" table)
- `notes` - PKM notes
- `contacts` - contact/people entries
- etc.

**Archive, don't delete:**
- No hard deletes. Ever.
- Completed/deleted items move to archive (soft delete)
- Archives are hidden from normal views
- Can always retrieve archived items if needed
- Each table has an `archived` flag or `archived_at` timestamp

### 🔗 Cross-Linking (CRITICAL)

**Everything can link to everything.**

Examples:
- Note → Task
- Note → Project
- Task → Project
- Contact → Project
- Contact → Task
- Note → Contact
- Resources/attachments → anything

**Why this matters:**
- Quick capture a note → later link it to the relevant task
- Project has multiple tasks → link them together
- People involved in a project → link contacts to it
- Reference materials → link notes/resources to projects

**Implementation approach:**
Generic `links` table:
```sql
CREATE TABLE links (
  id TEXT PRIMARY KEY,
  source_type TEXT,  -- 'task', 'project', 'note', 'contact'
  source_id TEXT,
  target_type TEXT,
  target_id TEXT,
  created_at TEXT
);
```

This enables any-to-any relationships without needing separate junction tables for every combination.

---

## ❓ Q&A Log

*Questions asked and answers given - organized by topic so we don't repeat ourselves.*

### Authentication & Users

### UI / UX

**Q: How should Tasks look compared to Projects?**
A: Different layout, same aesthetic. Tasks use a left sidebar + list view (like Microsoft To Do), NOT a kanban board. Same modal design, same markdown editor with read/edit toggle. Tasks have subtasks, smart views, and custom lists.

**Q: What's the My Day feature?**
A: Default landing view for Tasks. **Automatic** - shows tasks with due date = today. If you scheduled something for April 25th, it just appears in My Day on April 25th. No manual adding required.

**Q: What smart views should Tasks have?**
A: Four smart views at top of sidebar: My Day (default), Important (starred), Scheduled (has due date), Agenda (date range picker). Below a separator line: custom user-created lists.

### Technical / Architecture

**Q: How should deletion work?**
A: **Archive, never delete.** Completed tasks, deleted notes, removed contacts - everything goes to an archive. Hidden from normal views but always retrievable. Each table gets an `archived` flag or `archived_at` timestamp.

**Q: Where do archives live in the UI?**
A: **Hidden.** Archives are NOT in the main sidebar or navigation. You have to go out of your way to access them (settings, dedicated archive page, etc.). Keeps the UI clean and focused on active items.

**Q: Database structure?**
A: One SQLite table per feature (tasks, projects, notes, contacts, etc.). All following the same archive pattern. Plus a generic `links` table for cross-referencing.

**Q: Can items link to each other?**
A: YES - this is critical. Notes can link to tasks, tasks to projects, contacts to projects, etc. Any entity can link to any other entity. A generic links table handles all relationship types.

**Q: How does linking work in the UI?**
A: Two modes in the modal:

**Edit View:**
- Simple labels: "People", "Notes", "Resources" (NOT "Link People")
- Click → search/select from available items → link created

**Read View:**
- Linked items appear as sections: "People", "Notes", "Resources"
- Shows count or preview of linked items
- Click to expand/view

**Q: What's the second way to link things?**
A: **Bases** (custom databases). Notion-inspired feature where you create your own tables with custom columns. One column type is "Relation" — links rows to other bases or built-in tables (tasks, projects, etc.). Full flexibility for custom data structures.

### Deployment & Infrastructure

### Future Features

### Calendar

**Q: What are the "table stakes" features for a calendar app?**
A: Based on research across Google Calendar, Apple Calendar, and Outlook, these 12 features are non-negotiable:

1. **Multiple calendar views** — Day, week, month at minimum (3-day is a bonus)
2. **Event creation with full details** — Title, description, location, time, duration
3. **Recurring events** — Daily, weekly, monthly, yearly, custom patterns
4. **All-day events** — Distinguished from timed events
5. **Reminders/notifications** — Configurable timing (5min, 15min, 1hr, 1day before)
6. **Color coding** — Assign colors to events or calendars
7. **Multiple calendars** — Personal, work, etc. with visibility toggles
8. **Quick event creation** — Click on time slot → instant event
9. **Drag to reschedule** — Move events by dragging
10. **Drag to resize** — Change duration by pulling edges
11. **Event editing** — Full modal/panel for detailed edits
12. **Search** — Find events by title, description, or other metadata

**Q: What do users love about the big calendar apps?**

**Google Calendar:**
- ✅ Clean, intuitive interface
- ✅ Quick add with natural language ("Lunch with Sam tomorrow at noon")
- ✅ Seamless multi-device sync
- ✅ Easy sharing and collaboration
- ✅ World clock / time zone support
- ✅ Goals feature (auto-schedules habits)
- ✅ Integration with Gmail (events from emails auto-populate)

**Apple Calendar:**
- ✅ Beautiful native design, feels fast
- ✅ Tight integration with iOS/macOS ecosystem
- ✅ Travel time estimates between events
- ✅ Location suggestions
- ✅ Privacy-focused
- ✅ Siri integration for voice commands

**Outlook Calendar:**
- ✅ Excellent meeting scheduling (Find a Time, Scheduling Assistant)
- ✅ Deep email integration
- ✅ Shared calendars for teams
- ✅ Task integration built-in
- ✅ Professional/business-oriented features
- ✅ Room and resource booking

**Q: What do users hate about the big calendar apps?**

**Google Calendar:**
- ❌ Getting bloated, feature creep
- ❌ Privacy concerns (it's Google)
- ❌ Limited offline functionality
- ❌ No native desktop app (web wrapper)
- ❌ Customization is limited

**Apple Calendar:**
- ❌ Locked into Apple ecosystem
- ❌ Syncing issues with non-Apple calendars
- ❌ Limited collaboration features
- ❌ No natural language parsing (compared to Google)
- ❌ Feature-light compared to competitors

**Outlook Calendar:**
- ❌ Heavy, sluggish performance
- ❌ Overly complex for personal use
- ❌ Mobile app isn't as good as desktop
- ❌ Feels corporate, not personal
- ❌ Subscription required for best features

**Q: What are the key differentiators we could build?**

These are features that would make our calendar stand out:

1. **Smart Buffer Time**
   - Auto-insert buffer time between back-to-back events
   - Configurable: 5min, 15min, 30min defaults
   - Accounts for travel time or mental switching costs
   - Shows warning if you try to schedule without buffer

2. **Cross-Calendar Blocking**
   - When you have an event on Calendar A, auto-block that time on Calendar B
   - Useful for work/personal separation
   - No more double-booking across life domains
   - Optional "show as busy" mirroring

3. **Natural Language Parsing (Manual Entry)**
   - Type "Dentist next Tuesday at 2pm" → parses into proper event
   - Works in quick-add bar
   - No AI needed — just regex/NLP parsing
   - Google's best feature, we should match it

4. **AI-Powered Suggestions (Future)**
   - "You always move this recurring meeting — want to reschedule?"
   - "Your afternoon is packed — want me to find focus time?"
   - "Based on your patterns, 3pm meetings often run late"
   - **Important:** This is FUTURE. Manual-first always.

5. **Task ↔ Calendar Deep Integration**
   - Unlike competitors where tasks and calendar are separate
   - Drag unscheduled tasks directly onto calendar
   - Tasks with times show inline on calendar
   - Visual time blocking native to the experience

6. **No Account Required**
   - Local-first, your data stays local
   - No cloud dependency
   - Export/import in standard formats (ICS)
   - Privacy by default, sync optional

---
