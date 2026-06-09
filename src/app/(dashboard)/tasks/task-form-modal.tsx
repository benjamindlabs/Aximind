'use client'

import * as React from 'react'
import { X, Loader2, ChevronDown, Link2, Calendar as CalendarIcon, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import type { Task, TaskFormData, TaskStatus, TaskPriority } from './types'
import { STATUS_OPTIONS, PRIORITY_OPTIONS, EMPTY_FORM_DATA } from './types'
import { cn } from './utils'

interface TaskFormModalProps {
  mode: 'add' | 'edit'
  task?: Task | null
  onSuccess: () => void
  onClose: () => void
}

function FormSelect({
  label,
  value,
  onChange,
  options,
  placeholder = '',
  required = false,
  disabled = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  required?: boolean
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-300">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          className="flex h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-white appearance-none cursor-pointer transition-colors focus-visible:outline-hidden focus-visible:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500/30 disabled:opacity-50"
        >
          {placeholder && <option value="" className="bg-zinc-900 text-zinc-500">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-zinc-900">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
      </div>
    </div>
  )
}

export function TaskFormModal({ mode, task, onSuccess, onClose }: TaskFormModalProps) {
  const [formData, setFormData] = React.useState<TaskFormData>(() => {
    if (mode === 'edit' && task) {
      let dueDateStr = ''
      let dueTimeStr = ''
      if (task.due_date) {
        const d = new Date(task.due_date)
        // Format YYYY-MM-DD
        dueDateStr = d.toISOString().split('T')[0]
        // Format HH:MM
        dueTimeStr = d.toTimeString().slice(0, 5)
      }
      return {
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'pending',
        priority: task.priority || 'medium',
        due_date: dueDateStr,
        due_time: dueTimeStr,
        contact_id: task.contact_id || '',
        lead_id: task.lead_id || '',
        deal_id: task.deal_id || '',
      }
    }
    return { ...EMPTY_FORM_DATA }
  })

  const [loading, setLoading] = React.useState(false)
  const [fetchingData, setFetchingData] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  
  const [contacts, setContacts] = React.useState<{ id: string; name: string }[]>([])
  const [leads, setLeads] = React.useState<{ id: string; name: string }[]>([])
  const [deals, setDeals] = React.useState<{ id: string; name: string }[]>([])

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [loading, onClose])

  React.useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient()
        
        // Fetch all independently to populate link dropdowns.
        // Workspace isolation is handled by RLS on these tables.
        const [
          { data: contactsData },
          { data: leadsData },
          { data: dealsData }
        ] = await Promise.all([
          supabase.from('contacts').select('id, first_name, last_name').order('first_name', { ascending: true }),
          supabase.from('leads').select('id, first_name, last_name').order('first_name', { ascending: true }),
          supabase.from('deals').select('id, title').order('title', { ascending: true })
        ])

        if (contactsData) {
          setContacts(contactsData.map(c => ({
            id: c.id,
            name: `${c.first_name} ${c.last_name || ''}`.trim()
          })))
        }

        if (leadsData) {
          setLeads(leadsData.map(l => ({
            id: l.id,
            name: `${l.first_name} ${l.last_name || ''}`.trim()
          })))
        }

        if (dealsData) {
          setDeals(dealsData.map(d => ({
            id: d.id,
            name: d.title
          })))
        }

      } catch (err: any) {
        console.error('Error fetching relational data:', err?.message || 'Unknown error')
      } finally {
        setFetchingData(false)
      }
    }

    fetchData()
  }, [])

  const updateField = <K extends keyof TaskFormData>(key: K, value: TaskFormData[K]) => {
    setFormData((prev) => {
      const next = { ...prev, [key]: value }
      
      // Enforce only one link
      if (key === 'contact_id' && value) {
        next.lead_id = ''
        next.deal_id = ''
      } else if (key === 'lead_id' && value) {
        next.contact_id = ''
        next.deal_id = ''
      } else if (key === 'deal_id' && value) {
        next.contact_id = ''
        next.lead_id = ''
      }
      
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.title.trim()) {
      setError('Title is required.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      
      let finalDueDate: string | null = null
      if (formData.due_date) {
        const timePart = formData.due_time || '00:00'
        // Create an ISO string for the combined date and time
        const d = new Date(`${formData.due_date}T${timePart}:00`)
        finalDueDate = d.toISOString()
      }

      if (mode === 'add') {
        let workspaceId: string | null = null
        const { data: membership } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .limit(1)
          .single()

        if (membership?.workspace_id) {
          workspaceId = membership.workspace_id
        } else {
          setError('No workspace found.')
          setLoading(false)
          return
        }

        const insertData: Record<string, unknown> = {
          workspace_id: workspaceId,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          status: formData.status,
          priority: formData.priority,
          due_date: finalDueDate,
          contact_id: formData.contact_id || null,
          lead_id: formData.lead_id || null,
          deal_id: formData.deal_id || null,
          is_recurring: false,
        }
        
        if (formData.status === 'completed') {
           insertData.completed_at = new Date().toISOString()
        }

        const { error: insertError } = await supabase
          .from('tasks')
          .insert(insertData as any)

        if (insertError) throw insertError
      } else {
        const updateData: Record<string, unknown> = {
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          status: formData.status,
          priority: formData.priority,
          due_date: finalDueDate,
          contact_id: formData.contact_id || null,
          lead_id: formData.lead_id || null,
          deal_id: formData.deal_id || null,
        }
        
        // If status changed to completed, set completed_at
        if (formData.status === 'completed' && task?.status !== 'completed') {
            updateData.completed_at = new Date().toISOString()
        } else if (formData.status !== 'completed' && task?.status === 'completed') {
            updateData.completed_at = null
        }

        const { error: updateError } = await supabase
          .from('tasks')
          .update(updateData as any)
          .eq('id', task!.id)

        if (updateError) throw updateError
      }

      onSuccess()
    } catch (err: any) {
      console.error('Error saving task:', err?.message || 'Unknown error')
      setError(err?.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[taskFadeIn_0.15s_ease-out]" onClick={loading ? undefined : onClose} />
      
      <div className="relative bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 animate-[taskScaleIn_0.2s_ease-out] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 shrink-0 bg-zinc-900/50 rounded-t-2xl">
          <h2 className="text-lg font-semibold text-white">
            {mode === 'add' ? 'Add Task' : 'Edit Task'}
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="h-8 w-8 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        {fetchingData ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-4">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-zinc-400 text-sm">Loading options...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">
                  Task Title <span className="text-red-400">*</span>
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="Follow up with client..."
                  autoFocus
                />
              </div>

              {/* Status & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <FormSelect
                  label="Status"
                  value={formData.status}
                  onChange={(v) => updateField('status', v as any)}
                  options={STATUS_OPTIONS}
                />
                <FormSelect
                  label="Priority"
                  value={formData.priority}
                  onChange={(v) => updateField('priority', v as any)}
                  options={PRIORITY_OPTIONS}
                />
              </div>

              {/* Due Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300 flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4 text-zinc-500" />
                    Due Date
                  </label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => updateField('due_date', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-zinc-500" />
                    Due Time
                  </label>
                  <Input
                    type="time"
                    value={formData.due_time}
                    onChange={(e) => updateField('due_time', e.target.value)}
                    disabled={!formData.due_date}
                  />
                </div>
              </div>

              <div className="h-px bg-zinc-800/60 w-full my-4" />

              {/* Link Options */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                  <Link2 className="w-4 h-4 text-indigo-400" />
                  Link To (Optional)
                </div>
                <p className="text-xs text-zinc-500 mb-2">Select a Contact, Lead, OR Deal to associate with this task.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormSelect
                    label="Contact"
                    value={formData.contact_id}
                    onChange={(v) => updateField('contact_id', v)}
                    options={contacts.map(c => ({ value: c.id, label: c.name }))}
                    placeholder="Select Contact..."
                    disabled={!!formData.lead_id || !!formData.deal_id}
                  />
                  <FormSelect
                    label="Lead"
                    value={formData.lead_id}
                    onChange={(v) => updateField('lead_id', v)}
                    options={leads.map(l => ({ value: l.id, label: l.name }))}
                    placeholder="Select Lead..."
                    disabled={!!formData.contact_id || !!formData.deal_id}
                  />
                  <FormSelect
                    label="Deal"
                    value={formData.deal_id}
                    onChange={(v) => updateField('deal_id', v)}
                    options={deals.map(d => ({ value: d.id, label: d.name }))}
                    placeholder="Select Deal..."
                    disabled={!!formData.contact_id || !!formData.lead_id}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2 pt-2">
                <label className="text-sm font-medium text-zinc-300">Description / Notes</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Additional task details..."
                  rows={4}
                  className="flex w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-sm text-white placeholder-zinc-500 transition-colors focus-visible:outline-hidden focus-visible:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500/30 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-zinc-800/60 flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  mode === 'add' ? 'Save Task' : 'Update Task'
                )}
              </Button>
            </div>
          </form>
        )}
      </div>

      <style jsx global>{`
        @keyframes taskFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes taskScaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
