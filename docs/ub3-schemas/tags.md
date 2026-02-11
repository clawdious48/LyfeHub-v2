# Tags Database Schema

> **Ultimate Brain 3.0** | Notion Database Documentation  
> **Database ID:** `22f49e36-383b-81f8-b720-f0b0c0bf32a9`  
> **Icon:** 🏷️ (red tag)  
> **Created:** 2025-07-13 | **Last Edited:** 2025-08-23

## Overview

This is the primary/source database for all Tags in Ultimate Brain. All Tags are contained in this database; the Tag views throughout Ultimate Brain are linked views of this database with unique sets of filters, sorts, and display criteria.

Tags serve as the organizational backbone for the PARA method (Projects, Areas, Resources, Archive). They can be typed as **Area**, **Resource**, or **Entity** to provide different organizational semantics.

---

## Core Properties

### Name
| Attribute | Value |
|-----------|-------|
| **ID** | `title` |
| **Type** | `title` |
| **Description** | The name of the Tag. |

---

### Type
| Attribute | Value |
|-----------|-------|
| **ID** | `%5BtN%60` |
| **Type** | `status` |
| **Description** | Allows you to give this page a specific tag type. If you practice PARA, you'll usually want to choose Area or Resource. You can also use the Entity option to build meta-collections, such as "Essays". You should also choose the corresponding page Template in the page body below. |

#### Status Options

| Option | Color | Description |
|--------|-------|-------------|
| **Area** | 🟠 orange | In the PARA Method, an Area is an "ongoing sphere of responsibility". Areas represent the main categories of your life – Home, Work, School, Health, etc. They may have Notes, Projects, Goals, and even sub-Tags (such as a Resource). |
| **Resource** | 🟣 purple | In the PARA Method, a Resource is a "topic or interest that may be useful in the future". Resource is the default Type within the Tags database. Use Resources to organize Notes about a specific topic or subject. |
| **Entity** | 🟢 green | "Entity" is useful for building meta-collections in your second brain, such as "Essays" or "Apps". It's not part of PARA. It's often useful to apply both a Resource and an Entity tag to a page – e.g. "Programming" as a topical Resource and "App" as an Entity. |

#### Status Groups

| Group | Color | Options |
|-------|-------|---------|
| To-do | gray | *(empty)* |
| In progress | blue | Entity, Area, Resource |
| Complete | green | *(empty)* |

---

### Archived
| Attribute | Value |
|-----------|-------|
| **ID** | `%3BguE` |
| **Type** | `checkbox` |
| **Description** | If checked, this Tag will be archived. It will disappear from all main dashboards in Ultimate Brain and show up in the Archived Tags view in the Archive. |

---

### Favorite
| Attribute | Value |
|-----------|-------|
| **ID** | `~oz%7C` |
| **Type** | `checkbox` |
| **Description** | If checked, this Tag will display in the Favorites section within Tags views. |

---

## Relation Properties

### Notes
| Attribute | Value |
|-----------|-------|
| **ID** | `s_jU` |
| **Type** | `relation` |
| **Related Database** | Notes (`22f49e36-383b-81b6-9e3b-cb6b898f014f`) |
| **Relation Type** | Dual property (bidirectional) |
| **Synced Property** | `Tag` (ID: `%3CMHb`) in Notes database |
| **Description** | Any notes associated with this Tag. This Relation property connects to the Tag Relation property in the Notes database. |

---

### Projects
| Attribute | Value |
|-----------|-------|
| **ID** | `E%7BSh` |
| **Type** | `relation` |
| **Related Database** | Projects (`22f49e36-383b-8157-a91e-df7acced5d74`) |
| **Relation Type** | Dual property (bidirectional) |
| **Synced Property** | `Tag` (ID: `VeW%7D`) in Projects database |
| **Description** | Any projects associated with this Tag. This Relation property connects to the Tag Relation property in the Projects database. It's best to use this relation with Tag pages that have the Area type and Area database template applied. |

---

