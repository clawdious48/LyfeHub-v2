# Kanban Board

A collaborative kanban board for managing tasks between humans and AI assistants.

## Features

- **6-column workflow**: Backlog → Ready → In Progress → Blocked → Review → Done
- **Dual authentication**: Password-based UI login + Bearer token API access
- **Drag-and-drop interface**: Intuitive task management
- **AI integration**: API endpoints for Clawdbot to pick up and complete tasks
- **SQLite persistence**: Lightweight, file-based database
- **Docker-ready**: Single container deployment

---

## Quick Start

### 1. Clone and Configure

```bash
cd kanban-board

# Create environment file from template
cp .env.example .env

# Generate secure secrets
echo "KANBAN_PASSWORD=$(openssl rand -base64 24)" >> .env
echo "KANBAN_API_KEY=$(openssl rand -hex 32)" >> .env
echo "JWT_SECRET=$(openssl rand -hex 64)" >> .env
```

### 2. Launch with Docker Compose

```bash
# Build and start
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f kanban
```

### 3. Access the Board

Open **http://localhost:3000** and log in with your `KANBAN_PASSWORD`.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `KANBAN_PASSWORD` | ✅ | - | Password for web UI login |
| `KANBAN_API_KEY` | ✅ | - | Bearer token for API access |
| `JWT_SECRET` | ✅ | - | Secret for signing JWT tokens |
| `PORT` | ❌ | `3000` | Server port |
| `DB_PATH` | ❌ | `/data/kanban.db` | SQLite database path |
| `JWT_EXPIRY` | ❌ | `7d` | Token expiration time |
| `COOKIE_SECURE` | ❌ | `true` | Secure cookie flag (disable for HTTP) |

### Generating Secrets

```bash
# Strong password (24 chars)
openssl rand -base64 24

# API key (64 hex chars)
openssl rand -hex 32

# JWT secret (128 hex chars)
openssl rand -hex 64
```

---

## API Reference

### Authentication

**UI Sessions (Web Interface)**
- Login via web form with `KANBAN_PASSWORD`
- JWT stored in httpOnly cookie
- Sessions expire after 7 days

**API Access (Clawdbot/Scripts)**
- Use Bearer token in Authorization header
- Token value is `KANBAN_API_KEY` from environment

```bash
# API requests require this header
Authorization: Bearer your-api-key-here
```

### Endpoints

#### Health Check
```bash
GET /api/health
# Returns: { "status": "ok", "timestamp": "..." }
```

#### Authentication
```bash
# Login (returns JWT cookie)
POST /api/auth/login
Content-Type: application/json
{ "password": "your-password" }

# Logout (clears cookie)
POST /api/auth/logout
```

#### Tasks

```bash
# List all tasks
GET /api/tasks

# Filter by status
GET /api/tasks?status=ready

# Get single task
GET /api/tasks/:id

# Create task
POST /api/tasks
Content-Type: application/json
{
  "title": "Task title",
  "description": "Markdown description",
  "priority": 1,
  "status": "backlog"
}

# Update task
PATCH /api/tasks/:id
Content-Type: application/json
{ "status": "in_progress", "notes": "Working on it" }

# Delete task
DELETE /api/tasks/:id

# Pick task (AI claims it)
POST /api/tasks/:id/pick
Content-Type: application/json
{ "session_id": "agent:main:subagent:abc123" }

# Complete task (move to review)
POST /api/tasks/:id/complete
Content-Type: application/json
{ "notes": "Completed. See PR #42" }
```

### Task Schema

```json
{
  "id": "uuid",
  "title": "string",
  "description": "string (markdown)",
  "acceptance_criteria": ["criterion 1", "criterion 2"],
  "status": "backlog|ready|in_progress|blocked|review|done",
  "priority": 1,
  "context_links": ["https://..."],
  "notes": "string",
  "session_id": "agent session that picked this task",
  "created_at": "2025-01-27T00:00:00.000Z",
  "updated_at": "2025-01-27T00:00:00.000Z",
  "completed_at": null
}
```

---

## Example API Usage

### cURL Examples

