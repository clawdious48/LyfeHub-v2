import { Activity } from 'lucide-react'
import { useJobActivity } from '@/api/hooks/index.js'
import { formatCurrency, relativeTime } from '@/pages/jobs/utils/jobFormatters.js'

interface JobActivitySidebarProps {
  jobId: string
}

export function JobActivitySidebar({ jobId }: JobActivitySidebarProps) {
  const { data: events, isLoading } = useJobActivity(jobId)

  if (isLoading) {
    return (
      <div className="text-sm text-text-muted animate-pulse py-4">
        Loading activity...
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm text-text-primary">Activity</h3>

      {(!events || events.length === 0) && (
        <p className="text-sm text-text-muted">No activity yet</p>
      )}

      {events?.map((event) => (
        <div key={event.id} className="flex gap-3">
          <Activity className="size-4 text-text-muted shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm text-text-primary">{event.description}</p>
            {event.amount != null && (
              <p className="text-xs text-text-secondary">
                {formatCurrency(event.amount)}
              </p>
            )}
            <p className="text-xs text-text-muted">
              {relativeTime(event.created_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
