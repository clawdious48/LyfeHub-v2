import { PenSquare } from 'lucide-react'
import { useMailLabels } from '@/api/hooks/index.js'
import { useMailUiStore } from '@/stores/mailUiStore.js'
import { SYSTEM_LABELS, SIDEBAR_LABEL_ORDER } from '@/pages/mail/utils/mailConstants.js'
import { Separator } from '@/components/ui/separator.js'

export function MailSidebarContent() {
  const { data: labels = [] } = useMailLabels()
  const { activeLabel, setActiveLabel, openCompose } = useMailUiStore()

  const userLabels = labels.filter(l => l.type === 'user')

  function getUnreadCount(labelId: string): number {
    const label = labels.find(l => l.id === labelId)
    return label?.messagesUnread ?? 0
  }

  return (
    <>
      {/* Compose button */}
      <button
        onClick={() => openCompose('new')}
        className="flex items-center gap-2 w-full px-2 py-1.5 mb-2 rounded-md text-sm font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
      >
        <PenSquare className="size-4 shrink-0" />
        <span>Compose</span>
      </button>

      {/* System labels */}
      <div className="space-y-0.5">
        {SIDEBAR_LABEL_ORDER.map(labelId => {
          const sys = SYSTEM_LABELS[labelId]
          if (!sys) return null
          const Icon = sys.icon
          const unread = getUnreadCount(labelId)
          const isActive = activeLabel === labelId

          return (
            <button
              key={labelId}
              onClick={() => setActiveLabel(labelId)}
              className={[
                'flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-accent-light text-accent font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
              ].join(' ')}
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1 text-left truncate">{sys.name}</span>
              {unread > 0 && (
                <span className={[
                  'text-xs tabular-nums',
                  isActive ? 'text-accent' : 'text-text-muted',
                ].join(' ')}>
                  {unread}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* User labels */}
      {userLabels.length > 0 && (
        <>
          <Separator className="my-2" />
          <div className="space-y-0.5">
            {userLabels.map(label => {
              const isActive = activeLabel === label.id

              return (
                <button
                  key={label.id}
                  onClick={() => setActiveLabel(label.id)}
                  className={[
                    'flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-accent-light text-accent font-medium'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
                  ].join(' ')}
                >
                  {label.color ? (
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: label.color.backgroundColor }}
                    />
                  ) : (
                    <span className="size-2.5 rounded-full shrink-0 bg-text-muted/30" />
                  )}
                  <span className="flex-1 text-left truncate">{label.name}</span>
                  {label.messagesUnread > 0 && (
                    <span className={[
                      'text-xs tabular-nums',
                      isActive ? 'text-accent' : 'text-text-muted',
                    ].join(' ')}>
                      {label.messagesUnread}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
