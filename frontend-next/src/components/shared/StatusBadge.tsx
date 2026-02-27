import { Badge } from '@/components/ui/badge.js'
import { cn } from '@/lib/utils.js'

const statusColorMap: Record<string, string> = {
  // Task statuses
  todo: 'bg-zinc-600 text-zinc-100',
  in_progress: 'bg-blue-600 text-blue-100',
  done: 'bg-green-600 text-green-100',
  blocked: 'bg-red-600 text-red-100',

  // Apex job statuses
  active: 'bg-blue-600 text-blue-100',
  pending_insurance: 'bg-amber-600 text-amber-100',
  complete: 'bg-green-600 text-green-100',
  archived: 'bg-zinc-600 text-zinc-100',

  // Apex phase statuses
  not_started: 'bg-zinc-600 text-zinc-100',
  pending_approval: 'bg-amber-600 text-amber-100',
  approved: 'bg-green-600 text-green-100',

  // Estimate statuses
  draft: 'bg-zinc-600 text-zinc-100',
  submitted: 'bg-blue-600 text-blue-100',
  revision_requested: 'bg-amber-600 text-amber-100',
  denied: 'bg-red-600 text-red-100',

  // Work order statuses
  completed: 'bg-green-600 text-green-100',
  cancelled: 'bg-red-600 text-red-100',

  // Goal statuses
  dream: 'bg-purple-600 text-purple-100',
  achieved: 'bg-green-600 text-green-100',
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colorClass = statusColorMap[status] ?? 'bg-zinc-600 text-zinc-100'
  const label = status.replace(/_/g, ' ')

  return (
    <Badge variant="secondary" className={cn(colorClass, 'capitalize', className)}>
      {label}
    </Badge>
  )
}
