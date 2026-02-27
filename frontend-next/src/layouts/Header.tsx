import { Moon, Sun, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/hooks/useAuth'

export default function Header() {
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()

  return (
    <header className="h-14 shrink-0 bg-bg-surface border-b border-border flex items-center justify-between px-4">
      <div />

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          className="text-text-secondary hover:text-text-primary"
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        {user && (
          <div className="flex items-center gap-2 ml-2">
            <span className="text-sm text-text-secondary">{user.name || user.email}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={logout}
              className="text-text-secondary hover:text-danger"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
