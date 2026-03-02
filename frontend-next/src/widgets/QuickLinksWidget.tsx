import { useState } from 'react'
import { Button } from '@/components/ui/button.js'
import { Input } from '@/components/ui/input.js'
import { Plus, X } from 'lucide-react'

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

function faviconUrl(url: string): string {
  const domain = extractDomain(url)
  return domain
    ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    : ''
}

export default function QuickLinksWidget({
  config,
  onConfigChange,
}: {
  config?: Record<string, unknown>
  onConfigChange?: (config: Record<string, unknown>) => void
}) {
  const links = (config?.links as LinkItem[] | undefined) ?? []
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')

  const handleAdd = () => {
    if (!newName.trim() || !newUrl.trim()) return
    const updated = [...links, { name: newName.trim(), url: newUrl.trim() }]
    onConfigChange?.({ ...config, links: updated })
    setNewName('')
    setNewUrl('')
    setAdding(false)
  }

  const handleRemove = (index: number) => {
    const updated = links.filter((_, i) => i !== index)
    onConfigChange?.({ ...config, links: updated })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    } else if (e.key === 'Escape') {
      setAdding(false)
      setNewName('')
      setNewUrl('')
    }
  }

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2 flex-1">
        {links.map((link, i) => {
          const favicon = faviconUrl(link.url)
          return (
            <div key={i} className="group relative">
              <button
                type="button"
                onClick={() => window.open(link.url.startsWith('http') ? link.url : `https://${link.url}`, '_blank')}
                className="flex flex-col items-center justify-center gap-1.5 w-full p-2 rounded-lg bg-bg-surface border border-border hover:bg-bg-hover transition-colors text-center"
              >
                {favicon ? (
                  <img
                    src={favicon}
                    alt=""
                    className="size-6 shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="size-6 rounded bg-bg-hover" />
                )}
                <span className="text-[11px] text-text-primary leading-tight line-clamp-2 break-all">
                  {link.name}
                </span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemove(i)
                }}
                className="absolute -top-1 -right-1 hidden group-hover:flex items-center justify-center size-4 rounded-full bg-red-500/80 text-white hover:bg-red-500"
              >
                <X className="size-2.5" />
              </button>
            </div>
          )
        })}

        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex flex-col items-center justify-center gap-1.5 w-full p-2 rounded-lg border border-dashed border-border hover:border-text-muted hover:bg-bg-hover transition-colors min-h-[64px]"
          >
            <Plus className="size-5 text-text-muted" />
            <span className="text-[11px] text-text-muted">Add Link</span>
          </button>
        )}
      </div>

      {adding && (
        <div className="flex flex-col gap-1.5 p-2 rounded-lg border border-border bg-bg-surface">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name"
            className="h-7 text-xs"
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <Input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://..."
            type="url"
            className="h-7 text-xs"
            onKeyDown={handleKeyDown}
          />
          <div className="flex gap-1.5 justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => {
                setAdding(false)
                setNewName('')
                setNewUrl('')
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-6 text-xs px-2"
              onClick={handleAdd}
              disabled={!newName.trim() || !newUrl.trim()}
            >
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
