import { useState, useRef, useEffect } from 'react'
import { FileText, CheckSquare, UserPlus } from 'lucide-react'
import { apiClient } from '@/api/client.js'
import { TaskQuickCaptureModal } from '@/pages/tasks/components/modals/TaskQuickCaptureModal.js'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog.js'
import { Button } from '@/components/ui/button.js'
import { Input } from '@/components/ui/input.js'

type CaptureType = 'note' | 'contact'

const captureItems = [
  { key: 'showNote', type: 'note' as const, label: 'Note', icon: FileText, color: 'text-purple-500', border: 'border-purple-500/30 hover:border-purple-500/60', bg: 'hover:bg-purple-500/10' },
  { key: 'showTask', type: 'task' as const, label: 'Task', icon: CheckSquare, color: 'text-blue-500', border: 'border-blue-500/30 hover:border-blue-500/60', bg: 'hover:bg-blue-500/10' },
  { key: 'showPerson', type: 'contact' as const, label: 'Person', icon: UserPlus, color: 'text-green-500', border: 'border-green-500/30 hover:border-green-500/60', bg: 'hover:bg-green-500/10' },
] as const

interface QuickCaptureWidgetProps {
  config?: Record<string, unknown>
  onConfigChange?: (config: Record<string, unknown>) => void
}

export default function QuickCaptureWidget({ config }: QuickCaptureWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVertical, setIsVertical] = useState(false)

  const [captureOpen, setCaptureOpen] = useState(false)
  const [captureType, setCaptureType] = useState<CaptureType>('note')
  const [captureTitle, setCaptureTitle] = useState('')
  const [captureSaving, setCaptureSaving] = useState(false)
  const [taskCaptureOpen, setTaskCaptureOpen] = useState(false)

  const showNote = config?.showNote !== false
  const showTask = config?.showTask !== false
  const showPerson = config?.showPerson !== false

  const visibilityMap: Record<string, boolean> = {
    showNote,
    showTask,
    showPerson,
  }

  const enabledItems = captureItems.filter((item) => visibilityMap[item.key])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setIsVertical(height >= width)
      }
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  function handleClick(item: (typeof captureItems)[number]) {
    if (item.type === 'task') {
      setTaskCaptureOpen(true)
    } else {
      setCaptureType(item.type)
      setCaptureTitle('')
      setCaptureOpen(true)
    }
  }

  async function handleCaptureSave() {
    if (!captureTitle.trim()) return
    setCaptureSaving(true)
    try {
      await apiClient.post('/inbox/capture', { type: captureType, title: captureTitle.trim() })
      setCaptureOpen(false)
    } catch (err) {
      console.error('Capture failed:', err)
    } finally {
      setCaptureSaving(false)
    }
  }

  if (enabledItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text-muted text-sm">Enable capture types in settings</p>
      </div>
    )
  }

  return (
    <>
      <div
        ref={containerRef}
        className={[
          'flex gap-3 h-full w-full items-center justify-center p-2',
          isVertical ? 'flex-col' : 'flex-row',
        ].join(' ')}
      >
        {enabledItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.key}
              onClick={() => handleClick(item)}
              className={[
                'flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors cursor-pointer',
                item.border,
                item.bg,
                item.color,
              ].join(' ')}
            >
              <Icon className="size-4 shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>

      <Dialog open={captureOpen} onOpenChange={setCaptureOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              New {captureType.charAt(0).toUpperCase() + captureType.slice(1)}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder={`Enter ${captureType} title...`}
              value={captureTitle}
              onChange={(e) => setCaptureTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !captureSaving) {
                  handleCaptureSave()
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleCaptureSave}
              disabled={!captureTitle.trim() || captureSaving}
            >
              {captureSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TaskQuickCaptureModal open={taskCaptureOpen} onOpenChange={setTaskCaptureOpen} />
    </>
  )
}
