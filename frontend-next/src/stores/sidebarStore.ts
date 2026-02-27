import { create } from 'zustand'

const COLLAPSED_KEY = 'lyfehub-sidebar-collapsed'
const SECTIONS_KEY = 'lyfehub-sidebar-sections'

function loadCollapsed(): boolean {
  return localStorage.getItem(COLLAPSED_KEY) === '1'
}

function loadSections(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(SECTIONS_KEY) || '{}')
  } catch {
    return {}
  }
}

interface SidebarState {
  collapsed: boolean
  sectionStates: Record<string, boolean>
  toggleCollapsed: () => void
  toggleSection: (key: string) => void
  isSectionCollapsed: (key: string) => boolean
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  collapsed: loadCollapsed(),
  sectionStates: loadSections(),

  toggleCollapsed: () => {
    set(state => {
      const next = !state.collapsed
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
      return { collapsed: next }
    })
  },

  toggleSection: (key: string) => {
    set(state => {
      const next = { ...state.sectionStates, [key]: !state.sectionStates[key] }
      localStorage.setItem(SECTIONS_KEY, JSON.stringify(next))
      return { sectionStates: next }
    })
  },

  isSectionCollapsed: (key: string) => {
    return get().sectionStates[key] ?? false
  },
}))
