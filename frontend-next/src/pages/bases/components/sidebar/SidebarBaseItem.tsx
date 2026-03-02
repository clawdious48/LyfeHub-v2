import type { Base } from '@/types/index.js'
import { cn } from '@/lib/utils.js'

interface SidebarBaseItemProps {
  base: Base
  isSelected: boolean
  onClick: () => void
}

export function SidebarBaseItem({ base, isSelected, onClick }: SidebarBaseItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 w-full px-3 py-1.5 text-sm cursor-pointer truncate rounded-sm transition-colors',
        isSelected
          ? 'bg-accent/10 text-accent border-l-2 border-accent'
          : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
      )}
    >
      <span className="shrink-0">{base.icon || '📄'}</span>
      <span className="truncate">{base.name}</span>
    </button>
  )
}
