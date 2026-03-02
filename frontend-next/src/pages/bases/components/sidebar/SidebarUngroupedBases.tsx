import type { Base } from '@/types/index.js'
import { SidebarBaseItem } from './SidebarBaseItem.js'

interface SidebarUngroupedBasesProps {
  bases: Base[]
  selectedBaseId: string | null
  onSelectBase: (id: string) => void
}

export function SidebarUngroupedBases({ bases, selectedBaseId, onSelectBase }: SidebarUngroupedBasesProps) {
  if (bases.length === 0) return null

  return (
    <div className="mt-2">
      <div className="px-3 py-1 text-xs uppercase tracking-wider text-text-muted">
        Ungrouped
      </div>
      <div className="space-y-0.5">
        {bases.map(base => (
          <SidebarBaseItem
            key={base.id}
            base={base}
            isSelected={selectedBaseId === base.id}
            onClick={() => onSelectBase(base.id)}
          />
        ))}
      </div>
    </div>
  )
}
