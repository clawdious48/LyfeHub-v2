import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge.js'
import { Input } from '@/components/ui/input.js'
import { useMailContacts } from '@/api/hooks/index.js'

interface Props {
  label: string
  value: string[]
  onChange: (value: string[]) => void
}

export function RecipientField({ label, value, onChange }: Props) {
  const [inputValue, setInputValue] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: contacts = [] } = useMailContacts(debouncedQuery)

  useEffect(() => {
    clearTimeout(timerRef.current)
    if (inputValue.length >= 2) {
      timerRef.current = setTimeout(() => setDebouncedQuery(inputValue), 300)
    } else {
      setDebouncedQuery('')
    }
    return () => clearTimeout(timerRef.current)
  }, [inputValue])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function addEmail(email: string) {
    const trimmed = email.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInputValue('')
    setShowSuggestions(false)
  }

  function removeEmail(email: string) {
    onChange(value.filter(v => v !== email))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault()
      addEmail(inputValue)
    }
    if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeEmail(value[value.length - 1])
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-text-muted shrink-0 w-8">{label}</span>
        <div className="flex-1 flex flex-wrap items-center gap-1 min-h-[32px] px-2 py-1 border border-border rounded-md bg-bg-surface">
          {value.map(email => (
            <Badge key={email} variant="secondary" className="gap-1 text-xs py-0.5">
              {email}
              <button onClick={() => removeEmail(email)} className="hover:text-accent">
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          <Input
            value={inputValue}
            onChange={e => {
              setInputValue(e.target.value)
              setShowSuggestions(true)
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            className="border-0 shadow-none p-0 h-6 text-sm flex-1 min-w-[120px] focus-visible:ring-0"
            placeholder={value.length === 0 ? 'Add recipients...' : ''}
          />
        </div>
      </div>

      {showSuggestions && contacts.length > 0 && (
        <div className="absolute left-8 right-0 top-full mt-1 bg-bg-surface border border-border rounded-md shadow-lg z-50 max-h-[200px] overflow-y-auto">
          {contacts.map(contact => (
            <button
              key={contact.email}
              onClick={() => addEmail(contact.email)}
              className="w-full text-left px-3 py-2 hover:bg-bg-hover transition-colors"
            >
              <div className="text-sm text-text-primary">{contact.name}</div>
              <div className="text-xs text-text-muted">{contact.email}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
