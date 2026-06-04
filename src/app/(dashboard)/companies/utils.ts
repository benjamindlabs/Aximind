/**
 * Get the first letter of a company name for the avatar
 */
export function getCompanyInitial(name: string): string {
  return name?.trim()?.[0]?.toUpperCase() || '?'
}

/**
 * Generate a deterministic HSL color from a string.
 * Same algorithm as contacts module for visual consistency.
 */
export function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 55%, 45%)`
}

/**
 * Format a date string as "MMM DD, YYYY"
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Get Tailwind classes for a company size badge
 */
export function getSizeClasses(size: string | null): string {
  if (!size) return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
  switch (size) {
    case '1-10':
      return 'bg-sky-500/15 text-sky-400 border-sky-500/20'
    case '11-50':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/20'
    case '51-200':
      return 'bg-violet-500/15 text-violet-400 border-violet-500/20'
    case '201-500':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/20'
    case '500+':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
    default:
      return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
  }
}

/**
 * Format annual revenue as a human-readable string
 */
export function formatRevenue(revenue: number | null): string {
  if (revenue === null || revenue === undefined) return '—'
  if (revenue >= 1_000_000_000) return `$${(revenue / 1_000_000_000).toFixed(1)}B`
  if (revenue >= 1_000_000) return `$${(revenue / 1_000_000).toFixed(1)}M`
  if (revenue >= 1_000) return `$${(revenue / 1_000).toFixed(1)}K`
  return `$${revenue.toLocaleString()}`
}

/**
 * Build a location string from city and country
 */
export function getLocation(city: string | null, country: string | null): string {
  return [city, country].filter(Boolean).join(', ') || ''
}

/**
 * Ensure a URL has a protocol for linking
 */
export function ensureProtocol(url: string): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `https://${url}`
}

/**
 * Format a website URL for display (strip protocol)
 */
export function formatWebsite(url: string | null): string {
  if (!url) return ''
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}
