import { useState, useRef, useCallback, useEffect } from 'react'

type StickyColor = 'yellow' | 'blue' | 'green' | 'pink' | 'purple'

const COLOR_CLASSES: Record<StickyColor, string> = {
  yellow: 'bg-yellow-500/10',
  blue: 'bg-blue-500/10',
  green: 'bg-green-500/10',
  pink: 'bg-pink-500/10',
  purple: 'bg-purple-500/10',
}

const DEBOUNCE_MS = 1000

export default function StickyNoteWidget({
  config,
  onConfigChange,
}: {
  config?: Record<string, unknown>
  onConfigChange?: (config: Record<string, unknown>) => void
}) {
  const content = (config?.content as string) ?? ''
  const color = ((config?.color as StickyColor) ?? 'yellow') as StickyColor
  const title = (config?.title as string) ?? ''

  const [localContent, setLocalContent] = useState(content)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync local state when config changes externally
  useEffect(() => {
    setLocalContent(content)
  }, [content])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value
      setLocalContent(newText)

      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      timerRef.current = setTimeout(() => {
        onConfigChange?.({ ...config, content: newText })
      }, DEBOUNCE_MS)
    },
    [config, onConfigChange],
  )

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const bgClass = COLOR_CLASSES[color] ?? COLOR_CLASSES.yellow

  return (
    <div className={`flex flex-col h-full -mx-4 -mt-1 px-4 pt-1 rounded-b-lg ${bgClass}`}>
      {title && (
        <h3 className="text-sm font-medium text-text-primary mb-1 shrink-0">
          {title}
        </h3>
      )}
      <textarea
        value={localContent}
        onChange={handleChange}
        placeholder="Type a note..."
        className="flex-1 w-full bg-transparent border-none outline-none resize-none text-sm text-text-primary placeholder:text-text-muted"
      />
    </div>
  )
}
