import { Database, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button.js'

interface BasesEmptyStateProps {
  onCreateBase: () => void
}

export function BasesEmptyState({ onCreateBase }: BasesEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="rounded-xl bg-bg-surface border border-border p-4 mb-4">
        <Database className="size-8 text-text-secondary" />
      </div>
      <h2 className="text-lg font-heading text-text-primary mb-1">
        No bases yet
      </h2>
      <p className="text-sm text-text-secondary mb-6">
        Create your first base to get started
      </p>
      <Button onClick={onCreateBase} size="sm">
        <Plus />
        Create Base
      </Button>
    </div>
  )
}
