import type { ContactStatus, ContactSource } from './types'

/**
 * Get initials from first and last name (max 2 chars)
 */
export function getInitials(firstName: string, lastName?: string | null): string {
  const first = firstName?.trim()?.[0] || ''
  const last = lastName?.trim()?.[0] || ''
  return (first + last).toUpperCase() || '?'
}

/**
 * Generate a deterministic HSL color from a name string.
 * Uses a simple hash to produce consistent, vibrant avatar colors.
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
 * Get Tailwind classes for a status badge
 */
export function getStatusClasses(status: ContactStatus): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
    case 'inactive':
      return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
    case 'blocked':
      return 'bg-red-500/15 text-red-400 border-red-500/20'
    default:
      return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
  }
}

/**
 * Get the dot color for a status indicator
 */
export function getStatusDotColor(status: ContactStatus): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-400'
    case 'inactive':
      return 'bg-zinc-400'
    case 'blocked':
      return 'bg-red-400'
    default:
      return 'bg-zinc-400'
  }
}

/**
 * Capitalize first letter of a status/source string
 */
export function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Get a human-readable label for a contact source
 */
export function getSourceLabel(source: ContactSource | string | null): string {
  if (!source) return '—'
  return capitalize(source)
}

/**
 * Get the full display name for a contact
 */
export function getFullName(firstName: string, lastName?: string | null): string {
  return [firstName, lastName].filter(Boolean).join(' ')
}
