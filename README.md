# LyfeHub

A personal productivity platform with a neon glassmorphic UI. Manages projects, tasks, calendar events, contacts, custom databases, and water damage restoration jobs (Apex).

## Modules

- **Apex** — Job management for water damage restoration (estimates, phases, drying logs, payments, CRM)
- **Projects** — Project tracking with goals and milestones
- **Tasks** — Task boards with lists, tags, and work sessions
- **Calendar** — Event scheduling with calendar views
- **People/CRM** — Contact management with groups
- **Bases** — Notion-style custom databases with relations, views, and formulas

## Tech Stack

- **Backend:** Node 20, Express, PostgreSQL
- **Frontend:** Vanilla JS (no framework, no bundler)
- **Deployment:** Docker (multi-stage Alpine build)

## Quick Start

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env — set JWT_SECRET and DB_PASSWORD at minimum

# 2. Launch with Docker Compose
docker-compose up -d --build

# 3. Access the app
open http://localhost:3000
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes | — | Secret for signing JWT tokens |
| `DB_HOST` | Yes | `db` | PostgreSQL host |
| `DB_PORT` | Yes | `5432` | PostgreSQL port |
| `DB_NAME` | Yes | `lyfehub` | PostgreSQL database name |
| `DB_USER` | Yes | `lyfehub` | PostgreSQL user |
| `DB_PASSWORD` | Yes | — | PostgreSQL password |
| `PORT` | No | `3000` | Server port |
| `NODE_ENV` | No | `production` | Node environment |
| `JWT_EXPIRY` | No | `7d` | Token expiration time |
| `COOKIE_SECURE` | No | `true` | Secure cookie flag |

## Development

```bash
# Local development (no Docker — requires external PostgreSQL)
cd backend && npm install && npm run dev

# Docker development
docker-compose up -d --build
docker-compose logs -f

# Production deployment
docker-compose -f docker-compose.prod.yml up -d --build
```

## License

MIT
