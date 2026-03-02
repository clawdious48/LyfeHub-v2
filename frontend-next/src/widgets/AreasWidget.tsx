import { useMemo } from 'react'
import { Target } from 'lucide-react'
import { useBases, useBase } from '@/api/hooks'

export default function AreasWidget({ config: _config }: { config?: Record<string, unknown> }) {
  const { data: bases, isLoading: basesLoading } = useBases()

  const tagsBase = useMemo(() => {
    if (!bases) return undefined
    return bases.find(
      (b) => b.name.toLowerCase() === 'tags',
    )
  }, [bases])

  const tagsBaseId = tagsBase?.id ?? ''
  const { data: tagsBaseDetail, isLoading: recordsLoading } = useBase(tagsBaseId)
  const records = tagsBaseDetail?.records

  const areas = useMemo(() => {
    if (!records) return []
    return records.filter((r) => {
      const typeValue = r.values?.Type ?? r.values?.type
      return typeValue === 'Area'
    })
  }, [records])

  if (basesLoading || (tagsBaseId && recordsLoading)) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-text-muted text-sm">Loading...</p>
      </div>
    )
  }

  if (areas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <p className="text-text-secondary text-sm">No areas defined yet</p>
        <p className="text-text-muted text-xs">Areas help you organize what matters most</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {areas.map((area) => {
        const name =
          (area.values?.Name as string) ??
          (area.values?.name as string) ??
          'Untitled'

        return (
          <div
            key={area.id}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-hover border border-border hover:border-accent/30 transition-colors"
          >
            <Target className="size-4 text-accent shrink-0" />
            <span className="text-sm text-text-primary truncate">{name}</span>
          </div>
        )
      })}
    </div>
  )
}
