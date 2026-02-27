import { useEffect } from 'react'
import { useRoutes } from 'react-router-dom'
import { routes } from '@/router'
import { useAuth } from '@/hooks/useAuth'

export default function App() {
  const checkAuth = useAuth((s) => s.checkAuth)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return useRoutes(routes)
}
