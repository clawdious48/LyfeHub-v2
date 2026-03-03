import { useRef, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import DashboardPage from '@/pages/DashboardPage.js'
import ApexDashboardPage from '@/pages/ApexDashboardPage.js'
import { useHeaderStore } from '@/stores/headerStore.js'
import { springboardProgress } from '@/stores/springboardProgress.js'

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
    el.scrollTo({ left: targetX, behavior: 'instant' })
    // Sync progress immediately so header tabs match on mount
    springboardProgress.set(activeIndex)
  }, [activeIndex])

  // Real-time scroll progress (drives header tab sliding) + debounced route sync
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    let scrollTimer: ReturnType<typeof setTimeout>

    function handleScroll() {
      if (!el) return
      // Update progress in real-time (no debounce) — drives header tab animation
      const width = el.clientWidth || 1
      const progress = Math.min(1, Math.max(0, el.scrollLeft / width))
      springboardProgress.set(progress)

      // Debounced route sync — wait for scroll-snap to settle
      clearTimeout(scrollTimer)
      scrollTimer = setTimeout(() => {
        const index = Math.round(el.scrollLeft / width)
        const targetRoute = dashboards[index]?.route ?? '/'
        if (targetRoute !== pathname) {
          navigate(targetRoute, { replace: true })
        }
      }, 100)
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
      // Only capture arrow keys when no interactive element has focus
      // (i.e. focus is on body, the springboard container, or the dot indicators)
      const target = e.target as HTMLElement
      const tag = target?.tagName
      if (
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
        tag === 'BUTTON' || tag === 'A' ||
        target?.isContentEditable ||
        target?.closest?.('[role="listbox"], [role="menu"], [role="dialog"], [role="grid"]')
      ) {
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
          scrollbarWidth: 'none',
        }}
      >

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
