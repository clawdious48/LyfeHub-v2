import { create } from 'zustand'
import { getUserSettings, saveSettingsKey } from '@/hooks/useUserSettings.js'

type DisplayMode = 'list' | 'cards' | 'board' | 'focus'
type CardSize = 'S' | 'M' | 'L'
type BoardGroupBy = 'priority' | 'energy' | 'list' | 'location'
type SortBy = 'due' | 'created' | 'custom'

interface TasksUiState {
  displayMode: DisplayMode
  cardSize: CardSize
  boardGroupBy: BoardGroupBy
  sortBy: SortBy
  moreOptionsExpanded: boolean
  selectedTaskId: string | null
  createModalOpen: boolean
  _hydrated: boolean
  hydrate: () => void
  setDisplayMode: (mode: DisplayMode) => void
  setCardSize: (size: CardSize) => void
  setBoardGroupBy: (groupBy: BoardGroupBy) => void
  setSortBy: (sort: SortBy) => void
  setMoreOptionsExpanded: (expanded: boolean) => void
  setSelectedTaskId: (id: string | null) => void
  setCreateModalOpen: (open: boolean) => void
}

function getPersistedFromState(state: TasksUiState) {
  return {
    displayMode: state.displayMode,
    cardSize: state.cardSize,
    boardGroupBy: state.boardGroupBy,
    sortBy: state.sortBy,
    moreOptionsExpanded: state.moreOptionsExpanded,
  }
}

export const useTasksUiStore = create<TasksUiState>((set, get) => ({
  displayMode: 'list',
  cardSize: 'M',
  boardGroupBy: 'priority',
  sortBy: 'due',
  moreOptionsExpanded: false,
  selectedTaskId: null,
  createModalOpen: false,
  _hydrated: false,

  hydrate: () => {
    if (get()._hydrated) return
    const settings = getUserSettings()
    const t = settings.tasks
    set({
      displayMode: (t?.displayMode as DisplayMode) ?? 'list',
      cardSize: (t?.cardSize as CardSize) ?? 'M',
      boardGroupBy: (t?.boardGroupBy as BoardGroupBy) ?? 'priority',
      sortBy: (t?.sortBy as SortBy) ?? 'due',
      moreOptionsExpanded: t?.moreOptionsExpanded ?? false,
      _hydrated: true,
    })
  },

  setDisplayMode: (mode) => {
    set({ displayMode: mode })
    saveSettingsKey('tasks', getPersistedFromState({ ...get(), displayMode: mode }))
  },

  setCardSize: (size) => {
    set({ cardSize: size })
    saveSettingsKey('tasks', getPersistedFromState({ ...get(), cardSize: size }))
  },

  setBoardGroupBy: (groupBy) => {
    set({ boardGroupBy: groupBy })
    saveSettingsKey('tasks', getPersistedFromState({ ...get(), boardGroupBy: groupBy }))
  },

  setSortBy: (sort) => {
    set({ sortBy: sort })
    saveSettingsKey('tasks', getPersistedFromState({ ...get(), sortBy: sort }))
  },

  setMoreOptionsExpanded: (expanded) => {
    set({ moreOptionsExpanded: expanded })
    saveSettingsKey('tasks', getPersistedFromState({ ...get(), moreOptionsExpanded: expanded }))
  },

  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  setCreateModalOpen: (open) => set({ createModalOpen: open }),
}))
