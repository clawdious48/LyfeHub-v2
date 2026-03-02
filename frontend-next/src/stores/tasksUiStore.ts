import { create } from 'zustand'

const STORAGE_KEY = 'lyfehub-tasks-ui'

type DisplayMode = 'list' | 'cards' | 'board' | 'focus'
type CardSize = 'S' | 'M' | 'L'
type BoardGroupBy = 'priority' | 'energy' | 'list' | 'location'
type SortBy = 'due' | 'created' | 'custom'

interface PersistedState {
  displayMode: DisplayMode
  cardSize: CardSize
  boardGroupBy: BoardGroupBy
  sortBy: SortBy
  moreOptionsExpanded: boolean
}

function loadPersisted(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        displayMode: parsed.displayMode ?? 'list',
        cardSize: parsed.cardSize ?? 'M',
        boardGroupBy: parsed.boardGroupBy ?? 'priority',
        sortBy: parsed.sortBy ?? 'due',
        moreOptionsExpanded: parsed.moreOptionsExpanded ?? false,
      }
    }
  } catch {
    // ignore
  }
  return { displayMode: 'list', cardSize: 'M', boardGroupBy: 'priority', sortBy: 'due', moreOptionsExpanded: false }
}

function savePersisted(state: PersistedState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function getPersistedFromState(state: TasksUiState): PersistedState {
  return {
    displayMode: state.displayMode,
    cardSize: state.cardSize,
    boardGroupBy: state.boardGroupBy,
    sortBy: state.sortBy,
    moreOptionsExpanded: state.moreOptionsExpanded,
  }
}

interface TasksUiState extends PersistedState {
  selectedTaskId: string | null
  createModalOpen: boolean
  setDisplayMode: (mode: DisplayMode) => void
  setCardSize: (size: CardSize) => void
  setBoardGroupBy: (groupBy: BoardGroupBy) => void
  setSortBy: (sort: SortBy) => void
  setMoreOptionsExpanded: (expanded: boolean) => void
  setSelectedTaskId: (id: string | null) => void
  setCreateModalOpen: (open: boolean) => void
}

export const useTasksUiStore = create<TasksUiState>((set, get) => {
  const persisted = loadPersisted()

  return {
    ...persisted,
    selectedTaskId: null,
    createModalOpen: false,

    setDisplayMode: (mode) => {
      set({ displayMode: mode })
      savePersisted({ ...getPersistedFromState(get()), displayMode: mode })
    },

    setCardSize: (size) => {
      set({ cardSize: size })
      savePersisted({ ...getPersistedFromState(get()), cardSize: size })
    },

    setBoardGroupBy: (groupBy) => {
      set({ boardGroupBy: groupBy })
      savePersisted({ ...getPersistedFromState(get()), boardGroupBy: groupBy })
    },

    setSortBy: (sort) => {
      set({ sortBy: sort })
      savePersisted({ ...getPersistedFromState(get()), sortBy: sort })
    },

    setMoreOptionsExpanded: (expanded) => {
      set({ moreOptionsExpanded: expanded })
      savePersisted({ ...getPersistedFromState(get()), moreOptionsExpanded: expanded })
    },

    setSelectedTaskId: (id) => set({ selectedTaskId: id }),

    setCreateModalOpen: (open) => set({ createModalOpen: open }),
  }
})
