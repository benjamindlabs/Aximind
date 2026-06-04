import type { LeadStatus, LeadPriority, LeadSource } from './types'

/**
 * Format date string to "MMM DD, YYYY"
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
 * Format number to currency ($1,234.56 or $1,234)
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Get status classes for styling badge
 */
export function getStatusClasses(status: LeadStatus): string {
  switch (status) {
    case 'new':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/20'
    case 'contacted':
      return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20'
    case 'qualified':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
    case 'unqualified':
      return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
    case 'converted':
      return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20'
    case 'lost':
      return 'bg-red-500/15 text-red-400 border-red-500/20'
    default:
      return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
  }
}

/**
 * Get status dot color
 */
export function getStatusDotColor(status: LeadStatus): string {
  switch (status) {
    case 'new':
      return 'bg-blue-400'
    case 'contacted':
      return 'bg-yellow-400'
    case 'qualified':
      return 'bg-emerald-400'
    case 'unqualified':
      return 'bg-zinc-400'
    case 'converted':
      return 'bg-indigo-400'
    case 'lost':
      return 'bg-red-400'
    default:
      return 'bg-zinc-400'
  }
}

/**
 * Get priority classes for styling badge
 */
export function getPriorityClasses(priority: LeadPriority): string {
  switch (priority) {
    case 'low':
      return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
    case 'medium':
      return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20'
    case 'high':
      return 'bg-red-500/15 text-red-400 border-red-500/20'
    default:
      return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
  }
}

/**
 * Capitalize first letter of string
 */
export function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Get human-readable source label
 */
export function getSourceLabel(source: LeadSource | string | null): string {
  if (!source) return '—'
  return capitalize(source)
}