```bash
API_KEY="your-api-key-here"
BASE="http://localhost:3000/api"

# List ready tasks
curl -s -H "Authorization: Bearer $API_KEY" "$BASE/tasks?status=ready" | jq

# Create a new task
curl -s -X POST -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Fix login bug","description":"Users report 500 error on login","priority":1,"status":"ready"}' \
  "$BASE/tasks" | jq

# Pick up a task (as AI agent)
curl -s -X POST -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"agent:main:subagent:task-worker-123"}' \
  "$BASE/tasks/TASK_ID/pick" | jq

# Update task with notes
curl -s -X PATCH -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"notes":"Found the issue - null pointer in auth middleware"}' \
  "$BASE/tasks/TASK_ID" | jq

# Complete task
curl -s -X POST -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"notes":"Fixed in commit abc123. Tested locally."}' \
  "$BASE/tasks/TASK_ID/complete" | jq
```

### Node.js Example

```javascript
const API_KEY = process.env.KANBAN_API_KEY;
const BASE = 'http://localhost:3000/api';

async function getReadyTasks() {
  const res = await fetch(`${BASE}/tasks?status=ready`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` }
  });
  return res.json();
}

async function pickTask(taskId, sessionId) {
  const res = await fetch(`${BASE}/tasks/${taskId}/pick`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ session_id: sessionId })
  });
  return res.json();
}
```

---

## Clawdbot Integration

### How It Works

1. **Jake adds tasks** via the web UI, setting status to "Ready"
2. **Clawdbot polls** the `/api/tasks?status=ready` endpoint (via cron)
3. **AI picks a task** using `/api/tasks/:id/pick` with its session ID
4. **AI works on the task** and updates notes as needed
5. **AI completes** using `/api/tasks/:id/complete`
6. **Jake reviews** in the UI and moves to Done (or back to Ready)

### Clawdbot Cron Setup

Add to `crons.json`:

```json
{
  "task-picker": {
    "schedule": "*/30 * * * *",
    "prompt": "Check the kanban board for ready tasks. Pick one if available and work on it.",
    "channel": "telegram"
  }
}
```

### Task Workflow

```
┌─────────┐   ┌─────────┐   ┌─────────────┐   ┌─────────┐   ┌────────┐   ┌──────┐
│ Backlog │ → │  Ready  │ → │ In Progress │ → │ Blocked │ → │ Review │ → │ Done │
└─────────┘   └─────────┘   └─────────────┘   └─────────┘   └────────┘   └──────┘
     │              │              │                             ↑
     │              │              └─────────────────────────────┘
     │              │                     (AI completes)
     │              └── AI picks ──────────────┘
     │
     └── Human queues ─────────┘
```

---

## Docker Management

### Common Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build

# View logs
docker-compose logs -f

# Shell into container
docker-compose exec kanban sh

# Backup database
docker cp kanban-board:/data/kanban.db ./backup.db
```

### Data Persistence

SQLite database is stored in a Docker volume (`kanban-data`).

```bash
# List volumes
docker volume ls | grep kanban

# Inspect volume
docker volume inspect kanban-board_kanban-data

# Backup volume data
docker run --rm -v kanban-board_kanban-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/kanban-backup.tar.gz /data
```

### Reverse Proxy (Traefik)

Uncomment the Traefik labels in `docker-compose.yml` and configure:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.kanban.rule=Host(`kanban.yourdomain.com`)"
  - "traefik.http.routers.kanban.entrypoints=websecure"
  - "traefik.http.routers.kanban.tls.certresolver=letsencrypt"
```

---

## Development

### Local Development (No Docker)

```bash
cd backend
npm install
npm run dev  # nodemon with hot reload
```

### Project Structure

```
kanban-board/
├── backend/
│   ├── src/
│   │   ├── index.js        # Express app entry
│   │   ├── db/             # SQLite setup
│   │   ├── middleware/     # Auth middleware
│   │   └── routes/         # API routes
│   └── package.json
├── frontend/
│   ├── index.html          # Login page
│   ├── board.html          # Kanban board
│   ├── css/
│   └── js/
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs kanban

# Verify .env file exists
ls -la .env

# Check environment variables
docker-compose config
```

### Can't connect to localhost:3000

```bash
# Check if container is running
docker-compose ps

# Check port binding
docker port kanban-board

# Test health endpoint
curl http://localhost:3000/api/health
```

### Database issues

```bash
# Check database file
docker-compose exec kanban ls -la /data/

# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d
```

### Authentication failing

- **UI login**: Verify `KANBAN_PASSWORD` in `.env`
- **API access**: Verify `KANBAN_API_KEY` and include `Bearer ` prefix
- **JWT errors**: Regenerate `JWT_SECRET` and restart

---

## License

MIT