### Goals
| Attribute | Value |
|-----------|-------|
| **ID** | `%7BCKx` |
| **Type** | `relation` |
| **Related Database** | Goals (`22f49e36-383b-8149-a94c-f33dd262263b`) |
| **Relation Type** | Dual property (bidirectional) |
| **Synced Property** | `Tag` (ID: `~VQ%7B`) in Goals database |
| **Description** | Any goals associated with this Tag. This Relation property connects to the Tag Relation property in the Goals database. This property is best used on Tag pages with the Area type (with the Area database template applied). |

---

### People
| Attribute | Value |
|-----------|-------|
| **ID** | `yiQl` |
| **Type** | `relation` |
| **Related Database** | People (`22f49e36-383b-81ce-9f7d-fa0bdf7d7caa`) |
| **Relation Type** | Dual property (bidirectional) |
| **Synced Property** | `Tags` (ID: `%3CEmK`) in People database |
| **Description** | Any People records associated with this Tag. Best used to associate People with Tags that have the Area type when practicing PARA organization. This Relation property connects to the Tags Relation property in the People database. |

---

### Parent Tag
| Attribute | Value |
|-----------|-------|
| **ID** | `%7CKMY` |
| **Type** | `relation` |
| **Related Database** | Tags (self-referential: `22f49e36-383b-81f8-b720-f0b0c0bf32a9`) |
| **Relation Type** | Dual property (bidirectional) |
| **Synced Property** | `Sub-Tags` (ID: `Xn%7Bf`) in this database |
| **Description** | This Tag's parent. This Relation property connects to the Sub-Tags Relation property in this database. |

---

### Sub-Tags
| Attribute | Value |
|-----------|-------|
| **ID** | `Xn%7Bf` |
| **Type** | `relation` |
| **Related Database** | Tags (self-referential: `22f49e36-383b-81f8-b720-f0b0c0bf32a9`) |
| **Relation Type** | Dual property (bidirectional) |
| **Synced Property** | `Parent Tag` (ID: `%7CKMY`) in this database |
| **Description** | Sub-Tags underneath this Tag. This Relation property connects to the Parent Tag Relation property in this database. Example use: Set Resource pages to be "within" an Area page. |

---

### Pulls
| Attribute | Value |
|-----------|-------|
| **ID** | `M%3D%3A%5E` |
| **Type** | `relation` |
| **Related Database** | Projects (`22f49e36-383b-8157-a91e-df7acced5d74`) |
| **Relation Type** | Dual property (bidirectional) |
| **Synced Property** | `Pulled Tags` (ID: `G%5EGJ`) in Projects database |
| **Description** | Projects that have pulled this Tag in order to display its notes within the project's Pulled Notes section. This Relation property connects to the Pulled Tags Relation in the Projects database. |

---

## Formula Properties

### Note Count
| Attribute | Value |
|-----------|-------|
| **ID** | `BTSZ` |
| **Type** | `formula` |
| **Description** | Displays the number of non-archived notes associated with this Tag. |

**Logic:** Counts the related Notes, filtering out those where `Archived == true`. Displays as a styled label (e.g., "5 notes" or "1 note") with blue text on blue background, bold and code-styled.

**Formula (pseudo-code):**
```
count = Notes.filter(note.Archived == false).length()
plural = count == 1 ? " " : "s"
return (count + " note" + plural).style("c", "b", "blue", "blue_background")
```

---

### Tag Projects
| Attribute | Value |
|-----------|-------|
| **ID** | `RFr%40` |
| **Type** | `formula` |
| **Description** | Displays a label with the number of active projects within this Tag, if there are any. Best used with Tag pages that have the Area type. |

**Logic:** Counts Projects related to this Tag where Status is "Doing" or "Ongoing". If count > 0, displays a styled label (e.g., "3 Active Projects") with green text on green background, bold and code-styled. Returns empty if no active projects.

**Formula (pseudo-code):**
```
count = Projects.filter(project.Status == "Doing" OR project.Status == "Ongoing").length()
if count > 0:
    return (count + " Active Project" + (count != 1 ? "s" : "")).style("b", "c", "green", "green_background")
else:
    return empty
```

---

### Latest Note
| Attribute | Value |
|-----------|-------|
| **ID** | `G%3Cji` |
| **Type** | `formula` |
| **Description** | Fetches the note within this Tag that was most recently updated. |

**Logic:** Filters Notes to exclude archived ones, sorts by Last Edited Time descending, and returns the first (most recent) note.

