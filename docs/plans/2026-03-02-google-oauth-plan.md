# Google OAuth + User Data Persistence — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace email/password auth with Google OAuth (domain-restricted to `@apexrestoration.pro`) and migrate all localStorage UI preferences to server-side storage in the `users.settings` JSON column.

**Architecture:** Frontend uses `@react-oauth/google` to get an ID token via Google's popup. Backend verifies the token with `google-auth-library`, finds/creates the user, and issues a JWT cookie (reusing existing `kanban_session` infrastructure). Zustand stores hydrate from `GET /api/users/me` settings instead of localStorage, and debounce-save back via `PATCH /api/users/me`.

**Tech Stack:** React 19, TypeScript, `@react-oauth/google`, `google-auth-library`, Zustand 5, TanStack Query 5, Express, PostgreSQL

**Design doc:** `docs/plans/2026-03-02-google-oauth-design.md`

---

## Task 1: Install dependencies

**Files:**
- Modify: `backend/package.json`
- Modify: `frontend-next/package.json`

**Step 1: Install backend dependency**

Run from worktree root:
```bash
cd backend && npm install google-auth-library
```

This adds `google-auth-library` for verifying Google ID tokens server-side. Do NOT remove `bcrypt` yet — that happens after the auth route is replaced (Task 3).

**Step 2: Install frontend dependency**

```bash
cd frontend-next && npm install @react-oauth/google
```

This adds the React wrapper for Google Identity Services.

**Step 3: Commit**

```bash
git add backend/package.json backend/package-lock.json frontend-next/package.json frontend-next/package-lock.json
git commit -m "chore: add google-auth-library and @react-oauth/google dependencies"
```

---

## Task 2: Database migrations — add google_id, avatar_url to users, make password_hash nullable

**Files:**
- Modify: `backend/src/db/init.sql` (lines 9-18, users table)

**Step 1: Add migration columns to init.sql**

After the `users` table CREATE and its index (line 19), add these migration statements:

```sql
-- Google OAuth columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
```

These use `IF NOT EXISTS` / `ALTER` patterns consistent with the existing migration style. `password_hash` becomes nullable since Google OAuth users won't have one.

**Step 2: Verify migration runs cleanly**

```bash
cd backend && npm run dev
```

Check logs for no SQL errors. The dev seeded user (`jaker3001@gmail.com`) still has a `password_hash` — that's fine. New Google OAuth users won't.

**Step 3: Commit**

```bash
git add backend/src/db/init.sql
git commit -m "db: add google_id, avatar_url columns; make password_hash nullable"
```

---

## Task 3: Backend — POST /api/auth/google endpoint

**Files:**
- Modify: `backend/src/routes/auth.js` — replace signup/login with Google token verification
- Modify: `backend/src/db/users.js` — add `findOrCreateByGoogle()` function

**Step 1: Add findOrCreateByGoogle to users.js**

In `backend/src/db/users.js`, add this function after `createUser`:

```javascript
async function findOrCreateByGoogle({ googleId, email, name, avatarUrl }) {
  // Try by google_id first (most reliable)
  let user = await db.getOne('SELECT * FROM users WHERE google_id = $1', [googleId]);
  if (user) {
    // Update name/avatar if changed
    await db.run(
      'UPDATE users SET name = $1, avatar_url = $2, updated_at = NOW() WHERE id = $3',
      [name, avatarUrl, user.id]
    );
    user.name = name;
    user.avatar_url = avatarUrl;
    return getSafeUser(user);
  }

  // Try by email (first-time linking for existing account)
  user = await db.getOne('SELECT * FROM users WHERE email = $1', [email]);
  if (user) {
    await db.run(
      'UPDATE users SET google_id = $1, name = $2, avatar_url = $3, updated_at = NOW() WHERE id = $4',
      [googleId, name, avatarUrl, user.id]
    );
    user.google_id = googleId;
    user.name = name;
    user.avatar_url = avatarUrl;
    return getSafeUser(user);
  }

  // New user
  const id = uuid.v4();
  await db.run(
    `INSERT INTO users (id, email, name, role, google_id, avatar_url, settings, created_at, updated_at)
     VALUES ($1, $2, $3, 'field_tech', $4, $5, '{}', NOW(), NOW())`,
    [id, email, name, googleId, avatarUrl]
  );
  return getSafeUser({ id, email, name, role: 'field_tech', google_id: googleId, avatar_url: avatarUrl, settings: '{}' });
}
```

