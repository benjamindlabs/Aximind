import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { 
  Phone, Mail, Users, FileText, CheckSquare, DollarSign, ArrowRight, Target, Settings 
} from 'lucide-react'
import type { ActivityType, Activity } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateTime(dateString: string | null) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date)
}

export function formatTime(dateString: string | null) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(date)
}

export function getActivityColor(type: ActivityType) {
  switch (type) {
    case 'call': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
    case 'email': return 'bg-blue-500/20 text-blue-500 border-blue-500/30'
    case 'meeting': return 'bg-purple-500/20 text-purple-500 border-purple-500/30'
    case 'note': return 'bg-amber-500/20 text-amber-500 border-amber-500/30'
    case 'task': return 'bg-indigo-500/20 text-indigo-500 border-indigo-500/30'
    case 'deal_change': return 'bg-orange-500/20 text-orange-500 border-orange-500/30'
    case 'stage_change': return 'bg-pink-500/20 text-pink-500 border-pink-500/30'
    case 'lead_change': return 'bg-cyan-500/20 text-cyan-500 border-cyan-500/30'
    case 'system': 
    default: return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
  }
}

export function getActivityIcon(type: ActivityType) {
  switch (type) {
    case 'call': return Phone
    case 'email': return Mail
    case 'meeting': return Users
    case 'note': return FileText
    case 'task': return CheckSquare
    case 'deal_change': return DollarSign
    case 'stage_change': return ArrowRight
    case 'lead_change': return Target
    case 'system': 
    default: return Settings
  }
}

export function groupActivitiesByDate(activities: Activity[]) {
  const groups: { [key: string]: Activity[] } = {}
  
  activities.forEach(activity => {
    const date = new Date(activity.occurred_at)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let groupKey = ''
    
    if (date.toDateString() === today.toDateString()) {
      groupKey = 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = 'Yesterday'
    } else {
      groupKey = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      }).format(date)
    }

    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(activity)
  })

  // Ensure they are sorted by date descending within each group
  Object.keys(groups).forEach(key => {
    groups[key].sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
  })

  return groups
}
