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
