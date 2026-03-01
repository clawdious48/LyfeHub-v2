import { useState } from 'react'
import {
  Database,
  FolderOpen,
  FolderClosed,
  ChevronRight,
  ChevronDown,
  Plus,
} from 'lucide-react'
import { useBaseGroups, useBases, useToggleGroupCollapse } from '@/api/hooks/index.js'
import type { Base, BaseGroup } from '@/types/index.js'
import { CreateGroupModal } from './modals/CreateGroupModal.js'
import { CreateBaseModal } from './modals/CreateBaseModal.js'

export function BaseSidebarContent() {
  const { data: groups = [] } = useBaseGroups()
  const { data: bases = [] } = useBases()
  const toggleCollapse = useToggleGroupCollapse()

  const [createGroupOpen, setCreateGroupOpen] = useState(false)
  const [createBaseOpen, setCreateBaseOpen] = useState(false)

  const sortedGroups = [...groups].sort((a, b) => a.position - b.position)
  const ungroupedBases = bases.filter(b => !b.group_id)

  function getBasesInGroup(groupId: string) {
    return bases.filter(b => b.group_id === groupId)
  }

  return (
    <>
      <div className="space-y-0.5">
        {sortedGroups.map(group => (
          <GroupItem
            key={group.id}
            group={group}
            bases={getBasesInGroup(group.id)}
            onToggle={() => toggleCollapse.mutate(group.id)}
          />
        ))}

        {ungroupedBases.length > 0 && (
          <div className="pt-1">
            {sortedGroups.length > 0 && (
              <p className="px-2 py-1 text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Ungrouped
              </p>
            )}
            {ungroupedBases.map(base => (
              <BaseItem key={base.id} base={base} />
            ))}
          </div>
        )}

        {groups.length === 0 && bases.length === 0 && (
          <p className="px-2 py-2 text-xs text-text-muted italic">No bases yet</p>
        )}
      </div>

      <div className="mt-3 pt-2 border-t border-border flex items-center gap-1">
        <button
          onClick={() => setCreateBaseOpen(true)}
          className="flex items-center gap-1.5 flex-1 px-2 py-1 text-xs text-text-muted hover:text-text-primary hover:bg-bg-hover rounded transition-colors"
          title="New Base"
        >
          <Plus className="size-3 shrink-0" />
          <Database className="size-3 shrink-0" />
          <span>New Base</span>
        </button>
        <button
          onClick={() => setCreateGroupOpen(true)}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-text-muted hover:text-text-primary hover:bg-bg-hover rounded transition-colors"
          title="New Group"
        >
          <Plus className="size-3 shrink-0" />
          <FolderOpen className="size-3 shrink-0" />
        </button>
      </div>

      <CreateGroupModal open={createGroupOpen} onOpenChange={setCreateGroupOpen} />
      <CreateBaseModal open={createBaseOpen} onOpenChange={setCreateBaseOpen} />
    </>
  )
}

function GroupItem({
  group,
  bases,
  onToggle,
}: {
  group: BaseGroup
  bases: Base[]
  onToggle: () => void
}) {
  const isCollapsed = !!group.collapsed

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 w-full px-2 py-1 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded transition-colors cursor-pointer"
      >
        {isCollapsed ? (
          <ChevronRight className="size-3.5 shrink-0 text-text-muted" />
        ) : (
          <ChevronDown className="size-3.5 shrink-0 text-text-muted" />
        )}
        {isCollapsed ? (
          <FolderClosed className="size-3.5 shrink-0 text-accent" />
        ) : (
          <FolderOpen className="size-3.5 shrink-0 text-accent" />
        )}
        <span className="truncate font-medium flex-1 text-left">{group.name}</span>
        <span className="ml-auto text-xs text-text-muted">{bases.length}</span>
      </button>
      {!isCollapsed && (
        <div className="ml-4 border-l border-border pl-1">
          {bases.map(base => (
            <BaseItem key={base.id} base={base} />
          ))}
          {bases.length === 0 && (
            <p className="px-2 py-1 text-xs text-text-muted italic">Empty</p>
          )}
        </div>
      )}
    </div>
  )
}

function BaseItem({ base }: { base: Base }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded transition-colors cursor-default">
      <span className="text-xs shrink-0">{base.icon || '📊'}</span>
      <span className="truncate">{base.name}</span>
    </div>
  )
}
