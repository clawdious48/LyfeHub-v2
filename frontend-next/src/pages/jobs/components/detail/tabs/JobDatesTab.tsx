import { useState } from 'react'
import { Input } from '@/components/ui/input.js'
import { useUpdateJobDates } from '@/api/hooks/index.js'
import { DATE_FIELDS } from '@/pages/jobs/utils/jobConstants.js'
import { formatDate } from '@/pages/jobs/utils/jobFormatters.js'
import type { ApexJob } from '@/types/index.js'

interface JobDatesTabProps {
  job: ApexJob
}

export function JobDatesTab({ job }: JobDatesTabProps) {
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const updateDates = useUpdateJobDates()

  function startEdit(key: string) {
    const current = job[key as keyof ApexJob] as string | null
    setEditingField(key)
    setEditValue(current ?? '')
  }

  function commitEdit(key: string) {
    setEditingField(null)
    const current = job[key as keyof ApexJob] as string | null
    if (editValue !== (current ?? '')) {
      updateDates.mutate({
        id: job.id,
        [key]: editValue || null,
      })
    }
  }

  return (
    <div className="space-y-0">
      {DATE_FIELDS.map(({ key, label }, i) => {
        const value = job[key as keyof ApexJob] as string | null
        const isLast = i === DATE_FIELDS.length - 1
        return (
          <div
            key={key}
            className={`flex items-center justify-between py-2 ${isLast ? '' : 'border-b border-border'}`}
          >
            <span className="text-sm text-text-secondary">{label}</span>
            {editingField === key ? (
              <Input
                type="date"
                className="w-44 h-8 text-sm"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => commitEdit(key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit(key)
                }}
                autoFocus
              />
            ) : (
              <button
                className="text-sm text-text-primary cursor-pointer hover:underline"
                onClick={() => startEdit(key)}
              >
                {value ? formatDate(value) : <span className="text-text-muted">—</span>}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
