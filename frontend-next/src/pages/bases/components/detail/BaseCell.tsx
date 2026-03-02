import { TableCell } from '@/components/ui/table.js'
import { useBasesUiStore } from '@/stores/basesUiStore.js'
import { useUpdateBaseRecord } from '@/api/hooks/index.js'
import { useQueryClient } from '@tanstack/react-query'
import { baseKeys } from '@/api/hooks/useBases.js'
import {
  CellText,
  CellNumber,
  CellCheckbox,
  CellSelect,
  CellMultiSelect,
  CellDate,
  CellUrl,
  CellRelation,
  CellEmail,
  CellPhone,
  CellRichText,
  CellStatus,
  CellCreatedTime,
  CellLastEditedTime,
  CellFiles,
} from '@/pages/bases/components/detail/cells/index.js'
import { CellTextEditor } from './cells/CellTextEditor.js'
import { CellNumberEditor } from './cells/CellNumberEditor.js'
import { CellDateEditor } from './cells/CellDateEditor.js'
import { CellSelectEditor } from './cells/CellSelectEditor.js'
import { CellMultiSelectEditor } from './cells/CellMultiSelectEditor.js'
import { CellEmailEditor } from './cells/CellEmailEditor.js'
import { CellPhoneEditor } from './cells/CellPhoneEditor.js'
import { CellRichTextEditor } from './cells/CellRichTextEditor.js'
import { CellStatusEditor } from './cells/CellStatusEditor.js'
import { READ_ONLY_TYPES } from '@/pages/bases/utils/baseConstants.js'
import type { BaseRecord, BaseProperty, SelectOption, StatusOption } from '@/types/index.js'

interface BaseCellProps {
  record: BaseRecord
  property: BaseProperty
  baseId: string
}

export function BaseCell({ record, property, baseId }: BaseCellProps) {
  const { editingCellKey, setEditingCell } = useBasesUiStore()
  const isEditing = editingCellKey?.recordId === record.id && editingCellKey?.propertyId === property.id
  const updateRecord = useUpdateBaseRecord(baseId)
  const queryClient = useQueryClient()
  const value = record.values[property.id]

  function handleSave(newValue: unknown) {
    const prevData = queryClient.getQueryData(baseKeys.detail(baseId))
    queryClient.setQueryData(baseKeys.detail(baseId), (old: any) => {
      if (!old) return old
      return {
        ...old,
        records: old.records?.map((r: any) =>
          r.id === record.id ? { ...r, values: { ...r.values, [property.id]: newValue } } : r
        ),
      }
    })

    updateRecord.mutate(
      { id: record.id, values: { ...record.values, [property.id]: newValue } },
      {
        onError: () => {
          queryClient.setQueryData(baseKeys.detail(baseId), prevData)
        },
      }
    )
    setEditingCell(null)
  }

  function handleCancel() {
    setEditingCell(null)
  }

  function handleClick() {
    if (property.type !== 'checkbox' && property.type !== 'relation' && property.type !== 'files' && !READ_ONLY_TYPES.includes(property.type)) {
      setEditingCell({ recordId: record.id, propertyId: property.id })
    }
  }

  if (isEditing) {
    return (
      <TableCell className="px-3 py-2 border-r border-border last:border-r-0 min-w-[120px] max-w-[300px]">
        {renderEditor()}
      </TableCell>
    )
  }

  return (
    <TableCell
      className="px-3 py-2 border-r border-border last:border-r-0 cursor-pointer min-w-[120px] max-w-[300px]"
      onClick={handleClick}
    >
      {renderCell()}
    </TableCell>
  )

  function renderEditor() {
    switch (property.type) {
      case 'text':
      case 'url':
        return <CellTextEditor value={String(value ?? '')} onSave={handleSave} onCancel={handleCancel} />
      case 'number':
        return <CellNumberEditor value={value as number | null} onSave={handleSave} onCancel={handleCancel} />
      case 'date':
        return <CellDateEditor value={String(value ?? '')} onSave={handleSave} onCancel={handleCancel} />
      case 'select':
        return (
          <CellSelectEditor
            value={String(value ?? '')}
            options={(property.options as SelectOption[]) ?? []}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )
      case 'multi_select':
        return (
          <CellMultiSelectEditor
            value={(value as string[]) ?? []}
            options={(property.options as SelectOption[]) ?? []}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )
      case 'email':
        return <CellEmailEditor value={String(value ?? '')} onSave={handleSave} onCancel={handleCancel} />
      case 'phone':
        return <CellPhoneEditor value={String(value ?? '')} onSave={handleSave} onCancel={handleCancel} />
      case 'rich_text':
        return <CellRichTextEditor value={String(value ?? '')} onSave={handleSave} onCancel={handleCancel} />
      case 'status':
        return (
          <CellStatusEditor
            value={String(value ?? '')}
            options={(property.options as StatusOption[]) ?? []}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )
      default:
        return <CellTextEditor value={String(value ?? '')} onSave={handleSave} onCancel={handleCancel} />
    }
  }

  function renderCell() {
    switch (property.type) {
      case 'text':
        return <CellText value={value} />
      case 'number':
        return <CellNumber value={value} />
      case 'checkbox':
        return <CellCheckbox value={value} onChange={(val) => handleSave(val)} />
      case 'select':
        return <CellSelect value={value} options={property.options as SelectOption[]} />
      case 'multi_select':
        return <CellMultiSelect value={value} options={property.options as SelectOption[]} />
      case 'date':
        return <CellDate value={value} />
      case 'url':
        return <CellUrl value={value} />
      case 'relation':
        return <CellRelation value={value} baseId={baseId} property={property} recordId={record.id} />
      case 'email':
        return <CellEmail value={value} />
      case 'phone':
        return <CellPhone value={value} />
      case 'rich_text':
        return <CellRichText value={value} />
      case 'status':
        return <CellStatus value={value} options={property.options as StatusOption[]} />
      case 'created_time':
        return <CellCreatedTime value={record.created_at} />
      case 'last_edited_time':
        return <CellLastEditedTime value={record.updated_at} />
      case 'files':
        return <CellFiles value={value} baseId={baseId} property={property} recordId={record.id} />
      default:
        return <CellText value={value} />
    }
  }
}
