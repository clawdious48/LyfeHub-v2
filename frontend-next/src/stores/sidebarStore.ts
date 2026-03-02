import { create } from 'zustand'
import { getUserSettings, saveSettingsKey } from '@/hooks/useUserSettings.js'

interface SidebarState {
  collapsed: boolean
  sectionStates: Record<string, boolean>
  _hydrated: boolean
  hydrate: () => void
  toggleCollapsed: () => void
  toggleSection: (key: string) => void
  isSectionCollapsed: (key: string) => boolean
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  collapsed: false,
  sectionStates: {},
  _hydrated: false,

  hydrate: () => {
    if (get()._hydrated) return
    const settings = getUserSettings()
    set({
      collapsed: settings.sidebar?.collapsed ?? false,
      sectionStates: settings.sidebar?.sections ?? {},
      _hydrated: true,
    })
  },

  toggleCollapsed: () => {
    set((state) => {
      const next = !state.collapsed
      saveSettingsKey('sidebar', {
        collapsed: next,
        sections: state.sectionStates,
      })
      return { collapsed: next }
    })
  },

  toggleSection: (key: string) => {
    set((state) => {
      const next = { ...state.sectionStates, [key]: !state.sectionStates[key] }
      saveSettingsKey('sidebar', {
        collapsed: state.collapsed,
        sections: next,
      })
      return { sectionStates: next }
    })
  },

  isSectionCollapsed: (key: string) => {
    return get().sectionStates[key] ?? false
  },
}))
