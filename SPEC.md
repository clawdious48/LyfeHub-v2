# Kanban Board - Project Spec

A collaborative kanban board for Jake and his AI assistant (Sarah/Clawdbot).

## Purpose
- Jake adds tasks to the board via UI
- AI picks up tasks from "Ready" queue via API (cron job)
- Track progress across columns: Backlog → Ready → In Progress → Blocked → Review → Done

## Architecture

### Backend (Node/Express)
- REST API for task CRUD
- SQLite database (persisted via Docker volume)
- JWT auth for UI sessions
- Bearer token auth for API access

### Frontend (Vanilla JS)
- Login page (single password)
- Kanban board with drag-and-drop
- Task creation/editing modal
- Clean, modern aesthetic

### Docker
- Single container serving both API and static frontend
- Volume for SQLite persistence
- Environment variables for secrets

## API Endpoints

```
POST   /api/auth/login          # Login, returns JWT cookie
POST   /api/auth/logout         # Clear session

GET    /api/tasks               # List all (filter: ?status=ready)
POST   /api/tasks               # Create task
GET    /api/tasks/:id           # Get single task
PATCH  /api/tasks/:id           # Update task
DELETE /api/tasks/:id           # Delete task
POST   /api/tasks/:id/pick      # Claim task (sets status=in_progress, records session_id)
POST   /api/tasks/:id/complete  # Mark complete (sets status=review)
```

## Task Schema

```json
{
  "id": "uuid",
  "title": "string",
  "description": "string (markdown supported)",
  "acceptance_criteria": ["string array"],
  "status": "backlog|ready|in_progress|blocked|review|done",
  "priority": "number (lower = higher priority)",
  "context_links": ["url strings"],
  "notes": "string (for updates/blockers)",
  "session_id": "string (sub-agent session when picked)",
  "created_at": "ISO timestamp",
  "updated_at": "ISO timestamp",
  "completed_at": "ISO timestamp or null"
}
```

## Auth

### UI Login
- Single password (no username)
- ENV: `KANBAN_PASSWORD`
- Returns JWT in httpOnly cookie
- Session expiry: 7 days

### API Access
- Bearer token in Authorization header
- ENV: `KANBAN_API_KEY`
- Used by Clawdbot for programmatic access

## Environment Variables

```env
KANBAN_PASSWORD=ui-login-password
KANBAN_API_KEY=api-bearer-token
JWT_SECRET=random-secret-for-signing
PORT=3000
```

## UI Requirements

### Login Page
- Clean, centered form
- Password input + submit
- Error handling for wrong password

### Kanban Board
- 6 columns: Backlog, Ready, In Progress, Blocked, Review, Done
- Drag and drop between columns
- Click task to view/edit details
- "Add Task" button → modal form
- Task cards show: title, priority indicator, status badge
- Responsive (works on mobile)

### Task Modal
- Title (required)
- Description (textarea, markdown)
- Acceptance Criteria (add/remove items)
- Priority (1-5 dropdown)
- Context Links (add/remove URLs)
- Notes (textarea)
- Status (dropdown)
- Delete button with confirmation

## Color Scheme
- Clean whites/grays for background
- Column headers: subtle color coding
- Priority: visual indicator (dots or color)
- Modern, minimal aesthetic