**Formula (pseudo-code):**
```
return Notes
    .filter(note.Archived == false)
    .sort(note.LastEditedTime)
    .reverse()
    .first()
```

---

### Latest Activity
| Attribute | Value |
|-----------|-------|
| **ID** | `eUQn` |
| **Type** | `formula` |
| **Description** | Returns the date and time of the latest activity in the Tag – including edits to it directly as well as changes to notes, tasks, and projects. Used for allowing Tags to be sorted by Latest Activity in certain views. |

**Logic:** Collects the latest edit timestamps from:
1. All related Projects (their last edit times)
2. All related Notes (their last edit times)
3. The Tag's own last edited time

Concatenates all timestamps, sorts descending, and returns the most recent.

**Formula (pseudo-code):**
```
projectActivity = Projects.map(project.LastEditedTime).sort().reverse()
noteActivity = Notes.map(note.LastEditedTime).sort().reverse()
editedList = [this.LastEditedTime]
return concat(projectActivity, noteActivity, editedList).sort().reverse().first()
```

---

## Metadata Properties

### Date
| Attribute | Value |
|-----------|-------|
| **ID** | `d%60BI` |
| **Type** | `date` |
| **Description** | *(No description provided)* |

General-purpose date field for the Tag.

---

### URL
| Attribute | Value |
|-----------|-------|
| **ID** | `GHD~` |
| **Type** | `url` |
| **Description** | *(No description provided)* |

General-purpose URL field for linking external resources to the Tag.

---

## Property Summary Table

| Property | ID | Type | Related To |
|----------|-----|------|------------|
| Name | `title` | title | — |
| Type | `%5BtN%60` | status | — |
| Archived | `%3BguE` | checkbox | — |
| Favorite | `~oz%7C` | checkbox | — |
| Notes | `s_jU` | relation | Notes DB |
| Projects | `E%7BSh` | relation | Projects DB |
| Goals | `%7BCKx` | relation | Goals DB |
| People | `yiQl` | relation | People DB |
| Parent Tag | `%7CKMY` | relation | Tags DB (self) |
| Sub-Tags | `Xn%7Bf` | relation | Tags DB (self) |
| Pulls | `M%3D%3A%5E` | relation | Projects DB |
| Note Count | `BTSZ` | formula | — |
| Tag Projects | `RFr%40` | formula | — |
| Latest Note | `G%3Cji` | formula | — |
| Latest Activity | `eUQn` | formula | — |
| Date | `d%60BI` | date | — |
| URL | `GHD~` | url | — |

---

## Related Database Reference

| Database | ID | Connection |
|----------|-----|------------|
| Notes | `22f49e36-383b-81b6-9e3b-cb6b898f014f` | Notes ↔ Tag |
| Projects | `22f49e36-383b-8157-a91e-df7acced5d74` | Projects ↔ Tag, Pulls ↔ Pulled Tags |
| Goals | `22f49e36-383b-8149-a94c-f33dd262263b` | Goals ↔ Tag |
| People | `22f49e36-383b-81ce-9f7d-fa0bdf7d7caa` | People ↔ Tags |

---

## LyfeHub Implementation Notes

### Core Concepts to Implement
1. **Tag Types (Status field):** Area, Resource, Entity — consider implementing as a select/enum
2. **Hierarchical Tags:** Parent Tag ↔ Sub-Tags self-relation enables tag nesting
3. **PARA Integration:** Tags are the backbone of PARA organization
   - Areas = ongoing responsibilities
   - Resources = topics/interests
   - Entities = meta-collections

### Key Relations to Mirror
- Tags ↔ Notes (many-to-many)
- Tags ↔ Projects (many-to-many, plus "Pulls" for pulled notes feature)
- Tags ↔ Goals (many-to-many)
- Tags ↔ People (many-to-many)
- Tags ↔ Tags (self-referential hierarchy)

### Computed Fields Strategy
- **Note Count:** Simple count with archive filtering
- **Tag Projects:** Count active projects (filter by status)
- **Latest Note / Latest Activity:** Aggregate timestamps across relations for activity sorting

### UI Considerations
- Favorites for quick access
- Archive functionality for soft-delete
- Activity-based sorting for "Recent" views
