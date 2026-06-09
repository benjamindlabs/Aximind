'use client'

import * as React from 'react'
import { Plus, Search, Phone, Mail, Users, Trash2, Activity as ActivityIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ActivityFormModal } from './activity-form-modal'
import { DeleteConfirmation } from './delete-confirmation'
import { ToastProvider, useToast } from './toast'
import type { Activity, ActivityType } from './types'
import { 
  groupActivitiesByDate, formatTime, getActivityColor, getActivityIcon 
} from './utils'

type DateFilter = 'all' | 'today' | 'week' | 'month'

function ActivitiesContent() {
  const { showToast } = useToast()
  
  const [activities, setActivities] = React.useState<Activity[]>([])
  const [loading, setLoading] = React.useState(true)
  
  const [searchQuery, setSearchQuery] = React.useState('')
  const [typeFilter, setTypeFilter] = React.useState<ActivityType | 'all'>('all')
  const [dateFilter, setDateFilter] = React.useState<DateFilter>('all')
  
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
  const [activityToDelete, setActivityToDelete] = React.useState<Activity | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const fetchActivities = React.useCallback(async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      
      let workspaceId: string | null = null
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .limit(1)
        .single()

      if (membership?.workspace_id) {
        workspaceId = membership.workspace_id
      } else {
        showToast('error', 'No workspace found.')
        return
      }

      const { data: activityData, error } = await supabase
        .from('activities')
        .select(`
          *,
          contact:contacts(first_name, last_name),
          lead:leads(title),
          deal:deals(title)
        `)
        .eq('workspace_id', workspaceId)
        .order('occurred_at', { ascending: false })
      
      if (error) throw error
      if (activityData) setActivities(activityData as Activity[])

    } catch (error: any) {
      console.error('Error fetching activities:', error?.message || 'Unknown error')
      showToast('error', 'Failed to load activities.')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  React.useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  const handleDelete = async () => {
    if (!activityToDelete) return
    setIsDeleting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', activityToDelete.id)

      if (error) throw error

      showToast('success', 'Activity deleted successfully.')
      fetchActivities()
    } catch (error: any) {
      console.error('Error deleting activity:', error?.message || 'Unknown error')
      showToast('error', 'Failed to delete activity.')
    } finally {
      setIsDeleting(false)
      setIsDeleteOpen(false)
      setActivityToDelete(null)
    }
  }

  // Filter activities
  const filteredActivities = React.useMemo(() => {
    const now = new Date()
    return activities.filter(a => {
      const date = new Date(a.occurred_at)
      
      // Date filter
      if (dateFilter === 'today') {
        if (date.toDateString() !== now.toDateString()) return false
      } else if (dateFilter === 'week') {
        const weekAgo = new Date()
        weekAgo.setDate(now.getDate() - 7)
        if (date < weekAgo) return false
      } else if (dateFilter === 'month') {
        const monthAgo = new Date()
        monthAgo.setMonth(now.getMonth() - 1)
        if (date < monthAgo) return false
      }
      
      // Type filter
      if (typeFilter !== 'all' && a.type !== typeFilter) return false
      
      // Search
      if (searchQuery) {
        const lowerQ = searchQuery.toLowerCase()
        return a.title.toLowerCase().includes(lowerQ) || 
               a.description?.toLowerCase().includes(lowerQ)
      }
      return true
    })
  }, [activities, typeFilter, dateFilter, searchQuery])

  // Group by date
  const groupedActivities = React.useMemo(() => groupActivitiesByDate(filteredActivities), [filteredActivities])

  // Stats calculations (on the filtered set or overall? Usually overall or currently filtered. Let's do filtered so it responds to date ranges)
  const totalActivities = filteredActivities.length
  const callsCount = filteredActivities.filter(a => a.type === 'call').length
  const meetingsCount = filteredActivities.filter(a => a.type === 'meeting').length
  const emailsCount = filteredActivities.filter(a => a.type === 'email').length

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] overflow-hidden">
      {/* Header & Stats */}
      <div className="shrink-0 mb-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              Activities
              <span className="text-xs font-medium bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                {totalActivities}
              </span>
            </h1>
            <p className="text-sm text-zinc-400 mt-1">An immutable log of all interactions and system events.</p>
          </div>
          <Button 
            onClick={() => setIsFormOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            Log Activity
          </Button>
        </div>

        {/* Stats Ribbon */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-zinc-800/50 flex items-center justify-center shrink-0">
              <ActivityIcon className="w-6 h-6 text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-400">Total Activities</p>
              <h3 className="text-2xl font-bold text-white">{totalActivities}</h3>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Phone className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-400">Calls</p>
              <h3 className="text-2xl font-bold text-white">{callsCount}</h3>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-400">Meetings</p>
              <h3 className="text-2xl font-bold text-white">{meetingsCount}</h3>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-400">Emails</p>
              <h3 className="text-2xl font-bold text-white">{emailsCount}</h3>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input 
              placeholder="Search activities..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-zinc-900/50 border-zinc-800 h-9 text-sm"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="h-9 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-sm text-zinc-300 focus-visible:outline-hidden"
            >
              <option value="all">All Types</option>
              <option value="call">Calls</option>
              <option value="email">Emails</option>
              <option value="meeting">Meetings</option>
              <option value="note">Notes</option>
              <option value="task">Tasks</option>
              <option value="system">System</option>
            </select>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="h-9 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-sm text-zinc-300 focus-visible:outline-hidden"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area - Timeline */}
      <div className="flex-1 overflow-auto bg-zinc-950 rounded-2xl relative custom-scrollbar">
        {loading ? (
          <div className="p-8 space-y-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4">
                <div className="w-16 h-4 bg-zinc-800/50 rounded animate-pulse" />
                <div className="flex-1 space-y-3">
                  <div className="h-20 bg-zinc-800/30 rounded-xl animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
            <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
              <ActivityIcon className="w-8 h-8 text-zinc-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No activities found</h3>
            <p className="text-zinc-400 max-w-md text-center">
              {searchQuery || typeFilter !== 'all' || dateFilter !== 'all' 
                ? "No activities match your current filters. Try adjusting them." 
                : "No activities logged yet. Log your first activity to get started."}
            </p>
          </div>
        ) : (
          <div className="p-6 max-w-4xl mx-auto">
            {Object.entries(groupedActivities).map(([dateLabel, dayActivities]) => (
              <div key={dateLabel} className="mb-8">
                <div className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur-sm py-2 mb-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    {dateLabel}
                  </h3>
                </div>
                
                <div className="relative border-l-2 border-zinc-800/60 ml-4 space-y-6 pb-4">
                  {dayActivities.map(activity => {
                    const Icon = getActivityIcon(activity.type)
                    const colorClasses = getActivityColor(activity.type)
                    
                    return (
                      <div key={activity.id} className="relative group pl-8">
                        {/* Timeline Dot */}
                        <div className={`absolute -left-[11px] top-4 w-5 h-5 rounded-full border-2 border-zinc-950 flex items-center justify-center ${colorClasses}`}>
                           {/* A small dot inside or just the background, we can leave it colored */}
                           <div className="w-1.5 h-1.5 rounded-full bg-current" />
                        </div>

                        {/* Activity Card */}
                        <div className="bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 rounded-xl p-4 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`p-1.5 rounded-lg border ${colorClasses}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <span className="text-sm font-medium text-zinc-400 capitalize">
                                {activity.type.replace('_', ' ')}
                              </span>
                              <span className="text-xs text-zinc-500">
                                {formatTime(activity.occurred_at)}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {/* Delete Action (only visible on hover) */}
                              <button
                                onClick={() => {
                                  setActivityToDelete(activity)
                                  setIsDeleteOpen(true)
                                }}
                                className="p-1.5 text-zinc-500 hover:text-red-400 rounded-md hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                title="Delete Activity"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="mb-2">
                            <a href={`/activities/${activity.id}`} className="text-base font-semibold text-zinc-100 hover:text-indigo-400 transition-colors">
                              {activity.title}
                            </a>
                          </div>

                          {activity.description && (
                            <p className="text-sm text-zinc-400 mb-3 line-clamp-2">
                              {activity.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                            {activity.outcome && (
                              <span className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded-md border border-zinc-700">
                                Outcome: {activity.outcome}
                              </span>
                            )}
                            
                            {activity.duration_minutes && (
                              <span className="text-zinc-500 font-medium">
                                {activity.duration_minutes} mins
                              </span>
                            )}
                            
                            {(activity.contact || activity.lead || activity.deal) && (
                              <>
                                <span className="text-zinc-600 px-1">•</span>
                                <span className="text-indigo-400/80 font-medium truncate max-w-[200px]">
                                  Linked to:{' '}
                                  {activity.contact ? `${activity.contact.first_name} ${activity.contact.last_name || ''}`.trim() :
                                   activity.lead ? activity.lead.title :
                                   activity.deal ? activity.deal.title : ''}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {isFormOpen && (
        <ActivityFormModal
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setIsFormOpen(false)
            fetchActivities()
            showToast('success', 'Activity logged successfully.')
          }}
        />
      )}

      <DeleteConfirmation
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  )
}

export default function ActivitiesPage() {
  return (
    <ToastProvider>
      <ActivitiesContent />
    </ToastProvider>
  )
}
