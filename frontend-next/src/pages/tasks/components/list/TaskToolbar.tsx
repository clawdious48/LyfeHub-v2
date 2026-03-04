import { List, LayoutGrid, Columns3, Target } from 'lucide-react'
import { Button } from '@/components/ui/button.js'
import { useTasksUiStore } from '@/stores/tasksUiStore.js'
import { BOARD_GROUP_OPTIONS } from '@/pages/tasks/utils/taskConstants.js'

interface TaskToolbarProps {
  activeView: string
  onCreateTask: () => void
}

type DisplayMode = 'list' | 'cards' | 'board' | 'focus'

const VIEW_ICONS: { mode: DisplayMode; icon: typeof List; label: string }[] = [
  { mode: 'list', icon: List, label: 'List' },
  { mode: 'cards', icon: LayoutGrid, label: 'Cards' },
  { mode: 'board', icon: Columns3, label: 'Board' },
  { mode: 'focus', icon: Target, label: 'Focus' },
]

export function TaskToolbar({ activeView: _activeView, onCreateTask }: TaskToolbarProps) {
  const {
    displayMode, setDisplayMode,
    cardSize, setCardSize,
    boardGroupBy, setBoardGroupBy,
    sortBy, setSortBy,
  } = useTasksUiStore()

  return (
    <div className="flex items-center justify-between gap-3">
      {/* Left: Create button */}
      <Button size="sm" onClick={onCreateTask} className="shrink-0">
        + Create Task
      </Button>

      {/* Center: View mode switcher */}
      <div className="flex items-center gap-1 bg-bg-surface border border-border rounded-lg p-0.5">
        {VIEW_ICONS.map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            onClick={() => setDisplayMode(mode)}
            title={label}
            className={[
              'p-1.5 rounded-md transition-colors',
              displayMode === mode
                ? 'bg-accent-light text-accent'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-hover',
            ].join(' ')}
          >
            <Icon className="size-4" />
          </button>
        ))}
      </div>

      {/* Right: Contextual controls */}
      <div className="flex items-center gap-2">
        {/* Card size toggle (cards mode only) */}
        {displayMode === 'cards' && (
          <div className="flex items-center gap-0.5 bg-bg-surface border border-border rounded-md p-0.5">
            {(['S', 'M', 'L'] as const).map((size) => (
              <button
                key={size}
                onClick={() => setCardSize(size)}
                className={[
                  'px-2 py-0.5 text-xs font-medium rounded transition-colors',
                  cardSize === size
                    ? 'bg-accent-light text-accent'
                    : 'text-text-muted hover:text-text-primary',
                ].join(' ')}
              >
                {size}
              </button>
            ))}
          </div>
        )}

        {/* Board group-by (board mode only) */}
        {displayMode === 'board' && (
          <select
            value={boardGroupBy}
            onChange={(e) => setBoardGroupBy(e.target.value as 'priority' | 'energy' | 'list' | 'location')}
            className="text-xs bg-bg-surface border border-border rounded-md px-2 py-1 text-text-primary"
          >
            {BOARD_GROUP_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        )}

        {/* Sort (list and cards modes) */}
        {(displayMode === 'list' || displayMode === 'cards') && (
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'due' | 'created' | 'custom')}
            className="text-xs bg-bg-surface border border-border rounded-md px-2 py-1 text-text-primary"
          >
            <option value="due">Due</option>
            <option value="created">Created</option>
            <option value="custom">Custom</option>
          </select>
        )}
      </div>
    </div>
  )
}
