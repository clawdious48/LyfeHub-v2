import { cn } from '@/lib/utils.js'
import type { ApexJobPhase } from '@/types/index.js'

interface JobPhaseBarProps {
  phases: ApexJobPhase[]
  selectedPhaseId: string | null
  onSelectPhase: (id: string | null) => void
}

export function JobPhaseBar({
  phases,
  selectedPhaseId,
  onSelectPhase,
}: JobPhaseBarProps) {
  if (phases.length <= 1) return null

  return (
    <div className="flex gap-2 flex-wrap">
      <button
        className={cn(
          'rounded-full px-3 py-1 text-sm font-medium cursor-pointer transition-colors',
          selectedPhaseId === null
            ? 'bg-accent text-white'
            : 'bg-bg-surface border border-border hover:bg-bg-hover',
        )}
        onClick={() => onSelectPhase(null)}
      >
        All
      </button>
      {phases.map((phase) => (
        <button
          key={phase.id}
          className={cn(
            'rounded-full px-3 py-1 text-sm font-medium cursor-pointer transition-colors',
            selectedPhaseId === phase.id
              ? 'bg-accent text-white'
              : 'bg-bg-surface border border-border hover:bg-bg-hover',
          )}
          onClick={() => onSelectPhase(phase.id)}
        >
          {phase.job_type_code}
        </button>
      ))}
    </div>
  )
}
