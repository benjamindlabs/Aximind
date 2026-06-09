'use client'

import * as React from 'react'
import { ArrowLeft, Calendar, Clock, Link2, CheckCircle2, PlayCircle, XCircle, Building, User, Target } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ToastProvider, useToast } from '../toast'
import type { Task, TaskStatus } from '../types'
import { formatDate, getStatusColor, getPriorityColor, isOverdue } from '../utils'

function TaskDetailContent({ taskId }: { taskId: string }) {
  const { showToast } = useToast()
  
  const [task, setTask] = React.useState<Task | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [updating, setUpdating] = React.useState(false)

  const fetchTaskData = React.useCallback(async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      
      const { data: taskData, error } = await supabase
        .from('tasks')
        .select(`
          *,
          contact:contacts(id, first_name, last_name, email),
          lead:leads(id, first_name, last_name, company_name),
          deal:deals(id, title, value)
        `)
        .eq('id', taskId)
        .single()

      if (error) throw error
      setTask(taskData as Task)
    } catch (error: any) {
      console.error('Error fetching task:', error?.message || 'Unknown error')
      showToast('error', 'Failed to load task details.')
    } finally {
      setLoading(false)
    }
  }, [taskId, showToast])

  React.useEffect(() => {
    fetchTaskData()
  }, [fetchTaskData])

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task) return
    try {
      setUpdating(true)
      const supabase = createClient()
      
      const updateData: any = { status: newStatus }
      
      if (newStatus === 'completed' && task.status !== 'completed') {
        updateData.completed_at = new Date().toISOString()
      } else if (newStatus !== 'completed' && task.status === 'completed') {
        updateData.completed_at = null
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', task.id)

      if (error) throw error
      
      showToast('success', `Task marked as ${newStatus.replace('_', ' ')}.`)
      fetchTaskData()
    } catch (error: any) {
      console.error('Error updating status:', error?.message || 'Unknown error')
      showToast('error', 'Failed to update task status.')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-zinc-500 font-medium animate-pulse">Loading task...</p>
        </div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-zinc-400">Task not found.</p>
          <a href="/tasks" className="text-indigo-400 hover:text-indigo-300">Return to Tasks</a>
        </div>
      </div>
    )
  }

  const completed = task.status === 'completed'
  const overdue = isOverdue(task.due_date, task.status)

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] overflow-y-auto pb-10">
      {/* Header */}
      <div className="mb-6 space-y-4">
        <a href="/tasks" className="inline-flex items-center text-sm text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tasks
        </a>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className={`text-3xl font-bold tracking-tight mb-3 ${completed ? 'line-through text-zinc-500' : 'text-white'}`}>
              {task.title}
            </h1>
            <div className="flex items-center gap-3 text-sm">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${getStatusColor(task.status)}`}>
                {task.status.replace('_', ' ').toUpperCase()}
              </span>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${getPriorityColor(task.priority)}`}>
                {task.priority.toUpperCase()} PRIORITY
              </span>
              {task.due_date && (
                <span className={`flex items-center gap-1.5 font-medium ${overdue ? 'text-red-400' : 'text-zinc-400'}`}>
                  <Calendar className="w-4 h-4" />
                  Due: {formatDate(task.due_date, true)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-zinc-800/60">
          {task.status !== 'completed' && (
            <Button 
              onClick={() => handleStatusChange('completed')}
              disabled={updating}
              className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Mark as Complete
            </Button>
          )}
          {task.status !== 'in_progress' && task.status !== 'completed' && task.status !== 'cancelled' && (
            <Button 
              onClick={() => handleStatusChange('in_progress')}
              disabled={updating}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              Mark as In Progress
            </Button>
          )}
          {task.status !== 'cancelled' && task.status !== 'completed' && (
            <Button 
              onClick={() => handleStatusChange('cancelled')}
              disabled={updating}
              variant="outline"
              className="border-red-500/20 text-red-400 hover:bg-red-500/10"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancel Task
            </Button>
          )}
          {(task.status === 'completed' || task.status === 'cancelled') && (
            <Button 
              onClick={() => handleStatusChange('pending')}
              disabled={updating}
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Reopen Task
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
        {/* Task Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Task Details</h3>
            
            <div className="space-y-6">
              <div>
                <div className="text-sm font-medium text-zinc-500 mb-2">Description</div>
                {task.description ? (
                  <div className="text-zinc-300 bg-zinc-900/80 p-4 rounded-xl border border-zinc-800/50 whitespace-pre-wrap leading-relaxed">
                    {task.description}
                  </div>
                ) : (
                  <div className="text-zinc-500 italic">No description provided.</div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 font-medium">Created On</div>
                    <div className="text-sm text-zinc-200">{formatDate(task.created_at)}</div>
                  </div>
                </div>
                {task.completed_at && (
                  <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <div className="text-xs text-emerald-500/70 font-medium">Completed On</div>
                      <div className="text-sm text-emerald-400">{formatDate(task.completed_at, true)}</div>
                    </div>
                  </div>
                )}
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
            
            {task.contact ? (
              <a href={`/contacts/${task.contact.id}`} className="group block bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 rounded-xl p-4 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-blue-400 mb-0.5 font-medium">Contact</div>
                    <h4 className="font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                      {/*@ts-ignore*/}
                      {task.contact.first_name} {task.contact.last_name}
                    </h4>
                  </div>
                </div>
              </a>
            ) : task.lead ? (
              <a href={`/leads/${task.lead.id}`} className="group block bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 rounded-xl p-4 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-amber-400 mb-0.5 font-medium">Lead</div>
                    <h4 className="font-semibold text-white truncate group-hover:text-amber-400 transition-colors">
                      {/*@ts-ignore*/}
                      {task.lead.first_name} {task.lead.last_name}
                    </h4>
                  </div>
                </div>
              </a>
            ) : task.deal ? (
              <a href={`/deals/${task.deal.id}`} className="group block bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 rounded-xl p-4 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                    <Building className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-indigo-400 mb-0.5 font-medium">Deal</div>
                    <h4 className="font-semibold text-white truncate group-hover:text-indigo-400 transition-colors">
                      {/*@ts-ignore*/}
                      {task.deal.title}
                    </h4>
                  </div>
                </div>
              </a>
            ) : (
              <div className="text-center p-6 border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-sm">
                No record linked to this task.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params) as { id: string }

  return (
    <ToastProvider>
      <TaskDetailContent taskId={resolvedParams.id} />
    </ToastProvider>
  )
}
