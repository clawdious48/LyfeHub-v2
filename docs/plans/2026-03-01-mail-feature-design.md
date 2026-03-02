# Mail Feature Design — Gmail Integration

**Date:** 2026-03-01
**Status:** Approved
**Branch:** worktree-tech-stack-upgrade

---

## Summary

Add a Mail module to LyfeHub under the Productivity sidebar section. Users connect their Gmail account via OAuth, then compose, read, reply, search, label, and manage email entirely within the app. The backend proxies all Gmail API calls — no email data is stored locally.

---

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Provider | Gmail only | Simpler OAuth, matches user workflow |
| Data model | Proxy only (no local storage) | Zero maintenance, always in sync |
| Layout | 3-column: sidebar labels + message list + reading pane | Power-user efficiency |
| Labels nav | In the app sidebar (contextual section for /mail) | Consistent with architecture |
| Compose | Modal dialog (shadcn Dialog) | Can compose while viewing other emails |
| Hotkeys | Gmail defaults + user-customizable | Familiar starting point, full flexibility |
| Architecture | Backend proxy to Gmail API | Tokens server-side, consistent auth pattern |

---

## OAuth & Token Management

### Google Cloud Setup

- OAuth 2.0 credentials (Web application type)
- Scopes: `gmail.readonly`, `gmail.send`, `gmail.modify`, `gmail.labels`, `contacts.readonly`
- Redirect URI: `{app-url}/api/mail/oauth/callback`

### Token Storage

New `mail_accounts` table:

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| user_id | UUID | FK to users |
| email | VARCHAR | Gmail address |
| access_token | TEXT | Encrypted (AES-256-GCM) |
| refresh_token | TEXT | Encrypted (AES-256-GCM) |
| token_expiry | TIMESTAMP | When access_token expires |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

Encryption key via `MAIL_ENCRYPTION_KEY` env var.

### OAuth Flow

1. User clicks "Connect Gmail" → `GET /api/mail/oauth/authorize`
2. Backend builds Google OAuth URL, redirects user
3. User consents in Google's UI
4. Google redirects to `/api/mail/oauth/callback` with auth code
5. Backend exchanges code for tokens, encrypts, stores in `mail_accounts`
6. Redirects user to `/mail`

### Token Refresh

- Check `token_expiry` before every Gmail API call
- If expired (or within 5 min), refresh using `refresh_token`
- If refresh fails (revoked), return 401 → show "Reconnect Gmail" banner

---

## Backend API Endpoints

All routes at `/api/mail/*`, behind `authMiddleware`. Pure proxy — no email data stored.

### Connection

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/mail/oauth/authorize | Initiate OAuth flow |
| GET | /api/mail/oauth/callback | Handle Google redirect |
| DELETE | /api/mail/oauth/disconnect | Revoke tokens, delete row |
| GET | /api/mail/status | `{ connected, email }` |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/mail/messages | List messages. Query params: `label`, `q`, `maxResults`, `pageToken` |
| GET | /api/mail/messages/:id | Full message (parsed HTML body, headers, attachment metadata) |
| PUT | /api/mail/messages/:id/read | Mark as read |
| PUT | /api/mail/messages/:id/unread | Mark as unread |
| PUT | /api/mail/messages/:id/star | Toggle star |
| PUT | /api/mail/messages/:id/archive | Remove INBOX label |
| PUT | /api/mail/messages/:id/trash | Move to trash |
| PUT | /api/mail/messages/:id/labels | Add/remove labels `{ add: [...], remove: [...] }` |

### Threads

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/mail/threads/:threadId | All messages in thread, chronological order |

### Compose / Reply

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/mail/messages/send | Send email. Accepts JSON or FormData (with attachments) `{ to, cc, bcc, subject, body, inReplyTo?, threadId?, attachments? }` |
| POST | /api/mail/drafts | Save draft |
| GET | /api/mail/drafts | List drafts |
| DELETE | /api/mail/drafts/:id | Delete draft |

### Attachments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/mail/messages/:id/attachments/:attachmentId | Download attachment (proxied) |

Compose attachments: uploaded as `multipart/form-data` with the send request. Backend encodes as base64 MIME parts. Max 25MB total (Gmail limit).

### Labels

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/mail/labels | List all labels (system + custom) |
| POST | /api/mail/labels | Create custom label `{ name, color? }` |
| PUT | /api/mail/labels/:id | Rename/recolor |
| DELETE | /api/mail/labels/:id | Delete custom label |

### Contacts (Autocomplete)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/mail/contacts/suggest?q=partial | Search contacts via Google People API, fallback to recent email history |

