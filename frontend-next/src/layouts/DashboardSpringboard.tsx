import { useRef, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import DashboardPage from '@/pages/DashboardPage.js'
import ApexDashboardPage from '@/pages/ApexDashboardPage.js'
import { useHeaderStore } from '@/stores/headerStore.js'

const dashboards = [
  { id: 'personal', route: '/' },
  { id: 'apex', route: '/apex' },
] as const

export default function DashboardSpringboard() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const homeDashboard = useHeaderStore((s) => s.homeDashboard)

  // Determine which index to show based on pathname
  const activeIndex = pathname === '/apex' ? 1 : 0

  // Scroll to correct position on mount and when pathname changes externally
  // (e.g. header area button clicks that call navigate)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const targetX = activeIndex * el.clientWidth
    // Use instant scroll so there's no visible animation on mount or
    // when the user clicks an area button (the route change is the intent)
    el.scrollTo({ left: targetX, behavior: 'instant' })
  }, [activeIndex])

  // Detect scroll end and sync route
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    let scrollTimer: ReturnType<typeof setTimeout>

    function handleScroll() {
      clearTimeout(scrollTimer)
      scrollTimer = setTimeout(() => {
        if (!el) return
        const index = Math.round(el.scrollLeft / el.clientWidth)
        const targetRoute = dashboards[index]?.route ?? '/'
        if (targetRoute !== pathname) {
          navigate(targetRoute, { replace: true })
        }
      }, 100) // debounce — wait for scroll-snap to settle
    }

    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimer)
    }
  }, [pathname, navigate])

  // Keyboard navigation
  const scrollToIndex = useCallback((index: number) => {
    const el = scrollRef.current
    if (!el) return
    const clamped = Math.max(0, Math.min(index, dashboards.length - 1))
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture arrow keys when user is in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
        return
      }

      const currentIndex = Math.round(
        (scrollRef.current?.scrollLeft ?? 0) / (scrollRef.current?.clientWidth ?? 1),
      )

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          scrollToIndex(currentIndex - 1)
          break
        case 'ArrowRight':
          e.preventDefault()
          scrollToIndex(currentIndex + 1)
          break
        case 'ArrowUp':
        case 'ArrowDown':
          e.preventDefault()
          scrollToIndex(homeDashboard === 'apex' ? 1 : 0)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [homeDashboard, scrollToIndex])

  return (
    <div className="h-full flex flex-col">
      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-2 py-1.5 bg-bg-surface border-b border-border">
        {dashboards.map((d, i) => (
          <button
            key={d.id}
            onClick={() => scrollToIndex(i)}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === activeIndex ? 'bg-accent' : 'bg-text-muted/30 hover:bg-text-muted/50'
            }`}
            aria-label={`Go to ${d.id} dashboard`}
          />
        ))}
      </div>

      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="springboard-scroll flex-1 flex overflow-x-auto overflow-y-hidden"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
      >
        {/* Hide scrollbar for Chrome/Safari */}
        <style>{`
          .springboard-scroll::-webkit-scrollbar { display: none; }
        `}</style>

        <div
          className="min-w-full h-full overflow-y-auto"
          style={{ scrollSnapAlign: 'start' }}
        >
          <DashboardPage />
        </div>
        <div
          className="min-w-full h-full overflow-y-auto"
          style={{ scrollSnapAlign: 'start' }}
        >
          <ApexDashboardPage />
        </div>
      </div>
    </div>
  )
}
