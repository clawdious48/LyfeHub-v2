import { Pencil, Plus } from 'lucide-react'
import { cn } from '@/lib/utils.js'
import type { BaseView } from '@/types/index.js'

interface ViewTabBarProps {
  baseId: string
  views: BaseView[]
  currentViewId: string | null
  onSelectView: (id: string | null) => void
  onCreateView: () => void
  onEditView: (view: BaseView) => void
  onDeleteView: (viewId: string) => void
}

const tabClasses =
  'px-3 py-1.5 text-sm rounded-t transition-colors whitespace-nowrap cursor-pointer'
const activeClasses =
  'bg-accent/10 text-accent border-b-2 border-accent font-medium'
const inactiveClasses =
  'text-text-secondary hover:text-text-primary'

export function ViewTabBar({
  views,
  currentViewId,
  onSelectView,
  onCreateView,
  onEditView,
}: ViewTabBarProps) {
  return (
    <div className="flex items-center gap-1 border-b border-border px-1 overflow-x-auto">
      <button
        onClick={() => onSelectView(null)}
        className={cn(tabClasses, currentViewId === null ? activeClasses : inactiveClasses)}
      >
        All
      </button>

      {views.map(view => (
        <div key={view.id} className="relative group flex items-center">
          <button
            onClick={() => onSelectView(view.id)}
            className={cn(
              tabClasses,
              currentViewId === view.id ? activeClasses : inactiveClasses,
            )}
          >
            {view.name}
          </button>
          <button
            onClick={() => onEditView(view)}
            className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 rounded hover:bg-accent/10 transition-opacity"
          >
            <Pencil className="h-3 w-3 text-text-muted" />
          </button>
        </div>
      ))}

      <button
        onClick={onCreateView}
        className="px-2 py-1.5 text-text-muted hover:text-text-primary transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
