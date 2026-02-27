import { cn } from '@/lib/utils.js'

const priorityConfig: Record<string, { color: string; label: string }> = {
  urgent: { color: 'text-red-500', label: 'Urgent' },
  high: { color: 'text-orange-500', label: 'High' },
  medium: { color: 'text-amber-500', label: 'Medium' },
  low: { color: 'text-blue-400', label: 'Low' },
}

interface PriorityIndicatorProps {
  priority: string | null | undefined
  showLabel?: boolean
  className?: string
}

export function PriorityIndicator({ priority, showLabel = false, className }: PriorityIndicatorProps) {
  if (!priority) return null

  const config = priorityConfig[priority]
  if (!config) return null

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={cn('inline-block size-2 rounded-full', config.color, 'bg-current')} />
      {showLabel && (
        <span className={cn('text-xs font-medium', config.color)}>{config.label}</span>
      )}
    </span>
  )
}
