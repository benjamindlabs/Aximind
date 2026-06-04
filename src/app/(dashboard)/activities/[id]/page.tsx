'use client'

import * as React from 'react'
import { ArrowLeft, Clock, Calendar, CheckCircle2, User, Building, Target, Link2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ToastProvider, useToast } from '../toast'
import type { Activity } from '../types'
import { formatDateTime, getActivityColor, getActivityIcon } from '../utils'

function ActivityDetailContent({ activityId }: { activityId: string }) {
  const { showToast } = useToast()
  
  const [activity, setActivity] = React.useState<Activity | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function fetchActivityData() {
      try {
        setLoading(true)
        const supabase = createClient()
        
        const { data, error } = await supabase
          .from('activities')
          .select(`
            *,
            contact:contacts(id, first_name, last_name, email, phone),
            lead:leads(id, first_name, last_name, company_name, title),
            deal:deals(id, title, value)
          `)
          .eq('id', activityId)
          .single()

        if (error) throw error
        setActivity(data as Activity)
      } catch (error) {
        console.error('Error fetching activity:', error?.message || 'Unknown error')
        showToast('error', 'Failed to load activity details.')
      } finally {
        setLoading(false)
      }
    }

    fetchActivityData()
  }, [activityId, showToast])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-zinc-500 font-medium animate-pulse">Loading activity...</p>
        </div>
      </div>
    )
  }

  if (!activity) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-zinc-400">Activity not found.</p>
          <a href="/activities" className="text-indigo-400 hover:text-indigo-300">Return to Activities</a>
        </div>
      </div>
    )
  }

  const Icon = getActivityIcon(activity.type)
  const colorClasses = getActivityColor(activity.type)

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] overflow-y-auto pb-10">
      {/* Header */}
      <div className="mb-8 space-y-4">
        <a href="/activities" className="inline-flex items-center text-sm text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Timeline
        </a>
        
        <div className="flex items-start gap-5">
          <div className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center shrink-0 ${colorClasses}`}>
            <Icon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-3">
              {activity.title}
            </h1>
            <div className="flex items-center gap-3 text-sm">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold capitalize ${colorClasses}`}>
                {activity.type.replace('_', ' ')}
              </span>
              <span className="flex items-center gap-1.5 font-medium text-zinc-400">
                <Calendar className="w-4 h-4" />
                {formatDateTime(activity.occurred_at)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Activity Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Activity Details</h3>
            
            <div className="space-y-6">
              <div>
                <div className="text-sm font-medium text-zinc-500 mb-2">Description / Notes</div>
                {activity.description ? (
                  <div className="text-zinc-300 bg-zinc-900/80 p-4 rounded-xl border border-zinc-800/50 whitespace-pre-wrap leading-relaxed">
                    {activity.description}
                  </div>
                ) : (
                  <div className="text-zinc-500 italic">No details logged for this activity.</div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {activity.outcome && (
                  <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 flex items-start gap-3 col-span-2">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <div className="text-xs text-emerald-500/70 font-medium mb-1">Outcome / Result</div>
                      <div className="text-sm text-zinc-200">{activity.outcome}</div>
                    </div>
                  </div>
                )}
                
                {activity.duration_minutes && (
                  <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500 font-medium mb-0.5">Duration</div>
                      <div className="text-sm text-zinc-200">{activity.duration_minutes} minutes</div>
                    </div>
                  </div>
                )}
                
                <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 font-medium mb-0.5">Logged On</div>
                    <div className="text-sm text-zinc-200">{formatDateTime(activity.created_at)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Linked Record */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Link2 className="w-4 h-4" /> Linked To
            </h3>
            
            {activity.contact ? (
              <a href={`/contacts/${activity.contact.id}`} className="group block bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 rounded-xl p-4 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-blue-400 mb-0.5 font-medium">Contact</div>
                    <h4 className="font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                      {/*@ts-ignore*/}
                      {activity.contact.first_name} {activity.contact.last_name}
                    </h4>
                  </div>
                </div>
              </a>
            ) : activity.lead ? (
              <a href={`/leads/${activity.lead.id}`} className="group block bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 rounded-xl p-4 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-amber-400 mb-0.5 font-medium">Lead</div>
                    <h4 className="font-semibold text-white truncate group-hover:text-amber-400 transition-colors">
                      {/*@ts-ignore*/}
                      {activity.lead.title || `${activity.lead.first_name} ${activity.lead.last_name}`}
                    </h4>
                  </div>
                </div>
              </a>
            ) : activity.deal ? (
              <a href={`/deals/${activity.deal.id}`} className="group block bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 rounded-xl p-4 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                    <Building className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-indigo-400 mb-0.5 font-medium">Deal</div>
                    <h4 className="font-semibold text-white truncate group-hover:text-indigo-400 transition-colors">
                      {/*@ts-ignore*/}
                      {activity.deal.title}
                    </h4>
                  </div>
                </div>
              </a>
            ) : (
              <div className="text-center p-6 border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-sm">
                No record linked to this activity.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ActivityDetailPage({ params }: { params: { id: string } }) {
  const resolvedParams = React.use(params as any) as { id: string }

  return (
    <ToastProvider>
      <ActivityDetailContent activityId={resolvedParams.id} />
    </ToastProvider>
  )
}
