import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button.js'
import { Badge } from '@/components/ui/badge.js'
import { formatCurrency } from '@/pages/jobs/utils/jobFormatters.js'

interface ExpenseSectionProps {
  title: string
  count: number
  total: number
  children: ReactNode
  onAdd?: () => void
  defaultExpanded?: boolean
}

export function ExpenseSection({
  title,
  count,
  total,
  children,
  onAdd,
  defaultExpanded = false,
}: ExpenseSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="border-b border-border py-3">
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="size-4 text-text-muted" />
          ) : (
            <ChevronRight className="size-4 text-text-muted" />
          )}
          <span className="font-medium text-sm text-text-primary">{title}</span>
          <Badge variant="secondary">{count}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-secondary">
            {formatCurrency(total)}
          </span>
          {onAdd && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onAdd()
              }}
            >
              <Plus className="size-4" />
              Add
            </Button>
          )}
        </div>
      </div>
      {expanded && <div className="mt-2">{children}</div>}
    </div>
  )
}
