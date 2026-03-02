import { useMemo, useState, useCallback } from 'react'
import { Target, ExternalLink, Loader2, Plus, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useBases, useBase, baseKeys } from '@/api/hooks/useBases.js'
import { apiClient } from '@/api/client.js'
import { Checkbox } from '@/components/ui/checkbox.js'
import { Button } from '@/components/ui/button.js'
import type { Base, BaseProperty } from '@/types/index.js'

interface HabitTrackerWidgetProps {
  config?: Record<string, unknown>
  onConfigChange?: (config: Record<string, unknown>) => void
}

/** Color dot classes keyed by the select option value */
const COLOR_DOTS: Record<string, string> = {
  purple: 'bg-purple-500',
  blue: 'bg-blue-500',
  cyan: 'bg-cyan-500',
  pink: 'bg-pink-500',
  orange: 'bg-orange-500',
  green: 'bg-green-500',
}

function todayString(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Compute a streak count: consecutive days (backward from today) that have
 * at least one log record for the given habit.
 */
function computeStreak(
  habitId: string,
  habitRelationPropId: string,
  datePropId: string,
  logRecords: Array<{ values: Record<string, unknown> }>,
): number {
  // Build a set of date strings that have a log for this habit
  const dateSet = new Set<string>()
  for (const rec of logRecords) {
    const relation = rec.values[habitRelationPropId]
    const dateVal = rec.values[datePropId]
    if (!relation || !dateVal) continue
    const ids = Array.isArray(relation) ? relation : [relation]
    if (ids.includes(habitId) && typeof dateVal === 'string') {
      // Normalize: take only the date portion
      dateSet.add(dateVal.slice(0, 10))
    }
  }
  if (dateSet.size === 0) return 0

  let streak = 0
  const cursor = new Date()
  // Start from today
  for (let i = 0; i < 365; i++) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
    if (dateSet.has(key)) {
      streak++
    } else {
      break
    }
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/** Find a property by name (case-insensitive) */
function findProp(properties: BaseProperty[] | undefined, name: string): BaseProperty | undefined {
  return properties?.find((p) => p.name.toLowerCase() === name.toLowerCase())
}

export default function HabitTrackerWidget({ config, onConfigChange }: HabitTrackerWidgetProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [settingUp, setSettingUp] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  // --- Resolve base IDs ---
  const { data: allBases, isLoading: basesLoading } = useBases()

  const habitsBaseId = useMemo(() => {
    if (config?.habitsBaseId) return config.habitsBaseId as string
    return allBases?.find((b) => b.name === 'Habits')?.id ?? ''
  }, [config?.habitsBaseId, allBases])

  const habitLogBaseId = useMemo(() => {
    if (config?.habitLogBaseId) return config.habitLogBaseId as string
    return allBases?.find((b) => b.name === 'Habit Log')?.id ?? ''
  }, [config?.habitLogBaseId, allBases])

  // --- Fetch base details ---
  const { data: habitsBase, isLoading: habitsLoading } = useBase(habitsBaseId)
  const { data: habitLogBase, isLoading: logLoading } = useBase(habitLogBaseId)

  // --- Derived data ---
  const activePropId = findProp(habitsBase?.properties, 'Active')?.id
  const colorPropId = findProp(habitsBase?.properties, 'Color')?.id
  const namePropId = findProp(habitsBase?.properties, 'Name')?.id

  const habitRelationPropId = findProp(habitLogBase?.properties, 'Habit')?.id ?? ''
  const datePropId = findProp(habitLogBase?.properties, 'Date')?.id ?? ''

  const activeHabits = useMemo(() => {
    if (!habitsBase?.records || !activePropId) return []
    return habitsBase.records.filter((r) => r.values[activePropId] === true)
  }, [habitsBase?.records, activePropId])

  const today = todayString()

  const todayLogs = useMemo(() => {
    if (!habitLogBase?.records || !datePropId) return []
    return habitLogBase.records.filter((r) => {
      const dateVal = r.values[datePropId]
      return typeof dateVal === 'string' && dateVal.slice(0, 10) === today
    })
  }, [habitLogBase?.records, datePropId, today])

  // --- Setup flow ---
  const handleSetup = useCallback(async () => {
    setSettingUp(true)
    setSetupError(null)
    try {
      // 1. Create "Habits" base
      const habitsResult = await apiClient.post<Base>('/bases', {
        name: 'Habits',
        icon: 'target',
        description: 'Track your daily habits',
      })

      // 2. Create properties on Habits base
      await apiClient.post<BaseProperty>(`/bases/${habitsResult.id}/properties`, {
        name: 'Color',
        type: 'select',
        options: [
          { label: 'Purple', value: 'purple', color: '#a855f7' },
          { label: 'Blue', value: 'blue', color: '#3b82f6' },
          { label: 'Cyan', value: 'cyan', color: '#06b6d4' },
          { label: 'Pink', value: 'pink', color: '#ec4899' },
          { label: 'Orange', value: 'orange', color: '#f97316' },
          { label: 'Green', value: 'green', color: '#22c55e' },
        ],
      })
      await apiClient.post<BaseProperty>(`/bases/${habitsResult.id}/properties`, {
        name: 'Frequency',
        type: 'select',
        options: [
          { label: 'Daily', value: 'daily', color: '#6b7280' },
          { label: 'Weekdays', value: 'weekdays', color: '#6b7280' },
          { label: 'Weekends', value: 'weekends', color: '#6b7280' },
          { label: 'Weekly', value: 'weekly', color: '#6b7280' },
        ],
      })
      await apiClient.post<BaseProperty>(`/bases/${habitsResult.id}/properties`, {
        name: 'Active',
        type: 'checkbox',
      })

      // 3. Create "Habit Log" base
      const logResult = await apiClient.post<Base>('/bases', {
        name: 'Habit Log',
        icon: 'check-square',
        description: 'Daily habit completion log',
      })

      // 4. Create properties on Habit Log base
      await apiClient.post<BaseProperty>(`/bases/${logResult.id}/properties`, {
        name: 'Habit',
        type: 'relation',
        options: { relatedBaseId: habitsResult.id },
      })
      await apiClient.post<BaseProperty>(`/bases/${logResult.id}/properties`, {
        name: 'Date',
        type: 'date',
      })
      await apiClient.post<BaseProperty>(`/bases/${logResult.id}/properties`, {
        name: 'Notes',
        type: 'text',
      })

      // 5. Save config
      onConfigChange?.({
        ...config,
        habitsBaseId: habitsResult.id,
        habitLogBaseId: logResult.id,
      })

      // 6. Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: baseKeys.lists() })
      queryClient.invalidateQueries({ queryKey: baseKeys.detail(habitsResult.id) })
      queryClient.invalidateQueries({ queryKey: baseKeys.detail(logResult.id) })
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : 'Setup failed')
    } finally {
      setSettingUp(false)
    }
  }, [config, onConfigChange, queryClient])

  // --- Toggle habit ---
  const toggleHabit = useCallback(
    async (habitRecordId: string, isCompleted: boolean) => {
      if (!habitLogBaseId || !habitRelationPropId || !datePropId) return
      setTogglingIds((prev) => new Set(prev).add(habitRecordId))
      try {
        if (isCompleted) {
          // Find and delete today's log record for this habit
          const logRecord = todayLogs.find((r) => {
            const relation = r.values[habitRelationPropId]
            const ids = Array.isArray(relation) ? relation : [relation]
            return ids.includes(habitRecordId)
          })
          if (logRecord) {
            await apiClient.delete(`/bases/${habitLogBaseId}/records/${logRecord.id}`)
          }
        } else {
          // Create a new log record
          await apiClient.post(`/bases/${habitLogBaseId}/records`, {
            values: {
              [habitRelationPropId]: [habitRecordId],
              [datePropId]: today,
            },
          })
        }
        // Refetch habit log
        queryClient.invalidateQueries({ queryKey: baseKeys.detail(habitLogBaseId) })
      } finally {
        setTogglingIds((prev) => {
          const next = new Set(prev)
          next.delete(habitRecordId)
          return next
        })
      }
    },
    [habitLogBaseId, habitRelationPropId, datePropId, todayLogs, today, queryClient],
  )

  // --- Loading state ---
  const isLoading = basesLoading || (habitsBaseId && habitsLoading) || (habitLogBaseId && logLoading)
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 text-text-muted animate-spin" />
      </div>
    )
  }

  // --- Setup state ---
  if (!habitsBaseId || !habitLogBaseId) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <Target className="size-8 text-text-muted" />
        <p className="text-text-secondary text-sm">Track daily habits with streaks</p>
        {setupError && (
          <p className="text-red-400 text-xs">{setupError}</p>
        )}
        <Button
          size="sm"
          onClick={handleSetup}
          disabled={settingUp}
        >
          {settingUp ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Setting up...
            </>
          ) : setupError ? (
            <>
              <RotateCcw className="size-3.5" />
              Retry Setup
            </>
          ) : (
            <>
              <Plus className="size-3.5" />
              Set up Habit Tracker
            </>
          )}
        </Button>
      </div>
    )
  }

  // --- No active habits ---
  if (activeHabits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <p className="text-text-secondary text-sm">No active habits</p>
        <p className="text-text-muted text-xs">Add some in your Habits base</p>
        <Button
          variant="ghost"
          size="xs"
          className="mt-1 text-text-secondary"
          onClick={() => navigate(`/bases/${habitsBaseId}`)}
        >
          <ExternalLink className="size-3" />
          Open Habits
        </Button>
      </div>
    )
  }

  // --- Main habit list ---
  return (
    <div className="flex flex-col gap-1">
      {activeHabits.map((habit) => {
        const name = namePropId
          ? (habit.values[namePropId] as string) ?? 'Untitled'
          : (habit.values?.Name as string) ?? (habit.values?.name as string) ?? 'Untitled'
        const color = colorPropId
          ? (habit.values[colorPropId] as string) ?? ''
          : ''
        const dotClass = COLOR_DOTS[color] ?? 'bg-text-muted'

        const isCompleted = todayLogs.some((r) => {
          const relation = r.values[habitRelationPropId]
          const ids = Array.isArray(relation) ? relation : [relation]
          return ids.includes(habit.id)
        })

        const streak = computeStreak(
          habit.id,
          habitRelationPropId,
          datePropId,
          habitLogBase?.records ?? [],
        )

        const isToggling = togglingIds.has(habit.id)

        return (
          <div
            key={habit.id}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-bg-hover transition-colors group"
          >
            <span className={`size-2 rounded-full shrink-0 ${dotClass}`} />
            <span
              className={`text-sm flex-1 truncate ${
                isCompleted ? 'text-text-muted line-through' : 'text-text-primary'
              }`}
            >
              {name}
            </span>
            {streak > 0 && (
              <span className="text-xs text-text-muted tabular-nums">
                {streak}d
              </span>
            )}
            {isToggling ? (
              <Loader2 className="size-4 text-text-muted animate-spin shrink-0" />
            ) : (
              <Checkbox
                checked={isCompleted}
                onCheckedChange={() => toggleHabit(habit.id, isCompleted)}
                className="shrink-0"
              />
            )}
          </div>
        )
      })}
      <div className="pt-2 border-t border-border mt-1">
        <Button
          variant="ghost"
          size="xs"
          className="text-text-secondary w-full justify-start"
          onClick={() => navigate(`/bases/${habitsBaseId}`)}
        >
          <ExternalLink className="size-3" />
          Manage Habits
        </Button>
      </div>
    </div>
  )
}
