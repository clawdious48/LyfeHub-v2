import type { Base, BaseGroup } from '@/types/index.js'
import { SidebarGroup } from './SidebarGroup.js'

interface SidebarGroupListProps {
  groups: BaseGroup[]
  bases: Base[]
  selectedBaseId: string | null
  onSelectBase: (id: string) => void
  onEditGroup: (group: BaseGroup) => void
}

export function SidebarGroupList({ groups, bases, selectedBaseId, onSelectBase, onEditGroup }: SidebarGroupListProps) {
  const sortedGroups = [...groups].sort((a, b) => a.position - b.position)

  return (
    <div className="space-y-0.5">
      {sortedGroups.map(group => {
        const groupBases = bases.filter(b => b.group_id === group.id)
        return (
          <SidebarGroup
            key={group.id}
            group={group}
            bases={groupBases}
            selectedBaseId={selectedBaseId}
            onSelectBase={onSelectBase}
            onEditGroup={onEditGroup}
          />
        )
      })}
    </div>
  )
}
