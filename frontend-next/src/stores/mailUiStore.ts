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
