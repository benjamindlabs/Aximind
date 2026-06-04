import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string | null, includeTime: boolean = false) {
  if (!dateString) return 'No due date'
  const date = new Date(dateString)
  
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  }
  
  if (includeTime) {
    options.hour = 'numeric'
    options.minute = '2-digit'
  }
  
  return new Intl.DateTimeFormat('en-US', options).format(date)
}

export function isOverdue(dateString: string | null, status: string) {
  if (!dateString || status === 'completed' || status === 'cancelled') return false
  const date = new Date(dateString)
  const now = new Date()
  return date < now
}

export function isToday(dateString: string | null) {
  if (!dateString) return false
  const date = new Date(dateString)
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

export function isUpcoming(dateString: string | null, days: number = 7) {
  if (!dateString) return false
  const date = new Date(dateString)
  const now = new Date()
  // Set to start of day for comparison
  now.setHours(0, 0, 0, 0)
  
  const future = new Date(now)
  future.setDate(future.getDate() + days)
  
  return date >= now && date <= future
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    case 'cancelled': return 'bg-red-500/10 text-red-400 border-red-500/20'
    case 'in_progress': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    case 'pending': 
    default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
  }
}

export function getPriorityColor(priority: string) {
  switch (priority) {
    case 'urgent': return 'bg-red-500/10 text-red-400 border-red-500/20'
    case 'high': return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    case 'medium': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    case 'low': 
    default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
  }
}
