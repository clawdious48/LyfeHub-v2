// frontend-next/src/pages/calendar/components/CalendarItemBlock.tsx
import { motion } from 'framer-motion'
import { Cloud } from 'lucide-react'
import type { CalendarItem, OverlapLayout } from '../utils/calendarHelpers.js'
import { timeToY, itemHeight, formatTime } from '../utils/calendarHelpers.js'
import { SLOT_HEIGHT_PX } from '../utils/calendarConstants.js'

interface CalendarItemBlockProps {
  item: CalendarItem
  layout?: OverlapLayout
  onClick?: (item: CalendarItem) => void
}

export function CalendarItemBlock({ item, layout, onClick }: CalendarItemBlockProps) {
  const top = item.startTime ? timeToY(item.startTime) : 0
  const height = itemHeight(item)
  const color = item.color || item.calendarColor || '#00aaff'

  const column = layout?.column ?? 0
  const totalColumns = layout?.totalColumns ?? 1
  const widthPercent = 100 / totalColumns
  const leftPercent = column * widthPercent

  const isTask = item.type === 'task'
  const isCompleted = isTask && item.completed

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: isCompleted ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={() => onClick?.(item)}
      className={[
        'absolute rounded-md px-2 py-1 text-left overflow-hidden cursor-pointer',
        'transition-[filter,box-shadow] duration-150',
        'hover:brightness-110 hover:shadow-md',
        isTask ? 'border-2 border-dashed' : 'border border-solid border-white/10',
        isCompleted && 'line-through',
      ].filter(Boolean).join(' ')}
      style={{
        top,
        height: Math.max(height, SLOT_HEIGHT_PX),
        left: `${leftPercent}%`,
        width: `calc(${widthPercent}% - 4px)`,
        backgroundColor: isTask ? `${color}20` : `${color}30`,
        borderColor: isTask ? `${color}80` : undefined,
      }}
    >
      <div className="flex items-start gap-1 h-full">
        {isTask && (
          <div
            className="size-3 rounded-sm border-2 shrink-0 mt-0.5"
            style={{ borderColor: color, backgroundColor: isCompleted ? color : 'transparent' }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div
            className="text-xs font-medium leading-tight truncate"
            style={{ color }}
          >
            {item.title}
          </div>
          {height >= SLOT_HEIGHT_PX * 2 && item.startTime && (
            <div className="text-[10px] mt-0.5 opacity-70" style={{ color }}>
              {formatTime(item.startTime)}
              {item.endTime && ` – ${formatTime(item.endTime)}`}
            </div>
          )}
        </div>
        {item.externalSource === 'google' && (
          <Cloud className="size-2.5 shrink-0 opacity-40" style={{ color }} />
        )}
      </div>
    </motion.button>
  )
}
