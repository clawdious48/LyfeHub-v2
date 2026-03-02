import { create } from 'zustand'
import { getUserSettings, saveSettingsKey } from '@/hooks/useUserSettings.js'

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
  // Persisted
  displayMode: 'card' | 'list'
  cardSize: 'small' | 'medium' | 'large'

  // Table view (ephemeral)
  sortColumn: string | null
  sortDirection: 'asc' | 'desc'
  filters: FilterItem[]
  visibleColumns: string[] | null
  columnOrder: string[] | null
  columnWidths: Record<string, number>

  // View state (ephemeral)
  currentViewId: string | null

  // Editing state (ephemeral)
  editingCellKey: EditingCellKey | null

  // Hydration
  _hydrated: boolean
  hydrate: () => void

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

export const useBasesUiStore = create<BasesUiState>((set, get) => ({
  displayMode: 'card',
  cardSize: 'medium',

  sortColumn: null,
  sortDirection: 'asc',
  filters: [],
  visibleColumns: null,
  columnOrder: null,
  columnWidths: {},

  currentViewId: null,
  editingCellKey: null,

  _hydrated: false,

  hydrate: () => {
    if (get()._hydrated) return
    const settings = getUserSettings()
    const b = settings.bases
    set({
      displayMode: b?.displayMode ?? 'card',
      cardSize: b?.cardSize ?? 'medium',
      _hydrated: true,
    })
  },

  setDisplayMode: (mode) => {
    set({ displayMode: mode })
    saveSettingsKey('bases', { displayMode: mode, cardSize: get().cardSize })
  },

  setCardSize: (size) => {
    set({ cardSize: size })
    saveSettingsKey('bases', { displayMode: get().displayMode, cardSize: size })
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
}))
