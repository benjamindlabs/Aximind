'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Users,
  Target,
  DollarSign,
  CheckSquare,
  Activity,
  Calendar,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Loader2,
  Phone,
  Mail,
  FileText,
  Settings,
  ArrowRight,
  CheckCircle2,
  XCircle,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ComponentType<any>
  color: 'blue' | 'violet' | 'indigo' | 'amber'
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  const colorStyles = {
    blue: {
      border: 'border-blue-500/20 hover:border-blue-500/40',
      iconBg: 'bg-blue-500/10 text-blue-400',
      glow: 'shadow-blue-550/5 hover:shadow-blue-500/10',
    },
    violet: {
      border: 'border-violet-500/20 hover:border-violet-500/40',
      iconBg: 'bg-violet-500/10 text-violet-400',
      glow: 'shadow-violet-550/5 hover:shadow-violet-500/10',
    },
    indigo: {
      border: 'border-indigo-500/20 hover:border-indigo-500/40',
      iconBg: 'bg-indigo-500/10 text-indigo-400',
      glow: 'shadow-indigo-550/5 hover:shadow-indigo-500/10',
    },
    amber: {
      border: 'border-amber-500/20 hover:border-amber-500/40',
      iconBg: 'bg-amber-500/10 text-amber-400',
      glow: 'shadow-amber-550/5 hover:shadow-amber-500/10',
    },
  }

  const style = colorStyles[color]

  return (
    <div
      className={cn(
        "bg-zinc-900 border rounded-2xl p-6 transition-all duration-350 hover:-translate-y-0.5 shadow-lg flex items-center justify-between group",
        style.border,
        style.glow
      )}
    >
      <div className="space-y-2">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{label}</span>
        <h4 className="text-3.5xl font-bold tracking-tight text-white transition-all group-hover:scale-105 origin-left">
          {value}
        </h4>
      </div>
      <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-350 group-hover:scale-110", style.iconBg)}>
        <Icon className="h-6 w-6" />
      </div>
    </div>
  )
}

interface DashboardActivity {
  id: string
  type: string
  title: string
  description: string | null
  occurred_at: string | null
  created_at: string
  contact?: { first_name: string; last_name: string | null } | null
  lead?: { title: string } | null
  deal?: { title: string } | null
}

interface DashboardTask {
  id: string
  title: string
  priority: string
  status: string
  due_date: string | null
}

interface StageSummary {
  id: string
  name: string
  dealCount: number
  totalValue: number
  proportion: number
  color: string
}

interface Toast {
  id: string
  type: 'success' | 'error'
  message: string
}

