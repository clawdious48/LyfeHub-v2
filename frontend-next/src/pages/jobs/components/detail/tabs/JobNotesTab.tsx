import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button.js'
import { Card } from '@/components/ui/card.js'
import { Input } from '@/components/ui/input.js'
import { Textarea } from '@/components/ui/textarea.js'
import { Badge } from '@/components/ui/badge.js'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.js'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog.js'
import {
  useJobNotes,
  useCreateJobNote,
  useDeleteJobNote,
} from '@/api/hooks/index.js'
import { NOTE_TYPES } from '@/pages/jobs/utils/jobConstants.js'
import { relativeTime } from '@/pages/jobs/utils/jobFormatters.js'
import type { ApexJobNote } from '@/types/index.js'

interface JobNotesTabProps {
  jobId: string
  selectedPhaseId: string | null
}

export function JobNotesTab({ jobId, selectedPhaseId }: JobNotesTabProps) {
  const { data: notes } = useJobNotes(jobId)
  const createNote = useCreateJobNote()
  const deleteNote = useDeleteJobNote()

  const [subject, setSubject] = useState('')
  const [noteType, setNoteType] = useState('general')
  const [content, setContent] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ApexJobNote | null>(null)

  const filteredNotes = (notes ?? [])
    .filter((n) => (selectedPhaseId ? n.phase_id === selectedPhaseId : true))
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )

  function handleCreate() {
    createNote.mutate(
      {
        jobId,
        subject,
        note_type: noteType,
        content,
        phase_id: selectedPhaseId,
      },
      {
        onSuccess: () => {
          setSubject('')
          setNoteType('general')
          setContent('')
        },
      },
    )
  }

  function handleDelete() {
    if (!deleteTarget) return
    deleteNote.mutate(
      { jobId, noteId: deleteTarget.id },
      { onSuccess: () => setDeleteTarget(null) },
    )
  }

  return (
    <div className="space-y-4">
      {/* Add form */}
      <Card className="p-4">
        <div className="flex flex-col gap-3">
          <Input
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <Select value={noteType} onValueChange={setNoteType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NOTE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Note content..."
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <Button
            size="sm"
            disabled={!subject.trim() || !content.trim() || createNote.isPending}
            onClick={handleCreate}
          >
            <Plus className="size-4" />
            Add Note
          </Button>
        </div>
      </Card>

      {/* Notes list */}
      {filteredNotes.map((note) => (
        <Card key={note.id} className="p-4">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-start">
              <span className="font-medium text-sm text-text-primary">
                {note.subject}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteTarget(note)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <div className="flex gap-2 items-center">
              <Badge variant="secondary" className="capitalize">
                {note.note_type.replace(/_/g, ' ')}
              </Badge>
              <span className="text-xs text-text-muted">
                {relativeTime(note.created_at)}
              </span>
            </div>
            <p className="text-sm text-text-secondary whitespace-pre-wrap mt-1">
              {note.content}
            </p>
          </div>
        </Card>
      ))}

      {filteredNotes.length === 0 && (
        <p className="text-sm text-text-muted text-center py-4">No notes yet</p>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="Delete Note"
        description="Are you sure you want to delete this note? This action cannot be undone."
        variant="destructive"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleteNote.isPending}
      />
    </div>
  )
}
