import { create } from 'zustand'
import type { User } from '@/types/user.js'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  checkAuth: () => Promise<void>
  loginWithGoogle: (credential: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  checkAuth: async () => {
    try {
      const res = await fetch('/api/auth/check', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          set({ user: data.user, isAuthenticated: true, isLoading: false })
          return
        }
      }
    } catch {
      // Auth check failed
    }
    set({ user: null, isAuthenticated: false, isLoading: false })
  },

  loginWithGoogle: async (credential: string) => {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ credential }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Login failed' }))
      throw new Error(data.error ?? 'Login failed')
    }
    const data = await res.json()
    set({ user: data.user, isAuthenticated: true })
  },

  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    set({ user: null, isAuthenticated: false })
  },
}))
