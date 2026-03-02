import { useRef } from 'react'
import { Button } from '@/components/ui/button.js'
import { Upload, FileText } from 'lucide-react'
import { useJobDocuments, useUploadJobDocument } from '@/api/hooks/index.js'
import { formatDate } from '@/pages/jobs/utils/jobFormatters.js'

interface JobDocumentsTabProps {
  jobId: string
  selectedPhaseId: string | null
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function JobDocumentsTab({ jobId, selectedPhaseId }: JobDocumentsTabProps) {
  const { data: documents } = useJobDocuments(jobId)
  const uploadDocument = useUploadJobDocument()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filtered = selectedPhaseId
    ? (documents ?? []).filter(d => d.phase_id === selectedPhaseId)
    : (documents ?? [])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    if (selectedPhaseId) {
      formData.append('phase_id', selectedPhaseId)
    }
    uploadDocument.mutate({ jobId, formData })
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadDocument.isPending}
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploadDocument.isPending ? 'Uploading...' : 'Upload File'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-text-muted">
            No documents yet
          </div>
        ) : (
          filtered.map(doc => (
            <div
              key={doc.id}
              className="flex items-center justify-between py-2 border-b border-border/50"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-text-muted" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{doc.file_name}</p>
                  <p className="text-xs text-text-muted">
                    {formatFileSize(doc.file_size)} &middot; {formatDate(doc.created_at)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                asChild
              >
                <a
                  href={`/api/apex-documents/${doc.id}/file`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View
                </a>
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
