import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, MoreHorizontal } from 'lucide-react'
import { useTaskCounts } from '@/api/hooks/index.js'
import { useTaskLists } from '@/api/hooks/useTaskLists.js'
import { SMART_VIEWS } from '@/pages/tasks/utils/taskConstants.js'
import { CreateListModal } from '@/pages/tasks/components/modals/CreateListModal.js'

export function TasksSidebarContent() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeView = searchParams.get('view') ?? 'my-day'
  const { data: counts = {} } = useTaskCounts()
  const { data: lists = [] } = useTaskLists()
  const [createListOpen, setCreateListOpen] = useState(false)

  function setView(view: string) {
    setSearchParams({ view })
  }

  return (
    <div className="space-y-4">
      {/* Smart Views */}
      <div className="space-y-0.5">
        {SMART_VIEWS.map(({ key, label, icon: Icon, apiParam }) => {
          const isActive = activeView === apiParam
          const count = counts[apiParam]
          return (
            <button
              key={key}
              onClick={() => setView(apiParam)}
              className={[
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full',
                isActive
                  ? 'bg-accent-light text-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
              ].join(' ')}
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {count != null && count > 0 && (
                <span className="text-xs text-text-muted">{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Separator */}
      <div className="border-t border-border" />

      {/* My Lists */}
      <div>
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            My Lists
          </span>
          <button
            onClick={() => setCreateListOpen(true)}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
        <div className="space-y-0.5 mt-1">
          {lists.map((list) => {
            const isActive = activeView === `list:${list.id}`
            return (
              <button
                key={list.id}
                onClick={() => setView(`list:${list.id}`)}
                className={[
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full group',
                  isActive
                    ? 'bg-accent-light text-accent'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
                ].join(' ')}
              >
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: list.color || '#3b82f6' }}
                />
                <span className="flex-1 text-left truncate">{list.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    // TODO: open edit/delete dropdown
                  }}
                  className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary transition-opacity"
                >
                  <MoreHorizontal className="size-3.5" />
                </button>
              </button>
            )
          })}
        </div>
      </div>

      <CreateListModal open={createListOpen} onOpenChange={setCreateListOpen} />
    </div>
  )
}
