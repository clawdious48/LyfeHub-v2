import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.js'
import { Button } from '@/components/ui/button.js'
import { Input } from '@/components/ui/input.js'
import { Checkbox } from '@/components/ui/checkbox.js'
import { Label } from '@/components/ui/label.js'
import { Separator } from '@/components/ui/separator.js'
import {
  useMailFilters,
  useMailLabels,
  useCreateFilter,
  useDeleteFilter,
} from '@/api/hooks/index.js'
import type { MailFilter, MailLabel } from '@/types/index.js'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getLabelName(id: string, labels: MailLabel[]): string {
  return labels.find(l => l.id === id)?.name ?? id
}

function formatFilterSummary(filter: MailFilter, labels: MailLabel[]): string {
  const parts: string[] = []
  if (filter.criteria.from) parts.push(`From: ${filter.criteria.from}`)
  if (filter.criteria.to) parts.push(`To: ${filter.criteria.to}`)
  if (filter.criteria.subject) parts.push(`Subject: ${filter.criteria.subject}`)
  if (filter.criteria.query) parts.push(`Has: ${filter.criteria.query}`)
  if (filter.criteria.hasAttachment) parts.push('Has attachment')

  const actions: string[] = []
  if (filter.action.addLabelIds?.length) {
    actions.push(`Add label: ${filter.action.addLabelIds.map(id => getLabelName(id, labels)).join(', ')}`)
  }
  if (filter.action.removeLabelIds?.length) {
    actions.push(`Remove label: ${filter.action.removeLabelIds.map(id => getLabelName(id, labels)).join(', ')}`)
  }
  if (filter.action.forward) actions.push(`Forward to: ${filter.action.forward}`)

  return parts.length > 0 || actions.length > 0
    ? `${parts.join(', ')} → ${actions.join(', ')}`
    : 'Empty filter'
}

export function FilterSettings({ open, onOpenChange }: Props) {
  const { data: filters = [], isLoading: filtersLoading } = useMailFilters()
  const { data: labels = [] } = useMailLabels()
  const createFilter = useCreateFilter()
  const deleteFilter = useDeleteFilter()

  // Form state
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [query, setQuery] = useState('')
  const [hasAttachment, setHasAttachment] = useState(false)
  const [addLabelId, setAddLabelId] = useState('')
  const [removeLabelId, setRemoveLabelId] = useState('')
  const [archive, setArchive] = useState(false)
  const [star, setStar] = useState(false)
  const [markAsRead, setMarkAsRead] = useState(false)
  const [forwardTo, setForwardTo] = useState('')

  function resetForm() {
    setFrom('')
    setTo('')
    setSubject('')
    setQuery('')
    setHasAttachment(false)
    setAddLabelId('')
    setRemoveLabelId('')
    setArchive(false)
    setStar(false)
    setMarkAsRead(false)
    setForwardTo('')
  }

  function handleCreate() {
    const addLabelIds: string[] = []
    const removeLabelIds: string[] = []
    if (addLabelId) addLabelIds.push(addLabelId)
    if (removeLabelId) removeLabelIds.push(removeLabelId)
    if (archive) removeLabelIds.push('INBOX')
    if (star) addLabelIds.push('STARRED')
    if (markAsRead) removeLabelIds.push('UNREAD')

    createFilter.mutate({
      criteria: {
        ...(from && { from }),
        ...(to && { to }),
        ...(subject && { subject }),
        ...(query && { query }),
        ...(hasAttachment && { hasAttachment }),
      },
      action: {
        ...(addLabelIds.length > 0 && { addLabelIds }),
        ...(removeLabelIds.length > 0 && { removeLabelIds }),
        ...(forwardTo && { forward: forwardTo }),
      },
    }, {
      onSuccess: () => resetForm(),
    })
  }

  const userLabels = labels.filter(l => l.type === 'user')
  const hasCriteria = from || to || subject || query || hasAttachment

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Mail Filters</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-6">
          {/* Existing filters */}
          <div>
            <h3 className="text-sm font-medium text-text-primary mb-2">Active Filters</h3>
            {filtersLoading ? (
              <p className="text-sm text-text-muted">Loading filters...</p>
            ) : filters.length === 0 ? (
              <p className="text-sm text-text-muted italic">No filters configured</p>
            ) : (
              <div className="space-y-2">
                {filters.map(filter => (
                  <div
                    key={filter.id}
                    className="flex items-start justify-between gap-2 p-2 rounded-md bg-bg-hover text-sm"
                  >
                    <span className="text-text-secondary flex-1 min-w-0 break-words">
                      {formatFilterSummary(filter, labels)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-text-muted hover:text-red-400 h-7 w-7 p-0"
                      onClick={() => deleteFilter.mutate(filter.id)}
                      disabled={deleteFilter.isPending}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Create filter */}
          <div>
            <h3 className="text-sm font-medium text-text-primary mb-3">Create Filter</h3>

            <div className="space-y-3">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Criteria</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-text-secondary">From</Label>
                  <Input
                    value={from}
                    onChange={e => setFrom(e.target.value)}
                    placeholder="sender@example.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-text-secondary">To</Label>
                  <Input
                    value={to}
                    onChange={e => setTo(e.target.value)}
                    placeholder="recipient@example.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-text-secondary">Subject</Label>
                  <Input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Contains..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-text-secondary">Has words</Label>
                  <Input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search query"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="filter-attachment"
                  checked={hasAttachment}
                  onCheckedChange={(v) => setHasAttachment(v === true)}
                />
                <Label htmlFor="filter-attachment" className="text-sm text-text-secondary">
                  Has attachment
                </Label>
              </div>

              <Separator className="my-2" />

              <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Actions</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-text-secondary">Add label</Label>
                  <select
                    value={addLabelId}
                    onChange={e => setAddLabelId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-bg-surface text-text-primary text-sm px-3 py-2"
                  >
                    <option value="">None</option>
                    {userLabels.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-text-secondary">Remove label</Label>
                  <select
                    value={removeLabelId}
                    onChange={e => setRemoveLabelId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-bg-surface text-text-primary text-sm px-3 py-2"
                  >
                    <option value="">None</option>
                    {userLabels.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-archive"
                    checked={archive}
                    onCheckedChange={(v) => setArchive(v === true)}
                  />
                  <Label htmlFor="filter-archive" className="text-sm text-text-secondary">
                    Archive
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-star"
                    checked={star}
                    onCheckedChange={(v) => setStar(v === true)}
                  />
                  <Label htmlFor="filter-star" className="text-sm text-text-secondary">
                    Star
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-read"
                    checked={markAsRead}
                    onCheckedChange={(v) => setMarkAsRead(v === true)}
                  />
                  <Label htmlFor="filter-read" className="text-sm text-text-secondary">
                    Mark as read
                  </Label>
                </div>
              </div>

              <div>
                <Label className="text-xs text-text-secondary">Forward to</Label>
                <Input
                  value={forwardTo}
                  onChange={e => setForwardTo(e.target.value)}
                  placeholder="forward@example.com"
                  className="mt-1"
                />
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleCreate}
                  disabled={!hasCriteria || createFilter.isPending}
                >
                  {createFilter.isPending ? 'Creating...' : 'Create Filter'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
