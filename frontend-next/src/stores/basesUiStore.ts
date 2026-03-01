import { create } from 'zustand'

const STORAGE_KEY = 'lyfehub-bases-ui'

interface PersistedState {
  displayMode: 'card' | 'list'
  cardSize: 'small' | 'medium' | 'large'
}

function loadPersisted(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        displayMode: parsed.displayMode ?? 'card',
        cardSize: parsed.cardSize ?? 'medium',
      }
    }
  } catch {
    // ignore
  }
  return { displayMode: 'card', cardSize: 'medium' }
}

function savePersisted(state: PersistedState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

interface FilterItem {
  id: string
  propertyId: string
  operator: string
  value: string
}

interface EditingCellKey {
  recordId: string
  propertyId: string
}

interface BasesUiState {
  // List view
  displayMode: 'card' | 'list'
  cardSize: 'small' | 'medium' | 'large'

  // Table view
  sortColumn: string | null
  sortDirection: 'asc' | 'desc'
  filters: FilterItem[]
  visibleColumns: string[] | null
  columnOrder: string[] | null
  columnWidths: Record<string, number>

  // View state
  currentViewId: string | null

  // Editing state
  editingCellKey: EditingCellKey | null

  // Actions
  setDisplayMode: (mode: 'card' | 'list') => void
  setCardSize: (size: 'small' | 'medium' | 'large') => void
  setSortColumn: (col: string | null) => void
  setSortDirection: (dir: 'asc' | 'desc') => void
  toggleSort: (col: string) => void
  addFilter: (filter: { propertyId: string; operator: string; value: string }) => void
  removeFilter: (id: string) => void
  clearFilters: () => void
  setVisibleColumns: (cols: string[] | null) => void
  setColumnOrder: (order: string[] | null) => void
  setColumnWidth: (propId: string, width: number) => void
  setCurrentViewId: (id: string | null) => void
  setEditingCell: (key: EditingCellKey | null) => void
  applyViewConfig: (config: {
    filters?: Array<{ propertyId: string; operator: string; value: string }>
    sorts?: Array<{ propertyId: string; direction: 'asc' | 'desc' }>
    visibleColumns?: string[]
    columnOrder?: string[]
    columnWidths?: Record<string, number>
  }) => void
  resetToDefaults: () => void
}

export const useBasesUiStore = create<BasesUiState>((set, get) => {
  const persisted = loadPersisted()

  return {
    displayMode: persisted.displayMode,
    cardSize: persisted.cardSize,

    sortColumn: null,
    sortDirection: 'asc',
    filters: [],
    visibleColumns: null,
    columnOrder: null,
    columnWidths: {},

    currentViewId: null,
    editingCellKey: null,

    setDisplayMode: (mode) => {
      set({ displayMode: mode })
      savePersisted({ displayMode: mode, cardSize: get().cardSize })
    },

    setCardSize: (size) => {
      set({ cardSize: size })
      savePersisted({ displayMode: get().displayMode, cardSize: size })
    },

    setSortColumn: (col) => set({ sortColumn: col }),

    setSortDirection: (dir) => set({ sortDirection: dir }),

    toggleSort: (col) => {
      const { sortColumn, sortDirection } = get()
      if (sortColumn !== col) {
        set({ sortColumn: col, sortDirection: 'asc' })
      } else if (sortDirection === 'asc') {
        set({ sortDirection: 'desc' })
      } else {
        set({ sortColumn: null, sortDirection: 'asc' })
      }
    },

    addFilter: (filter) => {
      const id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString()
      set(state => ({
        filters: [...state.filters, { id, ...filter }],
      }))
    },

    removeFilter: (id) => {
      set(state => ({
        filters: state.filters.filter(f => f.id !== id),
      }))
    },

    clearFilters: () => set({ filters: [] }),

    setVisibleColumns: (cols) => set({ visibleColumns: cols }),

    setColumnOrder: (order) => set({ columnOrder: order }),

    setColumnWidth: (propId, width) => {
      set(state => ({
        columnWidths: { ...state.columnWidths, [propId]: width },
      }))
    },

    setCurrentViewId: (id) => set({ currentViewId: id }),

    setEditingCell: (key) => set({ editingCellKey: key }),

    applyViewConfig: (config) => {
      const updates: Partial<BasesUiState> = {}

      if (config.filters) {
        updates.filters = config.filters.map(f => ({
          id: typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : Date.now().toString(),
          ...f,
        }))
      }

      if (config.sorts && config.sorts.length > 0) {
        updates.sortColumn = config.sorts[0].propertyId
        updates.sortDirection = config.sorts[0].direction
      } else if (config.sorts) {
        updates.sortColumn = null
        updates.sortDirection = 'asc'
      }

      if (config.visibleColumns !== undefined) {
        updates.visibleColumns = config.visibleColumns ?? null
      }

      if (config.columnOrder !== undefined) {
        updates.columnOrder = config.columnOrder ?? null
      }

      if (config.columnWidths !== undefined) {
        updates.columnWidths = config.columnWidths ?? {}
      }

      set(updates)
    },

    resetToDefaults: () => {
      set({
        sortColumn: null,
        sortDirection: 'asc',
        filters: [],
        visibleColumns: null,
        columnOrder: null,
        columnWidths: {},
        currentViewId: null,
        editingCellKey: null,
      })
    },
  }
})
