# PEOPLE Database Schema

> **Ultimate Brain 3.0 — Jake's Notion Workspace**

| Property | Value |
|----------|-------|
| **Database ID** | `22f49e36-383b-81ce-9f7d-fa0bdf7d7caa` |
| **Created** | 2025-07-13 |
| **Last Edited** | 2025-08-15 |
| **Icon** | 🔴 User circle (filled, red) |

## Description

This is the primary/source database for all People records in Ultimate Brain. All of your People records (i.e. contacts) are contained in this database; the People views throughout Ultimate Brain are linked views of this database with unique sets of filters, sorts, and display criteria that make them more useful.

**You should only ever need to interact with this main database when making changes to it. If you need to make a change, first unlock the database by clicking the "Locked" button above if it exists.**

---

## Properties Overview

| Property | Type | ID |
|----------|------|-----|
| Full Name | title | `title` |
| Surname | rich_text | `vNSH` |
| Name (Last, First) | formula | `hmuo` |
| Email | email | `EOCw` |
| Main/Claims Email | email | `dy>@` |
| Phone | phone_number | `kqT\` |
| Website | url | `<C>a` |
| LinkedIn | url | `xrkf` |
| Twitter/X | url | `V<nV` |
| Instagram | url | `~{^R` |
| Location | rich_text | `XAam` |
| Company | multi_select | `?OL=` |
| Title | rich_text | `{oka` |
| Industry | select | `ubbX` |
| Relationship | multi_select | `gsFK` |
| Interests | multi_select | `IVL<` |
| How Met | rich_text | `x~[R` |
| Birthday | date | `TVUS` |
| Next Birthday | formula | `jUf\` |
| Last Check-In | date | `^|{~` |
| Check-In | date | `nFjC` |
| Pipeline Status | status | `}tRy` |
| Tags | relation | `<EmK` |
| Notes | relation | `=<\`J` |
| Tasks | relation | `mAzR` |
| Projects | relation | `v?~H` |
| Created | created_time | `PSHL` |
| Edited | last_edited_time | `v|;W` |

---

## Identity Properties

### Full Name
| | |
|---|---|
| **Type** | `title` |
| **ID** | `title` |
| **Description** | The full name of the person in first name, last name order. |

### Surname
| | |
|---|---|
| **Type** | `rich_text` |
| **ID** | `vNSH` |
| **Description** | This person's surname, a.k.a. last name. You only need to enter a surname here if the Name (Last, First) property isn't deriving it correctly from the Full Name property. "Jean-Claude Van Damme" is a good example; "Van Damme" is his surname. |

### Name (Last, First)
| | |
|---|---|
| **Type** | `formula` |
| **ID** | `hmuo` |
| **Description** | This person's name in Last, First order. The formula can handle many types of names – but in edge cases, you can add a name to the Surname property. If you do, it will be used as the Last name in this formula. |

**Formula Logic:**
1. If Full Name is empty → return empty string
2. If Surname is provided → use `Surname, [rest of name]`
3. Otherwise, parse intelligently:
   - Handles suffixes: Jr., Sr., II, III, IV, V, MD, PhD, DDS, Esq., OBE, QC
   - Single word names → return as-is
   - Names with suffix → `[second-to-last], [first parts] [suffix]`
   - Normal names → `[last], [first parts]`

---

## Contact Information

### Email
| | |
|---|---|
| **Type** | `email` |
| **ID** | `EOCw` |
| **Description** | This person's email. |

### Main/Claims Email
| | |
|---|---|
| **Type** | `email` |
| **ID** | `dy>@` |
| **Description** | *(No description — Jake added for insurance adjuster claims emails)* |

### Phone
| | |
|---|---|
| **Type** | `phone_number` |
| **ID** | `kqT\` |
| **Description** | This person's phone number. |

### Location
| | |
|---|---|
| **Type** | `rich_text` |
| **ID** | `XAam` |
| **Description** | The location where this person lives or works. Typically, it's most useful to put a city, state, and country here (for U.S. contacts), or the equivalent for other countries. |

---

## Social & Web Profiles

### Website
| | |
|---|---|
| **Type** | `url` |
| **ID** | `<C>a` |
| **Description** | This person's website. |

### LinkedIn
| | |
|---|---|
| **Type** | `url` |
| **ID** | `xrkf` |
| **Description** | This person's LinkedIn profile link. |

### Twitter/X
| | |
|---|---|
| **Type** | `url` |
| **ID** | `V<nV` |
| **Description** | This person's Twitter/X profile link. |

### Instagram
| | |
|---|---|
| **Type** | `url` |
| **ID** | `~{^R` |
| **Description** | This person's Instagram profile link. |

---

## Professional Information

### Company
| | |
|---|---|
| **Type** | `multi_select` |
| **ID** | `?OL=` |
| **Description** | The company this person works at. Note: You can also use the People database to create entries for entire companies. This may be helpful if you're working with a client company and have multiple contacts there. |

**Options:**

| Option | Color |
|--------|-------|
| Balance forward consulting PLLC. | yellow |
| Standard Restoration | pink |
| Apex Restoration LLC | orange |
| Foremost Insurance | blue |
| Wardlaw Claims | green |
| Salt Lake County | gray |
| Diamond Ridge Elementary | red |
| Granite School District | brown |

### Title
| | |
|---|---|
| **Type** | `rich_text` |
| **ID** | `{oka` |
| **Description** | If this person has a job title, enter it here. E.g. "Founder" or "Lead Crocodile Wrangler". |

### Industry
| | |
|---|---|
| **Type** | `select` |
| **ID** | `ubbX` |
| **Description** | *(No description)* |

**Options:**

| Option | Color |
|--------|-------|
| Insurance | yellow |
| Auto Mechanic | orange |
| HVAC | default |
| Electrical | brown |
| Plumbing | blue |
| Automotive | gray |
| Certified public accountant | red |
| Business consultant | green |

---

## Relationship & Personal

### Relationship
| | |
|---|---|
| **Type** | `multi_select` |
| **ID** | `gsFK` |
| **Description** | Your relationship(s) to this person. |

**Options:**

| Option | Color |
|--------|-------|
| Insurance Adjuster | blue |
| Daughter | default |
| Wife | red |
| Family | yellow |
| Friend | pink |
| Colleague | blue |
| Client | brown |
| Customer | orange |
| Business Partner | purple |
| Vendor | green |
| Senpai | gray |
| Teacher | default |
| School | gray |
| Organization | pink |

### Interests
| | |
|---|---|
| **Type** | `multi_select` |
| **ID** | `IVL<` |
| **Description** | This person's interests. Noting these here may be helpful for planning events or buying gifts in the future. Unlock the People database (UB Home → Databases at the bottom of the page → People) to edit this property. |

**Options:**

| Option | Color |
|--------|-------|
| Camping Playing with her dogs Family Playing with the grand babies | blue |
| Books | purple |
| Pools | orange |
| Swimming | green |
| Pole dancing | pink |
| Process improvement | default |
| Carpentry | red |
| Writing | yellow |
| Mobile games | brown |
| Family Time | gray |
| Sushi | brown |

### How Met
| | |
|---|---|
| **Type** | `rich_text` |
| **ID** | `x~[R` |
| **Description** | *(No description)* |

---

## Dates & Reminders

### Birthday
| | |
|---|---|
| **Type** | `date` |
| **ID** | `TVUS` |
| **Description** | This person's birthday. Note: The Next Birthday property will show their upcoming birthday. You can use it in calendar views – however, I recommend using an actual calendar app as well, as it will allow you to create repeating reminder notifications. |

### Next Birthday
| | |
|---|---|
| **Type** | `formula` |
| **ID** | `jUf\` |
| **Description** | This person's next birthday. Calculated using the Birthday property, along with today's date. |

**Formula Logic:**
1. Parse birthday with current year
2. If that date has already passed this year → add 1 year
3. Return the upcoming birthday date

### Last Check-In
| | |
|---|---|
| **Type** | `date` |
| **ID** | `^|{~` |
| **Description** | Use this date property to record your most recent check-in or interaction with this person. This property can be useful for making sure you're regularly checking in with friends, family, or clients. |

### Check-In
| | |
|---|---|
| **Type** | `date` |
| **ID** | `nFjC` |
| **Description** | If you'd like to schedule a check-in with this person, add a date here. |

---

## Pipeline / CRM

### Pipeline Status
| | |
|---|---|
| **Type** | `status` |
| **ID** | `}tRy` |
| **Description** | The current status of a potential client or customer. This property is primarily useful for tracking sales pipelines for people that have a Relationship value of Client or Customer. |

**Status Options:**

| Status | Color | Group | Description |
|--------|-------|-------|-------------|
| Prospect | default | To-do | This person is a prospect whom you haven't contacted yet. |
| Contacted | blue | In progress | You've reached out to this person. |
| Negotiating | blue | In progress | You're currently negotiating a deal with this person. |
| Closed | green | Complete | You've successfully closed a deal with this person. |
| Rejected | red | Complete | This person rejected your pitch, and further negotiations aren't happening right now. |

**Status Groups:**

| Group | Color | Statuses |
|-------|-------|----------|
| To-do | gray | Prospect |
| In progress | blue | Contacted, Negotiating |
| Complete | green | Rejected, Closed |

---

## Relations

### Tags
| | |
|---|---|
| **Type** | `relation` |
| **ID** | `<EmK` |
| **Linked Database** | Tags (`22f49e36-383b-81f8-b720-f0b0c0bf32a9`) |
| **Synced Property** | `People` (ID: `yiQl`) in Tags database |
| **Description** | Any Tags associated with this person. Best used to associate People with Tags that have the Area type when practicing PARA organization. |

### Notes
| | |
|---|---|
| **Type** | `relation` |
| **ID** | `=<\`J` |
| **Linked Database** | All Notes (`22f49e36-383b-81b6-9e3b-cb6b898f014f`) |
| **Synced Property** | `People` (ID: `~{[U`) in All Notes database |
| **Description** | Any Notes related to this person's page. |

### Tasks
| | |
|---|---|
| **Type** | `relation` |
| **ID** | `mAzR` |
| **Linked Database** | All Tasks (`22f49e36-383b-814f-a8d0-e553c1923507`) |
| **Synced Property** | `People` (ID: `[TFr`) in All Tasks database |
| **Description** | Any tasks associated with this person. This can use used in the Delegation page of the Process (GTD) dashboard for noting who you've delegated tasks to. |

### Projects
| | |
|---|---|
| **Type** | `relation` |
| **ID** | `v?~H` |
| **Linked Database** | Projects (`22f49e36-383b-8157-a91e-df7acced5d74`) |
| **Synced Property** | `People` (ID: `{A>p`) in Projects database |
| **Description** | Any projects associated with this person. |

---

## System / Metadata

### Created
| | |
|---|---|
| **Type** | `created_time` |
| **ID** | `PSHL` |
| **Description** | The date on which this contact page was created. |

### Edited
| | |
|---|---|
| **Type** | `last_edited_time` |
| **ID** | `v|;W` |
| **Description** | The date on which this contact page was last updated. |

---

## Related Databases (Quick Reference)

| Database | ID | Relation Property in People |
|----------|----|-----------------------------|
| Tags | `22f49e36-383b-81f8-b720-f0b0c0bf32a9` | Tags |
| All Notes | `22f49e36-383b-81b6-9e3b-cb6b898f014f` | Notes |
| All Tasks | `22f49e36-383b-814f-a8d0-e553c1923507` | Tasks |
| Projects | `22f49e36-383b-8157-a91e-df7acced5d74` | Projects |

---

## LyfeHub Implementation Notes

### Core Fields to Implement
- **Full Name** (title) — primary identifier
- **Email** + **Main/Claims Email** — support multiple emails
- **Phone** — phone number
- **Company** — multi-select (or relation to Organizations base)
- **Relationship** — multi-select for categorization
- **Pipeline Status** — status with groups for CRM funnel

### Formula Fields to Replicate
- **Name (Last, First)** — computed from Full Name, useful for sorting
- **Next Birthday** — computed from Birthday, useful for reminders

### Custom Fields Jake Added
- **Main/Claims Email** — for insurance adjuster claims-specific emails
- **Industry** — to categorize by trade/profession

### Relation Strategy for LyfeHub
The UB3 People database relates to:
- Tasks (delegation tracking)
- Projects (project stakeholders)
- Notes (contact-related notes)
- Tags (PARA areas)

Consider implementing these as separate bases with two-way relations.
