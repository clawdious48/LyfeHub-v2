import { create } from 'zustand'
import { getUserSettings, saveSettingsKey } from '@/hooks/useUserSettings.js'
import type { CalendarViewType } from '@/pages/calendar/utils/calendarConstants.js'

interface CalendarUiState {
  defaultView: CalendarViewType
  setDefaultView: (view: CalendarViewType) => void
  currentView: CalendarViewType
  setCurrentView: (view: CalendarViewType) => void
  selectedDate: string
  setSelectedDate: (date: string) => void
  hiddenCalendarIds: Set<string>
  toggleCalendarVisibility: (calendarId: string) => void
  setCalendarVisible: (calendarId: string, visible: boolean) => void
  _hydrated: boolean
  hydrate: () => void
}

function saveCalendarSettings(state: { defaultView: CalendarViewType; hiddenCalendarIds: Set<string> }) {
  saveSettingsKey('calendar', {
    defaultView: state.defaultView,
    hiddenCalendarIds: Array.from(state.hiddenCalendarIds),
  })
}

export const useCalendarUiStore = create<CalendarUiState>((set, get) => ({
  defaultView: 'month',
  currentView: 'month',
  selectedDate: new Date().toISOString().slice(0, 10),
  hiddenCalendarIds: new Set<string>(),
  _hydrated: false,

  hydrate: () => {
    if (get()._hydrated) return
    const settings = getUserSettings()
    const c = settings.calendar
    const defaultView = (c?.defaultView as CalendarViewType) ?? 'month'
    set({
      defaultView,
      currentView: defaultView,
      hiddenCalendarIds: new Set(c?.hiddenCalendarIds ?? []),
      _hydrated: true,
    })
  },

  setDefaultView: (view) => {
    set({ defaultView: view })
    saveCalendarSettings({ defaultView: view, hiddenCalendarIds: get().hiddenCalendarIds })
  },

  setCurrentView: (view) => set({ currentView: view }),
  setSelectedDate: (date) => set({ selectedDate: date }),

  toggleCalendarVisibility: (calendarId) => {
    set((state) => {
      const next = new Set(state.hiddenCalendarIds)
      if (next.has(calendarId)) next.delete(calendarId)
      else next.add(calendarId)
      saveCalendarSettings({ defaultView: state.defaultView, hiddenCalendarIds: next })
      return { hiddenCalendarIds: next }
    })
  },

  setCalendarVisible: (calendarId, visible) => {
    set((state) => {
      const next = new Set(state.hiddenCalendarIds)
      if (visible) next.delete(calendarId)
      else next.add(calendarId)
      saveCalendarSettings({ defaultView: state.defaultView, hiddenCalendarIds: next })
      return { hiddenCalendarIds: next }
    })
  },
}))
