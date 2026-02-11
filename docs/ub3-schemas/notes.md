# Notes Database Schema

**Database ID:** `22f49e36-383b-81b6-9e3b-cb6b898f014f`  
**Title:** Notes:  
**Icon:** compose_red.svg  
**Created:** 2025-07-13  
**Last Edited:** 2025-12-13

## Description

> This is the primary/source database for all notes in Ultimate Brain. All of your notes are contained in this database; the Note views throughout Ultimate Brain are linked views of this database with unique sets of filters, sorts, and display criteria that make them more useful. **You should only ever need to interact with this main database when making changes to it. If you need to make a change, first unlock the database by clicking the "Locked" button above if it exists.**

---

## Properties Overview

| Property | Type | ID |
|----------|------|-----|
| Name | title | `title` |
| Type | select | `EmTb` |
| Archived | checkbox | `%3BenT` |
| Favorite | checkbox | `M%5CP%7D` |
| Note Date | date | `iqV_` |
| Review Date | date | `cZYr` |
| Created | created_time | `m%3FH%7D` |
| Updated | last_edited_time | `XmsU` |
| URL | url | `H%7DWc` |
| URL Base | formula | `D%5DNY` |
| URL Icon | formula | `XU%3E_` |
| Image | files | `puaL` |
| Duration | formula | `XEPZ` |
| Duration (Seconds) | number | `%5Ek%3Bb` |
| AI Cost | number | `LG%3An` |
| Updated (Short) | formula | `DwcB` |
| Tag | relation | `%3CMHb` |
| Project | relation | `mgGA` |
| Pulls | relation | `fnZJ` |
| People | relation | `~%7B%5BU` |
| Root Tag | rollup | `m%5B%3Ef` |
| Project Tag | rollup | `D%3D%3EQ` |
| Project People | rollup | `BR%3A~` |
| Project Archived | rollup | `mqvq` |
| Tag Pulls | rollup | `vzJ%5C` |

---

## Core Properties

### Name
| Attribute | Value |
|-----------|-------|
| **Type** | `title` |
| **ID** | `title` |
| **Description** | The title of the note. |

---

### Type
| Attribute | Value |
|-----------|-------|
| **Type** | `select` |
| **ID** | `EmTb` |
| **Description** | Allows you to tag your notes with a Type. Useful in Tag pages, within the By Type view. |

**Options:**

| Option | Color | ID |
|--------|-------|-----|
| Journal | gray | `OImb` |
| Meeting | yellow | `06673244-d180-4b5f-805c-095d13f17524` |
| Web Clip | red | `RAN_` |
| Lecture | green | `ed8be717-225c-4eb9-beef-034c90fc2b29` |
| Reference | default | `GWVU` |
| Book | pink | `Skov` |
| Idea | orange | `{BAR` |
| Plan | blue | `|?py` |
| Recipe | yellow | `[CbU` |
| Voice Note | purple | `=InC` |
| Daily | brown | `EiTP` |
| Music | orange | `58d1d1f4-6969-4c39-ac9f-51e04e6a7ad6` |
| Quote | default | `90c568e1-84de-4cac-8007-b929ee38a520` |

---

### Archived
| Attribute | Value |
|-----------|-------|
| **Type** | `checkbox` |
| **ID** | `%3BenT` |
| **Description** | Check this to archive this note. Archived notes are removed from all main locations in Ultimate Brain and go to the Archived Notes section of the Archive page. |

---

### Favorite
| Attribute | Value |
|-----------|-------|
| **Type** | `checkbox` |
| **ID** | `M%5CP%7D` |
| **Description** | Check this to mark a note as a Favorite, and have it show in the Favorites section of Notes views. |

---

## Date & Time Properties

### Note Date
| Attribute | Value |
|-----------|-------|
| **Type** | `date` |
| **ID** | `iqV_` |
| **Description** | This property allows you to manually set a date for this note. Useful for Meeting notes and Journal entries, which may need a different date than the read-only Created date. |

---

### Review Date
| Attribute | Value |
|-----------|-------|
| **Type** | `date` |
| **ID** | `cZYr` |
| **Description** | Useful for planning a date in the future on which to review this note – e.g. mid-November for a holiday gift-planning note. The Calendar view in the All Notes source database uses this property, allowing you to add it to Notion Calendar. |

---

### Created
| Attribute | Value |
|-----------|-------|
| **Type** | `created_time` |
| **ID** | `m%3FH%7D` |
| **Description** | The date and time this note was created. |

**Note:** This is a read-only system property automatically set when the note is created.

---

### Updated
| Attribute | Value |
|-----------|-------|
| **Type** | `last_edited_time` |
| **ID** | `XmsU` |
| **Description** | The base domain of this note's URL property. Used in the Web Clips section of Resource pages, specifically in the By Site view. |

**Note:** This is a read-only system property automatically updated whenever the note is modified.

