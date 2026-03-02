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
