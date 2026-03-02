# Mail Feature (Gmail Integration) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a fully functional Gmail client under the Productivity sidebar section, allowing users to compose, read, reply, search, label, thread-view, attach files, autocomplete contacts, and manage Gmail filters — all from within LyfeHub.

**Architecture:** Backend proxy pattern — Node/Express routes at `/api/mail/*` proxy all calls to Gmail API using server-side OAuth tokens (encrypted in PostgreSQL). Frontend follows the same React + TanStack Query + Zustand pattern as Jobs/Bases modules. No email data stored locally — pure pass-through.

**Tech Stack:** googleapis (backend), @tiptap/react + @tiptap/starter-kit + @tiptap/extension-link (frontend rich text), existing shadcn/ui components, Zustand for UI state, TanStack Query for data fetching.

**Design doc:** `docs/plans/2026-03-01-mail-feature-design.md`

---

## Task 1: Install Backend Dependencies

**Files:**
- Modify: `backend/package.json`

**Step 1: Install googleapis**

```bash
cd backend && npm install googleapis
```

This is the only new backend dependency. It provides the Gmail API and People API clients.

**Step 2: Verify installation**

```bash
cd backend && node -e "const { google } = require('googleapis'); console.log('googleapis loaded, version:', typeof google.gmail)"
```

Expected: `googleapis loaded, version: function`

**Step 3: Commit**

```bash
git add backend/package.json backend/package-lock.json
git commit -m "chore(backend): add googleapis dependency for Gmail integration"
```

---

## Task 2: Database Schema — mail_accounts Table

**Files:**
- Modify: `backend/src/db/init.sql` (append new table)

**Step 1: Add the mail_accounts table to init.sql**

Append this at the end of `backend/src/db/init.sql`:

```sql
-- ============================================
-- MAIL ACCOUNTS (Gmail OAuth tokens)
-- ============================================
CREATE TABLE IF NOT EXISTS mail_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMPTZ NOT NULL,
  hotkeys TEXT DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mail_accounts_user_id ON mail_accounts(user_id);
```

Note: Tokens are encrypted at the application layer (AES-256-GCM) before storing. The column type is TEXT to hold the encrypted ciphertext. The `hotkeys` column stores user's custom keyboard shortcut overrides as JSON.

**Step 2: Verify by starting the backend**

```bash
cd backend && docker restart lyfehub-dev
docker logs lyfehub-dev --tail 20
```

Expected: No errors, "Database initialized successfully" in logs.

**Step 3: Verify table exists**

```bash
docker exec lyfehub-dev-db psql -U lyfehub -d lyfehub -c "\d mail_accounts"
```

Expected: Table schema displayed with id, user_id, email, access_token, refresh_token, token_expiry, hotkeys, created_at, updated_at columns.

**Step 4: Commit**

```bash
git add backend/src/db/init.sql
git commit -m "feat(db): add mail_accounts table for Gmail OAuth token storage"
```

---

## Task 3: Token Encryption Utilities

**Files:**
- Create: `backend/src/lib/encryption.ts`

**Step 1: Create the encryption module**

Create `backend/src/lib/encryption.ts`:

```typescript
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16

function getKey(): Buffer {
  const key = process.env.MAIL_ENCRYPTION_KEY
  if (!key) {
    throw new Error('MAIL_ENCRYPTION_KEY environment variable is required for mail features')
  }
  // Hash the key to ensure it's exactly 32 bytes
  return crypto.createHash('sha256').update(key).digest()
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const tag = cipher.getAuthTag()
  // Format: iv:tag:ciphertext (all hex)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`
}

export function decrypt(encoded: string): string {
  const key = getKey()
  const parts = encoded.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format')
  }
  const iv = Buffer.from(parts[0], 'hex')
  const tag = Buffer.from(parts[1], 'hex')
  const encrypted = parts[2]
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
```

**Step 2: Verify it works**

```bash
cd backend && MAIL_ENCRYPTION_KEY=test-key-123 npx tsx -e "
const { encrypt, decrypt } = require('./src/lib/encryption');
const original = 'ya29.fake-access-token';
const enc = encrypt(original);
console.log('encrypted:', enc.substring(0, 40) + '...');
const dec = decrypt(enc);
console.log('decrypted:', dec);
console.log('match:', dec === original);
"
```

Expected: `match: true`

**Step 3: Commit**

```bash
git add backend/src/lib/encryption.ts
git commit -m "feat(backend): add AES-256-GCM encryption utilities for OAuth tokens"
```

---

## Task 4: Gmail Service — Core API Wrapper

**Files:**
- Create: `backend/src/lib/gmailService.ts`

This module wraps the googleapis library and handles OAuth client creation, token refresh, and all Gmail API calls. All other route files call through this service — they never touch googleapis directly.

**Step 1: Create the Gmail service**

Create `backend/src/lib/gmailService.ts`:

```typescript
import { google, type gmail_v1 } from 'googleapis'
import { encrypt, decrypt } from './encryption'

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://www.googleapis.com/auth/contacts.readonly',
]

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  )
}

export function getAuthUrl(state: string): string {
  const oauth2Client = getOAuth2Client()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state,
  })
}

export async function exchangeCode(code: string): Promise<{
  accessToken: string
  refreshToken: string
  expiry: Date
  email: string
}> {
  const oauth2Client = getOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Failed to obtain tokens from Google')
  }

  oauth2Client.setCredentials(tokens)
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
  const profile = await gmail.users.getProfile({ userId: 'me' })

  return {
    accessToken: encrypt(tokens.access_token),
    refreshToken: encrypt(tokens.refresh_token),
    expiry: new Date(tokens.expiry_date || Date.now() + 3600000),
    email: profile.data.emailAddress || '',
  }
}

interface StoredTokens {
  id: string
  accessToken: string
  refreshToken: string
  tokenExpiry: Date
}

async function getAuthenticatedClient(
  tokens: StoredTokens,
  onRefresh: (newAccessToken: string, newExpiry: Date) => Promise<void>,
) {
  const oauth2Client = getOAuth2Client()

  const accessToken = decrypt(tokens.accessToken)
  const refreshToken = decrypt(tokens.refreshToken)

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: new Date(tokens.tokenExpiry).getTime(),
  })

  // Check if token needs refresh (within 5 minutes of expiry)
  const now = Date.now()
  const expiryTime = new Date(tokens.tokenExpiry).getTime()
  if (now >= expiryTime - 5 * 60 * 1000) {
    const { credentials } = await oauth2Client.refreshAccessToken()
    if (credentials.access_token) {
      const newEncryptedToken = encrypt(credentials.access_token)
      const newExpiry = new Date(credentials.expiry_date || Date.now() + 3600000)
      await onRefresh(newEncryptedToken, newExpiry)
    }
  }

  return oauth2Client
}

// ── Message Helpers ──

function parseHeader(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string {
  return headers?.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || ''
}

function parseBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return ''

  // Simple text/html or text/plain body
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf8')
  }
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return `<pre>${Buffer.from(payload.body.data, 'base64url').toString('utf8')}</pre>`
  }

  // Multipart — recurse into parts
  if (payload.parts) {
    // Prefer text/html over text/plain
    const htmlPart = payload.parts.find(p => p.mimeType === 'text/html')
    if (htmlPart) return parseBody(htmlPart)

    const textPart = payload.parts.find(p => p.mimeType === 'text/plain')
    if (textPart) return parseBody(textPart)

    // Nested multipart (e.g. multipart/alternative inside multipart/mixed)
    for (const part of payload.parts) {
      if (part.mimeType?.startsWith('multipart/')) {
        const result = parseBody(part)
        if (result) return result
      }
    }
  }

  return ''
}

function parseAttachments(payload: gmail_v1.Schema$MessagePart | undefined): Array<{
  id: string
  filename: string
  mimeType: string
  size: number
}> {
  const attachments: Array<{ id: string; filename: string; mimeType: string; size: number }> = []

  function walk(part: gmail_v1.Schema$MessagePart) {
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        id: part.body.attachmentId,
        filename: part.filename,
        mimeType: part.mimeType || 'application/octet-stream',
        size: part.body.size || 0,
      })
    }
    if (part.parts) {
      part.parts.forEach(walk)
    }
  }

  if (payload) walk(payload)
  return attachments
}

function stripDangerousTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')
}

interface MessageSummary {
  id: string
  threadId: string
  from: string
  to: string
  subject: string
  snippet: string
  date: string
  labelIds: string[]
  isRead: boolean
  isStarred: boolean
  hasAttachments: boolean
}

interface MessageFull extends MessageSummary {
  cc: string
  bcc: string
  body: string
  attachments: Array<{ id: string; filename: string; mimeType: string; size: number }>
  inReplyTo: string
  messageId: string
}

function formatMessageSummary(msg: gmail_v1.Schema$Message): MessageSummary {
  const headers = msg.payload?.headers || []
  const labelIds = msg.labelIds || []
  return {
    id: msg.id || '',
    threadId: msg.threadId || '',
    from: parseHeader(headers, 'From'),
    to: parseHeader(headers, 'To'),
    subject: parseHeader(headers, 'Subject'),
    snippet: msg.snippet || '',
    date: parseHeader(headers, 'Date'),
    labelIds,
    isRead: !labelIds.includes('UNREAD'),
    isStarred: labelIds.includes('STARRED'),
    hasAttachments: parseAttachments(msg.payload).length > 0,
  }
}

function formatMessageFull(msg: gmail_v1.Schema$Message): MessageFull {
  const headers = msg.payload?.headers || []
  const labelIds = msg.labelIds || []
  return {
    id: msg.id || '',
    threadId: msg.threadId || '',
    from: parseHeader(headers, 'From'),
    to: parseHeader(headers, 'To'),
    cc: parseHeader(headers, 'Cc'),
    bcc: parseHeader(headers, 'Bcc'),
    subject: parseHeader(headers, 'Subject'),
    snippet: msg.snippet || '',
    date: parseHeader(headers, 'Date'),
    labelIds,
    isRead: !labelIds.includes('UNREAD'),
    isStarred: labelIds.includes('STARRED'),
    hasAttachments: false, // set below
    body: stripDangerousTags(parseBody(msg.payload)),
    attachments: parseAttachments(msg.payload),
    inReplyTo: parseHeader(headers, 'In-Reply-To'),
    messageId: parseHeader(headers, 'Message-ID'),
  }
}

