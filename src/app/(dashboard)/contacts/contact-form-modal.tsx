'use client'

import * as React from 'react'
import { X, Loader2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Contact, ContactFormData, ContactStatus, ContactSource } from './types'
import { STATUS_OPTIONS, SOURCE_OPTIONS, EMPTY_FORM_DATA } from './types'

interface ContactFormModalProps {
  mode: 'add' | 'edit'
  contact?: Contact | null
  onSuccess: () => void
  onClose: () => void
}

// ─── Custom Select Component ────────────────────────────────────────────
function FormSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
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
export function ContactFormModal({ mode, contact, onSuccess, onClose }: ContactFormModalProps) {
  const [formData, setFormData] = React.useState<ContactFormData>(() => {
    if (mode === 'edit' && contact) {
      return {
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        job_title: contact.job_title || '',
        status: contact.status || 'active',
        source: (contact.source as ContactSource) || 'manual',
        notes: contact.notes || '',
      }
    }
    return { ...EMPTY_FORM_DATA }
  })

  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Close on Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [loading, onClose])

  const updateField = <K extends keyof ContactFormData>(key: K, value: ContactFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.first_name.trim()) {
      setError('First name is required.')
      return
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      if (mode === 'add') {
        // Get a workspace_id for the insert
        let workspaceId: string | null = null

        // Try to get workspace from current user's profile or workspace membership
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
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim() || null,
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          job_title: formData.job_title.trim() || null,
          status: formData.status,
          source: formData.source,
          notes: formData.notes.trim() || null,
        }

        const { error: insertError } = await supabase
          .from('contacts')
          .insert(insertData as any)

        if (insertError) throw insertError
      } else {
        // Edit mode
        const updateData: Record<string, unknown> = {
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim() || null,
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          job_title: formData.job_title.trim() || null,
          status: formData.status,
          source: formData.source,
          notes: formData.notes.trim() || null,
        }

        const { error: updateError } = await supabase
          .from('contacts')
          .update(updateData as any)
          .eq('id', contact!.id)

        if (updateError) throw updateError
      }

      onSuccess()
    } catch (err: any) {
      console.error('Error saving contact:', err?.message || 'Unknown error')
      setError(err?.message || 'An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
        onClick={loading ? undefined : onClose}
      />

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-[scaleIn_0.2s_ease-out] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 shrink-0">
          <h2 className="text-lg font-semibold text-white">
            {mode === 'add' ? 'Add Contact' : 'Edit Contact'}
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

            {/* Name row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">
                  First Name <span className="text-red-400">*</span>
                </label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => updateField('first_name', e.target.value)}
                  placeholder="John"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Last Name</label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => updateField('last_name', e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Phone</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            {/* Job Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Job Title</label>
              <Input
                value={formData.job_title}
                onChange={(e) => updateField('job_title', e.target.value)}
                placeholder="Software Engineer"
              />
            </div>

            {/* Status & Source */}
            <div className="grid grid-cols-2 gap-4">
              <FormSelect
                label="Status"
                value={formData.status}
                onChange={(v) => updateField('status', v as ContactStatus)}
                options={STATUS_OPTIONS}
              />
              <FormSelect
                label="Source"
                value={formData.source}
                onChange={(v) => updateField('source', v as ContactSource)}
                options={SOURCE_OPTIONS}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Add any notes about this contact..."
                rows={3}
                className="flex w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-sm text-white placeholder-zinc-500 transition-colors focus-visible:outline-hidden focus-visible:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500/30 resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-zinc-800/60 flex items-center justify-end gap-3 shrink-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                mode === 'add' ? 'Save Contact' : 'Update Contact'
              )}
            </Button>
          </div>
        </form>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