---

### Updated (Short)
| Attribute | Value |
|-----------|-------|
| **Type** | `formula` |
| **ID** | `DwcB` |
| **Description** | A small, styled label displaying how many days have passed since this note was updated. Displayed in the Recents view of the Notes dashboard, among other places. |

**Formula Logic:**
- Calculates days between now and the Updated timestamp
- Appends "d" suffix (e.g., "5d")
- Styled with code format, bold, blue text on blue background

---

## URL & Web Content Properties

### URL
| Attribute | Value |
|-----------|-------|
| **Type** | `url` |
| **ID** | `H%7DWc` |
| **Description** | A URL associated with this note. Most commonly used for web clips/captures taken with Flylighter (our web clipper) or the Notion web clipper. |

---

### URL Base
| Attribute | Value |
|-----------|-------|
| **Type** | `formula` |
| **ID** | `D%5DNY` |
| **Description** | The base domain of this note's URL property. |

**Formula Logic:**
- Takes the URL property
- Removes protocol prefix (`[^]*//`)
- Splits by `/`
- Returns the first element (base domain)

**Example:** `https://www.example.com/path/page` → `www.example.com`

---

### URL Icon
| Attribute | Value |
|-----------|-------|
| **Type** | `formula` |
| **ID** | `XU%3E_` |
| **Description** | Simply displays a small, clickable icon that links to this page's URL, if it exists. If the page doesn't have a URL, this will be empty. Useful for making Web Clips clickable in condensed list views of Resources and Notes views (e.g. Side Peek, mobile). |

**Formula Logic:**
- If URL is empty → returns empty string
- Otherwise → returns "🔗" emoji with gray background, linked to the URL

---

### Image
| Attribute | Value |
|-----------|-------|
| **Type** | `files` |
| **ID** | `puaL` |
| **Description** | An image file associated with this note. |

---

## Voice Note Properties

### Duration
| Attribute | Value |
|-----------|-------|
| **Type** | `formula` |
| **ID** | `XEPZ` |
| **Description** | Uses the Duration (Seconds) number property to display the duration of a captured voice note in HH:MM:SS format. |

**Formula Logic:**
- If Duration (Seconds) is empty → returns empty string
- Otherwise:
  - Calculates hours: `floor(seconds / 3600)`
  - Calculates minutes: `floor((seconds % 3600) / 60)`
  - Calculates remaining seconds: `floor(seconds % 3600 % 60)`
  - Zero-pads each component to 2 digits
  - Joins with colons → `HH:MM:SS`

---

### Duration (Seconds)
| Attribute | Value |
|-----------|-------|
| **Type** | `number` |
| **ID** | `%5Ek%3Bb` |
| **Format** | `number` |
| **Description** | The duration of a voice note captured and transcribed with Thomas Frank's Voice Notes to Notion workflow. This duration is expressed in seconds, and is later formatted in the Duration formula property. |

---

### AI Cost
| Attribute | Value |
|-----------|-------|
| **Type** | `number` |
| **ID** | `LG%3An` |
| **Format** | `dollar` |
| **Description** | Used for voice notes captured and transcribed with Thomas Frank's Voice Notes to Notion workflow. Displays the total cost of the workflow run, including transcription and summarization costs from all involved AI models. |

---

## Relation Properties

### Tag
| Attribute | Value |
|-----------|-------|
| **Type** | `relation` |
| **ID** | `%3CMHb` |
| **Linked Database** | Tags (`22f49e36-383b-81f8-b720-f0b0c0bf32a9`) |
| **Relation Type** | Dual property (bidirectional) |
| **Synced Property** | `Notes` (ID: `s_jU`) in Tags database |
| **Description** | The Tag(s) to which this note is related. |

---

### Project
| Attribute | Value |
|-----------|-------|
| **Type** | `relation` |
| **ID** | `mgGA` |
| **Linked Database** | Projects (`22f49e36-383b-8157-a91e-df7acced5d74`) |
| **Relation Type** | Dual property (bidirectional) |
| **Synced Property** | `Notes` (ID: `~ZFD`) in Projects database |
| **Description** | The Project to which this note is directly related – i.e. its content is explicitly part of the project. If you'd like to associate reference materials to a project, you may want to use the Pulls property instead. |

---

### Pulls
| Attribute | Value |
|-----------|-------|
| **Type** | `relation` |
| **ID** | `fnZJ` |
| **Linked Database** | Projects (`22f49e36-383b-8157-a91e-df7acced5d74`) |
| **Relation Type** | Dual property (bidirectional) |
| **Synced Property** | `Pulled Notes` (ID: `iTJU`) in Projects database |
| **Description** | This Relation property shows Projects that have "pulled" this note in as reference material. Pulls are notes that aren't directly related to a project, but that may provide helpful context and reference info. |