### Filters

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/mail/filters | List existing Gmail filters |
| POST | /api/mail/filters | Create filter `{ criteria: { from, to, subject, query, hasAttachment }, action: { addLabel, removeLabel, archive, star, markRead, trash, forward } }` |
| DELETE | /api/mail/filters/:id | Delete filter |

### Search

Search via `q` parameter on `GET /api/mail/messages`. Passes through to Gmail search syntax (`from:alice subject:invoice after:2026/01/01`).

---

## Frontend Architecture

### Route

```
/mail              → MailPage (default to Inbox)
/mail?label=SENT   → Sent view
/mail?label=DRAFTS → Drafts view
/mail?label=xyz    → Custom label view
/mail?q=search     → Search results
```

Single route, query params control the view.

### File Organization

```
pages/
  MailPage.tsx                        ← Top-level: message list + reading pane
  mail/
    components/
      list/
        MailList.tsx                  ← Message/thread list with infinite scroll
        MailListItem.tsx             ← Row: sender, subject, snippet, date, star, thread count badge
        MailListToolbar.tsx          ← Search bar, refresh, filter gear icon
      detail/
        MailDetail.tsx               ← Reading pane container
        MailDetailHeader.tsx         ← From, to, cc, date, subject, label chips
        MailDetailBody.tsx           ← Rendered HTML body (sandboxed iframe)
        MailDetailActions.tsx        ← Reply, Reply All, Forward, Archive, Trash, Label
        MailThread.tsx               ← Thread accordion (latest expanded, older collapsed)
        MailThreadMessage.tsx        ← Single message within a thread
      compose/
        ComposeModal.tsx             ← Compose/reply dialog with Tiptap editor
        AttachmentZone.tsx           ← Drag-and-drop + button for file attachments
        RecipientField.tsx           ← Combobox with contact autocomplete + chips
      settings/
        HotkeySettings.tsx           ← Keyboard shortcut customization panel
        FilterSettings.tsx           ← Gmail filter list + create/delete
      ConnectGmailPrompt.tsx         ← "Connect your Gmail" onboarding card
    utils/
      mailConstants.ts               ← System label IDs, icons, colors, default hotkeys
      mailHelpers.ts                 ← Date formatting, snippet truncation, email parsing
```

### Sidebar Integration

Add `/mail` key to `contextualSections` in `sidebarConfig.ts`:

- Compose button (action, opens ComposeModal)
- Inbox (with unread count badge)
- Starred
- Sent
- Drafts
- Trash
- Separator
- Custom Labels (dynamic, fetched from `GET /api/mail/labels`)

Uses a custom `component` (like `BaseSidebarContent`) for the dynamic label list.

### Data Fetching (TanStack Query)

Hooks in `api/hooks/useMail.ts`:

| Hook | Endpoint | Notes |
|------|----------|-------|
| useMailStatus() | GET /api/mail/status | Connection state |
| useMailMessages(label, q) | GET /api/mail/messages | Paginated, infinite query |
| useMailThread(threadId) | GET /api/mail/threads/:threadId | All messages in thread |
| useMailMessage(id) | GET /api/mail/messages/:id | Single full message |
| useMailLabels() | GET /api/mail/labels | For sidebar + label picker |
| useMailContacts(q) | GET /api/mail/contacts/suggest | Debounced, for autocomplete |
| useMailFilters() | GET /api/mail/filters | For filter settings panel |
| useSendMail() | POST /api/mail/messages/send | Mutation (FormData) |
| useArchiveMail() | PUT .../:id/archive | Optimistic update |
| useTrashMail() | PUT .../:id/trash | Optimistic update |
| useToggleStar() | PUT .../:id/star | Optimistic update |
| useToggleRead() | PUT .../:id/read or /unread | Optimistic update |
| useUpdateLabels() | PUT .../:id/labels | Optimistic update |
| useSaveDraft() | POST /api/mail/drafts | Mutation |
| useCreateFilter() | POST /api/mail/filters | Mutation |
| useDeleteFilter() | DELETE /api/mail/filters/:id | Mutation |

### Thread View

- Message list groups by thread: shows thread subject, most recent sender, message count badge
- Reading pane shows thread as collapsible accordion
- Latest message expanded by default, older messages collapsed (one-line: sender + date)
- Click to expand/collapse any message
- Reply/reply-all passes `threadId` + `inReplyTo` to maintain threading

### Rich Text Editor (Tiptap)

- Headless editor for full control over styling
- Toolbar: Bold, Italic, Underline, Strikethrough, Bullet list, Numbered list, Link, Code block, Blockquote
- Output as HTML (Gmail API expects HTML body)
- No inline image embedding — use attachments

