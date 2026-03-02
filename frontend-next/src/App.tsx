import { useEffect } from 'react'
import { useRoutes } from 'react-router-dom'
import { routes } from '@/router'
import { useAuth } from '@/hooks/useAuth'
import { ErrorBoundary } from '@/components/ErrorBoundary.js'

export default function App() {
  const checkAuth = useAuth((s) => s.checkAuth)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <ErrorBoundary>
      {useRoutes(routes)}
    </ErrorBoundary>
  )
}