// ── Public API ──

export async function listMessages(
  tokens: StoredTokens,
  onRefresh: (t: string, e: Date) => Promise<void>,
  opts: { labelIds?: string[]; q?: string; maxResults?: number; pageToken?: string },
) {
  const auth = await getAuthenticatedClient(tokens, onRefresh)
  const gmail = google.gmail({ version: 'v1', auth })

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    labelIds: opts.labelIds,
    q: opts.q || undefined,
    maxResults: opts.maxResults || 25,
    pageToken: opts.pageToken || undefined,
  })

  if (!listRes.data.messages || listRes.data.messages.length === 0) {
    return { messages: [], nextPageToken: null, resultSizeEstimate: 0 }
  }

  // Fetch each message's metadata in parallel (format: metadata for list view)
  const messages = await Promise.all(
    listRes.data.messages.map(async (m) => {
      const full = await gmail.users.messages.get({
        userId: 'me',
        id: m.id!,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date'],
      })
      return formatMessageSummary(full.data)
    }),
  )

  return {
    messages,
    nextPageToken: listRes.data.nextPageToken || null,
    resultSizeEstimate: listRes.data.resultSizeEstimate || 0,
  }
}

export async function getMessage(
  tokens: StoredTokens,
  onRefresh: (t: string, e: Date) => Promise<void>,
  messageId: string,
) {
  const auth = await getAuthenticatedClient(tokens, onRefresh)
  const gmail = google.gmail({ version: 'v1', auth })

  const res = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  })

  const formatted = formatMessageFull(res.data)
  formatted.hasAttachments = formatted.attachments.length > 0
  return formatted
}

export async function getThread(
  tokens: StoredTokens,
  onRefresh: (t: string, e: Date) => Promise<void>,
  threadId: string,
) {
  const auth = await getAuthenticatedClient(tokens, onRefresh)
  const gmail = google.gmail({ version: 'v1', auth })

  const res = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'full',
  })

  const messages = (res.data.messages || []).map(m => {
    const formatted = formatMessageFull(m)
    formatted.hasAttachments = formatted.attachments.length > 0
    return formatted
  })

  return {
    id: res.data.id || '',
    messages,
    snippet: res.data.snippet || '',
  }
}

export async function modifyMessage(
  tokens: StoredTokens,
  onRefresh: (t: string, e: Date) => Promise<void>,
  messageId: string,
  addLabels: string[],
  removeLabels: string[],
) {
  const auth = await getAuthenticatedClient(tokens, onRefresh)
  const gmail = google.gmail({ version: 'v1', auth })

  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      addLabelIds: addLabels.length > 0 ? addLabels : undefined,
      removeLabelIds: removeLabels.length > 0 ? removeLabels : undefined,
    },
  })
}

export async function trashMessage(
  tokens: StoredTokens,
  onRefresh: (t: string, e: Date) => Promise<void>,
  messageId: string,
) {
  const auth = await getAuthenticatedClient(tokens, onRefresh)
  const gmail = google.gmail({ version: 'v1', auth })
  await gmail.users.messages.trash({ userId: 'me', id: messageId })
}

export async function sendMessage(
  tokens: StoredTokens,
  onRefresh: (t: string, e: Date) => Promise<void>,
  opts: {
    to: string
    cc?: string
    bcc?: string
    subject: string
    body: string
    inReplyTo?: string
    threadId?: string
    attachments?: Array<{ filename: string; mimeType: string; content: Buffer }>
  },
) {
  const auth = await getAuthenticatedClient(tokens, onRefresh)
  const gmail = google.gmail({ version: 'v1', auth })

  // Get sender email from profile
  const profile = await gmail.users.getProfile({ userId: 'me' })
  const from = profile.data.emailAddress || ''

  const boundary = `boundary_${Date.now()}`
  const hasAttachments = opts.attachments && opts.attachments.length > 0

  let rawParts: string[] = []

  // Headers
  rawParts.push(`From: ${from}`)
  rawParts.push(`To: ${opts.to}`)
  if (opts.cc) rawParts.push(`Cc: ${opts.cc}`)
  if (opts.bcc) rawParts.push(`Bcc: ${opts.bcc}`)
  rawParts.push(`Subject: ${opts.subject}`)
  if (opts.inReplyTo) rawParts.push(`In-Reply-To: ${opts.inReplyTo}`)
  rawParts.push('MIME-Version: 1.0')

  if (hasAttachments) {
    rawParts.push(`Content-Type: multipart/mixed; boundary="${boundary}"`)
    rawParts.push('')
    rawParts.push(`--${boundary}`)
    rawParts.push('Content-Type: text/html; charset="UTF-8"')
    rawParts.push('')
    rawParts.push(opts.body)

    for (const att of opts.attachments!) {
      rawParts.push(`--${boundary}`)
      rawParts.push(`Content-Type: ${att.mimeType}; name="${att.filename}"`)
      rawParts.push('Content-Transfer-Encoding: base64')
      rawParts.push(`Content-Disposition: attachment; filename="${att.filename}"`)
      rawParts.push('')
      rawParts.push(att.content.toString('base64'))
    }
    rawParts.push(`--${boundary}--`)
  } else {
    rawParts.push('Content-Type: text/html; charset="UTF-8"')
    rawParts.push('')
    rawParts.push(opts.body)
  }

  const raw = Buffer.from(rawParts.join('\r\n'))
    .toString('base64url')

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw,
      threadId: opts.threadId || undefined,
    },
  })
}

export async function getAttachment(
  tokens: StoredTokens,
  onRefresh: (t: string, e: Date) => Promise<void>,
  messageId: string,
  attachmentId: string,
) {
  const auth = await getAuthenticatedClient(tokens, onRefresh)
  const gmail = google.gmail({ version: 'v1', auth })

  const res = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId,
    id: attachmentId,
  })

  return Buffer.from(res.data.data || '', 'base64url')
}

// ── Labels ──

export async function listLabels(
  tokens: StoredTokens,
  onRefresh: (t: string, e: Date) => Promise<void>,
) {
  const auth = await getAuthenticatedClient(tokens, onRefresh)
  const gmail = google.gmail({ version: 'v1', auth })

  const res = await gmail.users.labels.list({ userId: 'me' })
  const labels = (res.data.labels || []).map(l => ({
    id: l.id || '',
    name: l.name || '',
    type: l.type || 'user',
    messagesTotal: l.messagesTotal || 0,
    messagesUnread: l.messagesUnread || 0,
    color: l.color ? { textColor: l.color.textColor, backgroundColor: l.color.backgroundColor } : null,
  }))

  return labels
}

export async function createLabel(
  tokens: StoredTokens,
  onRefresh: (t: string, e: Date) => Promise<void>,
  name: string,
  color?: { textColor: string; backgroundColor: string },
) {
  const auth = await getAuthenticatedClient(tokens, onRefresh)
  const gmail = google.gmail({ version: 'v1', auth })

  const res = await gmail.users.labels.create({
    userId: 'me',
    requestBody: {
      name,
      labelListVisibility: 'labelShow',
      messageListVisibility: 'show',
      color: color || undefined,
    },
  })

  return { id: res.data.id || '', name: res.data.name || '' }
}

export async function updateLabel(
  tokens: StoredTokens,
  onRefresh: (t: string, e: Date) => Promise<void>,
  labelId: string,
  name: string,
  color?: { textColor: string; backgroundColor: string },
) {
  const auth = await getAuthenticatedClient(tokens, onRefresh)
  const gmail = google.gmail({ version: 'v1', auth })

  await gmail.users.labels.update({
    userId: 'me',
    id: labelId,
    requestBody: { name, color: color || undefined },
  })
}

export async function deleteLabel(
  tokens: StoredTokens,
  onRefresh: (t: string, e: Date) => Promise<void>,
  labelId: string,
) {
  const auth = await getAuthenticatedClient(tokens, onRefresh)
  const gmail = google.gmail({ version: 'v1', auth })
  await gmail.users.labels.delete({ userId: 'me', id: labelId })
}

// ── Drafts ──

export async function listDrafts(
  tokens: StoredTokens,
  onRefresh: (t: string, e: Date) => Promise<void>,
) {
  const auth = await getAuthenticatedClient(tokens, onRefresh)
  const gmail = google.gmail({ version: 'v1', auth })

  const res = await gmail.users.drafts.list({ userId: 'me', maxResults: 50 })
  if (!res.data.drafts) return []

  const drafts = await Promise.all(
    res.data.drafts.map(async (d) => {
      const full = await gmail.users.drafts.get({ userId: 'me', id: d.id! })
      const msg = full.data.message
      return {
        id: d.id || '',
        messageId: msg?.id || '',
        ...formatMessageSummary(msg || {}),
      }
    }),
  )

  return drafts
}

export async function createDraft(
  tokens: StoredTokens,
  onRefresh: (t: string, e: Date) => Promise<void>,
  opts: { to: string; cc?: string; bcc?: string; subject: string; body: string; threadId?: string },
) {
  const auth = await getAuthenticatedClient(tokens, onRefresh)
  const gmail = google.gmail({ version: 'v1', auth })

  const profile = await gmail.users.getProfile({ userId: 'me' })
  const from = profile.data.emailAddress || ''

  const lines = [
    `From: ${from}`,
    `To: ${opts.to}`,
    opts.cc ? `Cc: ${opts.cc}` : '',
    opts.bcc ? `Bcc: ${opts.bcc}` : '',
    `Subject: ${opts.subject}`,
    'Content-Type: text/html; charset="UTF-8"',
    '',
    opts.body,
  ].filter(Boolean)

  const raw = Buffer.from(lines.join('\r\n')).toString('base64url')

  const res = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: {
      message: { raw, threadId: opts.threadId || undefined },
    },
  })

  return { id: res.data.id || '' }
}

export async function deleteDraft(
  tokens: StoredTokens,
  onRefresh: (t: string, e: Date) => Promise<void>,
  draftId: string,
) {
  const auth = await getAuthenticatedClient(tokens, onRefresh)
  const gmail = google.gmail({ version: 'v1', auth })
  await gmail.users.drafts.delete({ userId: 'me', id: draftId })
}

// ── Contacts (autocomplete) ──

