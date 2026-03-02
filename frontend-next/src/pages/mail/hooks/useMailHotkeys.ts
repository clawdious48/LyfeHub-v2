import { useEffect, useRef, useCallback, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import {
  useMailStatus,
  useMailMessages,
  useArchiveMail,
  useTrashMail,
  useToggleStar,
  useToggleRead,
} from '@/api/hooks/index.js'
import { useMailUiStore } from '@/stores/mailUiStore.js'
import { DEFAULT_HOTKEYS } from '@/pages/mail/utils/mailConstants.js'

export function useMailHotkeys() {
  const { pathname } = useLocation()
  const {
    activeLabel,
    searchQuery,
    selectedMessageId,
    composeOpen,
    setSelectedMessage,
    openCompose,
    setActiveLabel,
  } = useMailUiStore()

  const { data: status } = useMailStatus()
  const { data: messagesData } = useMailMessages(activeLabel, searchQuery)
  const archiveMail = useArchiveMail()
  const trashMail = useTrashMail()
  const toggleStar = useToggleStar()
  const toggleRead = useToggleRead()

  const messages = useMemo(
    () => messagesData?.pages.flatMap(p => p.messages) ?? [],
    [messagesData],
  )

  // Merge default hotkeys with user overrides
  const hotkeys = useMemo(() => {
    const merged: Record<string, string> = {}
    for (const [action, def] of Object.entries(DEFAULT_HOTKEYS)) {
      merged[action] = def.key
    }
    if (status?.hotkeys) {
      for (const [action, key] of Object.entries(status.hotkeys)) {
        merged[action] = key
      }
    }
    return merged
  }, [status?.hotkeys])

  // Build reverse map: key string -> action name
  const keyToAction = useMemo(() => {
    const map = new Map<string, string>()
    for (const [action, key] of Object.entries(hotkeys)) {
      map.set(key, action)
    }
    return map
  }, [hotkeys])

  // Chord state
  const pendingKeyRef = useRef<string | null>(null)
  const chordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Refs for latest values (avoid stale closures)
  const selectedMessageIdRef = useRef(selectedMessageId)
  selectedMessageIdRef.current = selectedMessageId
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  const executeAction = useCallback((action: string) => {
    const currentMessages = messagesRef.current
    const currentSelected = selectedMessageIdRef.current

    switch (action) {
      case 'nextMessage': {
        if (currentMessages.length === 0) return
        const idx = currentMessages.findIndex(m => m.id === currentSelected)
        const nextIdx = idx < 0 ? 0 : Math.min(idx + 1, currentMessages.length - 1)
        const next = currentMessages[nextIdx]
        if (next) setSelectedMessage(next.id, next.threadId)
        break
      }
      case 'prevMessage': {
        if (currentMessages.length === 0) return
        const idx = currentMessages.findIndex(m => m.id === currentSelected)
        const prevIdx = idx <= 0 ? 0 : idx - 1
        const prev = currentMessages[prevIdx]
        if (prev) setSelectedMessage(prev.id, prev.threadId)
        break
      }
      case 'openMessage': {
        // If nothing selected, select first
        if (!currentSelected && currentMessages.length > 0) {
          const first = currentMessages[0]
          setSelectedMessage(first.id, first.threadId)
        }
        break
      }
      case 'backToList':
        setSelectedMessage(null)
        break
      case 'archive':
        if (currentSelected) archiveMail.mutate(currentSelected)
        break
      case 'trash':
        if (currentSelected) trashMail.mutate(currentSelected)
        break
      case 'toggleStar':
        if (currentSelected) toggleStar.mutate(currentSelected)
        break
      case 'markRead':
        if (currentSelected) toggleRead.mutate({ messageId: currentSelected, markAs: 'read' })
        break
      case 'markUnread':
        if (currentSelected) toggleRead.mutate({ messageId: currentSelected, markAs: 'unread' })
        break
      case 'reply':
        openCompose('reply')
        break
      case 'replyAll':
        openCompose('replyAll')
        break
      case 'forward':
        openCompose('forward')
        break
      case 'compose':
        openCompose('new')
        break
      case 'search':
        document.getElementById('mail-search-input')?.focus()
        break
      case 'labelPicker':
        // Future: open label picker modal
        break
      case 'goInbox':
        setActiveLabel('INBOX')
        break
      case 'goStarred':
        setActiveLabel('STARRED')
        break
      case 'goDrafts':
        setActiveLabel('DRAFT')
        break
      case 'goSent':
        setActiveLabel('SENT')
        break
    }
  }, [setSelectedMessage, openCompose, setActiveLabel, archiveMail, trashMail, toggleStar, toggleRead])

  useEffect(() => {
    if (!pathname.startsWith('/mail')) return

    function handleKeyDown(e: KeyboardEvent) {
      // Disable hotkeys when compose is open or typing in inputs
      if (useMailUiStore.getState().composeOpen) return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      // Build the key string
      let keyStr = e.key
      if (e.shiftKey && keyStr.length === 1) {
        keyStr = `Shift+${keyStr.toUpperCase()}`
      }

      // Check for chord completion
      if (pendingKeyRef.current) {
        const chordStr = `${pendingKeyRef.current} ${keyStr}`
        pendingKeyRef.current = null
        if (chordTimeoutRef.current) {
          clearTimeout(chordTimeoutRef.current)
          chordTimeoutRef.current = null
        }
        const chordAction = keyToAction.get(chordStr)
        if (chordAction) {
          e.preventDefault()
          executeAction(chordAction)
          return
        }
        // Chord didn't match, fall through to single-key check
      }

      // Check if this key starts a chord (e.g., 'g')
      const startsChord = Array.from(keyToAction.keys()).some(
        k => k.startsWith(`${keyStr} `) && k.includes(' ')
      )
      if (startsChord) {
        e.preventDefault()
        pendingKeyRef.current = keyStr
        chordTimeoutRef.current = setTimeout(() => {
          pendingKeyRef.current = null
          chordTimeoutRef.current = null
        }, 500)
        return
      }

      // Single key action
      const action = keyToAction.get(keyStr)
      if (action) {
        // Don't prevent default for / (search) — let focus happen naturally
        if (keyStr !== '/') e.preventDefault()
        executeAction(action)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (chordTimeoutRef.current) {
        clearTimeout(chordTimeoutRef.current)
      }
    }
  }, [pathname, keyToAction, executeAction])
}
