import { Pencil } from 'lucide-react'
import type { Base } from '@/types/index.js'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card.js'
import { Button } from '@/components/ui/button.js'
import { formatRelativeDate } from '@/pages/bases/utils/baseHelpers.js'

interface BaseCardProps {
  base: Base
  size: 'small' | 'medium' | 'large'
  onClick: () => void
  onEdit: () => void
}

const sizeStyles = {
  small: {
    card: 'py-3 gap-2',
    header: 'px-3',
    content: 'px-3 text-xs',
    title: 'text-sm',
    showDescription: false,
  },
  medium: {
    card: 'py-4 gap-3',
    header: 'px-4',
    content: 'px-4 text-xs',
    title: 'text-sm',
    showDescription: true,
  },
  large: {
    card: 'py-5 gap-3',
    header: 'px-5',
    content: 'px-5 text-sm',
    title: 'text-base',
    showDescription: true,
  },
} as const

export function BaseCard({ base, size, onClick, onEdit }: BaseCardProps) {
  const styles = sizeStyles[size]

  return (
    <Card
      className={`group cursor-pointer bg-bg-surface border border-border hover:border-accent/40 transition-colors ${styles.card}`}
      onClick={onClick}
    >
      <CardHeader className={`gap-1 ${styles.header}`}>
        <CardTitle className={`font-medium truncate ${styles.title}`}>
          <span className="mr-1.5">{base.icon || '📊'}</span>
          {base.name}
        </CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-xs"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            title="Edit base"
          >
            <Pencil />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className={`space-y-1 ${styles.content}`}>
        {styles.showDescription && base.description && (
          <p className="text-text-secondary line-clamp-2">{base.description}</p>
        )}
        <div className="flex items-center gap-3 text-text-secondary">
          <span>{base.column_count ?? base.properties?.length ?? 0} properties</span>
          {(base.record_count !== undefined || base.records !== undefined) && (
            <span>{base.record_count ?? base.records?.length ?? 0} records</span>
          )}
        </div>
        <div className="text-text-secondary">
          Updated {formatRelativeDate(base.updated_at)}
        </div>
      </CardContent>
    </Card>
  )
}