export async function suggestContacts(
  tokens: StoredTokens,
  onRefresh: (t: string, e: Date) => Promise<void>,
  query: string,
) {
  const auth = await getAuthenticatedClient(tokens, onRefresh)
  const people = google.people({ version: 'v1', auth })

  try {
    const res = await people.people.searchContacts({
      query,
      readMask: 'names,emailAddresses,photos',
      pageSize: 10,
    })

    return (res.data.results || [])
      .filter(r => r.person?.emailAddresses?.length)
      .map(r => ({
        name: r.person?.names?.[0]?.displayName || '',
        email: r.person?.emailAddresses?.[0]?.value || '',
        photo: r.person?.photos?.[0]?.url || '',
      }))
  } catch {
    // Fallback: return empty. People API might not be enabled.
    return []
  }
}

// ── Filters ──

export async function listFilters(
  tokens: StoredTokens,
  onRefresh: (t: string, e: Date) => Promise<void>,
) {
  const auth = await getAuthenticatedClient(tokens, onRefresh)
  const gmail = google.gmail({ version: 'v1', auth })

  const res = await gmail.users.settings.filters.list({ userId: 'me' })
  return (res.data.filter || []).map(f => ({
    id: f.id || '',
    criteria: {
      from: f.criteria?.from || '',
      to: f.criteria?.to || '',
      subject: f.criteria?.subject || '',
      query: f.criteria?.query || '',
      hasAttachment: f.criteria?.hasAttachment || false,
    },
    action: {
      addLabelIds: f.action?.addLabelIds || [],
      removeLabelIds: f.action?.removeLabelIds || [],
      forward: f.action?.forward || '',
    },
  }))
}

export async function createFilter(
  tokens: StoredTokens,
  onRefresh: (t: string, e: Date) => Promise<void>,
  criteria: { from?: string; to?: string; subject?: string; query?: string; hasAttachment?: boolean },
  action: { addLabelIds?: string[]; removeLabelIds?: string[]; forward?: string },
) {
  const auth = await getAuthenticatedClient(tokens, onRefresh)
  const gmail = google.gmail({ version: 'v1', auth })

  const res = await gmail.users.settings.filters.create({
    userId: 'me',
    requestBody: { criteria, action },
  })

  return { id: res.data.id || '' }
}

export async function deleteFilter(
  tokens: StoredTokens,
  onRefresh: (t: string, e: Date) => Promise<void>,
  filterId: string,
) {
  const auth = await getAuthenticatedClient(tokens, onRefresh)
  const gmail = google.gmail({ version: 'v1', auth })
  await gmail.users.settings.filters.delete({ userId: 'me', id: filterId })
}

export type { MessageSummary, MessageFull, StoredTokens }
```

**Step 2: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit src/lib/gmailService.ts 2>&1 | head -20
```

Expected: No errors (or only warnings from other files).

**Step 3: Commit**

```bash
git add backend/src/lib/gmailService.ts
git commit -m "feat(backend): add Gmail service wrapper for OAuth, messages, labels, drafts, contacts, filters"
```

---

## Task 5: Mail Database Helper

**Files:**
- Create: `backend/src/db/mail.ts`

This module handles CRUD for the `mail_accounts` table. Route handlers call this — they never query the table directly.

**Step 1: Create the database helper**

Create `backend/src/db/mail.ts`:

```typescript
const db = require('./schema')
import { v4 as uuidv4 } from 'uuid'

interface MailAccount {
  id: string
  user_id: string
  email: string
  access_token: string
  refresh_token: string
  token_expiry: string
  hotkeys: string
  created_at: string
  updated_at: string
}

export async function getMailAccount(userId: string): Promise<MailAccount | null> {
  const row = await db.getOne(
    'SELECT * FROM mail_accounts WHERE user_id = $1',
    [userId],
  )
  return row as MailAccount | null
}

export async function createMailAccount(
  userId: string,
  email: string,
  accessToken: string,
  refreshToken: string,
  tokenExpiry: Date,
): Promise<MailAccount> {
  const id = uuidv4()
  await db.run(
    `INSERT INTO mail_accounts (id, user_id, email, access_token, refresh_token, token_expiry)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, userId, email, accessToken, refreshToken, tokenExpiry.toISOString()],
  )
  return (await getMailAccount(userId))!
}

export async function updateTokens(
  userId: string,
  accessToken: string,
  tokenExpiry: Date,
): Promise<void> {
  await db.run(
    `UPDATE mail_accounts SET access_token = $1, token_expiry = $2, updated_at = NOW()
     WHERE user_id = $3`,
    [accessToken, tokenExpiry.toISOString(), userId],
  )
}

export async function updateHotkeys(
  userId: string,
  hotkeys: Record<string, string>,
): Promise<void> {
  await db.run(
    `UPDATE mail_accounts SET hotkeys = $1, updated_at = NOW() WHERE user_id = $2`,
    [JSON.stringify(hotkeys), userId],
  )
}

export async function deleteMailAccount(userId: string): Promise<void> {
  await db.run('DELETE FROM mail_accounts WHERE user_id = $1', [userId])
}

module.exports = { getMailAccount, createMailAccount, updateTokens, updateHotkeys, deleteMailAccount }
```

**Step 2: Commit**

```bash
git add backend/src/db/mail.ts
git commit -m "feat(backend): add mail database helper for mail_accounts CRUD"
```

---

## Task 6: Backend Mail Routes

**Files:**
- Create: `backend/src/routes/mail.ts`
- Modify: `backend/src/index.ts` (add route mount)

**Step 1: Create the mail routes**

Create `backend/src/routes/mail.ts`:

```typescript
import express, { type Request, type Response } from 'express'
import multer from 'multer'
import { authMiddleware } from '../middleware/auth'
import * as gmail from '../lib/gmailService'
import type { StoredTokens } from '../lib/gmailService'

const mailDb = require('../db/mail')

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })

router.use(authMiddleware)

// Helper to get tokens + build refresh callback
async function getTokensAndRefresh(req: Request): Promise<{ tokens: StoredTokens; onRefresh: (t: string, e: Date) => Promise<void> } | null> {
  const account = await mailDb.getMailAccount(req.user!.id)
  if (!account) return null

  const tokens: StoredTokens = {
    id: account.id,
    accessToken: account.access_token,
    refreshToken: account.refresh_token,
    tokenExpiry: new Date(account.token_expiry),
  }

  const onRefresh = async (newAccessToken: string, newExpiry: Date) => {
    await mailDb.updateTokens(req.user!.id, newAccessToken, newExpiry)
  }

  return { tokens, onRefresh }
}

// ── OAuth ──

router.get('/oauth/authorize', (req: Request, res: Response) => {
  const state = req.user!.id // Use userId as state for verification
  const url = gmail.getAuthUrl(state)
  res.json({ url })
})

router.get('/oauth/callback', async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string
    if (!code) {
      res.status(400).json({ error: 'Missing authorization code' })
      return
    }

    const result = await gmail.exchangeCode(code)

    // Delete existing account if any (reconnect scenario)
    await mailDb.deleteMailAccount(req.user!.id)

    await mailDb.createMailAccount(
      req.user!.id,
      result.email,
      result.accessToken,
      result.refreshToken,
      result.expiry,
    )

    // Redirect back to the mail page
    res.redirect('/mail')
  } catch (err: unknown) {
    console.error('OAuth callback error:', err)
    res.redirect('/mail?error=oauth_failed')
  }
})

router.delete('/oauth/disconnect', async (req: Request, res: Response) => {
  await mailDb.deleteMailAccount(req.user!.id)
  res.json({ success: true })
})

router.get('/status', async (req: Request, res: Response) => {
  const account = await mailDb.getMailAccount(req.user!.id)
  res.json({
    connected: !!account,
    email: account?.email || null,
    hotkeys: account?.hotkeys ? JSON.parse(account.hotkeys) : {},
  })
})

// ── Messages ──

