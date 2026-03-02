# Google OAuth Login + User Data Persistence

**Date:** 2026-03-02
**Status:** Approved

## Summary

Replace email/password authentication with Google OAuth as the sole login method. Domain-restricted to `@apexrestoration.pro`. Migrate localStorage-based UI preferences to server-side storage so all user customizations persist across devices.

## Authentication Flow

**Approach:** Google Identity Services (GIS) via `@react-oauth/google` (frontend) + `google-auth-library` (backend verification).

1. User visits app -> redirected to `/login` if no valid JWT cookie
2. Login page shows a single "Sign in with Google" button
3. Google popup -> user selects `@apexrestoration.pro` account -> ID token returned
4. Frontend `POST /api/auth/google` with the ID token
5. Backend verifies token with `google-auth-library`, extracts email/name/picture
6. Backend checks `email.endsWith('@apexrestoration.pro')` -- rejects others
7. Backend finds or creates user in `users` table (matched by `google_id` or email)
8. Backend issues JWT cookie (same `kanban_session` pattern as today)
9. Frontend redirects to dashboard

**Removed:** Email/password signup/login routes, bcrypt dependency, signup form.
**Kept:** JWT cookie middleware (unchanged), API key auth for programmatic access.

## Incremental Google Scopes

Login requests only `openid profile email`. Additional scopes (Calendar, Gmail) are requested when the user first accesses those features.

**Token storage:** Consolidate `google_calendar_connections` into a new `google_connections` table:

```sql
google_connections (
  id           TEXT PRIMARY KEY,
  user_id      TEXT REFERENCES users(id),
  scopes       TEXT[],
  access_token TEXT (encrypted),
  refresh_token TEXT (encrypted),
  token_expiry TIMESTAMPTZ,
  created_at   TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ
)
```

**Scope upgrade flow:**
1. User opens Calendar page -> app checks if calendar scope granted
2. If not -> "Connect Google Calendar" button shown
3. Button triggers Google OAuth popup with incremental scope + `include_granted_scopes: true`
4. Backend exchanges code for tokens, stores in `google_connections`
5. Feature data loads

## Database Changes

**`users` table modifications:**
- Add `google_id TEXT UNIQUE` -- Google's sub identifier
- Add `avatar_url TEXT` -- Google profile picture
- `password_hash` becomes nullable

**New table:** `google_connections` (replaces `google_calendar_connections`)

## User Data Persistence

### Dashboard Layout
Already server-persisted in `dashboard_layouts` table by `user_id`. No changes needed.

### UI Preferences (migrated from localStorage to server)
Move to `users.settings` JSON column:

```typescript
interface UserSettings {
  sidebar?: {
    collapsed: boolean
    sections: Record<string, boolean>
  }
  tasks?: {
    displayMode: 'list' | 'cards' | 'board' | 'focus'
    cardSize: 'S' | 'M' | 'L'
    boardGroupBy: string
    sortBy: string
  }
  calendar?: {
    defaultView: string
    hiddenCalendarIds: string[]
  }
  bases?: {
    displayMode: 'list' | 'cards'
    cardSize: 'S' | 'M' | 'L'
  }
}
```

Zustand stores hydrate from `/api/users/me` on app load. Writes debounce to `PATCH /api/users/me` (500ms).

## Login Page UI

- Centered glassmorphic card with LyfeHub logo
- Single "Sign in with Google" branded button
- Apex Restoration branding
- Error message for non-`@apexrestoration.pro` emails
- No signup form, password fields, or remember-me

## Dependencies

| Add | Remove |
|-----|--------|
| `@react-oauth/google` (frontend) | `bcrypt` |
| `google-auth-library` (backend) | |

## Environment Variables

- `GOOGLE_CLIENT_ID` -- Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` -- Google OAuth client secret (for token exchange)
- Both may already exist for calendar integration

## Decisions

- **Domain restriction:** `@apexrestoration.pro` only
- **OAuth approach:** Google Identity Services (frontend popup)
- **Scope strategy:** Incremental consent (profile at login, Calendar/Gmail on demand)
- **UI pref storage:** Server-side via `users.settings` JSON column
- **Existing infra kept:** JWT cookies, API keys, auth middleware
