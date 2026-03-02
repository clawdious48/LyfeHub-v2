import { create } from 'zustand'

interface DashboardUiState {
  isEditing: boolean
  setEditing: (editing: boolean) => void
}

export const useDashboardUiStore = create<DashboardUiState>((set) => ({
  isEditing: false,
  setEditing: (editing) => set({ isEditing: editing }),
}))
