import { create } from 'zustand'
import { getUserSettings, saveSettingsKey } from '@/hooks/useUserSettings.js'
import type { TabStyleConfig } from '@/hooks/useUserSettings.js'
import type { AreaId } from '@/layouts/headerConfig.js'
import { personalArea, apexArea } from '@/layouts/headerConfig.js'

interface HeaderState {
  tabDisplayMode: 'icon-label' | 'icon-only' | 'label-only'
  personalTabOrder: string[]
  apexTabOrder: string[]
  tabStyles: Record<string, TabStyleConfig>
  homeDashboard: AreaId
  _hydrated: boolean

  hydrate: () => void
  setTabDisplayMode: (mode: 'icon-label' | 'icon-only' | 'label-only') => void
  setTabOrder: (area: AreaId, order: string[]) => void
  setTabStyle: (tabId: string, style: TabStyleConfig) => void
  setHomeDashboard: (area: AreaId) => void
}

function persistHeader(state: HeaderState) {
  saveSettingsKey('header', {
    tabDisplayMode: state.tabDisplayMode,
    personalTabOrder: state.personalTabOrder,
    apexTabOrder: state.apexTabOrder,
    tabStyles: state.tabStyles,
    homeDashboard: state.homeDashboard,
  })
}

export const useHeaderStore = create<HeaderState>((set, get) => ({
  tabDisplayMode: 'icon-label',
  personalTabOrder: personalArea.tabs.map((t) => t.id),
  apexTabOrder: apexArea.tabs.map((t) => t.id),
  tabStyles: {},
  homeDashboard: 'personal',
  _hydrated: false,

  hydrate: () => {
    if (get()._hydrated) return
    const settings = getUserSettings()
    const h = settings.header
    set({
      tabDisplayMode: h?.tabDisplayMode ?? 'icon-label',
      personalTabOrder:
        h?.personalTabOrder ?? personalArea.tabs.map((t) => t.id),
      apexTabOrder: h?.apexTabOrder ?? apexArea.tabs.map((t) => t.id),
      tabStyles: h?.tabStyles ?? {},
      homeDashboard: h?.homeDashboard ?? 'personal',
      _hydrated: true,
    })
  },

  setTabDisplayMode: (mode) => {
    set({ tabDisplayMode: mode })
    persistHeader(get())
  },

  setTabOrder: (area, order) => {
    if (area === 'personal') {
      set({ personalTabOrder: order })
    } else {
      set({ apexTabOrder: order })
    }
    persistHeader(get())
  },

  setTabStyle: (tabId, style) => {
    set((state) => ({
      tabStyles: { ...state.tabStyles, [tabId]: style },
    }))
    persistHeader(get())
  },

  setHomeDashboard: (area) => {
    set({ homeDashboard: area })
    persistHeader(get())
  },
}))
