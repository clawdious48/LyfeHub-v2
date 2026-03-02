// frontend-next/src/stores/calendarUiStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CalendarViewType } from '@/pages/calendar/utils/calendarConstants.js'

interface CalendarUiState {
  // Persisted preferences
  defaultView: CalendarViewType
  setDefaultView: (view: CalendarViewType) => void

  // Session state (not persisted)
  currentView: CalendarViewType
  setCurrentView: (view: CalendarViewType) => void
  selectedDate: string // YYYY-MM-DD
  setSelectedDate: (date: string) => void
  hiddenCalendarIds: Set<string>
  toggleCalendarVisibility: (calendarId: string) => void
  setCalendarVisible: (calendarId: string, visible: boolean) => void
}

export const useCalendarUiStore = create<CalendarUiState>()(
  persist(
    (set) => ({
      defaultView: 'month',
      setDefaultView: (view) => set({ defaultView: view }),

      currentView: 'month',
      setCurrentView: (view) => set({ currentView: view }),
      selectedDate: new Date().toISOString().slice(0, 10),
      setSelectedDate: (date) => set({ selectedDate: date }),
      hiddenCalendarIds: new Set<string>(),
      toggleCalendarVisibility: (calendarId) =>
        set((state) => {
          const next = new Set(state.hiddenCalendarIds)
          if (next.has(calendarId)) next.delete(calendarId)
          else next.add(calendarId)
          return { hiddenCalendarIds: next }
        }),
      setCalendarVisible: (calendarId, visible) =>
        set((state) => {
          const next = new Set(state.hiddenCalendarIds)
          if (visible) next.delete(calendarId)
          else next.add(calendarId)
          return { hiddenCalendarIds: next }
        }),
    }),
    {
      name: 'lyfehub-calendar-ui',
      partialize: (state) => ({
        defaultView: state.defaultView,
        hiddenCalendarIds: Array.from(state.hiddenCalendarIds),
      }),
      merge: (persisted: any, current) => ({
        ...current,
        ...persisted,
        hiddenCalendarIds: new Set(persisted?.hiddenCalendarIds || []),
      }),
    },
  ),
)
