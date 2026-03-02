import { useState, useRef } from 'react'
import { Upload, X, FileIcon, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog.js'
import { Button } from '@/components/ui/button.js'
import { apiClient } from '@/api/client.js'

interface FileEntry {
  name: string
  url: string
  size?: number
  type?: string
}

interface FileUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  baseId: string
  recordId: string
  propertyId: string
  currentFiles: FileEntry[]
  onSave: (files: FileEntry[]) => void
}

function formatSize(bytes?: number): string {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileUploadModal({
  open,
  onOpenChange,
  currentFiles,
  onSave,
}: FileUploadModalProps) {
  const [files, setFiles] = useState<FileEntry[]>(currentFiles)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileUpload(file: File) {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await apiClient.upload<{ url: string }>('/uploads', formData)
      setFiles((prev) => [
        ...prev,
        { name: file.name, url: result.url, size: file.size, type: file.type },
      ])
    } catch {
      // Upload failed silently — could add toast later
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    for (const file of droppedFiles) {
      handleFileUpload(file)
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    for (const file of selected) {
      handleFileUpload(file)
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleRemove(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSave() {
    onSave(files)
    onOpenChange(false)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setFiles(currentFiles)
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Files</DialogTitle>
        </DialogHeader>

        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            flex flex-col items-center justify-center gap-2 py-8
            border-2 border-dashed rounded-lg cursor-pointer transition-colors
            ${dragOver ? 'border-neon-blue bg-neon-blue/5' : 'border-border hover:border-text-muted'}
          `}
        >
          <Upload className={`h-8 w-8 ${dragOver ? 'text-neon-blue' : 'text-text-muted'}`} />
          <p className="text-sm text-text-muted">
            {uploading ? 'Uploading...' : 'Drop files here or click to browse'}
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleInputChange}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-md p-2">
            {files.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-2 group"
              >
                <FileIcon className="h-4 w-4 text-text-muted shrink-0" />
                <span className="text-sm text-text-primary truncate flex-1">
                  {file.name}
                </span>
                {file.size != null && (
                  <span className="text-[10px] text-text-muted whitespace-nowrap">
                    {formatSize(file.size)}
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemove(i)
                  }}
                  className="text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <span className="text-xs text-text-muted">
            {files.length} file{files.length === 1 ? '' : 's'}
          </span>
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
