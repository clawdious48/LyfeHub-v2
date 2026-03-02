// frontend-next/src/pages/calendar/components/sidebar/GoogleCalendarSection.tsx
import { RefreshCw, Unplug, Cloud } from 'lucide-react'
import {
  useGoogleCalendarStatus,
  useGoogleCalendars,
  useConnectGoogleCalendar,
  useDisconnectGoogleCalendar,
  useSyncGoogleCalendar,
} from '@/api/hooks/useGoogleCalendar.js'
import { Button } from '@/components/ui/button.js'

export function GoogleCalendarSection() {
  const { data: status } = useGoogleCalendarStatus()
  const { data: calendars = [] } = useGoogleCalendars()
  const connect = useConnectGoogleCalendar()
  const disconnect = useDisconnectGoogleCalendar()
  const sync = useSyncGoogleCalendar()

  if (!status?.connected) {
    return (
      <div>
        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
          Google Calendar
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs gap-1.5"
          onClick={() => connect.mutate()}
          disabled={connect.isPending}
        >
          <Cloud className="size-3.5" />
          Connect Google Calendar
        </Button>
      </div>
    )
  }

  const lastSynced = status.last_synced_at
    ? new Date(status.last_synced_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : 'Never'

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Google Calendar
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => sync.mutate()}
            disabled={sync.isPending}
            className="p-1 rounded hover:bg-bg-hover transition-colors"
            title="Sync now"
          >
            <RefreshCw className={['size-3 text-text-muted', sync.isPending && 'animate-spin'].filter(Boolean).join(' ')} />
          </button>
          <button
            onClick={() => disconnect.mutate()}
            className="p-1 rounded hover:bg-bg-hover transition-colors"
            title="Disconnect"
          >
            <Unplug className="size-3 text-text-muted" />
          </button>
        </div>
      </div>

      <div className="text-[10px] text-text-muted mb-2">
        {status.google_email} &middot; Last sync: {lastSynced}
      </div>

      <div className="space-y-0.5">
        {calendars.map((cal) => (
          <div key={cal.id} className="flex items-center gap-2 px-2 py-1 text-xs text-text-secondary">
            <span className="size-2.5 rounded-sm shrink-0" style={{ backgroundColor: cal.color }} />
            <span className="truncate">{cal.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
