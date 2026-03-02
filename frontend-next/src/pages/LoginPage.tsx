import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { useAuth } from '@/hooks/useAuth.js'
import { useTheme } from '@/contexts/ThemeContext.js'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button.js'

export default function LoginPage() {
  const { isAuthenticated, loginWithGoogle } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [error, setError] = useState('')

  if (isAuthenticated) return <Navigate to="/" replace />

  async function handleSuccess(response: CredentialResponse) {
    setError('')
    if (!response.credential) {
      setError('No credential received from Google')
      return
    }
    try {
      await loginWithGoogle(response.credential)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  return (
    <div className="min-h-screen bg-bg-app flex items-center justify-center p-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="absolute top-4 right-4 text-text-secondary hover:text-text-primary"
      >
        {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
      </Button>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl text-text-primary">LyfeHub</h1>
          <p className="text-text-secondary text-sm mt-1">Apex Restoration</p>
        </div>

        <div className="bg-bg-surface border border-border rounded-lg p-6 shadow-md space-y-4">
          {error && (
            <div className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => setError('Google sign-in was cancelled or failed')}
              theme={theme === 'dark' ? 'filled_black' : 'outline'}
              size="large"
              width="320"
              text="signin_with"
              shape="rectangular"
            />
          </div>

          <p className="text-text-muted text-xs text-center">
            Restricted to @apexrestoration.pro accounts
          </p>
        </div>
      </div>
    </div>
  )
}
