import { useEffect, useRef, useCallback } from 'react'
import { Play, Pause, SkipForward, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button.js'
import { usePomodoroStore } from '@/stores/pomodoroStore.js'
import { useCreateWorkSession } from '@/api/hooks/useWorkSessions.js'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function playNotificationTone() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    osc.frequency.value = 800
    osc.type = 'sine'
    const gain = ctx.createGain()
    gain.gain.value = 0.3
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    setTimeout(() => osc.stop(), 200)
  } catch {
    // Audio not available
  }
}

const STROKE_COLORS: Record<string, string> = {
  focus: '#FF8C00',
  break: '#06b6d4',
  long_break: '#a855f7',
}

const STATUS_LABELS: Record<string, string> = {
  idle: 'Ready',
  focus: 'Focus',
  break: 'Break',
  long_break: 'Long Break',
}

export default function PomodoroWidget({ config }: { config?: Record<string, unknown> }) {
  const focusDuration = (config?.focusDuration as number) ?? 25
  const breakDuration = (config?.breakDuration as number) ?? 5
  const longBreakDuration = (config?.longBreakDuration as number) ?? 15
  const sessionsBeforeLongBreak = (config?.sessionsBeforeLongBreak as number) ?? 4

  const store = usePomodoroStore()
  const createWorkSession = useCreateWorkSession()
  const prevStatusRef = useRef(store.status)
  const startedAtRef = useRef(store.startedAt)

  // Sync config into store on mount / config change
  useEffect(() => {
    store.setConfig({ focusDuration, breakDuration, longBreakDuration, sessionsBeforeLongBreak })
  }, [focusDuration, breakDuration, longBreakDuration, sessionsBeforeLongBreak])

  // Track startedAt changes
  useEffect(() => {
    startedAtRef.current = store.startedAt
  }, [store.startedAt])

  // Handle session completion callback
  const handleSessionComplete = useCallback(
    (wasStatus: string) => {
      playNotificationTone()
      if (wasStatus === 'focus' && startedAtRef.current) {
        createWorkSession.mutate({
          name: 'Pomodoro Focus',
          start: startedAtRef.current,
          end: new Date().toISOString(),
          ...(store.linkedTaskId ? { task_id: store.linkedTaskId } : {}),
        })
      }
    },
    [createWorkSession, store.linkedTaskId],
  )

  // Timer interval
  useEffect(() => {
    if (store.status === 'idle' || store.isPaused) return

    const interval = setInterval(() => {
      const prev = usePomodoroStore.getState().status
      const result = usePomodoroStore.getState().tick()
      if (result === -1) {
        handleSessionComplete(prev)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [store.status, store.isPaused, handleSessionComplete])

  // Track previous status for ref
  useEffect(() => {
    prevStatusRef.current = store.status
  }, [store.status])

  // SVG ring calculations
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const totalDuration = store.status === 'idle'
    ? focusDuration * 60
    : store.status === 'focus'
      ? store.focusDuration * 60
      : store.status === 'break'
        ? store.breakDuration * 60
        : store.longBreakDuration * 60
  const progress = totalDuration > 0 ? store.timeRemaining / totalDuration : 1
  const strokeOffset = circumference * (1 - progress)
  const strokeColor = store.status === 'idle' ? STROKE_COLORS.focus : STROKE_COLORS[store.status]

  return (
    <div className="flex flex-col items-center justify-center h-full gap-2">
      {/* Circular progress ring */}
      <div className="relative">
        <svg width="120" height="120" viewBox="0 0 100 100" className="-rotate-90">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            className="text-border"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        {/* Time display centered in ring */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-semibold text-text-primary tabular-nums">
            {store.status === 'idle'
              ? formatTime(focusDuration * 60)
              : formatTime(store.timeRemaining)}
          </span>
        </div>
      </div>

      {/* Status label */}
      <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
        {STATUS_LABELS[store.status]}
      </span>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {store.status === 'idle' ? (
          <Button variant="ghost" size="icon" onClick={store.start} title="Start focus session">
            <Play className="size-4" />
          </Button>
        ) : (
          <>
            {store.isPaused ? (
              <>
                <Button variant="ghost" size="icon" onClick={store.resume} title="Resume">
                  <Play className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={store.reset} title="Reset">
                  <RotateCcw className="size-4" />
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="icon" onClick={store.pause} title="Pause">
                <Pause className="size-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={store.skip} title="Skip to next phase">
              <SkipForward className="size-4" />
            </Button>
          </>
        )}
      </div>

      {/* Session counter */}
      <span className="text-xs text-text-muted">
        {store.sessionsCompleted} / {store.sessionsBeforeLongBreak}
      </span>
    </div>
  )
}
