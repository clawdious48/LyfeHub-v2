import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  UserPlus,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { TaskQuickCaptureModal } from '@/pages/tasks/components/modals/TaskQuickCaptureModal.js'
import { useSidebarStore } from '@/stores/sidebarStore'
import { getSectionsForRoute } from '@/layouts/sidebarConfig'
import { apiClient } from '@/api/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type CaptureType = 'note' | 'task' | 'contact'

const captureButtons: { type: CaptureType; label: string; icon: typeof FileText; bgClass: string }[] = [
  { type: 'note', label: 'Note', icon: FileText, bgClass: 'bg-purple-500/10 text-purple-500' },
  { type: 'task', label: 'Task', icon: CheckSquare, bgClass: 'bg-blue-500/10 text-blue-500' },
  { type: 'contact', label: 'Contact', icon: UserPlus, bgClass: 'bg-green-500/10 text-green-500' },
]

export default function Sidebar() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const { collapsed, toggleCollapsed, toggleSection, isSectionCollapsed } = useSidebarStore()
  const sections = getSectionsForRoute(pathname)

  const [captureOpen, setCaptureOpen] = useState(false)
  const [captureType, setCaptureType] = useState<CaptureType>('note')
  const [captureTitle, setCaptureTitle] = useState('')
  const [captureSaving, setCaptureSaving] = useState(false)
  const [taskCaptureOpen, setTaskCaptureOpen] = useState(false)

  function openCapture(type: CaptureType) {
    if (type === 'task') {
      setTaskCaptureOpen(true)
      return
    }
    setCaptureType(type)
    setCaptureTitle('')
    setCaptureOpen(true)
  }

  async function handleCaptureSave() {
    if (!captureTitle.trim()) return
    setCaptureSaving(true)
    try {
      await apiClient.post('/inbox/capture', { type: captureType, title: captureTitle.trim() })
      console.log(`Captured ${captureType}: ${captureTitle.trim()}`)
      setCaptureOpen(false)
    } catch (err) {
      console.error('Capture failed:', err)
    } finally {
      setCaptureSaving(false)
    }
  }

  return (
    <>
      <aside
        className={[
          'shrink-0 bg-bg-surface border-r border-border h-full flex flex-col',
          'transition-[width] duration-300 ease-in-out overflow-hidden',
          collapsed ? 'w-12' : 'w-56',
        ].join(' ')}
      >
        {/* Top section: Dashboard */}
        <div className="px-2 pt-3 pb-2 space-y-0.5">
          <NavLink
            to="/"
            end
            title={collapsed ? 'Dashboard' : undefined}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent-light text-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
              ].join(' ')
            }
          >
            <LayoutDashboard className="size-4 shrink-0" />
            {!collapsed && <span>Dashboard</span>}
          </NavLink>
        </div>

        {/* Capture section */}
        <div className="px-2 py-2 border-t border-border">
          {!collapsed && (
            <button
              onClick={() => toggleSection('capture')}
              className="flex items-center gap-1 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-text-muted w-full"
            >
              <Plus className="size-3 shrink-0" />
              <span>Capture</span>
            </button>
          )}
          {(!isSectionCollapsed('capture') || collapsed) && (
            <div className={collapsed ? 'flex flex-col items-center gap-1 mt-1' : 'flex items-center gap-2 mt-1 px-2'}>
              {captureButtons.map(({ type, label, icon: Icon, bgClass }) => (
                <button
                  key={type}
                  onClick={() => openCapture(type)}
                  title={collapsed ? label : undefined}
                  className={[
                    'w-6 h-6 rounded-md flex items-center justify-center transition-opacity hover:opacity-80',
                    bgClass,
                  ].join(' ')}
                >
                  <Icon className="size-3.5" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Contextual sections */}
        <nav className="flex-1 py-2 px-2 space-y-3 overflow-y-auto">
          {sections.map((section) => {
            const hasComponent = !!section.component
            if (!hasComponent && section.items.length === 0) return null
            const sectionCollapsed = isSectionCollapsed(section.key)
            const SectionComponent = section.component
            return (
              <div key={section.key}>
                {!collapsed && (
                  <button
                    onClick={() => toggleSection(section.key)}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-text-muted w-full"
                  >
                    <span>{section.header}</span>
                  </button>
                )}
                {(!sectionCollapsed || collapsed) && (
                  <div className="mt-0.5">
                    {SectionComponent ? (
                      !collapsed && <SectionComponent />
                    ) : (
                      <div className="space-y-0.5">
                        {section.items.map(({ label, icon: Icon, to }) => (
                          <NavLink
                            key={to}
                            to={to}
                            title={collapsed ? label : undefined}
                            className={({ isActive }) =>
                              [
                                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                                isActive
                                  ? 'bg-accent-light text-accent'
                                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
                              ].join(' ')
                            }
                          >
                            <Icon className="size-4 shrink-0" />
                            {!collapsed && <span>{label}</span>}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Bottom bar */}
        <div className="mt-auto border-t border-border px-2 py-2 space-y-1">
          <NavLink
            to="/settings"
            title={collapsed ? 'Settings' : undefined}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent-light text-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
              ].join(' ')
            }
          >
            <Settings className="size-4 shrink-0" />
            {!collapsed && <span>Settings</span>}
          </NavLink>

          {!collapsed && user && (
            <div className="px-3 py-1 text-xs text-text-muted truncate">
              {user.name || user.email}
            </div>
          )}

          {/* Collapse toggle */}
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex items-center justify-center w-full py-2 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
          >
            {collapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronLeft className="size-4" />
            )}
          </button>
        </div>
      </aside>

      {/* Capture modal */}
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

      {/* Task quick capture modal */}
      <TaskQuickCaptureModal open={taskCaptureOpen} onOpenChange={setTaskCaptureOpen} />
    </>
  )
}
