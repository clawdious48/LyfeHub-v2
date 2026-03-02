import { create } from 'zustand'
import { getUserSettings, saveSettingsKey } from '@/hooks/useUserSettings.js'

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

  // Hydration
  _hydrated: boolean
  hydrate: () => void

  // Actions
  setReadingPanePosition: (pos: 'right' | 'bottom') => void
  setSelectedMessage: (id: string | null, threadId?: string | null) => void
  openCompose: (mode?: 'new' | 'reply' | 'replyAll' | 'forward', replyTo?: MailUiState['composeReplyTo']) => void
  closeCompose: () => void
  setActiveLabel: (label: string) => void
  setSearchQuery: (q: string) => void
  setFocusZone: (zone: 'list' | 'detail') => void
}

export const useMailUiStore = create<MailUiState>((set, get) => ({
  readingPanePosition: 'right',

  selectedMessageId: null,
  selectedThreadId: null,
  composeOpen: false,
  composeMode: 'new',
  composeReplyTo: null,
  activeLabel: 'INBOX',
  searchQuery: '',
  focusZone: 'list',

  _hydrated: false,

  hydrate: () => {
    if (get()._hydrated) return
    const settings = getUserSettings()
    const m = settings.mail
    set({
      readingPanePosition: m?.readingPanePosition ?? 'right',
      _hydrated: true,
    })
  },

  setReadingPanePosition: (pos) => {
    set({ readingPanePosition: pos })
    saveSettingsKey('mail', { readingPanePosition: pos })
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
}))
