import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { getUserSettings, saveSettingsKey } from '@/hooks/useUserSettings.js'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  hydrateTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  // Try server settings first (if user is logged in)
  const settings = getUserSettings()
  if (settings.theme === 'light' || settings.theme === 'dark') return settings.theme
  // Fall back to localStorage for pre-login state
  const stored = localStorage.getItem('lyfehub-theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('lyfehub-theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      saveSettingsKey('theme', next)
      return next
    })
  }, [])

  const hydrateTheme = useCallback(() => {
    const settings = getUserSettings()
    if (settings.theme === 'light' || settings.theme === 'dark') {
      setTheme(settings.theme)
    }
  }, [])

  return (
    <ThemeContext value={{ theme, toggleTheme, hydrateTheme }}>
      {children}
    </ThemeContext>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
