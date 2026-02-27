import { useQuery } from '@tanstack/react-query'
import { FileText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/api/client'

interface Note {
  id: string
  title: string
  created_at: string
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then

  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`

  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export default function QuickNotesWidget({ config: _config }: { config?: Record<string, unknown> }) {
  const { data: notes, isLoading } = useQuery({
    queryKey: ['notes', 'recent'],
    queryFn: () => apiClient.get<Note[]>('/notes?limit=5'),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-text-muted text-sm">Loading...</p>
      </div>
    )
  }

  if (!notes || notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <p className="text-text-secondary text-sm">No notes yet</p>
        <p className="text-text-muted text-xs">Start capturing your thoughts</p>
        <Button variant="outline" size="sm" className="mt-1 text-accent border-accent">
          <Plus className="size-3.5" />
          New Note
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {notes.map((note) => (
        <div
          key={note.id}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-bg-hover transition-colors"
        >
          <FileText className="size-4 text-text-muted shrink-0" />
          <span className="text-sm text-text-primary truncate flex-1">
            {note.title || 'Untitled'}
          </span>
          <span className="text-xs text-text-muted shrink-0">
            {timeAgo(note.created_at)}
          </span>
        </div>
      ))}
    </div>
  )
}
