import { Briefcase } from 'lucide-react'
import { JOB_TYPE_CODES } from '@/pages/jobs/utils/jobConstants.js'

interface JobSetupSectionProps {
  jobTypes: string[]
  onToggleJobType: (code: string) => void
}

export function JobSetupSection({ jobTypes, onToggleJobType }: JobSetupSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Briefcase className="size-4 text-accent" />
          <h3 className="font-medium text-sm text-text-secondary uppercase tracking-wider">
            Job Setup
          </h3>
        </div>
        <span className="text-xs text-red-400">* Required</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {JOB_TYPE_CODES.map(jt => {
          const selected = jobTypes.includes(jt.code)
          return (
            <button
              key={jt.code}
              type="button"
              onClick={() => onToggleJobType(jt.code)}
              className={[
                'px-3 py-2 rounded-md text-sm font-medium border transition-all cursor-pointer',
                selected
                  ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.3)]'
                  : 'bg-bg-surface border-border text-text-secondary hover:border-purple-500/50 hover:text-text-primary',
              ].join(' ')}
            >
              <div className="font-bold">{jt.code}</div>
              <div className="text-xs opacity-75">{jt.label}</div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