export default function DashboardPage() {
  const [userName, setUserName] = React.useState<string>('Guest')
  const [greeting, setGreeting] = React.useState<string>('Good morning')
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)

  // Toast State
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const showToast = React.useCallback((type: 'success' | 'error', message: string) => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  const dismissToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Live data states
  const [stats, setStats] = React.useState({
    contacts: 0,
    leads: 0,
    deals: 0,
    tasks: 0,
  })
  const [activities, setActivities] = React.useState<DashboardActivity[]>([])
  const [tasks, setTasks] = React.useState<DashboardTask[]>([])
  const [pipelineOverview, setPipelineOverview] = React.useState<StageSummary[]>([])

  // Helpers
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 0) return 'Just now'
    if (seconds < 60) return 'Just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days}d ago`

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatTaskDueDate = (dateString: string | null) => {
    if (!dateString) return 'No date'
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow'
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const isToday = (dateString: string | null) => {
    if (!dateString) return false
    const date = new Date(dateString)
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const formatCurrency = (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getActivityIcon = (type: string) => {
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

  const getActivityColor = (type: string) => {
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/10 text-red-400 border-red-500/20'
      case 'high': return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
      case 'medium': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'low':
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
    }
  }

  const getStageColorClass = (stage: any, index: number) => {
    const fallbackColors = [
      'bg-indigo-500',
      'bg-blue-500',
      'bg-cyan-500',
      'bg-emerald-500',
      'bg-amber-500',
      'bg-rose-500'
    ]
    if (stage && stage.color) {
      if (stage.color.startsWith('#') || stage.color.startsWith('rgb')) {
        return stage.color
      }
      if (stage.color.includes('bg-')) return stage.color
      return `bg-${stage.color}-500`
    }
    return fallbackColors[index % fallbackColors.length]
  }

  const fetchDashboardData = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    const supabase = createClient()

    try {
      // 1. Fetch workspace ID
      const { data: membership, error: membershipError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .limit(1)
        .single()

      if (membershipError || !membership?.workspace_id) {
        showToast('error', 'No workspace found. Please build one first.')
        setLoading(false)
        setRefreshing(false)
        return
      }

      const workspaceId = membership.workspace_id

      // 2. Fetch User Profile & Greeting
      setGreeting(getGreeting())
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()
        
        const fullName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
        setUserName(fullName)
      }

      // 3. Stats queries
      const contactsPromise = supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)

      const leadsPromise = supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .in('status', ['new', 'contacted', 'qualified'])

      const dealsPromise = supabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'open')

      const startOfTodayVal = new Date()
      startOfTodayVal.setHours(0, 0, 0, 0)
      const endOfTodayVal = new Date()
      endOfTodayVal.setHours(23, 59, 59, 999)

      const tasksDueTodayPromise = supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .in('status', ['pending', 'in_progress'])
        .gte('due_date', startOfTodayVal.toISOString())
        .lte('due_date', endOfTodayVal.toISOString())

      // 4. Feeds & Lists
      const activitiesPromise = supabase
        .from('activities')
        .select(`
          id, type, title, description, occurred_at, created_at,
          contact:contacts(first_name, last_name),
          lead:leads(title),
          deal:deals(title)
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(5)

      const startOfTodayUpcoming = new Date()
      startOfTodayUpcoming.setHours(0, 0, 0, 0)

      const upcomingTasksPromise = supabase
        .from('tasks')
        .select('id, title, priority, status, due_date')
        .eq('workspace_id', workspaceId)
        .in('status', ['pending', 'in_progress'])
        .gte('due_date', startOfTodayUpcoming.toISOString())
        .order('due_date', { ascending: true })
        .limit(5)

      // 5. Pipeline Overview queries
      const pipelinesPromise = supabase
        .from('pipelines')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('is_default', true)
        .limit(1)
        .maybeSingle()

      const { data: defaultPipeline } = await pipelinesPromise
      let currentPipelineId = defaultPipeline?.id

      if (!currentPipelineId) {
        const { data: fallbackPipeline } = await supabase
          .from('pipelines')
          .select('id')
          .eq('workspace_id', workspaceId)
          .limit(1)
          .maybeSingle()
        
        currentPipelineId = fallbackPipeline?.id
      }

      let pipelineStagesPromise = null
      let pipelineDealsPromise = null

      if (currentPipelineId) {
        pipelineStagesPromise = supabase
          .from('pipeline_stages')
          .select('*')
          .eq('pipeline_id', currentPipelineId)
          .order('position', { ascending: true })

        pipelineDealsPromise = supabase
          .from('deals')
          .select('*')
          .eq('workspace_id', workspaceId)
          .eq('pipeline_id', currentPipelineId)
          .eq('status', 'open')
      }

      // Parallelize Core queries
      const [
        contactsRes,
        leadsRes,
        dealsRes,
        tasksCountRes,
        activitiesRes,
        upcomingTasksRes,
        stagesRes,
        dealsForPipelineRes
      ] = await Promise.all([
        contactsPromise,
        leadsPromise,
        dealsPromise,
        tasksDueTodayPromise,
        activitiesPromise,
        upcomingTasksPromise,
        pipelineStagesPromise || Promise.resolve({ data: null, error: null }),
        pipelineDealsPromise || Promise.resolve({ data: null, error: null })
      ])

      // Set counts
      setStats({
        contacts: contactsRes.count || 0,
        leads: leadsRes.count || 0,
        deals: dealsRes.count || 0,
        tasks: tasksCountRes.count || 0
      })

      // Set activities
      if (activitiesRes.data) {
        setActivities(activitiesRes.data as unknown as DashboardActivity[])
      } else {
        setActivities([])
      }

      // Set tasks
      if (upcomingTasksRes.data) {
        setTasks(upcomingTasksRes.data as unknown as DashboardTask[])
      } else {
        setTasks([])
      }

      // Group and set pipeline overview
      if (stagesRes?.data && dealsForPipelineRes?.data) {
        const stages = stagesRes.data
        const openDeals = dealsForPipelineRes.data

        const dealsByStage: Record<string, typeof openDeals> = {}
        openDeals.forEach(deal => {
          if (!dealsByStage[deal.stage_id]) {
            dealsByStage[deal.stage_id] = []
          }
          dealsByStage[deal.stage_id].push(deal)
        })

        const stageSummaries: StageSummary[] = stages.map((stage, idx) => {
          const stageDeals = dealsByStage[stage.id] || []
          const dealCount = stageDeals.length
          const totalValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0)
          return {
            id: stage.id,
            name: stage.name,
            dealCount,
            totalValue,
            proportion: 0,
            color: getStageColorClass(stage, idx)
          }
        })

        const totalPipelineValue = stageSummaries.reduce((sum, s) => sum + s.totalValue, 0)
        
        stageSummaries.forEach(s => {
          s.proportion = totalPipelineValue > 0 ? (s.totalValue / totalPipelineValue) * 100 : 0
        })

        setPipelineOverview(stageSummaries.slice(0, 6))
      } else {
        setPipelineOverview([])
      }

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err?.message || 'Unknown error')
      showToast('error', 'Failed to reload dashboard statistics.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [showToast])

  React.useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Quick complete checkbox toggle handler
  const handleQuickCompleteTask = async (taskId: string) => {
    // Optimistic UI updates
    const taskToComplete = tasks.find(t => t.id === taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))
    
    if (taskToComplete && isToday(taskToComplete.due_date)) {
      setStats(prev => ({ ...prev, tasks: Math.max(0, prev.tasks - 1) }))
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId)

      if (error) throw error
      showToast('success', 'Task marked as completed.')
    } catch (err: any) {
      console.error('Error completing task:', err?.message || 'Unknown error')
      showToast('error', 'Failed to update task status.')
      // Rollback
      fetchDashboardData(true)
    }
  }

  const handleRefresh = () => {
    fetchDashboardData(true)
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in relative pb-12">
      {/* Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-sm min-w-[320px] max-w-[420px]',
              'animate-[slideIn_0.3s_ease-out]',
              toast.type === 'success'
                ? 'bg-emerald-950/85 border-emerald-500/30 text-emerald-200'
                : 'bg-red-950/85 border-red-500/30 text-red-200'
            )}
            style={{ animation: 'slideIn 0.3s ease-out' }}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-red-400 shrink-0" />
            )}
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button
              onClick={() => dismissToast(toast.id)}
              className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Welcome Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          {loading ? (
            <div className="h-9 w-64 bg-zinc-800 rounded-lg animate-pulse mb-2" />
          ) : (
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {greeting}, {userName}
            </h1>
          )}
          <p className="text-sm text-zinc-400">
            Here is what's happening with your sales pipeline today.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-colors disabled:opacity-50 text-sm font-medium cursor-pointer"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </button>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-pulse flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-3.5 w-24 bg-zinc-800/60 rounded" />
                <div className="h-8 w-16 bg-zinc-800/60 rounded" />
              </div>
              <div className="h-12 w-12 rounded-xl bg-zinc-800/60 animate-pulse" />
            </div>
          ))
        ) : (
          <>
            <StatCard label="Total Contacts" value={stats.contacts} icon={Users} color="blue" />
            <StatCard label="Active Leads" value={stats.leads} icon={Target} color="violet" />
            <StatCard label="Open Deals" value={stats.deals} icon={DollarSign} color="indigo" />
            <StatCard label="Tasks Due Today" value={stats.tasks} icon={CheckSquare} color="amber" />
          </>
        )}
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Recent Activities */}
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-6 flex flex-col justify-between min-h-[460px]">
          <div className="space-y-6 flex-1">
            <div className="flex items-center justify-between border-b border-zinc-800/50 pb-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-400" />
                <h3 className="text-lg font-semibold text-zinc-100">Recent Activities</h3>
              </div>
              <a href="/activities" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1 transition-colors">
                View all <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>

            {loading ? (
              <div className="space-y-4 py-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-start gap-4 p-3 animate-pulse">
                    <div className="h-8 w-8 rounded-lg bg-zinc-800 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/2 bg-zinc-800 rounded" />
                      <div className="h-3.5 w-1/4 bg-zinc-800 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                <div className="h-10 w-10 rounded-lg bg-zinc-800/50 border border-zinc-800/60 text-zinc-500 flex items-center justify-center">
                  <Activity className="h-5 w-5" />
                </div>
                <div className="space-y-1 max-w-xs">
                  <p className="text-sm font-semibold text-zinc-300">No activities yet</p>
                  <p className="text-xs text-zinc-500">
                    When contacts are created or deals are updated, they will show up here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {activities.map((act) => (
                  <div key={act.id} className="flex items-start gap-4 py-3.5 first:pt-0 last:pb-0 hover:bg-zinc-800/10 px-2 rounded-xl transition-colors border border-transparent">
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center border shrink-0 mt-0.5", getActivityColor(act.type))}>
                      {React.createElement(getActivityIcon(act.type), { className: "h-4 w-4" })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-zinc-200 leading-tight">
                          <a href={`/activities/${act.id}`} className="hover:text-indigo-400 transition-colors">
                            {act.title}
                          </a>
                        </p>
                        <span className="text-xs text-zinc-500 shrink-0 font-medium">{formatTimeAgo(act.created_at)}</span>
                      </div>
                      {act.description && (
                        <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{act.description}</p>
                      )}
                      
                      {/* Relations badges */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {act.contact && (
                          <a href={`/contacts/${act.contact.first_name}`} className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/10 hover:bg-blue-500/20 transition-colors">
                            <Users className="h-3 w-3 shrink-0" />
                            {act.contact.first_name} {act.contact.last_name || ''}
                          </a>
                        )}
                        {act.lead && (
                          <a href={`/leads/${act.lead.title}`} className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/10 hover:bg-cyan-500/20 transition-colors">
                            <Target className="h-3 w-3 shrink-0" />
                            {act.lead.title}
                          </a>
                        )}
                        {act.deal && (
                          <a href={`/deals/${act.deal.title}`} className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/10 hover:bg-purple-500/20 transition-colors">
                            <DollarSign className="h-3 w-3 shrink-0" />
                            {act.deal.title}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Upcoming Tasks */}
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-6 flex flex-col justify-between min-h-[460px]">
          <div className="space-y-6 flex-1">
            <div className="flex items-center justify-between border-b border-zinc-800/50 pb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-amber-400" />
                <h3 className="text-lg font-semibold text-zinc-100">Upcoming Tasks</h3>
              </div>
              <a href="/tasks" className="text-xs text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1 transition-colors">
                View all <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>

            {loading ? (
              <div className="space-y-4 py-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                    <div className="h-5 w-5 rounded bg-zinc-800" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-zinc-800 rounded" />
                      <div className="h-3.5 w-16 bg-zinc-800 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : tasks.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                <div className="h-10 w-10 rounded-lg bg-zinc-800/50 border border-zinc-800/60 text-zinc-500 flex items-center justify-center">
                  <CheckSquare className="h-5 w-5" />
                </div>
                <div className="space-y-1 max-w-xs">
                  <p className="text-sm font-semibold text-zinc-300">No upcoming tasks</p>
                  <p className="text-xs text-zinc-500">
                    No upcoming tasks due. You're completely up to date.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0 px-2 hover:bg-zinc-800/10 rounded-xl transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        onChange={() => handleQuickCompleteTask(task.id)}
                        className="h-4.5 w-4.5 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500/30 transition-all cursor-pointer"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">
                          <a href={`/tasks/${task.id}`} className="hover:text-amber-400 transition-colors">
                            {task.title}
                          </a>
                        </p>
                        <span className="text-xs text-zinc-500 font-medium">{formatTaskDueDate(task.due_date)}</span>
                      </div>
                    </div>
                    <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-md border shrink-0", getPriorityColor(task.priority))}>
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Pipeline Overview Section */}
      <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800/50 pb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-zinc-100">Pipeline Overview</h3>
          </div>
          <a href="/deals" className="text-xs text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1 transition-colors">
            View pipeline <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>

        {loading ? (
          <div className="space-y-5 py-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2 animate-pulse">
                <div className="flex justify-between">
                  <div className="h-4 w-28 bg-zinc-800 rounded" />
                  <div className="h-4 w-20 bg-zinc-800 rounded" />
                </div>
                <div className="h-3 w-full bg-zinc-800 rounded-full" />
              </div>
            ))}
          </div>
        ) : pipelineOverview.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
            <div className="h-10 w-10 rounded-lg bg-zinc-800/50 border border-zinc-800/60 text-zinc-500 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="space-y-1 max-w-xs">
              <p className="text-sm font-semibold text-zinc-300">No deals in pipeline</p>
              <p className="text-xs text-zinc-500">
                Create new deals and move them along pipeline stages to see your performance overview here.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {pipelineOverview.map((stage) => {
              const isTailwindClass = stage.color.startsWith('bg-')
              return (
                <div key={stage.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-200">{stage.name}</span>
                      <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-medium">
                        {stage.dealCount} {stage.dealCount === 1 ? 'deal' : 'deals'}
                      </span>
                    </div>
                    <span className="font-bold text-zinc-100">
                      {formatCurrency(stage.totalValue, 'USD')}
                    </span>
                  </div>
                  {/* Progress Bar Container */}
                  <div className="h-3 w-full bg-zinc-800/50 rounded-full overflow-hidden border border-zinc-800/30">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500 ease-out",
                        isTailwindClass ? stage.color : ''
                      )}
                      style={{
                        width: `${stage.proportion}%`,
                        backgroundColor: !isTailwindClass ? stage.color : undefined
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
      `}</style>
    </div>
  )
}
