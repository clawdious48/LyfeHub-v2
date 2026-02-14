# LyfeHub v2 — Vision & Philosophy

*Last updated: 2026-02-14*

---

## The Problem

Jake has ADHD. Diagnosed in 5th grade, took Ritalin briefly, then untreated for 20+ years. At 36, moved from field work (property restoration) to office work, and "everything fell apart." Field work masked the ADHD — constant movement, variety, external structure. Office work exposed it.

**The core struggles:**
- Memory is genuinely terrible. If not captured in seconds, it's gone forever.
- 25+ different apps with no way to remember what's stored where = nightmare.
- When unhappy with *how* he's doing something → complete shutdown. Not laziness — ADHD friction.
- Without a good system: scattered, overwhelmed, reactive.
- With a good system: incredibly productive. Night and day.

**The turning point:** Notion + Ultimate Brain 3.0 (Thomas Frank's PARA-based system). For the first time, Jake got "addicted to productivity." It literally broke his gaming addiction — pulled him away from his PC, helped him be present with his family, and enjoy life instead of escaping from it.

But Notion had problems:
- Too customizable. Endless rabbit holes of templates and tweaking.
- Too many views, too many databases, too much friction to find things.
- No mobile-first experience.
- Context-switching between Notion and other apps (calendar, email, tasks) killed momentum.

---

## The Vision

**LyfeHub is the app Jake wished existed but had to build himself.**

It's not another note-taking app. It's not a project management tool. It's **assistive technology for executive function** — a single place to operate your entire life.

One app. Everything radiates from there. You should never have to navigate across 36 different apps just to live your life.

### Core Philosophy

1. **One Home** — Single source of truth. Tasks, knowledge, time, work — all in one place.
2. **Capture-First, Process-Later** — Quick capture under 15 seconds. Everything lands in an inbox. Organize later, or don't.
3. **Opinionated Structure** — The app tells you where things go. No blank canvas, no "build your own database." Notion's infinite customizability is a bug, not a feature, for ADHD brains.
4. **Workflow-First, Not Format-First** — Designed around how you work, not how data is stored.
5. **Device-Agnostic** — Works on a Samsung Galaxy S22 Ultra just as well as a desktop. Mobile isn't an afterthought.
6. **Your Data, Your Freedom** — Open formats (Markdown, JSON). No vendor lock-in.

---

## Inspiration: Ultimate Brain 3.0

LyfeHub draws heavily from Thomas Frank's Ultimate Brain 3.0 Notion system and its spin on Tiago Forte's PARA method. What made UB3 work for Jake:

- **Data tables with different views** — Kanban, list, calendar views of the same data.
- **A main dashboard** pulling everything together for quick reference.
- **Breaking things down by area of life** — Areas, projects, tasks, notes.
- **Notes for everything** — Ideas, links to YouTube videos, journaling, reference material.
- **Quick capture → inbox** — Capture fast, process at end of day.
- **Smart Lists** — Auto-categorized task views (Inbox, Calendar, Snoozed, My Day).

Also influenced by:
- **Nick Milo's Linking Your Thinking (LYT)** — Zettelkasten-lite approach, atomic "cards" of thought.
- **Tiago Forte's PARA** — Projects, Areas, Resources, Archives as organizing principle.
- **David Allen's GTD** — Capture everything, process later, context-based lists.

---

## Core Modules

### 1. Tasks (Action Items)
**Purpose:** Things you need to *do*.

Structured with: status, priority, due dates, subtasks, assignee, area/project association, My Day flag, snooze dates, recurring patterns.

**Key feature: My Day view** — Only today's tasks, front and center. The single most important view in the app.

**Smart Lists** (auto-categorized):
- Inbox — No due date, unprocessed
- My Day — Flagged for today
- Calendar — Has due date
- Snoozed — Hidden until snooze date
- Waiting — Blocked on someone/something

Tasks are NOT part of the "second brain." They are action-oriented, structured, and have specific properties that notes/cards don't need.

### 2. Cards (Knowledge / Second Brain)
**Purpose:** Information you want to *find later*.

Previously called "Notes" — renamed to "Cards" inspired by Nick Milo's Zettelkasten-influenced approach. Cards are atomic, self-contained units of thought.

**Card types:**
- 💡 Ideas
- 📓 Journal entries
- 🔗 Links / resources (YouTube videos, articles, references)
- 📋 Reference material
- 💭 Quick captures (unprocessed, sitting in inbox)

**Key distinction from Tasks:** Cards don't need due dates, priority, or completion status. They exist to be *recalled*, not *acted on*. A second brain is a way to recall information — tasks and projects are a way of *thinking* and *doing*, which is fundamentally different.

**Properties:** Title, content (rich text/markdown), type/label, tags, area, related project, date, favorite, archived.

**Quick capture flow:** Capture fast → lands in inbox as unprocessed card → process later (add tags, categorize, link to project) → or leave it — the inbox is forgiving.

### 3. Calendar (Time Management)
**Purpose:** Time blocking, events, appointments, deadlines.

Full calendar functionality that eliminates the need for Google Calendar or any external calendar app. View events, create time blocks, see deadlines from tasks.

### 4. Apex (Work / Jobs)
**Purpose:** Apex Restoration job management.

A dedicated area for Jake's property restoration business. Job tracking, client info, insurance claims, task management specific to active jobs. Syncs with Zoho Projects as source of truth.

This is one "area of life" — work — with its own specialized interface.

### 5. People (CRM / Contacts)
**Purpose:** Relationship management.

Contacts, organizations, relationship tracking. Both personal (family, friends) and professional (clients, adjusters, contractors).

### 6. Projects (Containers for Work)
**Purpose:** Things you're *working toward*.

Groups of tasks with a goal, timeline, and area of life. Projects connect tasks (what to do), cards (knowledge), and people (who's involved).

---

## Mobile Bottom Navigation

The bottom nav reflects the four core pillars of daily life operation, plus overflow:

| Slot | Module | Why |
|------|--------|-----|
| 1 | **Tasks** | Daily action items, My Day view |
| 2 | **Cards** | Quick capture, second brain |
| 3 | **Calendar** | Time management |
| 4 | **Apex** | Work/jobs (primary business tool) |
| 5 | **More** | People, Projects, Orgs, Trade KB, Settings |

Design principle: The bottom nav represents **workflow pillars**, not database tables. Each slot answers a different question:
- Tasks → "What do I need to do?"
- Cards → "What do I need to remember?"
- Calendar → "When does it happen?"
- Apex → "What's happening at work?"

---

## What LyfeHub Is NOT

- **Not a blank canvas.** You don't build your own databases. The structure is opinionated.
- **Not infinitely customizable.** Customization is the enemy of ADHD productivity. The app makes decisions for you.
- **Not a Notion clone.** It takes the *workflow* that worked (UB3/PARA) and strips away the bullshit.
- **Not just for productivity.** It's for operating your entire life — work, personal, family, knowledge, goals.
- **Not a side project.** This is compensating for how Jake's brain works. The difference between functioning and drowning.

---

## Technical Approach

- **Iterative.** Start simple, get it working, then enhance. Don't over-engineer upfront.
- **Mobile-first.** Samsung Galaxy S22 Ultra is the primary device. Desktop is secondary.
- **Quick capture or bust.** If it takes more than 15 seconds to capture a thought, the system has failed.
- **Recognition over recall.** Show things, don't make the user remember where they are.

---

## The Deeper Why

Jake's Notion experience (Ultimate Brain 3.0) literally broke his gaming addiction. For the first time, he got "addicted to productivity" instead. It pulled him away from his PC, helped him be present with his family, and enjoy life rather than escaping from it.

LyfeHub isn't just a product idea — it's Jake trying to recreate and improve what saved him, so others can experience the same liberation. For people with ADHD, this is closer to assistive technology than productivity software. The difference between functioning and drowning.

---

*This document evolves as the vision sharpens. Update it whenever direction changes.*
