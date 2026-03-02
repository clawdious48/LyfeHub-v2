import { useState } from 'react'
import { Button } from '@/components/ui/button.js'
import { Input } from '@/components/ui/input.js'
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react'

interface LinkItem {
  name: string
  url: string
  color?: string
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return u.hostname
  } catch {
    return ''
  }
}

export default function LinksEditor({
  value,
  onChange,
}: {
  value: LinkItem[]
  onChange: (links: LinkItem[]) => void
}) {
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [addName, setAddName] = useState('')
  const [addUrl, setAddUrl] = useState('')

  const startEdit = (index: number) => {
    setEditIndex(index)
    setEditName(value[index].name)
    setEditUrl(value[index].url)
  }

  const saveEdit = () => {
    if (editIndex === null || !editName.trim() || !editUrl.trim()) return
    const updated = [...value]
    updated[editIndex] = { ...updated[editIndex], name: editName.trim(), url: editUrl.trim() }
    onChange(updated)
    setEditIndex(null)
  }

  const cancelEdit = () => {
    setEditIndex(null)
  }

  const handleDelete = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
    if (editIndex === index) setEditIndex(null)
  }

  const handleAdd = () => {
    if (!addName.trim() || !addUrl.trim()) return
    onChange([...value, { name: addName.trim(), url: addUrl.trim() }])
    setAddName('')
    setAddUrl('')
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="space-y-1">
          {value.map((link, i) => (
            <div key={i}>
              {editIndex === i ? (
                <div className="flex flex-col gap-1 p-2 rounded border border-border bg-bg-app">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Name"
                    className="h-7 text-xs"
                    onKeyDown={handleEditKeyDown}
                    autoFocus
                  />
                  <Input
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    placeholder="https://..."
                    type="url"
                    className="h-7 text-xs"
                    onKeyDown={handleEditKeyDown}
                  />
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon-xs" onClick={cancelEdit}>
                      <X className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={saveEdit}
                      disabled={!editName.trim() || !editUrl.trim()}
                    >
                      <Check className="size-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-1.5 rounded hover:bg-bg-hover group">
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${extractDomain(link.url)}&sz=32`}
                    alt=""
                    className="size-4 shrink-0"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-primary truncate">{link.name}</p>
                    <p className="text-[10px] text-text-muted truncate">{link.url}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => startEdit(i)}
                    className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-text-primary"
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleDelete(i)}
                    className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-400"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1 p-2 rounded border border-dashed border-border">
        <div className="flex items-center gap-1.5">
          <Plus className="size-3 text-text-muted shrink-0" />
          <Input
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            placeholder="Name"
            className="h-7 text-xs flex-1"
            onKeyDown={handleAddKeyDown}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-3 shrink-0" />
          <Input
            value={addUrl}
            onChange={(e) => setAddUrl(e.target.value)}
            placeholder="https://..."
            type="url"
            className="h-7 text-xs flex-1"
            onKeyDown={handleAddKeyDown}
          />
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            className="h-6 text-xs px-3"
            onClick={handleAdd}
            disabled={!addName.trim() || !addUrl.trim()}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  )
}