### Contact Autocomplete

- To/Cc/Bcc fields use combobox (shadcn Popover + Command)
- Type to search → debounced 300ms → suggestions from People API
- Selected contacts render as removable chips
- Requires `contacts.readonly` OAuth scope

### Attachments

- ComposeModal includes drag-and-drop zone + "Attach" button
- File list shows name, size, type with remove button
- Total size validated against 25MB Gmail limit
- Progress bar during upload
- Reading pane shows attachment metadata with download links
- Downloads proxied through backend

### HTML Email Rendering

- `<iframe>` with `sandbox="allow-same-origin"` (no `allow-scripts`)
- Server-side stripping of dangerous tags (script, form, etc.)
- Images loaded normally (single-user app, no proxy needed)

### Filters / Rules

- Proxied through Gmail's server-side filter system
- Settings panel: list active filters, create new, delete
- Create filter form: criteria (from, to, subject, query, hasAttachment) + actions (addLabel, removeLabel, archive, star, markRead, trash, forward)
- Filters execute server-side in Gmail — apply even outside LyfeHub

---

## Hotkey System

### Default Keymap

| Key | Action | Context |
|-----|--------|---------|
| j / k | Next / previous message | Message list focused |
| o / Enter | Open selected message | Message list focused |
| u | Back to message list | Reading pane focused |
| e | Archive | Message selected/open |
| # | Trash | Message selected/open |
| r | Reply | Message open |
| a | Reply all | Message open |
| f | Forward | Message open |
| s | Toggle star | Message selected/open |
| Shift+I | Mark as read | Message selected/open |
| Shift+U | Mark as unread | Message selected/open |
| c | Compose new | Anywhere on Mail page |
| / | Focus search bar | Anywhere on Mail page |
| Escape | Close compose / back | Context-dependent |
| l | Open label picker | Message selected/open |
| g then i | Go to Inbox | Anywhere (two-key chord) |
| g then s | Go to Starred | Anywhere (two-key chord) |
| g then d | Go to Drafts | Anywhere (two-key chord) |
| g then t | Go to Sent | Anywhere (two-key chord) |

### Customization

- Settings panel accessible from mail toolbar gear icon or app Settings page
- Custom keybindings stored in `mail_hotkeys` column on `mail_accounts` table (JSON)
- Null = use default. User only stores overrides.
- `useMailHotkeys()` hook: loads defaults, merges overrides, registers scoped listeners
- Two-key chords (g then x) with short timeout
- Conflict detection warns before saving

### Focus Management

- Message list focused: j/k navigate, Enter opens
- Reading pane focused: action keys work on current message
- Compose modal open: all mail hotkeys disabled (typing priority)
- Tab moves focus between list → reading pane → toolbar

---

## Responsive Layout

| Breakpoint | Layout |
|------------|--------|
| Desktop (>1024px) | Sidebar + message list + reading pane |
| Tablet (768-1024px) | Sidebar collapsed to icons + message list + reading pane |
| Mobile (<768px) | Message list only; tap opens full-screen reading view; compose is full-screen modal |

---

## Edge Cases

- **No Gmail connected**: Show `ConnectGmailPrompt` card with single "Connect Gmail" button
- **Token revoked**: Non-intrusive banner "Gmail disconnected. [Reconnect]"
- **Gmail API rate limits**: Toast "Too many requests, try again in a moment"
- **Large threads**: Latest message loaded immediately, older messages loaded on expand
- **Pagination**: Infinite scroll using Gmail's `nextPageToken`
- **Stale data**: Auto-refresh every 60 seconds via `refetchInterval`. Manual refresh button.

---

## NOT in v1

- Batch operations (select multiple → archive all)
- Email signatures
- Snooze
- Inline image embedding in compose (use attachments)

---

## New Dependencies

### Backend
- `googleapis` — Google APIs Node.js client (Gmail API + People API)
- No new DB beyond the `mail_accounts` table + `mail_hotkeys` column

### Frontend
- `@tiptap/react` + `@tiptap/starter-kit` + `@tiptap/extension-link` — Rich text editor
- No other new packages (shadcn components cover the rest)

---

## Environment Variables (New)

| Variable | Description |
|----------|-------------|
| GOOGLE_CLIENT_ID | OAuth 2.0 client ID |
| GOOGLE_CLIENT_SECRET | OAuth 2.0 client secret |
| GOOGLE_REDIRECT_URI | OAuth callback URL |
| MAIL_ENCRYPTION_KEY | AES-256-GCM key for token encryption |