Export it alongside existing functions.

**Step 2: Add POST /api/auth/google route in auth.js**

At the top of `backend/src/routes/auth.js`, add the import:

```javascript
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
```

Add a new route before the existing signup/login routes:

```javascript
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Missing credential' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    // Domain restriction
    const allowedDomain = 'apexrestoration.pro';
    if (!payload.email.endsWith(`@${allowedDomain}`)) {
      return res.status(403).json({
        error: `Access restricted to @${allowedDomain} accounts`,
        code: 'DOMAIN_RESTRICTED',
      });
    }

    const user = await usersDb.findOrCreateByGoogle({
      googleId: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      avatarUrl: payload.picture || null,
    });

    const sessionId = `google:${user.id}:${Date.now()}`;
    const token = generateToken(sessionId, user.id, user.email, true);
    setSessionCookie(res, token, true);

    res.json({ user });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(401).json({ error: 'Google authentication failed' });
  }
});
```

Import `generateToken` and `setSessionCookie` from the auth middleware (they're already available in auth.js — check how login uses them).

**Step 3: Remove old signup and login routes**

Delete or comment out the `POST /signup` and `POST /login` route handlers, and their rate limiters. Keep the `/logout` and `/check` routes unchanged.

Also remove the `bcrypt` import at the top of auth.js if it exists.

**Step 4: Remove bcrypt from backend dependencies**

```bash
cd backend && npm uninstall bcrypt
```

**Step 5: Update the dev user seed in schema.js**

In `backend/src/db/schema.js`, the dev seed creates a user with `password_hash`. Update it to also set `google_id` so the dev user works with the new flow. Change the upsert to:

```javascript
const devEmail = 'jaker3001@gmail.com';
// ... existing seed logic, but add google_id column
```

Actually — since the domain restriction is `@apexrestoration.pro`, the dev seed should use `jake@apexrestoration.pro` instead. Update the seed email accordingly, and the `google_id` can be left null until a real Google login links it.

**Step 6: Verify the endpoint works**

Start the backend:
```bash
cd backend && npm run dev
```

Test with curl (will fail without a real Google token, but verify the route is mounted and returns proper errors):
```bash
curl -X POST http://localhost:3000/api/auth/google -H 'Content-Type: application/json' -d '{"credential":"fake"}'
```

Expected: `401` with `{"error":"Google authentication failed"}`

**Step 7: Commit**

```bash
git add backend/src/routes/auth.js backend/src/db/users.js backend/src/db/schema.js backend/package.json backend/package-lock.json
git commit -m "feat: add Google OAuth login endpoint, remove email/password auth"
```

---

## Task 4: Backend — PATCH /api/users/me settings endpoint

**Files:**
- Modify: `backend/src/routes/users.js` — ensure `PATCH /api/users/me` properly handles deep settings merge

**Step 1: Verify current PATCH /api/users/me handles settings**

Read `backend/src/routes/users.js` and confirm the existing `PATCH /api/users/me` route accepts and persists `settings` as a JSON object. Based on exploration, it already does — it stringifies `data.settings` and saves to the column.

If the existing handler does a full replace of settings (not a deep merge), update it to do a shallow merge at the top level:

```javascript
// In the PATCH /api/users/me handler, when settings is provided:
if (data.settings !== undefined) {
  // Merge with existing settings rather than full replace
  const currentSettings = typeof user.settings === 'string'
    ? JSON.parse(user.settings || '{}')
    : (user.settings || {});
  const merged = { ...currentSettings, ...data.settings };
  updates.push(`settings = $${paramIdx++}`);
  values.push(JSON.stringify(merged));
}
```

This allows the frontend to send partial updates like `{ settings: { sidebar: { collapsed: true } } }` without wiping other settings keys.

**Step 2: Add avatar_url and google_id to the User response**

In `backend/src/db/users.js`, update `getSafeUser()` to include `avatar_url` and `google_id` in the returned object (don't strip them).

**Step 3: Commit**

```bash
git add backend/src/routes/users.js backend/src/db/users.js
git commit -m "feat: merge user settings on PATCH, include avatar_url in response"
```

---

## Task 5: Frontend — GoogleOAuthProvider wrapper in main.tsx

**Files:**
- Modify: `frontend-next/src/main.tsx` (lines 1-29)

**Step 1: Add GoogleOAuthProvider**

Import and wrap the app:

```typescript
import { GoogleOAuthProvider } from '@react-oauth/google'

// In the render tree, wrap BrowserRouter:
<GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
  <BrowserRouter>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </BrowserRouter>
</GoogleOAuthProvider>
```

The provider goes outside BrowserRouter so the Google SDK is available everywhere, including the login page.

**Step 2: Add env var to .env.example or .env**

Create or update `.env` in `frontend-next/`:
```
VITE_GOOGLE_CLIENT_ID=your-google-client-id-here
```

Vite automatically exposes `VITE_`-prefixed env vars to the client.

**Step 3: Commit**

```bash
git add frontend-next/src/main.tsx frontend-next/.env
git commit -m "feat: add GoogleOAuthProvider to React app root"
```

---

## Task 6: Frontend — Rewrite LoginPage.tsx for Google OAuth

**Files:**
- Modify: `frontend-next/src/pages/LoginPage.tsx` (full rewrite, ~60 lines)

**Step 1: Rewrite LoginPage**

Replace the entire file with:

```typescript
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/contexts/ThemeContext'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const { isAuthenticated, loginWithGoogle } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [error, setError] = useState('')

  if (isAuthenticated) return <Navigate to="/" replace />

  async function handleSuccess(response: CredentialResponse) {
    setError('')
    if (!response.credential) {
      setError('No credential received from Google')
      return
    }
    try {
      await loginWithGoogle(response.credential)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  return (
    <div className="min-h-screen bg-bg-app flex items-center justify-center p-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="absolute top-4 right-4 text-text-secondary hover:text-text-primary"
      >
        {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
      </Button>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl text-text-primary">LyfeHub</h1>
          <p className="text-text-secondary text-sm mt-1">Apex Restoration</p>
        </div>

        <div className="bg-bg-surface border border-border rounded-lg p-6 shadow-md space-y-4">
          {error && (
            <div className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => setError('Google sign-in was cancelled or failed')}
              theme={theme === 'dark' ? 'filled_black' : 'outline'}
              size="large"
              width="320"
              text="signin_with"
              shape="rectangular"
            />
          </div>

          <p className="text-text-muted text-xs text-center">
            Restricted to @apexrestoration.pro accounts
          </p>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend-next/src/pages/LoginPage.tsx
git commit -m "feat: replace login form with Google Sign-In button"
```

---

## Task 7: Frontend — Rewrite useAuth Zustand store for Google OAuth

**Files:**
- Modify: `frontend-next/src/hooks/useAuth.ts` (full rewrite)
- Modify: `frontend-next/src/types/user.ts` — update types

**Step 1: Update User type**

In `frontend-next/src/types/user.ts`, replace the file:

```typescript
export interface User {
  id: string
  email: string
  name: string
  role: string
  avatar_url: string | null
  google_id: string | null
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface AuthCheckResponse {
  user: User
}
```

Remove `LoginCredentials`, `SignupData` — they're no longer needed.

**Step 2: Rewrite useAuth store**

Replace `frontend-next/src/hooks/useAuth.ts`:

```typescript
import { create } from 'zustand'
import type { User } from '@/types/user.js'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  checkAuth: () => Promise<void>
  loginWithGoogle: (credential: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  checkAuth: async () => {
    try {
      const res = await fetch('/api/auth/check', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          set({ user: data.user, isAuthenticated: true, isLoading: false })
          return
        }
      }
    } catch {
      // Auth check failed
    }
    set({ user: null, isAuthenticated: false, isLoading: false })
  },

  loginWithGoogle: async (credential: string) => {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ credential }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Login failed' }))
      throw new Error(data.error ?? 'Login failed')
    }
    const data = await res.json()
    set({ user: data.user, isAuthenticated: true })
  },

  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    set({ user: null, isAuthenticated: false })
  },
}))
```

Key changes: removed `login(email, password)`, removed dev fallback auto-login, removed stub user. Added `loginWithGoogle(credential)`.

**Step 3: Update any other files importing LoginCredentials or SignupData**

Search for imports of `LoginCredentials` or `SignupData` and remove them. The React Query auth hooks file (`api/hooks/useAuth.ts`) imports `LoginCredentials` — update it:

In `frontend-next/src/api/hooks/useAuth.ts`, remove the `useLogin` mutation that sends email/password. Replace it with:

```typescript
export function useGoogleLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (credential: string) =>
      apiClient.post<AuthCheckResponse>('/auth/google', { credential }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.check })
    },
  })
}
```

Keep `useCheckAuth` and `useLogout` unchanged. Remove the `LoginCredentials` import.

**Step 4: Commit**

```bash
git add frontend-next/src/hooks/useAuth.ts frontend-next/src/types/user.ts frontend-next/src/api/hooks/useAuth.ts
git commit -m "feat: rewrite auth hooks for Google OAuth, remove email/password flow"
```

---

## Task 8: Frontend — Create useUserSettings hook + debounced save

**Files:**
- Create: `frontend-next/src/hooks/useUserSettings.ts`

**Step 1: Create the hook**

This hook provides a typed interface for reading/writing user settings with debounced persistence to the server.

```typescript
import { useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth.js'
import { apiClient } from '@/api/client.js'

export interface UserSettings {
  sidebar?: {
    collapsed?: boolean
    sections?: Record<string, boolean>
  }
  tasks?: {
    displayMode?: 'list' | 'cards' | 'board' | 'focus'
    cardSize?: 'S' | 'M' | 'L'
    boardGroupBy?: string
    sortBy?: string
    moreOptionsExpanded?: boolean
  }
  calendar?: {
    defaultView?: string
    hiddenCalendarIds?: string[]
  }
  bases?: {
    displayMode?: 'card' | 'list'
    cardSize?: 'small' | 'medium' | 'large'
  }
  mail?: {
    readingPanePosition?: 'right' | 'bottom'
  }
  theme?: 'light' | 'dark'
}

const DEBOUNCE_MS = 500
let debounceTimer: ReturnType<typeof setTimeout> | null = null

// Shared pending update to batch multiple rapid changes
let pendingSettings: Partial<UserSettings> = {}

function flushSettings() {
  if (Object.keys(pendingSettings).length === 0) return
  const toSave = { ...pendingSettings }
  pendingSettings = {}
  apiClient.patch('/users/me', { settings: toSave }).catch((err) => {
    console.error('Failed to save user settings:', err)
  })
}

export function saveSettingsKey<K extends keyof UserSettings>(
  key: K,
  value: UserSettings[K],
) {
  pendingSettings[key] = value
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(flushSettings, DEBOUNCE_MS)
}

export function getUserSettings(): UserSettings {
  const user = useAuth.getState().user
  if (!user || !user.settings) return {}
  if (typeof user.settings === 'string') {
    try { return JSON.parse(user.settings) } catch { return {} }
  }
  return user.settings as UserSettings
}
```

This is deliberately module-level (not a hook with state) so Zustand stores can call `saveSettingsKey()` without being inside a React component. `getUserSettings()` reads from the Zustand auth store directly.

**Step 2: Commit**

```bash
git add frontend-next/src/hooks/useUserSettings.ts
git commit -m "feat: add useUserSettings hook with debounced server persistence"
```

---

## Task 9: Frontend — Migrate sidebarStore from localStorage to server settings

**Files:**
- Modify: `frontend-next/src/stores/sidebarStore.ts` (full rewrite)

**Step 1: Rewrite sidebarStore**

Replace `frontend-next/src/stores/sidebarStore.ts`:

```typescript
import { create } from 'zustand'
import { getUserSettings, saveSettingsKey } from '@/hooks/useUserSettings.js'

interface SidebarState {
  collapsed: boolean
  sectionStates: Record<string, boolean>
  _hydrated: boolean
  hydrate: () => void
  toggleCollapsed: () => void
  toggleSection: (key: string) => void
  isSectionCollapsed: (key: string) => boolean
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  collapsed: false,
  sectionStates: {},
  _hydrated: false,

  hydrate: () => {
    if (get()._hydrated) return
    const settings = getUserSettings()
    set({
      collapsed: settings.sidebar?.collapsed ?? false,
      sectionStates: settings.sidebar?.sections ?? {},
      _hydrated: true,
    })
  },

  toggleCollapsed: () => {
    set((state) => {
      const next = !state.collapsed
      saveSettingsKey('sidebar', {
        collapsed: next,
        sections: state.sectionStates,
      })
      return { collapsed: next }
    })
  },

  toggleSection: (key: string) => {
    set((state) => {
      const next = { ...state.sectionStates, [key]: !state.sectionStates[key] }
      saveSettingsKey('sidebar', {
        collapsed: state.collapsed,
        sections: next,
      })
      return { sectionStates: next }
    })
  },

  isSectionCollapsed: (key: string) => {
    return get().sectionStates[key] ?? false
  },
}))
```

Key changes:
- Removed all `localStorage` calls
- Added `hydrate()` method that reads from `getUserSettings()` (server data via auth store)
- `saveSettingsKey('sidebar', ...)` debounces writes to the server
- `_hydrated` flag prevents double-hydration

**Step 2: Commit**

```bash
git add frontend-next/src/stores/sidebarStore.ts
git commit -m "refactor: migrate sidebarStore from localStorage to server settings"
```

---

## Task 10: Frontend — Migrate tasksUiStore from localStorage to server settings

**Files:**
- Modify: `frontend-next/src/stores/tasksUiStore.ts`

**Step 1: Rewrite tasksUiStore**

Same pattern as sidebarStore. Replace the localStorage load/save functions with `getUserSettings()` and `saveSettingsKey()`:

```typescript
import { create } from 'zustand'
import { getUserSettings, saveSettingsKey } from '@/hooks/useUserSettings.js'

type DisplayMode = 'list' | 'cards' | 'board' | 'focus'
type CardSize = 'S' | 'M' | 'L'
type BoardGroupBy = 'priority' | 'energy' | 'list' | 'location'
type SortBy = 'due' | 'created' | 'custom'

interface TasksUiState {
  displayMode: DisplayMode
  cardSize: CardSize
  boardGroupBy: BoardGroupBy
  sortBy: SortBy
  moreOptionsExpanded: boolean
  selectedTaskId: string | null
  createModalOpen: boolean
  _hydrated: boolean
  hydrate: () => void
  setDisplayMode: (mode: DisplayMode) => void
  setCardSize: (size: CardSize) => void
  setBoardGroupBy: (groupBy: BoardGroupBy) => void
  setSortBy: (sort: SortBy) => void
  setMoreOptionsExpanded: (expanded: boolean) => void
  setSelectedTaskId: (id: string | null) => void
  setCreateModalOpen: (open: boolean) => void
}

function getPersistedFromState(state: TasksUiState) {
  return {
    displayMode: state.displayMode,
    cardSize: state.cardSize,
    boardGroupBy: state.boardGroupBy,
    sortBy: state.sortBy,
    moreOptionsExpanded: state.moreOptionsExpanded,
  }
}

export const useTasksUiStore = create<TasksUiState>((set, get) => ({
  displayMode: 'list',
  cardSize: 'M',
  boardGroupBy: 'priority',
  sortBy: 'due',
  moreOptionsExpanded: false,
  selectedTaskId: null,
  createModalOpen: false,
  _hydrated: false,

  hydrate: () => {
    if (get()._hydrated) return
    const settings = getUserSettings()
    const t = settings.tasks
    set({
      displayMode: (t?.displayMode as DisplayMode) ?? 'list',
      cardSize: (t?.cardSize as CardSize) ?? 'M',
      boardGroupBy: (t?.boardGroupBy as BoardGroupBy) ?? 'priority',
      sortBy: (t?.sortBy as SortBy) ?? 'due',
      moreOptionsExpanded: t?.moreOptionsExpanded ?? false,
      _hydrated: true,
    })
  },

  setDisplayMode: (mode) => {
    set({ displayMode: mode })
    saveSettingsKey('tasks', getPersistedFromState({ ...get(), displayMode: mode }))
  },

  setCardSize: (size) => {
    set({ cardSize: size })
    saveSettingsKey('tasks', getPersistedFromState({ ...get(), cardSize: size }))
  },

  setBoardGroupBy: (groupBy) => {
    set({ boardGroupBy: groupBy })
    saveSettingsKey('tasks', getPersistedFromState({ ...get(), boardGroupBy: groupBy }))
  },

  setSortBy: (sort) => {
    set({ sortBy: sort })
    saveSettingsKey('tasks', getPersistedFromState({ ...get(), sortBy: sort }))
  },

  setMoreOptionsExpanded: (expanded) => {
    set({ moreOptionsExpanded: expanded })
    saveSettingsKey('tasks', getPersistedFromState({ ...get(), moreOptionsExpanded: expanded }))
  },

  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  setCreateModalOpen: (open) => set({ createModalOpen: open }),
}))
```

**Step 2: Commit**

```bash
git add frontend-next/src/stores/tasksUiStore.ts
git commit -m "refactor: migrate tasksUiStore from localStorage to server settings"
```

---

## Task 11: Frontend — Migrate calendarUiStore from localStorage to server settings

**Files:**
- Modify: `frontend-next/src/stores/calendarUiStore.ts`

**Step 1: Rewrite calendarUiStore**

Replace the `persist` middleware with the same `hydrate()` + `saveSettingsKey()` pattern. Only `defaultView` and `hiddenCalendarIds` are persisted (same as before).

```typescript
import { create } from 'zustand'
import { getUserSettings, saveSettingsKey } from '@/hooks/useUserSettings.js'
import type { CalendarViewType } from '@/pages/calendar/utils/calendarConstants.js'

interface CalendarUiState {
  defaultView: CalendarViewType
  setDefaultView: (view: CalendarViewType) => void
  currentView: CalendarViewType
  setCurrentView: (view: CalendarViewType) => void
  selectedDate: string
  setSelectedDate: (date: string) => void
  hiddenCalendarIds: Set<string>
  toggleCalendarVisibility: (calendarId: string) => void
  setCalendarVisible: (calendarId: string, visible: boolean) => void
  _hydrated: boolean
  hydrate: () => void
}

function saveCalendarSettings(state: { defaultView: CalendarViewType; hiddenCalendarIds: Set<string> }) {
  saveSettingsKey('calendar', {
    defaultView: state.defaultView,
    hiddenCalendarIds: Array.from(state.hiddenCalendarIds),
  })
}

export const useCalendarUiStore = create<CalendarUiState>((set, get) => ({
  defaultView: 'month',
  currentView: 'month',
  selectedDate: new Date().toISOString().slice(0, 10),
  hiddenCalendarIds: new Set<string>(),
  _hydrated: false,

  hydrate: () => {
    if (get()._hydrated) return
    const settings = getUserSettings()
    const c = settings.calendar
    const defaultView = (c?.defaultView as CalendarViewType) ?? 'month'
    set({
      defaultView,
      currentView: defaultView,
      hiddenCalendarIds: new Set(c?.hiddenCalendarIds ?? []),
      _hydrated: true,
    })
  },

  setDefaultView: (view) => {
    set({ defaultView: view })
    saveCalendarSettings({ defaultView: view, hiddenCalendarIds: get().hiddenCalendarIds })
  },

  setCurrentView: (view) => set({ currentView: view }),
  setSelectedDate: (date) => set({ selectedDate: date }),

  toggleCalendarVisibility: (calendarId) => {
    set((state) => {
      const next = new Set(state.hiddenCalendarIds)
      if (next.has(calendarId)) next.delete(calendarId)
      else next.add(calendarId)
      saveCalendarSettings({ defaultView: state.defaultView, hiddenCalendarIds: next })
      return { hiddenCalendarIds: next }
    })
  },

  setCalendarVisible: (calendarId, visible) => {
    set((state) => {
      const next = new Set(state.hiddenCalendarIds)
      if (visible) next.delete(calendarId)
      else next.add(calendarId)
      saveCalendarSettings({ defaultView: state.defaultView, hiddenCalendarIds: next })
      return { hiddenCalendarIds: next }
    })
  },
}))
```

**Step 2: Commit**

```bash
git add frontend-next/src/stores/calendarUiStore.ts
git commit -m "refactor: migrate calendarUiStore from localStorage to server settings"
```

---

## Task 12: Frontend — Migrate basesUiStore and mailUiStore from localStorage to server settings

**Files:**
- Modify: `frontend-next/src/stores/basesUiStore.ts`
- Modify: `frontend-next/src/stores/mailUiStore.ts`

**Step 1: Update basesUiStore**

Same pattern. Only `displayMode` and `cardSize` are persisted. Replace `loadPersisted()` / `savePersisted()` with `hydrate()` / `saveSettingsKey('bases', ...)`. All ephemeral state (sort, filters, columns, editing) stays as-is with no persistence.

**Step 2: Update mailUiStore**

Same pattern. Only `readingPanePosition` is persisted. Replace localStorage with `hydrate()` / `saveSettingsKey('mail', ...)`.

**Step 3: Commit**

```bash
git add frontend-next/src/stores/basesUiStore.ts frontend-next/src/stores/mailUiStore.ts
git commit -m "refactor: migrate basesUiStore and mailUiStore from localStorage to server settings"
```

---

## Task 13: Frontend — Migrate ThemeContext to server settings

**Files:**
- Modify: `frontend-next/src/contexts/ThemeContext.tsx`

**Step 1: Update ThemeContext**

Change `getInitialTheme()` to read from user settings (via auth store) with localStorage as fallback for pre-login. On toggle, save to both localStorage (for instant reload) and server settings (for cross-device sync):

```typescript
import { getUserSettings, saveSettingsKey } from '@/hooks/useUserSettings.js'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  // Try server settings first (if user is logged in)
  const settings = getUserSettings()
  if (settings.theme === 'light' || settings.theme === 'dark') return settings.theme
  // Fall back to localStorage for pre-login state
  const stored = localStorage.getItem('lyfehub-theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
```

In `toggleTheme`:
```typescript
const toggleTheme = useCallback(() => {
  setTheme((prev) => {
    const next = prev === 'dark' ? 'light' : 'dark'
    saveSettingsKey('theme', next)
    return next
  })
}, [])
```

Keep the `localStorage.setItem` in the `useEffect` for instant pre-login theming.

**Step 2: Commit**

```bash
git add frontend-next/src/contexts/ThemeContext.tsx
git commit -m "refactor: migrate theme preference to server settings with localStorage fallback"
```

---

## Task 14: Frontend — Hydrate all stores after auth check

**Files:**
- Modify: `frontend-next/src/App.tsx`

**Step 1: Add hydration after auth**

In `App.tsx`, after `checkAuth()` succeeds, call `hydrate()` on all stores:

```typescript
import { useEffect } from 'react'
import { useRoutes } from 'react-router-dom'
import { routes } from '@/router'
import { useAuth } from '@/hooks/useAuth'
import { useSidebarStore } from '@/stores/sidebarStore.js'
import { useTasksUiStore } from '@/stores/tasksUiStore.js'
import { useCalendarUiStore } from '@/stores/calendarUiStore.js'
import { useBasesUiStore } from '@/stores/basesUiStore.js'
import { useMailUiStore } from '@/stores/mailUiStore.js'
import { ErrorBoundary } from '@/components/ErrorBoundary.js'

export default function App() {
  const checkAuth = useAuth((s) => s.checkAuth)
  const isAuthenticated = useAuth((s) => s.isAuthenticated)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (isAuthenticated) {
      useSidebarStore.getState().hydrate()
      useTasksUiStore.getState().hydrate()
      useCalendarUiStore.getState().hydrate()
      useBasesUiStore.getState().hydrate()
      useMailUiStore.getState().hydrate()
    }
  }, [isAuthenticated])

  return (
    <ErrorBoundary>
      {useRoutes(routes)}
    </ErrorBoundary>
  )
}
```

This ensures all stores hydrate from server settings once the user is authenticated, before any page renders.

**Step 2: Commit**

```bash
git add frontend-next/src/App.tsx
git commit -m "feat: hydrate all UI stores from server settings after auth"
```

---

## Task 15: Cleanup — remove old localStorage keys, update CLAUDE.md

**Files:**
- Modify: `frontend-next/src/App.tsx` — add one-time localStorage cleanup
- Modify: `CLAUDE.md` (worktree root) — update auth section

**Step 1: Add localStorage cleanup migration**

In `App.tsx`, add a one-time cleanup in the auth effect:

```typescript
useEffect(() => {
  if (isAuthenticated) {
    // ... hydrate stores ...

    // One-time cleanup of old localStorage keys
    const migrated = localStorage.getItem('lyfehub-settings-migrated')
    if (!migrated) {
      localStorage.removeItem('lyfehub-sidebar-collapsed')
      localStorage.removeItem('lyfehub-sidebar-sections')
      localStorage.removeItem('lyfehub-tasks-ui')
      localStorage.removeItem('lyfehub-calendar-ui')
      localStorage.removeItem('lyfehub-bases-ui')
      localStorage.removeItem('lyfehub-mail-ui')
      localStorage.setItem('lyfehub-settings-migrated', '1')
    }
  }
}, [isAuthenticated])
```

**Step 2: Update CLAUDE.md auth section**

In the worktree `CLAUDE.md`, update the "API Patterns" section item about Auth:

Replace:
```
- **Auth** — Email + password, JWT in httpOnly cookie. API keys (`lh_live_*` prefix) for programmatic access. No OAuth, no magic links.
```

With:
```
- **Auth** — Google OAuth via `@react-oauth/google` (frontend) + `google-auth-library` (backend). Domain-restricted to `@apexrestoration.pro`. JWT in httpOnly `kanban_session` cookie. API keys (`lh_live_*` prefix) for programmatic access. User settings persisted server-side in `users.settings` JSON column.
```

**Step 3: Commit**

```bash
git add frontend-next/src/App.tsx CLAUDE.md
git commit -m "chore: clean up old localStorage keys, update auth docs in CLAUDE.md"
```

---

## Task 16: Verify end-to-end flow

**Step 1: Ensure backend is running**

```bash
docker start lyfehub-dev lyfehub-dev-db
```

**Step 2: Set env vars**

Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in the backend's environment (Docker container or `.env`). Also ensure `VITE_GOOGLE_CLIENT_ID` is set in `frontend-next/.env`.

**Step 3: Start frontend dev server**

```bash
cd frontend-next && npm run dev
```

**Step 4: Manual verification checklist**

- [ ] Visit `http://localhost:5173` — should redirect to `/login`
- [ ] Login page shows Google Sign-In button, no email/password form
- [ ] Click Google Sign-In — popup appears, shows Google accounts
- [ ] Sign in with `@apexrestoration.pro` account — redirects to dashboard
- [ ] Sign in with non-`@apexrestoration.pro` account — shows domain restriction error
- [ ] Dashboard layout loads and persists (move a widget, refresh, confirm it saved)
- [ ] Sidebar collapse state persists (collapse sidebar, refresh, confirm still collapsed)
- [ ] Tasks display mode persists (switch to cards, refresh, confirm still cards)
- [ ] Calendar default view persists (switch to week, refresh, confirm still week)
- [ ] Theme persists (toggle to light, refresh, confirm still light)
- [ ] Logout works — click logout, redirected to login page
- [ ] API keys still work — existing `lh_live_*` keys still authenticate
- [ ] `/api/auth/check` returns user with `avatar_url` and `google_id`

**Step 5: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: end-to-end verification fixes for Google OAuth"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Install deps | package.json (both) |
| 2 | DB migrations | init.sql |
| 3 | Backend auth endpoint | auth.js, users.js, schema.js |
| 4 | Settings merge endpoint | users.js |
| 5 | GoogleOAuthProvider | main.tsx |
| 6 | Login page rewrite | LoginPage.tsx |
| 7 | Auth store rewrite | useAuth.ts, user.ts, api/hooks/useAuth.ts |
| 8 | Settings persistence hook | useUserSettings.ts (new) |
| 9 | Sidebar store migration | sidebarStore.ts |
| 10 | Tasks store migration | tasksUiStore.ts |
| 11 | Calendar store migration | calendarUiStore.ts |
| 12 | Bases + mail store migration | basesUiStore.ts, mailUiStore.ts |
| 13 | Theme migration | ThemeContext.tsx |
| 14 | Store hydration | App.tsx |
| 15 | Cleanup | App.tsx, CLAUDE.md |
| 16 | E2E verification | Manual testing |
