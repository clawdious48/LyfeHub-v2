import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog.js'
import { Button } from '@/components/ui/button.js'
import { useMailStatus, useSaveHotkeys } from '@/api/hooks/index.js'
import { DEFAULT_HOTKEYS } from '@/pages/mail/utils/mailConstants.js'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HotkeySettings({ open, onOpenChange }: Props) {
  const { data: status } = useMailStatus()
  const saveHotkeys = useSaveHotkeys()

  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [listeningAction, setListeningAction] = useState<string | null>(null)

  // Initialize overrides from server state
  useEffect(() => {
    if (open && status?.hotkeys) {
      setOverrides({ ...status.hotkeys })
    } else if (open) {
      setOverrides({})
    }
  }, [open, status?.hotkeys])

  const handleKeyCapture = useCallback((e: KeyboardEvent) => {
    if (!listeningAction) return
    e.preventDefault()
    e.stopPropagation()

    // Ignore modifier-only keypresses
    if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return

    let keyStr = e.key
    if (e.shiftKey && keyStr.length === 1) {
      keyStr = `Shift+${keyStr.toUpperCase()}`
    }

    setOverrides(prev => ({ ...prev, [listeningAction]: keyStr }))
    setListeningAction(null)
  }, [listeningAction])

  useEffect(() => {
    if (listeningAction) {
      document.addEventListener('keydown', handleKeyCapture, true)
      return () => document.removeEventListener('keydown', handleKeyCapture, true)
    }
  }, [listeningAction, handleKeyCapture])

  function getDisplayKey(action: string): string {
    if (overrides[action] !== undefined) return overrides[action]
    return DEFAULT_HOTKEYS[action]?.key ?? ''
  }

  function handleReset() {
    setOverrides({})
    setListeningAction(null)
  }

  function handleSave() {
    saveHotkeys.mutate(overrides, {
      onSuccess: () => onOpenChange(false),
    })
  }

  const actions = Object.entries(DEFAULT_HOTKEYS)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted text-left">
                <th className="pb-2 font-medium">Action</th>
                <th className="pb-2 font-medium text-right">Key</th>
              </tr>
            </thead>
            <tbody>
              {actions.map(([action, def]) => {
                const isListening = listeningAction === action
                const displayKey = getDisplayKey(action)
                const isOverridden = overrides[action] !== undefined && overrides[action] !== def.key

                return (
                  <tr key={action} className="border-b border-border/50">
                    <td className="py-2 text-text-secondary">{def.description}</td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setListeningAction(isListening ? null : action)}
                        className={[
                          'inline-flex items-center justify-center min-w-[60px] px-2 py-1 rounded text-xs font-mono transition-colors',
                          isListening
                            ? 'bg-accent/20 text-accent ring-1 ring-accent animate-pulse'
                            : isOverridden
                              ? 'bg-accent-light text-accent hover:bg-accent/20'
                              : 'bg-bg-hover text-text-primary hover:bg-bg-hover/80',
                        ].join(' ')}
                      >
                        {isListening ? 'Press key...' : displayKey}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 pt-4">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveHotkeys.isPending}>
              {saveHotkeys.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
