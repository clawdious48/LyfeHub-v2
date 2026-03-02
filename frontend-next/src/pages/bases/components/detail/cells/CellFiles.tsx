import { useState } from 'react'
import { Paperclip, Upload } from 'lucide-react'
import { FileUploadModal } from '../../modals/FileUploadModal.js'
import { useUpdateBaseRecord } from '@/api/hooks/index.js'
import type { BaseProperty } from '@/types/index.js'

interface FileEntry {
  name: string
  url: string
  size?: number
  type?: string
}

interface CellFilesProps {
  value: unknown
  baseId: string
  property: BaseProperty
  recordId: string
}

export function CellFiles({ value, baseId, property, recordId }: CellFilesProps) {
  const [uploadOpen, setUploadOpen] = useState(false)
  const files: FileEntry[] = Array.isArray(value) ? value : []
  const updateRecord = useUpdateBaseRecord(baseId)

  function handleSave(newFiles: FileEntry[]) {
    updateRecord.mutate({
      id: recordId,
      values: { [property.id]: newFiles },
    })
  }

  return (
    <>
      <button
        onClick={() => setUploadOpen(true)}
        className="inline-flex items-center gap-1 group cursor-pointer w-full text-left"
      >
        {files.length === 0 ? (
          <span className="text-sm text-text-muted group-hover:text-text-secondary">
            &mdash;
          </span>
        ) : (
          <span className="text-xs text-text-secondary inline-flex items-center gap-1">
            <Paperclip className="w-3 h-3" />
            {files.length} file{files.length === 1 ? '' : 's'}
          </span>
        )}
        <Upload className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>

      <FileUploadModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        baseId={baseId}
        recordId={recordId}
        propertyId={property.id}
        currentFiles={files}
        onSave={handleSave}
      />
    </>
  )
}