router.get('/messages', async (req: Request, res: Response) => {
  const ctx = await getTokensAndRefresh(req)
  if (!ctx) { res.status(400).json({ error: 'Gmail not connected' }); return }

  try {
    const label = req.query.label as string | undefined
    const q = req.query.q as string | undefined
    const maxResults = parseInt(req.query.maxResults as string) || 25
    const pageToken = req.query.pageToken as string | undefined

    const labelIds = label ? [label] : ['INBOX']

    const result = await gmail.listMessages(ctx.tokens, ctx.onRefresh, {
      labelIds,
      q,
      maxResults,
      pageToken,
    })

    res.json(result)
  } catch (err: unknown) {
    console.error('List messages error:', err)
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
})

router.get('/messages/:id', async (req: Request, res: Response) => {
  const ctx = await getTokensAndRefresh(req)
  if (!ctx) { res.status(400).json({ error: 'Gmail not connected' }); return }

  try {
    const message = await gmail.getMessage(ctx.tokens, ctx.onRefresh, req.params.id)
    res.json(message)
  } catch (err: unknown) {
    console.error('Get message error:', err)
    res.status(500).json({ error: 'Failed to fetch message' })
  }
})

router.put('/messages/:id/read', async (req: Request, res: Response) => {
  const ctx = await getTokensAndRefresh(req)
  if (!ctx) { res.status(400).json({ error: 'Gmail not connected' }); return }

  try {
    await gmail.modifyMessage(ctx.tokens, ctx.onRefresh, req.params.id, [], ['UNREAD'])
    res.json({ success: true })
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to mark as read' })
  }
})

router.put('/messages/:id/unread', async (req: Request, res: Response) => {
  const ctx = await getTokensAndRefresh(req)
  if (!ctx) { res.status(400).json({ error: 'Gmail not connected' }); return }

  try {
    await gmail.modifyMessage(ctx.tokens, ctx.onRefresh, req.params.id, ['UNREAD'], [])
    res.json({ success: true })
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to mark as unread' })
  }
})

router.put('/messages/:id/star', async (req: Request, res: Response) => {
  const ctx = await getTokensAndRefresh(req)
  if (!ctx) { res.status(400).json({ error: 'Gmail not connected' }); return }

  try {
    // Toggle: if starred, unstar; if not, star
    const msg = await gmail.getMessage(ctx.tokens, ctx.onRefresh, req.params.id)
    if (msg.isStarred) {
      await gmail.modifyMessage(ctx.tokens, ctx.onRefresh, req.params.id, [], ['STARRED'])
    } else {
      await gmail.modifyMessage(ctx.tokens, ctx.onRefresh, req.params.id, ['STARRED'], [])
    }
    res.json({ success: true, starred: !msg.isStarred })
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to toggle star' })
  }
})

router.put('/messages/:id/archive', async (req: Request, res: Response) => {
  const ctx = await getTokensAndRefresh(req)
  if (!ctx) { res.status(400).json({ error: 'Gmail not connected' }); return }

  try {
    await gmail.modifyMessage(ctx.tokens, ctx.onRefresh, req.params.id, [], ['INBOX'])
    res.json({ success: true })
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to archive' })
  }
})

router.put('/messages/:id/trash', async (req: Request, res: Response) => {
  const ctx = await getTokensAndRefresh(req)
  if (!ctx) { res.status(400).json({ error: 'Gmail not connected' }); return }

  try {
    await gmail.trashMessage(ctx.tokens, ctx.onRefresh, req.params.id)
    res.json({ success: true })
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to trash' })
  }
})

router.put('/messages/:id/labels', async (req: Request, res: Response) => {
  const ctx = await getTokensAndRefresh(req)
  if (!ctx) { res.status(400).json({ error: 'Gmail not connected' }); return }

  try {
    const { add = [], remove = [] } = req.body
    await gmail.modifyMessage(ctx.tokens, ctx.onRefresh, req.params.id, add, remove)
    res.json({ success: true })
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to update labels' })
  }
})

// ── Threads ──

router.get('/threads/:threadId', async (req: Request, res: Response) => {
  const ctx = await getTokensAndRefresh(req)
  if (!ctx) { res.status(400).json({ error: 'Gmail not connected' }); return }

  try {
    const thread = await gmail.getThread(ctx.tokens, ctx.onRefresh, req.params.threadId)
    res.json(thread)
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to fetch thread' })
  }
})

// ── Send ──

router.post('/messages/send', upload.array('attachments', 10), async (req: Request, res: Response) => {
  const ctx = await getTokensAndRefresh(req)
  if (!ctx) { res.status(400).json({ error: 'Gmail not connected' }); return }

  try {
    const { to, cc, bcc, subject, body, inReplyTo, threadId } = req.body
    const files = (req.files as Express.Multer.File[]) || []

    const attachments = files.map(f => ({
      filename: f.originalname,
      mimeType: f.mimetype,
      content: f.buffer,
    }))

    await gmail.sendMessage(ctx.tokens, ctx.onRefresh, {
      to,
      cc,
      bcc,
      subject,
      body,
      inReplyTo,
      threadId,
      attachments: attachments.length > 0 ? attachments : undefined,
    })

    res.json({ success: true })
  } catch (err: unknown) {
    console.error('Send message error:', err)
    res.status(500).json({ error: 'Failed to send message' })
  }
})

// ── Attachments ──

router.get('/messages/:messageId/attachments/:attachmentId', async (req: Request, res: Response) => {
  const ctx = await getTokensAndRefresh(req)
  if (!ctx) { res.status(400).json({ error: 'Gmail not connected' }); return }

  try {
    const data = await gmail.getAttachment(ctx.tokens, ctx.onRefresh, req.params.messageId, req.params.attachmentId)

    // Get the message to find the attachment's filename and mimeType
    const message = await gmail.getMessage(ctx.tokens, ctx.onRefresh, req.params.messageId)
    const att = message.attachments.find(a => a.id === req.params.attachmentId)

    res.set('Content-Type', att?.mimeType || 'application/octet-stream')
    res.set('Content-Disposition', `attachment; filename="${att?.filename || 'download'}"`)
    res.send(data)
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to download attachment' })
  }
})

// ── Drafts ──

router.get('/drafts', async (req: Request, res: Response) => {
  const ctx = await getTokensAndRefresh(req)
  if (!ctx) { res.status(400).json({ error: 'Gmail not connected' }); return }

  try {
    const drafts = await gmail.listDrafts(ctx.tokens, ctx.onRefresh)
    res.json(drafts)
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to fetch drafts' })
  }
})

router.post('/drafts', async (req: Request, res: Response) => {
  const ctx = await getTokensAndRefresh(req)
  if (!ctx) { res.status(400).json({ error: 'Gmail not connected' }); return }

  try {
    const draft = await gmail.createDraft(ctx.tokens, ctx.onRefresh, req.body)
    res.json(draft)
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to save draft' })
  }
})

router.delete('/drafts/:id', async (req: Request, res: Response) => {
  const ctx = await getTokensAndRefresh(req)
  if (!ctx) { res.status(400).json({ error: 'Gmail not connected' }); return }

  try {
    await gmail.deleteDraft(ctx.tokens, ctx.onRefresh, req.params.id)
    res.json({ success: true })
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to delete draft' })
  }
})

// ── Labels ──

router.get('/labels', async (req: Request, res: Response) => {
  const ctx = await getTokensAndRefresh(req)
  if (!ctx) { res.status(400).json({ error: 'Gmail not connected' }); return }

  try {
    const labels = await gmail.listLabels(ctx.tokens, ctx.onRefresh)
    res.json(labels)
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to fetch labels' })
  }
})

router.post('/labels', async (req: Request, res: Response) => {
  const ctx = await getTokensAndRefresh(req)
  if (!ctx) { res.status(400).json({ error: 'Gmail not connected' }); return }

  try {
    const label = await gmail.createLabel(ctx.tokens, ctx.onRefresh, req.body.name, req.body.color)
    res.json(label)
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to create label' })
  }
})

router.put('/labels/:id', async (req: Request, res: Response) => {
  const ctx = await getTokensAndRefresh(req)
  if (!ctx) { res.status(400).json({ error: 'Gmail not connected' }); return }

  try {
    await gmail.updateLabel(ctx.tokens, ctx.onRefresh, req.params.id, req.body.name, req.body.color)
    res.json({ success: true })
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to update label' })
  }
})

router.delete('/labels/:id', async (req: Request, res: Response) => {
  const ctx = await getTokensAndRefresh(req)
  if (!ctx) { res.status(400).json({ error: 'Gmail not connected' }); return }

  try {
    await gmail.deleteLabel(ctx.tokens, ctx.onRefresh, req.params.id)
    res.json({ success: true })
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to delete label' })
  }
})

// ── Contacts ──

router.get('/contacts/suggest', async (req: Request, res: Response) => {
  const ctx = await getTokensAndRefresh(req)
  if (!ctx) { res.status(400).json({ error: 'Gmail not connected' }); return }

  try {
    const q = req.query.q as string || ''
    if (q.length < 2) { res.json([]); return }
    const contacts = await gmail.suggestContacts(ctx.tokens, ctx.onRefresh, q)
    res.json(contacts)
  } catch (err: unknown) {
    res.json([]) // Graceful fallback
  }
})

// ── Filters ──

router.get('/filters', async (req: Request, res: Response) => {
  const ctx = await getTokensAndRefresh(req)
  if (!ctx) { res.status(400).json({ error: 'Gmail not connected' }); return }

  try {
    const filters = await gmail.listFilters(ctx.tokens, ctx.onRefresh)
    res.json(filters)
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to fetch filters' })
  }
})

router.post('/filters', async (req: Request, res: Response) => {
  const ctx = await getTokensAndRefresh(req)
  if (!ctx) { res.status(400).json({ error: 'Gmail not connected' }); return }

  try {
    const filter = await gmail.createFilter(ctx.tokens, ctx.onRefresh, req.body.criteria, req.body.action)
    res.json(filter)
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to create filter' })
  }
})

router.delete('/filters/:id', async (req: Request, res: Response) => {
  const ctx = await getTokensAndRefresh(req)
  if (!ctx) { res.status(400).json({ error: 'Gmail not connected' }); return }

  try {
    await gmail.deleteFilter(ctx.tokens, ctx.onRefresh, req.params.id)
    res.json({ success: true })
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to delete filter' })
  }
})

// ── Hotkeys ──

router.put('/hotkeys', async (req: Request, res: Response) => {
  try {
    await mailDb.updateHotkeys(req.user!.id, req.body.hotkeys || {})
    res.json({ success: true })
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to save hotkeys' })
  }
})

export default router
module.exports = router
```

**Step 2: Mount the route in index.ts**

In `backend/src/index.ts`, add after the existing route imports (around line 20):

```typescript
const mailRoutes = require('./routes/mail');
```

And add after the existing `app.use` lines (around line 67):

```typescript
app.use('/api/mail', mailRoutes);
```

**Step 3: Verify backend starts**

```bash
docker restart lyfehub-dev && docker logs -f lyfehub-dev --tail 10
```

Expected: Server starts without errors.

**Step 4: Commit**

```bash
git add backend/src/routes/mail.ts backend/src/index.ts
git commit -m "feat(backend): add /api/mail routes for Gmail proxy (OAuth, messages, labels, drafts, contacts, filters)"
```

---

## Task 7: Frontend Types

**Files:**
- Create: `frontend-next/src/types/mail.ts`
- Modify: `frontend-next/src/types/index.ts`

**Step 1: Create mail types**

Create `frontend-next/src/types/mail.ts`:

```typescript
export interface MailStatus {
  connected: boolean
  email: string | null
  hotkeys: Record<string, string>
}

export interface MailMessageSummary {
  id: string
  threadId: string
  from: string
  to: string
  subject: string
  snippet: string
  date: string
  labelIds: string[]
  isRead: boolean
  isStarred: boolean
  hasAttachments: boolean
}

export interface MailAttachment {
  id: string
  filename: string
  mimeType: string
  size: number
}

export interface MailMessageFull extends MailMessageSummary {
  cc: string
  bcc: string
  body: string
  attachments: MailAttachment[]
  inReplyTo: string
  messageId: string
}

export interface MailThread {
  id: string
  messages: MailMessageFull[]
  snippet: string
}

export interface MailMessagesResponse {
  messages: MailMessageSummary[]
  nextPageToken: string | null
  resultSizeEstimate: number
}

export interface MailLabel {
  id: string
  name: string
  type: 'system' | 'user'
  messagesTotal: number
  messagesUnread: number
  color: { textColor: string; backgroundColor: string } | null
}

export interface MailContact {
  name: string
  email: string
  photo: string
}

export interface MailDraft {
  id: string
  messageId: string
  from: string
  to: string
  subject: string
  snippet: string
  date: string
}

export interface MailFilter {
  id: string
  criteria: {
    from: string
    to: string
    subject: string
    query: string
    hasAttachment: boolean
  }
  action: {
    addLabelIds: string[]
    removeLabelIds: string[]
    forward: string
  }
}

export interface SendMailData {
  to: string
  cc?: string
  bcc?: string
  subject: string
  body: string
  inReplyTo?: string
  threadId?: string
}

export interface CreateFilterData {
  criteria: {
    from?: string
    to?: string
    subject?: string
    query?: string
    hasAttachment?: boolean
  }
  action: {
    addLabelIds?: string[]
    removeLabelIds?: string[]
    forward?: string
  }
}
```

**Step 2: Export from types/index.ts**

Add to the end of `frontend-next/src/types/index.ts`:

```typescript
export type {
  MailStatus,
  MailMessageSummary,
  MailMessageFull,
  MailAttachment,
  MailThread,
  MailMessagesResponse,
  MailLabel,
  MailContact,
  MailDraft,
  MailFilter,
  SendMailData,
  CreateFilterData,
} from './mail.js'
```

**Step 3: Commit**

```bash
git add frontend-next/src/types/mail.ts frontend-next/src/types/index.ts
git commit -m "feat(frontend): add TypeScript types for Mail module"
```

---

## Task 8: TanStack Query Hooks — useMail.ts

**Files:**
- Create: `frontend-next/src/api/hooks/useMail.ts`
- Modify: `frontend-next/src/api/hooks/index.ts`

**Step 1: Create the hooks file**

Create `frontend-next/src/api/hooks/useMail.ts`:

```typescript
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { apiClient } from '../client.js'
import type {
  MailStatus,
  MailMessageFull,
  MailThread,
  MailMessagesResponse,
  MailLabel,
  MailContact,
  MailDraft,
  MailFilter,
  SendMailData,
  CreateFilterData,
} from '@/types/index.js'

export const mailKeys = {
  all: ['mail'] as const,
  status: () => [...mailKeys.all, 'status'] as const,
  messages: () => [...mailKeys.all, 'messages'] as const,
  messageList: (label: string, q: string) => [...mailKeys.messages(), label, q] as const,
  messageDetail: (id: string) => [...mailKeys.all, 'message', id] as const,
  thread: (id: string) => [...mailKeys.all, 'thread', id] as const,
  labels: () => [...mailKeys.all, 'labels'] as const,
  contacts: (q: string) => [...mailKeys.all, 'contacts', q] as const,
  drafts: () => [...mailKeys.all, 'drafts'] as const,
  filters: () => [...mailKeys.all, 'filters'] as const,
}

// ── Status ──

export function useMailStatus() {
  return useQuery({
    queryKey: mailKeys.status(),
    queryFn: () => apiClient.get<MailStatus>('/mail/status'),
  })
}

// ── Messages ──

export function useMailMessages(label: string, q: string) {
  return useInfiniteQuery({
    queryKey: mailKeys.messageList(label, q),
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams()
      if (label) params.set('label', label)
      if (q) params.set('q', q)
      params.set('maxResults', '25')
      if (pageParam) params.set('pageToken', pageParam)
      return apiClient.get<MailMessagesResponse>(`/mail/messages?${params.toString()}`)
    },
    initialPageParam: '' as string,
    getNextPageParam: (lastPage) => lastPage.nextPageToken || undefined,
    enabled: true,
  })
}

