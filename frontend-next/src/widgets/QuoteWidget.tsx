import { useMemo, useState } from 'react'
import { useBases, useBase } from '@/api/hooks/index.js'

export default function QuoteWidget({ config }: { config?: Record<string, unknown> }) {
  const authorProperty = (config?.authorProperty as string) || 'Author'
  const configuredBaseId = config?.baseId as string | undefined

  const { data: bases, isLoading: basesLoading } = useBases()

  const targetBase = useMemo(() => {
    if (!bases) return undefined
    if (configuredBaseId) {
      return bases.find((b) => b.id === configuredBaseId)
    }
    return bases.find((b) => b.name.toLowerCase() === 'notes')
  }, [bases, configuredBaseId])

  const baseId = targetBase?.id ?? ''
  const { data: baseDetail, isLoading: recordsLoading } = useBase(baseId)
  const records = baseDetail?.records

  const quotes = useMemo(() => {
    if (!records) return []
    return records.filter((r) => {
      const typeValue = (r.values?.Type as string) ?? (r.values?.type as string) ?? ''
      return typeValue.includes('Quote')
    })
  }, [records])

  const [randomIndex] = useState(() => Math.random())

  const selectedQuote = useMemo(() => {
    if (quotes.length === 0) return null
    const index = Math.floor(randomIndex * quotes.length)
    return quotes[index]
  }, [quotes, randomIndex])

  if (basesLoading || (baseId && recordsLoading)) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-text-muted text-sm">Loading...</p>
      </div>
    )
  }

  if (!selectedQuote) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <p className="text-text-secondary text-sm">Add quotes to your Notes base with Type = Quote</p>
      </div>
    )
  }

  const quoteText =
    (selectedQuote.values?.Name as string) ??
    (selectedQuote.values?.name as string) ??
    'Untitled'

  const author = selectedQuote.values?.[authorProperty] as string | undefined

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
      <p className="text-lg italic text-text-primary text-center">"{quoteText}"</p>
      {author && (
        <p className="text-sm text-text-muted text-center">— {author}</p>
      )}
    </div>
  )
}
