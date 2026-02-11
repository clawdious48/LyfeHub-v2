# Feature: User Authentication & Multi-Tenancy

## Overview

Add proper user accounts with signup/login, replacing the shared password system. Each user's data is isolated — they only see their own tasks and projects.

## Requirements

1. **Signup/Login** — email + password (no OAuth, no magic links)
2. **Profile page** — view/edit name, change password, future settings
3. **Data isolation** — users only see their own tasks
4. **Consistent styling** — same neon glassmorphic theme
5. **Keep API key access** — Sarah (agent) still needs system access

## Database Changes

### New: `users` table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  settings TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_users_email ON users(email);
```

### Modify: `tasks` table
```sql
ALTER TABLE tasks ADD COLUMN user_id TEXT REFERENCES users(id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
```

## API Changes

### Auth Routes (`/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/signup` | Create account (email, password, name) |
| POST | `/login` | Login (email, password) → JWT cookie |
| POST | `/logout` | Clear session |
| GET | `/check` | Check if authenticated |

### User Routes (`/api/users`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/me` | Get current user profile |
| PATCH | `/me` | Update name, settings |
| PUT | `/me/password` | Change password |

### Task Routes (modified)

All existing routes unchanged, but:
- Middleware extracts `userId` from JWT
- All queries filter by `user_id`
- Creating tasks auto-sets `user_id`

## Frontend Changes

### Login Page (update existing)
- Two modes: Login / Sign Up (tab toggle)
- Login: email + password
- Signup: name + email + password + confirm password
- Same glassmorphic styling

### Profile Page (new)
- Header with user name
- Edit name field
- Change password section
- Logout button
- Future: theme settings, preferences

### Main App
- Add profile icon/link in header
- No other changes (data auto-filters)

## JWT Payload

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "sessionId": "ui:uuid",
  "iat": 1234567890
}
```

## Migration Strategy

1. Add `users` table
2. Add `user_id` column to tasks (nullable initially)
3. Existing orphan tasks: delete them (just test data)
4. New tasks require user_id

## Security

- Passwords hashed with bcrypt (cost factor 12)
- JWT in httpOnly cookie (existing pattern)
- API key access bypasses user auth (system access)
- Rate limiting on signup (prevent spam accounts)

## Acceptance Criteria

- [ ] Can sign up with email/password
- [ ] Can log in with email/password
- [ ] Can view/edit profile (name)
- [ ] Can change password
- [ ] Users only see their own tasks
- [ ] Creating task auto-assigns to current user
- [ ] API key still works for agent access
- [ ] Styling matches existing app
- [ ] Login page has signup option
- [ ] Profile page exists and works