export function useMailMessage(id: string) {
  return useQuery({
    queryKey: mailKeys.messageDetail(id),
    queryFn: () => apiClient.get<MailMessageFull>(`/mail/messages/${id}`),
    enabled: !!id,
  })
}

// ── Threads ──

export function useMailThread(threadId: string) {
  return useQuery({
    queryKey: mailKeys.thread(threadId),
    queryFn: () => apiClient.get<MailThread>(`/mail/threads/${threadId}`),
    enabled: !!threadId,
  })
}

// ── Labels ──

export function useMailLabels() {
  return useQuery({
    queryKey: mailKeys.labels(),
    queryFn: () => apiClient.get<MailLabel[]>('/mail/labels'),
  })
}

// ── Contacts ──

export function useMailContacts(q: string) {
  return useQuery({
    queryKey: mailKeys.contacts(q),
    queryFn: () => apiClient.get<MailContact[]>(`/mail/contacts/suggest?q=${encodeURIComponent(q)}`),
    enabled: q.length >= 2,
  })
}

// ── Drafts ──

export function useMailDrafts() {
  return useQuery({
    queryKey: mailKeys.drafts(),
    queryFn: () => apiClient.get<MailDraft[]>('/mail/drafts'),
  })
}

// ── Filters ──

export function useMailFilters() {
  return useQuery({
    queryKey: mailKeys.filters(),
    queryFn: () => apiClient.get<MailFilter[]>('/mail/filters'),
  })
}

// ── Mutations ──

export function useSendMail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SendMailData | FormData) => {
      if (data instanceof FormData) {
        return apiClient.upload<{ success: boolean }>('/mail/messages/send', data)
      }
      return apiClient.post<{ success: boolean }>('/mail/messages/send', data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mailKeys.messages() })
    },
  })
}

export function useArchiveMail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (messageId: string) =>
      apiClient.put<{ success: boolean }>(`/mail/messages/${messageId}/archive`),
    onMutate: async (messageId) => {
      await qc.cancelQueries({ queryKey: mailKeys.messages() })
      // Optimistic: remove from INBOX list queries
      return { messageId }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: mailKeys.messages() })
    },
  })
}

export function useTrashMail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (messageId: string) =>
      apiClient.put<{ success: boolean }>(`/mail/messages/${messageId}/trash`),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: mailKeys.messages() })
    },
  })
}

export function useToggleStar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (messageId: string) =>
      apiClient.put<{ success: boolean; starred: boolean }>(`/mail/messages/${messageId}/star`),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: mailKeys.messages() })
    },
  })
}

export function useToggleRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ messageId, markAs }: { messageId: string; markAs: 'read' | 'unread' }) =>
      apiClient.put<{ success: boolean }>(`/mail/messages/${messageId}/${markAs}`),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: mailKeys.messages() })
      qc.invalidateQueries({ queryKey: mailKeys.labels() }) // unread counts change
    },
  })
}

export function useUpdateMessageLabels() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ messageId, add, remove }: { messageId: string; add: string[]; remove: string[] }) =>
      apiClient.put<{ success: boolean }>(`/mail/messages/${messageId}/labels`, { add, remove }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: mailKeys.messages() })
      qc.invalidateQueries({ queryKey: mailKeys.labels() })
    },
  })
}

export function useSaveDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { to: string; cc?: string; bcc?: string; subject: string; body: string; threadId?: string }) =>
      apiClient.post<{ id: string }>('/mail/drafts', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mailKeys.drafts() })
    },
  })
}

export function useDeleteDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (draftId: string) =>
      apiClient.delete<{ success: boolean }>(`/mail/drafts/${draftId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mailKeys.drafts() })
    },
  })
}

export function useCreateLabel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; color?: { textColor: string; backgroundColor: string } }) =>
      apiClient.post<{ id: string; name: string }>('/mail/labels', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mailKeys.labels() })
    },
  })
}

export function useUpdateLabel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name: string; color?: { textColor: string; backgroundColor: string } }) =>
      apiClient.put<{ success: boolean }>(`/mail/labels/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mailKeys.labels() })
    },
  })
}

export function useDeleteLabel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (labelId: string) =>
      apiClient.delete<{ success: boolean }>(`/mail/labels/${labelId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mailKeys.labels() })
    },
  })
}

export function useCreateFilter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateFilterData) =>
      apiClient.post<{ id: string }>('/mail/filters', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mailKeys.filters() })
    },
  })
}

export function useDeleteFilter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (filterId: string) =>
      apiClient.delete<{ success: boolean }>(`/mail/filters/${filterId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mailKeys.filters() })
    },
  })
}

export function useSaveHotkeys() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (hotkeys: Record<string, string>) =>
      apiClient.put<{ success: boolean }>('/mail/hotkeys', { hotkeys }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mailKeys.status() })
    },
  })
}
```

**Step 2: Export from hooks/index.ts**

Add to the end of `frontend-next/src/api/hooks/index.ts`:

```typescript
export {
  useMailStatus,
  useMailMessages,
  useMailMessage,
  useMailThread,
  useMailLabels,
  useMailContacts,
  useMailDrafts,
  useMailFilters,
  useSendMail,
  useArchiveMail,
  useTrashMail,
  useToggleStar,
  useToggleRead,
  useUpdateMessageLabels,
  useSaveDraft,
  useDeleteDraft,
  useCreateLabel,
  useUpdateLabel,
  useDeleteLabel,
  useCreateFilter,
  useDeleteFilter,
  useSaveHotkeys,
  mailKeys,
} from './useMail.js'
```

**Step 3: Commit**

```bash
git add frontend-next/src/api/hooks/useMail.ts frontend-next/src/api/hooks/index.ts
git commit -m "feat(frontend): add TanStack Query hooks for Mail module (25 hooks)"
```

---

## Task 9: Install Frontend Dependencies (Tiptap)

**Files:**
- Modify: `frontend-next/package.json`

**Step 1: Install Tiptap**

```bash
cd frontend-next && npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/pm
```

**Step 2: Verify**

```bash
cd frontend-next && node -e "console.log(require('@tiptap/react/package.json').version)"
```

Expected: Prints a version number.

**Step 3: Commit**

```bash
git add frontend-next/package.json frontend-next/package-lock.json
git commit -m "chore(frontend): add Tiptap rich text editor dependencies"
```

---

## Task 10: Mail UI Store (Zustand)

**Files:**
- Create: `frontend-next/src/stores/mailUiStore.ts`

**Step 1: Create the store**

Create `frontend-next/src/stores/mailUiStore.ts`:

```typescript
import { create } from 'zustand'

const STORAGE_KEY = 'lyfehub-mail-ui'

interface PersistedState {
  readingPanePosition: 'right' | 'bottom'
}

function loadPersisted(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { readingPanePosition: 'right' }
}

