import { useState, useRef } from 'react'
import { Paperclip, X, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button.js'
import { formatFileSize } from '@/pages/mail/utils/mailHelpers.js'

const MAX_TOTAL_SIZE = 25 * 1024 * 1024 // 25MB

interface Props {
  files: File[]
  onChange: (files: File[]) => void
}

export function AttachmentZone({ files, onChange }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)

  function addFiles(newFiles: FileList | File[]) {
    const fileArray = Array.from(newFiles)
    const newTotal = totalSize + fileArray.reduce((sum, f) => sum + f.size, 0)
    if (newTotal > MAX_TOTAL_SIZE) {
      alert('Total attachment size cannot exceed 25MB')
      return
    }
    onChange([...files, ...fileArray])
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index))
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          'border-2 border-dashed rounded-md p-4 text-center transition-colors',
          isDragging ? 'border-accent bg-accent-light' : 'border-border',
        ].join(' ')}
      >
        <Upload className="size-5 text-text-muted mx-auto mb-1" />
        <p className="text-xs text-text-muted">
          Drop files here or{' '}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-accent hover:underline"
          >
            browse
          </button>
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((file, i) => (
            <div key={`${file.name}-${i}`} className="flex items-center gap-2 px-2 py-1 bg-bg-surface rounded text-sm">
              <Paperclip className="size-3 text-text-muted shrink-0" />
              <span className="text-text-primary truncate flex-1">{file.name}</span>
              <span className="text-xs text-text-muted shrink-0">{formatFileSize(file.size)}</span>
              <button onClick={() => removeFile(i)} className="text-text-muted hover:text-accent shrink-0">
                <X className="size-3" />
              </button>
            </div>
          ))}
          <div className="text-xs text-text-muted text-right">
            Total: {formatFileSize(totalSize)} / 25 MB
          </div>
        </div>
      )}
    </div>
  )
}
