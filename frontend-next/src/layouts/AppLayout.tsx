import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '@/layouts/Sidebar.js'
import Header from '@/layouts/Header.js'
import { routeHasSidebar } from '@/layouts/headerConfig.js'
import { useCaptureStore } from '@/stores/captureStore.js'
import { useHeaderStore } from '@/stores/headerStore.js'
import { TaskQuickCaptureModal } from '@/pages/tasks/components/modals/TaskQuickCaptureModal.js'
import { apiClient } from '@/api/client.js'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog.js'
import { Button } from '@/components/ui/button.js'
import { Input } from '@/components/ui/input.js'

export default function AppLayout() {
  const { pathname } = useLocation()
  const showSidebar = routeHasSidebar(pathname)

  // Hydrate header store with user's saved tab preferences on mount
  useEffect(() => {
    useHeaderStore.getState().hydrate()
  }, [])

  const { open: captureOpen, type: captureType, close: captureClose } = useCaptureStore()
  const isTaskCapture = captureOpen && captureType === 'task'
  const isGenericCapture = captureOpen && captureType !== 'task'

  const [genericTitle, setGenericTitle] = useState('')

  function handleGenericSave() {
    if (!genericTitle.trim()) return
    apiClient.post('/inbox/capture', { type: captureType, title: genericTitle.trim() })
    setGenericTitle('')
    captureClose()
  }

  function handleGenericOpenChange(open: boolean) {
    if (!open) {
      setGenericTitle('')
      captureClose()
    }
  }

  return (
    <div className="h-screen flex flex-col bg-bg-app">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        {showSidebar && <Sidebar />}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Task quick capture modal */}
      <TaskQuickCaptureModal
        open={isTaskCapture}
        onOpenChange={(open) => { if (!open) captureClose() }}
      />

      {/* Generic capture modal (notes, contacts) */}
      <Dialog open={isGenericCapture} onOpenChange={handleGenericOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Quick Add {captureType === 'note' ? 'Note' : 'Contact'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder={`${captureType === 'note' ? 'Note' : 'Contact'} title...`}
              value={genericTitle}
              onChange={(e) => setGenericTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleGenericSave()
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleGenericSave} disabled={!genericTitle.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
