import type { ReactNode } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardAction } from '@/components/ui/card.js'
import { cn } from '@/lib/utils.js'

interface EntityCardProps {
  title: string
  children: ReactNode
  actions?: ReactNode
  className?: string
  onClick?: () => void
}

export function EntityCard({ title, children, actions, className, onClick }: EntityCardProps) {
  return (
    <Card
      className={cn(
        onClick && 'cursor-pointer hover:border-accent transition-colors',
        className,
      )}
      onClick={onClick}
    >
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {actions && <CardAction>{actions}</CardAction>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
