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
  apiClient
    .patch('/users/me', { settings: toSave })
    .then(() => {
      // Keep auth store's user.settings in sync
      const { user } = useAuth.getState()
      if (user) {
        useAuth.setState({
          user: {
            ...user,
            settings: { ...(user.settings as Record<string, unknown>), ...toSave },
          },
        })
      }
    })
    .catch((err) => {
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
    try { return JSON.parse(user.settings as string) } catch { return {} }
  }
  return user.settings as UserSettings
}
