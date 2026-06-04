'use client'

import * as React from 'react'
import {
  Plus,
  Trash2,
  History,
  Sparkles,
  CheckCircle2,
  XCircle,
  X,
  Loader2,
  Settings,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Play
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// Interfaces
interface Automation {
  id: string
  workspace_id: string
  name: string
  description?: string
  trigger_type: 'lead_created' | 'deal_stage_changed' | 'task_overdue' | 'task_completed' | 'contact_created'
  trigger_config: any
  action_type: 'create_task' | 'send_notification' | 'update_status'
  action_config: any
  is_active: boolean
}

interface AutomationLog {
  id: string
  automation_id: string
  workspace_id: string
  trigger_type: string
  trigger_data: any
  action_type: string
  action_result: any
  status: 'success' | 'failed'
  error_message?: string
  executed_at: string
}

interface Toast {
  id: string
  type: 'success' | 'error'
  message: string
}

// Helper maps for labels
const TRIGGER_LABELS: Record<string, string> = {
  lead_created: 'When a lead is created',
  deal_stage_changed: 'When a deal stage changes',
  task_overdue: 'When a task becomes overdue',
  task_completed: 'When a task is completed',
  contact_created: 'When a contact is created',
}

const ACTION_LABELS: Record<string, string> = {
  create_task: 'Create a task',
  send_notification: 'Send a notification',
  update_status: 'Update status',
}

const SUGGESTED_TEMPLATES = [
  {
    name: 'Follow up on new leads',
    description: 'Create a task automatically when high priority lead is created.',
    trigger_type: 'lead_created',
    trigger_config: { priority: 'high' },
    action_type: 'create_task',
    action_config: { title_template: 'Follow up with {first_name} {last_name}', priority: 'high', due_days: 2 }
  },
  {
    name: 'Notify on won deals',
    description: 'Trigger a notification when deal stage changes to Negotiation or Closed Won.',
    trigger_type: 'deal_stage_changed',
    trigger_config: { stage_name: 'Negotiation' },
    action_type: 'send_notification',
    action_config: { message_template: 'Deal {title} moved to Negotiation!' }
  },
  {
    name: 'Remind overdue tasks',
    description: 'Send in-app notification when tasks are overdue by 3 days.',
    trigger_type: 'task_overdue',
    trigger_config: { days: 3 },
    action_type: 'send_notification',
    action_config: { message_template: 'Task {title} is overdue!' }
  }
]

export default function AutomationsPage() {
  const [automations, setAutomations] = React.useState<Automation[]>([])
  const [loading, setLoading] = React.useState(true)
  const [toasts, setToasts] = React.useState<Toast[]>([])
  
  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = React.useState(false)
  const [editingAutomation, setEditingAutomation] = React.useState<Automation | null>(null)
  const [isLogsModalOpen, setIsLogsModalOpen] = React.useState(false)
  const [selectedAutomationForLogs, setSelectedAutomationForLogs] = React.useState<Automation | null>(null)
  const [logs, setLogs] = React.useState<AutomationLog[]>([])
  const [loadingLogs, setLoadingLogs] = React.useState(false)
  
  // Form State
  const [formName, setFormName] = React.useState('')
  const [formDescription, setFormDescription] = React.useState('')
  const [formTriggerType, setFormTriggerType] = React.useState<'lead_created' | 'deal_stage_changed' | 'task_overdue' | 'task_completed' | 'contact_created'>('lead_created')
  const [formActionType, setFormActionType] = React.useState<'create_task' | 'send_notification' | 'update_status'>('create_task')
  
  // Conditional configs
  const [triggerPriority, setTriggerPriority] = React.useState('high')
  const [triggerStageName, setTriggerStageName] = React.useState('')
  const [triggerDays, setTriggerDays] = React.useState('3')
  
  const [actionTaskTitle, setActionTaskTitle] = React.useState('')
  const [actionTaskPriority, setActionTaskPriority] = React.useState('medium')
  const [actionTaskDueDays, setActionTaskDueDays] = React.useState('2')
  const [actionNotificationMessage, setActionNotificationMessage] = React.useState('')
  const [actionUpdateEntityType, setActionUpdateEntityType] = React.useState('leads')
  const [actionUpdateStatusValue, setActionUpdateStatusValue] = React.useState('')
  const [isSaving, setIsSaving] = React.useState(false)

  // Toast Helper
  const showToast = React.useCallback((type: 'success' | 'error', message: string) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // Fetch all automations
  const fetchAutomations = React.useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/automations')
      if (!response.ok) throw new Error('Failed to fetch automations')
      const data = await response.json()
      setAutomations(data)
    } catch (error: any) {
      showToast('error', error.message || 'Error fetching automations')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  React.useEffect(() => {
    fetchAutomations()
  }, [fetchAutomations])

  // Open Form Modal
  const openFormModal = (automation?: Automation) => {
    if (automation) {
      setEditingAutomation(automation)
      setFormName(automation.name)
      setFormDescription(automation.description || '')
      setFormTriggerType(automation.trigger_type)
      setFormActionType(automation.action_type)

      // trigger config unpack
      const tConfig = automation.trigger_config || {}
      setTriggerPriority(tConfig.priority || 'high')
      setTriggerStageName(tConfig.stage_name || '')
      setTriggerDays(tConfig.days?.toString() || '3')

      // action config unpack
      const aConfig = automation.action_config || {}
      setActionTaskTitle(aConfig.title_template || aConfig.title || '')
      setActionTaskPriority(aConfig.priority || 'medium')
      setActionTaskDueDays(aConfig.due_days?.toString() || '2')
      setActionNotificationMessage(aConfig.message_template || aConfig.message || '')
      setActionUpdateEntityType(aConfig.entity_type || 'leads')
      setActionUpdateStatusValue(aConfig.status_value || '')
    } else {
      setEditingAutomation(null)
      setFormName('')
      setFormDescription('')
      setFormTriggerType('lead_created')
      setFormActionType('create_task')
      
      setTriggerPriority('high')
      setTriggerStageName('')
      setTriggerDays('3')

      setActionTaskTitle('')
      setActionTaskPriority('medium')
      setActionTaskDueDays('2')
      setActionNotificationMessage('')
      setActionUpdateEntityType('leads')
      setActionUpdateStatusValue('')
    }
    setIsFormModalOpen(true)
  }

  // Save Automation (Create or Update)
  const saveAutomation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      showToast('error', 'Automation name is required')
      return
    }

    setIsSaving(true)

    // Assemble trigger config
    let trigger_config: any = {}
    if (formTriggerType === 'lead_created') {
      trigger_config.priority = triggerPriority
    } else if (formTriggerType === 'deal_stage_changed') {
      trigger_config.stage_name = triggerStageName
    } else if (formTriggerType === 'task_overdue') {
      trigger_config.days = parseInt(triggerDays) || 3
    }

    // Assemble action config
    let action_config: any = {}
    if (formActionType === 'create_task') {
      action_config.title_template = actionTaskTitle
      action_config.priority = actionTaskPriority
      action_config.due_days = parseInt(actionTaskDueDays) || 2
    } else if (formActionType === 'send_notification') {
      action_config.message_template = actionNotificationMessage
    } else if (formActionType === 'update_status') {
      action_config.entity_type = actionUpdateEntityType
      action_config.entity_id_field = actionUpdateEntityType === 'leads' ? 'lead_id' : 'deal_id'
      action_config.status_field = 'status'
      action_config.status_value = actionUpdateStatusValue
    }

    try {
      let response
      if (editingAutomation) {
        // Update
        response = await fetch('/api/automations', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingAutomation.id,
            name: formName,
            description: formDescription,
            trigger_config,
            action_config,
            is_active: editingAutomation.is_active,
          }),
        })
      } else {
        // Create
        response = await fetch('/api/automations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            description: formDescription,
            trigger_type: formTriggerType,
            trigger_config,
            action_type: formActionType,
            action_config,
          }),
        })
      }

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Failed to save automation')
      }

      showToast('success', editingAutomation ? 'Automation updated successfully' : 'Automation created successfully')
      setIsFormModalOpen(false)
      fetchAutomations()
    } catch (error: any) {
      showToast('error', error.message || 'Error saving automation')
    } finally {
      setIsSaving(false)
    }
  }

  // Toggle active/inactive
  const toggleStatus = async (automation: Automation) => {
    const newStatus = !automation.is_active
    
    // Optimistic UI update
    setAutomations((prev) =>
      prev.map((a) => (a.id === automation.id ? { ...a, is_active: newStatus } : a))
    )

    try {
      const response = await fetch('/api/automations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: automation.id,
          name: automation.name,
          description: automation.description,
          trigger_config: automation.trigger_config,
          action_config: automation.action_config,
          is_active: newStatus,
        }),
      })

      if (!response.ok) throw new Error('Failed to update status')
      showToast('success', `Automation is now ${newStatus ? 'active' : 'inactive'}`)
    } catch (error: any) {
      // Revert optimistic update
      setAutomations((prev) =>
        prev.map((a) => (a.id === automation.id ? { ...a, is_active: !newStatus } : a))
      )
      showToast('error', error.message || 'Error updating status')
    }
  }

  // Delete Automation
  const deleteAutomation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this automation?')) return
    try {
      const response = await fetch(`/api/automations?id=${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete automation')
      showToast('success', 'Automation deleted successfully')
      fetchAutomations()
    } catch (error: any) {
      showToast('error', error.message || 'Error deleting automation')
    }
  }

  // View logs modal
  const openLogsModal = async (automation: Automation) => {
    setSelectedAutomationForLogs(automation)
    setIsLogsModalOpen(true)
    setLoadingLogs(true)
    setLogs([])
    try {
      const response = await fetch(`/api/automations/logs?automationId=${automation.id}&limit=50`)
      if (!response.ok) throw new Error('Failed to fetch logs')
      const data = await response.json()
      setLogs(data)
    } catch (error: any) {
      showToast('error', error.message || 'Error loading automation logs')
    } finally {
      setLoadingLogs(false)
    }
  }

  // Quick Add suggested templates
  const addQuickTemplate = async (template: typeof SUGGESTED_TEMPLATES[number]) => {
    try {
      const response = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      })
      if (!response.ok) throw new Error('Failed to add template')
      showToast('success', `Added template "${template.name}" successfully`)
      fetchAutomations()
    } catch (error: any) {
      showToast('error', error.message || 'Error adding template')
    }
  }

  return (
    <div className="space-y-8 min-h-screen pb-12 bg-zinc-950 text-zinc-100">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            Automations
            <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-medium">
              Engine Ready
            </span>
          </h1>
          <p className="text-sm text-zinc-400">
            Define triggers and execute actions automatically across your workspace.
          </p>
        </div>
        <Button onClick={() => openFormModal()} className="shadow-lg shadow-indigo-600/30">
          <Plus className="h-4 w-4 mr-2" />
          New Automation
        </Button>
      </div>

      {/* Suggested Templates Banner */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 h-44 w-44 rounded-full bg-indigo-500/5 blur-3xl" />
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-indigo-400" />
          <h2 className="text-base font-semibold text-white">Suggested Automations</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SUGGESTED_TEMPLATES.map((tmpl, idx) => (
            <div
              key={idx}
              className="bg-zinc-900 border border-zinc-850 hover:border-zinc-800 rounded-xl p-4.5 flex flex-col justify-between transition-all duration-200"
            >
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">{tmpl.name}</h3>
                <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">{tmpl.description}</p>
              </div>
              <button
                onClick={() => addQuickTemplate(tmpl)}
                className="mt-4 flex items-center justify-center gap-1.5 w-full text-xs font-semibold py-2 px-3 rounded-lg border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 hover:text-indigo-400 transition-all cursor-pointer text-zinc-400"
              >
                <Plus className="h-3 w-3" />
                Quick Add
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Automations List / Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">All Automation Rules</h2>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-44 rounded-xl border border-zinc-800/60 bg-zinc-900/40 animate-pulse p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="h-5 w-1/3 bg-zinc-800 rounded" />
                  <div className="h-6 w-12 bg-zinc-800 rounded-full" />
                </div>
                <div className="h-4 w-2/3 bg-zinc-800 rounded" />
                <div className="flex gap-2">
                  <div className="h-7 w-20 bg-zinc-800 rounded-lg" />
                  <div className="h-7 w-20 bg-zinc-800 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : automations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/10">
            <div className="h-12 w-12 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center mb-4 text-zinc-500">
              <Settings className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-zinc-300">No automations configured</h3>
            <p className="text-xs text-zinc-500 mt-1 text-center max-w-sm">
              Automations run workflow triggers in the background. Create one or try a quick template above.
            </p>
            <Button onClick={() => openFormModal()} size="sm" className="mt-5">
              <Plus className="h-4 w-4 mr-1.5" />
              Create Automation
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {automations.map((automation) => (
              <div
                key={automation.id}
                className={cn(
                  'border rounded-xl p-5 bg-zinc-900 flex flex-col justify-between gap-5 transition-all duration-200',
                  automation.is_active ? 'border-zinc-800' : 'border-zinc-900 opacity-65'
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <h3
                      className="font-bold text-base text-white hover:text-indigo-400 cursor-pointer transition-colors"
                      onClick={() => openFormModal(automation)}
                    >
                      {automation.name}
                    </h3>
                    
                    <button
                      onClick={() => toggleStatus(automation)}
                      className="cursor-pointer text-zinc-400 hover:text-white transition-colors"
                    >
                      {automation.is_active ? (
                        <ToggleRight className="h-7 w-7 text-indigo-500" />
                      ) : (
                        <ToggleLeft className="h-7 w-7 text-zinc-600" />
                      )}
                    </button>
                  </div>
                  
                  {automation.description && (
                    <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                      {automation.description}
                    </p>
                  )}

                  <div className="pt-2 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-zinc-500">Trigger:</span>
                      <span className="font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                        {TRIGGER_LABELS[automation.trigger_type] || automation.trigger_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-zinc-500">Action:</span>
                      <span className="font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                        {ACTION_LABELS[automation.action_type] || automation.action_type}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-850 pt-3">
                  <button
                    onClick={() => openLogsModal(automation)}
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    <History className="h-3.5 w-3.5" />
                    View logs
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openFormModal(automation)}
                      className="h-8 px-3 rounded-lg text-xs font-semibold border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteAutomation(automation.id)}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE/EDIT FORM MODAL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-[scaleIn_0.2s_ease-out]">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4.5">
              <h3 className="text-lg font-bold text-white">
                {editingAutomation ? 'Edit Automation Rule' : 'Create Automation Rule'}
              </h3>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={saveAutomation} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              <div className="space-y-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Automation Name *
                  </label>
                  <Input
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g., Send welcome email to new lead"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Explain what this automation accomplishes..."
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 focus:outline-hidden transition-colors"
                  />
                </div>
              </div>

              {/* TRIGGER SECTION */}
              <div className="border-t border-zinc-850 pt-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Trigger Event
                  </label>
                  <select
                    value={formTriggerType}
                    onChange={(e) => setFormTriggerType(e.target.value as any)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-hidden transition-colors"
                  >
                    <option value="lead_created">When a lead is created</option>
                    <option value="deal_stage_changed">When a deal stage changes</option>
                    <option value="task_overdue">When a task becomes overdue</option>
                    <option value="task_completed">When a task is completed</option>
                    <option value="contact_created">When a contact is created</option>
                  </select>
                </div>

                {/* Conditional Trigger configs */}
                {formTriggerType === 'lead_created' && (
                  <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl space-y-2">
                    <label className="text-xs font-semibold text-zinc-400">Trigger Priority Filter</label>
                    <select
                      value={triggerPriority}
                      onChange={(e) => setTriggerPriority(e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 focus:outline-hidden focus:border-indigo-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                    <p className="text-[10px] text-zinc-500 mt-1">Leaves empty or matches specific priority to trigger.</p>
                  </div>
                )}

                {formTriggerType === 'deal_stage_changed' && (
                  <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl space-y-2">
                    <label className="text-xs font-semibold text-zinc-400">Match Deal Stage Name</label>
                    <Input
                      placeholder="e.g. Negotiation, Closed Won"
                      value={triggerStageName}
                      onChange={(e) => setTriggerStageName(e.target.value)}
                    />
                  </div>
                )}

                {formTriggerType === 'task_overdue' && (
                  <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl space-y-2">
                    <label className="text-xs font-semibold text-zinc-400">Days Overdue</label>
                    <Input
                      type="number"
                      min={1}
                      placeholder="e.g., 3"
                      value={triggerDays}
                      onChange={(e) => setTriggerDays(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* ACTION SECTION */}
              <div className="border-t border-zinc-850 pt-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Execution Action
                  </label>
                  <select
                    value={formActionType}
                    onChange={(e) => setFormActionType(e.target.value as any)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-hidden transition-colors"
                  >
                    <option value="create_task">Create a task</option>
                    <option value="send_notification">Send a notification</option>
                    <option value="update_status">Update status</option>
                  </select>
                </div>

                {/* Conditional Action Configs */}
                {formActionType === 'create_task' && (
                  <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-400">Task Title Template</label>
                      <Input
                        placeholder="e.g., Follow up with {first_name}"
                        value={actionTaskTitle}
                        onChange={(e) => setActionTaskTitle(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-400">Task Priority</label>
                        <select
                          value={actionTaskPriority}
                          onChange={(e) => setActionTaskPriority(e.target.value)}
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 focus:outline-hidden"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-400">Due Days</label>
                        <Input
                          type="number"
                          value={actionTaskDueDays}
                          onChange={(e) => setActionTaskDueDays(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {formActionType === 'send_notification' && (
                  <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl space-y-2">
                    <label className="text-xs font-semibold text-zinc-400">Message Template</label>
                    <textarea
                      rows={2}
                      placeholder="e.g., Deal {title} has been moved to negotiation."
                      value={actionNotificationMessage}
                      onChange={(e) => setActionNotificationMessage(e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-zinc-200 placeholder-zinc-650 focus:border-indigo-500 focus:outline-hidden"
                    />
                  </div>
                )}

                {formActionType === 'update_status' && (
                  <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-400">Entity Type</label>
                      <select
                        value={actionUpdateEntityType}
                        onChange={(e) => setActionUpdateEntityType(e.target.value)}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200"
                      >
                        <option value="leads">Leads</option>
                        <option value="deals">Deals</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-400">Target Status Value</label>
                      <Input
                        placeholder="e.g., active, inactive, won"
                        value={actionUpdateStatusValue}
                        onChange={(e) => setActionUpdateStatusValue(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-850">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={isSaving}>
                  Save Automation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOGS MODAL */}
      {isLogsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-[scaleIn_0.2s_ease-out]">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4.5">
              <div className="space-y-0.5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Execution History
                </h3>
                <p className="text-xs text-zinc-400">
                  {selectedAutomationForLogs?.name} (showing last 50 runs)
                </p>
              </div>
              <button
                onClick={() => setIsLogsModalOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {loadingLogs ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="h-7 w-7 text-indigo-500 animate-spin" />
                  <span className="text-xs text-zinc-500 font-medium">Fetching history logs...</span>
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-10 w-10 text-zinc-600 mb-3" />
                  <span className="text-sm font-semibold text-zinc-400">No execution logs found</span>
                  <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                    This automation has not been triggered yet.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 pb-2 text-zinc-500 uppercase tracking-wider font-bold">
                        <th className="py-2.5">Executed At</th>
                        <th className="py-2.5">Status</th>
                        <th className="py-2.5">Action Type</th>
                        <th className="py-2.5">Result / Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-zinc-850/20 transition-colors">
                          <td className="py-3 text-zinc-400 shrink-0 font-medium">
                            {new Date(log.executed_at).toLocaleString()}
                          </td>
                          <td className="py-3">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border',
                                log.status === 'success'
                                  ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400'
                                  : 'bg-red-950/40 border-red-500/20 text-red-400'
                              )}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="py-3 font-medium text-zinc-300">
                            {ACTION_LABELS[log.action_type] || log.action_type}
                          </td>
                          <td className="py-3 max-w-[280px] truncate text-zinc-400 font-mono text-[11px]">
                            {log.status === 'success'
                              ? JSON.stringify(log.action_result)
                              : log.error_message || 'Unknown error occurred'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-end p-4 border-t border-zinc-800 bg-zinc-950/40">
              <Button onClick={() => setIsLogsModalOpen(false)} size="sm">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST SYSTEM CONTAINER */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-xs min-w-[320px] max-w-[420px] transition-all duration-300',
              toast.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200'
                : 'bg-red-950/80 border-red-500/30 text-red-200'
            )}
            style={{
              animation: 'slideIn 0.3s ease-out',
            }}
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

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
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
