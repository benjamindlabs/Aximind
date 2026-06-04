import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(dateString: string | null) {
  if (!dateString) return 'No date set'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date)
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'won': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    case 'lost': return 'bg-red-500/10 text-red-400 border-red-500/20'
    case 'on_hold': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    case 'open': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
  }
}

export function getProbabilityColor(prob: number) {
  if (prob >= 80) return 'text-emerald-400'
  if (prob >= 50) return 'text-blue-400'
  if (prob >= 20) return 'text-amber-400'
  return 'text-red-400'
}
