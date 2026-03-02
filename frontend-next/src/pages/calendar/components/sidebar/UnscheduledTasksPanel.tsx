// frontend-next/src/pages/calendar/components/sidebar/UnscheduledTasksPanel.tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, GripVertical } from 'lucide-react'
import { useUnscheduledTasks } from '@/api/hooks/useTasks.js'

interface UnscheduledTasksPanelProps {
  onDragStart?: (taskId: string) => void
}

export function UnscheduledTasksPanel({ onDragStart }: UnscheduledTasksPanelProps) {
  const [expanded, setExpanded] = useState(true)
  const { data: tasks = [], isLoading } = useUnscheduledTasks()

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 w-full text-xs font-semibold text-text-muted uppercase tracking-wider mb-1"
      >
        <ChevronRight className={[
          'size-3 transition-transform duration-200',
          expanded && 'rotate-90',
        ].join(' ')} />
        <span>Unscheduled ({tasks.length})</span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {isLoading ? (
              <div className="text-xs text-text-muted py-2 px-2">Loading...</div>
            ) : tasks.length === 0 ? (
              <div className="text-xs text-text-muted py-2 px-2">All tasks scheduled</div>
            ) : (
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {tasks.slice(0, 20).map((task, idx) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(idx * 0.05, 0.25) }}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-grab hover:bg-bg-hover transition-colors group"
                    draggable
                    onDragStart={() => onDragStart?.(task.id)}
                  >
                    <GripVertical className="size-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    <div className="size-2.5 rounded-sm border border-purple-500/60 shrink-0" />
                    <span className="text-text-secondary truncate">{task.title}</span>
                    {task.priority && (
                      <span className={[
                        'text-[9px] px-1 rounded shrink-0',
                        task.priority === 'high' ? 'text-red-400 bg-red-400/10' :
                        task.priority === 'medium' ? 'text-yellow-400 bg-yellow-400/10' :
                        'text-text-muted bg-bg-hover',
                      ].join(' ')}>
                        {task.priority}
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
