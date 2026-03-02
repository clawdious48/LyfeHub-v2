import { create } from 'zustand'

interface PomodoroState {
  status: 'idle' | 'focus' | 'break' | 'long_break'
  timeRemaining: number
  isPaused: boolean
  sessionsCompleted: number
  linkedTaskId: string | null
  startedAt: string | null
  focusDuration: number
  breakDuration: number
  longBreakDuration: number
  sessionsBeforeLongBreak: number
  start: () => void
  pause: () => void
  resume: () => void
  skip: () => void
  reset: () => void
  tick: () => number
  setConfig: (config: {
    focusDuration?: number
    breakDuration?: number
    longBreakDuration?: number
    sessionsBeforeLongBreak?: number
  }) => void
  setLinkedTask: (taskId: string | null) => void
}

function getNextPhase(
  currentStatus: 'focus' | 'break' | 'long_break',
  sessionsCompleted: number,
  sessionsBeforeLongBreak: number,
): { status: 'focus' | 'break' | 'long_break'; durationKey: 'focusDuration' | 'breakDuration' | 'longBreakDuration' } {
  if (currentStatus === 'break' || currentStatus === 'long_break') {
    return { status: 'focus', durationKey: 'focusDuration' }
  }
  // Transitioning from focus — increment happens before this check
  if (sessionsCompleted > 0 && sessionsCompleted % sessionsBeforeLongBreak === 0) {
    return { status: 'long_break', durationKey: 'longBreakDuration' }
  }
  return { status: 'break', durationKey: 'breakDuration' }
}

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  status: 'idle',
  timeRemaining: 0,
  isPaused: false,
  sessionsCompleted: 0,
  linkedTaskId: null,
  startedAt: null,
  focusDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,

  start: () => {
    const { focusDuration } = get()
    set({
      status: 'focus',
      timeRemaining: focusDuration * 60,
      isPaused: false,
      startedAt: new Date().toISOString(),
    })
  },

  pause: () => set({ isPaused: true }),

  resume: () => set({ isPaused: false }),

  skip: () => {
    const state = get()
    if (state.status === 'idle') return

    let nextSessions = state.sessionsCompleted
    if (state.status === 'focus') {
      nextSessions += 1
    }

    const next = getNextPhase(state.status, nextSessions, state.sessionsBeforeLongBreak)
    set({
      status: next.status,
      timeRemaining: state[next.durationKey] * 60,
      isPaused: false,
      sessionsCompleted: nextSessions,
      startedAt: next.status === 'focus' ? new Date().toISOString() : state.startedAt,
    })
  },

  reset: () =>
    set({
      status: 'idle',
      timeRemaining: 0,
      isPaused: false,
      sessionsCompleted: 0,
      linkedTaskId: null,
      startedAt: null,
    }),

  tick: () => {
    const state = get()
    if (state.status === 'idle' || state.isPaused) return state.timeRemaining

    const next = state.timeRemaining - 1
    if (next <= 0) {
      // Session completed — transition to next phase
      let nextSessions = state.sessionsCompleted
      if (state.status === 'focus') {
        nextSessions += 1
      }

      const nextPhase = getNextPhase(state.status, nextSessions, state.sessionsBeforeLongBreak)
      set({
        status: nextPhase.status,
        timeRemaining: state[nextPhase.durationKey] * 60,
        isPaused: false,
        sessionsCompleted: nextSessions,
        startedAt: nextPhase.status === 'focus' ? new Date().toISOString() : null,
      })
      return -1
    }

    set({ timeRemaining: next })
    return next
  },

  setConfig: (config) => {
    set((state) => ({
      focusDuration: config.focusDuration ?? state.focusDuration,
      breakDuration: config.breakDuration ?? state.breakDuration,
      longBreakDuration: config.longBreakDuration ?? state.longBreakDuration,
      sessionsBeforeLongBreak: config.sessionsBeforeLongBreak ?? state.sessionsBeforeLongBreak,
    }))
  },

  setLinkedTask: (taskId) => set({ linkedTaskId: taskId }),
}))
