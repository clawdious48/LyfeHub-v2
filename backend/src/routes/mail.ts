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