function savePersisted(state: PersistedState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

interface MailUiState {
  // Persisted
  readingPanePosition: 'right' | 'bottom'

  // Ephemeral
  selectedMessageId: string | null
  selectedThreadId: string | null
  composeOpen: boolean
  composeMode: 'new' | 'reply' | 'replyAll' | 'forward'
  composeReplyTo: {
    messageId: string
    threadId: string
    to: string
    cc: string
    subject: string
    body: string
    inReplyTo: string
  } | null
  activeLabel: string
  searchQuery: string
  focusZone: 'list' | 'detail'

  // Actions
  setReadingPanePosition: (pos: 'right' | 'bottom') => void
  setSelectedMessage: (id: string | null, threadId?: string | null) => void
  openCompose: (mode?: 'new' | 'reply' | 'replyAll' | 'forward', replyTo?: MailUiState['composeReplyTo']) => void
  closeCompose: () => void
  setActiveLabel: (label: string) => void
  setSearchQuery: (q: string) => void
  setFocusZone: (zone: 'list' | 'detail') => void
}

export const useMailUiStore = create<MailUiState>((set) => {
  const persisted = loadPersisted()

  return {
    readingPanePosition: persisted.readingPanePosition,

    selectedMessageId: null,
    selectedThreadId: null,
    composeOpen: false,
    composeMode: 'new',
    composeReplyTo: null,
    activeLabel: 'INBOX',
    searchQuery: '',
    focusZone: 'list',

    setReadingPanePosition: (pos) => {
      set({ readingPanePosition: pos })
      savePersisted({ readingPanePosition: pos })
    },

    setSelectedMessage: (id, threadId) => {
      set({
        selectedMessageId: id,
        selectedThreadId: threadId ?? null,
        focusZone: id ? 'detail' : 'list',
      })
    },

    openCompose: (mode = 'new', replyTo = null) => {
      set({ composeOpen: true, composeMode: mode, composeReplyTo: replyTo })
    },

    closeCompose: () => {
      set({ composeOpen: false, composeReplyTo: null })
    },

    setActiveLabel: (label) => {
      set({ activeLabel: label, selectedMessageId: null, selectedThreadId: null })
    },

    setSearchQuery: (q) => {
      set({ searchQuery: q })
    },

    setFocusZone: (zone) => {
      set({ focusZone: zone })
    },
  }
})
```

**Step 2: Commit**

```bash
git add frontend-next/src/stores/mailUiStore.ts
git commit -m "feat(frontend): add Zustand UI store for Mail module"
```

---

## Task 11: Mail Utilities

**Files:**
- Create: `frontend-next/src/pages/mail/utils/mailConstants.ts`
- Create: `frontend-next/src/pages/mail/utils/mailHelpers.ts`

**Step 1: Create mailConstants.ts**

Create `frontend-next/src/pages/mail/utils/mailConstants.ts`:

```typescript
import {
  Inbox, Star, Send, FileText, Trash2, Archive,
  type LucideIcon,
} from 'lucide-react'

export const SYSTEM_LABELS: Record<string, { name: string; icon: LucideIcon }> = {
  INBOX: { name: 'Inbox', icon: Inbox },
  STARRED: { name: 'Starred', icon: Star },
  SENT: { name: 'Sent', icon: Send },
  DRAFT: { name: 'Drafts', icon: FileText },
  TRASH: { name: 'Trash', icon: Trash2 },
  SPAM: { name: 'Spam', icon: Archive },
}

export const SIDEBAR_LABEL_ORDER = ['INBOX', 'STARRED', 'SENT', 'DRAFT', 'TRASH']

export const DEFAULT_HOTKEYS: Record<string, { key: string; description: string }> = {
  nextMessage: { key: 'j', description: 'Next message' },
  prevMessage: { key: 'k', description: 'Previous message' },
  openMessage: { key: 'Enter', description: 'Open message' },
  backToList: { key: 'u', description: 'Back to list' },
  archive: { key: 'e', description: 'Archive' },
  trash: { key: '#', description: 'Trash' },
  reply: { key: 'r', description: 'Reply' },
  replyAll: { key: 'a', description: 'Reply all' },
  forward: { key: 'f', description: 'Forward' },
  toggleStar: { key: 's', description: 'Toggle star' },
  markRead: { key: 'Shift+I', description: 'Mark as read' },
  markUnread: { key: 'Shift+U', description: 'Mark as unread' },
  compose: { key: 'c', description: 'Compose new' },
  search: { key: '/', description: 'Search' },
  labelPicker: { key: 'l', description: 'Label picker' },
  goInbox: { key: 'g i', description: 'Go to Inbox' },
  goStarred: { key: 'g s', description: 'Go to Starred' },
  goDrafts: { key: 'g d', description: 'Go to Drafts' },
  goSent: { key: 'g t', description: 'Go to Sent' },
}
```

**Step 2: Create mailHelpers.ts**

Create `frontend-next/src/pages/mail/utils/mailHelpers.ts`:

```typescript
export function formatEmailDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()) {
    return 'Yesterday'
  }

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function parseEmailAddress(raw: string): { name: string; email: string } {
  // "Jake Rogers <jake@example.com>" => { name: "Jake Rogers", email: "jake@example.com" }
  const match = raw.match(/^"?(.+?)"?\s*<(.+)>$/)
  if (match) return { name: match[1].trim(), email: match[2].trim() }
  return { name: '', email: raw.trim() }
}

export function truncateSnippet(snippet: string, maxLength = 100): string {
  if (snippet.length <= maxLength) return snippet
  return snippet.substring(0, maxLength).trimEnd() + '...'
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
```

**Step 3: Commit**

```bash
git add frontend-next/src/pages/mail/utils/mailConstants.ts frontend-next/src/pages/mail/utils/mailHelpers.ts
git commit -m "feat(frontend): add Mail constants and helper utilities"
```

---

## Task 12: Mail Page + Route + Sidebar Config

**Files:**
- Create: `frontend-next/src/pages/MailPage.tsx`
- Create: `frontend-next/src/pages/mail/components/ConnectGmailPrompt.tsx`
- Modify: `frontend-next/src/router.tsx`
- Modify: `frontend-next/src/layouts/sidebarConfig.ts`

This is the skeleton task — gets Mail accessible at `/mail` with sidebar integration and the "Connect Gmail" onboarding screen. Subsequent tasks fill in the message list, reading pane, compose, etc.

**Step 1: Create ConnectGmailPrompt.tsx**

Create `frontend-next/src/pages/mail/components/ConnectGmailPrompt.tsx`:

```typescript
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button.js'
import { apiClient } from '@/api/client.js'

export function ConnectGmailPrompt() {
  async function handleConnect() {
    const { url } = await apiClient.get<{ url: string }>('/mail/oauth/authorize')
    window.location.href = url
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-accent-light flex items-center justify-center">
        <Mail className="size-8 text-accent" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Connect your Gmail</h2>
        <p className="text-text-secondary text-sm max-w-md">
          Read, compose, and manage your email right from LyfeHub.
          Your emails stay in Gmail — nothing is stored locally.
        </p>
      </div>
      <Button onClick={handleConnect} size="lg">
        Connect Gmail Account
      </Button>
    </div>
  )
}
```

**Step 2: Create MailPage.tsx**

Create `frontend-next/src/pages/MailPage.tsx`:

```typescript
import { useMailStatus } from '@/api/hooks/index.js'
import { ConnectGmailPrompt } from '@/pages/mail/components/ConnectGmailPrompt.js'

export default function MailPage() {
  const { data: status, isLoading } = useMailStatus()

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-text-secondary text-sm">Loading mail...</p>
      </div>
    )
  }

  if (!status?.connected) {
    return <ConnectGmailPrompt />
  }

  return (
    <div className="flex h-full">
      {/* Message list + reading pane will be added in subsequent tasks */}
      <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
        Mail connected as {status.email}. UI components coming next.
      </div>
    </div>
  )
}
```

**Step 3: Add route in router.tsx**

In `frontend-next/src/router.tsx`:

Add import at the top:
```typescript
import MailPage from '@/pages/MailPage'
```

Add route inside the children array (after `calendar`):
```typescript
{ path: 'mail', element: <MailPage /> },
```

**Step 4: Add Mail to sidebar config**

In `frontend-next/src/layouts/sidebarConfig.ts`:

Add `Mail` to the icon imports:
```typescript
import { Mail } from 'lucide-react'
```

Add Mail to the Productivity section in BOTH the `/` and `/bases` contextual sections. In the `'/'` key's `productivity` section, add after Tasks:
```typescript
{ label: 'Mail', icon: Mail, to: '/mail' },
```

Do the same in the `/bases` key's `productivity` section.

Also add a `/mail` key to `contextualSections` that will later hold the label sidebar content (for now, copy the same structure as `/`):

```typescript
'/mail': [
  {
    key: 'mail-nav',
    header: 'Mail',
    icon: Mail,
    items: [
      { label: 'Inbox', icon: Inbox, to: '/mail?label=INBOX' },
      { label: 'Starred', icon: Star, to: '/mail?label=STARRED' },
      { label: 'Sent', icon: Send, to: '/mail?label=SENT' },
      { label: 'Drafts', icon: FileText, to: '/mail?label=DRAFT' },
      { label: 'Trash', icon: Trash2, to: '/mail?label=TRASH' },
    ],
  },
  {
    key: 'productivity',
    header: 'Productivity',
    icon: Briefcase,
    items: [
      { label: 'Calendar', icon: Calendar, to: '/calendar' },
      { label: 'Tasks', icon: CheckSquare, to: '/tasks' },
      { label: 'Mail', icon: Mail, to: '/mail' },
    ],
  },
  {
    key: 'resources',
    header: 'Resources',
    icon: BookOpen,
    items: [
      { label: 'Notes', icon: FileText, to: '/notes' },
      { label: 'People', icon: Users, to: '/people' },
      { label: 'Bases', icon: Database, to: '/bases' },
    ],
  },
],
```

Add the needed icon imports to sidebarConfig.ts:
```typescript
import { Mail, Inbox, Star, Send, Trash2 } from 'lucide-react'
```

**Step 5: Verify the app compiles and routes work**

```bash
cd frontend-next && npx tsc --noEmit 2>&1 | head -20
```

Expected: No new errors.

**Step 6: Commit**

```bash
git add frontend-next/src/pages/MailPage.tsx frontend-next/src/pages/mail/components/ConnectGmailPrompt.tsx frontend-next/src/router.tsx frontend-next/src/layouts/sidebarConfig.ts
git commit -m "feat(frontend): add Mail page skeleton with route, sidebar config, and Gmail connect prompt"
```

---

## Task 13: MailList Component (Message List)

**Files:**
- Create: `frontend-next/src/pages/mail/components/list/MailList.tsx`
- Create: `frontend-next/src/pages/mail/components/list/MailListItem.tsx`
- Create: `frontend-next/src/pages/mail/components/list/MailListToolbar.tsx`

These compose the left panel of the 2-column mail layout. The list fetches messages for the active label, shows infinite scroll, and delegates selection to the UI store.

**Step 1: Create MailListToolbar.tsx**

Create `frontend-next/src/pages/mail/components/list/MailListToolbar.tsx`:

```typescript
import { Search, RefreshCw, Settings } from 'lucide-react'
import { Input } from '@/components/ui/input.js'
import { Button } from '@/components/ui/button.js'
import { useMailUiStore } from '@/stores/mailUiStore.js'