**Note:** This is distinct from Project — it's for reference materials vs. direct project content.

---

### People
| Attribute | Value |
|-----------|-------|
| **Type** | `relation` |
| **ID** | `~%7B%5BU` |
| **Linked Database** | People (`22f49e36-383b-81ce-9f7d-fa0bdf7d7caa`) |
| **Relation Type** | Dual property (bidirectional) |
| **Synced Property** | `Notes` (ID: `%3D%3C%60J`) in People database |
| **Description** | Any People records related to this note. Used most often with the Meeting Notes template, or when creating an interaction log with one or more people. |

---

## Rollup Properties

### Root Tag
| Attribute | Value |
|-----------|-------|
| **Type** | `rollup` |
| **ID** | `m%5B%3Ef` |
| **Source Relation** | Tag |
| **Rollup Property** | `Parent Tag` (ID: `\|KMY`) |
| **Function** | `show_original` |
| **Description** | If this note is related to a Tag that has a Parent Tag, this will show that Parent Tag. |

**Purpose:** Enables hierarchical tag navigation — see the "grandparent" tag for nested tag structures.

---

### Project Tag
| Attribute | Value |
|-----------|-------|
| **Type** | `rollup` |
| **ID** | `D%3D%3EQ` |
| **Source Relation** | Project |
| **Rollup Property** | `Tag` (ID: `VeW}`) |
| **Function** | `show_original` |
| **Description** | If this note is related to a Project within the Project relation property, this will show that Project's Tag (if it has one). |

**Purpose:** Surface the project's associated tag without navigating away from the note.

---

### Project People
| Attribute | Value |
|-----------|-------|
| **Type** | `rollup` |
| **ID** | `BR%3A~` |
| **Source Relation** | Project |
| **Rollup Property** | `People` (ID: `{A>p`) |
| **Function** | `show_original` |
| **Description** | Shows any People records associated with this note's Project (if it has one). Used in People pages. |

**Purpose:** Display all people related to the linked project, enabling cross-referencing.

---

### Project Archived
| Attribute | Value |
|-----------|-------|
| **Type** | `rollup` |
| **ID** | `mqvq` |
| **Source Relation** | Project |
| **Rollup Property** | `Archived` (ID: `dvff`) |
| **Function** | `show_original` |
| **Description** | Displays whether or not the project related to this note (if there is one) is archived. |

**Purpose:** Filter or hide notes whose parent projects have been archived.

---

### Tag Pulls
| Attribute | Value |
|-----------|-------|
| **Type** | `rollup` |
| **ID** | `vzJ%5C` |
| **Source Relation** | Tag |
| **Rollup Property** | `Pulls` (ID: `M=:^`) |
| **Function** | `show_original` |
| **Description** | If this note is part of a Tag that has been pulled into a Project, that project will be displayed here for reference purposes. See the Pulls property description for more info. |

**Purpose:** Show indirect project associations through tag relationships.

---

## Database Relationships Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          NOTES                                   │
│                 22f49e36-383b-81b6-9e3b-cb6b898f014f            │
└─────────────────────────────────────────────────────────────────┘
        │                    │                    │
        │ Tag                │ Project/Pulls      │ People
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│     TAGS      │   │   PROJECTS    │   │    PEOPLE     │
│ ...81f8-b720  │   │ ...8157-a91e  │   │ ...81ce-9f7d  │
│               │   │               │   │               │
│ ← Notes       │   │ ← Notes       │   │ ← Notes       │
│               │   │ ← Pulled Notes│   │               │
│ Parent Tag ───┼───┤ People ───────┼───┤               │
│ Pulls ────────┼───┤ Tag ──────────┼───┤               │
└───────────────┘   └───────────────┘   └───────────────┘
```

---

## LyfeHub Implementation Notes

### Required Fields for MVP
- **Name** (title) — Required
- **Type** (select) — Recommended for categorization
- **Created** (auto) — System-generated
- **Updated** (auto) — System-generated

### Optional but Valuable
- **Archived** — Soft delete functionality
- **Favorite** — Quick access filtering
- **Note Date** — Manual date override
- **Tags** — Flexible categorization (many-to-many)
- **Project** — Direct association (many-to-one)

### Voice Note Integration
If implementing voice note capture:
- **Duration (Seconds)** — Store raw seconds
- **Duration** — Calculate display format client-side
- **AI Cost** — Track API costs for transparency

### URL/Web Clip Features
- **URL** — Store the source URL
- **URL Base** — Extract domain for grouping (compute client-side)
- **URL Icon** — UI enhancement (render client-side)

### Rollup Equivalents
LyfeHub should compute these via JOINs or nested queries rather than storing them:
- **Root Tag** — Follow tag hierarchy
- **Project Tag** — Fetch from related project
- **Project People** — Fetch from related project
- **Project Archived** — Check project status
- **Tag Pulls** — Follow tag → project relationships
