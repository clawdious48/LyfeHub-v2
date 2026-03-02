import { create } from 'zustand'

type CaptureType = 'note' | 'task' | 'contact'

interface CaptureState {
  open: boolean
  type: CaptureType
  openCapture: (type: CaptureType) => void
  close: () => void
}

export const useCaptureStore = create<CaptureState>((set) => ({
  open: false,
  type: 'note',
  openCapture: (type) => set({ open: true, type }),
  close: () => set({ open: false }),
}))
