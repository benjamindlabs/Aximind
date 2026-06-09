'use client'

import * as React from 'react'
import { X, Loader2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Lead, LeadFormData, LeadStatus, LeadPriority, LeadSource } from './types'
import { STATUS_OPTIONS, PRIORITY_OPTIONS, SOURCE_OPTIONS, EMPTY_FORM_DATA } from './types'

interface LeadFormModalProps {
  mode: 'add' | 'edit'
  lead?: Lead | null
  onSuccess: () => void
  onClose: () => void
}

// ─── Custom Select Component ────────────────────────────────────────────
function FormSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select option...',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-300">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-white appearance-none cursor-pointer transition-colors focus-visible:outline-hidden focus-visible:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500/30"
        >
          {placeholder && <option value="" className="text-zinc-500 bg-zinc-900">{placeholder}</option>}
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

// ─── Main Component ─────────────────────────────────────────────────────
export function LeadFormModal({ mode, lead, onSuccess, onClose }: LeadFormModalProps) {
  const [formData, setFormData] = React.useState<LeadFormData>(() => {
    if (mode === 'edit' && lead) {
      return {
        title: lead.title || '',
        description: lead.description || '',
        status: lead.status || 'new',
        priority: lead.priority || 'medium',
        source: (lead.source as LeadSource) || 'manual',
        estimated_value: lead.estimated_value !== null ? String(lead.estimated_value) : '',
        contact_id: lead.contact_id || '',
        company_id: lead.company_id || '',
      }
    }
    return { ...EMPTY_FORM_DATA }
  })

  const [loading, setLoading] = React.useState(false)
  const [dropdownsLoading, setDropdownsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Contacts & Companies dropdown lists
  const [contactOptions, setContactOptions] = React.useState<{ value: string; label: string }[]>([])
  const [companyOptions, setCompanyOptions] = React.useState<{ value: string; label: string }[]>([])

  // Close on Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [loading, onClose])

  // Fetch contacts and companies for selects
  React.useEffect(() => {
    const loadSelectData = async () => {
      try {
        const supabase = createClient()

        // Fetch contacts
        const { data: contactsData, error: contactsErr } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, email')
          .order('first_name', { ascending: true })

        if (contactsErr) throw contactsErr

        // Fetch companies
        const { data: companiesData, error: companiesErr } = await supabase
          .from('companies')
          .select('id, name')
          .order('name', { ascending: true })

        if (companiesErr) throw companiesErr

        setContactOptions(
          (contactsData || []).map((c) => ({
            value: c.id,
            label: [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || c.id,
          }))
        )

        setCompanyOptions(
          (companiesData || []).map((c) => ({
            value: c.id,
            label: c.name || c.id,
          }))
        )
      } catch (err: any) {
        console.error('Error loading dropdown lists for lead modal:', err?.message || 'Unknown error')
      } finally {
        setDropdownsLoading(false)
      }
    }

    loadSelectData()
  }, [])

  const updateField = <K extends keyof LeadFormData>(key: K, value: LeadFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.title.trim()) {
      setError('Lead title is required.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const estimatedValueVal = formData.estimated_value.trim()
        ? parseFloat(formData.estimated_value.trim())
        : null

      if (estimatedValueVal !== null && isNaN(estimatedValueVal)) {
        setError('Estimated value must be a valid number.')
        setLoading(false)
        return
      }

      if (mode === 'add') {
        // Fetch workspace_id using CRITICAL workspace pattern
        let workspaceId: string | null = null

        const { data: membership } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .limit(1)
          .single()

        if (membership?.workspace_id) {
          workspaceId = membership.workspace_id
        } else {
          setError('No workspace found. Please create a workspace first.')
          setLoading(false)
          return
        }

        const insertData: Record<string, unknown> = {
          workspace_id: workspaceId,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          status: formData.status,
          priority: formData.priority,
          source: formData.source,
          estimated_value: estimatedValueVal,
          contact_id: formData.contact_id || null,
          company_id: formData.company_id || null,
        }

        const { error: insertError } = await supabase
          .from('leads')
          .insert(insertData as any)

        if (insertError) throw insertError
      } else {
        // Edit mode
        const updateData: Record<string, unknown> = {
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          status: formData.status,
          priority: formData.priority,
          source: formData.source,
          estimated_value: estimatedValueVal,
          contact_id: formData.contact_id || null,
          company_id: formData.company_id || null,
        }

        const { error: updateError } = await supabase
          .from('leads')
          .update(updateData as any)
          .eq('id', lead!.id)

        if (updateError) throw updateError
      }

      onSuccess()
    } catch (err: any) {
      console.error('Error saving lead:', err?.message || 'Unknown error')
      setError(err?.message || 'An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[leadsFadeIn_0.15s_ease-out]"
        onClick={loading ? undefined : onClose}
      />

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-[leadsScaleIn_0.2s_ease-out] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 shrink-0">
          <h2 className="text-lg font-semibold text-white">
            {mode === 'add' ? 'Add Lead' : 'Edit Lead'}
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
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-6 py-5 space-y-4">
            {/* Error message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Lead Title <span className="text-red-400">*</span>
              </label>
              <Input
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Enterprise Subscription Upgrade"
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Details about the opportunity..."
                rows={3}
                className="flex w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-sm text-white placeholder-zinc-500 transition-colors focus-visible:outline-hidden focus-visible:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500/30 resize-none"
              />
            </div>

            {/* Status & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <FormSelect
                label="Status"
                value={formData.status}
                onChange={(v) => updateField('status', v as LeadStatus)}
                options={STATUS_OPTIONS}
                placeholder=""
              />
              <FormSelect
                label="Priority"
                value={formData.priority}
                onChange={(v) => updateField('priority', v as LeadPriority)}
                options={PRIORITY_OPTIONS}
                placeholder=""
              />
            </div>

            {/* Source & Estimated Value */}
            <div className="grid grid-cols-2 gap-4">
              <FormSelect
                label="Source"
                value={formData.source}
                onChange={(v) => updateField('source', v as LeadSource)}
                options={SOURCE_OPTIONS}
                placeholder=""
              />
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Estimated Value ($)</label>
                <Input
                  type="number"
                  value={formData.estimated_value}
                  onChange={(e) => updateField('estimated_value', e.target.value)}
                  placeholder="5000"
                />
              </div>
            </div>

            {/* Associated Contact & Company */}
            <div className="grid grid-cols-2 gap-4">
              {dropdownsLoading ? (
                <div className="col-span-2 flex items-center justify-center py-2 text-zinc-500 text-sm">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading contacts and companies...
                </div>
              ) : (
                <>
                  <FormSelect
                    label="Associated Contact"
                    value={formData.contact_id}
                    onChange={(v) => updateField('contact_id', v)}
                    options={contactOptions}
                    placeholder="None"
                  />
                  <FormSelect
                    label="Associated Company"
                    value={formData.company_id}
                    onChange={(v) => updateField('company_id', v)}
                    options={companyOptions}
                    placeholder="None"
                  />
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-zinc-800/60 flex items-center justify-end gap-3 shrink-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || dropdownsLoading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                mode === 'add' ? 'Save Lead' : 'Update Lead'
              )}
            </Button>
          </div>
        </form>
      </div>

      <style jsx global>{`
        @keyframes leadsFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes leadsScaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
