'use client'

import * as React from 'react'
import {
  Plus, Search, Target, CheckSquare, Clock, AlertCircle,
  Check, Edit, Trash2, Calendar, Link2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TaskFormModal } from './task-form-modal'
import { DeleteConfirmation } from './delete-confirmation'
import { ToastProvider, useToast } from './toast'
import type { Task, TaskStatus, TaskPriority } from './types'
import { formatDate, getStatusColor, getPriorityColor, isOverdue, isToday, isUpcoming } from './utils'

type ViewTab = 'all' | 'today' | 'upcoming'

function TasksContent() {
  const { showToast } = useToast()

  const [tasks, setTasks] = React.useState<Task[]>([])
  const [loading, setLoading] = React.useState(true)

  const [activeTab, setActiveTab] = React.useState<ViewTab>('all')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<TaskStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = React.useState<TaskPriority | 'all'>('all')

  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [formMode, setFormMode] = React.useState<'add' | 'edit'>('add')
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null)

  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
  const [taskToDelete, setTaskToDelete] = React.useState<Task | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const fetchTasks = React.useCallback(async () => {
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

      const { data: taskData, error } = await supabase
        .from('tasks')
        .select(`
          *,
          contact:contacts(first_name, last_name),
          lead:leads(title),
          deal:deals(title)
        `)
        .eq('workspace_id', workspaceId)
        .order('due_date', { ascending: true, nullsFirst: false })

      if (error) throw error
      if (taskData) setTasks(taskData as Task[])

    } catch (error: any) {
      console.error('Error fetching tasks:', error?.message || 'Unknown error')
      showToast('error', 'Failed to load tasks.')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  React.useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleQuickComplete = async (task: Task) => {
    if (task.status === 'completed') return // Already completed

    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, status: 'completed', completed_at: new Date().toISOString() } : t
    ))

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', task.id)

      if (error) throw error
      showToast('success', 'Task completed')
    } catch (error: any) {
      console.error('Error completing task:', error?.message || 'Unknown error')
      showToast('error', 'Failed to complete task.')
      fetchTasks() // Revert on error
    }
  }

  const handleDelete = async () => {
    if (!taskToDelete) return
    setIsDeleting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskToDelete.id)

      if (error) throw error

      showToast('success', 'Task deleted successfully.')
      fetchTasks()
    } catch (error: any) {
      console.error('Error deleting task:', error?.message || 'Unknown error')
      showToast('error', 'Failed to delete task.')
    } finally {
      setIsDeleting(false)
      setIsDeleteOpen(false)
      setTaskToDelete(null)
    }
  }

  // Filter tasks
  const filteredTasks = React.useMemo(() => {
    return tasks.filter(t => {
      // Tab filter
      if (activeTab === 'today' && !isToday(t.due_date)) return false
      if (activeTab === 'upcoming' && !isUpcoming(t.due_date, 7)) return false

      // Status & Priority filters
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false

      // Search
      if (searchQuery) {
        const lowerQ = searchQuery.toLowerCase()
        return t.title.toLowerCase().includes(lowerQ) ||
          t.description?.toLowerCase().includes(lowerQ)
      }
      return true
    })
  }, [tasks, activeTab, statusFilter, priorityFilter, searchQuery])

  // Stats calculations
  const totalTasks = tasks.length
  const dueTodayCount = tasks.filter(t => isToday(t.due_date) && t.status !== 'completed' && t.status !== 'cancelled').length
  const completedCount = tasks.filter(t => t.status === 'completed').length
  const overdueCount = tasks.filter(t => isOverdue(t.due_date, t.status)).length

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] overflow-hidden">
      {/* Header & Stats */}
      <div className="shrink-0 mb-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              Tasks
              <span className="text-xs font-medium bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                {filteredTasks.length}
              </span>
            </h1>
            <p className="text-sm text-zinc-400 mt-1">Manage your to-dos, follow-ups, and daily activities.</p>
          </div>
          <Button
            onClick={() => {
              setFormMode('add')
              setSelectedTask(null)
              setIsFormOpen(true)
            }}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>

        {/* Stats Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <CheckSquare className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-400">Total Tasks</p>
              <h3 className="text-2xl font-bold text-white">{totalTasks}</h3>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-400">Due Today</p>
              <h3 className="text-2xl font-bold text-white">{dueTodayCount}</h3>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Target className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-400">Completed</p>
              <h3 className="text-2xl font-bold text-white">{completedCount}</h3>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-400">Overdue</p>
              <h3 className="text-2xl font-bold text-white">{overdueCount}</h3>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {(['all', 'today', 'upcoming'] as ViewTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent'
                  }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'today' && dueTodayCount > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs">
                    {dueTodayCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-zinc-900/50 border-zinc-800 h-9 text-sm"
              />
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="flex-1 h-9 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-sm text-zinc-300 focus-visible:outline-hidden"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as any)}
                className="flex-1 h-9 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-sm text-zinc-300 focus-visible:outline-hidden"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-zinc-900/50 border border-zinc-800/80 rounded-2xl shadow-xl relative">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-zinc-800/30 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
            <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
              <CheckSquare className="w-8 h-8 text-zinc-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No tasks found</h3>
            <p className="text-zinc-400 max-w-md text-center">
              {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                ? "No tasks match your current filters. Try adjusting them."
                : "Get started by adding your first task to the list."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <table className="hidden lg:table w-full text-sm text-left">
              <thead className="text-xs text-zinc-400 bg-zinc-900/80 border-b border-zinc-800 uppercase sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="px-6 py-4 font-medium w-12"></th>
                  <th className="px-6 py-4 font-medium min-w-[200px]">Title</th>
                  <th className="px-6 py-4 font-medium">Priority</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Due Date</th>
                  <th className="px-6 py-4 font-medium">Linked To</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredTasks.map((task) => {
                  const completed = task.status === 'completed'
                  const overdue = isOverdue(task.due_date, task.status)

                  return (
                    <tr
                      key={task.id}
                      className={`hover:bg-zinc-800/30 transition-colors group ${overdue ? 'bg-red-500/[0.02] border-l-2 border-l-red-500' :
                          completed ? 'opacity-60 border-l-2 border-l-transparent' : 'border-l-2 border-l-transparent'
                        }`}
                    >
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleQuickComplete(task)}
                          disabled={completed}
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${completed
                              ? 'bg-indigo-500 border-indigo-500 text-white cursor-default'
                              : 'border-zinc-600 hover:border-indigo-400 text-transparent hover:text-indigo-400/50 cursor-pointer bg-zinc-900/50'
                            }`}
                        >
                          <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <a href={`/tasks/${task.id}`} className="block group/link">
                          <div className={`font-medium transition-colors ${completed ? 'line-through text-zinc-500' : 'text-zinc-200 group-hover/link:text-indigo-400'
                            }`}>
                            {task.title}
                          </div>
                          {task.description && (
                            <div className="text-xs text-zinc-500 mt-1 truncate max-w-[250px]">
                              {task.description}
                            </div>
                          )}
                        </a>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                          {task.priority.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                          {task.status.replace('_', ' ').charAt(0).toUpperCase() + task.status.replace('_', ' ').slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {task.due_date ? (
                          <div className={`flex items-center gap-1.5 ${overdue ? 'text-red-400 font-medium' :
                              isToday(task.due_date) ? 'text-orange-400 font-medium' :
                                'text-zinc-400'
                            }`}>
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(task.due_date, true)}
                          </div>
                        ) : (
                          <span className="text-zinc-600">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {(task.contact || task.lead || task.deal) ? (
                          <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-800/50 px-2 py-1 rounded-md inline-flex max-w-[150px] truncate border border-zinc-700/50">
                            <Link2 className="w-3 h-3 shrink-0" />
                            <span className="truncate">
                              {task.contact ? `${task.contact.first_name} ${task.contact.last_name || ''}`.trim() :
                                task.lead ? task.lead.title :
                                  task.deal ? task.deal.title : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-600">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setSelectedTask(task)
                              setFormMode('edit')
                              setIsFormOpen(true)
                            }}
                            className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-700 transition-colors"
                            title="Edit Task"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setTaskToDelete(task)
                              setIsDeleteOpen(true)
                            }}
                            className="p-1.5 text-zinc-400 hover:text-red-400 rounded-md hover:bg-red-500/10 transition-colors"
                            title="Delete Task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Mobile Cards View */}
            <div className="lg:hidden flex flex-col divide-y divide-zinc-800/60">
              {filteredTasks.map((task) => {
                const completed = task.status === 'completed'
                const overdue = isOverdue(task.due_date, task.status)

                return (
                  <div 
                    key={task.id} 
                    className={`p-4 flex flex-col gap-3 ${overdue ? 'bg-red-500/[0.02] border-l-2 border-l-red-500' :
                          completed ? 'opacity-60 border-l-2 border-l-transparent' : 'border-l-2 border-l-transparent'
                        }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0 pt-1">
                        <button
                          onClick={() => handleQuickComplete(task)}
                          disabled={completed}
                          className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all ${completed
                              ? 'bg-indigo-500 border-indigo-500 text-white cursor-default'
                              : 'border-zinc-600 hover:border-indigo-400 text-transparent hover:text-indigo-400/50 cursor-pointer bg-zinc-900/50'
                            }`}
                        >
                          <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <a href={`/tasks/${task.id}`} className="block group/link mb-2">
                            <div className={`text-sm font-medium transition-colors truncate ${completed ? 'line-through text-zinc-500' : 'text-zinc-200 group-hover/link:text-indigo-400'
                              }`}>
                              {task.title}
                            </div>
                            {task.description && (
                              <div className="text-xs text-zinc-500 mt-0.5 truncate">
                                {task.description}
                              </div>
                            )}
                          </a>
                          
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getPriorityColor(task.priority)}`}>
                              {task.priority.toUpperCase()}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusColor(task.status)}`}>
                              {task.status.replace('_', ' ').charAt(0).toUpperCase() + task.status.replace('_', ' ').slice(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Menu */}
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setSelectedTask(task)
                            setFormMode('edit')
                            setIsFormOpen(true)
                          }}
                          className="h-8 w-8 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-white flex items-center justify-center"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setTaskToDelete(task)
                            setIsDeleteOpen(true)
                          }}
                          className="h-8 w-8 rounded-lg text-zinc-500 hover:bg-red-500/10 hover:text-red-400 flex items-center justify-center"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs pl-8">
                      <div className="flex flex-col">
                        <span className="text-zinc-500">Due Date</span>
                        {task.due_date ? (
                          <div className={`flex items-center gap-1.5 mt-0.5 ${overdue ? 'text-red-400 font-medium' :
                              isToday(task.due_date) ? 'text-orange-400 font-medium' :
                                'text-zinc-300'
                            }`}>
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="truncate">{formatDate(task.due_date, true)}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-600 mt-0.5">-</span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-zinc-500">Linked To</span>
                        <div className="mt-0.5">
                          {(task.contact || task.lead || task.deal) ? (
                            <div className="flex items-center gap-1.5 text-xs text-zinc-400 truncate">
                              <Link2 className="w-3 h-3 shrink-0" />
                              <span className="truncate">
                                {task.contact ? `${task.contact.first_name} ${task.contact.last_name || ''}`.trim() :
                                  task.lead ? task.lead.title :
                                    task.deal ? task.deal.title : ''}
                              </span>
                            </div>
                          ) : (
                            <span className="text-zinc-600">-</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {isFormOpen && (
        <TaskFormModal
          mode={formMode}
          task={selectedTask}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setIsFormOpen(false)
            fetchTasks()
            showToast('success', formMode === 'add' ? 'Task created successfully.' : 'Task updated successfully.')
          }}
        />
      )}

      <DeleteConfirmation
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        itemName={taskToDelete?.title}
      />
    </div>
  )
}

export default function TasksPage() {
  return (
    <ToastProvider>
      <TasksContent />
    </ToastProvider>
  )
}