interface Props {
  onRefresh: () => void
  isRefreshing: boolean
  onOpenSettings?: () => void
}

export function MailListToolbar({ onRefresh, isRefreshing, onOpenSettings }: Props) {
  const { searchQuery, setSearchQuery } = useMailUiStore()

  return (
    <div className="flex items-center gap-2 p-3 border-b border-border">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
        <Input
          placeholder="Search mail..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-8 text-sm"
          id="mail-search-input"
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={onRefresh}
        disabled={isRefreshing}
        title="Refresh"
      >
        <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      </Button>
      {onOpenSettings && (
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onOpenSettings}
          title="Mail settings"
        >
          <Settings className="size-4" />
        </Button>
      )}
    </div>
  )
}
```

**Step 2: Create MailListItem.tsx**

Create `frontend-next/src/pages/mail/components/list/MailListItem.tsx`:

```typescript
import { Star, Paperclip } from 'lucide-react'
import type { MailMessageSummary } from '@/types/index.js'
import { formatEmailDate, parseEmailAddress, truncateSnippet } from '@/pages/mail/utils/mailHelpers.js'

interface Props {
  message: MailMessageSummary
  isSelected: boolean
  onSelect: () => void
  onToggleStar: () => void
}

export function MailListItem({ message, isSelected, onSelect, onToggleStar }: Props) {
  const sender = parseEmailAddress(message.from)
  const displayName = sender.name || sender.email

  return (
    <div
      onClick={onSelect}
      className={[
        'flex items-start gap-3 px-3 py-2.5 cursor-pointer border-b border-border transition-colors',
        isSelected ? 'bg-accent-light' : 'hover:bg-bg-hover',
        !message.isRead ? 'bg-bg-surface' : '',
      ].join(' ')}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggleStar() }}
        className="mt-0.5 shrink-0"
      >
        <Star
          className={`size-4 ${message.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-text-muted hover:text-yellow-400'}`}
        />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm truncate ${!message.isRead ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
            {displayName}
          </span>
          <span className="text-xs text-text-muted shrink-0">
            {formatEmailDate(message.date)}
          </span>
        </div>
        <div className={`text-sm truncate ${!message.isRead ? 'font-medium text-text-primary' : 'text-text-secondary'}`}>
          {message.subject || '(no subject)'}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-muted truncate">
            {truncateSnippet(message.snippet, 80)}
          </span>
          {message.hasAttachments && (
            <Paperclip className="size-3 text-text-muted shrink-0" />
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 3: Create MailList.tsx**

Create `frontend-next/src/pages/mail/components/list/MailList.tsx`:

```typescript
import { useEffect, useRef, useCallback } from 'react'
import { useMailMessages, useToggleStar } from '@/api/hooks/index.js'
import { useMailUiStore } from '@/stores/mailUiStore.js'
import { MailListItem } from './MailListItem.js'
import { MailListToolbar } from './MailListToolbar.js'

interface Props {
  onOpenSettings?: () => void
}

export function MailList({ onOpenSettings }: Props) {
  const { activeLabel, searchQuery, selectedMessageId, setSelectedMessage } = useMailUiStore()
  const toggleStar = useToggleStar()

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useMailMessages(activeLabel, searchQuery)

  const messages = data?.pages.flatMap(p => p.messages) ?? []

  // Infinite scroll
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || !hasNextPage || isFetchingNextPage) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  return (
    <div className="flex flex-col h-full border-r border-border w-[400px] shrink-0">
      <MailListToolbar
        onRefresh={() => refetch()}
        isRefreshing={isRefetching}
        onOpenSettings={onOpenSettings}
      />

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-text-secondary text-sm">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="p-4 text-text-muted text-sm text-center">No messages</div>
        ) : (
          messages.map(msg => (
            <MailListItem
              key={msg.id}
              message={msg}
              isSelected={selectedMessageId === msg.id}
              onSelect={() => setSelectedMessage(msg.id, msg.threadId)}
              onToggleStar={() => toggleStar.mutate(msg.id)}
            />
          ))
        )}

        {isFetchingNextPage && (
          <div className="p-3 text-text-muted text-xs text-center">Loading more...</div>
        )}
      </div>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add frontend-next/src/pages/mail/components/list/
git commit -m "feat(frontend): add MailList, MailListItem, and MailListToolbar components"
```

---

## Task 14: MailDetail Component (Reading Pane)

**Files:**
- Create: `frontend-next/src/pages/mail/components/detail/MailDetail.tsx`
- Create: `frontend-next/src/pages/mail/components/detail/MailDetailHeader.tsx`
- Create: `frontend-next/src/pages/mail/components/detail/MailDetailBody.tsx`
- Create: `frontend-next/src/pages/mail/components/detail/MailDetailActions.tsx`
- Create: `frontend-next/src/pages/mail/components/detail/MailThread.tsx`
- Create: `frontend-next/src/pages/mail/components/detail/MailThreadMessage.tsx`

These compose the right panel reading pane. Shows the selected thread/message with actions.

Build each component following the same patterns as the list components: use the TanStack Query hooks (`useMailThread`, `useMailMessage`), the UI store (`useMailUiStore`), and the mutation hooks (`useArchiveMail`, `useTrashMail`, `useToggleRead`, etc.). Render the email body inside a sandboxed `<iframe>` with `sandbox="allow-same-origin"` and inject the HTML via `srcdoc`. Thread view renders as a collapsible accordion with the latest message expanded.

**Step 1: Build all 6 files**

Build `MailDetailHeader.tsx` (subject, from/to/cc, date, label chips), `MailDetailBody.tsx` (sandboxed iframe with `srcdoc={body}`), `MailDetailActions.tsx` (Reply, Reply All, Forward, Archive, Trash, Label picker buttons), `MailThreadMessage.tsx` (single message in a thread, collapsible), `MailThread.tsx` (fetches thread, renders MailThreadMessage for each, latest expanded), and `MailDetail.tsx` (container that decides: if `selectedThreadId`, render MailThread; else empty state).

Each file follows established patterns — shadcn Button/Badge components, Lucide icons, hooks from `@/api/hooks/index.js`, store from `@/stores/mailUiStore.js`.

**Step 2: Commit**

```bash
git add frontend-next/src/pages/mail/components/detail/
git commit -m "feat(frontend): add reading pane components (MailDetail, MailThread, actions, body iframe)"
```

---

## Task 15: ComposeModal with Tiptap Editor

**Files:**
- Create: `frontend-next/src/pages/mail/components/compose/ComposeModal.tsx`
- Create: `frontend-next/src/pages/mail/components/compose/AttachmentZone.tsx`
- Create: `frontend-next/src/pages/mail/components/compose/RecipientField.tsx`
- Create: `frontend-next/src/pages/mail/components/compose/RichTextEditor.tsx`

**Step 1: Build RecipientField.tsx**

Combobox for To/Cc/Bcc fields. Uses `useMailContacts(q)` hook with 300ms debounce. Selected contacts render as removable chips (Badge + X button). Input triggers search on typing.

**Step 2: Build RichTextEditor.tsx**

Wrapper around Tiptap. Uses `@tiptap/starter-kit` + `@tiptap/extension-link`. Toolbar with Bold/Italic/Underline/Strikethrough/BulletList/OrderedList/Link/Blockquote/Code buttons. Exposes `getHTML()` for the parent to read content.

**Step 3: Build AttachmentZone.tsx**

Drag-and-drop area + "Attach file" button. Shows file list with name, size, type, and remove button. Validates total size against 25MB limit. Uses native HTML drag events (`onDragOver`, `onDrop`) and a hidden file input.

**Step 4: Build ComposeModal.tsx**

shadcn Dialog containing: RecipientField (to, cc, bcc — cc/bcc toggle), subject Input, RichTextEditor, AttachmentZone, Send/Discard buttons. Reads `composeMode` and `composeReplyTo` from `useMailUiStore`. On send, builds FormData if attachments present, otherwise sends JSON via `useSendMail()`. On close, calls `closeCompose()` on the store.

**Step 5: Commit**

```bash
git add frontend-next/src/pages/mail/components/compose/
git commit -m "feat(frontend): add ComposeModal with Tiptap editor, recipient autocomplete, and attachments"
```

---

## Task 16: Wire MailPage Layout

**Files:**
- Modify: `frontend-next/src/pages/MailPage.tsx`

**Step 1: Update MailPage to render the 2-column layout**

Replace the placeholder content with:

```typescript
import { useMailStatus } from '@/api/hooks/index.js'
import { useMailUiStore } from '@/stores/mailUiStore.js'
import { ConnectGmailPrompt } from '@/pages/mail/components/ConnectGmailPrompt.js'
import { MailList } from '@/pages/mail/components/list/MailList.js'
import { MailDetail } from '@/pages/mail/components/detail/MailDetail.js'
import { ComposeModal } from '@/pages/mail/components/compose/ComposeModal.js'

export default function MailPage() {
  const { data: status, isLoading } = useMailStatus()
  const { composeOpen } = useMailUiStore()

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-text-secondary text-sm">Loading mail...</p>
      </div>
    )
  }

  if (!status?.connected) {
    return <ConnectGmailPrompt />
  }

  return (
    <>
      <div className="flex h-full">
        <MailList />
        <MailDetail />
      </div>
      {composeOpen && <ComposeModal />}
    </>
  )
}
```

**Step 2: Commit**

```bash
git add frontend-next/src/pages/MailPage.tsx
git commit -m "feat(frontend): wire MailPage with 2-column layout (list + reading pane + compose modal)"
```

---

## Task 17: Hotkey System

**Files:**
- Create: `frontend-next/src/pages/mail/hooks/useMailHotkeys.ts`
- Create: `frontend-next/src/pages/mail/components/settings/HotkeySettings.tsx`

**Step 1: Create useMailHotkeys.ts**

A hook that:
1. Loads defaults from `mailConstants.ts`
2. Merges with user overrides from `useMailStatus().data.hotkeys`
3. Registers `keydown` event listeners scoped to `/mail` route
4. Handles two-key chords (`g then i`) with a 500ms timeout
5. Calls the appropriate action (archive, trash, compose, navigate, etc.) from store/mutations
6. Disables all hotkeys when `composeOpen` is true (typing priority)

Hook signature:
```typescript
export function useMailHotkeys() { ... }
```

Call this hook in MailPage.tsx after the connected check.

**Step 2: Create HotkeySettings.tsx**

A settings panel (can be in a Dialog) showing:
- Table of all actions with current keybinding
- Click-to-rebind: focus a field, press new key combo, save
- Reset to defaults button
- Uses `useSaveHotkeys()` mutation to persist

**Step 3: Commit**

```bash
git add frontend-next/src/pages/mail/hooks/useMailHotkeys.ts frontend-next/src/pages/mail/components/settings/HotkeySettings.tsx
git commit -m "feat(frontend): add customizable hotkey system for Mail (Gmail defaults + user overrides)"
```

---

## Task 18: Filter Settings Panel

**Files:**
- Create: `frontend-next/src/pages/mail/components/settings/FilterSettings.tsx`

**Step 1: Build FilterSettings.tsx**

A Dialog/panel showing:
- List of existing Gmail filters (from `useMailFilters()`) with delete button
- "Create Filter" form with fields: From, To, Subject, Query (text inputs), Has Attachment (checkbox), and actions: Add Label (select from labels), Remove Label, Archive, Star, Mark Read, Forward To
- Uses `useCreateFilter()` and `useDeleteFilter()` mutations
- Label select dropdown populated from `useMailLabels()`

**Step 2: Commit**

```bash
git add frontend-next/src/pages/mail/components/settings/FilterSettings.tsx
git commit -m "feat(frontend): add Gmail filter management UI (list, create, delete)"
```

---

## Task 19: Mail Sidebar Content Component

**Files:**
- Create: `frontend-next/src/pages/mail/components/MailSidebarContent.tsx`
- Modify: `frontend-next/src/layouts/sidebarConfig.ts`

**Step 1: Create MailSidebarContent.tsx**

Dynamic sidebar content (like `BaseSidebarContent`) that:
- Shows Compose button at top (opens compose via `useMailUiStore().openCompose()`)
- Shows system labels (Inbox with unread badge, Starred, Sent, Drafts, Trash) — uses `useMailLabels()` for unread counts
- Shows separator then custom user labels from `useMailLabels()` (type === 'user')
- Clicking a label calls `setActiveLabel()` on the store
- Active label highlighted with `bg-accent-light text-accent`

**Step 2: Update sidebarConfig.ts**

Replace the static `/mail` items section with the dynamic component:

```typescript
'/mail': [
  {
    key: 'mail-nav',
    header: 'Mail',
    icon: Mail,
    items: [],
    component: MailSidebarContent,
  },
  // ... keep productivity and resources sections
],
```

Import `MailSidebarContent` at the top.

**Step 3: Commit**

```bash
git add frontend-next/src/pages/mail/components/MailSidebarContent.tsx frontend-next/src/layouts/sidebarConfig.ts
git commit -m "feat(frontend): add dynamic Mail sidebar with labels, unread badges, and compose button"
```

---

## Task 20: Responsive Layout

**Files:**
- Modify: `frontend-next/src/pages/MailPage.tsx`
- Modify: `frontend-next/src/pages/mail/components/list/MailList.tsx`
- Modify: `frontend-next/src/pages/mail/components/detail/MailDetail.tsx`

**Step 1: Add responsive breakpoints**

- Desktop (>1024px): Current 2-column layout
- Tablet (768-1024px): message list narrows (300px), reading pane fills rest
- Mobile (<768px): Show only message list. When a message is selected, show full-screen reading view with back button. Compose is full-screen Dialog.

Use Tailwind responsive prefixes (`lg:`, `md:`) and the `selectedMessageId` from the store to toggle between list-only and detail-only views on mobile.

**Step 2: Commit**

```bash
git add frontend-next/src/pages/MailPage.tsx frontend-next/src/pages/mail/components/list/MailList.tsx frontend-next/src/pages/mail/components/detail/MailDetail.tsx
git commit -m "feat(frontend): add responsive layout for Mail (desktop 2-col, tablet narrow, mobile list/detail toggle)"
```

---

## Task 21: Auto-Refresh and Query Param Sync

**Files:**
- Modify: `frontend-next/src/pages/MailPage.tsx`
- Modify: `frontend-next/src/pages/mail/components/list/MailList.tsx`

**Step 1: Add auto-refresh**

In `useMailMessages`, add `refetchInterval: 60000` to auto-refresh every 60 seconds.

**Step 2: Sync query params to URL**

Read `label` and `q` from `useSearchParams()`. When the store's `activeLabel` or `searchQuery` changes, update the URL params. When the URL params change (e.g., clicking a sidebar label link), update the store.

This keeps the URL in sync so `/mail?label=STARRED` shows starred messages.

**Step 3: Commit**

```bash
git add frontend-next/src/pages/MailPage.tsx frontend-next/src/pages/mail/components/list/MailList.tsx
git commit -m "feat(frontend): add 60s auto-refresh and URL query param sync for Mail"
```

---

## Task 22: Environment Variables and Docker Config

**Files:**
- Modify: `backend/.env.example` (or create if missing)
- Modify: `docker-compose.yml`
- Modify: `docker-compose.prod.yml`

**Step 1: Add env vars to .env.example**

```
# Gmail Integration
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/mail/oauth/callback
MAIL_ENCRYPTION_KEY=generate-a-random-32-char-string
```

**Step 2: Pass env vars through Docker compose files**

Add to the `lyfehub-dev` service environment in both compose files:

```yaml
- GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
- GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
- GOOGLE_REDIRECT_URI=${GOOGLE_REDIRECT_URI}
- MAIL_ENCRYPTION_KEY=${MAIL_ENCRYPTION_KEY}
```

**Step 3: Commit**

```bash
git add backend/.env.example docker-compose.yml docker-compose.prod.yml
git commit -m "chore: add Gmail OAuth environment variables to env example and Docker compose"
```

---

## Task 23: Update ROADMAP.md

**Files:**
- Modify: `docs/ROADMAP.md`

**Step 1: Add Mail section**

Add a new "### Mail" section under "## LyfeHub Personal" in ROADMAP.md:

```markdown
### Mail (Gmail Integration)

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Gmail OAuth connection | Done | Done | Done |
| Token encryption (AES-256-GCM) | Done | -- | Done |
| Message list (inbox, labels, search) | Done | Done | Done |
| Message reading pane | Done | Done | Done |
| Thread view (collapsible accordion) | Done | Done | Done |
| Compose with Tiptap rich text | Done | Done | Done |
| Reply / Reply All / Forward | Done | Done | Done |
| File attachments (send + download) | Done | Done | Done |
| Contact autocomplete (People API) | Done | Done | Done |
| Labels (list, create, delete, apply) | Done | Done | Done |
| Gmail filters (list, create, delete) | Done | Done | Done |
| Keyboard shortcuts (customizable) | Done | Done | Done |
| Sidebar integration (contextual labels) | -- | Done | Done |
| Responsive layout (desktop/tablet/mobile) | -- | Done | Done |
| Auto-refresh (60s interval) | -- | Done | Done |
| Batch operations (multi-select) | Not started | Not started | Not Started |
| Email signatures | Not started | Not started | Not Started |
| Snooze | Not started | Not started | Not Started |
```

**Step 2: Commit**

```bash
git add docs/ROADMAP.md
git commit -m "docs: add Mail (Gmail Integration) feature tracking to ROADMAP.md"
```

---

## Summary

| Task | What it builds | Files created/modified |
|------|---------------|----------------------|
| 1 | googleapis dependency | backend/package.json |
| 2 | mail_accounts table | backend/src/db/init.sql |
| 3 | Token encryption | backend/src/lib/encryption.ts |
| 4 | Gmail API service wrapper | backend/src/lib/gmailService.ts |
| 5 | Mail DB helper | backend/src/db/mail.ts |
| 6 | Backend routes (/api/mail/*) | backend/src/routes/mail.ts, backend/src/index.ts |
| 7 | Frontend types | frontend-next/src/types/mail.ts, types/index.ts |
| 8 | TanStack Query hooks (25 hooks) | frontend-next/src/api/hooks/useMail.ts, hooks/index.ts |
| 9 | Tiptap dependency | frontend-next/package.json |
| 10 | Mail UI store (Zustand) | frontend-next/src/stores/mailUiStore.ts |
| 11 | Constants + helpers | frontend-next/src/pages/mail/utils/ |
| 12 | MailPage + route + sidebar config | MailPage.tsx, router.tsx, sidebarConfig.ts |
| 13 | Message list components | frontend-next/src/pages/mail/components/list/ |
| 14 | Reading pane + thread view | frontend-next/src/pages/mail/components/detail/ |
| 15 | Compose modal + Tiptap + attachments | frontend-next/src/pages/mail/components/compose/ |
| 16 | Wire MailPage layout | MailPage.tsx |
| 17 | Hotkey system | hooks/useMailHotkeys.ts, settings/HotkeySettings.tsx |
| 18 | Filter settings panel | settings/FilterSettings.tsx |
| 19 | Dynamic sidebar content | MailSidebarContent.tsx, sidebarConfig.ts |
| 20 | Responsive layout | MailPage.tsx, list/detail components |
| 21 | Auto-refresh + URL sync | MailPage.tsx, MailList.tsx |
| 22 | Docker/env config | .env.example, docker-compose files |
| 23 | Roadmap update | docs/ROADMAP.md |

**Dependencies:** Tasks 1-6 (backend) can be done in parallel with tasks 7-11 (frontend types/hooks/utils). Tasks 12-19 are sequential (each builds on the previous). Tasks 20-23 are independent polish tasks.
