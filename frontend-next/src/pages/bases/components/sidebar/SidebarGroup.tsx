import { ChevronRight, Pencil } from 'lucide-react'
import type { Base, BaseGroup } from '@/types/index.js'
import { useToggleGroupCollapse } from '@/api/hooks/index.js'
import { cn } from '@/lib/utils.js'
import { SidebarBaseItem } from './SidebarBaseItem.js'

interface SidebarGroupProps {
  group: BaseGroup
  bases: Base[]
  selectedBaseId: string | null
  onSelectBase: (id: string) => void
  onEditGroup: (group: BaseGroup) => void
}

export function SidebarGroup({ group, bases, selectedBaseId, onSelectBase, onEditGroup }: SidebarGroupProps) {
  const toggleCollapse = useToggleGroupCollapse()
  const isExpanded = !group.collapsed

  function handleToggle() {
    toggleCollapse.mutate(group.id)
  }

  function handleEdit(e: React.MouseEvent) {
    e.stopPropagation()
    onEditGroup(group)
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleToggle}
        className="group flex items-center gap-1.5 w-full px-2 py-1.5 text-sm font-medium text-text-primary hover:bg-bg-hover rounded-sm transition-colors cursor-pointer"
      >
        <ChevronRight
          className={cn(
            'size-3.5 shrink-0 text-text-muted transition-transform duration-200',
            isExpanded && 'rotate-90'
          )}
        />
        <span className="shrink-0">{group.icon || '📁'}</span>
        <span className="truncate flex-1 text-left">{group.name}</span>
        <button
          type="button"
          onClick={handleEdit}
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-bg-surface rounded transition-opacity cursor-pointer"
        >
          <Pencil className="size-3 text-text-muted" />
        </button>
      </button>

      {isExpanded && (
        <div className="ml-3 space-y-0.5">
          {bases.map(base => (
            <SidebarBaseItem
              key={base.id}
              base={base}
              isSelected={selectedBaseId === base.id}
              onClick={() => onSelectBase(base.id)}
            />
          ))}
          {bases.length === 0 && (
            <div className="px-3 py-1 text-xs text-text-muted italic">
              No bases
            </div>
          )}
        </div>
      )}
    </div>
  )
}
