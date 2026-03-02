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

// CommonJS-compatible export
module.exports = {
  getAuthUrl,
  exchangeCode,
  listMessages,
  getMessage,
  getThread,
  modifyMessage,
  trashMessage,
  sendMessage,
  getAttachment,
  listLabels,
  createLabel,
  updateLabel,
  deleteLabel,
  listDrafts,
  createDraft,
  deleteDraft,
  suggestContacts,
  listFilters,
  createFilter,
  deleteFilter,
}
