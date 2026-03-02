import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Base, BaseGroup } from '@/types/index.js'
import { useBaseGroups } from '@/api/hooks/index.js'
import { Button } from '@/components/ui/button.js'
import { SidebarGroupList } from './SidebarGroupList.js'
import { SidebarUngroupedBases } from './SidebarUngroupedBases.js'
import { CreateGroupModal } from '../modals/CreateGroupModal.js'
import { EditGroupModal } from '../modals/EditGroupModal.js'

interface BasesSidebarProps {
  bases: Base[]
  selectedBaseId: string | null
  onSelectBase: (id: string) => void
}

export function BasesSidebar({ bases, selectedBaseId, onSelectBase }: BasesSidebarProps) {
  const [createGroupOpen, setCreateGroupOpen] = useState(false)
  const [editGroup, setEditGroup] = useState<BaseGroup | null>(null)
  const { data: groups = [] } = useBaseGroups()

  const groupedBaseIds = new Set(
    groups.map(g => g.id)
  )
  const ungroupedBases = bases.filter(b => !b.group_id || !groupedBaseIds.has(b.group_id))

  return (
    <div className="w-60 bg-bg-surface border-r border-border h-full overflow-y-auto flex flex-col">
      <div className="flex items-center justify-between px-3 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-text-primary">Bases</h2>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setCreateGroupOpen(true)}
          title="Create group"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      <div className="flex-1 py-1">
        <SidebarGroupList
          groups={groups}
          bases={bases}
          selectedBaseId={selectedBaseId}
          onSelectBase={onSelectBase}
          onEditGroup={setEditGroup}
        />
        <SidebarUngroupedBases
          bases={ungroupedBases}
          selectedBaseId={selectedBaseId}
          onSelectBase={onSelectBase}
        />
      </div>

      <CreateGroupModal
        open={createGroupOpen}
        onOpenChange={setCreateGroupOpen}
      />
      <EditGroupModal
        open={editGroup !== null}
        onOpenChange={open => { if (!open) setEditGroup(null) }}
        group={editGroup}
      />
    </div>
  )
}
