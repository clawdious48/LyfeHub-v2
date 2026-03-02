import { useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useSidebarStore } from '@/stores/sidebarStore'
import { getSectionsForRoute } from '@/layouts/sidebarConfig'

export default function Sidebar() {
  const { pathname } = useLocation()
  const { collapsed, toggleCollapsed, toggleSection, isSectionCollapsed } = useSidebarStore()
  const sections = getSectionsForRoute(pathname)

  return (
    <aside
      className={[
        'shrink-0 bg-bg-surface border-r border-border h-full flex flex-col',
        'transition-[width] duration-300 ease-in-out overflow-hidden',
        collapsed ? 'w-12' : 'w-56',
      ].join(' ')}
    >
      {/* Contextual sections */}
      <nav className="flex-1 py-2 px-2 space-y-3 overflow-y-auto">
        {sections.map((section) => {
          const sectionCollapsed = isSectionCollapsed(section.key)
          const SectionComponent = section.component
          return (
            <div key={section.key}>
              {!collapsed && (
                <button
                  onClick={() => toggleSection(section.key)}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-text-muted w-full"
                >
                  <span>{section.header}</span>
                </button>
              )}
              {(!sectionCollapsed || collapsed) && !collapsed && (
                <div className="mt-0.5">
                  <SectionComponent />
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Bottom bar: collapse toggle */}
      <div className="mt-auto border-t border-border px-2 py-2">
        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex items-center justify-center w-full py-2 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </button>
      </div>
    </aside>
  )
}
