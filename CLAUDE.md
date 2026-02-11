# Kanban Board — Project Context

> Last analyzed: 2026-01-27

## What This Is

A self-hosted kanban board for Jake and his AI assistants. Multi-user, task management with a 6-column workflow. Designed for human + AI collaboration — Jake adds tasks via UI, AI agents pick them up via API.

## Quick Facts

| Aspect | Details |
|--------|---------|
| **Stack** | Node/Express backend, vanilla JS frontend, SQLite database |
| **Auth** | Email/password + username login (bcrypt), JWT cookies, API key for agents |
| **Deployment** | Docker on VPS (82.180.136.224), ports 3000 (prod) / 3002 (preview) |
| **Repo** | `https://github.com/clawdious48/kanban-board.git` |
| **Owner** | clawdious48 (AI), jaker3001 (Jake) is collaborator |

## Architecture

```
kanban-board/
├── backend/
│   └── src/
│       ├── index.js           # Express server entry
│       ├── db/
│       │   ├── schema.js      # SQLite init, migrations
│       │   ├── queries.js     # Task CRUD operations
│       │   └── users.js       # User CRUD operations
│       ├── middleware/
│       │   └── auth.js        # JWT + API key auth
│       └── routes/
│           ├── auth.js        # /api/auth/* (login, signup, logout)
│           ├── tasks.js       # /api/tasks/* (CRUD, pick, complete)
│           └── users.js       # /api/users/* (profile, password)
├── frontend/
│   ├── index.html             # Main kanban board
│   ├── login.html             # Login/signup page
│   ├── about.html             # User profile (About Me)
│   ├── settings.html          # User settings (password, logout)
│   ├── css/
│   │   ├── style.css          # Main styles (neon glassmorphic theme)
│   │   └── auth.css           # Auth page styles
│   └── js/
│       ├── api.js             # API client
│       ├── kanban.js          # Board logic, drag-drop
│       ├── modal.js           # Task modal, forms
│       └── particles.js       # Background particle effects
├── docker-compose.yml         # Dev compose
├── docker-compose.prod.yml    # Production compose
├── Dockerfile                 # Container build
├── SPEC.md                    # Original spec
├── FEATURE.md                 # User auth feature spec
├── ROADMAP.md                 # Feature planning (linked to Obsidian)
└── CLAUDE.md                  # This file
```

## Database Schema

### `users` table
```sql
id TEXT PRIMARY KEY
email TEXT UNIQUE NOT NULL
password_hash TEXT NOT NULL
name TEXT NOT NULL
settings TEXT DEFAULT '{}'
created_at TEXT
updated_at TEXT
```

### `tasks` table
```sql
id TEXT PRIMARY KEY
title TEXT NOT NULL
description TEXT DEFAULT ''
acceptance_criteria TEXT DEFAULT '[]'   -- JSON array
status TEXT DEFAULT 'planned'           -- planned|ready|in_progress|blocked|review|done
priority INTEGER DEFAULT 3              -- 1-5 (lower = higher)
context_links TEXT DEFAULT '[]'         -- JSON array of URLs
notes TEXT DEFAULT ''
activity_log TEXT DEFAULT '[]'          -- JSON array of log entries
session_id TEXT                         -- Which agent picked it up
user_id TEXT REFERENCES users(id)       -- Owner
created_at TEXT
updated_at TEXT
completed_at TEXT
review_state TEXT DEFAULT '{}'          -- Review tracking
```

## API Endpoints

### Auth (`/api/auth`)
- `POST /signup` — Create account (email, password, name)
- `POST /login` — Login (email OR username + password) → JWT cookie
- `POST /logout` — Clear session
- `GET /check` — Check authentication status

### Users (`/api/users`)
- `GET /me` — Get current user profile
- `PATCH /me` — Update name, settings
- `PUT /me/password` — Change password

### Tasks (`/api/tasks`)
- `GET /` — List tasks (filtered by user_id, optional `?status=`)
- `POST /` — Create task (auto-sets user_id)
- `GET /:id` — Get single task
- `PATCH /:id` — Update task
- `DELETE /:id` — Delete task
- `POST /:id/pick` — AI claims task (ready → in_progress)
- `POST /:id/complete` — AI completes task (in_progress → review)

## Authentication

**Two auth methods:**
1. **JWT Cookie** — For UI users, set on login, httpOnly, 7-day expiry
2. **Bearer Token** — For AI agents, `Authorization: Bearer <API_KEY>`

API key access bypasses user auth (system-level access for agents).

**Login accepts email OR username** — handled by `findUserByEmailOrName()`.

## Task Workflow

```
Planned → Ready → In Progress → Blocked → Review → Done
                       ↓
                    (blocked)
```

- **Planned**: Ideas, not ready to work
- **Ready**: Ready for AI to pick up
- **In Progress**: Being worked on (has session_id)
- **Blocked**: Stuck, needs intervention
- **Review**: Work complete, needs human approval
- **Done**: Approved and closed

## UI Theme

**Neon glassmorphic** — Dark background with glowing accents, glass-like panels, particle effects. Colors: electric blue, neon green, purple accents on dark (#0a0a0a) background.

Key CSS classes in `style.css`:
- `.glass` — Frosted glass effect
- `.neon-*` — Glowing borders/text
- `.card` — Task cards

## Environment Variables

```env
KANBAN_PASSWORD=<legacy, still used for fallback>
KANBAN_API_KEY=<bearer token for API access>
JWT_SECRET=<for signing JWTs>
PORT=3000
NODE_ENV=production
COOKIE_SECURE=true
```

## Development

**Local:**
```bash
cd backend && npm install && npm run dev
# Frontend served from backend at localhost:3000
```

**Docker:**
```bash
docker-compose up --build
```

## Deployment (VPS)

Production runs on `82.180.136.224`:
- Port 3000: Production
- Port 3002: Preview/staging

Deploy via SSH + docker-compose.

## Key Decisions

1. **SQLite over Postgres** — Simple, self-contained, no external deps
2. **No OAuth** — Email/password only, keeps it simple
3. **API key for agents** — Separate from user auth, system-level access
4. **Vanilla JS frontend** — No framework, fast, simple
5. **User data isolation** — All queries filtered by user_id
6. **Activity log** — Every status change logged with timestamp

## What's Already Built

- ✅ Multi-user authentication (signup, login, profile)
- ✅ Email OR username login
- ✅ Data isolation per user
- ✅ 6-column kanban workflow
- ✅ Drag-and-drop task management
- ✅ Task modal with full editing
- ✅ Activity logging
- ✅ API key access for AI agents
- ✅ About Me + Settings pages
- ✅ Neon glassmorphic theme
- ✅ Particle background effects
- ✅ Docker deployment

## Related Files

- **ROADMAP.md** — Feature planning, ideas, Q&A log
- **SPEC.md** — Original project specification
- **FEATURE.md** — User auth feature documentation
