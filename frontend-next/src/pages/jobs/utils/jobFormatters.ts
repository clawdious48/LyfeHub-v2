export function formatPhone(phone: string): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return phone
}

export function formatAddress(
  street: string,
  city: string,
  state: string,
  zip: string,
  unit?: string,
): string {
  const parts: string[] = []
  if (street) parts.push(street)
  if (unit) parts.push(`Unit ${unit}`)
  const cityStateZip = [city, state].filter(Boolean).join(', ')
  if (cityStateZip) parts.push(cityStateZip)
  if (zip) parts.push(zip)
  return parts.join(', ')
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function relativeTime(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`
  return date.toLocaleDateString()
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function mapsLink(street: string, city: string, state: string, zip: string): string {
  const q = encodeURIComponent([street, city, state, zip].filter(Boolean).join(', '))
  return `https://www.google.com/maps/search/?api=1&query=${q}`
}
