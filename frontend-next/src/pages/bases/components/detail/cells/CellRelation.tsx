import { useState } from 'react'
import { Link2 } from 'lucide-react'
import { RelationPickerModal } from '../../modals/RelationPickerModal.js'
import { useUpdateBaseRecord } from '@/api/hooks/index.js'
import type { BaseProperty } from '@/types/index.js'

interface CellRelationProps {
  value: unknown
  baseId: string
  property: BaseProperty
  recordId: string
}

export function CellRelation({ value, baseId, property, recordId }: CellRelationProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const ids = Array.isArray(value) ? value : []
  const updateRecord = useUpdateBaseRecord(baseId)

  function handleSave(newIds: string[]) {
    updateRecord.mutate({
      id: recordId,
      values: { [property.id]: newIds },
    })
  }

  return (
    <>
      <button
        onClick={() => setPickerOpen(true)}
        className="inline-flex items-center gap-1 group cursor-pointer w-full text-left"
      >
        {ids.length === 0 ? (
          <span className="text-sm text-text-muted group-hover:text-text-secondary">
            &mdash;
          </span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded-md bg-surface-2 text-text-secondary border border-border">
            {ids.length} linked
          </span>
        )}
        <Link2 className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>

      <RelationPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        baseId={baseId}
        property={property}
        currentValue={ids as string[]}
        onSave={handleSave}
      />
    </>
  )
}
